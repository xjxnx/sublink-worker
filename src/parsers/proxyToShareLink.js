import { encodeBase64 } from '../utils.js';

// Reverse of ProxyParser: turn the unified sing-box-style proxy object back into
// a client share link (vmess/vless/trojan/ss/...). Used by the /xray endpoint so
// clients like v2rayN can split a subscription into individual nodes.

function buildQuery(pairs) {
    const usp = new URLSearchParams();
    for (const [key, value] of pairs) {
        if (value === undefined || value === null || value === '') continue;
        usp.set(key, String(value));
    }
    const qs = usp.toString();
    return qs ? `?${qs}` : '';
}

function frag(tag) {
    return tag ? `#${encodeURIComponent(tag)}` : '';
}

function hostHeader(transport) {
    const headers = transport?.headers;
    if (!headers || typeof headers !== 'object') return undefined;
    return headers.Host ?? headers.host;
}

function alpnString(alpn) {
    if (!alpn) return undefined;
    return Array.isArray(alpn) ? alpn.join(',') : String(alpn);
}

// Shared param set for trojan/vless (createTlsConfig + createTransportConfig roundtrip)
function tlsTransportParams(proxy) {
    const tls = proxy.tls || {};
    const transport = proxy.transport;
    const network = transport?.type || 'tcp';
    const security = tls.enabled ? (tls.reality?.enabled ? 'reality' : 'tls') : 'none';

    const pairs = [
        ['security', security],
        ['type', network]
    ];

    if (tls.enabled) {
        pairs.push(['sni', tls.server_name]);
        if (tls.insecure) pairs.push(['allowInsecure', '1']);
        if (tls.reality?.enabled) {
            pairs.push(['pbk', tls.reality.public_key]);
            pairs.push(['sid', tls.reality.short_id]);
        }
        if (tls.utls?.fingerprint) pairs.push(['fp', tls.utls.fingerprint]);
        const alpn = alpnString(tls.alpn ?? proxy.alpn);
        if (alpn) pairs.push(['alpn', alpn]);
    }

    if (network === 'ws' || network === 'http' || network === 'h2') {
        pairs.push(['path', transport?.path]);
        pairs.push(['host', hostHeader(transport)]);
    } else if (network === 'grpc') {
        pairs.push(['serviceName', transport?.service_name]);
    }

    return pairs;
}

function trojanLink(proxy) {
    const pairs = tlsTransportParams(proxy);
    if (proxy.flow) pairs.push(['flow', proxy.flow]);
    const auth = encodeURIComponent(proxy.password ?? '');
    return `trojan://${auth}@${proxy.server}:${proxy.server_port}${buildQuery(pairs)}${frag(proxy.tag)}`;
}

function vlessLink(proxy) {
    const pairs = tlsTransportParams(proxy);
    pairs.unshift(['encryption', 'none']);
    if (proxy.flow) pairs.push(['flow', proxy.flow]);
    const auth = encodeURIComponent(proxy.uuid ?? '');
    return `vless://${auth}@${proxy.server}:${proxy.server_port}${buildQuery(pairs)}${frag(proxy.tag)}`;
}

function vmessLink(proxy) {
    const tls = proxy.tls || {};
    const transport = proxy.transport;
    const config = {
        v: '2',
        ps: proxy.tag ?? '',
        add: proxy.server,
        port: String(proxy.server_port ?? ''),
        id: proxy.uuid ?? '',
        aid: String(proxy.alter_id ?? 0),
        scy: proxy.security ?? 'auto',
        net: transport?.type ?? 'tcp',
        type: 'none',
        host: hostHeader(transport) ?? '',
        path: transport?.path ?? '',
        tls: tls.enabled ? 'tls' : '',
        sni: tls.server_name ?? ''
    };
    const alpn = alpnString(tls.alpn ?? proxy.alpn);
    if (alpn) config.alpn = alpn;
    return `vmess://${encodeBase64(JSON.stringify(config))}`;
}

function shadowsocksLink(proxy) {
    const method = proxy.method || proxy.cipher;
    // SIP002 uses base64 without padding for the userinfo segment.
    const userinfo = encodeBase64(`${method}:${proxy.password ?? ''}`).replace(/=+$/, '');
    return `ss://${userinfo}@${proxy.server}:${proxy.server_port}${frag(proxy.tag)}`;
}

function hysteria2Link(proxy) {
    const tls = proxy.tls || {};
    const pairs = [
        ['sni', tls.server_name],
        ['alpn', alpnString(tls.alpn ?? proxy.alpn)]
    ];
    if (tls.insecure) pairs.push(['insecure', '1']);
    if (proxy.obfs?.type) {
        pairs.push(['obfs', proxy.obfs.type]);
        pairs.push(['obfs-password', proxy.obfs.password]);
    }
    const auth = encodeURIComponent(proxy.password ?? proxy.auth ?? '');
    return `hysteria2://${auth}@${proxy.server}:${proxy.server_port}${buildQuery(pairs)}${frag(proxy.tag)}`;
}

function tuicLink(proxy) {
    const tls = proxy.tls || {};
    const pairs = [
        ['sni', tls.server_name],
        ['congestion_control', proxy.congestion_control],
        ['udp_relay_mode', proxy.udp_relay_mode],
        ['alpn', alpnString(tls.alpn ?? proxy.alpn)]
    ];
    if (tls.insecure) pairs.push(['allow_insecure', '1']);
    if (proxy.flow) pairs.push(['flow', proxy.flow]);
    const uuid = encodeURIComponent(proxy.uuid ?? '');
    const pwd = encodeURIComponent(proxy.password ?? '');
    return `tuic://${uuid}:${pwd}@${proxy.server}:${proxy.server_port}${buildQuery(pairs)}${frag(proxy.tag)}`;
}

function anytlsLink(proxy) {
    const tls = proxy.tls || {};
    const pairs = [['sni', tls.server_name]];
    if (tls.insecure) pairs.push(['insecure', '1']);
    const auth = encodeURIComponent(proxy.password ?? '');
    return `anytls://${auth}@${proxy.server}:${proxy.server_port}${buildQuery(pairs)}${frag(proxy.tag)}`;
}

const serializers = {
    trojan: trojanLink,
    vless: vlessLink,
    vmess: vmessLink,
    shadowsocks: shadowsocksLink,
    ss: shadowsocksLink,
    hysteria2: hysteria2Link,
    hysteria: hysteria2Link,
    hy2: hysteria2Link,
    tuic: tuicLink,
    anytls: anytlsLink
};

export function proxyToShareLink(proxy) {
    if (!proxy || typeof proxy !== 'object' || !proxy.type || !proxy.server) {
        return null;
    }
    const serializer = serializers[String(proxy.type).toLowerCase()];
    if (!serializer) return null;
    try {
        return serializer(proxy);
    } catch {
        return null;
    }
}

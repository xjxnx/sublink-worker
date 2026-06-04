import { parseServerInfo, parseUrlParams, createTlsConfig, parseArray, parseBool, parseMaybeNumber } from '../../utils.js';

export function parseAnytls(url) {
    const { addressPart, params, name } = parseUrlParams(url);
    const [password, serverInfo] = addressPart.split('@');
    const { host, port } = parseServerInfo(serverInfo);

    // AnyTLS mandates TLS; default security so createTlsConfig emits a tls block
    if (!params.security) params.security = 'tls';
    const tls = createTlsConfig(params);
    const alpn = parseArray(params.alpn);
    if (alpn) tls.alpn = alpn;

    return {
        tag: name,
        type: 'anytls',
        server: host,
        server_port: port,
        password: decodeURIComponent(password ?? ''),
        udp: parseBool(params.udp, true),
        idle_session_check_interval: parseMaybeNumber(params['idle-session-check-interval']),
        idle_session_timeout: parseMaybeNumber(params['idle-session-timeout']),
        min_idle_session: parseMaybeNumber(params['min-idle-session']),
        tls
    };
}

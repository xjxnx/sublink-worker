import { decodeBase64 } from '../../utils.js';
import { InvalidPayloadError } from '../../services/errors.js';

export function parseSocksHttp(input) {
    try {
        const trimmed = input.trim();
        const shorthand = trimmed.match(/^(\[[^\]\s]+\]|[^:\s/@?#\[\]]+):(\d+):([^:\r\n]+):(.+)$/);
        // Encode raw credentials so password delimiters are not interpreted as URI syntax.
        const normalized = shorthand
            ? `socks5://${encodeURIComponent(shorthand[3])}:${encodeURIComponent(shorthand[4])}@${shorthand[1]}:${shorthand[2]}`
            : trimmed;
        const match = normalized.match(/^(socks|socks5|socks5h|http|https):\/\/(.+)$/i);
        if (!match) throw new Error();
        const scheme = match[1].toLowerCase();
        const isHttp = scheme.startsWith('http');
        const [address, ...fragments] = match[2].split('#');
        const queryIndex = address.indexOf('?');
        let authority = queryIndex < 0 ? address : address.slice(0, queryIndex);
        const params = new URLSearchParams(queryIndex < 0 ? '' : address.slice(queryIndex + 1));
        // Some exporters encode the entire SOCKS authority instead of only its credentials.
        if (/^[A-Za-z0-9+/_-]+=*$/.test(authority)) {
            const decoded = decodeBase64(authority.replace(/-/g, '+').replace(/_/g, '/'));
            if (decoded.includes(':')) authority = decoded;
        }
        const authIndex = authority.lastIndexOf('@');
        const endpoint = authIndex < 0 ? authority : authority.slice(authIndex + 1);
        const url = new URL(`${scheme}://${endpoint}`);
        if (!url.hostname || (url.pathname && url.pathname !== '/') || url.username || url.password) throw new Error();
        const port = Number(url.port || (scheme === 'https' ? 443 : isHttp ? 80 : 1080));
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error();
        const proxy = {
            tag: decodeURIComponent(fragments.join('#')) || url.hostname.replace(/^\[|\]$/g, ''),
            type: isHttp ? 'http' : 'socks',
            server: url.hostname.replace(/^\[|\]$/g, ''),
            server_port: port,
            ...(isHttp ? {} : { version: '5' })
        };
        if (authIndex >= 0) {
            let auth = authority.slice(0, authIndex);
            if (!auth.includes(':')) {
                auth = decodeBase64(decodeURIComponent(auth).replace(/-/g, '+').replace(/_/g, '/'));
                if (!auth.includes(':')) throw new Error();
                const separator = auth.indexOf(':');
                proxy.username = auth.slice(0, separator);
                proxy.password = auth.slice(separator + 1);
            } else {
                const separator = auth.indexOf(':');
                proxy.username = decodeURIComponent(auth.slice(0, separator));
                proxy.password = decodeURIComponent(auth.slice(separator + 1));
            }
        }
        if (scheme === 'https' || ['true', '1'].includes(params.get('tls'))) {
            proxy.tls = {
                enabled: true,
                ...(params.get('sni') ? { server_name: params.get('sni') } : {}),
                ...(['true', '1'].includes(params.get('skip-cert-verify') || params.get('allowInsecure')) ? { insecure: true } : {})
            };
        }
        return proxy;
    } catch {
        throw new InvalidPayloadError('Invalid chain proxy URI. Use socks://, socks5://, socks5h://, http:// or https:// with a valid server and port, or hostname:port:username:password (SOCKS5).');
    }
}

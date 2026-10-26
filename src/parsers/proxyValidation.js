const PROXY_TYPES = new Set(['shadowsocks', 'vmess', 'vless', 'hysteria2', 'trojan', 'tuic', 'anytls', 'socks', 'http']);
const REQUIRED_FIELDS = {
    shadowsocks: ['method'],
    vmess: ['uuid'],
    vless: ['uuid'],
    tuic: ['uuid'],
    trojan: ['password'],
    anytls: ['password']
};

const hasValue = value => (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isFinite(value));

export function isValidProxyNode(proxy) {
    const port = proxy?.server_port;
    return Boolean(proxy && PROXY_TYPES.has(proxy.type) &&
        typeof proxy.server === 'string' && proxy.server.length > 0 && !/[\s/?#@]/.test(proxy.server) &&
        (typeof port === 'number' || typeof port === 'string' && /^\d+$/.test(port)) &&
        Number.isInteger(Number(port)) && Number(port) > 0 && Number(port) <= 65535 &&
        (REQUIRED_FIELDS[proxy.type] || []).every(field => hasValue(proxy[field])) &&
        (proxy.type !== 'shadowsocks' || proxy.method === 'none' || hasValue(proxy.password)));
}

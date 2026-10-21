import { afterEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { BaseConfigBuilder } from '../src/builders/BaseConfigBuilder.js';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { ProxyParser } from '../src/parsers/ProxyParser.js';
import { fetchSubscriptionWithFormat } from '../src/parsers/subscription/httpSubscriptionFetcher.js';
import { decodeBase64, encodeBase64, parseUrlParams } from '../src/utils.js';

const remoteUrl = 'https://subscription.example.com/sub?token=test';
const uuid = '12345678-1234-1234-1234-123456789abc';
const path = '/proxy?ed=2560&target=https://origin.example.com/a#part%2F';
const ech = 'cloudflare-ech.com+https://dns.example.com/dns-query';
const name = '节点 %2F ? # & +';
const password = 'secret@:+/?&#%2F';
const wrappers = [
    ['plain', text => text],
    ['Base64', encodeBase64],
    ['URL encoded', encodeURIComponent],
    ['Base64 URL', text => encodeBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')],
    ['URL encoded Base64', text => encodeURIComponent(encodeBase64(text))],
    ['Base64 wrapped URL encoding', text => encodeBase64(encodeURIComponent(text))]
];

function vlessUri(tag, server = 'node.example.com', wsPath = path) {
    const params = new URLSearchParams({ security: 'tls', ech, type: 'ws', path: wsPath, host: 'ws.example.com' });
    return `vless://${uuid}@${server}:443?${params}#${encodeURIComponent(tag)}`;
}

const uriList = [vlessUri('VIP', 'vip.example.com', '/vip'), vlessUri(name),
    ...Array.from({ length: 20 }, (_, i) => vlessUri(`Info ${i + 1}`, 'info.example.com'))].join('\n');

function mockRemote(content) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(content)));
}

function createTestApp() {
    return createApp({ kv: new MemoryKVAdapter(), logger: console });
}

describe('Subscription envelope and URI encoding regression', () => {
    afterEach(() => vi.unstubAllGlobals());

    it.each(wrappers)('preserves all 22 URI names and nested parameters through %s envelopes', async (_, wrap) => {
        mockRemote(wrap(uriList));
        const fetched = await fetchSubscriptionWithFormat(remoteUrl, 'v2rayN/7.0');
        expect(fetched.content).toBe(uriList);
        const builder = new BaseConfigBuilder(remoteUrl, {}, 'zh-CN', 'v2rayN/7.0');
        const nodes = await builder.parseCustomItems();
        expect(nodes).toHaveLength(22);
        expect(nodes.every(node => node.tag)).toBe(true);
        expect(nodes[1]).toMatchObject({ tag: name, server: 'node.example.com', transport: { type: 'ws', path } });
        expect(parseUrlParams(fetched.content.split('\n')[1]).params.ech).toBe(ech);
    });

    it.each([
        ['clash', '/clash'],
        ['singbox', '/singbox'],
        ['xray', '/xray']
    ])('keeps the real nodes and fields in the %s route', async (target, route) => {
        mockRemote(encodeBase64(uriList));
        const response = await createTestApp().request(`http://localhost${route}?${new URLSearchParams({ config: remoteUrl, ua: 'v2rayN/7.0', selectedRules: 'minimal' })}`);
        expect(response.status).toBe(200);
        const text = await response.text();
        if (target === 'xray') {
            const nodes = await Promise.all(decodeBase64(text).split('\n').map(uri => ProxyParser.parse(uri)));
            expect(nodes).toHaveLength(22);
            expect(nodes[1]).toMatchObject({ tag: name, transport: { type: 'ws', path } });
        } else if (target === 'clash') {
            const config = yaml.load(text);
            expect(config.proxies).toHaveLength(3);
            expect(config.proxies[1]).toMatchObject({ name, type: 'vless', network: 'ws', 'ws-opts': { path } });
            expect(config['proxy-providers']).toBeUndefined();
        } else {
            const nodes = JSON.parse(text).outbounds.filter(node => node.server);
            expect(nodes).toHaveLength(3);
            expect(nodes[1]).toMatchObject({ tag: name, transport: { type: 'ws', path } });
        }
    });

    const configs = [
        ['Clash YAML', yaml.dump({ proxies: [{ name, type: 'trojan', server: 'node.example.com', port: 443, password, network: 'ws', 'ws-opts': { path } }] })],
        ['Sing-box JSON', JSON.stringify({ outbounds: [{ tag: name, type: 'trojan', server: 'node.example.com', server_port: 443, password, transport: { type: 'ws', path } }] })],
        ['Surge INI', '[Proxy]\nPercent = trojan, node.example.com, 443, password=secret%2Fpass, sni=tls.example.com\n']
    ];

    describe.each(configs)('%s compatibility', (_, content) => {
        it.each(wrappers)('preserves literal percent escapes through %s envelopes', async (_, wrap) => {
            mockRemote(wrap(content));
            const fetched = await fetchSubscriptionWithFormat(remoteUrl, 'test-agent');
            expect(fetched.content).toBe(content.trimEnd());
            const builder = new BaseConfigBuilder(remoteUrl, {}, 'zh-CN', 'test-agent');
            const nodes = await builder.parseCustomItems();
            expect(nodes).toHaveLength(1);
            if (content.startsWith('[Proxy]')) {
                expect(nodes[0].password).toBe('secret%2Fpass');
            } else {
                expect(nodes[0]).toMatchObject({ tag: name, password, transport: { path } });
            }
        });
    });

    it.each(['trojan', 'hysteria2', 'anytls'])('decodes %s credentials exactly once in a remote subscription', async scheme => {
        const uri = `${scheme}://${encodeURIComponent(password)}@node.example.com:443?sni=tls.example.com#${encodeURIComponent(name)}`;
        mockRemote(encodeBase64(uri));
        const nodes = await new BaseConfigBuilder(remoteUrl, {}, 'zh-CN', 'test-agent').parseCustomItems();
        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toMatchObject({ tag: name, password, server: 'node.example.com', server_port: 443 });
    });

    it('preserves encoded SS credentials and plugin delimiters', async () => {
        const auth = encodeURIComponent(encodeBase64(`aes-128-gcm:${password}`));
        const plugin = `v2ray-plugin;mode=websocket;path=${path}`;
        const uri = `ss://${auth}@node.example.com:443?${new URLSearchParams({ plugin })}#${encodeURIComponent(name)}`;
        mockRemote(encodeBase64(uri));
        const [node] = await new BaseConfigBuilder(remoteUrl, {}, 'zh-CN', 'test-agent').parseCustomItems();
        expect(node).toMatchObject({ tag: name, password, plugin: 'v2ray-plugin', plugin_opts: { path } });
    });

    it('preserves VMess JSON strings after decoding its subscription envelope', async () => {
        const uri = `vmess://${encodeBase64(JSON.stringify({ ps: name, add: 'node.example.com', port: 443, id: uuid, net: 'ws', path, host: 'ws.example.com', tls: 'tls' }))}`;
        mockRemote(encodeBase64(uri));
        const [node] = await new BaseConfigBuilder(remoteUrl, {}, 'zh-CN', 'test-agent').parseCustomItems();
        expect(node).toMatchObject({ tag: name, transport: { path } });
    });

    it.each(['clash', 'singbox', 'xray', 'surge'])('preserves ordinary Trojan credentials in the %s route', async target => {
        const uri = `trojan://${encodeURIComponent(password)}@node.example.com:443?sni=tls.example.com#Ordinary`;
        mockRemote(encodeBase64(uri));
        const response = await createTestApp().request(`http://localhost/${target}?${new URLSearchParams({ config: remoteUrl, selectedRules: 'minimal' })}`);
        expect(response.status).toBe(200);
        const text = await response.text();
        if (target === 'clash') {
            expect(yaml.load(text).proxies[0]).toMatchObject({ name: 'Ordinary', password });
        } else if (target === 'singbox') {
            expect(JSON.parse(text).outbounds.find(node => node.server)).toMatchObject({ tag: 'Ordinary', password });
        } else if (target === 'xray') {
            expect(await ProxyParser.parse(decodeBase64(text))).toMatchObject({ tag: 'Ordinary', password });
        } else {
            expect(text).toContain(`password=${password}`);
        }
    });

    it('keeps literal nested URLs and their query strings when splitting a URI', () => {
        const result = parseUrlParams(`vless://${uuid}@node.example.com:443?ech=https://dns.example.com/dns-query?name=test&type=ws#${encodeURIComponent(name)}`);
        expect(result).toEqual({ addressPart: `${uuid}@node.example.com:443`, params: { ech: 'https://dns.example.com/dns-query?name=test', type: 'ws' }, name });
    });

    it('reads fragments without a query, including question marks and extra hashes', () => {
        const result = parseUrlParams(`trojan://password@[2001:db8::1]:443#${encodeURIComponent(name)}#extra?text`);
        expect(result).toEqual({ addressPart: 'password@[2001:db8::1]:443', params: {}, name: `${name}#extra?text` });
    });

    it('preserves malformed percent escapes in node names', () => {
        expect(parseUrlParams(`vless://${uuid}@node.example.com:443?type=ws#100% ready`).name).toBe('100% ready');
    });

    it('keeps the selected UA when a Clash provider downloads and refreshes nodes', async () => {
        const ua = 'mihomo/1.19.0';
        const content = configs[0][1];
        const upstream = vi.fn(async (_, options) => new Response(new Headers(options?.headers).get('User-Agent') === ua ? content : encodeBase64(uriList)));
        vi.stubGlobal('fetch', upstream);
        const response = await createTestApp().request(`http://localhost/clash?${new URLSearchParams({ config: remoteUrl, ua, selectedRules: 'minimal' })}`, { headers: { 'User-Agent': 'Go-http-client/1.1' } });
        expect(response.status).toBe(200);
        const config = yaml.load(await response.text());
        const [providerName, provider] = Object.entries(config['proxy-providers'])[0];
        expect(provider.header).toEqual({ 'User-Agent': [ua] });
        expect(provider.url).toBe(remoteUrl);
        expect(config['proxy-groups'].find(group => group.name === '🚀 节点选择').use).toContain(providerName);
        for (let refresh = 0; refresh < 2; refresh++) {
            const payload = yaml.load(await (await fetch(provider.url, { headers: provider.header })).text());
            expect(payload.proxies).toHaveLength(1);
            expect(payload.proxies[0]).toMatchObject({ name, password, 'ws-opts': { path } });
        }
    });

    it('does not add an empty UA or change user-defined provider headers', async () => {
        const provider = { type: 'http', url: 'https://custom.example.com/sub', header: { Authorization: ['Bearer test'] } };
        const builder = new ClashConfigBuilder('', [], [], { proxies: [], 'proxy-providers': { custom: provider } }, 'zh-CN');
        builder.providerUrls.push(remoteUrl);
        expect(Object.values(builder.generateProxyProviders())[0].header).toBeUndefined();
        const built = yaml.load(await builder.build());
        expect(built['proxy-providers'].custom).toEqual(provider);
    });
});

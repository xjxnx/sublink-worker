import { afterEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { parseSocksHttp } from '../src/parsers/protocols/socksHttpParser.js';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { encodeBase64 } from '../src/utils.js';
import { formLogicFn } from '../src/components/formLogic.js';

const GROUP_PREFIX = '🗺️ 前置代理';
const GROUP = `${GROUP_PREFIX}-SOCKS`;
const NODE = 'trojan://secret@node.example.com:443#Japan';
const SOCKS = 'socks://dXNlcjpwYXNzd29yZA@192.0.2.1:45001#SOCKS';
const build = (input = NODE, chainInput = SOCKS, enabled = true) => {
    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'mihomo');
    builder.chainProxyOptions = { enabled, input: chainInput };
    return builder;
};
const createTestApp = () => createApp({ kv: new MemoryKVAdapter() });
const query = () => new URLSearchParams({ config: NODE, chain_proxy: 'true', chain_proxy_input: SOCKS });

afterEach(() => vi.restoreAllMocks());

describe('SOCKS / HTTP chain proxy URIs', () => {
    it('parses unpadded Base64 credentials', () => {
        expect(parseSocksHttp(SOCKS)).toEqual({
            tag: 'SOCKS', type: 'socks', version: '5',
            server: '192.0.2.1', server_port: 45001,
            username: 'user', password: 'password'
        });
    });

    it.each(['socks', 'socks5', 'socks5h', 'http', 'https'])('supports %s credentials, IPv6 and encoded names', (scheme) => {
        const parsed = parseSocksHttp(`${scheme}://user%40name:p%3Aa%2Fss@[2001:db8::1]:443#%E9%A6%99%E6%B8%AF`);
        expect(parsed).toMatchObject({
            tag: '香港', server: '2001:db8::1', server_port: 443,
            username: 'user@name', password: 'p:a/ss', type: scheme.startsWith('http') ? 'http' : 'socks'
        });
        expect(parsed.tls?.enabled).toBe(scheme === 'https' ? true : undefined);
    });

    it('supports URL-safe Base64, whole encoded authorities and anonymous proxies', () => {
        const auth = encodeBase64('用户:密码:with-colon').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        expect(parseSocksHttp(`http://${auth}@example.com:8080`)).toMatchObject({ username: '用户', password: '密码:with-colon' });
        expect(parseSocksHttp(`socks://${encodeBase64('user:pass@example.com:1080')}`)).toMatchObject({ username: 'user', password: 'pass', server: 'example.com', server_port: 1080 });
        expect(parseSocksHttp('socks5://example.com:80')).toMatchObject({ server_port: 80 });
        expect(parseSocksHttp('http://example.com')).toMatchObject({ server_port: 80 });
        expect(parseSocksHttp('https://example.com')).toMatchObject({ server_port: 443, tls: { enabled: true } });
        expect(parseSocksHttp('socks5://example.com')).toMatchObject({ server_port: 1080 });
        expect(parseSocksHttp('socks5://example.com:1080#')).toMatchObject({ tag: 'example.com' });
    });

    it.each(['ss://user:pass@server:80', 'socks5://server:65536', 'http://server:0', 'http://server/path', 'socks://invalid@server:80'])('rejects invalid URI %s', (input) => {
        expect(() => parseSocksHttp(input)).toThrow(/Invalid chain proxy URI/);
    });
});

describe('Clash / Stash chain proxy output', () => {
    it('adds an independent protocol-filtered pool per chained node exactly once, including selector membership', async () => {
        const builder = build(NODE, `${SOCKS}\nhttps://user:pass@http.example.com:443?tls=true&sni=tls.example.com#HTTP`);
        const config = yaml.load(await builder.build());
        expect(config['proxy-groups'].find(g => g.name === GROUP)).toEqual({
            name: GROUP, type: 'select', 'include-all': true, filter: '^(?!直连).*', 'exclude-type': 'Socks5|Http'
        });
        expect(config['proxy-groups'].find(g => g.name === `${GROUP_PREFIX}-HTTP`)).toEqual({
            name: `${GROUP_PREFIX}-HTTP`, type: 'select', 'include-all': true, filter: '^(?!直连).*', 'exclude-type': 'Socks5|Http'
        });
        expect(config.proxies.find(p => p.type === 'socks5')).toMatchObject({ 'dialer-proxy': GROUP, username: 'user' });
        expect(config.proxies.find(p => p.type === 'http')).toMatchObject({ 'dialer-proxy': `${GROUP_PREFIX}-HTTP`, tls: true, sni: 'tls.example.com' });
        expect(config.proxies.find(p => p.type === 'trojan')['dialer-proxy']).toBeUndefined();
        expect(config['proxy-groups'].find(g => g.name === '🚀 节点选择').proxies).toEqual(expect.arrayContaining(['SOCKS', 'HTTP']));
        expect(yaml.load(builder.formatConfig())).toEqual(config);
    });

    it.each(['mihomo', 'Stash'])('names %s pools after each exit, truncating long names to eight characters', async (ua) => {
        const names = ['美国自建', 'na.c740b4112c1f1ecf.example.com新加坡', '住宅代理节点测试名称', '😀abcdefg额外'];
        const builder = build(NODE, names.map((name, index) => `${index % 2 ? 'http' : 'socks5'}://exit${index}.example.com:1080#${encodeURIComponent(name)}`).join('\n'));
        builder.userAgent = ua;
        const config = yaml.load(await builder.build());
        const groupNames = ['美国自建', 'na.c740b', '住宅代理节点测试', '😀abcdefg'].map(name => `${GROUP_PREFIX}-${name}`);
        names.forEach((name, index) => {
            expect(config.proxies.find(proxy => proxy.name === name)['dialer-proxy']).toBe(groupNames[index]);
            const group = config['proxy-groups'].find(group => group.name === groupNames[index]);
            expect(group).toMatchObject({ type: 'select' });
            if (ua === 'Stash') expect(group.proxies).toEqual(['Japan']);
            else expect(group['include-all']).toBe(true);
        });
        expect(config['proxy-groups'].filter(group => group.name.startsWith(GROUP_PREFIX))).toHaveLength(names.length);
        expect(yaml.load(builder.formatConfig())).toEqual(config);
    });

    it('keeps truncated and duplicate names independent while omitting duplicate nodes', async () => {
        const builder = build(NODE, [
            'socks5://first.example.com:1080#abcdefgh-first',
            'http://second.example.com:8080#abcdefgh-second',
            'socks5://third.example.com:1080#abcdefgh-first',
            'socks5://first.example.com:1080#abcdefgh-first'
        ].join('\n'));
        const config = yaml.load(await builder.build());
        const exits = config.proxies.filter(proxy => proxy['dialer-proxy']);
        expect(exits).toHaveLength(3);
        expect(exits.map(proxy => proxy['dialer-proxy'])).toEqual([
            `${GROUP_PREFIX}-abcdefgh`, `${GROUP_PREFIX}-abcdefgh-2`, `${GROUP_PREFIX}-abcdefgh-3`
        ]);
        expect(config['proxy-groups'].filter(group => group.name.startsWith(GROUP_PREFIX))).toHaveLength(3);
        expect(yaml.load(builder.formatConfig())).toEqual(config);
    });

    it.each(['mihomo', 'Stash'])('keeps repeated %s builds identical without duplicating exits or pools', async (ua) => {
        const builder = build(NODE, `${SOCKS}\nhttp://http.example.com:8080#SOCKS`);
        builder.userAgent = ua;
        const first = yaml.load(await builder.build());
        expect(first.proxies).toHaveLength(3);
        expect(first['proxy-groups'].filter(group => group.name.startsWith(GROUP_PREFIX))).toHaveLength(2);
        expect(yaml.load(await builder.build())).toEqual(first);
        expect(yaml.load(builder.formatConfig())).toEqual(first);
    });

    it('avoids collisions with existing proxy and group names', async () => {
        const poolName = `${GROUP_PREFIX}-abcdefgh`;
        const builder = build(`trojan://secret@node.example.com:443#${encodeURIComponent(poolName)}`, 'socks5://exit.example.com:1080#abcdefghExit');
        builder.config['proxy-groups'] = [{ name: `${poolName}-2`, type: 'select', proxies: ['DIRECT'] }];
        const config = yaml.load(await builder.build());
        expect(config.proxies.find(proxy => proxy.type === 'socks5')['dialer-proxy']).toBe(`${poolName}-3`);
        expect(config['proxy-groups'].find(group => group.name === `${poolName}-2`).proxies).toEqual(['DIRECT']);
        expect(config['proxy-groups'].find(group => group.name === `${poolName}-3`)['include-all']).toBe(true);
        expect(yaml.load(builder.formatConfig())).toEqual(config);
    });

    it('supports remote providers and preserves upstream SOCKS / HTTP nodes', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('proxies:\n  - {name: SS, type: ss, server: ss.example.com, port: 443, cipher: aes-128-gcm, password: test}', { headers: { 'content-type': 'text/yaml' } }));
        const remote = yaml.load(await build('https://subscription.example.com/nodes').build());
        expect(Object.keys(remote['proxy-providers'])).toHaveLength(1);
        expect(remote['proxy-groups'].find(g => g.name === GROUP)['include-all']).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const local = yaml.load(await build('proxies:\n  - {name: SOCKS, type: socks5, server: s.example.com, port: 1080}\n  - {name: HTTP, type: http, server: h.example.com, port: 8080}', '').build());
        expect(local.proxies.map(p => p.type)).toEqual(['socks5', 'http']);
        expect(local.proxies.every(p => !p['dialer-proxy'])).toBe(true);
    });

    it('preserves imported chain references when generating separate pools for new exits', async () => {
        const config = yaml.load(await build(`proxies:
  - {name: Existing, type: socks5, server: existing.example.com, port: 1080, dialer-proxy: '${GROUP_PREFIX}'}
proxy-groups:
  - {name: '${GROUP_PREFIX}', type: select, proxies: [DIRECT]}`).build());
        expect(config.proxies.find(proxy => proxy.name === 'Existing')['dialer-proxy']).toBe(GROUP_PREFIX);
        expect(config['proxy-groups'].find(group => group.name === GROUP_PREFIX).proxies).toEqual(['DIRECT']);
        expect(config.proxies.find(proxy => proxy.name === 'SOCKS')['dialer-proxy']).toBe(GROUP);
        expect(config['proxy-groups'].find(group => group.name === GROUP)['include-all']).toBe(true);
        expect(config['proxy-groups'].filter(group => group.name.startsWith(GROUP_PREFIX))).toHaveLength(2);
    });

    it('resolves remote subscriptions for Stash and excludes SOCKS / HTTP through explicit membership', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('proxies:\n  - {name: SS, type: ss, server: ss.example.com, port: 443, cipher: aes-128-gcm, password: test}\n  - {name: HTTP, type: http, server: h.example.com, port: 8080}\n  - {name: SOCKS, type: socks5, server: s.example.com, port: 1080}', { headers: { 'content-type': 'text/yaml' } }));
        const builder = build('https://subscription.example.com/nodes');
        builder.userAgent = 'Stash/3';
        const config = yaml.load(await builder.build());
        const exit = config.proxies.find(proxy => proxy.server === '192.0.2.1');
        expect(exit.name).toBe('SOCKS 2');
        expect(exit['dialer-proxy']).toBe(`${GROUP} 2`);
        expect(config['proxy-groups'].find(g => g.name === exit['dialer-proxy'])).toEqual({ name: `${GROUP} 2`, type: 'select', proxies: ['SS'] });
        expect(config.proxies.filter(p => ['http', 'socks5'].includes(p.type))).toHaveLength(3);
        expect(config['proxy-providers']).toBeUndefined();
    });

    it('keeps disabled output identical even with invalid chain input', async () => {
        const disabled = yaml.load(await build(NODE, 'invalid', false).build());
        const standard = yaml.load(await new ClashConfigBuilder(NODE, 'minimal', [], null, 'zh-CN', 'mihomo').build());
        expect(disabled).toEqual(standard);
        expect(yaml.load(await build(NODE, '').build())['proxy-groups'].some(g => g.name.startsWith(GROUP_PREFIX))).toBe(false);
    });

    it('preserves leading zeroes in password strings after YAML serialization', async () => {
        const config = yaml.load(await build(NODE, `socks://${encodeBase64('user:08052')}@192.0.2.1:1080`).build());
        expect(config.proxies.find(p => p.type === 'socks5').password).toBe('08052');
    });

    it('uses the consuming client UA for Stash compatibility and the custom UA for upstream requests', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('proxies:\n  - {name: SS, type: ss, server: ss.example.com, port: 443, cipher: aes-128-gcm, password: test}', { headers: { 'content-type': 'text/yaml' } }));
        const params = query();
        params.set('config', 'https://subscription.example.com/nodes');
        params.set('ua', 'mihomo');
        const response = await createTestApp().request(`https://example.com/clash?${params}`, { headers: { 'User-Agent': 'Stash/3' } });
        expect(response.status).toBe(200);
        const config = yaml.load(await response.text());
        expect(config['proxy-groups'].find(g => g.name === GROUP)).toEqual({ name: GROUP, type: 'select', proxies: ['SS'] });
        expect(config['proxy-providers']).toBeUndefined();
        expect(new Headers(fetchMock.mock.calls[0][1].headers).get('User-Agent')).toBe('mihomo');
    });

    it('decodes a Base64 node list and coexists with multi-port groups and imported groups', async () => {
        const builder = build(`${NODE}\n`, encodeBase64(`${SOCKS}\nhttp://server:8080#HTTP`));
        builder.multiPortOptions = { enabled: true, basePort: 20000, count: 2 };
        builder.config['proxy-groups'] = [{ name: '自定义', type: 'select', proxies: ['DIRECT'] }];
        const config = yaml.load(await builder.build());
        expect(config.proxies.filter(p => p['dialer-proxy']?.startsWith(GROUP_PREFIX))).toHaveLength(2);
        expect(config['proxy-groups'].filter(g => g.name === GROUP)).toHaveLength(1);
        expect(config['proxy-groups'].filter(g => g.name === `${GROUP_PREFIX}-HTTP`)).toHaveLength(1);
        expect(config['proxy-groups'].find(g => g.name === '自定义').proxies).toEqual(['DIRECT']);
        expect(config.listeners).toHaveLength(2);
        expect(config['proxy-groups'].find(g => g.name === GROUP).proxies).toBeUndefined();
        expect(yaml.load(builder.formatConfig())).toEqual(config);
    });

    it('returns clean errors for malformed nodes and rejects reserved node names', async () => {
        const response = await createTestApp().request(`https://example.com/clash?${new URLSearchParams({ config: NODE, chain_proxy: 'true', chain_proxy_input: 'https://user:secret@server:99999' })}`);
        expect(response.status).toBe(400);
        expect(await response.text()).not.toContain('secret');
        await expect(build(NODE, `socks://server:1080#${encodeURIComponent(GROUP_PREFIX)}`).build()).rejects.toThrow(/reserved/);
    });

    it.each(['mihomo', 'Stash'])('generates %s YAML through both full and shortened links', async (ua) => {
        const app = createTestApp();
        const url = `https://example.com/clash?${query()}`;
        const full = await app.request(url, { headers: { 'User-Agent': ua } });
        expect(full.status).toBe(200);
        const fullConfig = yaml.load(await full.text());
        expect(fullConfig.proxies.find(p => p.type === 'socks5')['dialer-proxy']).toBe(GROUP);
        if (ua === 'Stash') {
            expect(fullConfig['proxy-groups'].find(g => g.name === GROUP)).toEqual({ name: GROUP, type: 'select', proxies: ['Japan'] });
        }
        const shortened = await app.request(`https://example.com/shorten-v2?${new URLSearchParams({ url })}`);
        expect(shortened.status).toBe(200);
        const redirect = await app.request(`https://example.com/c/${await shortened.text()}`);
        const resolved = await app.request(redirect.headers.get('location'), { headers: { 'User-Agent': ua } });
        expect(yaml.load(await resolved.text())).toEqual(fullConfig);
    });

    it.each(['/singbox', '/surge', '/xray'])('leaves %s unchanged', async (path) => {
        const app = createTestApp();
        const plain = await app.request(`https://example.com${path}?${new URLSearchParams({ config: NODE })}`);
        const chained = await app.request(`https://example.com${path}?${query()}`);
        expect(chained.status).toBe(200);
        // Surge embeds its own update URL, whose query still carries the shared options.
        const configBody = text => path === '/surge' ? text.split('\n').slice(1).join('\n') : text;
        expect(configBody(await chained.text())).toBe(configBody(await plain.text()));
    });
});

describe('chain proxy form settings', () => {
    const setup = () => {
        const window = { location: { origin: 'https://example.com', search: '' }, APP_TRANSLATIONS: {} };
        return new Function('window', 'document', 'fetch', 'setTimeout',
            '(' + formLogicFn.toString() + ')(); return window.formData();')(
                window, { querySelector: () => null }, async () => ({ ok: true }), () => 1
            );
    };

    it('defaults off, restores chain input from generated links and omits it when switched off', async () => {
        const data = setup();
        expect(data.chainProxy).toBe(false);
        data.input = NODE;
        data.chainProxy = true;
        data.chainProxyInput = SOCKS;
        await data.submitForm();
        const restored = setup();
        restored.populateFormFromUrl(new URL(data.generatedLinks.clash));
        expect(restored.chainProxy).toBe(true);
        expect(restored.chainProxyInput).toBe(SOCKS);
        expect(restored.showAdvanced).toBe(true);
        expect(new URL(data.getSubconverterUrl()).searchParams.has('chain_proxy')).toBe(false);
        data.chainProxy = false;
        await data.submitForm();
        expect(new URL(data.generatedLinks.clash).searchParams.has('chain_proxy_input')).toBe(false);
        restored.populateFormFromUrl(new URL(data.generatedLinks.clash));
        expect(restored.chainProxy).toBe(false);
        expect(restored.chainProxyInput).toBe('');
    });
});

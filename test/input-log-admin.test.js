import { describe, it, expect, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { formLogicFn } from '../src/components/formLogic.js';

const ADMIN_TOKEN = 'secret-token';

const createTestApp = (kv, withToken = true, config = {}) =>
    createApp({
        kv,
        assetFetcher: null,
        logger: console,
        config: {
            configTtlSeconds: 60,
            shortLinkTtlSeconds: null,
            inputLogTtlSeconds: null,
            adminToken: withToken ? ADMIN_TOKEN : null,
            ...config
        }
    });

async function track(app, body) {
    const res = await app.request('http://localhost/track-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    expect(res.status).toBe(204);
}

describe('Input source tracking + admin viewer', () => {
    it('records input sources on convert and exposes them via /admin/inputs.json', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);

        await track(app, {
            input: 'vmess://a\ntrojan://b\nhttps://sub.example.com/list',
            configType: 'singbox',
            outputSources: {
                xray: 'https://example.com/xray?configId=abc',
                singbox: 'https://example.com/singbox?configId=abc',
                blocked: 'javascript:alert(1)'
            },
            options: { selectedRules: 'balanced', ua: 'clash' }
        });

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.count).toBe(1);

        const entry = body.entries[0];
        expect(entry.target).toBe('singbox');
        expect(entry.sources).toEqual(['vmess://a', 'trojan://b', 'https://sub.example.com/list']);
        expect(entry.outputSources).toEqual([
            { type: 'xray', url: 'https://example.com/xray?configId=abc' },
            { type: 'singbox', url: 'https://example.com/singbox?configId=abc' }
        ]);
        expect(entry.options.selectedRules).toBe('balanced');
        expect(entry.options.ua).toBe('clash');
        expect(typeof entry.createdAt).toBe('number');
    });

    it('ignores empty input without creating a record', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);

        await track(app, { input: '   ', configType: 'clash' });

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        const body = await res.json();
        expect(body.count).toBe(0);
    });

    it.each([false, true])('records resolvable short links for large node lists (chain proxy: %s)', async chainProxy => {
        const app = createTestApp(new MemoryKVAdapter());
        let tracking;
        const fetch = (path, options) => {
            const response = app.request(path, options);
            if (path === '/track-input') tracking = response;
            return response;
        };
        const initialize = new Function(
            'window', 'document', 'fetch', 'setTimeout', 'clearTimeout',
            '(' + formLogicFn.toString() + ')(); return window.formData();'
        );
        const data = initialize(
            { APP_TRANSLATIONS: {}, location: { origin: 'http://localhost', search: '' } },
            { querySelector: () => null }, fetch, () => 1, () => {}
        );
        data.input = [
            ...Array.from({ length: 60 }, (_, i) => `trojan://demo-password@node${i}.example.com:443?security=tls&type=tcp&sni=node${i}.example.com&allowInsecure=1#${encodeURIComponent(`节点 ${i}`)}`),
            'socks5://demo:password@socks.example.com:1080#SOCKS'
        ].join('\n');
        data.chainProxy = chainProxy;
        data.chainProxyInput = 'socks5://demo:password@socks.example.com:1080#SOCKS\nhttp://demo:password@http.example.com:8080#HTTP';

        await data.submitForm();
        expect(tracking).toBeDefined();
        expect((await tracking).status).toBe(204);
        const { entries } = await (await app.request(`/admin/inputs.json?token=${ADMIN_TOKEN}`)).json();
        expect(entries).toHaveLength(1);
        expect(entries[0].sources).toEqual(data.input.split('\n'));
        expect(entries[0].chainSources).toEqual(chainProxy ? data.chainProxyInput.split('\n') : []);
        expect(entries[0].outputSources.map(output => output.type)).toEqual(Object.keys(data.generatedLinks));
        expect(new Set(entries[0].outputSources.map(output => new URL(output.url).pathname.split('/').at(-1))).size).toBe(1);

        const html = await (await app.request(`/admin/inputs?token=${ADMIN_TOKEN}`)).text();
        for (const { type, url } of entries[0].outputSources) {
            expect(data.generatedLinks[type].length).toBeGreaterThan(8192);
            expect(url).toMatch(/^http:\/\/localhost\/[xbcs]\/[a-zA-Z0-9_-]+$/);
            const redirect = await app.request(url);
            expect(redirect.status).toBe(302);
            expect(redirect.headers.get('Location')).toBe(data.generatedLinks[type]);
            const params = new URL(redirect.headers.get('Location')).searchParams;
            expect(params.get('config')).toBe(data.input);
            expect(params.get('chain_proxy_input')).toBe(chainProxy ? data.chainProxyInput : null);
            expect(html).toContain(`aria-label="复制 ${type} 链接"`);
            expect(html).toContain(url.replaceAll('&', '&amp;'));
        }
    });

    it('stores and displays chain inputs alongside shortened output URLs', async () => {
        const app = createTestApp(new MemoryKVAdapter());
        const socks = 'socks5://demo:password@socks.example.com:1080#SOCKS';
        const http = 'http://demo:password@http.example.com:8080#<script>alert(1)</script>';
        await track(app, {
            input: 'https://subscription.example.com/list',
            chainProxyInput: ` ${socks}\r\n\n${http} `,
            outputSources: { clash: `http://localhost/clash?config=${'x'.repeat(64 * 1024)}` },
            options: { chain_proxy: 'true' }
        });
        const { entries } = await (await app.request(`/admin/inputs.json?token=${ADMIN_TOKEN}`)).json();
        expect(entries[0].sources).toEqual(['https://subscription.example.com/list']);
        expect(entries[0].chainSources).toEqual([socks, http]);
        expect(entries[0].outputSources).toEqual([{ type: 'clash', url: expect.stringMatching(/^http:\/\/localhost\/c\//) }]);
        expect(entries[0].options.chain_proxy).toBe('true');
        const html = await (await app.request(`/admin/inputs?token=${ADMIN_TOKEN}`)).text();
        expect(html).toContain('链式代理 SOCKS5 / HTTP');
        expect(html).toContain(socks);
        expect(html).toContain('http://demo:password@http.example.com:8080#&lt;script&gt;');
        expect(html).not.toContain('<script>alert(1)</script>');
    });

    it.each([false, true])('recovers chain inputs from output URLs for older records and clients (stored record: %s)', async stored => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        const nodes = ['socks5://socks.example.com:1080#SOCKS', 'http://http.example.com:8080#HTTP'];
        const outputSources = { clash: `http://localhost/clash?${new URLSearchParams({ chain_proxy: 'true', chain_proxy_input: nodes.join('\n'), padding: 'x'.repeat(8192) })}` };
        if (stored) {
            await kv.put('inlog:legacy-chain', JSON.stringify({ createdAt: 1, sources: ['https://subscription.example.com'], outputSources }));
        } else {
            await track(app, { input: 'https://subscription.example.com', outputSources });
        }
        const { entries } = await (await app.request(`/admin/inputs.json?token=${ADMIN_TOKEN}`)).json();
        expect(entries[0].chainSources).toEqual(nodes);
        if (stored) expect(JSON.parse(await kv.get('inlog:legacy-chain')).chainSources).toBeUndefined();
    });

    it('keeps explicitly disabled chain input empty instead of recovering stale output parameters', async () => {
        const app = createTestApp(new MemoryKVAdapter());
        await track(app, {
            input: 'https://subscription.example.com', chainProxyInput: '',
            outputSources: { clash: `https://example.com/clash?${new URLSearchParams({ chain_proxy: 'true', chain_proxy_input: 'socks5://old.example.com:1080' })}` }
        });
        const { entries } = await (await app.request(`/admin/inputs.json?token=${ADMIN_TOKEN}`)).json();
        expect(entries[0].chainSources).toEqual([]);
    });

    it('skips unsafe output URLs and only shortens local conversion URLs', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        const validUrl = 'https://example.com/clash?config=complete';
        const longPrefix = 'https://example.com/singbox?config=';
        const longUrl = longPrefix + 'a'.repeat(8192 - longPrefix.length);
        await track(app, {
            input: 'vless://node',
            outputSources: [
                null,
                { type: 'clash', url: ` ${validUrl} ` },
                { type: 'singbox', url: longUrl },
                { type: 'oversized', url: `https://example.com/?config=${'a'.repeat(64 * 1024)}` },
                { type: 'foreign', url: `https://example.com/clash?config=${'a'.repeat(8192)}` },
                { type: 'unsafe', url: 'java\nscript:alert(1)' },
                { type: 'data', url: 'data:text/html,<script>alert(1)</script>' }
            ]
        });

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        const body = await res.json();
        expect(body.entries[0].outputSources).toEqual([
            { type: 'clash', url: validUrl },
            { type: 'singbox', url: longUrl }
        ]);
    });

    it.each([8192, 8193, 64 * 1024])('preserves the full query for an output URL of %s characters', async length => {
        const app = createTestApp(new MemoryKVAdapter());
        const prefix = 'http://localhost/clash?config=';
        const url = prefix + 'a'.repeat(length - prefix.length);
        await track(app, { input: 'vless://node', outputSources: { clash: url } });
        const { entries } = await (await app.request(`/admin/inputs.json?token=${ADMIN_TOKEN}`)).json();
        expect(entries[0].outputSources).toHaveLength(1);
        const output = entries[0].outputSources[0];
        if (length <= 8192) {
            expect(output.url).toBe(url);
        } else {
            expect(output.url.length).toBeLessThan(8192);
            const redirect = await app.request(output.url);
            expect(redirect.status).toBe(302);
            expect(redirect.headers.get('Location')).toBe(url);
        }
    });

    it.each([0, 120, null])('uses the input log TTL for generated short links (configured TTL: %s)', async ttl => {
        const kv = new MemoryKVAdapter();
        const put = vi.spyOn(kv, 'put');
        const app = createTestApp(kv, true, { inputLogTtlSeconds: ttl, shortLinkTtlSeconds: 60 });
        await track(app, { input: 'vless://node', outputSources: { clash: `http://localhost/clash?config=${'a'.repeat(8192)}` } });
        expect(put).toHaveBeenCalledTimes(2);
        const expectedOptions = ttl === 0 ? undefined : { expirationTtl: ttl ?? 40 * 24 * 60 * 60 };
        expect(put.mock.calls.map(call => call[2])).toEqual([expectedOptions, expectedOptions]);
    });

    it('renders old records without output sources', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        await kv.put('inlog:legacy', JSON.stringify({ createdAt: 1, sources: ['vless://legacy'] }));

        const res = await app.request(`http://localhost/admin/inputs?token=${ADMIN_TOKEN}`);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('vless://legacy');
    });

    it('escapes output labels and URLs in the admin HTML', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        await track(app, {
            input: 'vless://node',
            outputSources: [
                { type: '<img src=x onerror=alert(1)>', url: 'https://example.com/?q="<script>alert(1)</script>' },
                { type: 'unsafe', url: 'javascript:alert(1)' }
            ]
        });

        const res = await app.request(`http://localhost/admin/inputs?token=${ADMIN_TOKEN}`);
        const html = await res.text();
        expect(res.status).toBe(200);
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).not.toContain('href="javascript:');
        expect(html).toContain('&lt;img');
        expect(html).toContain('rel="noopener noreferrer"');
    });

    it('orders entries by time (newest first)', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);

        await track(app, { input: 'vmess://first', configType: 'clash' });
        await new Promise((r) => setTimeout(r, 5));
        await track(app, { input: 'vmess://second', configType: 'clash' });

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        const body = await res.json();
        expect(body.count).toBe(2);
        expect(body.entries[0].sources[0]).toBe('vmess://second');
        expect(body.entries[0].createdAt).toBeGreaterThanOrEqual(body.entries[1].createdAt);
    });

    it('returns the NEWEST records when total exceeds the limit (not the oldest)', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);

        // Create more records than the requested limit, spaced so timestamps differ.
        for (let i = 0; i < 4; i++) {
            await track(app, { input: `vmess://node-${i}`, configType: 'clash' });
            await new Promise((r) => setTimeout(r, 3));
        }

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}&limit=2`);
        const body = await res.json();
        expect(body.count).toBe(2);

        const sources = body.entries.map((e) => e.sources[0]);
        expect(sources).toEqual(['vmess://node-3', 'vmess://node-2']);
        expect(sources).not.toContain('vmess://node-0');
    });

    it('rejects the viewer without a valid token', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        const res = await app.request('http://localhost/admin/inputs.json');
        expect(res.status).toBe(403);
    });

    it('returns 503 for the viewer when ADMIN_TOKEN is not configured', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv, false);
        const res = await app.request('http://localhost/admin/inputs.json?token=whatever');
        expect(res.status).toBe(503);
    });

    it('deletes a single record via DELETE /admin/inputs', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        await track(app, { input: 'vmess://to-delete', configType: 'clash' });

        const listRes = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        const { entries } = await listRes.json();
        expect(entries.length).toBe(1);
        const key = entries[0].key;
        expect(key).toBeTruthy();

        const delRes = await app.request(
            `http://localhost/admin/inputs?key=${encodeURIComponent(key)}&token=${ADMIN_TOKEN}`,
            { method: 'DELETE' }
        );
        expect(delRes.status).toBe(200);
        expect((await delRes.json()).deleted).toBe(true);

        const afterRes = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        expect((await afterRes.json()).count).toBe(0);
    });

    it('rejects delete without a valid token and ignores foreign keys', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);

        const noToken = await app.request('http://localhost/admin/inputs?key=inlog:x', {
            method: 'DELETE'
        });
        expect(noToken.status).toBe(403);

        const foreign = await app.request(
            `http://localhost/admin/inputs?key=someShortCode&token=${ADMIN_TOKEN}`,
            { method: 'DELETE' }
        );
        expect(foreign.status).toBe(200);
        expect((await foreign.json()).deleted).toBe(false);
    });

    it('serves the HTML viewer page with recorded sources', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        await track(app, {
            input: 'vless://node-xyz',
            configType: 'surge',
            outputSources: { surge: 'https://localhost/surge?configId=xyz' }
        });

        const res = await app.request(`http://localhost/admin/inputs?token=${ADMIN_TOKEN}`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('vless://node-xyz');
        expect(html).toContain('输出源');
        expect(html).toContain('https://localhost/surge?configId=xyz');
        expect(html).toContain('输入源记录');
    });
});

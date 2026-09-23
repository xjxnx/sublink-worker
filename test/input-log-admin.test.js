import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

const ADMIN_TOKEN = 'secret-token';

const createTestApp = (kv, withToken = true) =>
    createApp({
        kv,
        assetFetcher: null,
        logger: console,
        config: {
            configTtlSeconds: 60,
            shortLinkTtlSeconds: null,
            inputLogTtlSeconds: null,
            adminToken: withToken ? ADMIN_TOKEN : null
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

    it('skips oversized and unsafe output URLs without storing truncated links', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv);
        const validUrl = 'https://example.com/clash?config=complete';
        await track(app, {
            input: 'vless://node',
            outputSources: [
                null,
                { type: 'clash', url: ` ${validUrl} ` },
                { type: 'oversized', url: `https://example.com/?config=${'a'.repeat(8192)}` },
                { type: 'unsafe', url: 'java\nscript:alert(1)' },
                { type: 'data', url: 'data:text/html,<script>alert(1)</script>' }
            ]
        });

        const res = await app.request(`http://localhost/admin/inputs.json?token=${ADMIN_TOKEN}`);
        const body = await res.json();
        expect(body.entries[0].outputSources).toEqual([{ type: 'clash', url: validUrl }]);
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

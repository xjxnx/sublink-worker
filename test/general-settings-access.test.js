import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { createCloudflareRuntime } from '../src/runtime/cloudflare.js';

const ORIGIN = 'https://example.com';
const PASSWORD = 'test-password-please-change';
const NODE = 'trojan://secret@node.example.com:443#Japan';
const createTestApp = (password = PASSWORD, kv = new MemoryKVAdapter()) => createApp({
    kv,
    config: { generalSettingsPassword: password }
});
const post = (app, path, body, cookie = '', headers = {}) => app.request(ORIGIN + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: ORIGIN, ...headers },
    body: JSON.stringify(body)
});
const unlock = async (app) => {
    const response = await post(app, '/general-settings/unlock', { password: PASSWORD });
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie').split(';')[0];
};
const subscriptionUrl = (path = '/clash', option = 'group_by_country=true') =>
    `${ORIGIN}${path}?config=${encodeURIComponent(NODE)}&${option}`;
const sign = async (app, url, cookie) => {
    const response = await post(app, '/general-settings/sign', { url }, cookie);
    expect(response.status).toBe(200);
    return (await response.json()).url;
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('general settings password protection', () => {
    it('keeps default conversions and unconfigured deployments accessible', async () => {
        expect((await createTestApp().request(subscriptionUrl('/clash', 'include_auto_select=true'))).status).toBe(200);
        expect((await createTestApp(null).request(subscriptionUrl())).status).toBe(200);
        expect(createCloudflareRuntime({ GENERAL_SETTINGS_PASSWORD: PASSWORD }).config.generalSettingsPassword).toBe(PASSWORD);
    });

    it('renders the lock without exposing the configured password', async () => {
        const html = await (await createTestApp().request(ORIGIN)).text();
        expect(html).toContain('settings-password');
        expect(html).toContain('window.GENERAL_SETTINGS_PROTECTED = true');
        expect(html).toContain('<fieldset disabled');
        expect(html).not.toContain(PASSWORD);
    });

    it.each(['/clash', '/singbox', '/surge', '/xray', '/subconverter'])('guards direct requests to %s', async (path) => {
        expect((await createTestApp().request(subscriptionUrl(path))).status).toBe(403);
    });

    it.each([
        'include_auto_select=false', 'exclude_invalid_nodes=true', 'enable_clash_ui=true',
        'external_controller=0.0.0.0%3A9090', 'external_ui_download_url=https%3A%2F%2Fexample.com%2Fui.zip',
        'multiPort=true', 'basePort=20000', 'count=3', 'chain_proxy=true',
        'chain_proxy=false&chain_proxy=true', 'group_by_country=false&group_by_country=true'
    ])('guards protected option %s', async (option) => {
        expect((await createTestApp().request(subscriptionUrl('/clash', option))).status).toBe(403);
    });

    it('rejects wrong passwords, malformed requests and cross-origin unlocks', async () => {
        const app = createTestApp();
        const wrong = await post(app, '/general-settings/unlock', { password: 'wrong' });
        expect(wrong.status).toBe(403);
        expect(wrong.headers.get('set-cookie')).toBeNull();
        expect((await post(app, '/general-settings/unlock', { password: {} })).status).toBe(400);
        const crossOrigin = await app.request(ORIGIN + '/general-settings/unlock', {
            method: 'POST', headers: { Origin: 'https://other.example' }, body: JSON.stringify({ password: PASSWORD })
        });
        expect(crossOrigin.status).toBe(403);
    });

    it('locks on the tenth wrong password for 24 hours from that attempt', async () => {
        const app = createTestApp();
        const startedAt = Date.now();
        const now = vi.spyOn(Date, 'now').mockReturnValue(startedAt);
        for (let i = 0; i < 9; i++) {
            expect((await post(app, '/general-settings/unlock', { password: 'wrong' })).status).toBe(403);
        }
        now.mockReturnValue(startedAt + 60 * 60 * 1000);
        const blocked = await post(app, '/general-settings/unlock', { password: 'wrong' });
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get('retry-after')).toBe('86400');
        expect(await blocked.json()).toMatchObject({ retryAfter: 86400 });
        expect(blocked.headers.get('set-cookie')).toBeNull();
        now.mockReturnValue(startedAt + 25 * 60 * 60 * 1000 - 1000);
        const correctButLocked = await post(app, '/general-settings/unlock', { password: PASSWORD });
        expect(correctButLocked.status).toBe(429);
        expect(correctButLocked.headers.get('retry-after')).toBe('1');
        expect(correctButLocked.headers.get('set-cookie')).toBeNull();
        now.mockReturnValue(startedAt + 25 * 60 * 60 * 1000);
        await unlock(app);
    });

    it('clears previous failures on a successful unlock before the limit', async () => {
        const app = createTestApp();
        for (let i = 0; i < 9; i++) await post(app, '/general-settings/unlock', { password: 'wrong' });
        await unlock(app);
        for (let i = 0; i < 9; i++) {
            expect((await post(app, '/general-settings/unlock', { password: 'wrong' })).status).toBe(403);
        }
        expect((await post(app, '/general-settings/unlock', { password: 'wrong' })).status).toBe(429);
    });

    it('counts concurrent wrong passwords without losing updates', async () => {
        const app = createTestApp();
        const responses = await Promise.all(Array.from({ length: 20 }, () =>
            post(app, '/general-settings/unlock', { password: 'wrong' })));
        expect(responses.filter(response => response.status === 403)).toHaveLength(9);
        expect(responses.filter(response => response.status === 429)).toHaveLength(11);
        expect((await post(app, '/general-settings/unlock', { password: PASSWORD })).status).toBe(429);
    });

    it('keeps failures and lockouts when an app is recreated with the same KV', async () => {
        const kv = new MemoryKVAdapter();
        const put = vi.spyOn(kv, 'put');
        const first = createTestApp(PASSWORD, kv);
        for (let i = 0; i < 5; i++) await post(first, '/general-settings/unlock', { password: 'wrong' });
        const second = createTestApp(PASSWORD, kv);
        for (let i = 0; i < 4; i++) await post(second, '/general-settings/unlock', { password: 'wrong' });
        expect((await post(first, '/general-settings/unlock', { password: 'wrong' })).status).toBe(429);
        expect((await post(createTestApp(PASSWORD, kv), '/general-settings/unlock', { password: PASSWORD })).status).toBe(429);
        expect(new Set(put.mock.calls.map(([key]) => key)).size).toBe(10);
        for (const [key, value, options] of put.mock.calls) {
            expect(key).not.toContain(PASSWORD);
            expect(value).not.toContain('wrong');
            expect(options.expirationTtl).toBe(86400);
        }
    });

    it('isolates client IPs and ignores changes to the forwarded proxy suffix', async () => {
        const app = createTestApp();
        for (let i = 0; i < 10; i++) {
            const response = await post(app, '/general-settings/unlock', { password: 'wrong' }, '', {
                'X-Forwarded-For': `203.0.113.1, 192.0.2.${i + 1}`
            });
            expect(response.status).toBe(i === 9 ? 429 : 403);
        }
        expect((await post(app, '/general-settings/unlock', { password: PASSWORD }, '', {
            'CF-Connecting-IP': '203.0.113.1', 'X-Forwarded-For': '203.0.113.2'
        })).status).toBe(429);
        expect((await post(app, '/general-settings/unlock', { password: PASSWORD }, '', {
            'CF-Connecting-IP': '203.0.113.2'
        })).status).toBe(200);
    });

    it('keeps the limit when no KV is configured', async () => {
        const app = createTestApp(PASSWORD, null);
        for (let i = 0; i < 10; i++) await post(app, '/general-settings/unlock', { password: 'wrong' });
        expect((await post(app, '/general-settings/unlock', { password: PASSWORD })).status).toBe(429);
    });

    it.each(['get', 'put', 'delete'])('does not unlock when KV %s fails', async (operation) => {
        const kv = new MemoryKVAdapter();
        vi.spyOn(kv, operation).mockRejectedValue(new Error('Storage unavailable'));
        const app = createTestApp(PASSWORD, kv);
        const response = await post(app, '/general-settings/unlock', { password: operation === 'put' ? 'wrong' : PASSWORD });
        expect(response.status).toBe(503);
        expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('starts a fresh attempt window after 24 hours without reaching the limit', async () => {
        const app = createTestApp();
        const startedAt = Date.now();
        const now = vi.spyOn(Date, 'now').mockReturnValue(startedAt);
        for (let i = 0; i < 9; i++) await post(app, '/general-settings/unlock', { password: 'wrong' });
        now.mockReturnValue(startedAt + 24 * 60 * 60 * 1000);
        expect((await post(app, '/general-settings/unlock', { password: 'wrong' })).status).toBe(403);
        await unlock(app);
    });

    it('uses a private expiring cookie and clears it on relock', async () => {
        const app = createTestApp();
        const response = await post(app, '/general-settings/unlock', { password: PASSWORD });
        const header = response.headers.get('set-cookie');
        expect(header).toContain('HttpOnly');
        expect(header).toContain('Secure');
        expect(header).toContain('SameSite=Strict');
        expect(header).not.toContain(PASSWORD);
        const cookie = header.split(';')[0];
        const status = await app.request(ORIGIN + '/general-settings/session', { headers: { Cookie: cookie } });
        expect(await status.json()).toEqual({ unlocked: true });
        expect(status.headers.get('cache-control')).toContain('no-store');
        const locked = await app.request(ORIGIN + '/general-settings/session', { method: 'DELETE', headers: { Cookie: cookie } });
        expect(locked.headers.get('set-cookie')).toContain('Max-Age=0');
        expect((await post(app, '/general-settings/sign', { url: subscriptionUrl() })).status).toBe(403);
        vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 13 * 60 * 60 * 1000);
        try {
            expect((await post(app, '/general-settings/sign', { url: subscriptionUrl() }, cookie)).status).toBe(403);
        } finally { vi.restoreAllMocks(); }
    });

    it('keeps signed subscriptions usable without cookies in all formats and short links', async () => {
        const app = createTestApp();
        const cookie = await unlock(app);
        const signed = await sign(app, subscriptionUrl(), cookie);
        expect(signed).not.toContain(PASSWORD);
        expect(new URL(signed).searchParams.get('settings_token')).toMatch(/^[a-f0-9]{64}$/);
        const shortened = await app.request(`${ORIGIN}/shorten-v2?url=${encodeURIComponent(signed)}`);
        const code = await shortened.text();
        for (const [prefix, path] of [['c', '/clash'], ['b', '/singbox'], ['s', '/surge'], ['x', '/xray']]) {
            const url = new URL(signed);
            url.pathname = path;
            expect((await app.request(url.toString())).status).toBe(200);
            const redirect = await app.request(`${ORIGIN}/${prefix}/${code}`);
            expect(redirect.status).toBe(302);
            expect((await app.request(redirect.headers.get('location'))).status).toBe(200);
        }
        const sub = await sign(app, `${ORIGIN}/subconverter?group_by_country=true&include_auto_select=false`, cookie);
        expect((await app.request(sub)).status).toBe(200);
    });

    it('rejects tampered, copied and revoked authorizations', async () => {
        const app = createTestApp();
        const cookie = await unlock(app);
        const signed = await sign(app, subscriptionUrl(), cookie);
        for (const [key, value] of [['config', NODE + 'other'], ['include_auto_select', 'false'], ['settings_token', 'a'.repeat(64)]]) {
            const changed = new URL(signed);
            changed.searchParams.set(key, value);
            expect((await app.request(changed.toString())).status).toBe(403);
        }
        expect((await app.request(signed + '&settings_token=duplicate')).status).toBe(403);
        expect((await app.request(signed.replace(ORIGIN, 'https://elsewhere.example'))).status).toBe(403);
        const rotated = createTestApp('different-password');
        expect((await rotated.request(signed)).status).toBe(403);
        expect((await post(rotated, '/general-settings/sign', { url: subscriptionUrl() }, cookie)).status).toBe(403);
        const reversed = new URL(signed);
        reversed.search = new URLSearchParams([...reversed.searchParams].reverse()).toString();
        expect((await app.request(reversed.toString())).status).toBe(200);
    });

    it('only signs local conversion URLs with an unlocked session', async () => {
        const app = createTestApp();
        const cookie = await unlock(app);
        for (const url of ['https://other.example/clash', ORIGIN + '/admin/inputs', 'invalid']) {
            expect((await post(app, '/general-settings/sign', { url }, cookie)).status).toBe(400);
        }
    });
});

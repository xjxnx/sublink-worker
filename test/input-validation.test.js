import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { encodeBase64 } from '../src/utils.js';
import { formLogicFn } from '../src/components/formLogic.js';

const MESSAGE = '请输入正确订阅链接或者节点';
const NODE = 'trojan://demo-password@node.example.com:443#Test';
const YAML = 'proxies:\n  - {name: Test, type: trojan, server: node.example.com, port: 443, password: demo-password}';
const app = () => createApp({ kv: new MemoryKVAdapter(), logger: { error: vi.fn() } });
const validate = (instance, config, lang = 'zh-CN') => instance.request(`/validate-input?lang=${lang}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config })
});

afterEach(() => vi.restoreAllMocks());

describe('input content validation', () => {
    it.each([
        'not a subscription', '   ', 'ftp://example.com/file', 'vmess://invalid', 'trojan://missing-server',
        'vless://user@host:70000#Invalid', 'proxies: []', 'proxies:\n  - {name: Fake, type: socks5}',
        '{"outbounds":[{"type":"direct","tag":"DIRECT"}]}',
        'trojan://@node.example.com:443#MissingPassword',
        'anytls://@node.example.com:443#MissingPassword',
        'vless://@node.example.com:443#MissingUUID',
        'tuic://:password@node.example.com:443#MissingUUID',
        'vmess://' + encodeBase64(JSON.stringify({ ps: 'MissingUUID', add: 'node.example.com', port: '443' })),
        'proxies:\n  - {name: MissingPassword, type: ss, server: node.example.com, port: 443, cipher: aes-128-gcm}'
    ])('rejects invalid input without generating any format: %s', async input => {
        const instance = app();
        const checked = await validate(instance, input);
        expect(checked.status).toBe(400);
        expect(await checked.text()).toBe(MESSAGE);
        for (const format of ['singbox', 'clash', 'surge', 'xray']) {
            const response = await instance.request(`/${format}?${new URLSearchParams({ config: input })}`);
            expect(response.status).toBe(400);
            expect(await response.text()).toBe(MESSAGE);
        }
    });

    it.each([
        ['web page', '<html><body>Download proxies: client.apk</body></html>', 'text/html'],
        ['APK', 'PK\u0003\u0004binary download', 'application/vnd.android.package-archive'],
        ['JSON without nodes', '{"route":{},"inbounds":[]}', 'application/json'],
        ['empty provider', 'proxies: []', 'text/yaml'],
        ['malformed provider', 'proxies:\n  - {name: Invalid, type: trojan}', 'text/yaml']
    ])('rejects a remote %s instead of accepting its URL as a subscription', async (_, content, contentType) => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(content, { headers: { 'Content-Type': contentType } }));
        const instance = app();
        const source = 'https://download.example.com/client.apk';
        expect((await validate(instance, source)).status).toBe(400);
        for (const format of ['singbox', 'clash', 'surge', 'xray']) {
            const response = await instance.request(`/${format}?${new URLSearchParams({ config: source })}`);
            expect(response.status).toBe(400);
            expect(await response.text()).toBe(MESSAGE);
        }
    });

    it('does not read the body of a known binary download', async () => {
        const text = vi.fn();
        const cancel = vi.fn();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true, headers: new Headers({ 'Content-Type': 'application/vnd.android.package-archive' }),
            text, body: { cancel }
        });
        expect((await validate(app(), 'https://example.com/client.apk')).status).toBe(400);
        expect(text).not.toHaveBeenCalled();
        expect(cancel).toHaveBeenCalledOnce();
    });

    it.each([
        NODE, NODE.split('#')[0], encodeBase64(NODE), YAML, encodeBase64(YAML),
        JSON.stringify({ outbounds: [{ type: 'trojan', tag: 'Test', server: 'node.example.com', server_port: 443, password: 'demo-password' }] }),
        '[Proxy]\nTest = trojan, node.example.com, 443, password=demo-password'
    ])('accepts supported nodes, encoded lists and configuration sources', async input => {
        const instance = app();
        expect((await validate(instance, input)).status).toBe(200);
        for (const format of ['singbox', 'clash', 'surge', 'xray']) {
            expect((await instance.request(`/${format}?${new URLSearchParams({ config: input })}`)).status).toBe(200);
        }
    });

    it('accepts real subscription content without relying on file extensions or MIME types', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(YAML, { headers: { 'Content-Type': 'application/octet-stream' } }));
        const instance = app();
        const input = 'https://example.com/subscription?token=demo';
        expect((await validate(instance, input)).status).toBe(200);
        const response = await instance.request(`/clash?${new URLSearchParams({ config: input })}`);
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('proxy-providers:');
    });

    it('accepts anonymous SOCKS and HTTP nodes without requiring credentials', async () => {
        for (const config of ['socks5://node.example.com:1080', 'proxies:\n  - {name: Anonymous, type: http, server: node.example.com, port: 8080}']) {
            expect((await validate(app(), config)).status).toBe(200);
        }
    });

    it('rejects failed subscription downloads and returns localized errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('Not found', { status: 404 }));
        const response = await validate(app(), 'https://example.com/sub', 'en-US');
        expect(response.status).toBe(400);
        expect(await response.text()).toBe('Please enter a valid subscription URL or proxy node');
    });

    it.each(['', 'mihomo'])('uses the same upstream User-Agent as conversion requests (custom: %s)', async ua => {
        const upstream = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(YAML));
        const response = await app().request('/validate-input', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Stash' },
            body: JSON.stringify({ config: 'https://example.com/sub', ua })
        });
        expect(response.status).toBe(200);
        expect(new Headers(upstream.mock.calls[0][1].headers).get('User-Agent')).toBe(ua || 'Stash');
    });

    it('rejects invalid validation payloads and keeps the endpoint non-indexable', async () => {
        const response = await app().request('/validate-input', { method: 'POST', body: '{' });
        expect(response.status).toBe(400);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    });
});

describe('conversion form validation', () => {
    const setup = fetchMock => {
        const window = {
            APP_LANG: 'zh-CN', APP_TRANSLATIONS: { invalidInput: MESSAGE, errorGeneratingLinks: 'Unable to validate' },
            location: { origin: 'https://example.com', search: '' }
        };
        const alert = vi.fn();
        const data = new Function('window', 'document', 'fetch', 'setTimeout', 'clearTimeout', 'alert',
            '(' + formLogicFn.toString() + ')(); return window.formData();')(
                window, { querySelector: () => null }, fetchMock, () => 1, () => {}, alert
            );
        data.input = 'https://example.com/client.apk';
        return { data, alert };
    };

    it('shows an input error and publishes or logs no output for rejected sources', async () => {
        const fetchMock = vi.fn(async () => ({ ok: false, status: 400 }));
        const { data, alert } = setup(fetchMock);
        data.generatedLinks = { clash: 'old' };
        data.shortenedLinks = { clash: 'old-short' };
        data.justConverted = true;
        await data.submitForm();
        expect(data.inputError).toBe(MESSAGE);
        expect(data.generatedLinks).toBeNull();
        expect(data.shortenedLinks).toBeNull();
        expect(data.justConverted).toBe(false);
        expect(data.loading).toBe(false);
        expect(alert).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('waits for successful validation before publishing or tracking links', async () => {
        let resolveValidation;
        const validation = new Promise(resolve => { resolveValidation = resolve; });
        const fetchMock = vi.fn(path => path.startsWith('/validate-input') ? validation : Promise.resolve({}));
        const { data } = setup(fetchMock);
        data.input = NODE;
        data.customUA = 'mihomo';
        const pending = data.submitForm();
        expect(data.generatedLinks).toBeNull();
        expect(data.loading).toBe(true);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ config: NODE, ua: 'mihomo' });
        resolveValidation({ ok: true });
        await pending;
        expect(Object.keys(data.generatedLinks)).toHaveLength(4);
        expect(fetchMock.mock.calls.at(-1)[0]).toBe('/track-input');
        expect(data.inputError).toBe('');
    });

    it.each([true, false])('discards stale validation after the source changes (valid: %s)', async ok => {
        let resolveValidation;
        const fetchMock = vi.fn(() => new Promise(resolve => { resolveValidation = resolve; }));
        const { data } = setup(fetchMock);
        const pending = data.submitForm();
        data.input = NODE;
        resolveValidation({ ok, status: ok ? 200 : 400 });
        await pending;
        expect(data.generatedLinks).toBeNull();
        expect(data.inputError).toBe('');
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});

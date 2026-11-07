import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { CONVERSION_GUIDES } from '../src/content/conversionGuides.js';

const ORIGIN = 'https://example.com';
const createTestApp = (config = {}) => createApp({
    kv: new MemoryKVAdapter(),
    assetFetcher: null,
    logger: console,
    config
});

describe('GEO: public documentation', () => {
    it('exposes a stable overview with working local references and no request data', async () => {
        const app = createTestApp();
        const response = await app.request(`${ORIGIN}/llms.txt?lang=ru&config=private-source-token`, {
            headers: { 'Accept-Language': 'fa' }
        });
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
        expect(response.headers.get('Content-Language')).toBe('zh-CN');
        expect(response.headers.get('X-Robots-Tag')).toBeNull();
        const text = await response.text();
        expect(text).toContain('clash订阅转换（Sublink Worker）');
        expect(text).toContain('不是完整的 Xray JSON 配置');
        expect(text).toContain('不提供节点服务');
        expect(text).not.toContain('private-source-token');
        expect(await (await app.request(`${ORIGIN}/llms.txt`)).text()).toBe(text);

        const localLinks = [...text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)]
            .map(match => match[1]).filter(url => new URL(url).origin === ORIGIN);
        expect(localLinks).toHaveLength(1 + 2 * CONVERSION_GUIDES.length);
        for (const link of localLinks) {
            expect((await app.request(link)).status).toBe(200);
        }
    });

    it.each(CONVERSION_GUIDES)('keeps HTML and Markdown for $path in sync', async (guide) => {
        const app = createTestApp();
        const canonical = `${ORIGIN}${guide.path}`;
        const response = await app.request(`${canonical}.md`, { headers: { 'Accept-Language': 'en-US' } });
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
        expect(response.headers.get('Content-Language')).toBe('zh-CN');
        expect(response.headers.get('Link')).toBe(`<${canonical}>; rel="canonical"`);
        const markdown = await response.text();
        const html = await (await app.request(canonical)).text();
        expect(html).toContain(`<link rel="alternate" type="text/markdown" href="${canonical}.md"`);
        expect(html).toContain(`<time datetime="${guide.updatedAt}">${guide.updatedAt}</time>`);
        expect(markdown).toContain(`内容更新：${guide.updatedAt}`);

        const visibleText = [guide.intro, guide.example.text,
            ...guide.steps.flatMap(step => [step.title, step.text]),
            ...guide.sections.flatMap(section => [section.title, section.text]),
            ...(guide.overview ? Object.values(guide.overview) : []),
            ...(guide.comparison ? guide.comparison.rows.flat() : [])];
        for (const text of visibleText) {
            expect(markdown).toContain(text);
            expect(html).toContain(text);
        }
        if (guide.image) expect(markdown).toContain(`${ORIGIN}${guide.image.src}`);
        const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
        const page = schema['@graph'].find(item => item['@type'] === 'WebPage');
        expect(page.about['@id']).toBe(`${ORIGIN}/#application`);
        expect(page.isPartOf['@id']).toBe(`${ORIGIN}/#website`);
        expect(page.citation.map(item => item.url)).toEqual(guide.references.map(item => item.url));
        for (const reference of guide.references) {
            expect(markdown).toContain(reference.url);
            expect(html).toContain(`href="${reference.url}"`);
        }
    });

    it('renders the format comparison as an accessible table in the initial HTML', async () => {
        const response = await createTestApp().request(`${ORIGIN}/guides/subscription-formats`);
        const html = await response.text();
        expect(response.status).toBe(200);
        expect(html).toContain('<table');
        expect(html.match(/<th scope="col"/g)).toHaveLength(3);
        expect(html.match(/<th scope="row"/g)).toHaveLength(4);
        expect(html).toContain('Base64 节点分享链接列表');
        expect(html).toContain('id="question-1"');
    });

    it.each(['/llms.txt', ...CONVERSION_GUIDES.map(guide => `${guide.path}.md`)])('supports HEAD and HTTPS for %s', async (path) => {
        const app = createTestApp({ forceHttps: true });
        const redirect = await app.request(`http://example.com${path}`, { method: 'HEAD' });
        expect(redirect.status).toBe(308);
        expect(redirect.headers.get('Location')).toBe(`${ORIGIN}${path}`);
        const response = await app.request(redirect.headers.get('Location'), { method: 'HEAD' });
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('');
    });

    it('normalizes the previous Markdown path, language and slash in a single redirect', async () => {
        const app = createTestApp({ forceHttps: true });
        const response = await app.request('http://example.com/guides/clash-to-singbox.md/?lang=fa&utm_source=docs');
        expect(response.status).toBe(308);
        expect(response.headers.get('Location')).toBe(`${ORIGIN}/guides/chain-proxy.md?utm_source=docs`);
        const document = await app.request(response.headers.get('Location'));
        expect(document.status).toBe(200);
        expect(document.headers.get('Link')).toBe(`<${ORIGIN}/guides/chain-proxy>; rel="canonical"`);
    });

    it('uses each deployment origin and rejects unknown documents', async () => {
        const app = createTestApp();
        const origin = 'https://self-hosted.example.org';
        const text = await (await app.request(`${origin}/llms.txt`)).text();
        expect(text).toContain(`](${origin}/guides/subscription-formats.md)`);
        expect(text).not.toContain('dy.524028.xyz');
        expect((await app.request(`${origin}/guides/missing.md`)).status).toBe(404);
    });
});

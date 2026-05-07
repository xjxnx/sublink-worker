import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

const ORIGIN = 'http://localhost';

const createTestApp = () => createApp({
    kv: new MemoryKVAdapter(),
    assetFetcher: null,
    logger: console,
    config: { configTtlSeconds: 60, shortLinkTtlSeconds: null }
});

const fetchHome = async (lang) => {
    const app = createTestApp();
    const url = lang ? `${ORIGIN}/?lang=${lang}` : `${ORIGIN}/`;
    const res = await app.request(url);
    expect(res.status).toBe(200);
    return res.text();
};

describe('SEO: <html> lang/dir', () => {
    it('default request resolves to zh-CN', async () => {
        const html = await fetchHome();
        expect(html).toMatch(/<html\s+lang="zh-CN"\s+dir="ltr"/);
    });

    it('?lang=en-US emits lang="en-US" dir="ltr"', async () => {
        const html = await fetchHome('en-US');
        expect(html).toMatch(/<html\s+lang="en-US"\s+dir="ltr"/);
    });

    it('?lang=fa emits dir="rtl" for RTL locales', async () => {
        const html = await fetchHome('fa');
        expect(html).toMatch(/<html\s+lang="fa"\s+dir="rtl"/);
    });

    it('?lang=ru emits ltr', async () => {
        const html = await fetchHome('ru');
        expect(html).toMatch(/<html\s+lang="ru"\s+dir="ltr"/);
    });
});

describe('SEO: meta description / keywords are localized', () => {
    it('zh-CN page emits Chinese description (not the previous hardcoded English string)', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toContain('<meta name="description" content="clash订阅转换 - 订阅链接转换工具"');
        expect(html).not.toContain('Convert and optimize your subscription links easily');
    });

    it('en-US page emits English description', async () => {
        const html = await fetchHome('en-US');
        expect(html).toContain('Subscription Link Converter');
    });

    it('keywords meta is set per-language', async () => {
        const zhHtml = await fetchHome('zh-CN');
        expect(zhHtml).toMatch(/<meta name="keywords" content="订阅链接,转换,Xray,SingBox,Clash,Surge"/);
    });
});

describe('SEO: canonical + hreflang', () => {
    it('emits canonical pointing at the resolved language URL', async () => {
        const html = await fetchHome('en-US');
        expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/?lang=en-US" />`);
    });

    it('emits a self-referencing hreflang entry', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toContain(`<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/?lang=zh-CN" />`);
    });

    it('emits the full hreflang set including x-default on every page', async () => {
        const html = await fetchHome('fa');
        const expectedAlternates = [
            { hreflang: 'zh-CN', code: 'zh-CN' },
            { hreflang: 'en', code: 'en-US' },
            { hreflang: 'fa', code: 'fa' },
            { hreflang: 'ru', code: 'ru' }
        ];
        for (const { hreflang, code } of expectedAlternates) {
            expect(html).toContain(`<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}/?lang=${code}" />`);
        }
        expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}/?lang=en-US" />`);
    });
});

describe('SEO: Open Graph + Twitter Card', () => {
    it('emits og:title / og:description / og:url / og:locale', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toMatch(/<meta property="og:type" content="website"/);
        expect(html).toMatch(/<meta property="og:title" content="[^"]+订阅链接转换工具"/);
        expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/?lang=zh-CN"`);
        expect(html).toMatch(/<meta property="og:locale" content="zh_CN"/);
    });

    it('emits og:locale:alternate for the other locales', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toContain('<meta property="og:locale:alternate" content="en_US"');
        expect(html).toContain('<meta property="og:locale:alternate" content="fa_IR"');
        expect(html).toContain('<meta property="og:locale:alternate" content="ru_RU"');
    });

    it('emits twitter:card meta', async () => {
        const html = await fetchHome('en-US');
        expect(html).toMatch(/<meta name="twitter:card" content="summary"/);
        expect(html).toMatch(/<meta name="twitter:title" content="[^"]+Subscription Link Converter"/);
    });
});

describe('SEO: structured data', () => {
    it('emits a WebApplication JSON-LD block', async () => {
        const html = await fetchHome('en-US');
        const match = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
        expect(match).not.toBeNull();
        const parsed = JSON.parse(match[1]
            .replace(/\\u003c/g, '<')
            .replace(/\\u003e/g, '>')
            .replace(/\\u0026/g, '&'));
        expect(parsed['@type']).toBe('WebApplication');
        expect(parsed.applicationCategory).toBe('UtilityApplication');
        expect(parsed.url).toBe(`${ORIGIN}/`);
        expect(parsed.offers).toMatchObject({ '@type': 'Offer', price: '0' });
        expect(Array.isArray(parsed.inLanguage)).toBe(true);
    });
});

describe('SEO: stylesheet is self-hosted (not Tailwind Play CDN)', () => {
    it('links to /styles.css and does not load cdn.tailwindcss.com', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toContain('<link rel="stylesheet" href="/styles.css"');
        expect(html).not.toContain('cdn.tailwindcss.com');
    });
});

describe('SEO: /robots.txt route', () => {
    it('returns text/plain with Sitemap directive and disallowed API paths', async () => {
        const app = createTestApp();
        const res = await app.request(`${ORIGIN}/robots.txt`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
        const text = await res.text();
        expect(text).toContain('User-agent: *');
        expect(text).toContain('Allow: /');
        expect(text).toContain('Disallow: /singbox');
        expect(text).toContain('Disallow: /clash');
        expect(text).toContain('Disallow: /xray');
        expect(text).toContain('Disallow: /surge');
        expect(text).toContain('Disallow: /subconverter');
        expect(text).toContain('Disallow: /shorten-v2');
        expect(text).toContain('Disallow: /resolve');
        expect(text).toContain('Disallow: /s/');
        expect(text).toContain('Disallow: /b/');
        expect(text).toContain('Disallow: /c/');
        expect(text).toContain('Disallow: /x/');
        expect(text).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    });
});

describe('SEO: /sitemap.xml route', () => {
    it('returns XML with one <url> per language and complete hreflang set', async () => {
        const app = createTestApp();
        const res = await app.request(`${ORIGIN}/sitemap.xml`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/xml');
        const xml = await res.text();
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

        for (const code of ['zh-CN', 'en-US', 'fa', 'ru']) {
            expect(xml).toContain(`<loc>${ORIGIN}/?lang=${code}</loc>`);
        }

        // Each <url> must include the full hreflang block (4 langs + x-default = 5)
        const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
        expect(urlBlocks).toHaveLength(4);
        for (const block of urlBlocks) {
            expect(block).toContain('hreflang="zh-CN"');
            expect(block).toContain('hreflang="en"');
            expect(block).toContain('hreflang="fa"');
            expect(block).toContain('hreflang="ru"');
            expect(block).toContain('hreflang="x-default"');
        }
    });
});

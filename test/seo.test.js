import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { createCloudflareRuntime } from '../src/runtime/cloudflare.js';

const ORIGIN = 'http://localhost';

const createTestApp = (config = {}) => createApp({
    kv: new MemoryKVAdapter(),
    assetFetcher: null,
    logger: console,
    config: { configTtlSeconds: 60, shortLinkTtlSeconds: null, ...config }
});

const fetchHome = async (lang) => {
    const app = createTestApp();
    const url = lang && lang !== 'zh-CN' ? `${ORIGIN}/?lang=${lang}` : `${ORIGIN}/`;
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
        expect(html).toContain('<meta name="description" content="在线转换 Clash、Sing-Box、Surge 与 Xray/V2Ray 订阅。');
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
        expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/" />`);
        expect(html).toContain(`<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/" />`);
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
            const path = code === 'zh-CN' ? '/' : `/?lang=${code}`;
            expect(html).toContain(`<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}" />`);
        }
        expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${ORIGIN}/?lang=en-US" />`);
    });
});

describe('SEO: Open Graph + Twitter Card', () => {
    it('emits og:title / og:description / og:url / og:locale', async () => {
        const html = await fetchHome('zh-CN');
        expect(html).toMatch(/<meta property="og:type" content="website"/);
        expect(html).toMatch(/<meta property="og:title" content="[^"]+在线转换"/);
        expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/"`);
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
        expect(html).toMatch(/<meta name="twitter:title" content="Subscription Link Converter[^\"]*"/);
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

        expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
        expect(xml).not.toContain('?lang=zh-CN');
        for (const code of ['en-US', 'fa', 'ru']) {
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

describe('SEO: stable public URLs', () => {
    it.each(['en-US,en;q=0.9', 'fa', 'ru', 'zh-CN'])('serves the same Chinese homepage for Accept-Language: %s', async (acceptLanguage) => {
        const app = createTestApp();
        const response = await app.request(`${ORIGIN}/`, { headers: { 'Accept-Language': acceptLanguage } });
        const html = await response.text();
        expect(response.status).toBe(200);
        expect(html).toMatch(/<html\s+lang="zh-CN"/);
        expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/" />`);
    });

    it.each([
        ['?lang=zh-CN', '/'],
        ['?lang=zh-TW', '/'],
        ['?lang=', '/'],
        ['?lang=unknown', '/'],
        ['?lang=constructor', '/'],
        ['?lang=__proto__', '/'],
        ['?lang=toString', '/'],
        ['?lang=en', '/?lang=en-US'],
        ['?lang=en-GB&lang=ru', '/?lang=en-US'],
        ['?lang=fa-IR', '/?lang=fa'],
        ['?lang=ru-RU', '/?lang=ru'],
        ['?lang=zh-CN&config=ss%3A%2F%2Fexample&utm_source=docs', '/?config=ss%3A%2F%2Fexample&utm_source=docs']
    ])('permanently redirects %s to %s without a loop', async (query, expectedPath) => {
        const app = createTestApp();
        const response = await app.request(`${ORIGIN}/${query}`);
        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe(`${ORIGIN}${expectedPath}`);
        const resolved = await app.request(response.headers.get('location'));
        expect(resolved.status).toBe(200);
        expect(resolved.headers.get('location')).toBeNull();
    });

    it('merges HTTPS and Chinese canonical redirects into one hop', async () => {
        const app = createApp(createCloudflareRuntime({}));
        const response = await app.request('http://dy.524028.xyz/?lang=zh-CN&utm_source=docs');
        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('https://dy.524028.xyz/?utm_source=docs');
        expect((await app.request(response.headers.get('location'))).status).toBe(200);
    });

    it.each(['/robots.txt', '/sitemap.xml'])('redirects HTTP %s including HEAD requests', async (path) => {
        const app = createTestApp({ forceHttps: true });
        for (const method of ['GET', 'HEAD']) {
            const response = await app.request(`http://example.com${path}`, { method });
            expect(response.status).toBe(308);
            expect(response.headers.get('location')).toBe(`https://example.com${path}`);
        }
    });

    it.each(['localhost', '127.0.0.1', '[::1]', 'preview.localhost'])('keeps local HTTP development usable on %s', async (hostname) => {
        const response = await createTestApp({ forceHttps: true }).request(`http://${hostname}:8787/`);
        expect(response.status).toBe(200);
    });

    it('allows explicitly configured HTTP deployments', async () => {
        const app = createApp(createCloudflareRuntime({ FORCE_HTTPS: 'false' }));
        const response = await app.request('http://example.com/');
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('<link rel="canonical" href="http://example.com/"');
    });

    it('does not redirect existing subscription endpoints', async () => {
        const app = createTestApp({ forceHttps: true });
        const response = await app.request('http://example.com/clash?lang=zh-CN&settings_token=test');
        expect(response.status).toBe(400);
        expect(response.headers.get('location')).toBeNull();
        expect(await response.text()).toBe('Missing config parameter');
    });

    it('lists only pages that return 200 with matching canonicals and language links', async () => {
        const app = createTestApp({ forceHttps: true });
        const origin = 'https://example.com';
        const sitemap = await (await app.request(`${origin}/sitemap.xml`)).text();
        const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
        expect(urls).toHaveLength(4);
        for (const url of urls) {
            const response = await app.request(url, { headers: { 'Accept-Language': 'ru' } });
            expect(response.status).toBe(200);
            const html = await response.text();
            expect(html).toContain(`<link rel="canonical" href="${url}" />`);
            expect(html).not.toContain('?lang=zh-CN');
            for (const alternate of urls) {
                expect(html).toContain(`href="${alternate}"`);
                expect(html).toContain(`href="${new URL(alternate).pathname}${new URL(alternate).search}"`);
            }
        }
        const robots = await (await app.request(`${origin}/robots.txt`)).text();
        expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    });
});

describe('SEO: server-rendered usage guide', () => {
    it.each([
        ['zh-CN', '订阅转换怎么用', '常见问题'],
        ['en-US', 'How to convert a subscription', 'Frequently asked questions'],
        ['fa', 'روش تبدیل اشتراک', 'پرسش‌های متداول'],
        ['ru', 'Как преобразовать подписку', 'Частые вопросы']
    ])('includes localized instructions and answers in the initial HTML for %s', async (lang, steps, faq) => {
        const html = await fetchHome(lang);
        const guide = html.match(/<article id="guide"[\s\S]*?<\/article>/)?.[0];
        expect(guide).toBeDefined();
        expect(guide).toContain(steps);
        expect(guide).toContain(faq);
        expect(guide).toContain('node.example.com');
        expect(guide.match(/<details\b/g)).toHaveLength(5);
        expect(guide).not.toContain('x-show');
    });
});

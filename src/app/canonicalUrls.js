import { resolveLanguage } from '../i18n/index.js';
import { DEFAULT_LANG } from '../i18n/languages.js';
import { CONVERSION_GUIDES } from '../content/conversionGuides.js';

const PUBLIC_PAGES = new Set(['/', '/robots.txt', '/sitemap.xml']);
const isLoopback = (hostname) => hostname === 'localhost' || hostname.endsWith('.localhost') ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) || hostname === '[::1]';

export function canonicalRedirect(requestUrl, forceHttps) {
    const url = new URL(requestUrl);
    const guidePath = url.pathname.replace(/\/$/, '');
    const isGuide = CONVERSION_GUIDES.some(guide => guide.path === guidePath);
    if (!PUBLIC_PAGES.has(url.pathname) && !isGuide) return null;

    // Subscription signatures include the origin, so redirects are limited to public documents.
    if (forceHttps && url.protocol === 'http:' && !isLoopback(url.hostname)) {
        url.protocol = 'https:';
    }

    if (isGuide) {
        url.pathname = guidePath;
        url.searchParams.delete('lang');
    }

    if (url.pathname === '/' && url.searchParams.has('lang')) {
        const lang = resolveLanguage(url.searchParams.get('lang'));
        if (lang === DEFAULT_LANG) {
            url.searchParams.delete('lang');
        } else if (url.searchParams.get('lang') !== lang || url.searchParams.getAll('lang').length > 1) {
            url.searchParams.set('lang', lang);
        }
    }

    return url.href === requestUrl ? null : url.href;
}

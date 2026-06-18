/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { Layout } from '../components/Layout.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { Form } from '../components/Form.jsx';
import { Footer } from '../components/Footer.jsx';
import { UpdateChecker } from '../components/UpdateChecker.jsx';
import { SingboxConfigBuilder } from '../builders/SingboxConfigBuilder.js';
import { ClashConfigBuilder } from '../builders/ClashConfigBuilder.js';
import { SurgeConfigBuilder } from '../builders/SurgeConfigBuilder.js';
import { BaseConfigBuilder } from '../builders/BaseConfigBuilder.js';
import { proxyToShareLink } from '../parsers/proxyToShareLink.js';
import { createTranslator, resolveLanguage } from '../i18n/index.js';
import { encodeBase64, tryDecodeSubscriptionLines, isInvalidNodeName } from '../utils.js';
import { APP_NAME, APP_SUBTITLE, APP_VERSION, GITHUB_REPO } from '../constants.js';
import { ShortLinkService } from '../services/shortLinkService.js';
import { ConfigStorageService } from '../services/configStorageService.js';
import { InputLogService } from '../services/inputLogService.js';
import { ServiceError, MissingDependencyError } from '../services/errors.js';
import { normalizeRuntime } from '../runtime/runtimeConfig.js';
import { PREDEFINED_RULE_SETS, SING_BOX_CONFIG, SING_BOX_CONFIG_V1_11, generateSubconverterConfig } from '../config/index.js';

const DEFAULT_USER_AGENT = 'curl/7.74.0';

// Single source of truth for hreflang / og:locale / canonical query params.
// Order matters: first entry is the default locale used when no ?lang= is supplied.
const SUPPORTED_LANGS = [
    { code: 'zh-CN', hreflang: 'zh-CN', ogLocale: 'zh_CN' },
    { code: 'en-US', hreflang: 'en', ogLocale: 'en_US' },
    { code: 'fa', hreflang: 'fa', ogLocale: 'fa_IR' },
    { code: 'ru', hreflang: 'ru', ogLocale: 'ru_RU' }
];
const DEFAULT_LANG = SUPPORTED_LANGS[0].code;
// English is the international fallback for unmatched locales (Google x-default convention).
const X_DEFAULT_LANG = 'en-US';

// Backend / API routes that must not be indexed. Keep in sync with robots.txt.
const NON_INDEXABLE_PATHS = [
    '/singbox',
    '/clash',
    '/xray',
    '/surge',
    '/subconverter',
    '/shorten-v2',
    '/resolve',
    '/config',
    '/admin',
    '/s/',
    '/b/',
    '/c/',
    '/x/'
];

function buildLangUrl(origin, langCode) {
    return `${origin}/?lang=${langCode}`;
}

function buildAlternates(origin) {
    const alternates = SUPPORTED_LANGS.map((entry) => ({
        hreflang: entry.hreflang,
        href: buildLangUrl(origin, entry.code),
        ogLocale: entry.ogLocale
    }));
    alternates.push({
        hreflang: 'x-default',
        href: buildLangUrl(origin, X_DEFAULT_LANG)
    });
    return alternates;
}

function buildHomeSeo(c, lang, t) {
    const origin = new URL(c.req.url).origin;
    const canonicalUrl = buildLangUrl(origin, lang);
    const alternates = buildAlternates(origin);
    const langEntry = SUPPORTED_LANGS.find((entry) => entry.code === lang) || SUPPORTED_LANGS[0];
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: APP_NAME,
        alternateName: 'Sublink Worker',
        url: `${origin}/`,
        description: t('pageDescription'),
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        inLanguage: SUPPORTED_LANGS.map((entry) => entry.hreflang),
        softwareVersion: APP_VERSION,
        license: 'https://opensource.org/licenses/MIT',
        sameAs: [GITHUB_REPO]
    };
    return {
        canonicalUrl,
        alternates,
        ogLocale: langEntry.ogLocale,
        ogSiteName: APP_NAME,
        jsonLd,
        origin
    };
}

export function createApp(bindings = {}) {
    const runtime = normalizeRuntime(bindings);
    const services = {
        shortLinks: runtime.kv ? new ShortLinkService(runtime.kv, { shortLinkTtlSeconds: runtime.config.shortLinkTtlSeconds }) : null,
        configStorage: runtime.kv ? new ConfigStorageService(runtime.kv, { configTtlSeconds: runtime.config.configTtlSeconds }) : null,
        inputLog: runtime.kv ? new InputLogService(runtime.kv, { inputLogTtlSeconds: runtime.config.inputLogTtlSeconds }) : null
    };

    const app = new Hono();

    app.use('*', async (c, next) => {
        const acceptLanguage = getRequestHeader(c.req, 'Accept-Language');
        const lang = c.req.query('lang') || acceptLanguage?.split(',')[0] || 'zh-CN';
        c.set('lang', lang);
        c.set('t', createTranslator(lang));
        await next();
    });

    app.get('/', (c) => {
        const t = c.get('t');
        const lang = resolveLanguage(c.get('lang'));
        const subtitle = APP_SUBTITLE[lang] || APP_SUBTITLE['zh-CN'];
        const seo = buildHomeSeo(c, lang, t);

        return c.html(
            <Layout
                title={t('pageTitle')}
                description={t('pageDescription')}
                keywords={t('pageKeywords')}
                lang={lang}
                canonicalUrl={seo.canonicalUrl}
                alternates={seo.alternates}
                ogTitle={t('ogTitle')}
                ogDescription={t('ogDescription')}
                ogLocale={seo.ogLocale}
                ogSiteName={seo.ogSiteName}
                jsonLd={seo.jsonLd}
            >
                <div class="flex flex-col min-h-screen">
                    <Navbar lang={lang} />
                    <main class="flex-1">
                        <div class="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
                            <div class="max-w-5xl mx-auto">
                                <div class="text-center mb-10 pt-4 animate-fade-in-up">
                                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 rounded-full glass text-xs font-medium text-primary-700 dark:text-primary-300">
                                        <span class="relative flex h-2 w-2">
                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                        </span>
                                        SingBox · Clash · Xray · Surge
                                    </div>
                                    <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 tracking-tight">
                                        <span class="text-gradient">{APP_NAME}</span>
                                    </h1>
                                    <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                                        {subtitle}
                                    </p>
                                </div>
                                <Form t={t} lang={lang} />
                            </div>
                        </div>
                    </main>
                    <Footer />
                    <UpdateChecker />
                </div>
            </Layout>
        );
    });

    app.get('/robots.txt', (c) => {
        const origin = new URL(c.req.url).origin;
        const lines = [
            'User-agent: *',
            'Allow: /',
            ...NON_INDEXABLE_PATHS.map((path) => `Disallow: ${path}`),
            '',
            `Sitemap: ${origin}/sitemap.xml`,
            ''
        ];
        return c.text(lines.join('\n'), 200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
    });

    app.get('/sitemap.xml', (c) => {
        const origin = new URL(c.req.url).origin;
        const alternates = buildAlternates(origin);
        const alternateLinks = alternates
            .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
            .join('\n');
        const urlEntries = SUPPORTED_LANGS.map((entry) => {
            const loc = buildLangUrl(origin, entry.code);
            return [
                '  <url>',
                `    <loc>${loc}</loc>`,
                alternateLinks,
                '    <changefreq>weekly</changefreq>',
                '    <priority>1.0</priority>',
                '  </url>'
            ].join('\n');
        }).join('\n');
        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
            urlEntries,
            '</urlset>',
            ''
        ].join('\n');
        return c.text(xml, 200, {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        });
    });

    app.get('/singbox', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            const requestedSingboxVersion = c.req.query('singbox_version') || c.req.query('sb_version') || c.req.query('sb_ver');
            const requestUserAgent = getRequestHeader(c.req, 'User-Agent');
            const singboxConfigVersion = resolveSingboxConfigVersion(requestedSingboxVersion, requestUserAgent);

            let baseConfig = singboxConfigVersion === '1.11' ? SING_BOX_CONFIG_V1_11 : SING_BOX_CONFIG;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                const storedConfig = await storage.getConfigById(configId);
                if (storedConfig) {
                    baseConfig = storedConfig;
                }
            }

            const builder = new SingboxConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                singboxConfigVersion,
                includeAutoSelect
            );
            builder.excludeInvalidNodes = parseBooleanFlag(c.req.query('exclude_invalid_nodes'));
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.json(builder.config);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/clash', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const multiPortOptions = {
                enabled: parseBooleanFlag(c.req.query('multiPort')),
                basePort: c.req.query('basePort'),
                count: c.req.query('count')
            };
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new ClashConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                includeAutoSelect,
                multiPortOptions
            );
            builder.excludeInvalidNodes = parseBooleanFlag(c.req.query('exclude_invalid_nodes'));
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            const headers = { 'Content-Type': 'text/yaml; charset=utf-8' };
            if (userinfo) {
                headers['subscription-userinfo'] = userinfo;
            }
            return c.text(builder.formatConfig(), 200, headers);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/surge', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new SurgeConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                includeAutoSelect
            );
            builder.excludeInvalidNodes = parseBooleanFlag(c.req.query('exclude_invalid_nodes'));
            builder.setSubscriptionUrl(c.req.url);
            await builder.build();

            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.text(builder.formatConfig());
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/subconverter', (c) => {
        try {
            const rawSelectedRules = c.req.query('selectedRules');
            let selectedRules;

            if (!rawSelectedRules) {
                selectedRules = PREDEFINED_RULE_SETS.balanced;
            } else if (PREDEFINED_RULE_SETS[rawSelectedRules]) {
                selectedRules = PREDEFINED_RULE_SETS[rawSelectedRules];
            } else {
                try {
                    const parsed = JSON.parse(rawSelectedRules);
                    if (Array.isArray(parsed)) {
                        selectedRules = parsed;
                    } else {
                        return c.text('Invalid selectedRules: must be a preset name (minimal, balanced, comprehensive) or a JSON array', 400);
                    }
                } catch {
                    return c.text(`Invalid selectedRules: "${rawSelectedRules}" is not a valid preset name or JSON array. Valid presets: minimal, balanced, comprehensive`, 400);
                }
            }

            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const lang = c.get('lang');

            const config = generateSubconverterConfig({
                selectedRules,
                customRules,
                lang,
                includeAutoSelect,
                groupByCountry
            });

            return c.text(config, 200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/xray', async (c) => {
        const inputString = c.req.query('config');
        if (!inputString) {
            return c.text('Missing config parameter', 400);
        }

        const userAgent = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
        const lang = c.get('lang');

        // Parse any input (share links, Clash YAML, sing-box JSON, http subscriptions,
        // base64 lists) into unified proxy objects, then serialize each back to a share
        // link so clients like v2rayN can split the subscription into individual nodes.
        const builder = new BaseConfigBuilder(inputString, {}, lang, userAgent);
        let proxies = [];
        try {
            proxies = await builder.parseCustomItems();
        } catch (e) {
            runtime.logger.warn('Failed to parse xray input', e);
        }

        if (parseBooleanFlag(c.req.query('exclude_invalid_nodes'))) {
            proxies = proxies.filter(p => !(p?.tag && isInvalidNodeName(p.tag)));
        }

        const shareLinks = proxies
            .map(proxyToShareLink)
            .filter(link => typeof link === 'string' && link !== '');

        const finalString = shareLinks.join('\n');
        if (!finalString) {
            return c.text('Missing config parameter', 400);
        }

        const responseHeaders = {};
        const subscriptionUserinfo = builder.getSubscriptionUserinfo?.();
        if (subscriptionUserinfo) {
            responseHeaders['subscription-userinfo'] = subscriptionUserinfo;
        }

        return c.text(encodeBase64(finalString), 200, responseHeaders);
    });

    app.get('/shorten-v2', async (c) => {
        try {
            const url = c.req.query('url');
            if (!url) {
                return c.text('Missing URL parameter', 400);
            }
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                return c.text('Invalid URL parameter', 400);
            }
            const queryString = parsedUrl.search;

            const shortLinks = requireShortLinkService(services.shortLinks);
            const code = await shortLinks.createShortLink(queryString, c.req.query('shortCode'));
            return c.text(code);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    const redirectHandler = (prefix) => async (c) => {
        try {
            const code = c.req.param('code');
            const shortLinks = requireShortLinkService(services.shortLinks);
            const originalParam = await shortLinks.resolveShortCode(code);
            if (!originalParam) return c.text('Short URL not found', 404);

            const url = new URL(c.req.url);
            return c.redirect(`${url.origin}/${prefix}${originalParam}`);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    };

    app.get('/s/:code', redirectHandler('surge'));
    app.get('/b/:code', redirectHandler('singbox'));
    app.get('/c/:code', redirectHandler('clash'));
    app.get('/x/:code', redirectHandler('xray'));

    app.post('/config', async (c) => {
        try {
            const { type, content } = await c.req.json();
            const storage = requireConfigStorage(services.configStorage);
            const configId = await storage.saveConfig(type, content);
            return c.text(configId);
        } catch (error) {
            if (error instanceof SyntaxError) {
                return c.text(`Invalid format: ${error.message}`, 400);
            }
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/resolve', async (c) => {
        try {
            const shortUrl = c.req.query('url');
            const t = c.get('t');
            if (!shortUrl) return c.text(t('missingUrl'), 400);

            let urlObj;
            try {
                urlObj = new URL(shortUrl);
            } catch {
                return c.text(t('invalidShortUrl'), 400);
            }
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length < 3) return c.text(t('invalidShortUrl'), 400);

            const prefix = pathParts[1];
            const shortCode = pathParts[2];
            if (!['b', 'c', 'x', 's'].includes(prefix)) return c.text(t('invalidShortUrl'), 400);

            const shortLinks = requireShortLinkService(services.shortLinks);
            const originalParam = await shortLinks.resolveShortCode(shortCode);
            if (!originalParam) return c.text(t('shortUrlNotFound'), 404);

            const mapping = { b: 'singbox', c: 'clash', x: 'xray', s: 'surge' };
            const originalUrl = `${urlObj.origin}/${mapping[prefix]}${originalParam}`;
            return c.json({ originalUrl });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Records every "convert" click: the raw input sources + chosen options.
    // Fire-and-forget from the client; failures here must never break conversion UX.
    app.post('/track-input', async (c) => {
        try {
            const inputLog = services.inputLog;
            if (!inputLog) return c.body(null, 204);

            let payload;
            try {
                payload = await c.req.json();
            } catch {
                return c.body(null, 204);
            }

            await inputLog.record(payload, {
                clientUa: getRequestHeader(c.req, 'User-Agent') || null,
                clientIp:
                    getRequestHeader(c.req, 'CF-Connecting-IP') ||
                    getRequestHeader(c.req, 'X-Forwarded-For') ||
                    null
            });
            return c.body(null, 204);
        } catch (error) {
            runtime.logger.warn?.('Failed to record input', error);
            return c.body(null, 204);
        }
    });

    app.get('/admin/inputs.json', async (c) => {
        const guard = checkAdmin(c, runtime);
        if (guard !== 'ok') return adminDenied(c, guard);
        try {
            const inputLog = requireInputLog(services.inputLog);
            const limit = clampLimit(c.req.query('limit'));
            const entries = await inputLog.list({ limit });
            return c.json({ count: entries.length, entries });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/admin/inputs', async (c) => {
        const guard = checkAdmin(c, runtime);
        if (guard !== 'ok') return adminDenied(c, guard);
        try {
            const inputLog = requireInputLog(services.inputLog);
            const limit = clampLimit(c.req.query('limit'));
            const entries = await inputLog.list({ limit });
            return c.html(<AdminInputsPage entries={entries} />);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.delete('/admin/inputs', async (c) => {
        const guard = checkAdmin(c, runtime);
        if (guard !== 'ok') return adminDenied(c, guard);
        try {
            const key = c.req.query('key');
            if (!key) return c.text('Missing key', 400);
            const inputLog = requireInputLog(services.inputLog);
            const deleted = await inputLog.delete(key);
            return c.json({ deleted });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Static asset fallback (styles.css, favicon, images, etc.) served from public/.
    // Registered last so it only handles paths no explicit route matched.
    app.get('*', async (c) => {
        if (!runtime.assetFetcher) {
            return c.notFound();
        }
        try {
            return await runtime.assetFetcher(c.req.raw);
        } catch (error) {
            runtime.logger.warn('Asset fetch failed', error);
            return c.notFound();
        }
    });

    return app;
}

export function parseSelectedRules(raw) {
    if (!raw) return [];

    // 首先检查是否是预设名称 (minimal, balanced, comprehensive)
    // 这确保向后兼容主分支的 API 行为
    if (typeof raw === 'string' && PREDEFINED_RULE_SETS[raw]) {
        return PREDEFINED_RULE_SETS[raw];
    }

    // 尝试解析为 JSON 数组
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // 解析失败，回退到 minimal 预设
        console.warn(`Failed to parse selectedRules: ${raw}, falling back to minimal`);
        return PREDEFINED_RULE_SETS.minimal;
    }
}

function parseJsonArray(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseBooleanFlag(value) {
    return value === 'true' || value === true;
}

function parseSemverLike(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const match = trimmed.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: match[3] ? Number(match[3]) : 0
    };
}

function isSingboxLegacyConfig(version) {
    if (!version || Number.isNaN(version.major) || Number.isNaN(version.minor)) {
        return false;
    }
    if (version.major !== 1) {
        return version.major < 1;
    }
    return version.minor < 12;
}

function resolveSingboxConfigVersion(requestedVersion, userAgent) {
    const normalizedRequested = typeof requestedVersion === 'string' ? requestedVersion.trim().toLowerCase() : '';
    if (normalizedRequested && normalizedRequested !== 'auto') {
        if (normalizedRequested === 'legacy') return '1.11';
        if (normalizedRequested === 'latest') return '1.12';
        const parsed = parseSemverLike(normalizedRequested);
        if (parsed) {
            return isSingboxLegacyConfig(parsed) ? '1.11' : '1.12';
        }
    }

    if (typeof userAgent === 'string' && userAgent) {
        const uaMatch = userAgent.match(/sing-box\/(\d+\.\d+(?:\.\d+)?)/i) || userAgent.match(/sing-box\s+(\d+\.\d+(?:\.\d+)?)/i);
        const versionString = uaMatch?.[1];
        const parsed = versionString ? parseSemverLike(versionString) : null;
        if (parsed) {
            return isSingboxLegacyConfig(parsed) ? '1.11' : '1.12';
        }
    }

    return '1.12';
}

function getRequestHeader(request, name) {
    if (!request || !name) {
        return undefined;
    }

    try {
        const value = request.header(name);
        if (value !== undefined) {
            return value;
        }
    } catch {
        // Fallback if HonoRequest.header cannot read from the raw request.
    }

    const headers = request.raw?.headers;
    if (!headers) {
        return undefined;
    }

    if (typeof headers.get === 'function') {
        return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
    }

    if (typeof headers === 'object') {
        const lowerName = name.toLowerCase();
        const headerValue = headers[lowerName] ?? headers[name];
        if (Array.isArray(headerValue)) {
            return headerValue[0];
        }
        return headerValue;
    }

    return undefined;
}

// Short-link records expose user subscription sources, so the viewer is gated
// behind ADMIN_TOKEN. Missing token => deny by default rather than leak data.
function checkAdmin(c, runtime) {
    const token = runtime.config.adminToken;
    if (!token) return 'unconfigured';
    const provided = c.req.query('token') || getRequestHeader(c.req, 'X-Admin-Token');
    return provided && provided === token ? 'ok' : 'forbidden';
}

function adminDenied(c, guard) {
    if (guard === 'unconfigured') {
        return c.text('Set the ADMIN_TOKEN environment variable to enable this page.', 503);
    }
    return c.text('Forbidden: missing or invalid admin token.', 403);
}

// N+1 gets per listing; cap to keep within per-request KV subrequest limits.
function clampLimit(raw) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 100;
    return Math.min(Math.floor(parsed), 500);
}

const ADMIN_PAGE_STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
h1 { font-size: 18px; margin: 0 0 4px; }
.meta { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1e293b; vertical-align: top; }
th { color: #94a3b8; font-weight: 600; white-space: nowrap; }
code { background: #1e293b; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
ul { margin: 0; padding-left: 16px; }
li { word-break: break-all; margin-bottom: 2px; }
.muted { color: #64748b; }
.empty { padding: 40px; text-align: center; color: #94a3b8; }
.del-btn { background: #7f1d1d; color: #fecaca; border: 1px solid #991b1b; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.del-btn:hover { background: #991b1b; }
.del-btn:disabled { opacity: 0.5; cursor: default; }
`;

// Inline so the static admin page can delete a record without a client framework.
// Token is read from the current URL so the DELETE request stays authenticated.
const ADMIN_PAGE_SCRIPT = `
function delInput(btn, key) {
    if (!confirm('确认删除这条记录？')) return;
    btn.disabled = true;
    var token = new URLSearchParams(location.search).get('token') || '';
    fetch('/admin/inputs?key=' + encodeURIComponent(key) + '&token=' + encodeURIComponent(token), { method: 'DELETE' })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            var row = btn.closest('tr');
            if (row) row.remove();
        })
        .catch(function () {
            btn.disabled = false;
            alert('删除失败，请重试');
        });
}
`;

function formatTimestamp(ms) {
    if (!ms) return '-';
    try {
        return new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
    } catch {
        return String(ms);
    }
}

function AdminInputsPage({ entries }) {
    return (
        <html lang="zh-CN">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="noindex, nofollow" />
                <title>输入源记录 · Sublink Worker</title>
                <style>{ADMIN_PAGE_STYLE}</style>
                <script dangerouslySetInnerHTML={{ __html: ADMIN_PAGE_SCRIPT }} />
            </head>
            <body>
                <h1>输入源记录</h1>
                <div class="meta">共 {entries.length} 条，按转换时间倒序（每次点击转换记录一条）。</div>
                {entries.length === 0 ? (
                    <div class="empty">暂无记录。</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>转换时间 (UTC)</th>
                                <th>目标</th>
                                <th>输入源</th>
                                <th>其它参数</th>
                                <th>客户端</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr>
                                    <td>{formatTimestamp(entry.createdAt)}</td>
                                    <td>{entry.target || <span class="muted">-</span>}</td>
                                    <td>
                                        {entry.sources && entry.sources.length > 0 ? (
                                            <ul>
                                                {entry.sources.map((src) => (
                                                    <li>{src}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span class="muted">-</span>
                                        )}
                                    </td>
                                    <td>
                                        {entry.options && Object.keys(entry.options).length > 0 ? (
                                            <ul>
                                                {Object.entries(entry.options).map(([key, value]) => (
                                                    <li>
                                                        <code>{key}</code>={value}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span class="muted">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div>{entry.client?.ua || <span class="muted">-</span>}</div>
                                        <div class="muted">{entry.client?.ip || ''}</div>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            class="del-btn"
                                            onclick={`delInput(this, ${JSON.stringify(entry.key)})`}
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </body>
        </html>
    );
}

function requireShortLinkService(service) {
    if (!service) {
        throw new MissingDependencyError('Short link functionality is unavailable');
    }
    return service;
}

function requireInputLog(service) {
    if (!service) {
        throw new MissingDependencyError('Input logging functionality is unavailable');
    }
    return service;
}

function requireConfigStorage(service) {
    if (!service) {
        throw new MissingDependencyError('Config storage functionality is unavailable');
    }
    return service;
}

function handleError(c, error, logger) {
    if (error instanceof ServiceError) {
        return c.text(error.message, error.status);
    }
    logger.error?.('Unhandled error', error);
    return c.text(`Error: ${error.message}`, 500);
}

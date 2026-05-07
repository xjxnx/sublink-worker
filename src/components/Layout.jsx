import { html, raw } from 'hono/html'

const RTL_LANGS = new Set(['fa', 'ar', 'he', 'ur'])

// Embed JSON inside <script> safely against premature termination and parser quirks
const escapeJsonForScript = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')

export const Layout = (props) => {
  const {
    title,
    description = '',
    keywords = '',
    lang = 'en',
    canonicalUrl,
    alternates = [],
    ogTitle,
    ogDescription,
    ogLocale,
    ogImage,
    ogSiteName,
    twitterSite,
    jsonLd,
    children
  } = props

  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
  const resolvedOgTitle = ogTitle || title
  const resolvedOgDescription = ogDescription || description
  const ogImageUrl = ogImage || ''

  return html`
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}" x-data="appData()">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        ${keywords ? html`<meta name="keywords" content="${keywords}" />` : ''}

        ${canonicalUrl ? html`<link rel="canonical" href="${canonicalUrl}" />` : ''}
        ${alternates.map((alt) => html`<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)}

        <meta property="og:type" content="website" />
        ${ogSiteName ? html`<meta property="og:site_name" content="${ogSiteName}" />` : ''}
        <meta property="og:title" content="${resolvedOgTitle}" />
        <meta property="og:description" content="${resolvedOgDescription}" />
        ${canonicalUrl ? html`<meta property="og:url" content="${canonicalUrl}" />` : ''}
        ${ogLocale ? html`<meta property="og:locale" content="${ogLocale}" />` : ''}
        ${alternates
          .filter((alt) => alt.ogLocale && alt.ogLocale !== ogLocale)
          .map((alt) => html`<meta property="og:locale:alternate" content="${alt.ogLocale}" />`)}
        ${ogImageUrl ? html`<meta property="og:image" content="${ogImageUrl}" />` : ''}

        <meta name="twitter:card" content="${ogImageUrl ? 'summary_large_image' : 'summary'}" />
        ${twitterSite ? html`<meta name="twitter:site" content="${twitterSite}" />` : ''}
        <meta name="twitter:title" content="${resolvedOgTitle}" />
        <meta name="twitter:description" content="${resolvedOgDescription}" />
        ${ogImageUrl ? html`<meta name="twitter:image" content="${ogImageUrl}" />` : ''}

        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/styles.css" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <script defer src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.10/dist/cdn.min.js" onerror="window.__alpineFailed=true"></script>

        ${jsonLd
          ? html`<script type="application/ld+json">${raw(escapeJsonForScript(jsonLd))}</script>`
          : ''}

        <script>
          window.__alpineLoaded = false;
          document.addEventListener('alpine:init', () => { window.__alpineLoaded = true; });
          window.addEventListener('DOMContentLoaded', () => {
            if (window.__alpineFailed || !window.__alpineLoaded) {
              console.error('Failed to initialize Alpine.js. Interactive features are disabled.');
              const warning = document.createElement('div');
              warning.className = 'fixed bottom-4 right-4 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg shadow';
              warning.textContent = '加载 Alpine.js 失败，页面交互功能不可用，请刷新或检查网络。';
              document.body.appendChild(warning);
            }
          });
        </script>
        <script>
          function appData() {
            return {
              darkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
              toggleDarkMode() {
                this.darkMode = !this.darkMode;
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              },
              init() {
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              }
            }
          }

          // Version update checker Alpine.js component
          function updateChecker(currentVersion, apiUrl) {
            return {
              currentVersion: currentVersion,
              latestVersion: '',
              showUpdateToast: false,
              i18n: {
                newVersionAvailable: getUpdateI18n('newVersionAvailable'),
                currentVersion: getUpdateI18n('currentVersion'),
                viewRelease: getUpdateI18n('viewRelease'),
                updateGuide: getUpdateI18n('updateGuide'),
                later: getUpdateI18n('later')
              },
              init() {
                setTimeout(() => this.checkForUpdates(), 3000);
              },
              async checkForUpdates() {
                try {
                  const dismissedVersion = localStorage.getItem('sublink_dismissed_version');
                  const lastCheck = localStorage.getItem('sublink_last_version_check');
                  const now = Date.now();

                  if (lastCheck && (now - parseInt(lastCheck)) < 3600000) {
                    const cachedVersion = localStorage.getItem('sublink_latest_version');
                    if (cachedVersion && cachedVersion !== dismissedVersion && this.compareVersions(cachedVersion, this.currentVersion) > 0) {
                      this.latestVersion = cachedVersion;
                      this.showUpdateToast = true;
                    }
                    return;
                  }

                  const response = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                  });

                  if (!response.ok) return;

                  const data = await response.json();
                  const latestVersion = (data.tag_name || '').replace(/^v/, '');

                  localStorage.setItem('sublink_latest_version', latestVersion);
                  localStorage.setItem('sublink_last_version_check', now.toString());

                  if (latestVersion && latestVersion !== dismissedVersion && this.compareVersions(latestVersion, this.currentVersion) > 0) {
                    this.latestVersion = latestVersion;
                    this.showUpdateToast = true;
                  }
                } catch (error) {
                  console.debug('Version check failed:', error.message);
                }
              },
              compareVersions(v1, v2) {
                const parts1 = v1.split('.').map(Number);
                const parts2 = v2.split('.').map(Number);
                for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                  const p1 = parts1[i] || 0;
                  const p2 = parts2[i] || 0;
                  if (p1 > p2) return 1;
                  if (p1 < p2) return -1;
                }
                return 0;
              },
              dismissUpdate() {
                this.showUpdateToast = false;
                localStorage.setItem('sublink_dismissed_version', this.latestVersion);
              }
            }
          }

          function getUpdateI18n(key) {
            const lang = navigator.language || 'en-US';
            const translations = {
              'zh-CN': {
                newVersionAvailable: '发现新版本',
                currentVersion: '当前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍后提醒'
              },
              'zh-TW': {
                newVersionAvailable: '發現新版本',
                currentVersion: '當前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍後提醒'
              },
              'en-US': {
                newVersionAvailable: 'New Version Available',
                currentVersion: 'Current',
                viewRelease: 'View Release',
                updateGuide: 'Update Guide',
                later: 'Later'
              },
              'fa': {
                newVersionAvailable: 'نسخه جدید موجود است',
                currentVersion: 'نسخه فعلی',
                viewRelease: 'مشاهده نسخه',
                updateGuide: 'راهنمای به‌روزرسانی',
                later: 'بعداً'
              },
              'ru': {
                newVersionAvailable: 'Доступна новая версия',
                currentVersion: 'Текущая',
                viewRelease: 'Посмотреть',
                updateGuide: 'Руководство по обновлению',
                later: 'Позже'
              }
            };
            const langKey = Object.keys(translations).find(k => lang.startsWith(k.split('-')[0])) || 'en-US';
            return translations[langKey][key] || translations['en-US'][key];
          }
        </script>
      </head>
      <body class="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 selection:bg-primary-200/40">
        ${children}
      </body>
    </html>
  `
}

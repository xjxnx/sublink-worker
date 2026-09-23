export const SUPPORTED_LANGS = [
    { code: 'zh-CN', label: '简体中文', short: '中', hreflang: 'zh-CN', ogLocale: 'zh_CN' },
    { code: 'en-US', label: 'English', short: 'EN', hreflang: 'en', ogLocale: 'en_US' },
    { code: 'fa', label: 'فارسی', short: 'FA', hreflang: 'fa', ogLocale: 'fa_IR' },
    { code: 'ru', label: 'Русский', short: 'RU', hreflang: 'ru', ogLocale: 'ru_RU' }
];

export const DEFAULT_LANG = 'zh-CN';
export const X_DEFAULT_LANG = 'en-US';

export const homePath = (lang) => lang === DEFAULT_LANG ? '/' : `/?lang=${lang}`;

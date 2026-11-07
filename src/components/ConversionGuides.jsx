/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { CONVERSION_GUIDES } from '../content/conversionGuides.js';
import { guideMarkdownPath } from '../content/publicDocuments.js';
import { Layout } from './Layout.jsx';
import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';
import { APP_NAME, GITHUB_REPO } from '../constants.js';
import { CollapsibleSection } from './CollapsibleSection.jsx';

export const GuideLinks = ({ excludePath, collapsible = false }) => {
    const links = (
        <div class="grid gap-4 sm:grid-cols-2">
            {CONVERSION_GUIDES.filter(guide => guide.path !== excludePath).map(guide => (
                <a href={guide.path} class="glass rounded-2xl p-5 space-y-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
                    <h3 class="text-sm font-semibold leading-relaxed text-primary-700 dark:text-primary-300">{guide.title}</h3>
                    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{guide.summary}</p>
                </a>
            ))}
        </div>
    );

    return collapsible ? (
        <CollapsibleSection id="conversion-guides-title" title="订阅转换教程" icon="fa-book-open">{links}</CollapsibleSection>
    ) : (
        <section aria-labelledby="conversion-guides-title" class="space-y-4">
            <h2 id="conversion-guides-title" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">订阅转换教程</h2>
            {links}
        </section>
    );
};

export const ConversionOverview = ({ t, lang }) => {
    const guide = t('homeGuide');
    return (
        <section id="conversion-overview" aria-labelledby="conversion-overview-title" class="mt-10 space-y-3">
            <CollapsibleSection id="conversion-overview-title" title={guide.title} icon="fa-right-left">
                <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{guide.intro}</p>
                <dl class="grid gap-4 sm:grid-cols-2">
                    {guide.outputs.map(output => (
                        <div class="space-y-1">
                            <dt class="text-sm font-semibold text-gray-800 dark:text-gray-100" dir="ltr">{output.name}</dt>
                            <dd class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{output.text}</dd>
                        </div>
                    ))}
                </dl>
            </CollapsibleSection>
            {lang === 'zh-CN' && <GuideLinks collapsible />}
        </section>
    );
};

export const ConversionGuidePage = ({ guide, origin }) => {
    const canonicalUrl = `${origin}${guide.path}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage', '@id': canonicalUrl, url: canonicalUrl, name: guide.title,
                description: guide.description, dateModified: guide.updatedAt, inLanguage: 'zh-CN',
                isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#application` },
                citation: guide.references.map(reference => ({ '@type': 'CreativeWork', name: reference.title, url: reference.url })),
                breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` }
            },
            {
                '@type': 'BreadcrumbList', '@id': `${canonicalUrl}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: '在线订阅转换工具', item: `${origin}/` },
                    { '@type': 'ListItem', position: 2, name: guide.title, item: canonicalUrl }
                ]
            }
        ]
    };
    return (
        <Layout title={`${guide.title} | ${APP_NAME}`} description={guide.description} lang="zh-CN" canonicalUrl={canonicalUrl} markdownUrl={`${origin}${guideMarkdownPath(guide)}`} ogLocale="zh_CN" ogSiteName={APP_NAME} jsonLd={jsonLd}>
            <div class="flex flex-col min-h-screen">
                <Navbar lang="zh-CN" guideLabel="开始转换" guideHref="/#input" />
                <main class="flex-1 container mx-auto px-4 sm:px-6 pt-24 sm:pt-28">
                    <article class="max-w-3xl mx-auto space-y-8">
                        <nav aria-label="面包屑" class="text-sm text-gray-600 dark:text-gray-400">
                            <a href="/" class="text-primary-700 dark:text-primary-300">在线订阅转换工具</a>
                            <span aria-hidden="true"> / </span><span>{guide.title}</span>
                        </nav>
                        <header class="space-y-4">
                            <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">{guide.title}</h1>
                            <p class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>内容更新：<time datetime={guide.updatedAt}>{guide.updatedAt}</time></span>
                                <a href={guideMarkdownPath(guide)} class="text-primary-700 dark:text-primary-300 underline">Markdown 版</a>
                                <a href={GITHUB_REPO} class="text-primary-700 dark:text-primary-300 underline">项目源码</a>
                            </p>
                            <p class="leading-relaxed text-gray-600 dark:text-gray-400">{guide.intro}</p>
                            <a href="/#input" class="inline-flex rounded-xl bg-primary-600 px-5 py-3 text-white font-semibold hover:bg-primary-700">打开工具开始转换</a>
                        </header>
                        {guide.overview && (
                            <section class="space-y-3">
                                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{guide.overview.title}</h2>
                                <p class="leading-relaxed text-gray-600 dark:text-gray-400">{guide.overview.text}</p>
                                <p class="rounded-xl bg-primary-50 dark:bg-primary-900/30 p-4 font-semibold leading-relaxed text-primary-700 dark:text-primary-300">{guide.overview.flow}</p>
                            </section>
                        )}
                        {guide.comparison && (
                            <section aria-labelledby="format-comparison-title" class="space-y-4 min-w-0">
                                <h2 id="format-comparison-title" class="text-2xl font-bold text-gray-900 dark:text-white">{guide.comparison.title}</h2>
                                <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table class="w-full text-sm text-left leading-relaxed text-gray-600 dark:text-gray-400">
                                        <caption class="sr-only">{guide.comparison.title}</caption>
                                        <thead class="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                            <tr>{guide.comparison.headers.map(header => <th scope="col" class="px-4 py-3">{header}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {guide.comparison.rows.map(row => (
                                                <tr class="border-t border-gray-200 dark:border-gray-700">
                                                    {row.map((cell, index) => index === 0
                                                        ? <th scope="row" class="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{cell}</th>
                                                        : <td class="px-4 py-3">{cell}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                        <section id="steps" class="space-y-4 scroll-mt-28">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">操作步骤</h2>
                            <ol class="space-y-4 list-decimal ps-6">
                                {guide.steps.map(step => (
                                    <li class="ps-2 space-y-2">
                                        <h3 class="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                                        <p class="leading-relaxed text-gray-600 dark:text-gray-400">{step.text}</p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                        {guide.image && (
                            <figure class="space-y-3">
                                <a href={guide.image.src} aria-label="查看填写示例大图">
                                    <img src={guide.image.src} alt={guide.image.alt} width={guide.image.width} height={guide.image.height} loading="lazy" decoding="async" class="w-full h-auto rounded-2xl border border-gray-200 dark:border-gray-700" />
                                </a>
                                <figcaption class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{guide.image.caption}</figcaption>
                            </figure>
                        )}
                        <section class="space-y-3 min-w-0">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{guide.example.title}</h2>
                            <p class="leading-relaxed text-gray-600 dark:text-gray-400">{guide.example.text}</p>
                            <pre dir="ltr" class="overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm leading-relaxed text-gray-100"><code>{guide.example.code}</code></pre>
                        </section>
                        {guide.sections.map((section, index) => (
                            <section id={`question-${index + 1}`} class="space-y-3 scroll-mt-28">
                                <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{section.title}</h2>
                                <p class="leading-relaxed text-gray-600 dark:text-gray-400">{section.text}</p>
                            </section>
                        ))}
                        <section class="space-y-3">
                            <h2 class="text-xl font-bold text-gray-900 dark:text-white">官方配置参考</h2>
                            <ul class="list-disc ps-6 space-y-2">
                                {guide.references.map(reference => (
                                    <li><a href={reference.url} class="text-primary-700 dark:text-primary-300 underline">{reference.title}</a></li>
                                ))}
                            </ul>
                        </section>
                        <GuideLinks excludePath={guide.path} />
                    </article>
                </main>
                <Footer />
            </div>
        </Layout>
    );
};

/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { CONVERSION_GUIDES } from '../content/conversionGuides.js';
import { Layout } from './Layout.jsx';
import { Navbar } from './Navbar.jsx';
import { Footer } from './Footer.jsx';
import { APP_NAME } from '../constants.js';

export const GuideLinks = ({ excludePath }) => (
    <section aria-labelledby="conversion-guides-title" class="space-y-4">
        <h2 id="conversion-guides-title" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">订阅转换教程</h2>
        <div class="grid gap-4 sm:grid-cols-2">
            {CONVERSION_GUIDES.filter(guide => guide.path !== excludePath).map(guide => (
                <a href={guide.path} class="glass rounded-2xl p-5 space-y-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
                    <h3 class="font-semibold text-primary-700 dark:text-primary-300">{guide.title}</h3>
                    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{guide.summary}</p>
                </a>
            ))}
        </div>
    </section>
);

export const ConversionOverview = ({ t, lang }) => {
    const guide = t('homeGuide');
    return (
        <section id="conversion-overview" aria-labelledby="conversion-overview-title" class="mt-10 space-y-6">
            <div class="glass rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 id="conversion-overview-title" class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{guide.title}</h2>
                <p class="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400">{guide.intro}</p>
                <dl class="grid gap-4 sm:grid-cols-2">
                    {guide.outputs.map(output => (
                        <div class="space-y-1">
                            <dt class="font-semibold text-gray-900 dark:text-white" dir="ltr">{output.name}</dt>
                            <dd class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{output.text}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            {lang === 'zh-CN' && <GuideLinks />}
        </section>
    );
};

export const ConversionGuidePage = ({ guide, origin }) => {
    const canonicalUrl = `${origin}${guide.path}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'WebPage', '@id': canonicalUrl, url: canonicalUrl, name: guide.title, description: guide.description, inLanguage: 'zh-CN', breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` } },
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
        <Layout title={`${guide.title} | ${APP_NAME}`} description={guide.description} lang="zh-CN" canonicalUrl={canonicalUrl} ogLocale="zh_CN" ogSiteName={APP_NAME} jsonLd={jsonLd}>
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
                            <p class="leading-relaxed text-gray-600 dark:text-gray-400">{guide.intro}</p>
                            <a href="/#input" class="inline-flex rounded-xl bg-primary-600 px-5 py-3 text-white font-semibold hover:bg-primary-700">打开工具开始转换</a>
                        </header>
                        <section class="space-y-4">
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
                        <section class="space-y-3 min-w-0">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{guide.example.title}</h2>
                            <p class="leading-relaxed text-gray-600 dark:text-gray-400">{guide.example.text}</p>
                            <pre dir="ltr" class="overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm leading-relaxed text-gray-100"><code>{guide.example.code}</code></pre>
                        </section>
                        {guide.sections.map(section => (
                            <section class="space-y-3">
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

/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

const EXAMPLE_LINK = 'ss://YWVzLTEyOC1nY206ZGVtby1wYXNzd29yZA@node.example.com:8388#Demo';
const EXAMPLE_CLASH = `proxies:
  - name: Demo
    type: ss
    server: node.example.com
    port: 8388
    cipher: aes-128-gcm
    password: demo-password`;

export const HomeGuide = ({ t }) => {
    const guide = t('homeGuide');
    const headingClass = 'text-xl sm:text-2xl font-bold text-gray-900 dark:text-white';
    const bodyClass = 'text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400';

    return (
        <article id="guide" aria-labelledby="guide-title" class="mt-14 space-y-8 scroll-mt-28">
            <header class="space-y-3">
                <div class="flex justify-end">
                    <button type="button" x-on:click="toggleGuide()" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 cursor-pointer">
                        <i class="fas fa-times" aria-hidden="true"></i>
                        {guide.closeLabel}
                    </button>
                </div>
                <h2 id="guide-title" class={headingClass}>{guide.title}</h2>
                <p class={bodyClass}>{guide.intro}</p>
            </header>

            <section aria-labelledby="guide-steps" class="space-y-4">
                <h2 id="guide-steps" class={headingClass}>{guide.stepsTitle}</h2>
                <ol class="grid gap-4 md:grid-cols-3">
                    {guide.steps.map((step, index) => (
                        <li class="glass rounded-2xl p-5 space-y-3">
                            <span class="text-sm font-bold text-primary-700 dark:text-primary-300" aria-hidden="true">0{index + 1}</span>
                            <h3 class="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                            <p class={bodyClass}>{step.text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section aria-labelledby="guide-formats" class="glass rounded-2xl p-5 sm:p-6 space-y-5">
                <h2 id="guide-formats" class={headingClass}>{guide.formatsTitle}</h2>
                <div class="space-y-2">
                    <h3 class="font-semibold text-gray-900 dark:text-white">{guide.inputTitle}</h3>
                    <p class={bodyClass}>{guide.inputText}</p>
                </div>
                <div class="space-y-3">
                    <h3 class="font-semibold text-gray-900 dark:text-white">{guide.outputTitle}</h3>
                    <dl class="grid gap-4 sm:grid-cols-2">
                        {guide.outputs.map((output) => (
                            <div class="space-y-1">
                                <dt class="font-medium text-gray-900 dark:text-white" dir="ltr">{output.name}</dt>
                                <dd class={bodyClass}>{output.text}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <p class={bodyClass}>{guide.compatibility}</p>
            </section>

            <section aria-labelledby="guide-example" class="space-y-4 min-w-0">
                <h2 id="guide-example" class={headingClass}>{guide.exampleTitle}</h2>
                <p class={bodyClass}>{guide.exampleIntro}</p>
                <div class="grid gap-4 md:grid-cols-2">
                    {[
                        { label: guide.exampleInput, code: EXAMPLE_LINK },
                        { label: guide.exampleOutput, code: EXAMPLE_CLASH }
                    ].map((example) => (
                        <figure class="min-w-0 space-y-2">
                            <figcaption class="text-sm font-medium text-gray-900 dark:text-white">{example.label}</figcaption>
                            <pre dir="ltr" class="overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs sm:text-sm leading-relaxed text-gray-100"><code>{example.code}</code></pre>
                        </figure>
                    ))}
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">{guide.exampleNote}</p>
            </section>

            <section aria-labelledby="guide-faq" class="space-y-4">
                <h2 id="guide-faq" class={headingClass}>{guide.faqTitle}</h2>
                <div class="glass rounded-2xl px-5 sm:px-6 divide-y divide-gray-200 dark:divide-gray-700">
                    {guide.faqs.map((faq) => (
                        <details class="py-4">
                            <summary class="cursor-pointer font-medium text-gray-900 dark:text-white">{faq.question}</summary>
                            <p class={`mt-3 ${bodyClass}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>
            <a href="#input" x-on:click="guideOpen = false" class="inline-flex font-semibold text-primary-700 dark:text-primary-300 underline underline-offset-4">{guide.backToTool}</a>
        </article>
    );
};

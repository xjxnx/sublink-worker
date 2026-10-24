/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { CollapsibleSection, DisclosureChevron } from './CollapsibleSection.jsx';

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
    const bodyClass = 'text-sm leading-relaxed text-gray-600 dark:text-gray-400';

    return (
        <article id="guide" aria-labelledby="guide-steps" class="mt-3 space-y-3 scroll-mt-28">
            <CollapsibleSection id="guide-steps" title={guide.stepsTitle} icon="fa-list-ol">
                <ol class="grid gap-4 md:grid-cols-3">
                    {guide.steps.map((step, index) => (
                        <li class="rounded-xl bg-gray-50/80 dark:bg-gray-800/50 p-4 space-y-2">
                            <span class="text-xs font-semibold text-primary-600 dark:text-primary-400" aria-hidden="true">0{index + 1}</span>
                            <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">{step.title}</h3>
                            <p class={bodyClass}>{step.text}</p>
                        </li>
                    ))}
                </ol>
            </CollapsibleSection>

            <CollapsibleSection id="guide-formats" title={guide.formatsTitle} icon="fa-file-import">
                <div class="space-y-2">
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">{guide.inputTitle}</h3>
                    <p class={bodyClass}>{guide.inputText}</p>
                </div>
                <p class={bodyClass}>{guide.compatibility}</p>
            </CollapsibleSection>

            <CollapsibleSection id="guide-example" title={guide.exampleTitle} icon="fa-code">
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
            </CollapsibleSection>

            <CollapsibleSection id="guide-faq" title={guide.faqTitle} icon="fa-circle-question">
                <div class="divide-y divide-gray-200 dark:divide-gray-700">
                    {guide.faqs.map((faq) => (
                        <details class="guide-faq-item py-3">
                            <summary class="flex items-center gap-3 cursor-pointer text-sm font-medium leading-6 text-gray-800 dark:text-gray-100">
                                <span class="flex-1">{faq.question}</span>
                                <DisclosureChevron />
                            </summary>
                            <p class={`mt-2 pr-7 ${bodyClass}`}>{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </CollapsibleSection>
            <a href="#input" class="inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline underline-offset-4">
                <i class="fas fa-arrow-up text-xs" aria-hidden="true"></i>
                {guide.backToTool}
            </a>
        </article>
    );
};

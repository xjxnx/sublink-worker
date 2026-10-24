/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

export const DisclosureChevron = () => (
    <svg class="guide-chevron w-4 h-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
);

export const CollapsibleSection = ({ id, title, icon = 'fa-circle-info', children }) => (
    <details aria-labelledby={id} class="guide-section glass rounded-2xl min-w-0 overflow-hidden">
        <summary class="flex items-center gap-3 px-4 py-3.5 sm:px-5 cursor-pointer">
            <span class="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm" aria-hidden="true">
                <i class={`fas ${icon}`}></i>
            </span>
            <h2 id={id} class="flex-1 min-w-0 text-sm sm:text-base font-semibold leading-6 text-gray-800 dark:text-gray-100">{title}</h2>
            <DisclosureChevron />
        </summary>
        <div class="px-4 py-4 sm:px-5 space-y-4 border-t border-gray-200/60 dark:border-gray-700/60">{children}</div>
    </details>
);

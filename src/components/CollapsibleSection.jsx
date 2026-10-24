/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

export const CollapsibleSection = ({ id, title, children }) => (
    <details aria-labelledby={id} class="glass rounded-2xl p-5 sm:p-6 min-w-0">
        <summary class="cursor-pointer text-gray-900 dark:text-white">
            <h2 id={id} class="inline text-xl sm:text-2xl font-bold">{title}</h2>
        </summary>
        <div class="mt-4 space-y-4">{children}</div>
    </details>
);

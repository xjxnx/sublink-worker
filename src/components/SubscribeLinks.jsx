/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

const FIELDS = [
    { key: 'xray', labelKey: 'xrayLink', icon: 'fa-bolt', accent: 'from-purple-500 to-pink-500' },
    { key: 'singbox', labelKey: 'singboxLink', icon: 'fa-cube', accent: 'from-primary-500 to-cyan-500' },
    { key: 'clash', labelKey: 'clashLink', icon: 'fa-shield-alt', accent: 'from-emerald-500 to-teal-500' },
    { key: 'surge', labelKey: 'surgeLink', icon: 'fa-wave-square', accent: 'from-amber-500 to-orange-500' }
];

export const SubscribeLinks = (props) => {
    const { t, links } = props;

    if (!links) return null;

    return (
        <div x-data="{ copied: null }" class="bento-card glass rounded-2xl p-5 sm:p-6 mb-8">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5 mb-5">
                <span class="w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    <i class="fas fa-check"></i>
                </span>
                {t('subscriptionLinks')}
            </h2>

            <div class="grid grid-cols-1 gap-3">
                {FIELDS.map((field) => (
                    <div class="group/link relative p-3.5 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/40 hover:border-primary-300/70 dark:hover:border-primary-700/50 transition-all" key={field.key}>
                        <div class="flex items-center gap-3">
                            <span class={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm bg-gradient-to-br ${field.accent} shadow-sm`}>
                                <i class={`fas ${field.icon}`}></i>
                            </span>
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                                    {t(field.labelKey)}
                                </div>
                                <input
                                    type="text"
                                    readonly
                                    value={links[field.key]}
                                    class="w-full bg-transparent border-0 p-0 font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 focus:ring-0 focus:outline-none truncate"
                                />
                            </div>
                            <button
                                type="button"
                                x-on:click={`$clipboard('${links[field.key]}'); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                                class="shrink-0 w-9 h-9 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 transition-all duration-200 flex items-center justify-center cursor-pointer border border-gray-200/60 dark:border-gray-700/60"
                                x-bind:class={`{
                                    'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 dark:hover:border-emerald-700': copied !== '${field.key}',
                                    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 scale-110': copied === '${field.key}'
                                }`}
                                aria-label="Copy"
                            >
                                <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

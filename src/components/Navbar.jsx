/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO } from '../constants.js';

const LANGUAGES = [
    { code: 'zh-CN', label: '简体中文', short: '中' },
    { code: 'en-US', label: 'English', short: 'EN' },
    { code: 'fa', label: 'فارسی', short: 'FA' },
    { code: 'ru', label: 'Русский', short: 'RU' }
];

export const Navbar = (props) => {
    const { lang = 'zh-CN' } = props || {};
    const current = LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0];

    return (
        <nav class="fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-50">
            <div class="glass-strong rounded-2xl shadow-soft">
                <div class="flex items-center justify-between h-14 px-4 sm:px-6">
                    <a href="/" class="group flex items-center gap-2.5 font-bold text-gray-900 dark:text-white transition-colors">
                        <span class="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow group-hover:scale-105 transition-transform duration-300">
                            <img src="/favicon.ico" alt={`${APP_NAME} logo`} class="w-5 h-5 drop-shadow" />
                        </span>
                        <span class="text-base sm:text-lg tracking-tight group-hover:text-gradient transition-all">{APP_NAME}</span>
                    </a>

                    <div class="flex items-center gap-1.5 sm:gap-2">
                        {/* Language switcher */}
                        <div x-data="{ open: false }" class="relative">
                            <button
                                type="button"
                                x-on:click="open = !open"
                                {...{
                                    'x-on:click.outside': 'open = false',
                                    'x-on:keydown.escape.window': 'open = false'
                                }}
                                class="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                                aria-haspopup="listbox"
                                x-bind:aria-expanded="open"
                                aria-label="Switch language"
                            >
                                <i class="fas fa-globe text-xs"></i>
                                <span class="hidden sm:inline">{current.label}</span>
                                <span class="sm:hidden">{current.short}</span>
                                <i class="fas fa-chevron-down text-[10px] transition-transform duration-200" x-bind:class="open ? 'rotate-180' : ''"></i>
                            </button>

                            <div
                                x-show="open"
                                x-cloak
                                {...{
                                    'x-transition:enter': 'transition ease-out duration-200',
                                    'x-transition:enter-start': 'opacity-0 scale-95 -translate-y-1',
                                    'x-transition:enter-end': 'opacity-100 scale-100 translate-y-0',
                                    'x-transition:leave': 'transition ease-in duration-150',
                                    'x-transition:leave-start': 'opacity-100 scale-100',
                                    'x-transition:leave-end': 'opacity-0 scale-95'
                                }}
                                class="absolute right-0 mt-2 w-44 glass-strong rounded-xl shadow-float overflow-hidden p-1.5"
                                role="listbox"
                            >
                                {LANGUAGES.map((item) => (
                                    <a
                                        key={item.code}
                                        href={`?lang=${item.code}`}
                                        role="option"
                                        aria-selected={item.code === current.code}
                                        class="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30"
                                        style={item.code === current.code ? '' : ''}
                                    >
                                        <span class={item.code === current.code ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                                            {item.label}
                                        </span>
                                        {item.code === current.code && (
                                            <i class="fas fa-check text-primary-500 text-xs"></i>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>

                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="hidden sm:flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github text-base"></i>
                            <span>GitHub</span>
                        </a>
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="sm:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github"></i>
                        </a>
                        <button
                            class="relative p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-all duration-300 cursor-pointer"
                            x-on:click="toggleDarkMode()"
                            aria-label="Toggle theme"
                        >
                            <i class="fas transition-transform duration-500" x-bind:class="darkMode ? 'fa-sun rotate-180' : 'fa-moon'"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

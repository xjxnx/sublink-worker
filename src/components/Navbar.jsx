/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME } from '../constants.js';

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
                        <span class="relative flex items-center justify-center w-9 h-9 group-hover:scale-105 transition-transform duration-300">
                            <svg viewBox="0 0 64 64" fill="none" class="w-9 h-9 drop-shadow-[0_2px_6px_rgba(37,99,235,0.5)]" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${APP_NAME} logo`}>
                                <defs>
                                    <linearGradient id="navShield" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#38bdf8" />
                                        <stop offset="1" stop-color="#1d4ed8" />
                                    </linearGradient>
                                    <filter id="navInnerGlow" x="-30%" y="-30%" width="160%" height="160%">
                                        <feFlood flood-color="#cdedff" flood-opacity="0.9" />
                                        <feComposite in2="SourceAlpha" operator="out" />
                                        <feGaussianBlur stdDeviation="2.4" />
                                        <feComposite in2="SourceAlpha" operator="in" result="ig" />
                                        <feMerge>
                                            <feMergeNode in="SourceGraphic" />
                                            <feMergeNode in="ig" />
                                        </feMerge>
                                    </filter>
                                    <filter id="navSGlow" x="-70%" y="-70%" width="240%" height="240%">
                                        <feGaussianBlur stdDeviation="1.7" result="b" />
                                        <feMerge>
                                            <feMergeNode in="b" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <path d="M32 6 C46 6 56 14 56 26 C56 38 46 50 32 58 C18 50 8 38 8 26 C8 14 18 6 32 6 Z" fill="url(#navShield)" stroke="#bae6fd" stroke-width="2" stroke-linejoin="round" filter="url(#navInnerGlow)" />
                                <path d="M32 12 C43 12 51 18.5 51 27.5 C51 37 43 46.5 32 53 C21 46.5 13 37 13 27.5 C13 18.5 21 12 32 12 Z" fill="none" stroke="#e0f2fe" stroke-width="1.2" stroke-linejoin="round" opacity="0.45" />
                                <path d="M40 24 C38 20 30 19 26 22 C22 25 24 29 30 31 C36 33 42 35 40 41 C38 46 29 46 24 43" fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#navSGlow)" />
                            </svg>
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

                        <span
                            class="hidden sm:flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github text-base"></i>
                            <span>GitHub</span>
                        </span>
                        <span
                            class="sm:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github"></i>
                        </span>
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

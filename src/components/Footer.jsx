/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, APP_VERSION } from '../constants.js';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer class="mt-16 pb-8">
            <div class="container mx-auto px-4">
                <div class="glass rounded-2xl px-5 py-4 max-w-3xl mx-auto">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>© {currentYear} {APP_NAME}</span>
                            <span
                                class="text-xs px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40 font-mono"
                            >
                                v{APP_VERSION}
                            </span>
                        </div>

                        <span
                            class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 whitespace-nowrap sm:ms-8 sm:me-auto"
                            dir="ltr"
                        >
                            <i class="fab fa-weixin text-base" aria-hidden="true"></i>
                            <span>vx：bin3abc</span>
                        </span>

                        <div class="flex items-center gap-1">
                            <span
                                class="p-2 rounded-lg text-gray-500 dark:text-gray-400"
                                aria-label="GitHub"
                            >
                                <i class="fab fa-github text-base"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

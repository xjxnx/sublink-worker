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

/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, APP_VERSION } from '../constants.js';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer class="mt-16 pb-8">
            <div class="container mx-auto px-4">
                <div class="glass rounded-2xl px-5 py-4 max-w-3xl mx-auto">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span>© {currentYear} {APP_NAME}</span>
                            <a
                                href={`${GITHUB_REPO}/releases/tag/v${APP_VERSION}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors font-mono cursor-pointer"
                                title={`View release notes for v${APP_VERSION}`}
                            >
                                v{APP_VERSION}
                            </a>
                        </div>

                        <div class="flex items-center gap-1">
                            <a
                                href={GITHUB_REPO}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="p-2 rounded-lg text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
                                aria-label="GitHub"
                            >
                                <i class="fab fa-github text-base"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

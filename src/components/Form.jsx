/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { CustomRules } from './CustomRules.jsx';
import { TextareaWithActions } from './TextareaWithActions.jsx';
import { ValidatedTextarea } from './ValidatedTextarea.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink', icon: 'fa-bolt', accent: 'from-purple-500 to-pink-500' },
  { key: 'singbox', labelKey: 'singboxLink', icon: 'fa-cube', accent: 'from-primary-500 to-cyan-500' },
  { key: 'clash', labelKey: 'clashLink', icon: 'fa-shield-alt', accent: 'from-emerald-500 to-teal-500' },
  { key: 'surge', labelKey: 'surgeLink', icon: 'fa-wave-square', accent: 'from-amber-500 to-orange-500' }
];

const CARD_BASE = 'bento-card glass rounded-2xl p-5 sm:p-6';
const CARD_HEADING = 'text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2.5';
const ICON_BADGE = 'w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm';

export const Form = (props) => {
  const { t, lang } = props;

  const translations = {
    processing: t('processing'),
    convert: t('convert'),
    saveConfigSuccess: t('saveConfigSuccess'),
    saveConfig: t('saveConfig'),
    savingConfig: t('savingConfig'),
    configContentRequired: t('configContentRequired'),
    configSaveFailed: t('configSaveFailed'),
    confirmClearConfig: t('confirmClearConfig'),
    confirmClearAll: t('confirmClearAll'),
    errorGeneratingLinks: t('errorGeneratingLinks'),
    shortenLinks: t('shortenLinks'),
    shortening: t('shortening'),
    alreadyShortened: t('alreadyShortened'),
    shortenFailed: t('shortenFailed'),
    customShortCode: t('customShortCode'),
    optional: t('optional'),
    customShortCodePlaceholder: t('customShortCodePlaceholder'),
    showFullLinks: t('showFullLinks')
  };

  const scriptContent = `
    window.APP_TRANSLATIONS = ${JSON.stringify(translations)};
    window.PREDEFINED_RULE_SETS = ${JSON.stringify(PREDEFINED_RULE_SETS)};
    window.APP_LANG = ${JSON.stringify(lang || 'zh-CN')};
    if (typeof __name === 'undefined') { var __name = function(fn) { return fn; }; }
    (${formLogicFn.toString()})();
  `;

  return (
    <div x-data="formData()" x-init="init()" class="max-w-5xl mx-auto">
      <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-5">

        {/* ============ 1. INPUT CARD (full-width hero) ============ */}
        <div class={`${CARD_BASE} group animate-fade-in-up`}>
          <TextareaWithActions
            id="input"
            name="input"
            label={t('shareUrls')}
            labelPrefix={
              <span class={`${ICON_BADGE} bg-gradient-to-br from-primary-400 to-primary-600 text-white`}>
                <i class="fas fa-link"></i>
              </span>
            }
            model="input"
            rows={5}
            placeholder={t('urlPlaceholder')}
            required
            labelActionsWrapperClass="flex gap-2 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            labelActions={[
              {
                key: 'paste',
                icon: 'fas fa-paste',
                label: t('paste'),
                hideLabelOnMobile: true,
                className:
                  'px-2.5 py-1.5 text-xs font-medium bg-gray-100/80 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5 cursor-pointer',
                title: t('paste'),
                attrs: {
                  'x-on:click': "navigator.clipboard.readText().then(text => input = text).catch(() => {})"
                }
              },
              {
                key: 'clear',
                icon: 'fas fa-times',
                label: t('clear'),
                hideLabelOnMobile: true,
                className:
                  'px-2.5 py-1.5 text-xs font-medium bg-gray-100/80 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer',
                title: t('clear'),
                attrs: {
                  'x-on:click': "input = ''",
                  'x-show': 'input'
                }
              }
            ]}
          />
        </div>

        {/* ============ 2. PRIMARY CTA + SECONDARY ACTIONS ============ */}
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            class="flex-1 py-3.5 px-6 text-white rounded-2xl font-semibold flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            x-bind:disabled="loading"
            x-bind:class="justConverted ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.02]' : 'btn-primary'"
          >
            <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : (justConverted ? 'fa-check' : 'fa-bolt')"></i>
            <span x-text="loading ? processingText : (justConverted ? convertedText : convertText)">{t('convert')}</span>
          </button>

          <button
            type="button"
            x-on:click="showAdvanced = !showAdvanced"
            class="btn-soft px-5 py-3.5 rounded-2xl text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-2 cursor-pointer"
            x-bind:class="showAdvanced ? 'ring-2 ring-primary-500/30 text-primary-600 dark:text-primary-400' : ''"
          >
            <i class="fas fa-sliders-h transition-transform duration-300" x-bind:class="showAdvanced ? 'rotate-90' : ''"></i>
            <span>{t('advancedOptions')}</span>
          </button>

          <button
            type="button"
            x-on:click="clearAll()"
            class="btn-soft px-5 py-3.5 rounded-2xl text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-2 cursor-pointer hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700"
          >
            <i class="fas fa-trash-alt"></i>
            <span>{t('clear')}</span>
          </button>
        </div>

        {/* ============ 3. ADVANCED OPTIONS (Bento Grid) ============ */}
        <div
          x-show="showAdvanced"
          {...{
            'x-transition:enter': 'transition ease-out duration-400',
            'x-transition:enter-start': 'opacity-0 transform -translate-y-4 scale-98',
            'x-transition:enter-end': 'opacity-100 transform translate-y-0 scale-100',
            'x-transition:leave': 'transition ease-in duration-200',
            'x-transition:leave-start': 'opacity-100 transform translate-y-0 scale-100',
            'x-transition:leave-end': 'opacity-0 transform -translate-y-4 scale-98'
          }}
          class="grid grid-cols-1 md:grid-cols-6 gap-4"
        >

          {/* Rule Selection - 4 cols on desktop */}
          <div class={`${CARD_BASE} md:col-span-4`}>
            <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 class={CARD_HEADING}>
                <span class={`${ICON_BADGE} bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400`}>
                  <i class="fas fa-filter"></i>
                </span>
                {t('ruleSelection')}
              </h3>
              <select
                x-model="selectedPredefinedRule"
                x-on:change="applyPredefinedRule()"
                class="px-3 py-2 rounded-xl border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer transition-colors"
              >
                <option value="custom">{t('custom')}</option>
                <option value="minimal">{t('minimal')}</option>
                <option value="balanced">{t('balanced')}</option>
                <option value="comprehensive">{t('comprehensive')}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {UNIFIED_RULES.map((rule) => (
                <label class="flex items-center p-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60 hover:border-primary-300 dark:hover:border-primary-700/60 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 cursor-pointer transition-all group">
                  <input
                    type="checkbox"
                    value={rule.name}
                    x-model="selectedRules"
                    x-on:change="selectedPredefinedRule = 'custom'"
                    class="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                  <span class="ml-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t(`outboundNames.${rule.name}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* General Settings - 2 cols on desktop */}
          <div class={`${CARD_BASE} md:col-span-2`}>
            <h3 class={`${CARD_HEADING} mb-4`}>
              <span class={`${ICON_BADGE} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400`}>
                <i class="fas fa-cog"></i>
              </span>
              {t('generalSettings')}
            </h3>

            <div class="space-y-2.5">
              <label class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer gap-3">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{t('groupByCountry')}</span>
                <div class="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                  <div class="w-10 h-5.5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300/50 dark:peer-focus:ring-primary-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600" style="width:2.5rem;height:1.375rem"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer gap-3">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{t('includeAutoSelect')}</span>
                <div class="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                  <div class="bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300/50 dark:peer-focus:ring-primary-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600" style="width:2.5rem;height:1.375rem"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer gap-3">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{t('enableClashUI')}</span>
                <div class="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                  <div class="bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300/50 dark:peer-focus:ring-primary-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600" style="width:2.5rem;height:1.375rem"></div>
                </div>
              </label>

              <div
                x-show="enableClashUI"
                {...{
                  'x-transition:enter': 'transition ease-out duration-200',
                  'x-transition:enter-start': 'opacity-0 transform -translate-y-2',
                  'x-transition:enter-end': 'opacity-100 transform translate-y-0',
                  'x-transition:leave': 'transition ease-in duration-150',
                  'x-transition:leave-start': 'opacity-100 transform translate-y-0',
                  'x-transition:leave-end': 'opacity-0 transform -translate-y-2'
                }}
                class="space-y-2 pt-2"
              >
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('externalController')}</label>
                  <input type="text" x-model="externalController" class="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors" placeholder={t('externalControllerPlaceholder')} />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('externalUiDownloadUrl')}</label>
                  <input type="text" x-model="externalUiDownloadUrl" class="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors" placeholder={t('externalUiDownloadUrlPlaceholder')} />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Rules - full width */}
          <div class="md:col-span-6">
            <CustomRules t={t} />
          </div>

          {/* Subconverter URL - 3 cols */}
          <div class={`${CARD_BASE} md:col-span-3`}>
            <h3 class={`${CARD_HEADING} mb-2`}>
              <span class={`${ICON_BADGE} bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400`}>
                <i class="fas fa-file-export"></i>
              </span>
              {t('subconverterConfigTitle')}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('subconverterConfigDesc')}</p>
            <div class="px-3 py-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700 bg-gray-900/95 dark:bg-black/40">
              <p class="font-mono text-xs text-emerald-300 dark:text-emerald-300 break-all leading-relaxed" x-text="getSubconverterUrl()"></p>
            </div>
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                x-on:click="copySubconverterUrl()"
                class="px-3.5 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                x-bind:class="subconverterCopied ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-300/40' : 'bg-gray-100/70 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/60'"
              >
                <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
                <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
              </button>
            </div>
          </div>

          {/* Base Config - 3 cols */}
          <div class={`${CARD_BASE} md:col-span-3`}>
            <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 class={CARD_HEADING}>
                <span class={`${ICON_BADGE} bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400`}>
                  <i class="fas fa-file-code"></i>
                </span>
                {t('baseConfigSettings')}
              </h3>
              <select
                x-model="configType"
                class="px-2.5 py-1.5 rounded-lg border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-xs font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                <option value="singbox">SingBox (JSON)</option>
                <option value="clash">Clash (YAML)</option>
                <option value="surge">Surge (JSON/INI)</option>
              </select>
            </div>

            <ValidatedTextarea
              id="configEditor"
              name="configEditor"
              model="configEditor"
              rows={5}
              placeholder="Paste your custom config here..."
              variant="mono"
              containerClass="mt-0 group"
              labelWrapperClass="flex items-center justify-end mb-2"
              labelActionsWrapperClass="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              pasteLabel={t('paste')}
              clearLabel={t('clear')}
              validation={{
                button: {
                  key: 'validate-config',
                  label: t('validateConfig'),
                  className:
                    'px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer',
                  attrs: {
                    'x-on:click': 'validateBaseConfig()'
                  }
                },
                success: {
                  show: "configValidationState === 'success'",
                  textExpr: 'configValidationMessage'
                },
                error: {
                  show: "configValidationState === 'error'",
                  textExpr: 'configValidationMessage'
                }
              }}
              inlineActionsWrapperClass="absolute bottom-4 right-4 flex gap-2"
              preserveLabelSpace={false}
            />

            <div class="flex justify-end gap-2 mt-3">
              <button
                type="button"
                x-on:click="saveBaseConfig()"
                x-bind:disabled="savingConfig"
                class="px-3.5 py-1.5 bg-gray-100/70 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-600/60 transition-colors font-medium text-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <i class="fas" x-bind:class="savingConfig ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
              </button>
              <button
                type="button"
                x-on:click="clearBaseConfig()"
                class="px-3.5 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium text-xs cursor-pointer"
              >
                {t('clearConfig')}
              </button>
            </div>
          </div>

          {/* User Agent - 6 cols (full) */}
          <div class={`${CARD_BASE} md:col-span-6`}>
            <h3 class={`${CARD_HEADING} mb-3`}>
              <span class={`${ICON_BADGE} bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400`}>
                <i class="fas fa-user-secret"></i>
              </span>
              {t('UASettings')}
            </h3>
            <input
              type="text"
              x-model="customUA"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors font-mono text-sm"
              placeholder="curl/7.74.0"
            />
          </div>
        </div>
      </form>

      {/* ============ 4. RESULTS SECTION ============ */}
      <div
        x-cloak
        x-show="generatedLinks"
        x-data="{ copied: null }"
        {...{
          'x-transition:enter': 'transition ease-out duration-500',
          'x-transition:enter-start': 'opacity-0 transform translate-y-8',
          'x-transition:enter-end': 'opacity-100 transform translate-y-0'
        }}
        class="mt-8"
      >
        <div class={`${CARD_BASE} relative overflow-hidden`}>
          {/* Decorative gradient blob */}
          <div class="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-primary-300/30 to-purple-300/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

          <div class="relative">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5 mb-1">
              <span class={`${ICON_BADGE} bg-gradient-to-br from-emerald-400 to-emerald-600 text-white`}>
                <i class="fas fa-check"></i>
              </span>
              {t('subscriptionLinks')}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-5 ml-12">
              {t('shareUrls')}
            </p>

            <div class="grid grid-cols-1 gap-3">
              {LINK_FIELDS.map((field) => (
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
                        x-bind:value={`shortenedLinks ? shortenedLinks?.${field.key} : generatedLinks?.${field.key}`}
                        class="w-full bg-transparent border-0 p-0 font-mono text-xs sm:text-sm focus:ring-0 focus:outline-none truncate"
                        x-bind:class="shortenedLinks ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-700 dark:text-gray-300'"
                      />
                    </div>
                    <button
                      type="button"
                      x-on:click={`navigator.clipboard.writeText((shortenedLinks || generatedLinks)?.${field.key}); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                      class="shrink-0 w-9 h-9 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 transition-all duration-200 flex items-center justify-center cursor-pointer border border-gray-200/60 dark:border-gray-700/60"
                      x-bind:class={`{
                        'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 dark:hover:border-emerald-700': copied !== '${field.key}',
                        'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 scale-110': copied === '${field.key}'
                      }`}
                      title={t('copyToClipboard') || 'Copy'}
                    >
                      <i class="fas transition-transform" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Shortening Controls */}
            <div class="mt-6 pt-6 border-t border-gray-200/60 dark:border-gray-700/40">
              <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-2xl mx-auto">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    {t('customShortCode')} <span class="text-gray-400">({t('optional')})</span>
                  </label>
                  <input
                    type="text"
                    x-model="customShortCode"
                    placeholder={t('customShortCodePlaceholder')}
                    class="w-full px-4 py-2.5 rounded-xl border border-gray-200/70 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                </div>
                <button
                  type="button"
                  x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                  x-bind:disabled="!shortenedLinks && shortening"
                  class="shrink-0 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  x-bind:class="shortenedLinks
                    ? 'btn-soft text-gray-700 dark:text-gray-300'
                    : 'btn-primary text-white'"
                >
                  <i
                    class="fas"
                    x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"
                  ></i>
                  <span x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};

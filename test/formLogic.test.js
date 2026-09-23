import { describe, it, expect, vi } from 'vitest';
import { formLogicFn } from '../src/components/formLogic.js';

describe('formLogic toString fix', () => {
  it('includes parseSurgeConfigInput definition in toString output', () => {
    const fnString = formLogicFn.toString();

    // Verify the function references parseSurgeConfigInput
    expect(fnString).toContain('parseSurgeConfigInput');

    // Verify the arrow function definitions ARE included
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeConfigInput\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeValue\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+convertSurgeIniToJson\s*=/);
  });

  it('does not contain __name calls that break in browser runtime', () => {
    const fnString = formLogicFn.toString();
    // Ensure no function declarations that esbuild would inject __name() for
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeValue\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+convertSurgeIniToJson\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeConfigInput\b/m);
  });

  it('formData() returns a valid Alpine data object', () => {
    // Simulate browser global environment using Function constructor
    const fakeWindow = { APP_TRANSLATIONS: {}, PREDEFINED_RULE_SETS: {} };
    const fn = new Function('window', '(' + formLogicFn.toString() + ')(); return window;');
    const result = fn(fakeWindow);
    const data = result.formData();
    expect(typeof data.submitForm).toBe('function');
    expect(typeof data.toggleAccordion).toBe('function');
    expect(data.showAdvanced).toBe(false);
  });

  it.each([false, true])('tracks the current generated URLs without blocking conversion (tracking failure: %s)', async (failTracking) => {
    const fakeWindow = {
      APP_TRANSLATIONS: {},
      location: { origin: 'https://example.com', search: '' }
    };
    const fetchMock = vi.fn(() => failTracking ? Promise.reject(new Error('offline')) : Promise.resolve({}));
    const initialize = new Function(
      'window', 'document', 'fetch', 'setTimeout', 'clearTimeout',
      '(' + formLogicFn.toString() + ')(); return window.formData();'
    );
    const data = initialize(fakeWindow, { querySelector: () => null }, fetchMock, () => 1, () => {});

    for (const input of ['vless://first', 'vless://second']) {
      data.input = input;
      await data.submitForm();
      const [path, options] = fetchMock.mock.calls.at(-1);
      const payload = JSON.parse(options.body);

      expect(path).toBe('/track-input');
      expect(options.method).toBe('POST');
      expect(payload.input).toBe(input);
      expect(Object.keys(payload.outputSources)).toEqual(['xray', 'singbox', 'clash', 'surge']);
      expect(payload.outputSources).toEqual(data.generatedLinks);
      for (const url of Object.values(payload.outputSources)) {
        expect(new URL(url).searchParams.get('config')).toBe(input);
      }
      expect(data.loading).toBe(false);
    }
  });
});

describe('general settings form access', () => {
  const setup = (fetchMock = vi.fn()) => {
    const fakeWindow = {
      GENERAL_SETTINGS_PROTECTED: true,
      APP_TRANSLATIONS: {
        settingsWrongPassword: 'wrong password',
        settingsSessionExpired: 'expired',
        settingsRequestFailed: 'failed'
      },
      location: { origin: 'https://example.com', search: '' }
    };
    const alert = vi.fn();
    const navigator = { clipboard: { writeText: vi.fn(async () => {}) } };
    const initialize = new Function(
      'window', 'document', 'fetch', 'setTimeout', 'clearTimeout', 'alert', 'navigator',
      '(' + formLogicFn.toString() + ')(); return window.formData();'
    );
    const data = initialize(fakeWindow, { querySelector: () => null }, fetchMock, () => 1, () => {}, alert, navigator);
    data.input = 'trojan://secret@example.com:443#test';
    return { data, alert, navigator };
  };

  it('ignores restored or imported general settings while locked', async () => {
    const fetchMock = vi.fn(async () => ({}));
    const { data } = setup(fetchMock);
    Object.assign(data, {
      groupByCountry: true, includeAutoSelect: false, excludeInvalidNodes: true,
      enableClashUI: true, externalController: '0.0.0.0:9090', multiPort: true
    });
    await data.submitForm();
    for (const url of [...Object.values(data.generatedLinks), data.getSubconverterUrl()]) {
      const params = new URL(url).searchParams;
      for (const key of ['group_by_country', 'include_auto_select', 'exclude_invalid_nodes', 'enable_clash_ui', 'multiPort', 'external_controller']) {
        expect(params.has(key)).toBe(false);
      }
    }
    expect(fetchMock.mock.calls.every(([url]) => url === '/track-input')).toBe(true);
  });

  it('clears entered passwords on success and failure', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 403 }));
    const { data } = setup(fetchMock);
    data.settingsPassword = 'wrong';
    await data.unlockGeneralSettings();
    expect(data.settingsPassword).toBe('');
    expect(data.settingsError).toBe('wrong password');
    expect(data.generalSettingsUnlocked).toBe(false);
    fetchMock.mockResolvedValue({ ok: true });
    data.settingsPassword = 'correct-password';
    await data.unlockGeneralSettings();
    expect(data.settingsPassword).toBe('');
    expect(data.settingsError).toBe('');
    expect(data.generalSettingsUnlocked).toBe(true);
    expect(fetchMock.mock.calls.at(-1)[1].body).toBe(JSON.stringify({ password: 'correct-password' }));
  });

  it('includes server authorization in generated and copied links', async () => {
    const fetchMock = vi.fn(async (path, options) => {
      if (path !== '/general-settings/sign') return {};
      const url = new URL(JSON.parse(options.body).url);
      url.searchParams.set('settings_token', 'signed-token');
      return { ok: true, json: async () => ({ url: url.toString() }) };
    });
    const { data, navigator } = setup(fetchMock);
    data.generalSettingsUnlocked = true;
    data.groupByCountry = true;
    await data.submitForm();
    for (const url of Object.values(data.generatedLinks)) {
      expect(new URL(url).searchParams.get('settings_token')).toBe('signed-token');
      expect(new URL(url).searchParams.get('group_by_country')).toBe('true');
    }
    await data.copySubconverterUrl();
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    expect(new URL(copied).pathname).toBe('/subconverter');
    expect(new URL(copied).searchParams.get('settings_token')).toBe('signed-token');
    expect(data.getSubconverterPreview()).toBe(copied);
  });

  it('relocks an expired session without publishing unsigned or stale links', async () => {
    const { data, alert } = setup(vi.fn(async () => ({ ok: false, status: 403 })));
    data.generalSettingsUnlocked = true;
    data.groupByCountry = true;
    data.generatedLinks = { clash: 'old-link' };
    await data.submitForm();
    expect(data.generalSettingsUnlocked).toBe(false);
    expect(data.generatedLinks).toBeNull();
    expect(alert).toHaveBeenCalledWith('expired');
  });
});

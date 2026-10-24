import { describe, it, expect, vi } from 'vitest';
import { formLogicFn } from '../src/components/formLogic.js';
import { RULE_OPTIONS, PREDEFINED_RULE_SETS } from '../src/config/index.js';

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
      enableClashUI: true, externalController: '0.0.0.0:9090', multiPort: true,
      chainProxy: true, chainProxyInput: 'socks://user:pass@server:1080'
    });
    await data.submitForm();
    for (const url of [...Object.values(data.generatedLinks), data.getSubconverterUrl()]) {
      const params = new URL(url).searchParams;
      for (const key of ['group_by_country', 'include_auto_select', 'exclude_invalid_nodes', 'enable_clash_ui', 'multiPort', 'external_controller', 'chain_proxy', 'chain_proxy_input']) {
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

describe('subscription QR codes', () => {
  const setup = () => {
    const encodedUrls = [];
    const window = {
      APP_TRANSLATIONS: {
        qrCodeUnavailable: 'QR unavailable',
        qrCodeUsingShortLink: 'Using a short link',
        shortenFailed: 'Shortening failed'
      },
      location: { origin: 'https://example.com' },
      qrcode: vi.fn(() => {
        let value;
        return {
          addData: url => { value = url; encodedUrls.push(url); },
          make: () => {
            if (value.length > 2331) throw 'code length overflow. (28000>18672)';
          },
          createSvgTag: () => '<svg></svg>'
        };
      })
    };
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => 'shared-code' }));
    const alert = vi.fn();
    const initialize = new Function('window', 'fetch', 'alert',
      '(' + formLogicFn.toString() + ')(); return window.formData();');
    const data = initialize(window, fetchMock, alert);
    const dialog = { open: false, showModal: vi.fn(() => { dialog.open = true; }) };
    data.$refs = { qrDialog: dialog };
    const node = 'vless://test@node.example:443?security=reality&pqv=' + 'a'.repeat(3500);
    const query = new URLSearchParams({ config: node, selectedRules: 'balanced' }).toString();
    data.generatedLinks = Object.fromEntries(['xray', 'singbox', 'clash', 'surge'].map(type =>
      [type, `https://example.com/${type}?${query}`]));
    return { data, window, fetchMock, alert, dialog, encodedUrls, node };
  };

  it.each(['xray', 'singbox', 'clash', 'surge'])('uses a short link when a large node exceeds QR capacity (%s)', async key => {
    const { data, fetchMock, encodedUrls, node } = setup();
    const pending = data.showQRCode(key, key);
    expect(data.qrCode.loading).toBe(true);
    await pending;
    const prefixes = { xray: 'x', singbox: 'b', clash: 'c', surge: 's' };
    expect(encodedUrls.at(-1)).toBe(`https://example.com/${prefixes[key]}/shared-code`);
    expect(data.qrCode.src).toMatch(/^data:image\/svg\+xml/);
    expect(data.qrCode.message).toBe('Using a short link');
    expect(data.shortening).toBe(false);
    for (const [request] of fetchMock.mock.calls) {
      const original = new URL(new URL(request).searchParams.get('url'));
      expect(original.searchParams.get('config')).toBe(node);
    }
  });

  it('encodes ordinary long URLs and existing short URLs without storage requests', async () => {
    const { data, fetchMock, encodedUrls, dialog } = setup();
    data.generatedLinks = { xray: 'https://example.com/xray?config=vless%3A%2F%2Ftest' };
    await data.showQRCode('xray', 'Xray');
    expect(encodedUrls.at(-1)).toBe(data.generatedLinks.xray);
    data.shortenedLinks = { xray: 'https://example.com/x/existing' };
    await data.showQRCode('xray', 'Xray');
    expect(encodedUrls.at(-1)).toBe(data.shortenedLinks.xray);
    expect(data.qrCode.src).toBeTruthy();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows storage failures in the dialog and allows retrying', async () => {
    const { data, fetchMock, alert } = setup();
    fetchMock.mockResolvedValueOnce({ ok: false });
    await data.showQRCode('xray', 'Xray');
    expect(data.qrCode).toEqual({ error: 'Shortening failed' });
    expect(data.shortening).toBe(false);
    expect(alert).not.toHaveBeenCalled();
    await data.showQRCode('xray', 'Xray');
    expect(data.qrCode.src).toBeTruthy();
  });

  it.each(['missing', 'broken'])('does not treat a %s QR library as a capacity error', async state => {
    const { data, window, fetchMock } = setup();
    window.qrcode = state === 'missing' ? undefined : () => { throw new Error('broken renderer'); };
    await data.showQRCode('xray', 'Xray');
    expect(data.qrCode).toEqual({ error: 'QR unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not overwrite a newer conversion with old shortened links', async () => {
    const { data } = setup();
    const pending = data.showQRCode('xray', 'Xray');
    data.generatedLinks = { xray: 'https://example.com/xray?config=new-node' };
    await data.showQRCode('xray', 'New Xray');
    const currentQR = data.qrCode;
    await pending;
    expect(data.shortenedLinks).toBeNull();
    expect(data.qrCode).toBe(currentQR);
    expect(data.qrCodeLabel).toBe('New Xray');
  });
});

describe('rule category selection', () => {
  const setup = () => {
    const window = {
      RULE_OPTIONS, PREDEFINED_RULE_SETS,
      location: { origin: 'https://example.com', search: '' },
      APP_TRANSLATIONS: {}
    };
    const initialize = new Function('window', 'document', 'fetch', 'setTimeout',
      '(' + formLogicFn.toString() + ')(); return window.formData();');
    const data = initialize(window, { querySelector: () => null }, async () => ({}), () => 1);
    data.$refs = { ruleOptionsDialog: { showModal: vi.fn(), close: vi.fn() } };
    data.selectedRules = ['Google'];
    return data;
  };
  const children = RULE_OPTIONS['Social Media'].map(option => option.name);

  it('selects the whole category with every service checked in its dialog', () => {
    const data = setup();
    data.toggleRuleCategory('Social Media', true);
    expect(data.selectedRules).toEqual(['Google', 'Social Media']);
    data.openRuleOptions('Social Media');
    expect(data.ruleOptionsDraft).toEqual(children);
    expect(data.getSelectedRuleOptionCount('Social Media')).toBe(0);
  });

  it.each([[children[0]], [children[0], children[2]], children].map(selected => ({ selected })))('keeps explicit selections separate: $selected', ({ selected }) => {
    const data = setup();
    data.toggleRuleCategory('Social Media', true);
    data.openRuleOptions('Social Media');
    data.ruleOptionsDraft = selected;
    data.applyRuleOptions();
    expect(data.selectedRules).toEqual(['Google', ...selected]);
    expect(data.selectedPredefinedRule).toBe('custom');
    expect(data.getSelectedRuleOptionCount('Social Media')).toBe(selected.length);
    data.openRuleOptions('Social Media');
    expect(data.ruleOptionsDraft).toEqual(selected);
  });

  it('leaves the category intact when editing an uncommitted draft', () => {
    const data = setup();
    data.toggleRuleCategory('Social Media', true);
    data.openRuleOptions('Social Media');
    data.ruleOptionsDraft = [children[0]];
    expect(data.selectedRules).toEqual(['Google', 'Social Media']);
    data.openRuleOptions('Social Media');
    expect(data.ruleOptionsDraft).toEqual(children);
  });

  it('replaces individual selections with a category and can clear either mode', () => {
    const data = setup();
    data.selectedRules.push(...children);
    data.toggleRuleCategory('Social Media', true);
    expect(data.selectedRules).toEqual(['Google', 'Social Media']);
    data.toggleRuleCategory('Social Media', false);
    expect(data.selectedRules).toEqual(['Google']);
    data.selectedRules.push(children[0]);
    data.openRuleOptions('Social Media');
    data.ruleOptionsDraft = [];
    data.applyRuleOptions();
    expect(data.selectedRules).toEqual(['Google']);
  });

  it('serializes and restores individual choices in conversion and subconverter links', async () => {
    const data = setup();
    data.input = 'vless://test';
    data.openRuleOptions('Social Media');
    data.ruleOptionsDraft = [children[0], children[2]];
    data.applyRuleOptions();
    await data.submitForm();
    for (const value of [...Object.values(data.generatedLinks), data.getSubconverterUrl()]) {
      expect(JSON.parse(new URL(value).searchParams.get('selectedRules'))).toEqual(data.selectedRules);
    }
    const restored = setup();
    restored.populateFormFromUrl(new URL(data.generatedLinks.clash));
    expect(restored.selectedRules).toEqual(data.selectedRules);
    expect(restored.selectedPredefinedRule).toBe('custom');
    restored.openRuleOptions('Social Media');
    expect(restored.ruleOptionsDraft).toEqual([children[0], children[2]]);
    restored.selectedPredefinedRule = 'comprehensive';
    restored.applyPredefinedRule();
    expect(restored.selectedRules).toEqual(PREDEFINED_RULE_SETS.comprehensive);
    expect(restored.getSelectedRuleOptionCount('Social Media')).toBe(0);
  });
});

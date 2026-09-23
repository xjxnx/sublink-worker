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

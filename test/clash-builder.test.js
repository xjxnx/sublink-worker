import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { createTranslator } from '../src/i18n/index.js';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { sanitizeClashProxyGroups } from '../src/builders/helpers/clashConfigUtils.js';

// Create translator for tests
const t = createTranslator('zh-CN');

describe('Clash Builder Tests', () => {
  it('should clean up proxy-groups and remove non-existent proxies', async () => {
    const input = `
proxies:
  - name: Valid-SS
    type: ss
    server: example.com
    port: 443
    cipher: aes-128-gcm
    password: test
proxy-groups:
  - name: 自定义选择
    type: select
    proxies:
      - DIRECT
      - REJECT
      - Valid-SS
      - NotExist
    `;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const grp = (built['proxy-groups'] || []).find(g => g && g.name === '自定义选择');
    expect(grp).toBeDefined();

    const expected = ['DIRECT', 'REJECT', 'Valid-SS'];
    const actual = grp.proxies || [];

    expect(actual).toEqual(expected);
  });

  it('should reference user-defined proxy-providers in generated proxy-groups', async () => {
    const input = `
proxy-providers:
  my-provider:
    type: http
    url: https://example.com/sub
    path: ./my.yaml
    interval: 3600

proxies:
  - name: local
    type: ss
    server: 127.0.0.1
    port: 1080
    cipher: aes-256-gcm
    password: test
`;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const nodeSelect = (built['proxy-groups'] || []).find(g => g && g.name === '🚀 节点选择');
    expect(nodeSelect).toBeDefined();
    expect(nodeSelect.use).toContain('my-provider');
  });

  it('sanitizeClashProxyGroups should not remove provider node references when group uses providers', () => {
    const config = {
      proxies: [],
      'proxy-groups': [
        {
          name: 'Custom Group',
          type: 'select',
          use: ['my-provider'],
          proxies: ['node-from-provider']
        }
      ]
    };

    sanitizeClashProxyGroups(config);

    const grp = (config['proxy-groups'] || [])[0];
    expect(grp).toBeDefined();
    expect(grp.proxies).toContain('node-from-provider');
  });

  it('should default Private and Location:CN groups to DIRECT', async () => {
    const input = `
ss://YWVzLTEyOC1nY206dGVzdA@example.com:443#HK-Node-1
ss://YWVzLTEyOC1nY206dGVzdA@example.com:444#US-Node-1
    `;

    const builder = new ClashConfigBuilder(input, 'minimal', [], null, 'zh-CN', 'test-agent');
    const yamlText = await builder.build();
    const built = yaml.load(yamlText);

    const privateName = t('outboundNames.Private');
    const cnName = t('outboundNames.Location:CN');

    const privateGroup = (built['proxy-groups'] || []).find(g => g && g.name === privateName);
    const cnGroup = (built['proxy-groups'] || []).find(g => g && g.name === cnName);

    expect(privateGroup).toBeDefined();
    expect(cnGroup).toBeDefined();

    // DIRECT should be the first option (default selected)
    expect(privateGroup.proxies[0]).toBe('DIRECT');
    expect(cnGroup.proxies[0]).toBe('DIRECT');

    // Other groups should NOT default to DIRECT
    const fallbackName = t('outboundNames.Fall Back');
    const fallbackGroup = (built['proxy-groups'] || []).find(g => g && g.name === fallbackName);
    expect(fallbackGroup).toBeDefined();
    expect(fallbackGroup.proxies[0]).not.toBe('DIRECT');
  });
});

describe('Clash SOCKS / HTTP selector ordering', () => {
  const proxies = [
    { name: 'Hong Kong | 01', type: 'trojan', server: 'hk1.example.com', port: 443, password: 'test' },
    { name: '50.3.64.253', type: 'socks5', server: '192.0.2.10', port: 1080 },
    { name: 'Singapore | 03', type: 'trojan', server: 'sg.example.com', port: 443, password: 'test' },
    { name: '38.248.238.99', type: 'http', server: '192.0.2.11', port: 8080 },
    { name: 'Hong Kong | 02', type: 'trojan', server: 'hk2.example.com', port: 443, password: 'test' }
  ];
  const originalNames = proxies.map(proxy => proxy.name);
  const preferredNames = ['50.3.64.253', '38.248.238.99', 'Hong Kong | 01', 'Singapore | 03', 'Hong Kong | 02'];

  it.each(['zh-CN', 'en-US', 'fa-IR', 'ru-RU'])('prioritizes nodes while preserving exempt groups in %s', async lang => {
    const translate = createTranslator(lang);
    const nodeName = translate('outboundNames.Node Select');
    const autoName = translate('outboundNames.Auto Select');
    const builder = new ClashConfigBuilder(yaml.dump({ proxies }), 'balanced', [{ name: 'Custom', site_rules: ['example'] }], null, lang, 'mihomo');
    const built = yaml.load(await builder.build());
    const group = key => built['proxy-groups'].find(group => group.name === translate(`outboundNames.${key}`));

    expect(group('Node Select').proxies).toEqual([autoName, ...preferredNames, 'DIRECT', 'REJECT']);
    expect(group('AI Services').proxies).toEqual([nodeName, ...preferredNames, 'DIRECT', 'REJECT']);
    expect(group('Custom').proxies).toEqual([nodeName, autoName, ...preferredNames, 'DIRECT', 'REJECT']);
    expect(group('Auto Select').proxies).toEqual(originalNames);
    for (const key of ['Private', 'Location:CN']) {
      expect(group(key).proxies).toEqual(['DIRECT', nodeName, ...originalNames, 'REJECT']);
    }
    for (const key of ['Github', 'Telegram', 'Fall Back']) {
      expect(group(key).proxies).toEqual([nodeName, ...originalNames, 'DIRECT', 'REJECT']);
    }
    expect(built.proxies.map(proxy => proxy.name)).toEqual(originalNames);
    expect(yaml.load(builder.formatConfig())).toEqual(built);
  });

  it('preserves group references and special actions in imported selectors', async () => {
    const input = yaml.dump({
      proxies,
      'proxy-groups': [{
        name: 'Imported', type: 'select',
        proxies: ['DIRECT', 'Hong Kong | 01', t('outboundNames.Auto Select'), 'Singapore | 03', '38.248.238.99', t('outboundNames.Node Select'), '50.3.64.253', 'Hong Kong | 02', 'REJECT']
      }]
    });
    const builder = new ClashConfigBuilder(input, 'balanced', [], null, 'zh-CN', 'mihomo');
    const built = yaml.load(await builder.build());
    expect(built['proxy-groups'].find(group => group.name === 'Imported').proxies).toEqual([
      'DIRECT', '38.248.238.99', t('outboundNames.Auto Select'), '50.3.64.253', 'Hong Kong | 01', t('outboundNames.Node Select'), 'Singapore | 03', 'Hong Kong | 02', 'REJECT'
    ]);
  });

  it('prioritizes nodes when auto select is disabled', async () => {
    const builder = new ClashConfigBuilder(yaml.dump({ proxies }), 'balanced', [], null, 'zh-CN', 'mihomo');
    builder.includeAutoSelect = false;
    const built = yaml.load(await builder.build());
    const group = key => built['proxy-groups'].find(group => group.name === t(`outboundNames.${key}`));
    expect(group('Auto Select')).toBeUndefined();
    expect(group('Node Select').proxies).toEqual([...preferredNames, 'DIRECT', 'REJECT']);
    expect(group('Telegram').proxies).toEqual([t('outboundNames.Node Select'), ...originalNames, 'DIRECT', 'REJECT']);
  });

  it('orders the manual selector without adding nodes to country-based selectors', async () => {
    const builder = new ClashConfigBuilder(yaml.dump({ proxies }), 'balanced', [], null, 'zh-CN', 'mihomo', true);
    const built = yaml.load(await builder.build());
    const group = key => built['proxy-groups'].find(group => group.name === t(`outboundNames.${key}`));
    expect(group('Manual Switch').proxies).toEqual(preferredNames);
    expect(group('Node Select').proxies).toEqual([
      t('outboundNames.Auto Select'), t('outboundNames.Manual Switch'), ...builder.countryGroupNames, 'DIRECT', 'REJECT'
    ]);
    expect(group('AI Services').proxies).toEqual([
      t('outboundNames.Node Select'), t('outboundNames.Auto Select'), t('outboundNames.Manual Switch'), ...builder.countryGroupNames, 'DIRECT', 'REJECT'
    ]);
    expect(group('Auto Select').proxies).toEqual(originalNames);
  });
});

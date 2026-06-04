import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';

const input = `
proxies:
  - name: SS-A
    type: ss
    server: example.com
    port: 443
    cipher: aes-128-gcm
    password: test
`;

function buildClash(multiPortOptions) {
  return new ClashConfigBuilder(
    input,
    'minimal',
    [],
    null,
    'zh-CN',
    'test-agent',
    false,
    false,
    undefined,
    undefined,
    true,
    multiPortOptions
  );
}

describe('Clash multi-port listeners', () => {
  it('appends listeners and matching per-port groups plus a single global pool', async () => {
    const builder = buildClash({ enabled: true, basePort: '20000', count: '3' });
    const built = yaml.load(await builder.build());

    expect(built.listeners).toHaveLength(3);
    built.listeners.forEach((listener, i) => {
      const port = 20000 + i;
      expect(listener).toEqual({
        name: `port${port}`,
        type: 'mixed',
        port,
        listen: '0.0.0.0',
        proxy: `${port}组`
      });
      // listener.proxy must reference an existing group
      const group = built['proxy-groups'].find(g => g.name === listener.proxy);
      expect(group).toBeDefined();
      expect(group.proxies).toEqual(['全部节点']);
    });

    const globalGroups = built['proxy-groups'].filter(g => g.name === '全部节点');
    expect(globalGroups).toHaveLength(1);
    expect(globalGroups[0]).toEqual({
      name: '全部节点',
      type: 'select',
      'include-all': true,
      filter: '^(?!直连).*'
    });
  });

  it('ignores multi-port when disabled', async () => {
    const builder = buildClash({ enabled: false, basePort: '20000', count: '3' });
    const built = yaml.load(await builder.build());
    expect(built.listeners).toBeUndefined();
    expect(built['proxy-groups'].some(g => g.name === '全部节点')).toBe(false);
  });

  it('ignores invalid parameters without throwing', async () => {
    const cases = [
      { enabled: true, basePort: '500', count: '3' },      // basePort below range
      { enabled: true, basePort: '65500', count: '50' },   // overflow > 65535
      { enabled: true, basePort: '20000', count: '0' },    // count below range
      { enabled: true, basePort: '20000', count: '999' },  // count above range
      { enabled: true, basePort: 'abc', count: '3' }        // non-numeric
    ];
    for (const opts of cases) {
      const built = yaml.load(await buildClash(opts).build());
      expect(built.listeners, JSON.stringify(opts)).toBeUndefined();
    }
  });
});

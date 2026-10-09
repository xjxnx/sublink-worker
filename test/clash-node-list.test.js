import { afterEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { BaseConfigBuilder } from '../src/builders/BaseConfigBuilder.js';
import { ProxyParser } from '../src/parsers/ProxyParser.js';
import { parseClashYaml, parseSubscriptionContent } from '../src/parsers/subscription/subscriptionContentParser.js';
import { fetchSubscription } from '../src/parsers/subscription/httpSubscriptionFetcher.js';
import { decodeBase64, encodeBase64 } from '../src/utils.js';

const nodes = [
    { name: '🇭🇰 香港 01', type: 'trojan', server: 'hk.example.com', port: 4005, password: 'test-password', sni: 'tls.example.com', 'skip-cert-verify': true, udp: true },
    { name: '🇸🇬 新加坡 01', type: 'trojan', server: 'sg.example.com', port: 4006, password: 'another-password', sni: 'tls.example.com', 'skip-cert-verify': false, udp: true }
];

const indentedList = yaml.dump(nodes).split('\n').map(line => line ? `  ${line}` : line).join('\n');
const separateDashList = indentedList.replace(/^  - /gm, '  -\n    ');

function expectParsedNodes(result) {
    expect(result.type).toBe('yamlConfig');
    expect(result.config).toBeNull();
    expect(result.proxies).toHaveLength(nodes.length);
    nodes.forEach((node, index) => {
        expect(result.proxies[index]).toMatchObject({
            tag: node.name,
            type: node.type,
            server: node.server,
            server_port: node.port,
            password: node.password,
            tls: { enabled: true, server_name: node.sni, insecure: node['skip-cert-verify'] }
        });
    });
}

describe('Clash node lists without a proxies wrapper', () => {
    afterEach(() => vi.unstubAllGlobals());

    it.each([
        ['root list', yaml.dump(nodes)],
        ['indented list', indentedList],
        ['separate dash lines', separateDashList],
        ['blank lines and CRLF', `\r\n${separateDashList.replace(/\n/g, '\r\n')}\r\n`],
        ['flow entries', nodes.map(node => `  - ${JSON.stringify(node)}`).join('\n')]
    ])('parses %s and preserves Trojan TLS fields', (_, input) => {
        expectParsedNodes(parseClashYaml(input));
        expectParsedNodes(parseSubscriptionContent(input));
    });

    it.each(['[]', '- just text', '- name: selector\n  type: select\n  proxies: [DIRECT]'])('does not treat non-node lists as configs: %s', input => {
        expect(parseClashYaml(input)).toBeNull();
    });

    it('ignores unsupported entries without dropping valid nodes', () => {
        expectParsedNodes(parseSubscriptionContent(yaml.dump([null, ...nodes, { type: 'unsupported' }])));
    });

    it('parses a Base64 encoded indented list in the builder', async () => {
        const builder = new BaseConfigBuilder(encodeBase64(separateDashList), {}, 'zh-CN', 'test-agent');
        const proxies = await builder.parseCustomItems();
        expectParsedNodes({ type: 'yamlConfig', config: null, proxies });
        expect(builder.config).toEqual({});
    });

    it.each([
        ['plain', separateDashList],
        ['Base64', encodeBase64(separateDashList)],
        ['URL encoded', encodeURIComponent(separateDashList)]
    ])('parses a remote %s node list', async (_, content) => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(content)));
        expectParsedNodes(await fetchSubscription('https://example.com/nodes', 'test-agent'));
        const builder = new BaseConfigBuilder('https://example.com/nodes', {}, 'zh-CN', 'test-agent');
        expectParsedNodes({ type: 'yamlConfig', config: null, proxies: await builder.parseCustomItems() });
    });

    it.each([
        ['clash', 'c'],
        ['singbox', 'b'],
        ['surge', 's'],
        ['xray', 'x']
    ])('serves nodes through the %s subscription short link', async (target, prefix) => {
        const app = createApp({
            kv: new MemoryKVAdapter(),
            logger: console,
            config: { configTtlSeconds: 60, shortLinkTtlSeconds: null }
        });
        const url = `http://localhost/${target}?config=${encodeURIComponent(separateDashList)}&selectedRules=minimal`;
        const shortResponse = await app.request(`http://localhost/shorten-v2?url=${encodeURIComponent(url)}`);
        expect(shortResponse.status).toBe(200);
        const redirect = await app.request(`http://localhost/${prefix}/${await shortResponse.text()}`);
        expect(redirect.status).toBe(302);
        const response = await app.request(redirect.headers.get('location'));
        expect(response.status).toBe(200);
        const content = await response.text();
        const parsed = target === 'xray'
            ? { proxies: await Promise.all(decodeBase64(content).split('\n').filter(Boolean).map(line => ProxyParser.parse(line))) }
            : parseSubscriptionContent(content);
        expect(parsed.proxies.map(proxy => proxy.tag)).toEqual(nodes.map(node => node.name));
        expect(parsed.proxies.map(proxy => proxy.password)).toEqual(nodes.map(node => node.password));
        expect(parsed.proxies.map(proxy => proxy.tls.server_name)).toEqual(nodes.map(node => node.sni));
    });
});

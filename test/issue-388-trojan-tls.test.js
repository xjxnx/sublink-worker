import { describe, expect, it } from 'vitest';
import { parseTrojan } from '../src/parsers/protocols/trojanParser.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';
import { PREDEFINED_RULE_SETS } from '../src/config/index.js';

// Trojan-over-TLS is required by protocol design. When the URL omits the
// `security` param, sing-box would receive `tls.enabled = false` and fail to
// start the outbound. See issue #388.
describe('Issue #388 - trojan defaults to TLS when security param omitted', () => {
    it('enables TLS when security param is absent', () => {
        const url = 'trojan://pass@example.com:443?allowInsecure=1&peer=www.apple.com.cn&sni=www.apple.com.cn&type=tcp#JP-03';
        const result = parseTrojan(url);

        expect(result.type).toBe('trojan');
        expect(result.tls.enabled).toBe(true);
        expect(result.tls.server_name).toBe('www.apple.com.cn');
        expect(result.tls.insecure).toBe(true);
    });

    it('keeps TLS enabled when security=tls is explicit', () => {
        const url = 'trojan://pass@example.com:443?security=tls&sni=example.org#explicit-tls';
        const result = parseTrojan(url);

        expect(result.tls.enabled).toBe(true);
        expect(result.tls.server_name).toBe('example.org');
    });

    it('respects security=none when explicitly set', () => {
        const url = 'trojan://pass@example.com:443?security=none#no-tls';
        const result = parseTrojan(url);

        expect(result.tls.enabled).toBe(false);
    });
});

// Clash YAML proxies usually omit `tls` for trojan since the protocol implies it.
// convertYamlProxyToObject must default trojan to TLS so sni/skip-cert-verify survive.
describe('Issue #388 - YAML trojan defaults to TLS when tls field omitted', () => {
    it('enables TLS and keeps sni/skip-cert-verify when tls is absent', () => {
        const result = convertYamlProxyToObject({
            name: '🇭🇰 HK',
            server: 'hk-1.example.com',
            port: 20101,
            type: 'trojan',
            password: 'secret',
            sni: 's0.awsstatic.com',
            'skip-cert-verify': true,
            udp: true,
            network: 'ws',
            'ws-opts': { path: '/movie', headers: { Host: 's0.awsstatic.com' } }
        });

        expect(result.type).toBe('trojan');
        expect(result.tls.enabled).toBe(true);
        expect(result.tls.server_name).toBe('s0.awsstatic.com');
        expect(result.tls.insecure).toBe(true);
        expect(result.transport).toEqual({ type: 'ws', path: '/movie', headers: { Host: 's0.awsstatic.com' } });
        // sing-box network must stay tcp/udp; Clash network=ws lives in transport only
        expect(result.network).toBe('tcp');
    });

    it('respects explicit tls: false', () => {
        const result = convertYamlProxyToObject({
            name: 'no-tls',
            server: 'example.com',
            port: 443,
            type: 'trojan',
            password: 'secret',
            tls: false
        });

        expect(result.tls.enabled).toBe(false);
    });

    it('does not change vmess default (still requires explicit tls)', () => {
        const result = convertYamlProxyToObject({
            name: 'vmess-node',
            server: 'example.com',
            port: 443,
            type: 'vmess',
            uuid: '6dffb7f9-c201-3777-af46-c934c49c1034'
        });

        expect(result.tls.enabled).toBe(false);
    });

    it('builds sing-box trojan+ws without invalid network field', async () => {
        const yaml = `proxies:
  - {name: "HK", server: hk-1.example.com, port: 20101, type: trojan, password: secret, sni: s0.awsstatic.com, skip-cert-verify: true, network: ws, ws-opts: { path: "/movie", headers: { Host: "s0.awsstatic.com" }}}`;
        const builder = new SingboxConfigBuilder(
            yaml,
            PREDEFINED_RULE_SETS.minimal,
            [],
            null,
            'zh-CN',
            'clash',
            false,
            true
        );
        await builder.build();
        const trojan = builder.config.outbounds.find(o => o.type === 'trojan' && o.server);
        expect(trojan.tls?.enabled).toBe(true);
        expect(trojan.transport?.type).toBe('ws');
        expect(trojan.network === undefined || trojan.network === 'tcp' || trojan.network === 'udp').toBe(true);
        expect(trojan.network).not.toBe('ws');
    });
});

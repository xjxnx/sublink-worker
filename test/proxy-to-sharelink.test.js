import { describe, expect, it } from 'vitest';
import { proxyToShareLink } from '../src/parsers/proxyToShareLink.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';
import { ProxyParser } from '../src/parsers/ProxyParser.js';

// The /xray endpoint relies on proxyToShareLink to turn parsed nodes back into
// share links. These tests assert the links are well-formed and survive a
// roundtrip through ProxyParser (serialize -> parse -> same key fields).

describe('proxyToShareLink - trojan + ws (issue: clash yaml to xray)', () => {
    const yamlProxy = {
        name: '🇺🇸 US1',
        server: 'us-1.kozocn.com',
        port: 20001,
        type: 'trojan',
        password: '2081ac55-30ad-30f9-8557-d8d22f1c7f18',
        sni: 's0.awsstatic.com',
        'skip-cert-verify': true,
        udp: true,
        network: 'ws',
        'ws-opts': { path: '/movie', headers: { Host: 's0.awsstatic.com' } }
    };

    it('serializes trojan ws node to a trojan:// link', () => {
        const obj = convertYamlProxyToObject(yamlProxy);
        const link = proxyToShareLink(obj);

        expect(link.startsWith('trojan://')).toBe(true);
        expect(link).toContain('@us-1.kozocn.com:20001');
        expect(link).toContain('security=tls');
        expect(link).toContain('type=ws');
        expect(link).toContain('path=%2Fmovie');
        expect(link).toContain('sni=s0.awsstatic.com');
        expect(link).toContain('allowInsecure=1');
        expect(link).toContain('#%F0%9F%87%BA%F0%9F%87%B8%20US1');
    });

    it('roundtrips trojan ws node through ProxyParser', async () => {
        const obj = convertYamlProxyToObject(yamlProxy);
        const link = proxyToShareLink(obj);
        const parsed = await ProxyParser.parse(link);

        expect(parsed.type).toBe('trojan');
        expect(parsed.server).toBe('us-1.kozocn.com');
        expect(parsed.server_port).toBe(20001);
        expect(parsed.password).toBe('2081ac55-30ad-30f9-8557-d8d22f1c7f18');
        expect(parsed.tls.enabled).toBe(true);
        expect(parsed.tls.server_name).toBe('s0.awsstatic.com');
        expect(parsed.tls.insecure).toBe(true);
        expect(parsed.transport.type).toBe('ws');
        expect(parsed.transport.path).toBe('/movie');
        expect(parsed.transport.headers.host).toBe('s0.awsstatic.com');
    });
});

describe('proxyToShareLink - other protocols roundtrip', () => {
    it('vless ws', async () => {
        const obj = convertYamlProxyToObject({
            name: 'vless-node', server: 'example.com', port: 443, type: 'vless',
            uuid: '6dffb7f9-c201-3777-af46-c934c49c1034', tls: true, servername: 'a.com',
            network: 'ws', 'ws-opts': { path: '/p', headers: { Host: 'a.com' } }
        });
        const parsed = await ProxyParser.parse(proxyToShareLink(obj));
        expect(parsed.type).toBe('vless');
        expect(parsed.uuid).toBe('6dffb7f9-c201-3777-af46-c934c49c1034');
        expect(parsed.transport.type).toBe('ws');
        expect(parsed.transport.path).toBe('/p');
    });

    it('vmess ws', async () => {
        const obj = convertYamlProxyToObject({
            name: 'vmess-node', server: 'example.com', port: 443, type: 'vmess',
            uuid: '6dffb7f9-c201-3777-af46-c934c49c1034', tls: true, sni: 'a.com',
            network: 'ws', 'ws-opts': { path: '/p', headers: { Host: 'a.com' } }
        });
        const parsed = await ProxyParser.parse(proxyToShareLink(obj));
        expect(parsed.type).toBe('vmess');
        expect(parsed.server).toBe('example.com');
        expect(parsed.uuid).toBe('6dffb7f9-c201-3777-af46-c934c49c1034');
        expect(parsed.transport.type).toBe('ws');
    });

    it('shadowsocks', async () => {
        const obj = convertYamlProxyToObject({
            name: 'ss-node', server: 'example.com', port: 8388, type: 'ss',
            cipher: 'aes-128-gcm', password: 'secret'
        });
        const parsed = await ProxyParser.parse(proxyToShareLink(obj));
        expect(parsed.type).toBe('shadowsocks');
        expect(parsed.method).toBe('aes-128-gcm');
        expect(parsed.password).toBe('secret');
        expect(parsed.server_port).toBe(8388);
    });

    it('hysteria2', async () => {
        const obj = convertYamlProxyToObject({
            name: 'hy2', server: 'example.com', port: 443, type: 'hysteria2',
            password: 'pw', sni: 'a.com', 'skip-cert-verify': true
        });
        const parsed = await ProxyParser.parse(proxyToShareLink(obj));
        expect(parsed.type).toBe('hysteria2');
        expect(parsed.password).toBe('pw');
        expect(parsed.tls.server_name).toBe('a.com');
    });

    it('tuic', async () => {
        const obj = convertYamlProxyToObject({
            name: 'tuic', server: 'example.com', port: 443, type: 'tuic',
            uuid: '72e245c5-c681-4cbc-9ccd-7b10bb8f2c53', password: 'pw', sni: 'a.com'
        });
        const parsed = await ProxyParser.parse(proxyToShareLink(obj));
        expect(parsed.type).toBe('tuic');
        expect(parsed.uuid).toBe('72e245c5-c681-4cbc-9ccd-7b10bb8f2c53');
        expect(parsed.password).toBe('pw');
    });

    it('returns null for unknown/invalid input', () => {
        expect(proxyToShareLink(null)).toBe(null);
        expect(proxyToShareLink({ type: 'wireguard', server: 'x' })).toBe(null);
        expect(proxyToShareLink({ type: 'trojan' })).toBe(null);
    });
});

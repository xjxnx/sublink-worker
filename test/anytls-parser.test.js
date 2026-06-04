import { describe, expect, it } from 'vitest';
import { parseAnytls } from '../src/parsers/protocols/anytlsParser.js';
import { ProxyParser } from '../src/parsers/ProxyParser.js';

describe('anytls:// link parsing', () => {
    it('parses password, server, port and forces TLS', async () => {
        const url = 'anytls://my-pass@example.com:8443?sni=example.org&insecure=1&alpn=h2,http/1.1#ANYTLS-JP';
        const result = parseAnytls(url);

        expect(result.type).toBe('anytls');
        expect(result.tag).toBe('ANYTLS-JP');
        expect(result.server).toBe('example.com');
        expect(result.server_port).toBe(8443);
        expect(result.password).toBe('my-pass');
        expect(result.tls.enabled).toBe(true);
        expect(result.tls.server_name).toBe('example.org');
        expect(result.tls.insecure).toBe(true);
        expect(result.tls.alpn).toEqual(['h2', 'http/1.1']);
    });

    it('url-decodes the password', () => {
        const url = 'anytls://p%40ss%3Aword@example.com:443#node';
        const result = parseAnytls(url);
        expect(result.password).toBe('p@ss:word');
    });

    it('is dispatched by ProxyParser via scheme', async () => {
        const url = 'anytls://pass@example.com:443#node';
        const result = await ProxyParser.parse(url);
        expect(result?.type).toBe('anytls');
    });
});

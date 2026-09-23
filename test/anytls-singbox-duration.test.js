import { describe, expect, it } from 'vitest';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';

describe('AnyTLS Sing-box duration conversion', () => {
    const builder = () => new SingboxConfigBuilder('', [], [], null, 'zh-CN', null);

    it('converts parsed URI duration values to sing-box Duration strings', () => {
        const converted = builder().convertProxy({
            tag: 'anytls-node',
            type: 'anytls',
            server: 'example.com',
            server_port: 443,
            password: 'secret',
            idle_session_check_interval: 30,
            idle_session_timeout: 120,
            min_idle_session: 5,
            tls: { enabled: true }
        });

        expect(converted.idle_session_check_interval).toBe('30s');
        expect(converted.idle_session_timeout).toBe('120s');
        expect(converted.min_idle_session).toBe(5);
    });

    it('normalizes YAML kebab-case duration fields', () => {
        const converted = builder().convertProxy({
            tag: 'anytls-node',
            type: 'anytls',
            server: 'example.com',
            server_port: 443,
            password: 'secret',
            'idle-session-check-interval': 30,
            'idle-session-timeout': 120,
            'min-idle-session': 5,
            tls: { enabled: true }
        });

        expect(converted['idle-session-check-interval']).toBeUndefined();
        expect(converted['idle-session-timeout']).toBeUndefined();
        expect(converted.idle_session_check_interval).toBe('30s');
        expect(converted.idle_session_timeout).toBe('120s');
        expect(converted.min_idle_session).toBe(5);
    });

    it.each([
        ['URI', 'anytls://secret@example.com:443?idle-session-check-interval=30&idle-session-timeout=120&min-idle-session=5#anytls-node'],
        ['YAML', `proxies:
  - name: anytls-node
    type: anytls
    server: example.com
    port: 443
    password: secret
    idle-session-check-interval: 30
    idle-session-timeout: 120
    min-idle-session: 5`]
    ])('builds valid duration fields from %s input', async (_, input) => {
        const instance = new SingboxConfigBuilder(input, [], [], null, 'zh-CN', null);
        const config = await instance.build();
        const proxy = config.outbounds.find(outbound => outbound.type === 'anytls');

        expect(proxy).toMatchObject({
            idle_session_check_interval: '30s',
            idle_session_timeout: '120s',
            min_idle_session: 5,
            tls: { enabled: true }
        });
        expect(proxy).not.toHaveProperty('idle-session-check-interval');
        expect(proxy).not.toHaveProperty('idle-session-timeout');
        expect(proxy).not.toHaveProperty('min-idle-session');
    });

    it('preserves existing sing-box durations and prefers native fields without mutating the source', () => {
        const source = {
            type: 'anytls',
            idle_session_check_interval: '500ms',
            idle_session_timeout: '2m',
            min_idle_session: 0,
            'idle-session-timeout': 120,
            'min-idle-session': 5
        };
        const original = { ...source };
        const converted = builder().convertProxy(source);

        expect(converted.idle_session_check_interval).toBe('500ms');
        expect(converted.idle_session_timeout).toBe('2m');
        expect(converted.min_idle_session).toBe(0);
        expect(source).toEqual(original);
    });
});

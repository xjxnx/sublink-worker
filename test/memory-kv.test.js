import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

describe('MemoryKVAdapter', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps values with TTLs beyond the setTimeout limit', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('k', 'v', { expirationTtl: 60 * 60 * 24 * 30 });

        await vi.advanceTimersByTimeAsync(60 * 1000);
        expect(await kv.get('k')).toBe('v');

        await vi.advanceTimersByTimeAsync(60 * 60 * 24 * 30 * 1000 - 60 * 1000 - 1);
        expect(await kv.get('k')).toBe('v');
        await vi.advanceTimersByTimeAsync(1);
        expect(await kv.get('k')).toBeNull();
    });

    it('expires values after their TTL', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('k', 'v', { expirationTtl: 60 });

        await vi.advanceTimersByTimeAsync(61 * 1000);
        expect(await kv.get('k')).toBeNull();
    });

    it('keeps values without TTL indefinitely', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('k', 'v');

        await vi.advanceTimersByTimeAsync(60 * 60 * 24 * 31 * 1000);
        expect(await kv.get('k')).toBe('v');
    });

    it('does not let a delayed expiration delete a replacement value', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('k', 'old', { expirationTtl: 60 });

        // A blocked event loop or clock change can make reads happen before an overdue timer.
        vi.setSystemTime(Date.now() + 61 * 1000);
        expect(await kv.get('k')).toBeNull();
        await kv.put('k', 'replacement');
        await vi.advanceTimersByTimeAsync(61 * 1000);

        expect(await kv.get('k')).toBe('replacement');
    });

    it('excludes expired keys before applying the list limit', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('log:expired', 'old', { expirationTtl: 60 });
        await kv.put('log:live', 'new');
        vi.setSystemTime(Date.now() + 61 * 1000);

        const result = await kv.list({ prefix: 'log:', limit: 1 });
        expect(result.keys).toEqual([{ name: 'log:live' }]);

        await kv.put('log:expired', 'replacement');
        await vi.advanceTimersByTimeAsync(61 * 1000);
        expect(await kv.get('log:expired')).toBe('replacement');
    });

    it('cancels the previous TTL when a value is replaced or deleted', async () => {
        vi.useFakeTimers();
        const kv = new MemoryKVAdapter();
        await kv.put('k', 'old', { expirationTtl: 60 });
        await kv.put('k', 'new', { expirationTtl: 120 });
        await vi.advanceTimersByTimeAsync(61 * 1000);
        expect(await kv.get('k')).toBe('new');

        await kv.delete('k');
        await kv.put('k', 'permanent');
        await vi.advanceTimersByTimeAsync(120 * 1000);
        expect(await kv.get('k')).toBe('permanent');
    });
});

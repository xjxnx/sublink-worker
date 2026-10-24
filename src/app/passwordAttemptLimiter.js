const MAX_FAILURES = 10;
const LOCK_SECONDS = 24 * 60 * 60;
const MAX_LOCAL_ENTRIES = 1000;

export function createPasswordAttemptLimiter(kv = null) {
    const attempts = new Map();
    const pending = new Map();
    const slotKeys = key => Array.from({ length: MAX_FAILURES }, (_, index) => `${key}:${index + 1}`);

    const check = async (key, verifyPassword) => {
        const now = Date.now();
        for (const [entryKey, entry] of attempts) {
            if (entry.until <= now) attempts.delete(entryKey);
        }
        const keys = slotKeys(key);
        const persisted = kv ? await Promise.all(keys.map(slot => kv.get(slot))) : [];
        const active = [attempts.get(key), ...persisted.map(value => value ? JSON.parse(value) : null)]
            .filter(entry => entry && Number.isInteger(entry.count) && entry.count > 0 && entry.until > now)
            .sort((a, b) => b.count - a.count || b.until - a.until);
        const previous = active[0];
        if (previous?.count >= MAX_FAILURES) return { lockedUntil: previous.until };

        // Evicting live counters would allow traffic from other clients to reset a lockout.
        if (!attempts.has(key) && attempts.size >= MAX_LOCAL_ENTRIES) {
            throw new Error('Password attempt capacity reached');
        }
        if (await verifyPassword()) {
            if (kv) await Promise.all(keys.map(slot => kv.delete(slot)));
            attempts.delete(key);
            return { unlocked: true };
        }

        const next = {
            count: (previous?.count || 0) + 1,
            until: Date.now() + LOCK_SECONDS * 1000
        };
        attempts.set(key, next);
        // Separate slots avoid Cloudflare KV's one-write-per-second limit on a single key.
        if (kv) await kv.put(keys[next.count - 1], JSON.stringify(next), { expirationTtl: LOCK_SECONDS });
        return next.count >= MAX_FAILURES ? { lockedUntil: next.until } : { unlocked: false };
    };

    return async (key, verifyPassword) => {
        const previous = pending.get(key) || Promise.resolve();
        let release;
        const current = new Promise(resolve => { release = resolve; });
        pending.set(key, current);
        await previous;
        try {
            // Password verification must share the lock with the counter update to prevent lost guesses.
            return await check(key, verifyPassword);
        } finally {
            release();
            if (pending.get(key) === current) pending.delete(key);
        }
    };
}

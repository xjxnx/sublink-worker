// setTimeout delays above 2^31-1 ms overflow and fire immediately,
// so long TTLs must be re-armed until their absolute expiry time.
const MAX_TIMEOUT_MS = 0x7fffffff;

export class MemoryKVAdapter {
    constructor() {
        this.store = new Map();
        this.expirations = new Map();
    }

    async get(key) {
        this.cleanExpired(key);
        return this.store.has(key) ? this.store.get(key) : null;
    }

    async put(key, value, options = {}) {
        this.store.set(key, value);
        if (options.expirationTtl) {
            this.scheduleExpiration(key, options.expirationTtl);
        } else {
            this.clearExpiration(key);
        }
    }

    async delete(key) {
        this.store.delete(key);
        this.clearExpiration(key);
    }

    async list(options = {}) {
        const { prefix = '', limit } = options;
        let names = [...this.store.keys()].filter((name) => {
            this.cleanExpired(name);
            return this.store.has(name) && name.startsWith(prefix);
        });
        if (typeof limit === 'number' && limit >= 0) {
            names = names.slice(0, limit);
        }
        return {
            keys: names.map((name) => ({ name })),
            list_complete: true,
            cursor: undefined
        };
    }

    scheduleExpiration(key, ttlSeconds) {
        this.clearExpiration(key);
        const expireAt = Date.now() + ttlSeconds * 1000;
        const arm = () => {
            const remaining = expireAt - Date.now();
            if (remaining <= 0) {
                this.store.delete(key);
                this.expirations.delete(key);
                return;
            }
            this.expirations.set(key, {
                timeoutId: setTimeout(arm, Math.min(remaining, MAX_TIMEOUT_MS)),
                expireAt
            });
        };
        arm();
    }

    clearExpiration(key) {
        const entry = this.expirations.get(key);
        if (entry) {
            clearTimeout(entry.timeoutId);
            this.expirations.delete(key);
        }
    }

    cleanExpired(key) {
        const entry = this.expirations.get(key);
        if (entry && Date.now() >= entry.expireAt) {
            this.store.delete(key);
            // An overdue timer must not delete a later value written under the same key.
            this.clearExpiration(key);
        }
    }
}

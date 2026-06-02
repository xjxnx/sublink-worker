import { MissingDependencyError } from './errors.js';

// Records are prefixed and keyed by zero-padded timestamp so KV's lexicographic
// list order matches chronological order, and they never collide with other keys.
const LOG_PREFIX = 'inlog:';
const TS_WIDTH = 16;
const MAX_SOURCES = 200;
const MAX_SOURCE_LEN = 2048;
// Records auto-expire so the log self-prunes; overridable via INPUT_LOG_TTL_SECONDS.
const DEFAULT_TTL_SECONDS = 40 * 24 * 60 * 60;

export class InputLogService {
    constructor(kv, options = {}) {
        this.kv = kv;
        this.options = options;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Input log service requires a KV store');
        }
        return this.kv;
    }

    async record(payload = {}, context = {}) {
        const kv = this.ensureKv();
        const sources = normalizeSources(payload.input);
        // Nothing meaningful to record without at least one source line.
        if (sources.length === 0) return null;

        const createdAt = Date.now();
        const key = `${LOG_PREFIX}${String(createdAt).padStart(TS_WIDTH, '0')}-${randomSuffix()}`;
        const record = {
            createdAt,
            target: typeof payload.configType === 'string' ? payload.configType : null,
            sources,
            options: sanitizeOptions(payload.options),
            client: {
                ua: context.clientUa || null,
                ip: context.clientIp || null
            }
        };

        const ttl = this.options.inputLogTtlSeconds ?? DEFAULT_TTL_SECONDS;
        const putOptions = ttl ? { expirationTtl: ttl } : undefined;
        await kv.put(key, JSON.stringify(record), putOptions);
        return key;
    }

    async list({ limit = 100 } = {}) {
        const kv = this.ensureKv();
        if (typeof kv.list !== 'function') {
            throw new MissingDependencyError('Current KV store does not support listing input logs');
        }
        // KV returns keys in ascending (oldest-first) lexicographic order and truncates
        // by limit, which would hide the newest records once total > limit. So collect
        // all key names, then keep the newest `limit` ourselves (keys embed padded ts).
        const names = await collectKeyNames(kv, LOG_PREFIX);
        names.sort();
        names.reverse();
        const selected = names.slice(0, limit);
        const entries = [];
        for (const name of selected) {
            const raw = await kv.get(name);
            if (!raw) continue;
            try {
                // Expose the KV key so the UI can target individual records for deletion.
                entries.push({ ...JSON.parse(raw), key: name });
            } catch {
                // Skip malformed records rather than failing the whole listing.
            }
        }
        entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return entries;
    }

    async delete(key) {
        const kv = this.ensureKv();
        // Guard against deleting unrelated keys via a crafted request.
        if (typeof key !== 'string' || !key.startsWith(LOG_PREFIX)) {
            return false;
        }
        await kv.delete(key);
        return true;
    }
}

function normalizeSources(input) {
    if (typeof input !== 'string') return [];
    return input
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_SOURCES)
        .map((line) => (line.length > MAX_SOURCE_LEN ? line.slice(0, MAX_SOURCE_LEN) : line));
}

function sanitizeOptions(options) {
    if (!options || typeof options !== 'object') return {};
    const result = {};
    for (const [key, value] of Object.entries(options)) {
        if (value === undefined || value === null || value === '') continue;
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
}

function randomSuffix() {
    return Math.random().toString(36).slice(2, 8);
}

// Page through KV (names only) so picking the newest records never depends on KV's
// oldest-first truncation. Capped to bound work on very large logs.
async function collectKeyNames(kv, prefix, cap = 5000) {
    const names = [];
    let cursor;
    do {
        const result = await kv.list({ prefix, cursor, limit: 1000 });
        for (const key of result.keys) {
            names.push(key.name);
        }
        cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor && names.length < cap);
    return names;
}

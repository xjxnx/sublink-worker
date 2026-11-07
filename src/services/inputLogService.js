import { MissingDependencyError } from './errors.js';
import { ShortLinkService } from './shortLinkService.js';

// Records are prefixed and keyed by zero-padded timestamp so KV's lexicographic
// list order matches chronological order, and they never collide with other keys.
const LOG_PREFIX = 'inlog:';
const TS_WIDTH = 16;
const MAX_SOURCES = 200;
const MAX_SOURCE_LEN = 2048;
const MAX_OUTPUT_SOURCES = 20;
const MAX_OUTPUT_SOURCE_LEN = 8192;
const OUTPUT_PREFIXES = { '/xray': 'x', '/singbox': 'b', '/clash': 'c', '/surge': 's' };
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
        const originalOutputs = normalizeOutputSources(payload.outputSources);
        const chainSources = typeof payload.chainProxyInput === 'string'
            ? normalizeSources(payload.chainProxyInput)
            : recoverChainSources(originalOutputs);
        const ttl = this.options.inputLogTtlSeconds ?? DEFAULT_TTL_SECONDS;
        const outputSources = await shortenOutputSources(originalOutputs, kv, ttl, context.origin);

        const createdAt = Date.now();
        const key = `${LOG_PREFIX}${String(createdAt).padStart(TS_WIDTH, '0')}-${randomSuffix()}`;
        const record = {
            createdAt,
            target: typeof payload.configType === 'string' ? payload.configType : null,
            sources,
            chainSources,
            outputSources,
            options: sanitizeOptions(payload.options),
            client: {
                ua: context.clientUa || null,
                ip: context.clientIp || null
            }
        };

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
                const record = JSON.parse(raw);
                entries.push({
                    ...record,
                    chainSources: Array.isArray(record.chainSources) ? record.chainSources : recoverChainSources(record.outputSources),
                    key: name
                });
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

function normalizeOutputSources(input) {
    if (!input || typeof input !== 'object') return [];

    const entries = Array.isArray(input)
        ? input.map((item) => [item?.type, item?.url])
        : Object.entries(input);

    return entries
        .map(([type, url]) => ({
            type: typeof type === 'string' ? type.trim().slice(0, 32) : '',
            url: typeof url === 'string' ? url.trim() : ''
        }))
        // Only keep navigable web URLs so public tracking requests cannot plant javascript links in the admin page.
        .filter((entry) => entry.type && isWebUrl(entry.url))
        .slice(0, MAX_OUTPUT_SOURCES);
}

async function shortenOutputSources(outputs, kv, ttl, origin) {
    // Log links must remain usable for as long as their records, regardless of the public short-link TTL.
    const shortLinks = new ShortLinkService(kv, { shortLinkTtlSeconds: ttl });
    const shortCodes = new Map();
    const result = [];
    for (const output of outputs) {
        if (output.url.length <= MAX_OUTPUT_SOURCE_LEN) {
            result.push(output);
            continue;
        }
        const url = new URL(output.url);
        const prefix = OUTPUT_PREFIXES[url.pathname];
        // Existing short routes preserve conversion queries and resolve on the current deployment.
        if (!prefix || url.origin !== origin) continue;
        let code = shortCodes.get(url.search);
        if (!code) {
            code = await shortLinks.createShortLink(url.search);
            shortCodes.set(url.search, code);
        }
        result.push({ type: output.type, url: `${origin}/${prefix}/${code}` });
    }
    return result;
}

function recoverChainSources(outputSources) {
    // Older clients stored chain inputs only inside their generated subscription URLs.
    for (const output of normalizeOutputSources(outputSources)) {
        const params = new URL(output.url).searchParams;
        if (params.get('chain_proxy') === 'true') {
            return normalizeSources(params.get('chain_proxy_input'));
        }
    }
    return [];
}

function isWebUrl(value) {
    try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
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

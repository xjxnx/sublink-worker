import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { createPasswordAttemptLimiter } from './passwordAttemptLimiter.js';

const COOKIE_NAME = 'general_settings_session';
const SESSION_SECONDS = 12 * 60 * 60;
const CONVERSION_PATHS = ['/singbox', '/clash', '/surge', '/xray', '/subconverter'];
const encoder = new TextEncoder();

function usesGeneralSettings(params) {
    return ['group_by_country', 'exclude_invalid_nodes', 'enable_clash_ui', 'multiPort', 'chain_proxy']
        .some(key => params.getAll(key).includes('true')) ||
        params.getAll('include_auto_select').includes('false') ||
        ['external_controller', 'external_ui_download_url', 'basePort', 'count']
            .some(key => params.getAll(key).some(Boolean));
}

function signingPayload(url) {
    const params = new URLSearchParams(url.search);
    params.delete('settings_token');
    params.sort();
    // All output formats share one query in short-link storage.
    return encoder.encode(`general-settings-link:v1:${url.origin}?${params}`);
}

export function registerGeneralSettingsAccess(app, password, kv = null) {
    const enabled = Boolean(password);
    const sessionSecret = `general-settings-session:v1:${password}`;
    let signingKey;
    const getSigningKey = () => signingKey ??= crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );

    const isUnlocked = async (c) => {
        if (!enabled) return true;
        const expiresAt = Number(await getSignedCookie(c, sessionSecret, COOKIE_NAME));
        return Number.isFinite(expiresAt) && expiresAt > Date.now() &&
            expiresAt <= Date.now() + SESSION_SECONDS * 1000;
    };

    const verifyLink = async (url) => {
        const tokens = url.searchParams.getAll('settings_token');
        if (tokens.length !== 1 || !/^[a-f0-9]{64}$/.test(tokens[0])) return false;
        const signature = Uint8Array.from(tokens[0].match(/../g), byte => parseInt(byte, 16));
        return crypto.subtle.verify('HMAC', await getSigningKey(), signature, signingPayload(url));
    };

    for (const path of CONVERSION_PATHS) {
        app.use(path, async (c, next) => {
            if (enabled && usesGeneralSettings(new URL(c.req.url).searchParams)) {
                c.header('Cache-Control', 'private, no-store');
                if (!await verifyLink(new URL(c.req.url))) {
                    return c.text('General settings are locked. Unlock with the password and generate a new subscription link.', 403);
                }
            }
            await next();
        });
    }

    app.use('/general-settings/*', async (c, next) => {
        c.header('Cache-Control', 'private, no-store');
        const origin = c.req.header('Origin');
        if (origin && origin !== new URL(c.req.url).origin) {
            return c.json({ error: 'Forbidden origin' }, 403);
        }
        await next();
    });

    const checkPasswordAttempt = createPasswordAttemptLimiter(kv);
    app.post('/general-settings/unlock', bodyLimit({ maxSize: 4096 }), async (c) => {
        if (!enabled) return c.json({ unlocked: true });
        const client = (c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown').split(',')[0].trim() || 'unknown';
        let provided;
        try {
            provided = (await c.req.json())?.password;
        } catch {
            return c.json({ error: 'Invalid payload' }, 400);
        }
        if (typeof provided !== 'string' || provided.length > 1024) {
            return c.json({ error: 'Invalid payload' }, 400);
        }
        // Keyed hashes keep client IPs and the password out of persisted storage keys.
        const signature = await crypto.subtle.sign('HMAC', await getSigningKey(), encoder.encode(`password-attempt:${client}`));
        const key = 'general-settings-attempt:' + Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
        let result;
        try {
            result = await checkPasswordAttempt(key, async () => {
                const [expected, actual] = await Promise.all([
                    crypto.subtle.digest('SHA-256', encoder.encode(password)),
                    crypto.subtle.digest('SHA-256', encoder.encode(provided))
                ]);
                const actualBytes = new Uint8Array(actual);
                return new Uint8Array(expected).reduce((diff, byte, i) => diff | (byte ^ actualBytes[i]), 0) === 0;
            });
        } catch {
            return c.json({ error: 'Password attempt storage unavailable' }, 503);
        }
        if (result.lockedUntil) {
            const retryAfter = Math.max(1, Math.ceil((result.lockedUntil - Date.now()) / 1000));
            c.header('Retry-After', String(retryAfter));
            return c.json({ error: 'Too many attempts', retryAfter }, 429);
        }
        if (!result.unlocked) {
            return c.json({ error: 'Invalid password' }, 403);
        }
        await setSignedCookie(c, COOKIE_NAME, String(Date.now() + SESSION_SECONDS * 1000), sessionSecret, {
            httpOnly: true,
            secure: new URL(c.req.url).protocol === 'https:',
            sameSite: 'Strict',
            path: '/general-settings',
            maxAge: SESSION_SECONDS
        });
        return c.json({ unlocked: true });
    });

    app.get('/general-settings/session', async (c) => c.json({ unlocked: await isUnlocked(c) }));

    app.delete('/general-settings/session', (c) => {
        deleteCookie(c, COOKIE_NAME, { path: '/general-settings' });
        return c.json({ unlocked: !enabled });
    });

    app.post('/general-settings/sign', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
        if (!await isUnlocked(c)) return c.json({ error: 'General settings are locked' }, 403);
        let url;
        try {
            url = new URL((await c.req.json()).url);
        } catch {
            return c.json({ error: 'Invalid URL' }, 400);
        }
        if (url.origin !== new URL(c.req.url).origin || !CONVERSION_PATHS.includes(url.pathname) || url.username || url.password) {
            return c.json({ error: 'Invalid subscription URL' }, 400);
        }
        url.searchParams.delete('settings_token');
        if (enabled && usesGeneralSettings(url.searchParams)) {
            const signature = await crypto.subtle.sign('HMAC', await getSigningKey(), signingPayload(url));
            url.searchParams.set('settings_token', Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join(''));
        }
        return c.json({ url: url.toString() });
    });

    return { enabled };
}

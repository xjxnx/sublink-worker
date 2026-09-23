import { CloudflareKVAdapter } from '../adapters/kv/cloudflareKv.js';

export function createCloudflareRuntime(env) {
    return {
        kv: env?.SUBLINK_KV ? new CloudflareKVAdapter(env.SUBLINK_KV) : null,
        assetFetcher: env?.ASSETS ? (request) => env.ASSETS.fetch(request) : null,
        logger: console,
        config: {
            forceHttps: env?.FORCE_HTTPS !== 'false',
            adminToken: env?.ADMIN_TOKEN || null,
            generalSettingsPassword: env?.GENERAL_SETTINGS_PASSWORD || null
        }
    };
}

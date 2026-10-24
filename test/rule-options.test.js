import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { RULE_OPTIONS, UNIFIED_RULES, PREDEFINED_RULE_SETS, getOutbounds, generateRules } from '../src/config/index.js';
import { createTranslator } from '../src/i18n/index.js';

const services = ['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'];
const children = services.map(service => `Social Media:${service}`);
const input = 'ss://YWVzLTEyOC1nY206dGVzdA@node.example:443#Test';
const app = createApp({ kv: new MemoryKVAdapter(), logger: console });
const request = (target, selectedRules, extra = {}) => app.request(`http://localhost/${target}?${new URLSearchParams({
    config: input, selectedRules: JSON.stringify(selectedRules), lang: 'zh-CN', ...extra
})}`);

describe('individual services in rule categories', () => {
    const cases = [
        { mode: 'category', selected: ['Social Media'], services, grouped: true },
        { mode: 'one service', selected: [children[0]], services: ['facebook'], grouped: false },
        { mode: 'a subset', selected: [children[0], children[2]], services: ['facebook', 'twitter'], grouped: false },
        { mode: 'all individual services', selected: children, services, grouped: false },
        { mode: 'conflicting category and children', selected: ['Social Media', ...children], services, grouped: true }
    ];

    it.each(cases)('creates matching Clash groups, rules and providers for $mode', async entry => {
        const response = await request('clash', entry.selected);
        expect(response.status).toBe(200);
        const config = yaml.load(await response.text());
        const groupNames = config['proxy-groups'].map(group => group.name);
        const socialRules = config.rules.filter(rule => services.some(service => rule.startsWith(`RULE-SET,${service},`)));
        expect(socialRules).toHaveLength(entry.services.length);
        expect(groupNames.includes('🌐 社交媒体')).toBe(entry.grouped);
        for (const service of services) {
            const selected = entry.services.includes(service);
            const groupName = entry.grouped ? '🌐 社交媒体' : `🌐${service}`;
            expect(Object.hasOwn(config['rule-providers'], service)).toBe(selected);
            expect(config.rules.includes(`RULE-SET,${service},${groupName}`)).toBe(selected);
            expect(groupNames.includes(`🌐${service}`)).toBe(selected && !entry.grouped);
            if (selected) expect(config['proxy-groups'].find(group => group.name === groupName).type).toBe('select');
        }
    });

    it('supports partial selections with legacy Clash YAML providers', async () => {
        const response = await request('clash', [children[0]], { ua: 'Clash/1.18.0' });
        const config = yaml.load(await response.text());
        expect(config['rule-providers'].facebook.url).toMatch(/facebook\.yaml$/);
        expect(config['rule-providers'].instagram).toBeUndefined();
    });

    it.each(cases)('creates matching Sing-Box outbounds, routes and rule sets for $mode', async entry => {
        const response = await request('singbox', entry.selected);
        expect(response.status).toBe(200);
        const config = await response.json();
        const tags = config.outbounds.map(outbound => outbound.tag);
        expect(tags.includes('🌐 社交媒体')).toBe(entry.grouped);
        for (const service of services) {
            const selected = entry.services.includes(service);
            const groupName = entry.grouped ? '🌐 社交媒体' : `🌐${service}`;
            expect(config.route.rule_set.some(ruleSet => ruleSet.tag === service)).toBe(selected);
            expect(config.route.rules.some(rule => rule.rule_set?.includes(service) && rule.outbound === groupName)).toBe(selected);
            expect(tags.includes(`🌐${service}`)).toBe(selected && !entry.grouped);
        }
    });

    it.each(['surge', 'subconverter'])('uses independent services in %s output', async target => {
        const response = await request(target, [children[0], children[2]]);
        expect(response.status).toBe(200);
        const text = await response.text();
        for (const service of ['facebook', 'twitter']) {
            expect(text).toContain(`🌐${service}`);
            if (target === 'subconverter') {
                expect(text).toContain(`ruleset=🌐${service},[]GEOSITE,${service}`);
                expect(text).toContain(`custom_proxy_group=🌐${service}\`select`);
            } else {
                expect(text).toContain(`🌐${service} = select`);
                expect(text).toContain(`/${service}.conf,🌐${service}`);
            }
        }
        expect(text).not.toContain('🌐 社交媒体');
        expect(text).not.toContain('instagram');
    });

    it('keeps preset category grouping and rejects unknown child IDs', () => {
        for (const preset of Object.keys(PREDEFINED_RULE_SETS)) {
            const outbounds = generateRules(preset).map(rule => rule.outbound);
            expect(outbounds).toEqual(UNIFIED_RULES.filter(rule => PREDEFINED_RULE_SETS[preset].includes(rule.name)).map(rule => rule.name));
        }
        const selected = ['Social Media:not-real', 'Social Media:../secret', children[0], children[0]];
        expect(getOutbounds(selected)).toEqual([children[0]]);
        expect(generateRules(selected).map(rule => rule.site_rules)).toEqual([['facebook']]);
    });

    it('supports individual services only in the four enabled categories', () => {
        expect(Object.keys(RULE_OPTIONS)).toEqual(['Social Media', 'Streaming', 'Gaming', 'Cryptocurrency']);
        expect(generateRules(['Streaming:netflix', 'Gaming:steam', 'Cryptocurrency:binance'])).toMatchObject([
            { outbound: 'Streaming:netflix', site_rules: ['netflix'] },
            { outbound: 'Gaming:steam', site_rules: ['steam'] },
            { outbound: 'Cryptocurrency:binance', site_rules: ['binance'] }
        ]);
        const groupedCategories = ['Github', 'Education', 'Financial', 'Cloud Services', 'Location:CN'];
        expect(getOutbounds(groupedCategories)).toHaveLength(groupedCategories.length);
        expect(generateRules(['Github:github', 'Education:coursera', 'Financial:paypal', 'Cloud Services:aws'])).toEqual([]);
    });

    it.each(['zh-CN', 'en-US', 'fa', 'ru'])('uses consistent service group names in %s', lang => {
        expect(createTranslator(lang)(`outboundNames.${children[0]}`)).toBe('🌐facebook');
    });
});

import { describe, expect, it } from 'vitest';
import {
    generateClashRuleSets,
    generateRuleSets,
    generateRules
} from '../src/config/ruleGenerators.js';

describe('custom rule identifier sanitization', () => {
    const customRules = [{
        name: 'Custom',
        site: ['valid-site', '../escape', 'https://attacker.example/rules', 'valid.site'],
        ip: ['valid_ip', '../../escape', '10.0.0.1/32']
    }];

    it('keeps safe identifiers in generated rules and rejects unsafe identifiers', () => {
        const rules = generateRules('minimal', customRules);

        expect(rules[0].site_rules).toEqual(['valid-site', 'valid.site']);
        expect(rules[0].ip_rules).toEqual(['valid_ip']);
    });

    it('does not create remote rule-set URLs from unsafe identifiers', () => {
        const { site_rule_sets, ip_rule_sets } = generateRuleSets([], customRules);
        const { site_rule_providers, ip_rule_providers } = generateClashRuleSets([], customRules);

        expect(site_rule_sets.some(item => item.tag === 'valid-site')).toBe(true);
        expect(site_rule_sets.some(item => item.tag === 'valid.site')).toBe(true);
        expect(site_rule_sets.some(item => item.tag.includes('escape'))).toBe(false);
        expect(ip_rule_sets.some(item => item.tag === 'valid_ip-ip')).toBe(true);
        expect(ip_rule_sets.some(item => item.tag.includes('escape'))).toBe(false);

        expect(site_rule_providers['valid-site']).toBeDefined();
        expect(site_rule_providers['valid.site']).toBeDefined();
        expect(site_rule_providers['../escape']).toBeUndefined();
        expect(ip_rule_providers['valid_ip-ip']).toBeDefined();
        expect(ip_rule_providers['../../escape-ip']).toBeUndefined();
    });

    it('preserves geosite exclusions and attribute names in custom rules', () => {
        const identifiers = ['geolocation-!cn', 'google@cn', 'category-ai-!cn'];
        const custom = [{ name: 'Custom', site: identifiers }];
        const rules = generateRules('minimal', custom);
        const { site_rule_sets } = generateRuleSets([], custom);
        const { site_rule_providers } = generateClashRuleSets([], custom);

        expect(rules[0].site_rules).toEqual(identifiers);
        for (const id of identifiers) {
            expect(site_rule_sets.some(rule => rule.tag === id && rule.url.endsWith(`/${id}.srs`))).toBe(true);
            expect(site_rule_providers[id].url).toMatch(new RegExp(`/${id}\\.mrs$`));
        }
    });

    it('does not change caller order across repeated rule generation', () => {
        const custom = [
            { name: 'First', site: ['google'] },
            { name: 'Second', site: ['github'] }
        ];
        const first = generateRules('minimal', custom);
        const second = generateRules('minimal', custom);

        expect(custom.map(rule => rule.name)).toEqual(['First', 'Second']);
        expect(first).toEqual(second);
        expect(first.slice(0, 2).map(rule => rule.outbound)).toEqual(['First', 'Second']);
    });

    it('rejects encoded traversal, separators, query strings and fragments', () => {
        const unsafe = ['%2e%2e%2fescape', '..\\escape', 'google?x=1', 'google#fragment', '//example.com', 'x/../y', 'a..b'];
        const custom = [{ name: 'Custom', site: unsafe, ip: unsafe }];
        const rules = generateRules('minimal', custom);
        expect(rules[0].site_rules).toEqual([]);
        expect(rules[0].ip_rules).toEqual([]);
        expect(generateRuleSets([], custom)).toEqual(generateRuleSets([], []));
        expect(generateClashRuleSets([], custom)).toEqual(generateClashRuleSets([], []));
    });
});

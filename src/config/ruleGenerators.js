/**
 * Rule Generators
 * Functions for generating rules and rule sets
 */

import { UNIFIED_RULES, RULE_OPTIONS, PREDEFINED_RULE_SETS, SITE_RULE_SETS, IP_RULE_SETS } from './rules.js';
import { SITE_RULE_SET_BASE_URL, IP_RULE_SET_BASE_URL, CLASH_SITE_RULE_SET_BASE_URL, CLASH_IP_RULE_SET_BASE_URL } from './ruleUrls.js';

function toStringArray(value) {
	if (Array.isArray(value)) {
		return value
			.filter(x => typeof x === 'string').map(x => x.trim())
			.filter(Boolean);
	}
	if (typeof value === 'string') {
		return value.split(',').map(x => x.trim()).filter(Boolean);
	}
	return [];
}

// Rule identifiers become part of remote rule-set URLs, so reject path and URL control characters.
// Geosite names also use ! for exclusions and @ for attributes.
const SAFE_RULE_ID_RE = /^[A-Za-z0-9_!@-]+(?:\.[A-Za-z0-9_!@-]+)*$/;

function sanitizeRuleIds(values) {
	return toStringArray(values).filter(value => SAFE_RULE_ID_RE.test(value));
}

function resolveSelectedRuleDefinitions(selectedRules) {
	if (typeof selectedRules === 'string' && Object.hasOwn(PREDEFINED_RULE_SETS, selectedRules)) {
		selectedRules = PREDEFINED_RULE_SETS[selectedRules];
	}
	if (!Array.isArray(selectedRules) || selectedRules.length === 0) {
		selectedRules = PREDEFINED_RULE_SETS.minimal;
	}
	const selected = new Set(selectedRules);
	return UNIFIED_RULES.flatMap(rule => {
		// A category selection takes precedence over stale or conflicting child selections.
		if (selected.has(rule.name)) return [rule];
		return (RULE_OPTIONS[rule.name] || []).filter(option => selected.has(option.name));
	});
}

// Helper function to get outbounds based on selected rule names
export function getOutbounds(selectedRuleNames) {
	if (!Array.isArray(selectedRuleNames) || selectedRuleNames.length === 0) {
		return [];
	}
	return resolveSelectedRuleDefinitions(selectedRuleNames).map(rule => rule.name);
}

// Helper function to generate rules based on selected rule names
export function generateRules(selectedRules = [], customRules = []) {
	const rules = resolveSelectedRuleDefinitions(selectedRules).map(rule => ({
		site_rules: rule.site_rules,
		ip_rules: rule.ip_rules,
		domain_suffix: rule?.domain_suffix,
		ip_cidr: rule?.ip_cidr,
		outbound: rule.name
	}));

	// Builders reuse this array, so generating rules must not change their priority order.
	customRules.slice().reverse().forEach((rule) => {
		rules.unshift({
			site_rules: sanitizeRuleIds(rule.site),
			ip_rules: sanitizeRuleIds(rule.ip),
			domain_suffix: toStringArray(rule.domain_suffix),
			domain_keyword: toStringArray(rule.domain_keyword),
			ip_cidr: toStringArray(rule.ip_cidr),
			src_ip_cidr: toStringArray(rule.src_ip_cidr),
			protocol: toStringArray(rule.protocol),
			outbound: rule.name
		});
	});

	return rules;
}

export function generateRuleSets(selectedRules = [], customRules = []) {
	const ruleDefinitions = resolveSelectedRuleDefinitions(selectedRules);

	const siteRuleSets = new Set();
	const ipRuleSets = new Set();

	const ruleSets = [];

	ruleDefinitions.forEach(rule => {
		rule.site_rules.forEach(siteRule => siteRuleSets.add(siteRule));
		rule.ip_rules.forEach(ipRule => ipRuleSets.add(ipRule));
	});

	const site_rule_sets = Array.from(siteRuleSets).map(rule => ({
		tag: rule,
		type: 'remote',
		format: 'binary',
		url: `${SITE_RULE_SET_BASE_URL}${SITE_RULE_SETS[rule]}`,
	}));

	const ip_rule_sets = Array.from(ipRuleSets).map(rule => ({
		tag: `${rule}-ip`,
		type: 'remote',
		format: 'binary',
		url: `${IP_RULE_SET_BASE_URL}${IP_RULE_SETS[rule]}`,
	}));

	if (!ruleDefinitions.some(rule => rule.name === 'Non-China')) {
		site_rule_sets.push({
			tag: 'geolocation-!cn',
			type: 'remote',
			format: 'binary',
			url: `${SITE_RULE_SET_BASE_URL}geolocation-!cn.srs`,
		});
	}

	if (customRules) {
		customRules.forEach(rule => {
			sanitizeRuleIds(rule.site).forEach(site => {
				site_rule_sets.push({
					tag: site,
					type: 'remote',
					format: 'binary',
					url: `${SITE_RULE_SET_BASE_URL}${site}.srs`,
				});
			});
			sanitizeRuleIds(rule.ip).forEach(ip => {
				ip_rule_sets.push({
					tag: `${ip}-ip`,
					type: 'remote',
					format: 'binary',
					url: `${IP_RULE_SET_BASE_URL}${ip}.srs`,
				});
			});
		});
	}

	ruleSets.push(...site_rule_sets, ...ip_rule_sets);

	return { site_rule_sets, ip_rule_sets };
}

// Generate rule sets for Clash using .mrs format
export function generateClashRuleSets(selectedRules = [], customRules = [], useMrs = true) {
	const ruleDefinitions = resolveSelectedRuleDefinitions(selectedRules);

	// Determine format based on client compatibility
	const format = useMrs ? 'mrs' : 'yaml';
	const ext = useMrs ? '.mrs' : '.yaml';

	const siteRuleSets = new Set();
	const ipRuleSets = new Set();

	ruleDefinitions.forEach(rule => {
		rule.site_rules.forEach(siteRule => siteRuleSets.add(siteRule));
		rule.ip_rules.forEach(ipRule => ipRuleSets.add(ipRule));
	});

	const site_rule_providers = {};
	const ip_rule_providers = {};

	Array.from(siteRuleSets).forEach(rule => {
		site_rule_providers[rule] = {
			type: 'http',
			format: format,
			behavior: 'domain',
			url: `${CLASH_SITE_RULE_SET_BASE_URL}${rule}${ext}`,
			path: `./ruleset/${rule}${ext}`,
			interval: 86400
		};
	});

	Array.from(ipRuleSets).forEach(rule => {
		ip_rule_providers[`${rule}-ip`] = {
			type: 'http',
			format: format,
			behavior: 'ipcidr',
			url: `${CLASH_IP_RULE_SET_BASE_URL}${rule}${ext}`,
			path: `./ruleset/${rule}-ip${ext}`,
			interval: 86400
		};
	});

	// Add Non-China rule set if not included
	if (!ruleDefinitions.some(rule => rule.name === 'Non-China')) {
		site_rule_providers['geolocation-!cn'] = {
			type: 'http',
			format: format,
			behavior: 'domain',
			url: `${CLASH_SITE_RULE_SET_BASE_URL}geolocation-!cn${ext}`,
			path: `./ruleset/geolocation-!cn${ext}`,
			interval: 86400
		};
	}

	// Add custom rules
	if (customRules) {
		customRules.forEach(rule => {
			sanitizeRuleIds(rule.site).forEach(site => {
				site_rule_providers[site] = {
					type: 'http',
					format: format,
					behavior: 'domain',
					url: `${CLASH_SITE_RULE_SET_BASE_URL}${site}${ext}`,
					path: `./ruleset/${site}${ext}`,
					interval: 86400
				};
			});
			sanitizeRuleIds(rule.ip).forEach(ip => {
				ip_rule_providers[`${ip}-ip`] = {
					type: 'http',
					format: format,
					behavior: 'ipcidr',
					url: `${CLASH_IP_RULE_SET_BASE_URL}${ip}${ext}`,
					path: `./ruleset/${ip}-ip${ext}`,
					interval: 86400
				};
			});
		});
	}

	return { site_rule_providers, ip_rule_providers };
}

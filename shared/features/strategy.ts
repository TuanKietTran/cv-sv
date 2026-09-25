export type FeatureName = "authenticated";

export interface FeatureRule {
   name: FeatureName;
   routes: readonly string[];
   disabledHosts: readonly string[];
}

export interface FeatureContext {
   hostname: string;
   pathname?: string;
}

const normalizeHostname = (hostname: string) => hostname.trim().toLowerCase().replace(/\.$/, "");

/** Match exact hosts and wildcard subdomains. `*.example.com` does not match the apex. */
export function hostMatches(pattern: string, hostname: string): boolean {
   const expected = normalizeHostname(pattern);
   const actual = normalizeHostname(hostname);
   if (!expected || !actual) return false;
   if (!expected.startsWith("*.")) return actual === expected;

   const suffix = expected.slice(1);
   return actual.endsWith(suffix) && actual.length > suffix.length;
}

/** Route patterns are exact unless they end in `/**`, which includes the prefix itself. */
export function routeMatches(pattern: string, pathname: string): boolean {
   if (!pattern.endsWith("/**")) return pathname === pattern;
   const prefix = pattern.slice(0, -3).replace(/\/$/, "");
   return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function parsePatterns(value: string | undefined): readonly string[] {
   if (value === undefined) return [];
   return value.split(",").map(pattern => pattern.trim()).filter(Boolean);
}

export function isFeatureEnabled(
   rule: FeatureRule,
   context: FeatureContext,
   disabledHosts: readonly string[] = rule.disabledHosts,
): boolean {
   return !disabledHosts.some(pattern => hostMatches(pattern, context.hostname));
}

export function ruleForRoute(rules: readonly FeatureRule[], pathname: string): FeatureRule | undefined {
   return rules.find(rule => rule.routes.some(pattern => routeMatches(pattern, pathname)));
}

export function isRouteEnabled(
   rules: readonly FeatureRule[],
   context: Required<FeatureContext>,
   disabledHosts?: Readonly<Partial<Record<FeatureName, readonly string[]>>>,
): boolean {
   const rule = ruleForRoute(rules, context.pathname);
   return !rule || isFeatureEnabled(rule, context, disabledHosts?.[rule.name]);
}

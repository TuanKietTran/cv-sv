import type { FeatureRule } from "./strategy";

/** Build the optional authentication module from deployment-owned configuration. */
export function createAuthenticatedFeature(
   routes: readonly string[],
   disabledHosts: readonly string[],
): FeatureRule {
   return Object.freeze({
      name: "authenticated",
      routes: Object.freeze([...routes]),
      disabledHosts: Object.freeze([...disabledHosts]),
   });
}

import type { H3Event } from "h3";
import { normalizeAdminOrigin } from "../lib/oauth";

/** Production validates adminOrigin at startup; request-derived fallback is development-only. */
export function getAdminOrigin(event: H3Event): string {
   const configured = normalizeAdminOrigin(useRuntimeConfig(event).adminOrigin);
   if (configured) return configured;
   return getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
}

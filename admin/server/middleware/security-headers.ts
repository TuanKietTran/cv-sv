/** Admin responses are private and must never be embedded or cached by a shared proxy. */
export default defineEventHandler((event) => {
   setResponseHeader(event, "x-content-type-options", "nosniff");
   setResponseHeader(event, "x-frame-options", "DENY");
   setResponseHeader(event, "referrer-policy", "no-referrer");
   setResponseHeader(event, "x-robots-tag", "noindex, nofollow, noarchive");
   setResponseHeader(event, "permissions-policy", "camera=(), microphone=(), geolocation=()");
   setResponseHeader(event, "content-security-policy", "frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
   if (!event.path.startsWith("/_nuxt/")) {
      setResponseHeader(event, "cache-control", "private, no-store");
   }
});

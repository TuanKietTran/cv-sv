import { validateAdminProductionAuth } from "../lib/admin-env";

/** Refuse to serve a built admin app with unsafe or ambiguous authentication settings. */
export default defineNitroPlugin(() => {
   if (import.meta.dev) return;
   const config = useRuntimeConfig();
   const problems = validateAdminProductionAuth(config);
   if (problems.length) throw new Error(`Invalid admin environment: ${problems.join("; ")}`);
});

/** Navigation convenience only; admin-guard.ts enforces the allowlist on every API call. */
export default defineNuxtRouteMiddleware(async (to) => {
   const { user, fetchMe } = useAdmin();
   if (to.path === "/oauth/github") return;
   if (to.path === "/login") {
      if (!user.value && !(await fetchMe())) return;
      return navigateTo("/");
   }
   if (user.value || await fetchMe()) return;
   return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
});

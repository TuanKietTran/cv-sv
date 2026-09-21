const PROTECTED = ["/d", "/settings"];

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.public) return;

  if (PROTECTED.some((prefix) => to.path.startsWith(prefix))) {
    const userId = to.query.userId as string | undefined;
    if (to.path.startsWith("/d") && userId === "demo") return;

    const { user } = useAppAuth();
    if (!user.value) {
      return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
    }
  }
});

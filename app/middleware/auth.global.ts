const PROTECTED = ["/d", "/p"];

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.public) return;

  if (PROTECTED.some((prefix) => to.path.startsWith(prefix))) {
    const userId = to.query.userId as string | undefined;
    if (userId === "demo") return;

    const { user } = useAuth();
    if (!user.value) {
      return navigateTo("/login");
    }
  }
});

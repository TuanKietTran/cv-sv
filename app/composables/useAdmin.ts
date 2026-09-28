import type { AdminUser } from "~~/server/utils/admin-session";

export function useAdmin() {
   const user = useState<AdminUser | null>("admin:user", () => null);

   const fetchMe = async () => {
      try {
         user.value = await useRequestFetch()<AdminUser>("/api/me");
      } catch {
         user.value = null;
      }
      return user.value;
   };

   const logout = async () => {
      await $fetch("/api/logout", { method: "POST" });
      user.value = null;
      await navigateTo("/login");
   };

   return { user: readonly(user), fetchMe, logout };
}

<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const messages: Record<string, string> = {
   forbidden: "This GitHub account is not allowed to use the admin dashboard.",
   denied: "GitHub sign-in was cancelled.",
   state: "The sign-in attempt expired or was tampered with. Try again.",
   exchange: "GitHub did not accept the sign-in. Try again.",
};
const routeError = computed(() => messages[String(route.query.error ?? "")] ?? "");
const requestError = ref("");
const pending = ref(false);
const redirect = computed(() => {
   const candidate = typeof route.query.redirect === "string" ? route.query.redirect : "/";
   const path = candidate.split(/[?#]/, 1)[0]!.replace(/\/+$/, "") || "/";
   return candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")
      && path !== "/login" && path !== "/oauth/github" && !path.startsWith("/api/") && !path.startsWith("/auth/")
      ? candidate
      : "/";
});
const signIn = async () => {
   pending.value = true;
   requestError.value = "";
   try {
      const result = await $fetch<{ authorizeUrl: string }>("/api/oauth/github", {
         query: { redirect: redirect.value },
      });
      window.location.assign(result.authorizeUrl);
   } catch {
      requestError.value = "GitHub sign-in is unavailable. Check the OAuth configuration.";
      pending.value = false;
   }
};
</script>

<template>
   <div class="login">
      <div class="card">
         <h1>ruxt admin</h1>
         <p class="muted">Restricted to allowlisted GitHub accounts.</p>
         <p v-if="routeError || requestError" class="error" role="alert">{{ routeError || requestError }}</p>
         <button type="button" class="btn btn-primary" :disabled="pending" @click="signIn">
            {{ pending ? "Connecting…" : "Sign in with GitHub" }}
         </button>
      </div>
   </div>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.card { width: min(380px, 100%); display: grid; gap: 12px; text-align: center; padding: 32px; }
h1 { margin: 0; font-size: 20px; }
p { margin: 0; }
.btn { justify-content: center; padding: 10px; }
</style>

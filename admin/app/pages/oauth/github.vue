<script setup lang="ts">
definePageMeta({ layout: false });

const route = useRoute();
const message = ref("Completing GitHub sign-in…");

onMounted(async () => {
   if (typeof route.query.code !== "string" && typeof route.query.error !== "string") {
      await navigateTo("/login?error=state", { replace: true });
      return;
   }
   try {
      const result = await $fetch<{ redirect: string }>("/api/oauth/github", {
         query: {
            code: typeof route.query.code === "string" ? route.query.code : undefined,
            state: typeof route.query.state === "string" ? route.query.state : undefined,
            error: typeof route.query.error === "string" ? route.query.error : undefined,
         },
         retry: 0,
      });
      await navigateTo(result.redirect, { replace: true });
   } catch {
      message.value = "GitHub sign-in could not be completed.";
      await navigateTo("/login?error=exchange", { replace: true });
   }
});
</script>

<template>
   <div class="callback" role="status">{{ message }}</div>
</template>

<style scoped>
.callback { min-height: 100vh; display: grid; place-items: center; color: var(--muted); }
</style>

<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage :page-key="route.fullPath" />
    </NuxtLayout>
    <AuthDialog />
  </div>
</template>

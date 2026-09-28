<script setup lang="ts">
const { user, logout } = useAdmin();
const nav = [
   { to: "/", label: "Analytics" },
   { to: "/jobs", label: "Jobs" },
   { to: "/templates", label: "Templates" },
];
</script>

<template>
   <div class="layout">
      <header class="header">
         <div class="header-inner">
            <NuxtLink to="/" class="logo">ruxt <span>admin</span></NuxtLink>
            <nav class="nav" aria-label="Admin">
               <NuxtLink
                  v-for="item in nav"
                  :key="item.to"
                  :to="item.to"
                  class="nav-link"
                  :class="{ active: item.to === '/' ? $route.path === '/' : $route.path.startsWith(item.to) }"
               >
                  {{ item.label }}
               </NuxtLink>
            </nav>
            <div v-if="user" class="who">
               <img :src="user.avatarUrl" alt="" width="24" height="24">
               <span>{{ user.login }}</span>
               <button class="btn" type="button" @click="logout">Sign out</button>
            </div>
         </div>
      </header>
      <main>
         <slot />
      </main>
   </div>
</template>

<style scoped>
.header { position: sticky; top: 0; z-index: 10; background: var(--bg-mantle); border-bottom: 1px solid var(--border); }
.header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 52px; display: flex; align-items: center; gap: 28px; }
.logo { color: var(--fg-text); font-weight: 700; font-size: 16px; }
.logo span { color: var(--accent); }
.nav { display: flex; gap: 4px; flex: 1; }
.nav-link { padding: 5px 12px; border-radius: var(--radius-sm); color: var(--fg-subtext0); font-weight: 500; }
.nav-link:hover, .nav-link.active { color: var(--fg-text); background: var(--bg-surface0); }
.who { display: flex; align-items: center; gap: 10px; color: var(--fg-subtext0); font-size: 13px; }
.who img { border-radius: 50%; }
</style>

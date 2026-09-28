<script setup lang="ts">
import type { TemplateSummary } from "~~/server/lib/templates";

const { data, error, refresh } = await useFetch<{ templates: TemplateSummary[] }>("/api/templates");
const catalog = computed(() => (data.value?.templates ?? []).filter(template => !template.local));
const localCount = computed(() => (data.value?.templates ?? []).filter(template => template.local).length);
</script>

<template>
   <div class="page">
      <header class="page-header">
         <div>
            <h1>Public templates</h1>
            <p>Publish one version per template to ruxt's public catalog. Every edit saves a new immutable version.</p>
         </div>
         <NuxtLink class="btn btn-primary" to="/templates/new">New template</NuxtLink>
      </header>

      <p v-if="error" class="error" role="alert">{{ errorMessage(error, "Templates could not be loaded.") }}</p>

      <section class="card">
         <table v-if="catalog.length">
            <thead>
               <tr><th>Template</th><th>Status</th><th class="num">Latest</th><th>Tags</th><th /></tr>
            </thead>
            <tbody>
               <tr v-for="template in catalog" :key="template.id">
                  <td>
                     <NuxtLink :to="`/templates/${template.id}`">{{ template.name }}</NuxtLink>
                     <div class="muted"><code>{{ template.id }}</code></div>
                  </td>
                  <td>
                     <span v-if="template.internal" class="badge">internal</span>
                     <span v-else-if="template.publishedVersion" class="badge green">public · v{{ template.publishedVersion }}</span>
                     <span v-else class="badge yellow">unpublished</span>
                     <span v-if="template.builtIn" class="badge">built-in</span>
                     <span v-if="template.publishedVersion && template.publishedVersion < template.latestVersion" class="badge blue">newer draft</span>
                  </td>
                  <td class="num">v{{ template.latestVersion }}</td>
                  <td><span v-for="tag in template.tags" :key="tag" class="badge">{{ tag }}</span></td>
                  <td class="num"><NuxtLink :to="`/templates/${template.id}`" class="btn">Manage</NuxtLink></td>
               </tr>
            </tbody>
         </table>
         <p v-else class="empty">No catalog templates yet.</p>
         <p v-if="localCount" class="muted">{{ localCount }} user-local template(s) hidden; users manage those in the CV editor.</p>
      </section>
      <button class="btn refresh" type="button" @click="refresh()">Refresh</button>
   </div>
</template>

<style scoped>
.badge { margin-right: 4px; }
.refresh { justify-self: start; }
</style>

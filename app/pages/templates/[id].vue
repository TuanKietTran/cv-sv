<script setup lang="ts">
import type { CvTemplateProps } from "@core/domain/cv/types";
import type { TemplateSummary } from "~~/server/lib/templates";
import { createTemplateDraft } from "~/utils/template-draft";

const route = useRoute();
const id = computed(() => String(route.params.id));
const { data: index, refresh: refreshIndex } = await useFetch<{ templates: TemplateSummary[] }>("/api/templates");
const summary = computed(() => index.value?.templates.find(template => template.id === id.value));
const selectedVersion = ref<number | undefined>();
const { data: template, error: loadError, refresh: refreshTemplate } = await useFetch<CvTemplateProps>(
   () => `/api/templates/${encodeURIComponent(id.value)}`,
   { query: computed(() => selectedVersion.value ? { version: selectedVersion.value } : {}) },
);

const draft = ref(createTemplateDraft({ id: id.value }));
const baseline = ref("");
const reset = () => {
   const current = template.value;
   if (!current) return;
   draft.value = createTemplateDraft({
      id: current.id,
      name: current.name,
      markdownSkeleton: current.markdownSkeleton,
      css: current.css,
      tags: current.tags.filter(tag => tag !== "public" && tag !== "local").join(", "),
      pageFormats: current.capabilities.pageFormats.join(", "),
      supportsPhoto: current.capabilities.supportsPhoto,
      atsFriendly: current.capabilities.atsFriendly,
   });
   baseline.value = JSON.stringify(draft.value);
};
watch(template, reset, { immediate: true });
const dirty = computed(() => Boolean(baseline.value) && JSON.stringify(draft.value) !== baseline.value);
const editable = computed(() => Boolean(summary.value && !summary.value.local));
const currentVersionNumber = computed(() => template.value?.version ?? 0);
const currentVersion = computed(() => summary.value?.versions.find(item => item.version === currentVersionNumber.value));
const busy = ref(false);
const message = ref("");
const failure = ref("");
const list = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

async function run(action: () => Promise<void>, success: string) {
   busy.value = true;
   failure.value = "";
   message.value = "";
   try {
      await action();
      message.value = success;
   } catch (error) {
      failure.value = errorMessage(error, "The change could not be saved.");
   } finally {
      busy.value = false;
   }
}

const saveVersion = () => run(async () => {
   const saved = await $fetch<CvTemplateProps>(`/api/templates/${encodeURIComponent(id.value)}/versions`, {
      method: "POST",
      body: {
         name: draft.value.name,
         markdownSkeleton: draft.value.markdownSkeleton,
         css: draft.value.css,
         tags: list(draft.value.tags),
         capabilities: {
            pageFormats: list(draft.value.pageFormats),
            supportsPhoto: draft.value.supportsPhoto,
            atsFriendly: draft.value.atsFriendly,
         },
      },
   });
   selectedVersion.value = saved.version;
   await Promise.all([refreshIndex(), refreshTemplate()]);
}, "Saved as a new unpublished version.");

const setPublished = (version: number, published: boolean) => run(async () => {
   await $fetch(`/api/templates/${encodeURIComponent(id.value)}/versions/${version}/publish`, { method: "PUT", body: { published } });
   await Promise.all([refreshIndex(), refreshTemplate()]);
}, published ? `v${version} is now public.` : `v${version} was unpublished.`);

const removeVersion = (version: number) => {
   if (!confirm(`Delete v${version} of ${id.value}? This cannot be undone.`)) return;
   return run(async () => {
      await $fetch(`/api/templates/${encodeURIComponent(id.value)}/versions/${version}`, { method: "DELETE" });
      if (selectedVersion.value === version) selectedVersion.value = undefined;
      await Promise.all([refreshIndex(), refreshTemplate()]);
      if (!summary.value) await navigateTo("/templates");
   }, `v${version} deleted.`);
};
</script>

<template>
   <div v-if="summary && template">
      <TemplateEditorWorkspace
         v-model="draft"
         :heading="summary.name"
         :version="template.version"
         :save-label="`Save as v${summary.latestVersion + 1}`"
         :busy="busy"
         :can-edit="editable"
         :dirty="dirty"
         :message="message"
         :error="failure || (loadError ? errorMessage(loadError, 'Template could not be loaded.') : '')"
         @save="saveVersion"
         @reset="reset"
      >
         <template #versions>
            <section class="versions">
               <h2>Versions</h2>
               <button
                  v-for="version in [...summary.versions].reverse()"
                  :key="version.version"
                  class="version"
                  :class="{ current: version.version === currentVersionNumber }"
                  type="button"
                  @click="selectedVersion = version.version"
               >
                  <span><strong>v{{ version.version }}</strong><small>{{ formatDate(version.createdAt) }}</small></span>
                  <span class="badges"><span v-if="version.published" class="badge green">public</span><span v-if="version.builtIn" class="badge">built-in</span></span>
               </button>
               <div class="version-actions">
                  <button v-if="!currentVersion?.published" class="btn" type="button" :disabled="busy || summary.internal || summary.local" @click="setPublished(currentVersionNumber, true)">Publish v{{ currentVersionNumber }}</button>
                  <button v-else class="btn" type="button" :disabled="busy" @click="setPublished(currentVersionNumber, false)">Unpublish v{{ currentVersionNumber }}</button>
                  <button class="btn btn-danger" type="button" :disabled="busy || currentVersion?.published || currentVersion?.builtIn" @click="removeVersion(currentVersionNumber)">Delete</button>
               </div>
            </section>
         </template>
      </TemplateEditorWorkspace>
   </div>
   <div v-else class="page"><p class="error">{{ loadError ? errorMessage(loadError, "Template could not be loaded.") : "Template not found." }}</p></div>
</template>

<style scoped>
.versions { display: grid; gap: 7px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.versions h2 { margin: 0 0 3px; color: var(--fg-subtext0); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.version { width: 100%; display: flex; justify-content: space-between; gap: 8px; padding: 8px; border: 1px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--fg-text); text-align: left; cursor: pointer; }
.version:hover, .version.current { border-color: var(--border); background: var(--bg-surface0); }.version.current { border-color: var(--accent); }
.version > span:first-child { display: grid; }.version small { color: var(--fg-subtext0); font-size: 9px; }.badges { white-space: nowrap; }.badge { margin-left: 3px; }
.version-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px; }.version-actions .btn { padding: 4px 8px; font-size: 11px; }
</style>

<script setup lang="ts">
import { createTemplateDraft } from "~/utils/template-draft";

const draft = ref(createTemplateDraft());
const initial = JSON.stringify(draft.value);
const busy = ref(false);
const failure = ref("");
const dirty = computed(() => JSON.stringify(draft.value) !== initial);
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
watch(() => draft.value.name, (name, previous) => {
   if (!draft.value.id || draft.value.id === slug(previous ?? "")) draft.value.id = slug(name);
});
const list = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

const create = async () => {
   busy.value = true;
   failure.value = "";
   try {
      const template = await $fetch<{ id: string }>("/api/templates", {
         method: "POST",
         body: {
            id: draft.value.id,
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
      await navigateTo(`/templates/${encodeURIComponent(template.id)}`);
   } catch (error) {
      failure.value = errorMessage(error, "Template could not be created.");
   } finally {
      busy.value = false;
   }
};
const reset = () => { draft.value = createTemplateDraft(); failure.value = ""; };
</script>

<template>
   <TemplateEditorWorkspace
      v-model="draft"
      heading="New public template"
      save-label="Create draft"
      :busy="busy"
      :dirty="dirty"
      :error="failure"
      @save="create"
      @reset="reset"
   />
</template>

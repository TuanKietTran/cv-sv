<script setup lang="ts">
import type { EditorStats, MarkdownFormat } from "@ruxt/editor/composables/useCodeMirror";
import { templateDraftFromFiles, type TemplateEditorDraft } from "~/utils/template-draft";

const props = withDefaults(defineProps<{
   heading: string;
   version?: number;
   saveLabel: string;
   busy?: boolean;
   canEdit?: boolean;
   dirty?: boolean;
   message?: string;
   error?: string;
}>(), {
   version: undefined,
   busy: false,
   canEdit: true,
   dirty: false,
   message: "",
   error: "",
});
const emit = defineEmits<{ save: []; reset: [] }>();
const draft = defineModel<TemplateEditorDraft>({ required: true });

type SourceTab = "markdown" | "css";
const activeTab = ref<SourceTab>("markdown");
const showIndicators = ref(true);
const sourceEditor = ref<{ applyMarkdownFormat: (format: MarkdownFormat) => void } | null>(null);
const stats = ref<EditorStats>({ line: 1, column: 1, words: 0 });
const sourceWidth = ref(48);
const resizing = ref(false);
const workspace = useTemplateRef<HTMLElement>("workspace");
const activeSource = computed({
   get: () => activeTab.value === "markdown" ? draft.value.markdownSkeleton : draft.value.css,
   set: (value: string) => {
      if (activeTab.value === "markdown") draft.value.markdownSkeleton = value;
      else draft.value.css = value;
   },
});
const listHint = computed(() => props.version ? `Editing from v${props.version}` : "New unpublished template");

const format = (kind: MarkdownFormat) => sourceEditor.value?.applyMarkdownFormat(kind);
const formatFromSelect = (event: Event) => {
   const select = event.target as HTMLSelectElement;
   if (select.value) format(select.value as MarkdownFormat);
   select.value = "";
};
const resize = (event: PointerEvent) => {
   const bounds = workspace.value?.getBoundingClientRect();
   if (!bounds) return;
   sourceWidth.value = Math.min(70, Math.max(30, ((event.clientX - bounds.left) / bounds.width) * 100));
};
const startResize = (event: PointerEvent) => {
   resizing.value = true;
   (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
   resize(event);
};
const stopResize = (event: PointerEvent) => {
   resizing.value = false;
   const target = event.currentTarget as HTMLElement;
   if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
};
const resizeWithKeyboard = (event: KeyboardEvent) => {
   if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
   event.preventDefault();
   sourceWidth.value = Math.min(70, Math.max(30, sourceWidth.value + (event.key === "ArrowLeft" ? -2 : 2)));
};

const importOpen = ref(false);
const importInput = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const importError = ref("");
const dragging = ref(false);
const importFiles = async (files?: FileList | File[]) => {
   if (!files?.length) return;
   importing.value = true;
   importError.value = "";
   try {
      Object.assign(draft.value, await templateDraftFromFiles(files));
      importOpen.value = false;
   } catch (error) {
      importError.value = error instanceof Error ? error.message : "Template import failed.";
   } finally {
      importing.value = false;
      if (importInput.value) importInput.value.value = "";
   }
};
</script>

<template>
   <div class="template-editor">
      <header class="editor-header">
         <div class="identity">
            <NuxtLink to="/templates" class="back" aria-label="Back to templates">←</NuxtLink>
            <div><strong>{{ heading }}</strong><small>{{ listHint }}</small></div>
         </div>
         <nav class="format-tools" aria-label="Markdown formatting">
            <button type="button" aria-label="Bold" :disabled="activeTab !== 'markdown' || !canEdit" @click="format('bold')"><b>B</b></button>
            <button type="button" aria-label="Italic" :disabled="activeTab !== 'markdown' || !canEdit" @click="format('italic')"><i>I</i></button>
            <button type="button" aria-label="Insert link" :disabled="activeTab !== 'markdown' || !canEdit" @click="format('link')">↗</button>
            <select aria-label="More formatting tools" :disabled="activeTab !== 'markdown' || !canEdit" value="" @change="formatFromSelect">
               <option value="" disabled>More</option><option value="heading">Heading</option><option value="quote">Quote</option><option value="bullet">Bullet list</option><option value="code">Inline code</option>
            </select>
            <button type="button" :class="{ active: showIndicators }" :aria-pressed="showIndicators" aria-label="Toggle Markdown indicators" @click="showIndicators = !showIndicators">{·}</button>
         </nav>
         <div class="header-actions">
            <button class="btn" type="button" :disabled="!canEdit" @click="importOpen = true">Import</button>
            <button v-if="dirty" class="btn" type="button" :disabled="busy" @click="emit('reset')">Discard</button>
            <button class="btn btn-primary" type="button" :disabled="busy || !canEdit" @click="emit('save')">{{ busy ? "Saving…" : saveLabel }}</button>
         </div>
      </header>

      <div class="editor-body">
         <aside class="editor-sidebar">
            <slot name="versions" />
            <section class="settings">
               <h2>Template settings</h2>
               <label class="field">Name<input v-model="draft.name" required maxlength="120" :disabled="!canEdit"></label>
               <label class="field">Id<input v-model="draft.id" required pattern="[a-z0-9][a-z0-9-]{1,63}" :disabled="!canEdit || Boolean(version)"></label>
               <label class="field">Tags<input v-model="draft.tags" placeholder="modern, ats" :disabled="!canEdit"></label>
               <label class="field">Page formats<input v-model="draft.pageFormats" placeholder="A4" :disabled="!canEdit"></label>
               <label class="check"><input v-model="draft.atsFriendly" type="checkbox" :disabled="!canEdit"> ATS friendly</label>
               <label class="check"><input v-model="draft.supportsPhoto" type="checkbox" :disabled="!canEdit"> Supports photo</label>
            </section>
         </aside>

         <main ref="workspace" class="workspace" :class="{ resizing }" :style="{ '--source-width': `${sourceWidth}%` }">
            <section class="source-pane" aria-label="Template source editor">
               <nav class="source-tabs" aria-label="Template files">
                  <button v-for="tab in (['markdown', 'css'] as const)" :key="tab" type="button" :class="{ active: activeTab === tab }" @click="activeTab = tab">{{ tab === "markdown" ? "content.md" : "style.css" }}</button>
               </nav>
               <div class="source-editor">
                  <ClientOnly>
                     <CodeMirror ref="sourceEditor" v-model="activeSource" :language="activeTab" :read-only="!canEdit" :show-indicators="showIndicators" @update:stats="stats = $event" />
                  </ClientOnly>
               </div>
            </section>
            <div class="divider" role="separator" aria-orientation="vertical" aria-label="Resize source and preview" tabindex="0" @pointerdown="startResize" @pointermove="resizing && resize($event)" @pointerup="stopResize" @pointercancel="stopResize" @keydown="resizeWithKeyboard" @dblclick="sourceWidth = 48" />
            <section class="preview-pane" aria-label="Template preview">
               <header><span>Live preview</span><small>{{ draft.pageFormats || "A4" }}</small></header>
               <div class="preview-canvas"><CodePreview :doc="draft.markdownSkeleton" :css="draft.css" /></div>
            </section>
         </main>
      </div>

      <footer class="status-bar">
         <span :class="{ bad: error, good: message }">{{ error || message || (dirty ? "unsaved changes" : "saved") }}</span>
         <span>Ln {{ stats.line }}, Col {{ stats.column }} · {{ stats.words }} words</span>
      </footer>

      <Teleport to="body">
         <div v-if="importOpen" class="import-backdrop" @click.self="importOpen = false">
            <section class="import-dialog" role="dialog" aria-modal="true" aria-labelledby="template-import-title" @keydown.esc="importOpen = false">
               <header><div><h2 id="template-import-title">Import template source</h2><p>Load a JSON template bundle, or Markdown and CSS files together.</p></div><button type="button" aria-label="Close import" @click="importOpen = false">×</button></header>
               <button class="drop-zone" :class="{ dragging }" type="button" @click="importInput?.click()" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave.prevent="dragging = false" @drop.prevent="dragging = false; importFiles(Array.from($event.dataTransfer?.files ?? []))">
                  <strong>{{ importing ? "Importing…" : "Drop template files here" }}</strong><span>.json, .md, .markdown, or .css</span><small>Choose files</small>
               </button>
               <input ref="importInput" hidden multiple type="file" accept=".json,.md,.markdown,.css" @change="importFiles(($event.target as HTMLInputElement).files ?? undefined)">
               <p v-if="importError" class="import-error" role="alert">{{ importError }}</p>
            </section>
         </div>
      </Teleport>
   </div>
</template>

<style scoped>
.template-editor { height: calc(100vh - 52px); min-height: 560px; display: grid; grid-template-rows: 50px minmax(0, 1fr) 24px; background: var(--bg-base); overflow: hidden; }
.editor-header { display: grid; grid-template-columns: minmax(260px, 1fr) auto minmax(300px, 1fr); align-items: center; gap: 12px; padding: 0 14px; border-bottom: 1px solid var(--border); background: var(--bg-mantle); }
.identity { min-width: 0; display: flex; align-items: center; gap: 10px; }.identity div { min-width: 0; display: grid; }.identity strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.identity small { color: var(--fg-subtext0); font-size: 10px; }.back { color: var(--fg-subtext1); font-size: 20px; }
.format-tools, .header-actions { display: flex; align-items: center; gap: 5px; }.header-actions { justify-content: flex-end; }.format-tools button, .format-tools select { min-width: 30px; height: 30px; padding: 0 8px; border: 1px solid transparent; background: transparent; color: var(--fg-subtext0); border-radius: var(--radius-sm); }.format-tools button:hover:not(:disabled), .format-tools button.active { color: var(--fg-text); background: var(--bg-surface0); }.format-tools button:disabled { opacity: .4; }
.editor-body { min-height: 0; display: grid; grid-template-columns: 280px minmax(0, 1fr); }.editor-sidebar { min-height: 0; overflow: auto; padding: 14px; border-right: 1px solid var(--border); background: var(--bg-mantle); }.settings { display: grid; gap: 11px; }.settings h2 { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--fg-subtext0); }.check { display: flex; align-items: center; gap: 7px; color: var(--fg-subtext1); font-size: 12px; }
.workspace { --source-width: 48%; min-width: 0; min-height: 0; display: grid; grid-template-columns: var(--source-width) 5px minmax(0, 1fr); }.workspace.resizing, .workspace.resizing * { cursor: col-resize !important; user-select: none; }.source-pane, .preview-pane { min-width: 0; min-height: 0; display: grid; grid-template-rows: 34px minmax(0, 1fr); }.source-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-mantle); }.source-tabs button { padding: 0 14px; border: 0; border-bottom: 1px solid transparent; background: transparent; color: var(--fg-subtext0); font: inherit; font-size: 12px; }.source-tabs button.active { color: var(--fg-text); border-bottom-color: var(--accent); }.source-editor { min-height: 0; overflow: hidden; }.divider { position: relative; background: var(--border); cursor: col-resize; }.divider::after { content: ""; position: absolute; inset: 0 -3px; }.preview-pane > header { display: flex; justify-content: space-between; align-items: center; padding: 0 14px; border-bottom: 1px solid var(--border); color: var(--fg-subtext0); font-size: 11px; }.preview-canvas { min-height: 0; overflow: auto; padding: 28px; background: var(--bg-surface0); }.preview-canvas :deep(.code-preview) { transform-origin: top center; }.status-bar { display: flex; justify-content: space-between; align-items: center; padding: 0 12px; border-top: 1px solid var(--border); color: var(--fg-subtext0); font: 10px ui-monospace, monospace; }.status-bar .bad { color: var(--red); }.status-bar .good { color: var(--green); }
.import-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 72%); }.import-dialog { width: min(560px, 100%); padding: 18px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-mantle); }.import-dialog header { display: flex; justify-content: space-between; gap: 20px; }.import-dialog h2, .import-dialog p { margin: 0; }.import-dialog header p { margin-top: 4px; color: var(--fg-subtext0); font-size: 11px; }.import-dialog header button { border: 0; background: transparent; color: var(--fg-subtext0); font-size: 20px; }.drop-zone { width: 100%; min-height: 180px; margin-top: 18px; display: grid; place-content: center; gap: 8px; border: 1px dashed var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-base); color: var(--fg-text); text-align: center; }.drop-zone.dragging { border-color: var(--accent); }.drop-zone span, .drop-zone small { color: var(--fg-subtext0); }.import-error { margin-top: 12px !important; color: var(--red); }
@media (max-width: 900px) { .editor-header { grid-template-columns: 1fr auto; }.format-tools { display: none; }.editor-body { grid-template-columns: 220px minmax(0, 1fr); } }
@media (max-width: 680px) { .template-editor { height: auto; min-height: calc(100vh - 52px); overflow: visible; }.editor-body { display: block; }.editor-sidebar { border-right: 0; border-bottom: 1px solid var(--border); }.workspace { min-height: 700px; grid-template-columns: 1fr; grid-template-rows: 350px 350px; }.divider { display: none; }.preview-pane { grid-row: 2; }.editor-header { position: sticky; top: 52px; z-index: 5; }.header-actions .btn:not(.btn-primary) { display: none; } }
</style>

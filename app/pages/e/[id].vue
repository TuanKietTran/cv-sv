<script setup lang="ts">
import referenceCvCss from "~/data/reference-cv.css?raw";
import { exportCvImages, type CvImageExportOptions, type CvImageFormat } from "~/utils/exportCvImage";
import type { MarkdownFormat } from "~/composables/useCodeMirror";

definePageMeta({ layout: false });

const route = useRoute();
const documentId = String(route.params.id);
type SourceTab = "markdown" | "css";
const activeTab = ref<SourceTab>("markdown");
const showIndicators = ref(true);
const sourceEditor = ref<{ applyMarkdownFormat: (format: MarkdownFormat) => void } | null>(null);
const { resolvedId, markdown, css, revision, saveState } = await useCvDocument(documentId, {
    markdown: "",
    css: referenceCvCss,
});
if (resolvedId.value !== documentId) {
    await navigateTo(`/e/${encodeURIComponent(resolvedId.value)}`, { replace: true });
}
const documentTitle = computed(
    () => markdown.value.match(/^#\s+(.+)$/m)?.[1]?.replace(/\s*\{[^{}]+\}\s*$/, "").trim() || documentId,
);
useSeoMeta({
    title: () => documentTitle.value,
    ogTitle: () => documentTitle.value,
});
const formatSource = (format: MarkdownFormat) => sourceEditor.value?.applyMarkdownFormat(format);
const exportPdf = () => window.print();
const exportImage = (format: CvImageFormat, options: CvImageExportOptions) =>
    exportCvImages(
        format,
        documentTitle.value.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || documentId,
        css.value,
        options,
    );
const activeSource = computed({
    get: () => activeTab.value === "markdown" ? markdown.value : css.value,
    set: (value: string) => {
        if (activeTab.value === "markdown") markdown.value = value;
        else css.value = value;
    },
});
</script>

<template>
    <NuxtLayout
        name="editor"
        :title="documentTitle"
        :save-state="saveState"
        :revision="revision"
        :formatting-enabled="activeTab === 'markdown'"
        :show-indicators="showIndicators"
        @format="formatSource"
        @toggle-indicators="showIndicators = !showIndicators"
        @export-pdf="exportPdf"
        @export-image="exportImage"
    >
        <template #editor-tabs>
            <button
                v-for="tab in (['markdown', 'css'] as const)"
                :key="tab"
                class="source-tab"
                :class="{ 'source-tab--active': activeTab === tab }"
                type="button"
                @click="activeTab = tab"
            >
                {{ tab === "markdown" ? "content.md" : "style.css" }}
            </button>
        </template>

        <template #editor>
            <ClientOnly>
                <CodeMirror ref="sourceEditor" v-model="activeSource" :language="activeTab" :show-indicators="showIndicators" />
            </ClientOnly>
        </template>

        <template #preview>
            <CodePreview :doc="markdown" :css="css" />
        </template>
    </NuxtLayout>
</template>

<style scoped>
.source-tab {
    height: 100%;
    padding: 0 14px;
    border: 0;
    background: transparent;
    color: var(--fg-subtext0);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
}
.source-tab--active {
    color: var(--fg-text);
    border-bottom: 1px solid var(--accent);
}
</style>

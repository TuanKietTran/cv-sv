<script setup lang="ts">
import { toRef } from "vue";
import type { CodeMirrorLanguage } from "~/composables/useCodeMirror";

const props = withDefaults(
    defineProps<{
        modelValue: string;
        language?: CodeMirrorLanguage;
    }>(),
    {
        language: "markdown",
    },
);

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const { container, applyMarkdownFormat, focus } = useCodeMirror({
    initialDoc: toRef(props, "modelValue"),
    language: toRef(props, "language"),
    onChange: (state) => emit("update:modelValue", state.doc.toString()),
});

defineExpose({ applyMarkdownFormat, focus });
</script>

<template>
    <div ref="container" class="code-mirror" />
</template>

<style scoped>
.code-mirror {
    width: 100%;
    height: 100%;
    min-height: 0;
}

.code-mirror :deep(.cm-editor) {
    height: 100%;
    font-size: 13px;
}

.code-mirror :deep(.cm-scroller) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>

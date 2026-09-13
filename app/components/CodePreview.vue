<script setup lang="ts">
import { computed } from "vue";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import "github-markdown-css/github-markdown.css";

const props = withDefaults(defineProps<{
    doc: string;
    css?: string;
}>(), {
    css: "",
});

const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code ?? []), "className"],
    },
} satisfies SanitizeSchema;

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

const html = computed(() => processor.processSync(props.doc).toString());
const styleElement = useTemplateRef<HTMLStyleElement>("documentStyle");
const applyDocumentStyle = () => {
    if (styleElement.value) styleElement.value.textContent = props.css;
};
onMounted(applyDocumentStyle);
watch(() => props.css, applyDocumentStyle);

const pages = computed(() => {
    const split = html.value.split(/<hr\s*\/?>(?:\n)?/i);
    return split.filter((page) => page.trim().length > 0);
});
</script>

<template>
    <div class="code-preview">
        <!-- Set through textContent so quotes remain valid CSS without allowing HTML injection. -->
        <component :is="'style'" ref="documentStyle" />
        <!-- Markdown HTML is sanitized before reaching v-html. -->
        <article
            v-for="(page, index) in pages"
            :key="index"
            class="cv-sheet"
            :aria-label="`CV page ${index + 1}`"
            v-html="page"
        />
    </div>
</template>

<style scoped>
.code-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    min-width: max-content;
}

.cv-sheet {
    flex: none;
    box-shadow: 0 4px 18px rgb(0 0 0 / 20%);
}

@media print {
    .code-preview {
        display: block;
        min-width: 0;
        print-color-adjust: exact;
    }
}
</style>

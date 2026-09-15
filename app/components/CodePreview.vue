<script setup lang="ts">
import { computed } from "vue";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import postcss from "postcss";
import prefixSelector from "postcss-prefix-selector";
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
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "id"],
        code: [...(defaultSchema.attributes?.code ?? []), "className"],
    },
} satisfies SanitizeSchema;

const markdownIndicators = () => (tree: any) => {
    const visit = (node: any) => {
        if (node.type === "containerDirective") {
            node.data ??= {};
            node.data.hName = "div";
            node.data.hProperties = {
                ...(node.attributes ?? {}),
                className: [node.name, ...(node.attributes?.class ? String(node.attributes.class).split(/\s+/) : [])],
            };
        }

        if ((node.type === "heading" || node.type === "paragraph") && node.children?.length) {
            const tail = node.children[node.children.length - 1];
            if (tail.type === "text") {
                const match = tail.value.match(/\s*\{([^{}]+)\}\s*$/);
                if (match) {
                    const classes: string[] = [];
                    const properties: Record<string, string | string[]> = {};
                    for (const token of match[1].trim().split(/\s+/)) {
                        if (token.startsWith(".")) classes.push(token.slice(1));
                        else if (token.startsWith("#")) properties.id = token.slice(1);
                    }
                    if (classes.length || properties.id) {
                        tail.value = tail.value.slice(0, match.index).trimEnd();
                        node.data ??= {};
                        node.data.hProperties = { ...(node.data.hProperties ?? {}), ...properties, className: classes };
                    }
                }
            }
        }
        node.children?.forEach(visit);
    };
    visit(tree);
};

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(markdownIndicators)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

const html = computed(() => processor.processSync(props.doc).toString());
const scopedCss = computed(() => {
    try {
        return postcss([
            {
                postcssPlugin: "cv-remove-global-at-rules",
                AtRule(rule) {
                    // These rules cannot be limited to the preview subtree. In particular,
                    // @import would load an entirely unprefixed global stylesheet.
                    if ([
                        "import", "namespace", "page", "property", "font-face",
                        "font-feature-values", "counter-style", "keyframes", "-webkit-keyframes",
                        "layer",
                    ].includes(rule.name.toLowerCase())) {
                        rule.remove();
                    }
                },
            },
            prefixSelector({
                prefix: ".cv-preview-scope",
                transform(prefix, selector, prefixedSelector) {
                    if (/^(?::root|html|body)(?:\b|\s|\.|#|:|\[)/.test(selector)) {
                        return selector.replace(/^(?::root|html|body)/, prefix);
                    }
                    return prefixedSelector;
                },
            }),
        ]).process(props.css, { from: undefined }).css;
    } catch {
        return "";
    }
});
const styleElement = useTemplateRef<HTMLStyleElement>("documentStyle");
const applyDocumentStyle = () => {
    if (styleElement.value) styleElement.value.textContent = scopedCss.value;
};
onMounted(applyDocumentStyle);
watch(scopedCss, applyDocumentStyle);

const pages = computed(() => {
    const split = html.value.split(/<hr\s*\/?>(?:\n)?/i);
    return split.filter((page) => page.trim().length > 0);
});
</script>

<template>
    <div class="code-preview cv-preview-scope">
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

    .cv-sheet + .cv-sheet {
        break-before: page;
        page-break-before: always;
    }
}
</style>

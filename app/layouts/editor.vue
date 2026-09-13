<script setup lang="ts">
import { computed } from "vue";
import { useTheme, type ThemeId } from "~/composables/useTheme";

const props = withDefaults(
    defineProps<{
        title?: string;
        appLabel?: string;
        saveState?: "saved" | "saving" | "conflict" | "offline";
        revision?: number;
        formattingEnabled?: boolean;
    }>(),
    {
        title: "Untitled CV",
        appLabel: "APP",
        saveState: "saved",
        revision: 0,
        formattingEnabled: true,
    },
);

const emit = defineEmits<{
    toggleSidebar: [];
    createDocument: [];
    refreshDocuments: [];
    exportPdf: [];
    exportImage: [format: "png" | "jpeg"];
    format: [format: "bold" | "italic" | "link" | "heading" | "quote" | "bullet" | "code"];
}>();

const route = useRoute();
const { current, themes, apply } = useTheme();
const { user, logout } = useAuth();

const editorTitle = computed(
    () => (route.meta.editorTitle as string | undefined) ?? props.title,
);

const workspace = useTemplateRef<HTMLElement>("workspace");
const previewCanvas = useTemplateRef<HTMLElement>("previewCanvas");
const previewContent = useTemplateRef<HTMLElement>("previewContent");
const sourceWidth = ref(46);
const isResizing = ref(false);
const isSidebarOpen = ref(true);
const sidebarWidth = ref(232);
const isSidebarResizing = ref(false);
const previewZoom = ref(100);
const isFitZoom = ref(false);
const pageCount = ref(1);
let previewObserver: MutationObserver | undefined;
let canvasObserver: ResizeObserver | undefined;

const layoutStyle = computed(() => ({
    "--sidebar-width": `${sidebarWidth.value}px`,
}));
const workspaceStyle = computed(() => ({
    "--source-width": `${sourceWidth.value}%`,
    "--preview-zoom": String(previewZoom.value / 100),
}));

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
    localStorage.setItem("editor-sidebar-open", String(isSidebarOpen.value));
    emit("toggleSidebar");
};

const resizeSidebarToPointer = (event: PointerEvent) => {
    sidebarWidth.value = Math.min(420, Math.max(160, event.clientX - 46));
};

const startSidebarResize = (event: PointerEvent) => {
    isSidebarResizing.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    resizeSidebarToPointer(event);
};

const stopSidebarResize = (event: PointerEvent) => {
    isSidebarResizing.value = false;
    localStorage.setItem("editor-sidebar-width", String(Math.round(sidebarWidth.value)));
    const divider = event.currentTarget as HTMLElement;
    if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId);
};

const resizeSidebarWithKeyboard = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    sidebarWidth.value = Math.min(420, Math.max(160, sidebarWidth.value + (event.key === "ArrowLeft" ? -16 : 16)));
    localStorage.setItem("editor-sidebar-width", String(sidebarWidth.value));
};

const resetSidebarWidth = () => {
    sidebarWidth.value = 232;
    localStorage.setItem("editor-sidebar-width", "232");
};

const formatFromSelect = (event: Event) => {
    const select = event.target as HTMLSelectElement;
    if (select.value) emit("format", select.value as "heading" | "quote" | "bullet" | "code");
    select.value = "";
};

const setZoom = (zoom: number) => {
    isFitZoom.value = false;
    previewZoom.value = Math.min(200, Math.max(25, Math.round(zoom / 10) * 10));
};

const fitPreview = async () => {
    isFitZoom.value = true;
    previewZoom.value = 100;
    await nextTick();
    const canvas = previewCanvas.value;
    const sheet = previewContent.value?.querySelector<HTMLElement>(".cv-sheet");
    if (!canvas || !sheet) return;
    const availableWidth = canvas.clientWidth - 56;
    const availableHeight = canvas.clientHeight - 56;
    previewZoom.value = Math.max(25, Math.min(200, Math.floor(Math.min(
        availableWidth / sheet.offsetWidth,
        availableHeight / sheet.offsetHeight,
    ) * 100)));
};

const updatePageCount = () => {
    pageCount.value = Math.max(1, previewContent.value?.querySelectorAll(".cv-sheet").length ?? 0);
};

onMounted(() => {
    isSidebarOpen.value = localStorage.getItem("editor-sidebar-open") !== "false";
    const savedWidth = Number(localStorage.getItem("editor-sidebar-width"));
    if (Number.isFinite(savedWidth) && savedWidth >= 160 && savedWidth <= 420) sidebarWidth.value = savedWidth;
    updatePageCount();
    if (previewContent.value) {
        previewObserver = new MutationObserver(updatePageCount);
        previewObserver.observe(previewContent.value, { childList: true, subtree: true });
    }
    if (previewCanvas.value) {
        canvasObserver = new ResizeObserver(() => { if (isFitZoom.value) void fitPreview(); });
        canvasObserver.observe(previewCanvas.value);
    }
});

onBeforeUnmount(() => {
    previewObserver?.disconnect();
    canvasObserver?.disconnect();
});

const resizeToPointer = (event: PointerEvent) => {
    const bounds = workspace.value?.getBoundingClientRect();
    if (!bounds) return;

    const minimumPaneWidth = Math.min(320, bounds.width * 0.35);
    const nextWidth = Math.min(
        bounds.width - minimumPaneWidth,
        Math.max(minimumPaneWidth, event.clientX - bounds.left),
    );

    sourceWidth.value = (nextWidth / bounds.width) * 100;
};

const startResize = (event: PointerEvent) => {
    isResizing.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    resizeToPointer(event);
};

const stopResize = (event: PointerEvent) => {
    isResizing.value = false;
    const divider = event.currentTarget as HTMLElement;
    if (divider.hasPointerCapture(event.pointerId)) {
        divider.releasePointerCapture(event.pointerId);
    }
};

const resizeWithKeyboard = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    sourceWidth.value = Math.min(
        70,
        Math.max(30, sourceWidth.value + (event.key === "ArrowLeft" ? -2 : 2)),
    );
};

const handleLogout = async () => {
    await logout();
    await navigateTo("/login");
};
</script>

<template>
    <div
        class="editor-layout"
        :class="{ 'editor-layout--sidebar-closed': !isSidebarOpen, 'editor-layout--resizing': isSidebarResizing }"
        :style="layoutStyle"
    >
        <header class="editor-header">
            <section class="editor-header__identity">
                <button
                    class="icon-button"
                    :class="{ 'icon-button--active': isSidebarOpen }"
                    type="button"
                    aria-label="Toggle document sidebar"
                    aria-controls="main-aside"
                    :aria-expanded="isSidebarOpen"
                    @click="toggleSidebar"
                >
                    <span aria-hidden="true">▢</span>
                </button>
                <strong class="editor-title">{{ editorTitle }}</strong>
                <span class="app-badge">{{ appLabel }}</span>
            </section>

            <nav class="editor-header__tools" aria-label="Editor tools">
                <button class="tool-button" type="button" aria-label="Bold" :disabled="!formattingEnabled" @click="emit('format', 'bold')">
                    <strong>B</strong>
                </button>
                <button class="tool-button" type="button" aria-label="Italic" :disabled="!formattingEnabled" @click="emit('format', 'italic')">
                    <em>I</em>
                </button>
                <button class="tool-button" type="button" aria-label="Insert link" :disabled="!formattingEnabled" @click="emit('format', 'link')">
                    ↗
                </button>
                <select
                    class="format-select"
                    aria-label="More formatting tools"
                    :disabled="!formattingEnabled"
                    value=""
                    @change="formatFromSelect"
                >
                    <option value="" disabled>More</option>
                    <option value="heading">Heading</option>
                    <option value="quote">Quote</option>
                    <option value="bullet">Bullet list</option>
                    <option value="code">Inline code</option>
                </select>
            </nav>

            <section class="editor-header__actions">
                <select
                    class="theme-select"
                    :value="current"
                    aria-label="Select theme"
                    @change="apply(($event.target as HTMLSelectElement).value as ThemeId)"
                >
                    <option v-for="theme in themes" :key="theme.id" :value="theme.id">
                        {{ theme.label }}
                    </option>
                </select>
                <button class="header-button" type="button">Split</button>
                <button class="header-button" type="button" @click="emit('exportImage', 'png')">
                    PNG
                </button>
                <button class="header-button" type="button" @click="emit('exportImage', 'jpeg')">
                    JPEG
                </button>
                <button
                    class="header-button header-button--primary"
                    type="button"
                    @click="emit('exportPdf')"
                >
                    PDF
                </button>
            </section>
        </header>

        <nav class="activity-bar" aria-label="Primary navigation">
            <div class="activity-bar__top">
                <button class="activity-button activity-button--active" type="button" aria-label="Documents">
                    ▤
                </button>
                <button class="activity-button" type="button" aria-label="Create document" @click="emit('createDocument')">
                    ＋
                </button>
            </div>

            <div class="activity-bar__bottom">
                <button class="activity-button" type="button" aria-label="Help">?</button>
                <button
                    v-if="user"
                    class="activity-button"
                    type="button"
                    :aria-label="`Sign out ${user.email}`"
                    @click="handleLogout"
                >
                    ◉
                </button>
                <NuxtLink v-else class="activity-button" to="/login" aria-label="Sign in">◉</NuxtLink>
            </div>
        </nav>

        <aside id="main-aside" class="document-sidebar">
            <header class="document-sidebar__header">
                <span>Documents</span>
                <div class="document-sidebar__actions">
                    <button class="icon-button" type="button" aria-label="Create document" @click="emit('createDocument')">
                        ＋
                    </button>
                    <button class="icon-button" type="button" aria-label="Refresh documents" @click="emit('refreshDocuments')">
                        ↻
                    </button>
                </div>
            </header>

            <!-- Extract this tree into an EditorDocumentTree component when its data source is ready. -->
            <nav class="document-tree" aria-label="Documents">
                <section class="document-group">
                    <h2>Master</h2>
                    <p class="document-tree__empty">No master CV yet</p>
                </section>
                <section class="document-group">
                    <h2>Applications</h2>
                    <p class="document-tree__empty">No applications yet</p>
                </section>
                <section class="document-group">
                    <h2>Templates</h2>
                    <p class="document-tree__empty">No templates yet</p>
                </section>
            </nav>
        </aside>

        <div
            v-show="isSidebarOpen"
            class="sidebar-divider"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize document sidebar"
            aria-valuemin="160"
            aria-valuemax="420"
            :aria-valuenow="Math.round(sidebarWidth)"
            tabindex="0"
            @pointerdown="startSidebarResize"
            @pointermove="isSidebarResizing && resizeSidebarToPointer($event)"
            @pointerup="stopSidebarResize"
            @pointercancel="stopSidebarResize"
            @keydown="resizeSidebarWithKeyboard"
            @dblclick="resetSidebarWidth"
        />

        <!-- The layout owns the split; pages only provide editor and preview content. -->
        <main
            id="main-editor"
            ref="workspace"
            class="editor-workspace"
            :class="{ 'editor-workspace--resizing': isResizing }"
            :style="workspaceStyle"
        >
            <section class="source-pane" aria-label="CV source editor">
                <nav class="source-tabs" aria-label="Document files">
                    <slot name="editor-tabs">
                        <button class="source-tab source-tab--active" type="button">content.md</button>
                        <button class="source-tab" type="button">style.css</button>
                    </slot>
                </nav>

                <div class="source-editor">
                    <slot name="editor">
                        <slot />
                    </slot>
                </div>
            </section>

            <div
                class="workspace-divider"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and preview"
                aria-valuemin="30"
                aria-valuemax="70"
                :aria-valuenow="Math.round(sourceWidth)"
                tabindex="0"
                @pointerdown="startResize"
                @pointermove="isResizing && resizeToPointer($event)"
                @pointerup="stopResize"
                @pointercancel="stopResize"
                @keydown="resizeWithKeyboard"
                @dblclick="sourceWidth = 46"
            />

            <section class="preview-pane" aria-label="CV preview">
                <header class="preview-toolbar">
                    <div class="preview-toolbar__group">
                        <button type="button" aria-label="Zoom out" :disabled="previewZoom <= 25" @click="setZoom(previewZoom - 10)">−</button>
                        <button class="zoom-value" type="button" aria-label="Reset zoom" @click="setZoom(100)">{{ previewZoom }}%</button>
                        <button type="button" aria-label="Zoom in" :disabled="previewZoom >= 200" @click="setZoom(previewZoom + 10)">＋</button>
                        <button type="button" :class="{ 'preview-tool--active': isFitZoom }" :aria-pressed="isFitZoom" @click="fitPreview">Fit</button>
                    </div>
                    <span>{{ pageCount }} {{ pageCount === 1 ? 'page' : 'pages' }}</span>
                </header>

                <div ref="previewCanvas" class="preview-canvas">
                    <article ref="previewContent" class="preview-page">
                        <slot name="preview" />
                    </article>
                </div>
            </section>
        </main>

        <footer class="editor-statusbar">
            <div class="editor-statusbar__left">
                <span class="save-state" :class="`save-state--${saveState}`">{{ saveState }}</span>
                <span v-if="revision">rev {{ revision }}</span>
                <span>Ln 1, Col 1</span>
                <span>0 words</span>
                <span>{{ pageCount }} {{ pageCount === 1 ? 'page' : 'pages' }}</span>
                <span>A4</span>
            </div>
            <span class="editor-statusbar__context">app:{{ editorTitle.toLowerCase().replaceAll(" ", "-") }}</span>
        </footer>
    </div>
</template>

<style scoped>
.editor-layout {
    display: grid;
    grid-template:
        "header header header header" 42px
        "activity sidebar sidebar-divider workspace" minmax(0, 1fr)
        "activity sidebar sidebar-divider status" 24px
        / 46px var(--sidebar-width, 232px) 5px minmax(0, 1fr);
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    background: var(--bg-base);
    color: var(--fg-text);
}

.editor-layout--sidebar-closed {
    grid-template-columns: 46px 0 0 minmax(0, 1fr);
}

.editor-layout--sidebar-closed .document-sidebar {
    display: none;
}

button,
select {
    font: inherit;
}

button {
    color: inherit;
}

.editor-header {
    grid-area: header;
    display: grid;
    grid-template-columns: minmax(278px, auto) 1fr auto;
    align-items: center;
    min-width: 0;
    background: var(--bg-mantle);
    border-bottom: 1px solid var(--border);
}

.editor-header__identity,
.editor-header__tools,
.editor-header__actions {
    display: flex;
    align-items: center;
    height: 100%;
}

.editor-header__identity {
    gap: 9px;
    padding: 0 10px 0 6px;
}

.editor-header__tools {
    gap: 2px;
    padding-left: 8px;
    border-left: 1px solid var(--border);
}

.editor-header__actions {
    gap: 6px;
    padding: 0 8px;
}

.editor-title {
    overflow: hidden;
    color: var(--fg-text);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-badge {
    padding: 2px 5px;
    border-radius: 3px;
    background: var(--bg-surface0);
    color: var(--fg-subtext0);
    font-size: 9px;
    letter-spacing: 0.12em;
}

.icon-button,
.tool-button,
.activity-button,
.header-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: var(--fg-subtext0);
    cursor: pointer;
}

.icon-button {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
}

.icon-button--active,
.icon-button:hover,
.tool-button:hover,
.activity-button:hover {
    background: var(--bg-surface0);
    color: var(--fg-text);
}

.tool-button {
    width: 30px;
    height: 30px;
    border-radius: 4px;
    font-size: 12px;
}

.tool-button:disabled,
.format-select:disabled,
.preview-toolbar button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.format-select {
    width: 54px;
    height: 28px;
    padding: 0 3px;
    border: 0;
    background: transparent;
    color: var(--fg-subtext0);
    font-size: 11px;
    cursor: pointer;
}

.header-button,
.theme-select {
    height: 28px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--fg-subtext1);
    font-size: 12px;
}

.header-button {
    padding: 0 11px;
}

.header-button:hover,
.theme-select:hover {
    background: var(--bg-surface0);
    color: var(--fg-text);
}

.header-button--primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--bg-crust);
}

.theme-select {
    max-width: 150px;
    padding: 0 7px;
}

.activity-bar {
    grid-area: activity;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 7px 0 4px;
    background: var(--bg-mantle);
    border-right: 1px solid var(--border);
}

.activity-bar__top,
.activity-bar__bottom {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.activity-button {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    font-size: 16px;
    text-decoration: none;
}

.activity-button--active {
    background: var(--bg-surface0);
    color: var(--accent);
}

.document-sidebar {
    grid-area: sidebar;
    min-width: 0;
    overflow: hidden;
    background: var(--bg-mantle);
    border-right: 1px solid var(--border);
}

.document-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 42px;
    padding: 0 10px 0 12px;
    color: var(--fg-subtext0);
    font-size: 10px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
}

.document-sidebar__actions {
    display: flex;
}

.sidebar-divider {
    position: relative;
    z-index: 3;
    grid-area: sidebar-divider;
    background: var(--bg-mantle);
    cursor: col-resize;
    touch-action: none;
}

.sidebar-divider::after {
    position: absolute;
    inset: 0 2px;
    background: var(--border);
    content: "";
}

.sidebar-divider:hover::after,
.sidebar-divider:focus-visible::after,
.editor-layout--resizing .sidebar-divider::after {
    background: var(--accent);
}

.editor-layout--resizing,
.editor-layout--resizing * {
    cursor: col-resize !important;
    user-select: none !important;
}

.document-tree {
    overflow-y: auto;
    height: calc(100% - 42px);
    padding-bottom: 16px;
}

.document-group h2 {
    margin: 12px 12px 5px;
    color: var(--fg-subtext0);
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.document-tree__empty {
    margin: 0;
    padding: 6px 16px;
    color: var(--bg-overlay1);
    font-size: 12px;
}

.editor-workspace {
    grid-area: workspace;
    display: grid;
    grid-template-columns: minmax(0, var(--source-width, 46%)) 5px minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--bg-base);
}

.source-pane,
.preview-pane {
    display: grid;
    grid-template-rows: 36px minmax(0, 1fr);
    min-width: 0;
    min-height: 0;
}

.source-tabs,
.preview-toolbar {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border);
    background: var(--bg-mantle);
}

.source-tab,
.preview-toolbar button {
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

.source-editor {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    background: var(--bg-base);
}

.workspace-divider {
    position: relative;
    z-index: 2;
    background: transparent;
    cursor: col-resize;
    touch-action: none;
}

.workspace-divider::after {
    position: absolute;
    inset: 0 2px;
    background: var(--border-strong);
    content: "";
    transition: background 0.15s;
}

.workspace-divider:hover::after,
.workspace-divider:focus-visible::after,
.editor-workspace--resizing .workspace-divider::after {
    background: var(--accent);
}

.editor-workspace--resizing,
.editor-workspace--resizing * {
    cursor: col-resize !important;
    user-select: none !important;
}

.preview-toolbar {
    justify-content: space-between;
    padding-right: 12px;
    color: var(--fg-subtext0);
    font-size: 11px;
}

.preview-toolbar__group {
    display: flex;
    align-items: center;
    height: 100%;
}

.preview-toolbar .zoom-value {
    min-width: 48px;
    padding-inline: 6px;
}

.preview-toolbar .preview-tool--active {
    color: var(--accent);
    background: var(--bg-surface0);
}

.preview-canvas {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding: 28px;
    background: var(--bg-surface0);
}

.preview-page {
    display: block;
    width: max-content;
    margin: 0 auto;
    zoom: var(--preview-zoom, 1);
}

.editor-statusbar {
    grid-area: status;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    padding: 0 8px;
    background: var(--bg-mantle);
    border-top: 1px solid var(--border);
    color: var(--bg-overlay1);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
}

.editor-statusbar__left {
    display: flex;
    gap: 12px;
}

.save-state { color: var(--green); }
.save-state--saving { color: var(--yellow); }
.save-state--conflict,
.save-state--offline { color: var(--red); }

.editor-statusbar__context {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 900px) {
    .editor-layout {
        grid-template:
            "header header" 42px
            "activity workspace" minmax(0, 1fr)
            "activity status" 24px
            / 46px minmax(0, 1fr);
    }

    .document-sidebar,
    .sidebar-divider {
        display: none !important;
    }

    .editor-header {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .editor-header__tools,
    .theme-select {
        display: none;
    }
}

@media (max-width: 760px) {
    .editor-workspace {
        grid-template-columns: minmax(0, 1fr);
    }

    .workspace-divider,
    .preview-pane {
        display: none;
    }
}

@media (max-width: 560px) {
    .editor-header__actions .header-button:not(.header-button--primary),
    .editor-statusbar__left span:not(.save-state),
    .editor-statusbar__context,
    .app-badge {
        display: none;
    }
}

@media print {
    .editor-header,
    .activity-bar,
    .document-sidebar,
    .sidebar-divider,
    .source-pane,
    .workspace-divider,
    .preview-toolbar,
    .editor-statusbar {
        display: none !important;
    }

    .editor-layout,
    .editor-workspace,
    .preview-pane {
        display: block !important;
        width: auto;
        height: auto;
        overflow: visible;
        background: #fff;
    }

    .preview-canvas {
        overflow: visible;
        padding: 0;
        background: #fff;
    }

    .preview-page {
        zoom: 1;
    }
}
</style>

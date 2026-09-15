import type { CvDocument, CvUpdateEvent } from "@core/domain/cv";

export type CvSaveState = "saved" | "saving" | "conflict" | "offline";

export async function useCvDocument(
    id: string,
    fallback: Pick<CvDocument, "markdown" | "css">,
) {
    const { data } = await useFetch<CvDocument>(`/api/cvs/${encodeURIComponent(id)}`, {
        key: `cv-document:${id}`,
    });

    const resolvedId = ref(data.value?.id ?? id);
    const markdown = ref(data.value?.markdown ?? fallback.markdown);
    const css = ref(data.value?.css ?? fallback.css);
    const revision = ref(data.value?.revision ?? 0);
    const saveState = ref<CvSaveState>(data.value ? "saved" : "offline");
    const sourceId = ref("");
    let applyingRemote = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saveQueue = Promise.resolve();
    let events: EventSource | undefined;

    const applyRemote = (document: CvDocument) => {
        if (dirty || document.revision <= revision.value) return;
        applyingRemote = true;
        markdown.value = document.markdown;
        css.value = document.css;
        revision.value = document.revision;
        saveState.value = "saved";
        nextTick(() => { applyingRemote = false; });
    };

    const save = () => {
        if (!import.meta.client || applyingRemote) return;
        dirty = true;
        saveState.value = "saving";
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            const snapshot = {
                markdown: markdown.value,
                css: css.value,
                sourceId: sourceId.value,
            };
            saveQueue = saveQueue.then(async () => {
                try {
                    const updated = await $fetch<CvDocument>(`/api/cvs/${encodeURIComponent(id)}`, {
                        method: "PUT",
                        body: {
                            ...snapshot,
                            expectedRevision: revision.value || undefined,
                        },
                    });
                    revision.value = updated.revision;
                    dirty = markdown.value !== snapshot.markdown || css.value !== snapshot.css;
                    saveState.value = dirty ? "saving" : "saved";
                } catch (error: any) {
                    saveState.value = error?.statusCode === 409 ? "conflict" : "offline";
                }
            });
        }, 450);
    };

    watch([markdown, css], save);

    onMounted(() => {
        sourceId.value = crypto.randomUUID();
        events = new EventSource(`/api/cvs/${encodeURIComponent(id)}/events`);
        events.addEventListener("ready", (event) => {
            const update = JSON.parse((event as MessageEvent).data) as { document: CvDocument };
            applyRemote(update.document);
        });
        events.addEventListener("cv:update", (event) => {
            const update = JSON.parse((event as MessageEvent).data) as CvUpdateEvent;
            if (update.sourceId !== sourceId.value) applyRemote(update.document);
        });
        events.onerror = () => {
            if (saveState.value === "saved") saveState.value = "offline";
        };
        events.onopen = () => {
            if (!dirty) saveState.value = "saved";
        };
    });

    onBeforeUnmount(() => {
        if (timer) clearTimeout(timer);
        events?.close();
    });

    return { resolvedId, markdown, css, revision, saveState };
}

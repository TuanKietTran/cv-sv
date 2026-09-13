import referenceMarkdown from "../../app/data/reference-cv.md?raw";
import referenceCss from "../../app/data/reference-cv.css?raw";
import type {
    CvDocument,
    CvDocumentSummary,
    CvUpdateEvent,
    UpdateCvDocumentInput,
} from "../../shared/types/cv";

type Listener = (update: CvUpdateEvent) => void;

const listeners = new Map<string, Set<Listener>>();
const writes = new Map<string, Promise<unknown>>();
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export function assertCvId(id: string): string {
    if (!idPattern.test(id)) {
        throw createError({ statusCode: 400, statusMessage: "Invalid CV document id" });
    }
    return id;
}

const keyFor = (id: string) => `documents:${assertCvId(id)}`;

function seedDocument(id: string): CvDocument {
    return {
        id,
        markdown: id === "master" ? referenceMarkdown : `# ${id}\n\nStart writing your CV.\n`,
        css: referenceCss,
        revision: 1,
        updatedAt: new Date().toISOString(),
    };
}

export async function getCvDocument(id: string): Promise<CvDocument> {
    const storage = useStorage("cv");
    const key = keyFor(id);
    const existing = await storage.getItem<CvDocument>(key);
    if (existing) return existing;

    const seeded = seedDocument(id);
    await storage.setItem(key, seeded);
    return seeded;
}

export async function listCvDocuments(): Promise<CvDocumentSummary[]> {
    const storage = useStorage("cv");
    const keys = await storage.getKeys("documents:");
    if (!keys.length) await getCvDocument("master");

    const currentKeys = keys.length ? keys : await storage.getKeys("documents:");
    const documents = await Promise.all(
        currentKeys.map((key) => storage.getItem<CvDocument>(key)),
    );

    return documents
        .filter((document): document is CvDocument => Boolean(document))
        .map(({ id, revision, updatedAt }) => ({ id, revision, updatedAt }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateCvDocument(
    id: string,
    input: UpdateCvDocumentInput,
): Promise<CvDocument> {
    if (input.markdown !== undefined && typeof input.markdown !== "string") {
        throw createError({ statusCode: 400, statusMessage: "markdown must be a string" });
    }
    if (input.css !== undefined && typeof input.css !== "string") {
        throw createError({ statusCode: 400, statusMessage: "css must be a string" });
    }
    if ((input.markdown?.length ?? 0) > 500_000 || (input.css?.length ?? 0) > 100_000) {
        throw createError({ statusCode: 413, statusMessage: "CV document is too large" });
    }

    const previousWrite = writes.get(id) ?? Promise.resolve();
    const nextWrite = previousWrite.then(async () => {
        const current = await getCvDocument(id);
        if (
            input.expectedRevision !== undefined
            && input.expectedRevision !== current.revision
        ) {
            throw createError({
                statusCode: 409,
                statusMessage: `Revision conflict: expected ${input.expectedRevision}, current ${current.revision}`,
                data: { document: current },
            });
        }

        const updated: CvDocument = {
            ...current,
            markdown: input.markdown ?? current.markdown,
            css: input.css ?? current.css,
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
        };
        await useStorage("cv").setItem(keyFor(id), updated);
        publishCvUpdate(id, { document: updated, sourceId: input.sourceId });
        return updated;
    });

    writes.set(id, nextWrite.catch(() => undefined));
    return nextWrite;
}

export function subscribeToCv(id: string, listener: Listener): () => void {
    assertCvId(id);
    const documentListeners = listeners.get(id) ?? new Set<Listener>();
    documentListeners.add(listener);
    listeners.set(id, documentListeners);

    return () => {
        documentListeners.delete(listener);
        if (!documentListeners.size) listeners.delete(id);
    };
}

function publishCvUpdate(id: string, update: CvUpdateEvent): void {
    for (const listener of listeners.get(id) ?? []) listener(update);
}

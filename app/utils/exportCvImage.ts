export type CvImageFormat = "png" | "jpeg";

export const safeFilename = (name: string) =>
    name.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "cv";

export interface CvImageExportOptions {
    scale?: number;
    quality?: number;
    root?: HTMLElement | null;
}

const canvasToBlob = (canvas: HTMLCanvasElement, format: CvImageFormat, quality: number) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Image encoding failed")),
        format === "png" ? "image/png" : "image/jpeg",
        quality,
    ));

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

export async function exportCvImages(
    format: CvImageFormat,
    name = "cv",
    _css = "",
    options: CvImageExportOptions = {},
): Promise<void> {
    await document.fonts?.ready;
    const root = options.root ?? document;
    const sheets = [...root.querySelectorAll<HTMLElement>(".cv-sheet")];
    if (!sheets.length) throw new Error("No CV pages are available to export");

    const previewPage = options.root?.closest<HTMLElement>(".preview-page") ?? options.root;
    const previousZoom = previewPage?.style.zoom;
    if (previewPage) previewPage.style.zoom = "1";

    const { default: html2canvas } = await import("html2canvas");
    const extension = format === "png" ? "png" : "jpg";
    const base = safeFilename(name);

    try {
        const blobs: Blob[] = [];
        for (const sheet of sheets) {
            const canvas = await html2canvas(sheet, {
                scale: Math.min(3, Math.max(1, options.scale ?? 2)),
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
            });
            blobs.push(await canvasToBlob(canvas, format, Math.min(1, Math.max(0.5, options.quality ?? 0.95))));
        }

        if (blobs.length > 1) {
            const { default: JSZip } = await import("jszip");
            const zip = new JSZip();
            blobs.forEach((blob, index) => zip.file(`${base}-page-${index + 1}.${extension}`, blob));
            downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
        } else {
            downloadBlob(blobs[0]!, `${base}.${extension}`);
        }
    } finally {
        if (previewPage) previewPage.style.zoom = previousZoom ?? "";
    }
}

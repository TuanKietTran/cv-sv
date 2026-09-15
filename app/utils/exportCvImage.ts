export type CvImageFormat = "png" | "jpeg";

const safeFilename = (name: string) =>
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
        for (const [index, sheet] of sheets.entries()) {
            const canvas = await html2canvas(sheet, {
                scale: Math.min(3, Math.max(1, options.scale ?? 2)),
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
            });
            const blob = await canvasToBlob(canvas, format, Math.min(1, Math.max(0.5, options.quality ?? 0.95)));
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${base}${sheets.length > 1 ? `-page-${index + 1}` : ""}.${extension}`;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1_000);
            if (index < sheets.length - 1) await new Promise((resolve) => setTimeout(resolve, 150));
        }
    } finally {
        if (previewPage) previewPage.style.zoom = previousZoom ?? "";
    }
}

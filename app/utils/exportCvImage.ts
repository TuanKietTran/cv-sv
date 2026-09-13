export type CvImageFormat = "png" | "jpeg";

const safeFilename = (name: string) =>
    name.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "cv";

const canvasToBlob = (canvas: HTMLCanvasElement, format: CvImageFormat) =>
    new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Image encoding failed")),
        format === "png" ? "image/png" : "image/jpeg",
        0.95,
    ));

export async function exportCvImages(
    format: CvImageFormat,
    name = "cv",
    _css = "",
): Promise<void> {
    await document.fonts?.ready;
    const sheets = [...document.querySelectorAll<HTMLElement>(".cv-sheet")];
    if (!sheets.length) throw new Error("No CV pages are available to export");

    const { default: html2canvas } = await import("html2canvas");
    const extension = format === "png" ? "png" : "jpg";
    const base = safeFilename(name);

    for (const [index, sheet] of sheets.entries()) {
        const canvas = await html2canvas(sheet, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
        });
        const blob = await canvasToBlob(canvas, format);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${base}${sheets.length > 1 ? `-page-${index + 1}` : ""}.${extension}`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1_000);
        if (index < sheets.length - 1) await new Promise((resolve) => setTimeout(resolve, 150));
    }
}

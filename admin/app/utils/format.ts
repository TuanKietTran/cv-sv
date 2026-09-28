export const formatMs = (ms: number | null | undefined) =>
   ms === null || ms === undefined ? "—"
   : ms >= 60_000 ? `${(ms / 60_000).toFixed(1)} min`
   : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s`
   : `${ms.toFixed(ms < 10 ? 1 : 0)} ms`;

export const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(ratio && ratio < 0.01 ? 2 : 1)}%`;

export const formatDate = (iso: string | null | undefined) =>
   iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export function errorMessage(error: any, fallback: string): string {
   return error?.data?.statusMessage || error?.statusMessage || error?.message || fallback;
}

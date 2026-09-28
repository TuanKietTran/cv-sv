import { hourlyTotals, metricStorageKey, recentHourKeys, summarizeBuckets } from "@core/analytics/metrics";
import type { HourlyTotal, MetricBucket, MetricKind, MetricSummary } from "@core/analytics/metrics";
import type { CvImportJobProps } from "@core/domain/cv/import";

interface ReadStorage {
   getKeys(base: string): Promise<string[]>;
   getItem<T = unknown>(key: string): Promise<T | null>;
}

export interface MetricReport {
   summary: MetricSummary[];
   hourly: HourlyTotal[];
}

export const METRIC_KINDS: MetricKind[] = ["routes", "cqrs", "users", "tasks"];

export async function readMetrics(storage: ReadStorage, kind: MetricKind, hours: number, now = Date.now()): Promise<MetricReport> {
   const entries = await Promise.all(recentHourKeys(hours, now).map(async hour => ({
      hour,
      bucket: await storage.getItem<MetricBucket>(metricStorageKey(kind, hour)) ?? {},
   })));
   return { summary: summarizeBuckets(entries.map(entry => entry.bucket)), hourly: hourlyTotals(entries) };
}

export interface JobRow {
   id: string;
   ownerId: string;
   state: string;
   stage: string;
   progress: number;
   attempt: number;
   filename: string;
   errorCode: string | null;
   createdAt: string;
   updatedAt: string;
   durationMs: number | null;
}

export interface JobReport {
   total: number;
   byState: Record<string, number>;
   byErrorCode: Record<string, number>;
   avgDurationMs: number | null;
   recent: JobRow[];
}

const FINISHED = new Set(["succeeded", "failed", "cancelled"]);

/** Snapshot of durable CV import jobs straight from ruxt's pipeline storage. */
export async function readJobs(storage: ReadStorage, limit = 50): Promise<JobReport> {
   const keys = await storage.getKeys("imports:");
   const jobs = (await Promise.all(keys.map(key => storage.getItem<CvImportJobProps>(key))))
      .filter((job): job is CvImportJobProps => Boolean(job?.id));
   const byState: Record<string, number> = {};
   const byErrorCode: Record<string, number> = {};
   const durations: number[] = [];
   const rows = jobs.map((job): JobRow => {
      byState[job.state] = (byState[job.state] ?? 0) + 1;
      if (job.error?.code) byErrorCode[job.error.code] = (byErrorCode[job.error.code] ?? 0) + 1;
      const durationMs = FINISHED.has(job.state) ? Date.parse(job.updatedAt) - Date.parse(job.createdAt) : null;
      if (durationMs !== null && Number.isFinite(durationMs)) durations.push(durationMs);
      return {
         id: job.id,
         ownerId: job.ownerId,
         state: job.state,
         stage: job.stage,
         progress: job.progress,
         attempt: job.attempt,
         filename: job.source?.filename ?? "",
         errorCode: job.error?.code ?? null,
         createdAt: job.createdAt,
         updatedAt: job.updatedAt,
         durationMs: durationMs !== null && Number.isFinite(durationMs) ? durationMs : null,
      };
   });
   return {
      total: jobs.length,
      byState,
      byErrorCode,
      avgDurationMs: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
      recent: rows.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, limit),
   };
}

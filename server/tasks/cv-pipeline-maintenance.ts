import { runQueuedCvImports } from "../services/cv-import-worker";

/** Recover durable queued imports after restarts or request-runtime termination. */
export default defineTask({
   meta: {
      name: "cv-pipeline-maintenance",
      description: "Run queued CV extraction jobs",
   },
   async run() {
      const processed = await runQueuedCvImports(2);
      return { result: { processed } };
   },
});

import { readJobs } from "~~/server/lib/analytics";

export default defineEventHandler(() => readJobs(useStorage("cvPipeline")));

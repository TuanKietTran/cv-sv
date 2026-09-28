import { listTemplates } from "~~/server/lib/templates";

export default defineEventHandler(async () => ({ templates: await listTemplates(templateStorage()) }));

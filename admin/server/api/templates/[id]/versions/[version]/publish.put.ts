import { parseVersion, setTemplatePublished } from "~~/server/lib/templates";

export default defineEventHandler(async (event) => {
   const body = await readBody<{ published?: unknown }>(event);
   if (typeof body?.published !== "boolean") {
      throw createError({ statusCode: 400, statusMessage: "published must be a boolean" });
   }
   return templateRequest(() => setTemplatePublished(
      templateStorage(),
      getRouterParam(event, "id") ?? "",
      parseVersion(getRouterParam(event, "version")),
      body.published as boolean,
   ));
});

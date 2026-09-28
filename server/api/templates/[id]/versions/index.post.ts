import { createTemplateVersion } from "~~/server/lib/templates";

export default defineEventHandler(async (event) => {
   const body = await readBody(event);
   const template = await templateRequest(() =>
      createTemplateVersion(templateStorage(), getRouterParam(event, "id") ?? "", body ?? {}));
   setResponseStatus(event, 201);
   return template;
});

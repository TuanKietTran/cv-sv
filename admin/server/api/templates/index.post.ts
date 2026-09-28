import { createTemplate } from "~~/server/lib/templates";

export default defineEventHandler(async (event) => {
   const body = await readBody(event);
   const template = await templateRequest(() => createTemplate(templateStorage(), body ?? {}));
   setResponseStatus(event, 201);
   return template;
});

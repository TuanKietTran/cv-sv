import { deleteTemplateVersion, parseVersion } from "~~/server/lib/templates";

export default defineEventHandler(async (event) => {
   await templateRequest(() => deleteTemplateVersion(
      templateStorage(),
      getRouterParam(event, "id") ?? "",
      parseVersion(getRouterParam(event, "version")),
   ));
   setResponseStatus(event, 204);
   return null;
});

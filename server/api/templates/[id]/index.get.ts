import { getTemplate, parseVersion } from "~~/server/lib/templates";

export default defineEventHandler(event => templateRequest(() => {
   const { version } = getQuery(event);
   return getTemplate(templateStorage(), getRouterParam(event, "id") ?? "", version === undefined ? undefined : parseVersion(version));
}));

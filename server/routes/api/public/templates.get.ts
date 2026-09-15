import { useMediator } from "@core/cqrs";
import { listCvTemplatesQuery } from "@core/handlers/list-cv-templates";
import type { CvTemplate } from "@core/domain/cv";

/** Public catalog. Visibility is read from each persisted template's data tags. */
export default defineEventHandler(async () => {
   const templates = await sendApiRequest<CvTemplate[]>(useMediator(), listCvTemplatesQuery());
   return { templates: templates.filter(template => template.tags.includes("public")) };
});

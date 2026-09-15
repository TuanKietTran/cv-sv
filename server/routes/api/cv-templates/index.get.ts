import { useMediator } from "@core/cqrs";
import { listCvTemplatesQuery } from "@core/handlers/list-cv-templates";
import { requireCvOwner } from "../../../utils/cv-owner";

export default defineEventHandler(async (event) => {
   await requireCvOwner(event);
   const templates = await sendApiRequest<any[]>(useMediator(), listCvTemplatesQuery());
   return { templates };
});

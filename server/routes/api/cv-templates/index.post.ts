import { useMediator } from "@core/cqrs";
import { saveCvTemplateCommand } from "@core/handlers/save-cv-template";
import type { CvTemplate } from "@core/domain/cv";
import { requireCvOwner } from "../../../utils/cv-owner";

export default defineEventHandler(async (event) => {
   await requireCvOwner(event);
   const body = await readBody<{ name?: string; markdownSkeleton?: string; css?: string; overrideId?: string }>(event);
   const template = await sendApiRequest<CvTemplate>(useMediator(), saveCvTemplateCommand({
      name: body?.name ?? "",
      markdownSkeleton: body?.markdownSkeleton as string,
      css: body?.css as string,
      overrideId: body?.overrideId || undefined,
   }));
   setResponseStatus(event, 201);
   return template;
});

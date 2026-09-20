import { createHandler, useMediator } from "../cqrs";
import { CvTemplate } from "../domain/cv/template";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export interface SaveCvTemplateInput {
   name: string;
   markdownSkeleton: string;
   css: string;
   /** Existing local template id; saves its next immutable version instead of a new template. */
   overrideId?: string;
}

export function saveCvTemplateCommand(input: SaveCvTemplateInput) {
   return { _type: "command" as const, requestName: "SaveCvTemplate", payload: input };
}

export function createSaveCvTemplateHandler(
   repo: CvTemplateRepository,
   options: { now?: () => string; createId?: () => string } = {},
) {
   const now = options.now ?? (() => new Date().toISOString());
   const createId = options.createId ?? (() => `local-${crypto.randomUUID()}`);

   return createHandler<SaveCvTemplateInput, CvTemplate>("SaveCvTemplate", async ({ name, markdownSkeleton, css, overrideId }) => {
      if (typeof markdownSkeleton !== "string" || typeof css !== "string") {
         throw new Error("markdownSkeleton and css are required");
      }
      if (markdownSkeleton.length > 500_000 || css.length > 100_000) throw new Error("CV template is too large");
      const normalizedName = typeof name === "string" ? name.trim().slice(0, 120) : "";
      if (!normalizedName) throw new Error("CV template name is required");

      if (overrideId) {
         const current = await repo.get(overrideId);
         if (!current) throw new Error("CV template not found");
         if (current.builtIn || !current.tags.includes("local")) {
            throw new Error("Built-in or public CV templates cannot be overridden");
         }
         const next = CvTemplate.create({
            ...current.toJSON(),
            version: current.version + 1,
            name: normalizedName,
            markdownSkeleton,
            css,
            createdAt: now(),
         });
         await repo.save(next);
         return { success: true, data: next };
      }

      const template = CvTemplate.create({
         id: createId(),
         version: 1,
         name: normalizedName,
         markdownSkeleton,
         css,
         capabilities: { pageFormats: ["A4"], supportsPhoto: false, atsFriendly: true },
         builtIn: false,
         tags: ["local"],
         createdAt: now(),
      });
      await repo.save(template);
      return { success: true, data: template };
   });
}

export function registerSaveCvTemplate(repo: CvTemplateRepository) {
   useMediator().registerCommand(createSaveCvTemplateHandler(repo));
}

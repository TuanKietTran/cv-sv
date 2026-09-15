import { createHandler, useMediator } from "../cqrs";
import type { CvTemplate } from "../domain/cv/template";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export function getCvTemplateQuery(input: { id: string; version?: number }) {
   return { _type: "query" as const, requestName: "GetCvTemplate", payload: input };
}

export function createGetCvTemplateHandler(repo: CvTemplateRepository) {
   return createHandler<{ id: string; version?: number }, CvTemplate>("GetCvTemplate", async ({ id, version }) => {
      const template = await repo.get(id, version);
      if (!template) throw new Error("CV template not found");
      return { success: true, data: template };
   });
}

export function registerGetCvTemplate(repo: CvTemplateRepository) {
   useMediator().registerQuery(createGetCvTemplateHandler(repo));
}

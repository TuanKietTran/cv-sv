import { createHandler, useMediator } from "../cqrs";
import type { CvTemplate } from "../domain/cv/template";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export function listCvTemplatesQuery() {
   return { _type: "query" as const, requestName: "ListCvTemplates", payload: undefined };
}

export function createListCvTemplatesHandler(repo: CvTemplateRepository) {
   return createHandler<void, CvTemplate[]>("ListCvTemplates", async () => ({ success: true, data: await repo.list() }));
}

export function registerListCvTemplates(repo: CvTemplateRepository) {
   useMediator().registerQuery(createListCvTemplatesHandler(repo));
}

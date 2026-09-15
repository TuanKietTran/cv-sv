import { createHandler, useMediator } from "../cqrs";
import type { CvDocumentPort, CvDocumentRecord } from "../repos/cv-document.repo";

export interface CreateCvDocumentInput {
   id: string;
   title?: string;
   markdown: string;
   css: string;
   sourceId?: string;
}

export function createCvDocumentCommand(input: CreateCvDocumentInput) {
   return { _type: "command" as const, requestName: "CreateCvDocument", payload: input };
}

export function createCvDocumentHandler(repo: CvDocumentPort) {
   return createHandler<CreateCvDocumentInput, CvDocumentRecord>("CreateCvDocument", async ({ id, ...input }) => ({
      success: true,
      data: await repo.createCvDocument(id, input),
   }));
}

export function registerCreateCvDocument(repo: CvDocumentPort) {
   useMediator().registerCommand(createCvDocumentHandler(repo));
}

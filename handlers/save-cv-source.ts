import { createHandler, useMediator } from "../cqrs";
import type { CvDocumentPort, CvDocumentRecord } from "../repos/cv-document.repo";

export interface SaveCvSourceInput {
   id: string;
   markdown?: string;
   css?: string;
   expectedRevision?: number;
   sourceId?: string;
}

export function createSaveCvSourceHandler(repo: CvDocumentPort) {
   return createHandler<SaveCvSourceInput, CvDocumentRecord>(
      "SaveCvSource",
      async ({ id, ...input }) => ({ success: true, data: await repo.updateCvDocument(id, input) }),
   );
}

export function saveCvSourceCommand(input: SaveCvSourceInput) {
   return { _type: "command" as const, requestName: "SaveCvSource", payload: input };
}

export function registerSaveCvSource(repo: CvDocumentPort) {
   useMediator().registerCommand(createSaveCvSourceHandler(repo));
}

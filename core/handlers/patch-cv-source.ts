import { createHandler, useMediator } from "../cqrs";
import type { CvDocumentPort, CvDocumentRecord } from "../repos/cv-document.repo";

export interface PatchCvSourceInput {
   id: string;
   target: "markdown" | "css";
   oldText: string;
   newText: string;
   expectedRevision?: number;
   sourceId?: string;
}

export function createPatchCvSourceHandler(repo: CvDocumentPort) {
   return createHandler<PatchCvSourceInput, CvDocumentRecord>(
      "PatchCvSource",
      async ({ id, target, oldText, newText, expectedRevision, sourceId }) => {
         const document = await repo.getCvDocument(id);
         const occurrences = document[target].split(oldText).length - 1;
         if (occurrences !== 1) {
            return {
               success: false,
               error: `oldText must match exactly once; found ${occurrences} matches`,
            };
         }

         const updated = await repo.updateCvDocument(id, {
            [target]: document[target].replace(oldText, newText),
            expectedRevision: expectedRevision ?? document.revision,
            sourceId,
         });
         return { success: true, data: updated };
      },
   );
}

export function patchCvSourceCommand(input: PatchCvSourceInput) {
   return { _type: "command" as const, requestName: "PatchCvSource", payload: input };
}

export function registerPatchCvSource(repo: CvDocumentPort) {
   useMediator().registerCommand(createPatchCvSourceHandler(repo));
}

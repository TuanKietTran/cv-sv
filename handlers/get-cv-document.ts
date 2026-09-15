import { createHandler, useMediator } from "../cqrs";
import type { CvDocumentPort, CvDocumentRecord } from "../repos/cv-document.repo";

export interface GetCvDocumentInput {
   id: string;
}

export function createGetCvDocumentHandler(repo: CvDocumentPort) {
   return createHandler<GetCvDocumentInput, CvDocumentRecord>(
      "GetCvDocument",
      async ({ id }) => ({ success: true, data: await repo.getCvDocument(id) }),
   );
}

export function getCvDocumentQuery(input: GetCvDocumentInput) {
   return { _type: "query" as const, requestName: "GetCvDocument", payload: input };
}

export function registerGetCvDocument(repo: CvDocumentPort) {
   useMediator().registerQuery(createGetCvDocumentHandler(repo));
}

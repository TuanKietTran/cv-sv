import { createHandler, useMediator } from "../cqrs";
import type { CvDocumentPort, CvDocumentSummary } from "../repos/cv-document.repo";

export function createListCvDocumentsHandler(repo: CvDocumentPort) {
   return createHandler<void, CvDocumentSummary[]>(
      "ListCvDocuments",
      async () => ({ success: true, data: await repo.listCvDocuments() }),
   );
}

export function listCvDocumentsQuery() {
   return { _type: "query" as const, requestName: "ListCvDocuments", payload: undefined };
}

export function registerListCvDocuments(repo: CvDocumentPort) {
   useMediator().registerQuery(createListCvDocumentsHandler(repo));
}

export interface CvDocumentRecord {
   id: string;
   title?: string;
   markdown: string;
   css: string;
   revision: number;
   updatedAt: string;
}

export interface CvDocumentSummary {
   id: string;
   title?: string;
   revision: number;
   updatedAt: string;
}

export interface UpdateCvDocumentInput {
   title?: string;
   markdown?: string;
   css?: string;
   expectedRevision?: number;
   sourceId?: string;
}

/** Port implemented by the Nitro-owned fs-backed CV document store. */
export interface CvDocumentPort {
   listCvDocuments(): Promise<CvDocumentSummary[]>;
   getCvDocument(id: string): Promise<CvDocumentRecord>;
   createCvDocument(id: string, input: Pick<UpdateCvDocumentInput, "title" | "markdown" | "css" | "sourceId">): Promise<CvDocumentRecord>;
   removeCvDocument(id: string): Promise<void>;
   updateCvDocument(id: string, input: UpdateCvDocumentInput): Promise<CvDocumentRecord>;
}

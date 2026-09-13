export interface CvDocument {
    id: string;
    markdown: string;
    css: string;
    revision: number;
    updatedAt: string;
}

export interface UpdateCvDocumentInput {
    markdown?: string;
    css?: string;
    expectedRevision?: number;
    sourceId?: string;
}

export interface CvDocumentSummary {
    id: string;
    revision: number;
    updatedAt: string;
}

export interface CvUpdateEvent {
    document: CvDocument;
    sourceId?: string;
}

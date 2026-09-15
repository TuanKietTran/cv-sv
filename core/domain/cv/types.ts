export interface CvIdentity {
   fullName: string;
   headline: string;
   summary: string;
   location: string;
}

export type CvContactKind = "email" | "phone" | "linkedin" | "github" | "website" | "other";

export interface CvContact {
   kind: CvContactKind;
   label: string;
   value: string;
}

export interface CvExperience {
   title: string;
   company: string;
   location: string;
   start: string;
   end: string;
   highlights: string[];
}

export interface CvSkillGroup {
   name: string;
   skills: string[];
}

export interface CvCertification { name: string }

export interface CvEducation {
   degree: string;
   school: string;
   location: string;
   start: string;
   end: string;
   details: string;
}

export interface CvProject {
   name: string;
   url: string;
   description: string;
   technologies: string[];
}

export interface CvSourceReference {
   artifactId: string;
   filename: string;
   pageCount: number;
   extractedAt: string;
   rawTextArtifactId?: string;
}

// ── Props interfaces ─────────────────────────────────────────────────────────

export interface CvProfileProps {
   version: number;
   identity: CvIdentity;
   contacts: CvContact[];
   experiences: CvExperience[];
   skills: CvSkillGroup[];
   certifications: CvCertification[];
   education: CvEducation[];
   projects: CvProject[];
   languages: string[];
}

export interface CvConceptProps {
   schemaVersion: 1;
   profile: CvProfileProps;
   source: CvSourceReference;
}

export interface CvDocumentProps {
   id: string;
   title?: string;
   markdown: string;
   css: string;
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

export interface CvDocumentSummary {
   id: string;
   title?: string;
   revision: number;
   updatedAt: string;
}

export interface CvUpdateEvent {
   document: CvDocumentProps;
   sourceId?: string;
}

export interface CvTemplateCapabilities {
   pageFormats: string[];
   supportsPhoto: boolean;
   atsFriendly: boolean;
}

export interface CvTemplateProps {
   id: string;
   version: number;
   name: string;
   markdownSkeleton: string;
   css: string;
   capabilities: CvTemplateCapabilities;
   builtIn: boolean;
   /** Data-owned discovery and visibility labels (for example, "public"). */
   tags: string[];
   createdAt: string;
}

export interface CvTemplateReference {
   id: string;
   version: number;
}

export const CV_IMPORT_STATES = [
   "queued",
   "running",
   "awaiting_input",
   "succeeded",
   "failed",
   "cancelled",
] as const;

export type CvImportState = typeof CV_IMPORT_STATES[number];

export type CvImportErrorCode =
   | "EMPTY_OR_UNREADABLE"
   | "NOT_CV_ALIKE"
   | "UNSUPPORTED_MEDIA_TYPE"
   | "FILE_TOO_LARGE"
   | "EXTRACTION_UNAVAILABLE"
   | "EXTRACTION_FAILED";

export interface CvSourceArtifact {
   id: string;
   filename: string;
   mediaType: string;
   size: number;
   checksum: string;
   createdAt: string;
   expiresAt: string;
}

export interface CvGeneratedArtifact {
   id: string;
   kind: "concept" | "markdown" | "css" | "html" | "raw-text";
   mediaType: string;
   size: number;
   checksum: string;
   createdAt: string;
   expiresAt: string;
}

export interface CvImportError {
   code: CvImportErrorCode;
   message: string;
   reasons?: string[];
}

export interface CvImportJobProps {
   id: string;
   ownerId: string;
   template: { id: string; version: number };
   state: CvImportState;
   progress: number;
   stage: string;
   source: CvSourceArtifact;
   artifacts: CvGeneratedArtifact[];
   warnings: string[];
   error?: CvImportError;
   cancelRequested: boolean;
   attempt: number;
   idempotencyKey?: string;
   createdAt: string;
   updatedAt: string;
}

export interface CvImportPreview {
   importId: string;
   state: CvImportState;
   concept: unknown;
   markdown: string;
   css: string;
   warnings: string[];
   confidence?: number;
}

export interface CvPipelineCapabilities {
   available: boolean;
   formats: string[];
   maxUploadBytes: number;
   ocr: boolean;
   renderer: "cv-pipeline";
   degradedReason?: string;
}

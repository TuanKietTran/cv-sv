import type { CvPipelineCapabilities } from "../domain/cv/import";

export interface CvExtractionResult {
   accepted: boolean;
   concept: unknown;
   markdown: string;
   css: string;
   html: string;
   rawText: string;
   confidence?: number;
   warnings: string[];
   rejection?: {
      code: "EMPTY_OR_UNREADABLE" | "NOT_CV_ALIKE";
      message: string;
      reasons?: string[];
   };
}

export interface CvExtractor {
   capabilities(): Promise<CvPipelineCapabilities>;
   extract(input: {
      bytes: Uint8Array;
      filename: string;
      signal: AbortSignal;
      onProgress: (progress: number, stage: string) => Promise<void>;
   }): Promise<CvExtractionResult>;
}

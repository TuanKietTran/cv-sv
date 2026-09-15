import type { CvImportJob } from "../domain/cv/import";

export interface CvImportRepository {
   get(id: string, ownerId: string): Promise<CvImportJob | null>;
   getByIdempotencyKey(ownerId: string, key: string): Promise<CvImportJob | null>;
   listRunnable(limit: number): Promise<CvImportJob[]>;
   save(job: CvImportJob): Promise<void>;
}

export interface CvArtifactRepository {
   putSource(input: {
      ownerId: string;
      filename: string;
      mediaType: string;
      bytes: Uint8Array;
      expiresAt: string;
   }): Promise<CvImportJob["source"]>;
   putGenerated(input: {
      ownerId: string;
      importId: string;
      kind: CvImportJob["artifacts"][number]["kind"];
      mediaType: string;
      bytes: Uint8Array;
      expiresAt: string;
   }): Promise<CvImportJob["artifacts"][number]>;
   read(id: string, ownerId: string): Promise<Uint8Array | null>;
}

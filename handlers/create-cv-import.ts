import { createHandler, useMediator } from "../cqrs";
import { CvImportJob } from "../domain/cv/import";
import type { CvSourceArtifact } from "../domain/cv/import";
import type { CvImportRepository } from "../repos/cv-import.repo";

export interface CreateCvImportInput {
   ownerId: string;
   source: CvSourceArtifact;
   template: { id: string; version: number };
   idempotencyKey?: string;
}

export function createCvImportCommand(input: CreateCvImportInput) {
   return { _type: "command" as const, requestName: "CreateCvImport", payload: input };
}

export function createCreateCvImportHandler(repo: CvImportRepository) {
   return createHandler<CreateCvImportInput, CvImportJob>("CreateCvImport", async (input) => {
      if (input.idempotencyKey) {
         const existing = await repo.getByIdempotencyKey(input.ownerId, input.idempotencyKey);
         if (existing) return { success: true, data: existing };
      }
      const now = new Date().toISOString();
      const job = CvImportJob.create({
         id: crypto.randomUUID(), ownerId: input.ownerId, template: input.template,
         state: "queued", progress: 0, stage: "queued", source: input.source,
         artifacts: [], warnings: [], cancelRequested: false, attempt: 1,
         idempotencyKey: input.idempotencyKey, createdAt: now, updatedAt: now,
      });
      await repo.save(job);
      return { success: true, data: job };
   });
}

export function registerCreateCvImport(repo: CvImportRepository) {
   useMediator().registerCommand(createCreateCvImportHandler(repo));
}

import type { CvImportJob } from "../domain/cv/import";
import type { CvArtifactRepository, CvImportRepository } from "../repos/cv-import.repo";

export async function requireCvImport(repo: CvImportRepository, id: string, ownerId: string) {
   const job = await repo.get(id, ownerId);
   if (!job) throw new Error("CV import not found");
   return job;
}

export async function readCvArtifactText(
   artifacts: CvArtifactRepository,
   job: CvImportJob,
   kind: CvImportJob["artifacts"][number]["kind"],
): Promise<string> {
   const metadata = job.artifacts.find((item) => item.kind === kind);
   if (!metadata) throw new Error(`CV import ${kind} artifact not found`);
   const bytes = await artifacts.read(metadata.id, job.ownerId);
   if (!bytes) throw new Error(`CV import ${kind} artifact not found`);
   return new TextDecoder().decode(bytes);
}

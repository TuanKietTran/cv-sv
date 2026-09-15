import { createHandler, useMediator } from "../cqrs";
import type { CvApplication } from "../domain/cv/application";
import type { CvApplicationRepository } from "../repos/cv-application.repo";

export function getCvApplicationQuery(input: { id: string; ownerId: string }) {
   return { _type: "query" as const, requestName: "GetCvApplication", payload: input };
}

export function createGetCvApplicationHandler(repo: CvApplicationRepository) {
   return createHandler<{ id: string; ownerId: string }, CvApplication>("GetCvApplication", async ({ id, ownerId }) => {
      const application = await repo.get(id, ownerId);
      if (!application) throw new Error("CV application not found");
      return { success: true, data: application };
   });
}

export function registerGetCvApplication(repo: CvApplicationRepository) {
   useMediator().registerQuery(createGetCvApplicationHandler(repo));
}

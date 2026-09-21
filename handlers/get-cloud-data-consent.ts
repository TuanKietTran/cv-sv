import { createHandler, useMediator } from "../cqrs";
import { projectCloudDataConsent, type CloudDataConsentView } from "../domain/cloud-data/consent";
import type { CloudConsentRepository } from "../repos/cloud-consent.repo";

export interface GetCloudDataConsentInput {
   userId: string;
}

export function createGetCloudDataConsentHandler(repo: CloudConsentRepository) {
   return createHandler<GetCloudDataConsentInput, CloudDataConsentView>(
      "GetCloudDataConsent",
      async ({ userId }) => {
         if (!userId?.trim()) return { success: false, error: "User id is required" };
         const states = await repo.listCurrent(userId);
         return { success: true, data: projectCloudDataConsent(states) };
      },
   );
}

export function getCloudDataConsentQuery(input: GetCloudDataConsentInput) {
   return {
      _type: "query" as const,
      requestName: "GetCloudDataConsent",
      payload: input,
   };
}

export function registerGetCloudDataConsent(repo: CloudConsentRepository) {
   useMediator().registerQuery(createGetCloudDataConsentHandler(repo));
}

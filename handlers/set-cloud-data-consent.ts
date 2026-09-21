import { createHandler, useMediator } from "../cqrs";
import {
   CLOUD_DATA_POLICY_VERSION,
   isCloudDataCategory,
   projectCloudDataConsent,
   type CloudDataCategory,
   type CloudDataConsentView,
   type CloudConsentEvent,
} from "../domain/cloud-data/consent";
import type { CloudConsentRepository } from "../repos/cloud-consent.repo";

export interface SetCloudDataConsentInput {
   userId: string;
   category: CloudDataCategory;
   granted: boolean;
}

export interface CloudConsentHandlerDependencies {
   now(): Date;
   newId(): string;
}

const defaults: CloudConsentHandlerDependencies = {
   now: () => new Date(),
   newId: () => crypto.randomUUID(),
};

export function createSetCloudDataConsentHandler(
   repo: CloudConsentRepository,
   dependencies: CloudConsentHandlerDependencies = defaults,
) {
   return createHandler<SetCloudDataConsentInput, CloudDataConsentView>(
      "SetCloudDataConsent",
      async ({ userId, category, granted }) => {
         if (!userId?.trim()) return { success: false, error: "User id is required" };
         if (!isCloudDataCategory(category)) return { success: false, error: "Invalid cloud data category" };
         if (typeof granted !== "boolean") return { success: false, error: "Granted must be a boolean" };

         const changedAt = dependencies.now().toISOString();
         const state = {
            ownerId: userId,
            category,
            granted,
            policyVersion: CLOUD_DATA_POLICY_VERSION,
            changedAt,
         };
         const event: CloudConsentEvent = {
            ...state,
            id: dependencies.newId(),
            actorUserId: userId,
         };
         await repo.saveChange(state, event);

         return {
            success: true,
            data: projectCloudDataConsent(await repo.listCurrent(userId)),
         };
      },
   );
}

export function setCloudDataConsentCommand(input: SetCloudDataConsentInput) {
   return {
      _type: "command" as const,
      requestName: "SetCloudDataConsent",
      payload: input,
   };
}

export function registerSetCloudDataConsent(repo: CloudConsentRepository) {
   useMediator().registerCommand(createSetCloudDataConsentHandler(repo));
}

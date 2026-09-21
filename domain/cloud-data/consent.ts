export const CLOUD_DATA_POLICY_VERSION = "2026-09-20" as const;

export const CLOUD_DATA_CATEGORIES = ["cloudSessions", "cloudTemplates"] as const;
export type CloudDataCategory = (typeof CLOUD_DATA_CATEGORIES)[number];

export interface CloudConsentCategoryState {
   ownerId: string;
   category: CloudDataCategory;
   granted: boolean;
   policyVersion: string;
   changedAt: string;
}

export interface CloudConsentEvent extends CloudConsentCategoryState {
   id: string;
   actorUserId: string;
}

export interface CloudDataConsentView {
   policyVersion: typeof CLOUD_DATA_POLICY_VERSION;
   cloudSessions: {
      granted: boolean;
      changedAt: string | null;
   };
   cloudTemplates: {
      granted: boolean;
      changedAt: string | null;
   };
}

export function isCloudDataCategory(value: unknown): value is CloudDataCategory {
   return typeof value === "string" && CLOUD_DATA_CATEGORIES.includes(value as CloudDataCategory);
}

export function projectCloudDataConsent(states: CloudConsentCategoryState[]): CloudDataConsentView {
   const stateByCategory = new Map(states.map(state => [state.category, state]));
   const project = (category: CloudDataCategory) => {
      const state = stateByCategory.get(category);
      const currentPolicy = state?.policyVersion === CLOUD_DATA_POLICY_VERSION;
      return {
         granted: currentPolicy ? state.granted : false,
         changedAt: state?.changedAt ?? null,
      };
   };

   return {
      policyVersion: CLOUD_DATA_POLICY_VERSION,
      cloudSessions: project("cloudSessions"),
      cloudTemplates: project("cloudTemplates"),
   };
}

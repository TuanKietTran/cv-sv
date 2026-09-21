import type {
   CloudConsentCategoryState,
   CloudConsentEvent,
} from "../domain/cloud-data/consent";

export interface CloudConsentRepository {
   listCurrent(ownerId: string): Promise<CloudConsentCategoryState[]>;
   saveChange(state: CloudConsentCategoryState, event: CloudConsentEvent): Promise<void>;
   listEvents(ownerId: string): Promise<CloudConsentEvent[]>;
}

import type { CvApplication } from "../domain/cv/application";

/** Persists composed CV applications, never standalone profiles. */
export interface CvApplicationRepository {
   create(application: CvApplication): Promise<void>;
   get(id: string, ownerId: string): Promise<CvApplication | null>;
}

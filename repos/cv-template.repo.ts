import type { CvTemplate } from "../domain/cv/template";

export interface CvTemplateRepository {
   list(): Promise<CvTemplate[]>;
   get(id: string, version?: number): Promise<CvTemplate | null>;
   save(template: CvTemplate): Promise<void>;
}

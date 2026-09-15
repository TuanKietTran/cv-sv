import type { CvApplicationRepository } from "@core/repos/cv-application.repo";
import { CvApplication, type CvApplicationProps } from "@core/domain/cv/application";
import { CvTemplate } from "@core/domain/cv/template";
import { CvProfile } from "@core/domain/cv/concept";

const key = (id: string) => `applications:${id}`;

function hydrate(raw: CvApplicationProps): CvApplication {
   return CvApplication.create({
      ...raw,
      template: { ...raw.template, value: CvTemplate.create(raw.template.value as any) },
      profile: { ...raw.profile, value: CvProfile.create(raw.profile.value as any) },
   });
}

export const cvApplicationRepo: CvApplicationRepository = {
   async create(application) {
      const storage = useStorage("cvPipeline");
      if (await storage.getItem(key(application.id))) throw new Error("CV application already exists");
      await storage.setItem(key(application.id), application.toJSON());
   },
   async get(id, ownerId) {
      const raw = await useStorage("cvPipeline").getItem<CvApplicationProps>(key(id));
      if (!raw || raw.ownerId !== ownerId) return null;
      return hydrate(raw);
   },
};

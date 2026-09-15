import { createHandler, useMediator } from "../cqrs";
import { CvTemplate } from "../domain/cv/template";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export interface CloneCvTemplateInput {
   id: string;
   version?: number;
   newId: string;
}

export function cloneCvTemplateCommand(input: CloneCvTemplateInput) {
   return { _type: "command" as const, requestName: "CloneCvTemplate", payload: input };
}

export function createCloneCvTemplateHandler(repo: CvTemplateRepository) {
   return createHandler<CloneCvTemplateInput, CvTemplate>("CloneCvTemplate", async ({ id, version, newId }) => {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(newId)) throw new Error("Invalid CV template id");
      const source = await repo.get(id, version);
      if (!source) throw new Error("CV template not found");
      const clone = CvTemplate.create({
         ...source.toJSON(),
         id: newId,
         version: 1,
         name: `${source.name} (Local)`,
         tags: ["local"],
         builtIn: false,
         createdAt: new Date().toISOString(),
      });
      await repo.save(clone);
      return { success: true, data: clone };
   });
}

export function registerCloneCvTemplate(repo: CvTemplateRepository) {
   useMediator().registerCommand(createCloneCvTemplateHandler(repo));
}

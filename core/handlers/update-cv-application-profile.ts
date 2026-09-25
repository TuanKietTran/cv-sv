import { createHandler, useMediator } from "../cqrs";
import { CvApplication } from "../domain/cv/application";
import { CvProfile } from "../domain/cv/concept";
import type { CvProfileProps, CvTemplateReference } from "../domain/cv/types";
import type { CvApplicationRepository } from "../repos/cv-application.repo";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export interface UpdateCvApplicationProfileInput {
   id: string;
   ownerId: string;
   profile: CvProfileProps;
   /** Stable id of the profile snapshot source; defaults to the current snapshot id. */
   profileId?: string;
   /** Re-pin the application to this template version. */
   template?: CvTemplateReference;
   expectedRevision?: number;
}

/** `null` when the document has no application for this owner; nothing is written. */
export type UpdateCvApplicationProfileOutput = CvApplication | null;

export function updateCvApplicationProfileCommand(input: UpdateCvApplicationProfileInput) {
   return { _type: "command" as const, requestName: "UpdateCvApplicationProfile", payload: input };
}

export function createUpdateCvApplicationProfileHandler(
   deps: { applications: CvApplicationRepository; templates: CvTemplateRepository },
   options: { now?: () => string } = {},
) {
   const now = options.now ?? (() => new Date().toISOString());
   return createHandler<UpdateCvApplicationProfileInput, UpdateCvApplicationProfileOutput>(
      "UpdateCvApplicationProfile",
      async ({ id, ownerId, profile, profileId, template, expectedRevision }) => {
         const current = await deps.applications.get(id, ownerId);
         if (!current) return { success: true, data: null };
         const expected = expectedRevision ?? current.revision;

         let templateSnapshot = current.template;
         if (template && (template.id !== current.template.ref.id || template.version !== current.template.ref.version)) {
            const value = await deps.templates.get(template.id, template.version);
            if (!value) throw new Error("CV template not found");
            templateSnapshot = { ref: { id: value.id, version: value.version }, value };
         }

         const next = CvApplication.create({
            ...current.toJSON(),
            revision: expected + 1,
            template: templateSnapshot,
            profile: {
               ref: { id: profileId?.trim() || current.profile.ref.id, version: profile.version },
               value: CvProfile.create(profile),
            },
            updatedAt: now(),
         });
         await deps.applications.update(next, expected);
         return { success: true, data: next };
      },
   );
}

export function registerUpdateCvApplicationProfile(deps: Parameters<typeof createUpdateCvApplicationProfileHandler>[0]) {
   useMediator().registerCommand(createUpdateCvApplicationProfileHandler(deps));
}

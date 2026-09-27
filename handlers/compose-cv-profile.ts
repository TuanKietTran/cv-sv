import { createHandler, useMediator } from "../cqrs";
import { CvProfile } from "../domain/cv/concept";
import { composeCvMarkdown, normalizeCvProfile } from "../domain/cv/compose";
import { toCvTemplateSkeleton } from "../domain/cv/split";
import type { CvProfileProps, CvTemplateReference } from "../domain/cv/types";
import type { CvDocumentPort } from "../repos/cv-document.repo";
import type { CvTemplateRepository } from "../repos/cv-template.repo";

export interface ComposeCvProfileInput {
   /** Untrusted profile payload; missing collections are treated as empty. */
   profile: unknown;
   /** Compose into this template version (latest when `version` is omitted). */
   template?: { id: string; version?: number };
   /** Compose into the skeleton of this session's current Markdown. */
   documentId?: string;
   /** Session source already read by the caller; wins over `documentId`. */
   source?: { markdown: string; css: string; revision?: number };
   /** Restrict template lookup to `public`-tagged templates (anonymous callers). */
   publicOnly?: boolean;
}

export interface ComposeCvProfileOutput {
   markdown: string;
   css: string;
   profile: CvProfileProps;
   /** Template the output was composed from; absent when the session was the skeleton. */
   template?: CvTemplateReference;
   /** Session revision the skeleton was inferred from, when a session was used. */
   basedOnRevision?: number;
}

export function composeCvProfileQuery(input: ComposeCvProfileInput) {
   return { _type: "query" as const, requestName: "ComposeCvProfile", payload: input };
}

export function parseCvProfileInput(raw: unknown): CvProfileProps {
   const profile = normalizeCvProfile(raw);
   try {
      return CvProfile.create(profile).toJSON();
   } catch (error: any) {
      throw new Error(`Invalid profile: ${error?.message ?? "malformed"}`);
   }
}

export function createComposeCvProfileHandler(deps: { documents: CvDocumentPort; templates: CvTemplateRepository }) {
   return createHandler<ComposeCvProfileInput, ComposeCvProfileOutput>("ComposeCvProfile", async (input) => {
      const profile = parseCvProfileInput(input.profile);

      if (input.template?.id) {
         const template = await deps.templates.get(input.template.id, input.template.version);
         if (!template || (input.publicOnly && !template.tags.includes("public"))) throw new Error("CV template not found");
         return {
            success: true,
            data: {
               markdown: composeCvMarkdown(template.markdownSkeleton, profile),
               css: template.css,
               profile,
               template: { id: template.id, version: template.version },
            },
         };
      }

      const source = input.source ?? (input.documentId ? await deps.documents.getCvDocument(input.documentId) : undefined);
      if (!source) throw new Error("documentId or template is required");
      if (typeof source.markdown !== "string" || typeof source.css !== "string") throw new Error("source markdown and css are required");
      return {
         success: true,
         data: {
            markdown: composeCvMarkdown(toCvTemplateSkeleton(source.markdown), profile),
            css: source.css,
            profile,
            basedOnRevision: source.revision,
         },
      };
   });
}

export function registerComposeCvProfile(deps: Parameters<typeof createComposeCvProfileHandler>[0]) {
   useMediator().registerQuery(createComposeCvProfileHandler(deps));
}

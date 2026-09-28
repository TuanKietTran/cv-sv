import type { CvTemplateCapabilities } from "@core/domain/cv/types";

export interface TemplateEditorDraft {
   id: string;
   name: string;
   markdownSkeleton: string;
   css: string;
   tags: string;
   pageFormats: string;
   supportsPhoto: boolean;
   atsFriendly: boolean;
}

export const EMPTY_TEMPLATE_MARKDOWN = ":::resume\n\n# YOUR NAME {.cv-name}\n\nProfessional summary.\n\n## Experience\n\n:::\n";

export function createTemplateDraft(overrides: Partial<TemplateEditorDraft> = {}): TemplateEditorDraft {
   return {
      id: "",
      name: "",
      markdownSkeleton: EMPTY_TEMPLATE_MARKDOWN,
      css: ".resume {\n  width: 210mm;\n  min-height: 297mm;\n  padding: 18mm;\n  background: white;\n  color: #1f2937;\n}\n",
      tags: "",
      pageFormats: "A4",
      supportsPhoto: false,
      atsFriendly: true,
      ...overrides,
   };
}

const stringList = (value: unknown) => Array.isArray(value)
   ? value.filter((item): item is string => typeof item === "string").join(", ")
   : typeof value === "string" ? value : undefined;

/** Convert a JSON template bundle into editor fields. Unknown fields are ignored. */
export function templateDraftFromJson(value: unknown): Partial<TemplateEditorDraft> {
   if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The JSON file must contain a template object.");
   const input = value as Record<string, unknown>;
   const capabilities = input.capabilities && typeof input.capabilities === "object"
      ? input.capabilities as Partial<CvTemplateCapabilities>
      : {};
   const draft: Partial<TemplateEditorDraft> = {};
   if (typeof input.id === "string") draft.id = input.id;
   if (typeof input.name === "string") draft.name = input.name;
   const markdown = input.markdownSkeleton ?? input.markdown ?? input.content;
   if (typeof markdown === "string") draft.markdownSkeleton = markdown;
   if (typeof input.css === "string") draft.css = input.css;
   const tags = stringList(input.tags);
   if (tags !== undefined) draft.tags = tags;
   const pageFormats = stringList(capabilities.pageFormats ?? input.pageFormats);
   if (pageFormats !== undefined) draft.pageFormats = pageFormats;
   if (typeof capabilities.supportsPhoto === "boolean") draft.supportsPhoto = capabilities.supportsPhoto;
   if (typeof capabilities.atsFriendly === "boolean") draft.atsFriendly = capabilities.atsFriendly;
   return draft;
}

export async function templateDraftFromFiles(files: Iterable<File>): Promise<Partial<TemplateEditorDraft>> {
   const draft: Partial<TemplateEditorDraft> = {};
   let recognized = 0;
   for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "md" || extension === "markdown") {
         draft.markdownSkeleton = await file.text();
         recognized++;
      } else if (extension === "css") {
         draft.css = await file.text();
         recognized++;
      } else if (extension === "json") {
         Object.assign(draft, templateDraftFromJson(JSON.parse(await file.text())));
         recognized++;
      }
   }
   if (!recognized) throw new Error("Choose a Markdown, CSS, or JSON template file.");
   return draft;
}

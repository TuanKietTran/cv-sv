import { CvTemplate } from "@core/domain/cv/template";
import type { CvTemplateCapabilities, CvTemplateProps } from "@core/domain/cv/types";

export const PUBLIC_TAG = "public";
export const LOCAL_TAG = "local";
/** Ruxt strips the public tag from these on start-up, so publishing would silently revert. */
export const INTERNAL_TEMPLATE_IDS: ReadonlySet<string> = new Set(["pipeline-default"]);

const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const TAG = /^[a-z0-9][a-z0-9-]{0,31}$/;
const RESERVED_TAGS = new Set([PUBLIC_TAG, LOCAL_TAG]);
const TEMPLATE_KEY = /^templates:(.+):v(\d+)$/;
const templateKey = (id: string, version: number) => `templates:${id}:v${version}`;
const DEFAULT_CAPABILITIES = { pageFormats: ["A4"], supportsPhoto: false, atsFriendly: true } as CvTemplateCapabilities;

/** The subset of unstorage used here; keys match ruxt's `templates:<id>:v<version>` layout. */
export interface TemplateStorage {
   getKeys(base: string): Promise<string[]>;
   getItem<T = unknown>(key: string): Promise<T | null>;
   setItem(key: string, value: unknown): Promise<void>;
   removeItem(key: string): Promise<void>;
}

export class TemplateAdminError extends Error {
   constructor(message: string, readonly statusCode: 400 | 404 | 409) {
      super(message);
   }
}

export interface TemplateDraft {
   name?: unknown;
   markdownSkeleton?: unknown;
   css?: unknown;
   tags?: unknown;
   capabilities?: unknown;
}

export interface TemplateVersionSummary {
   version: number;
   name: string;
   createdAt: string;
   published: boolean;
   builtIn: boolean;
}

export interface TemplateSummary {
   id: string;
   name: string;
   builtIn: boolean;
   internal: boolean;
   /** User-owned editor templates; listed for visibility but not publishable. */
   local: boolean;
   latestVersion: number;
   publishedVersion: number | null;
   tags: string[];
   versions: TemplateVersionSummary[];
}

const isPublic = (template: CvTemplateProps) => template.tags.includes(PUBLIC_TAG);
const isLocal = (template: CvTemplateProps) => template.tags.includes(LOCAL_TAG);
const customTags = (tags: string[]) => tags.filter(tag => !RESERVED_TAGS.has(tag));

export function parseVersion(raw: unknown): number {
   const version = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
   if (!Number.isInteger(version) || version < 1) {
      throw new TemplateAdminError("version must be a positive integer", 400);
   }
   return version;
}

async function versionsOf(storage: TemplateStorage, id?: string): Promise<CvTemplateProps[]> {
   const keys = (await storage.getKeys("templates:")).filter((key) => {
      const match = TEMPLATE_KEY.exec(key);
      return Boolean(match && (id === undefined || match[1] === id));
   });
   const items = await Promise.all(keys.map(key => storage.getItem<CvTemplateProps>(key)));
   return items
      .filter((template): template is CvTemplateProps => Boolean(template))
      .sort((left, right) => left.id.localeCompare(right.id) || left.version - right.version);
}

function normalizeTags(raw: unknown): string[] {
   if (raw === undefined) return [];
   if (!Array.isArray(raw)) throw new TemplateAdminError("tags must be an array", 400);
   const tags = [...new Set(raw.map(tag => typeof tag === "string" ? tag.trim().toLowerCase() : "").filter(Boolean))];
   const invalid = tags.find(tag => !TAG.test(tag));
   if (invalid) throw new TemplateAdminError(`Invalid tag "${invalid}"`, 400);
   const reserved = tags.find(tag => RESERVED_TAGS.has(tag));
   if (reserved) throw new TemplateAdminError(`Tag "${reserved}" is managed by publishing, not edited directly`, 400);
   if (tags.length > 8) throw new TemplateAdminError("At most 8 tags are allowed", 400);
   return tags;
}

function normalizeCapabilities(raw: unknown, base: CvTemplateCapabilities = DEFAULT_CAPABILITIES): CvTemplateCapabilities {
   if (raw === undefined) return base;
   if (!raw || typeof raw !== "object") throw new TemplateAdminError("capabilities must be an object", 400);
   const input = raw as Record<string, unknown>;
   const pageFormats = input.pageFormats === undefined
      ? base.pageFormats
      : Array.isArray(input.pageFormats)
         ? input.pageFormats.filter((format): format is string => typeof format === "string" && Boolean(format.trim())).map(format => format.trim())
         : [];
   if (!pageFormats.length) throw new TemplateAdminError("At least one page format is required", 400);
   return {
      ...base,
      pageFormats,
      supportsPhoto: typeof input.supportsPhoto === "boolean" ? input.supportsPhoto : base.supportsPhoto,
      atsFriendly: typeof input.atsFriendly === "boolean" ? input.atsFriendly : base.atsFriendly,
   } as CvTemplateCapabilities;
}

/** Validate a draft; omitted fields inherit from `base` when saving a new version. */
function normalizeDraft(draft: TemplateDraft, base?: CvTemplateProps) {
   const name = draft.name === undefined && base ? base.name
      : typeof draft.name === "string" ? draft.name.trim().slice(0, 120) : "";
   if (!name) throw new TemplateAdminError("Template name is required", 400);
   const markdownSkeleton = draft.markdownSkeleton === undefined && base ? base.markdownSkeleton : draft.markdownSkeleton;
   const css = draft.css === undefined && base ? base.css : draft.css;
   if (typeof markdownSkeleton !== "string" || typeof css !== "string") {
      throw new TemplateAdminError("markdownSkeleton and css are required", 400);
   }
   if (markdownSkeleton.length > 500_000 || css.length > 100_000) {
      throw new TemplateAdminError("Template is too large", 400);
   }
   return {
      name,
      markdownSkeleton,
      css,
      tags: draft.tags === undefined && base ? customTags(base.tags) : normalizeTags(draft.tags),
      capabilities: normalizeCapabilities(draft.capabilities, base?.capabilities),
   };
}

export async function listTemplates(storage: TemplateStorage): Promise<TemplateSummary[]> {
   const groups = new Map<string, CvTemplateProps[]>();
   for (const template of await versionsOf(storage)) {
      groups.set(template.id, [...(groups.get(template.id) ?? []), template]);
   }
   return [...groups.values()].map((versions) => {
      const latest = versions[versions.length - 1]!;
      return {
         id: latest.id,
         name: latest.name,
         builtIn: versions.some(version => version.builtIn),
         internal: INTERNAL_TEMPLATE_IDS.has(latest.id),
         local: isLocal(latest),
         latestVersion: latest.version,
         publishedVersion: versions.filter(isPublic).at(-1)?.version ?? null,
         tags: customTags(latest.tags),
         versions: versions.map(version => ({
            version: version.version,
            name: version.name,
            createdAt: version.createdAt,
            published: isPublic(version),
            builtIn: version.builtIn,
         })),
      };
   }).sort((left, right) => Number(left.local) - Number(right.local) || left.name.localeCompare(right.name));
}

export async function getTemplate(storage: TemplateStorage, id: string, version?: number): Promise<CvTemplateProps> {
   const template = version === undefined
      ? (await versionsOf(storage, id)).at(-1)
      : await storage.getItem<CvTemplateProps>(templateKey(id, version));
   if (!template) throw new TemplateAdminError("Template not found", 404);
   return template;
}

/** Create version 1 of a new catalog template as an unpublished draft. */
export async function createTemplate(
   storage: TemplateStorage,
   input: TemplateDraft & { id?: unknown },
   now: () => string = () => new Date().toISOString(),
): Promise<CvTemplateProps> {
   const id = typeof input.id === "string" ? input.id.trim() : "";
   if (!TEMPLATE_ID.test(id) || id.startsWith("local-")) {
      throw new TemplateAdminError("Template id must be 2–64 lowercase letters, digits, or hyphens and not start with local-", 400);
   }
   if ((await versionsOf(storage, id)).length) {
      throw new TemplateAdminError("A template with this id already exists", 409);
   }
   const template = CvTemplate.create({ id, version: 1, ...normalizeDraft(input), builtIn: false, createdAt: now() }).toJSON();
   await storage.setItem(templateKey(id, 1), template);
   return template;
}

/** Versions are immutable: edits land as the next version, unpublished until published. */
export async function createTemplateVersion(
   storage: TemplateStorage,
   id: string,
   draft: TemplateDraft,
   now: () => string = () => new Date().toISOString(),
): Promise<CvTemplateProps> {
   const latest = await getTemplate(storage, id);
   if (isLocal(latest)) throw new TemplateAdminError("User-local templates are edited from the CV editor", 409);
   const next = CvTemplate.create({
      ...latest,
      ...normalizeDraft(draft, latest),
      version: latest.version + 1,
      builtIn: false,
      createdAt: now(),
   }).toJSON();
   await storage.setItem(templateKey(id, next.version), next);
   return next;
}

/** At most one version per template is public; publishing one unpublishes the others. */
export async function setTemplatePublished(
   storage: TemplateStorage,
   id: string,
   version: number,
   published: boolean,
): Promise<CvTemplateProps> {
   const versions = await versionsOf(storage, id);
   const target = versions.find(item => item.version === version);
   if (!target) throw new TemplateAdminError("Template not found", 404);
   if (published && INTERNAL_TEMPLATE_IDS.has(id)) {
      throw new TemplateAdminError("This template is internal to the import pipeline and cannot be published", 409);
   }
   if (published && isLocal(target)) {
      throw new TemplateAdminError("User-local templates cannot be published", 409);
   }
   for (const item of versions) {
      const shouldBePublic = published ? item.version === version : isPublic(item) && item.version !== version;
      if (shouldBePublic === isPublic(item)) continue;
      const tags = shouldBePublic ? [...item.tags, PUBLIC_TAG] : item.tags.filter(tag => tag !== PUBLIC_TAG);
      await storage.setItem(templateKey(id, item.version), { ...item, tags });
   }
   return getTemplate(storage, id, version);
}

export async function deleteTemplateVersion(storage: TemplateStorage, id: string, version: number): Promise<void> {
   const target = await getTemplate(storage, id, version);
   if (target.builtIn) {
      throw new TemplateAdminError("Built-in versions are re-seeded on start-up; unpublish them instead", 409);
   }
   if (isPublic(target)) throw new TemplateAdminError("Unpublish this version before deleting it", 409);
   await storage.removeItem(templateKey(id, version));
}

# CV Server Workflows

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec defines the intended application contract and staged handler map for:

- CV REST and SSE adapters under `server/routes/api/cvs/`;
- the MCP adapter in `server/routes/mcp.ts` and `server/utils/mcp.ts`;
- current CV persistence/realtime ownership in `server/adapters/cv/document-store.ts`;
- future CV domain types, handlers, repository ports, service ports, jobs, and artifacts under `core/` and server/infra adapters;
- browser editor, import/extraction, validation, tailoring, template, rendering, and automation call sites.

Current implemented behavior remains specified in [cv-documents-realtime.md](cv-documents-realtime.md), [cv-editor.md](cv-editor.md), and [mcp-automation.md](mcp-automation.md). Sections below are intended contracts unless explicitly identified as current.

## Current Implementation Boundary

The server supports list, lazy open/create, complete save, unique patch, revision checks, process-local update publication, and SSE through one-purpose core handlers and a `CvDocumentPort`. REST and MCP dispatch those handlers independently.

The first server import slice is also implemented. Authenticated multipart upload creates an owner-scoped durable job and source artifact; the bundled `cv-pipeline` Python adapter performs PDF text extraction or OCR, CV classification, concept extraction, and Markdown/HTML/CSS rendering. Callers poll, preview, cancel/retry, download artifacts, and explicitly commit. Commit creates a CV application composed from an immutable template version and an embedded profile snapshot; there is no standalone profile persistence API. Client-side version-control behavior remains a later client concern.

## Target Architecture

The CV server is the application layer for CV lifecycle, transformation, validation, collaboration, and rendering. REST and MCP are sibling inbound adapters. Neither adapter calls the other:

```text
Browser REST/SSE ─┐
                  ├─> core CV command/query handlers ─> repository/service ports
MCP Streamable HTTP┘                                  ├> document store
                                                      ├> job/artifact store
                                                      ├> extraction/OCR
                                                      └> renderer/LLM adapters
```

MCP should expose intent-level workflows and progress-friendly jobs, not merely mirror CRUD endpoints. REST remains useful for browser transport, uploads, downloads, and low-level document operations.

## Cross-Workflow Invariants

- Every read and mutation is scoped to an authenticated owner/workspace.
- Every mutation supports optimistic concurrency through `expectedRevision`.
- Commands are idempotent when a caller supplies an idempotency key.
- Generated content never silently invents employment, education, dates, metrics, credentials, or skills.
- Imported and generated claims retain provenance back to source text, user input, or an explicitly accepted suggestion.
- Destructive and broad generated changes support preview/diff before commit.
- Long extraction, tailoring, validation, and rendering operations run as cancellable jobs with durable status and progress.
- Binary uploads and artifacts travel through HTTP/resource URLs; MCP tool results return metadata, text, and resource links rather than large base64 payloads.
- Markdown, CSS, structured concept JSON, templates, and rendered artifacts are versioned independently where their lifecycles differ.
- Browser SSE and MCP notifications consume application events emitted after committed writes.

## 1. Document Lifecycle

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| List documents | `ListCvDocuments` query | `list_cvs` | Filter by kind, tag, status, and updated time. |
| Open document | `GetCvDocument` query | `open_cv` or `cv://documents/{id}` resource | Return content, metadata, and revision. |
| Create blank CV | `CreateCvDocument` command | `create_cv` | Explicit creation replaces accidental create-on-read. |
| Create from template | `CreateCvFromTemplate` command | `create_cv_from_template` | Pins template/version used. |
| Clone/fork CV | `ForkCvDocument` command | `fork_cv` | Primary flow for job-specific variants. |
| Rename/update metadata | `UpdateCvMetadata` command | `update_cv_metadata` | Title, kind, tags, application link. |
| Archive/restore | `ArchiveCvDocument` / `RestoreCvDocument` commands | `archive_cv`, `restore_cv` | Reversible lifecycle. |
| Delete/purge | `DeleteCvDocument` command | `delete_cv` | Soft delete first; purge is separately privileged. |
| Compare revisions | `CompareCvRevisions` query | `compare_cv_revisions` | Returns semantic/source diff. |
| Restore revision | `RestoreCvRevision` command | `restore_cv_revision` | Creates a new head revision; does not rewrite history. |

Suggested document kinds are `master`, `application`, and `template-derived`. Lifecycle states are `active`, `archived`, and `deleted`.

## 2. Source Editing And Collaboration

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Save complete source | `SaveCvSource` command | `save_cv` | Replaces Markdown/CSS fields under one revision check. |
| Patch one unique range | `PatchCvSource` command | `patch_cv` | Exact unique replacement, protected by revision. |
| Apply patch set | `ApplyCvPatchSet` command | `apply_cv_patch_set` | Atomic ordered edits across Markdown/CSS. |
| Preview patch set | `PreviewCvPatchSet` query | `preview_cv_patch_set` | Diff without mutation. |
| Resolve conflict | `ResolveCvConflict` command | `resolve_cv_conflict` | Accept local, remote, or caller-supplied merge. |
| Create checkpoint | `CreateCvCheckpoint` command | `checkpoint_cv` | Named stable point before broad agent edits. |
| Watch updates | application event subscription | MCP resource updates/SSE | Emits revision, source, actor, and changed fields. |

Server history should retain actor/source (`browser`, `mcp`, `import`, `tailor`, `restore`), parent revision, timestamp, and optional workflow/job id.

## 3. Templates And Styles

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| List templates | `ListCvTemplates` query | `list_cv_templates` or `cv://templates` | Includes capabilities and latest version. |
| Get template | `GetCvTemplate` query | `get_cv_template` | Markdown skeleton, CSS, metadata, version. |
| Clone public template locally | `CloneCvTemplate` command | — | Authenticated POST creates immutable v1 with a unique id, `builtIn: false`, and a persisted `local` tag. Editing is deferred. |
| Create/update template | `SaveCvTemplate` command | `save_cv_template` | User/workspace templates are separate from built-ins. |
| Apply template | `ApplyCvTemplate` command | `apply_cv_template` | Preview CSS/structure changes before commit. |
| Rebase template version | `RebaseCvTemplate` command | `rebase_cv_template` | Preserves CV content while upgrading template style. |
| Validate stylesheet | `ValidateCvStylesheet` query | `validate_cv_stylesheet` | Syntax, unsafe/global selectors, remote resources, print rules. |

Templates should be immutable by version. Applying a template records template id/version in document metadata.

The `GET /api/public/templates` catalog requires no session and returns templates whose persisted data contains the `public` tag. The full `GET /api/cv-templates` catalog and `POST /api/cv-templates/:id/clone` remain authenticated. The current template catalog is seeded from versioned JSON blobs in `server/data/cv-templates/` and copied lazily into the configured `cv` Nitro storage under `templates:*` keys. Existing persisted versions win. As a narrow, idempotent soft migration, a persisted version whose CSS still targets the old app-owned `.cv-sheet` hook or intermediate `.cv-document` contract is updated in place so each Markdown page uses `:::resume`, its first heading uses `{.cv-name}`, and its stylesheet targets those explicit indicators; all other template content remains authoritative. The former `documents:template-harvard` value is retained for rollback. Template discovery/visibility labels are persisted directly as each blob's `tags` array; current server templates carry `"public"` and no handler infers that tag.

## 4. Import And Extraction

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Register upload | `CreateCvImport` command | `start_cv_import` with uploaded resource id | HTTP owns multipart/binary upload. |
| Detect input | `InspectCvImport` query/job step | included in import status | MIME, size, page count, text density. |
| Extract text | `ExtractCvText` job handler | `get_cv_import` | PDF text first; OCR for images/scanned pages. |
| Classify CV-likeness | `ClassifyCvInput` job handler | included in import result | Explicit `EMPTY_OR_UNREADABLE` / `NOT_CV_ALIKE`. |
| Build concept | `ExtractCvConcept` job handler | `extract_cv` | Produces schema-valid identity/sections plus provenance. |
| Refine extraction | `RefineCvConcept` job handler | `refine_cv_extraction` | Optional LLM adapter; heuristic output remains available. |
| Preview conversion | `PreviewCvImport` query | `preview_cv_import` | Concept, generated Markdown/CSS, warnings, confidence. |
| Commit import | `CommitCvImport` command | `commit_cv_import` | Creates a new document only after accepted preview. |
| Retry/cancel import | `RetryCvJob` / `CancelCvJob` commands | generic job tools | Reuses durable source artifact. |

The canonical concept schema should cover identity, summary, skills, experience, education, projects, certifications, languages, and source spans/raw text. The server should preserve original uploads according to an explicit retention policy.

## 5. Structured Concept And Content Transformation

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Read concept | `GetCvConcept` query | `get_cv_concept` or resource | Stable structured view for agents. |
| Update concept | `UpdateCvConcept` command | `update_cv_concept` | Schema validation and revision check. |
| Concept → Markdown | `RenderCvConceptToMarkdown` query/command | `render_cv_markdown` | Deterministic renderer where possible. |
| Markdown → concept | `ParseCvMarkdownToConcept` job/query | `parse_cv_markdown` | Reports lossy/ambiguous fields. |
| Rewrite section | `RewriteCvSection` job command | `rewrite_cv_section` | Scope, tone, length, and evidence constraints. |
| Reorder sections/items | `ReorderCvContent` command | `reorder_cv_content` | Structured operation instead of brittle text patches. |
| Normalize dates/contact | `NormalizeCvContent` command | `normalize_cv` | Preview changes; preserve intended precision. |
| Translate CV | `TranslateCv` job command | `translate_cv` | Preserve names, links, facts, dates, and layout constraints. |

Structured operations should be preferred over raw Markdown edits when the concept can express the requested change.

## 6. Job Application Tailoring

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Store job brief | `CreateJobBrief` command | `create_job_brief` | Text or an already-fetched source artifact. |
| Extract requirements | `ExtractJobRequirements` job handler | `analyze_job` | Skills, duties, seniority, keywords, constraints. |
| Match CV to job | `MatchCvToJob` query/job | `match_cv_to_job` | Evidence-linked strengths, gaps, and unsupported asks. |
| Propose tailoring | `ProposeCvTailoring` job handler | `tailor_cv` preview mode | Returns ranked patch set and rationale. |
| Apply tailoring | `ApplyCvTailoring` command | `apply_cv_tailoring` | Fork by default; applies accepted proposal under revision check. |
| Generate application variant | `CreateApplicationCv` workflow | `create_application_cv` | Orchestrates fork, analysis, proposal, validation, and render. |
| Refresh against changed job/CV | `RefreshApplicationCv` workflow | `refresh_application_cv` | Recomputes from pinned source revisions. |

Tailoring may emphasize, reorder, condense, or rephrase supported facts. Unsupported requirements become gap warnings, never fabricated experience.

## 7. Review, Validation, And Scoring

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Validate document | `ValidateCvDocument` query/job | `validate_cv` | Aggregates deterministic validators. |
| ATS review | `ReviewCvForAts` query/job | `review_cv_ats` | Heading, parsing, keyword, table/layout cautions. |
| Content review | `ReviewCvContent` query/job | `review_cv_content` | Clarity, repetition, grammar, weak bullets. |
| Fact consistency | `CheckCvConsistency` query | `check_cv_consistency` | Dates, duplicates, contact values, section conflicts. |
| Link/contact check | `CheckCvLinks` job/query | `check_cv_links` | Network access must use SSRF-safe fetch policy. |
| Layout review | `InspectCvLayout` render job | `inspect_cv_layout` | Overflow, clipping, blank pages, density, page count. |
| Score against job | `ScoreCvForJob` query/job | `score_cv_for_job` | Explainable dimensions and evidence, not one opaque score. |
| Suggest fixes | `ProposeCvFixes` job handler | `suggest_cv_fixes` | Returns selectable patch set; does not auto-write. |

Validation results should use stable codes, severity, field/source location, explanation, and suggested remediation so browser and MCP clients can present the same findings.

## 8. Render And Artifact Delivery

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Render HTML preview | `RenderCvHtml` query/job | `render_cv` with `html` | Sanitized Markdown plus pinned CSS/template. |
| Render PDF | `RenderCvArtifact` job command | `render_cv` with `pdf` | Server-owned Chromium pipeline. |
| Render PNG/JPEG | `RenderCvArtifact` job command | `render_cv` with image format | One artifact per page or archive. |
| Render thumbnails | `RenderCvThumbnails` job command | usually implicit | Used by document/template lists. |
| Inspect artifact | `InspectCvArtifact` query | `inspect_cv_artifact` | Format, size, checksum, pages, dimensions. |
| Download artifact | artifact HTTP route/resource | resource link in MCP | Bounded retention and authorization. |
| Export source bundle | `ExportCvBundle` job command | `export_cv_bundle` | Markdown, CSS, concept, metadata, and requested renders. |

Rendering inputs must pin document revision, template/CSS revision, renderer version, page format, and font/assets. Artifacts should be content-addressed or carry checksums so retries are deterministic and cacheable.

## 9. Jobs, Audit, And Operations

| Workflow | Core handler | MCP shape | Notes |
|---|---|---|---|
| Get/list jobs | `GetCvJob` / `ListCvJobs` queries | `get_cv_job`, `list_cv_jobs` | State, progress, stage, warnings, artifacts. |
| Cancel/retry job | `CancelCvJob` / `RetryCvJob` commands | matching tools | Retry from safe checkpoint. |
| Get audit trail | `ListCvAuditEvents` query | `get_cv_history` | Actor, source, command, revisions, artifacts. |
| Clean expired artifacts | scheduled application command | admin-only | Retention policy, not ad hoc deletion. |
| Health/capabilities | `GetCvCapabilities` query | `cv://capabilities` | OCR, renderer, LLM, formats, limits, degraded state. |

Suggested job states are `queued`, `running`, `awaiting_input`, `succeeded`, `failed`, and `cancelled`. Jobs should return stable error codes and preserve partial diagnostics without publishing partial document mutations.

## MCP Surface Design

MCP should expose three complementary primitives:

1. **Resources** for read-heavy context: document heads/revisions, concepts, templates, job briefs, validation reports, capabilities, and artifact metadata.
2. **Tools** for commands and expensive queries: create/fork/save/patch, import, tailor, validate, render, restore, and job control.
3. **Prompts** for repeatable user-facing flows: create from source, tailor to a job, review without editing, shorten to N pages, and produce an application package.

High-level tools should return workflow/job ids, affected document ids/revisions, concise summaries, warnings, diffs, and resource links. Low-level `save_cv` and `patch_cv` remain available for precise agent control but are not the main orchestration interface.

## Handler And Port Boundaries

Core handlers should depend on explicit ports, not Nitro or MCP types:

- `CvDocumentRepository`: heads, revisions, metadata, lifecycle, atomic expected-revision writes;
- `CvTemplateRepository`: immutable template versions;
- `CvJobRepository`: durable state, progress, cancellation, idempotency;
- `CvArtifactRepository`: source uploads and generated artifacts;
- `CvEventPublisher`: committed document/job events;
- `CvExtractor`, `CvOcr`, `CvConceptRefiner`: import pipeline services;
- `CvTailoringService`: requirement matching and evidence-bound proposals;
- `CvValidator`: deterministic and optional model-backed findings;
- `CvRenderer`: HTML/PDF/image rendering and layout inspection;
- `SafeExternalFetcher`: bounded, SSRF-safe job/link ingestion.

Nitro adapters own HTTP bodies, streams, status codes, authentication extraction, uploads, and artifact responses. MCP adapters own schemas, resources, progress/notifications, and protocol errors. Core owns use-case validation, authorization requests, idempotency, revisions, orchestration, and result types.

## Recommended Build Order

1. **Core migration:** add CV domain types/repository port and move current list/open/save/patch behavior behind `ListCvDocuments`, `GetCvDocument`, `SaveCvSource`, and `PatchCvSource` handlers. Make REST and MCP call the mediator independently.
2. **Lifecycle and history:** explicit create/fork/archive/delete, revisions, checkpoints, diffs, audit events, and ownership.
3. **Jobs and artifacts:** durable job model, upload/artifact stores, progress/cancel/retry, and capabilities.
4. **Import:** PDF text, OCR fallback, CV classification, concept schema, preview, and commit.
5. **Server rendering:** deterministic HTML/PDF/image artifacts and layout inspection.
6. **Validation:** deterministic checks first, then optional model-backed review.
7. **Tailoring:** job briefs, evidence-linked matching, proposal/diff, user acceptance, and application variants.
8. **Templates and advanced transforms:** immutable versions, rebase, structured edits, and translation.

## Current Gaps

- Lifecycle/history, validation, tailoring, resources/prompts, advanced templates, and server PDF/image artifact rendering remain target contracts.
- Import jobs/artifacts are durable and owner-scoped, but claiming is process-local and lacks an atomic multi-instance lease.
- Imported profile facts are versioned snapshots inside `CvApplication`; standalone profile saving is intentionally absent.
- Current document storage has no owner/workspace scope, durable revision history, audit trail, or multi-instance concurrency control. Client-side version control is not implemented in this server slice.
- Current MCP transport is stateless and cannot retain workflow state or send unsolicited notifications across requests.

# CV Documents And Realtime Sync

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- transport contracts in `shared/types/cv.ts`;
- server ownership in `server/utils/cv-documents.ts`;
- Nitro routes under `server/routes/api/cvs/`;
- client autosave and EventSource behavior in `app/composables/useCvDocument.ts`;
- Nitro `cv` storage configuration in `nuxt.config.ts`.

MCP callers are specified in [mcp-automation.md](mcp-automation.md); editor rendering is specified in [cv-editor.md](cv-editor.md).

## Document Contract

A `CvDocument` contains `id`, complete `markdown`, complete `css`, monotonically increasing integer `revision`, and ISO `updatedAt`. List results contain only `id`, `revision`, and `updatedAt`. Updates may replace Markdown, CSS, or both and may include `expectedRevision` and a caller-defined `sourceId`.

Document ids must match `^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`. Invalid ids return HTTP 400. Markdown is limited to 500,000 characters and CSS to 100,000 characters on update; exceeding either limit returns HTTP 413. Values supplied for Markdown or CSS must be strings.

## Storage And Seeding

`server/utils/cv-documents.ts` owns all server-side CV reads and writes. It stores records in Nitro storage namespace `cv` under `documents:<id>`. `nuxt.config.ts` configures that namespace with the filesystem driver and `CV_DATA_DIR`, defaulting to `./.data/cv`.

Opening an absent document creates it at revision 1. `master` receives the reference Markdown and CSS; other valid ids receive generated starter Markdown and the reference CSS. Listing lazily seeds `master` when no document keys exist, then sorts summaries by descending `updatedAt`.

The repository's local `.data/` content is runtime user data and is ignored by Git. Seed assets under `app/data/` are source; persisted documents under `.data/` are not source.

## HTTP API

- `GET /api/cvs`: returns `{ documents: CvDocumentSummary[] }`.
- `GET /api/cvs/:id`: reads or lazily creates the complete document.
- `PUT /api/cvs/:id`: applies complete-field replacements from `UpdateCvDocumentInput` and returns the new complete document.
- `GET /api/cvs/:id/events`: opens an SSE stream.

When `expectedRevision` is present and differs from current storage, update returns HTTP 409 with the current document in error `data`. Accepted writes increment revision by one, refresh `updatedAt`, persist, then publish a process-local update containing the optional `sourceId`.

Writes for the same id are chained through a process-local promise queue, including recovery after a rejected write. Different ids can write concurrently.

## SSE Behavior

An events connection receives:

1. `ready` with the complete document loaded before stream construction;
2. `cv:update` after accepted writes in the same server process;
3. an SSE comment heartbeat every 20 seconds.

The route sets event-stream, no-cache/no-transform, keep-alive, and disabled nginx buffering headers. Stream cancellation unsubscribes the listener and clears its heartbeat.

## Browser Autosave

`useCvDocument()` performs an SSR-compatible initial fetch, then creates local Markdown/CSS refs. If initial fetch has no data, it uses the page fallback, revision 0, and `offline` state.

On the client:

- source changes mark the document dirty and set `saving`;
- saves debounce for 450 ms and serialize through a promise queue;
- each save snapshots both complete source fields and sends the tab's random UUID `sourceId`;
- `expectedRevision` is omitted when local revision is zero;
- success updates revision and returns to `saved` only when no newer local edits exist;
- HTTP 409 becomes `conflict`; other failures become `offline`.

On mount, the composable creates an `EventSource`. Remote documents apply only when there are no unsaved local changes and their revision is newer. Updates bearing this tab's `sourceId` are ignored; events from MCP or another browser are eligible. EventSource open restores `saved` only when clean, while an EventSource error changes a currently saved document to `offline`.

## Current Gaps

- CV routes have no authentication, authorization, ownership, or per-user namespace; anyone who can reach the server can list, read, create, update, and stream every valid id.
- Write queues and SSE listeners are process-local. Multiple Nitro instances do not coordinate writes or broadcast changes through the filesystem store.
- Conflict state has no merge, reload, overwrite, or current-document UI.
- Failed saves are not automatically retried unless another source change schedules a save.
- Unmount clears a pending debounce timer and closes SSE but does not flush unsaved text or cancel an in-flight request.
- Update input does not validate `expectedRevision` or `sourceId` types at the HTTP boundary.

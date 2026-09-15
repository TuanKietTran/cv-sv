# Persistence And Deployment

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- repository ports in `core/repos/` and the aggregate in `infra/types.ts`;
- deployment registry and boot wiring in `infra/deploy/` and `infra/registry.ts`;
- SQLite schema/connection and adapters under `infra/db/` and `infra/deploy/onprem/`;
- Deno KV connection and adapters in `infra/kv.ts` and `infra/deploy/deno/`;
- Nitro CV storage configured in `nuxt.config.ts` and used by `server/adapters/cv/document-store.ts`;
- deployment metadata in `.env.example` and `.github/workflows/deploy.yml`.

## Strategy Selection

`infra/deploy/strategy.ts` owns a global strategy registry. Side-effect imports in `infra/deploy/index.ts` register Deno KV and SQLite. `resolveStrategy()` sorts descending by weight and selects the first predicate that passes:

- Deno KV: weight 10, selected when `globalThis.Deno` exists;
- SQLite: weight 1, unconditional fallback.

Each strategy builds the same `{ sub, plan, iam, user }` repository aggregate. Core handlers depend only on repository interfaces. The selected strategy is process-wide and logged at Nitro startup.

## SQLite

The on-prem adapter opens `local.db` in the process working directory through `better-sqlite3`, enables WAL, and wraps it with Drizzle. Startup executes `CREATE TABLE IF NOT EXISTS` statements for subscriptions, IAM subjects, plans, and users, creates IAM/user indexes, and applies best-effort `ALTER TABLE` additions for plan provider/source/creator compatibility.

Drizzle schema owns serialized columns. Dates and statuses are text, booleans are integer-backed, plan features are JSON text, and ids are text primary keys. There are no foreign-key declarations between subscriptions, plans, users, or IAM subjects.

Repository saves use upsert-by-primary-key. Subscription/user/IAM lookups are direct. Plan queries support all/public/user-owned views. JSON-to-domain hydration reruns value-object validation.

## Deno KV

`infra/kv.ts` lazily opens one `@deno/kv` connection. Primary/index key families are:

- `['sub', id]` and `['sub_user', userId, id]`;
- `['plan', id]`, `['plan_public', id]`, and `['plan_user', userId, id]`;
- `['user', id]` and `['user_email', email]`;
- `['iam_subject', userId]`.

Subscription, plan, and user writes use atomic operations for primary/index updates. List methods walk indexes and fetch each primary record. Deletes remove known indexes.

`iam-subject-repo-kv.ts` and `iam-subject-repo-sqlite.ts` are alternate, currently unregistered IAM adapter implementations. The active strategies instantiate `DenoKvIamRepo` and `SqliteIamRepo`; the alternate Deno class uses different `iam_sub`/`iam_sub_org` keys and must not be assumed to share active data.

## CV Storage

CV documents do not use the deployment strategy or repository aggregate. Nitro namespace `cv` uses the filesystem driver with base `CV_DATA_DIR ?? './.data/cv'`; records are stored under `documents:<id>`.

Import jobs, source/generated artifacts, and composed CV applications use the separate filesystem namespace `cvPipeline` at `CV_PIPELINE_DATA_DIR ?? './.data/cv-pipeline'`. Jobs and metadata are JSON records; artifact bodies use raw storage values. Source and generated artifact metadata carry checksums and expiry timestamps, defaulting to 24 hours through `CV_ARTIFACT_TTL_HOURS`. Local `.data/` is ignored by Git.

This separation means selecting Deno KV for subscription data does not move CV data into Deno KV. Filesystem durability and sharing depend on the deployed Nitro environment.

CV source compatibility uses lazy, idempotent soft migrations rather than a database migration table. Document list/read rewrites only records carrying the legacy `.cv-sheet` or intermediate `.cv-document` stylesheet contract to explicit `:::resume`/`{.cv-name}` indicators and increments their revision; template catalog initialization rewrites the same contracts in existing `templates:*` values without creating a new semantic template version. Nonmatching records and retained legacy document aliases remain untouched.

## Deployment Configuration

The package supports Nuxt dev/build/generate/preview. `NITRO_PRESET` may select a target. `.env.example` mentions `DATABASE_URL` for Neon and a node-server preset, but no current source reads `DATABASE_URL` and there is no PostgreSQL/Neon adapter.

`.github/workflows/deploy.yml` contains a Deno Deploy build/deploy job, but workflow triggers are deliberately empty. The job expects Node 22, latest pnpm, frozen install, a `deno-deploy` Nitro build, and deployctl OIDC permissions.

## Current Gaps

- CV document and pipeline filesystem persistence is not compatible with stateless/multi-instance Deno deployment without a durable shared storage implementation.
- Artifact expiry metadata is recorded, but scheduled physical deletion is not implemented yet.
- SQLite startup migration is ad hoc and non-transactional; there is no migration version table or rollback path.
- SQLite has no foreign keys, so dangling plan/user references are possible.
- Deno KV plan saves do not remove an old user index if an existing plan changes creator or changes from user to catalog source.
- Two parallel IAM adapter pairs use incompatible Deno key schemas, creating maintenance and accidental-import risk.
- `.env.example` still documents an unused PostgreSQL requirement and omits `CV_URL` and `CHROMIUM_PATH` configuration.
- The checked-in deployment workflow is disabled and still uses placeholder project metadata.

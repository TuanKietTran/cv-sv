# Persistence And Deployment

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- repository ports in `core/repos/` and the aggregate in `infra/types.ts`;
- deployment registry and boot wiring in `infra/deploy/` and `infra/registry.ts`;
- SQLite schema/connection and adapters under `infra/db/` and `infra/deploy/onprem/`;
- Deno KV connection and adapters in `infra/kv.ts` and `infra/deploy/deno/`;
- Nitro CV storage configured in `nuxt.config.ts` and used by `server/utils/cv-documents.ts`;
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

CV documents do not use the deployment strategy or repository aggregate. Nitro namespace `cv` always uses the filesystem driver with base `CV_DATA_DIR ?? './.data/cv'`. Records are stored under `documents:<id>` by the CV server utility. Local `.data/` is ignored by Git.

This separation means selecting Deno KV for subscription data does not move CV data into Deno KV. Filesystem durability and sharing depend on the deployed Nitro environment.

## Deployment Configuration

The package supports Nuxt dev/build/generate/preview. `NITRO_PRESET` may select a target. `.env.example` mentions `DATABASE_URL` for Neon and a node-server preset, but no current source reads `DATABASE_URL` and there is no PostgreSQL/Neon adapter.

`.github/workflows/deploy.yml` contains a Deno Deploy build/deploy job, but workflow triggers are deliberately empty. The job expects Node 22, latest pnpm, frozen install, a `deno-deploy` Nitro build, and deployctl OIDC permissions.

## Current Gaps

- CV filesystem persistence is not compatible with stateless/multi-instance Deno deployment without a durable shared filesystem implementation.
- SQLite startup migration is ad hoc and non-transactional; there is no migration version table or rollback path.
- SQLite has no foreign keys, so dangling plan/user references are possible.
- Deno KV plan saves do not remove an old user index if an existing plan changes creator or changes from user to catalog source.
- Two parallel IAM adapter pairs use incompatible Deno key schemas, creating maintenance and accidental-import risk.
- `.env.example` documents an unused PostgreSQL requirement and omits active `SESSION_SECRET`, `CV_DATA_DIR`, `CV_URL`, and `CHROMIUM_PATH` configuration.
- The checked-in deployment workflow is disabled and still uses placeholder project metadata.

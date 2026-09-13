# Architecture And Runtime

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- root configuration in `package.json`, `pnpm-workspace.yaml`, `nuxt.config.ts`, and `tsconfig.json`;
- Nuxt application entry and routing under `app/`;
- Nitro plugins and routes under `server/`;
- CQRS dispatch in `core/cqrs.ts` and registration in `infra/registry.ts`;
- shared transport types under `shared/`;
- the `infra` workspace package and top-level source ownership.

## Runtime Shape

The application is Nuxt 4 with Vue 3 and Nitro, using TypeScript ESM and an ES2022 Nitro target. Nuxt file routing owns browser pages; Nitro file routing owns HTTP endpoints. The root package includes `infra` as a pnpm workspace package.

Current top-level ownership is:

- `app/`: Vue pages, layouts, components, composables, themes, editor data, browser export utilities, and browser workers;
- `server/`: Nitro startup, HTTP route adaptation, session helpers, CV document persistence/realtime coordination, and the MCP Streamable HTTP endpoint;
- `core/`: framework-free value objects, subscription/catalog/IAM rules, CQRS request builders, handlers, and repository ports;
- `infra/`: scrypt, SQLite/Deno KV adapters, deployment strategy selection, and handler registration;
- `shared/`: transport types shared by browser and Nitro code;
- `scripts/`: standalone automation, currently headless PDF rendering.

`@core` and `@infra` aliases are configured for Vite and Nitro. `nuxt.config.ts` also adds a Nitro Rollup loader for first-party `?raw` imports so Markdown and CSS seed assets can be imported by server code.

## Dependency Direction

The intended application dependency direction is:

```text
app -----------------------> core (public domain types only)
  |                            ^
  v                            |
server -> core handlers <- infra adapters
  |                            |
  +---- shared <--------------+
```

`core` does not import Nuxt, Nitro, Vue, database, or transport modules. Repository interfaces in `core/repos/` are ports implemented by `infra/deploy/*`. `server/routes/api/{auth,plans,subscriptions,iam}` adapt HTTP requests to CQRS requests. CV routes intentionally use `server/utils/cv-documents.ts` directly rather than the CQRS stack.

The browser CV composable and Nitro CV utility share `shared/types/cv.ts`. `server/utils/mcp.ts` invokes the same CV utility directly, so MCP and REST writes share validation, revision checks, persistence, and update publication without an internal HTTP hop.

## CQRS And Boot

`core/cqrs.ts` owns one process-global `Mediator`. `mountVendor()` creates it once. Handlers are keyed by string `requestName`; command lookup is attempted before query lookup. `createHandler()` converts thrown handler/domain errors into `{ success: false, error }`, and `Mediator.send()` throws that error to callers.

Nitro boot is split between:

1. `server/plugins/init-cqrs.ts`, which mounts the mediator;
2. `server/plugins/init-infra.ts`, which calls `bootstrap()`;
3. `infra/registry.ts`, which resolves a persistence strategy, builds repositories, constructs `ScryptHasher`, and registers all auth, plan, subscription, and IAM handlers.

Handler modules own request input/output shapes, a handler factory, a command/query envelope factory, and a registration helper. API route files should remain thin adapters.

## Route Surfaces

Current browser routes include:

- `/`: the master CV editor, rendered without the default layout;
- `/e/:id`: named CV editor, also without the default layout;
- `/about`: construction/marketing page;
- `/login`: account login and registration;
- `/d`: subscription dashboard;
- `/d/providers`: provider-grouped plan inventory;
- `/p`: plan catalog and user-plan deletion.

Current API route families are `/api/health`, `/api/auth/*`, `/api/cvs/*`, `/api/plans/*`, `/api/subscriptions/*`, and `/api/iam/*`. `/mcp` is a protocol endpoint handled by the MCP SDK over Streamable HTTP rather than a JSON REST route. Their data and security contracts belong to the corresponding subsystem specs.

## Runtime State

The mediator, deployment strategy registry, SQLite connection, Deno KV connection, CV listener sets, and per-document write queues are process-local singletons. Browser auth and theme state use Nuxt `useState`; theme preference is persisted in `localStorage`. CV documents and subscription data use separate persistence systems.

## Current Gaps

- `README.md` and `docs/` still describe the repository primarily as `sub`; they do not fully map the current CV editor surface.
- Route/domain errors outside the auth routes are not translated consistently to explicit HTTP status codes.
- Handler registration is string-keyed and allows later duplicate registration to overwrite an earlier handler silently.
- Runtime ordering depends on the two Nitro plugin files being initialized in the required mediator-before-infra sequence.

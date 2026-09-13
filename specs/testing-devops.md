# Testing And Devops

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- package scripts and dependency locks in `package.json`, `infra/package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`;
- TypeScript/Nuxt preparation in `tsconfig.json`, `infra/tsconfig.json`, and generated `.nuxt` types;
- `.gitignore`, `.env.example`, and local/generated artifacts;
- `.github/workflows/deploy.yml` and repository contribution templates;
- development and automation commands, including MCP and headless PDF prerequisites;
- current executable validation coverage.

## Development Commands

The root package owns:

```bash
pnpm install
pnpm dev
pnpm build
pnpm generate
pnpm preview
```

`postinstall` runs `nuxt prepare`, generating Nuxt types/config under `.nuxt`. The root `tsconfig.json` references Nuxt-generated app/server/shared/node projects; run preparation before treating standalone TypeScript results as authoritative. `infra/tsconfig.json` is strict and owns workspace aliases for infrastructure source.

The app normally runs at `http://localhost:3000`; its MCP Streamable HTTP endpoint is `/mcp`. The editor's persistent EventSource means browser automation should not wait for network idle.

## Dependencies And Platform Requirements

The lockfile is the dependency integrity/version authority. pnpm overrides all CodeMirror users to `@codemirror/state` 6.7.3 and permits native/build scripts for Parcel watcher, `better-sqlite3`, and esbuild.

SQLite local development requires the native `better-sqlite3` package to build or have a compatible binary. Deno KV support lives in the `infra` workspace. CV editing uses browser-only CodeMirror and html2canvas paths; Markdown rendering is unified/remark/rehype based.

`scripts/render-pdf.mjs` requires an installed Chromium-compatible executable. `playwright-core` does not download a browser; set `CHROMIUM_PATH` unless the default macOS Brave path exists. The script currently expects exactly two rendered CV sheets.

## Artifacts And Sensitive Data

Ignored build/runtime paths include `.output`, `.nuxt`, `.nitro`, `.cache`, `dist`, `node_modules`, `.data`, logs, local SQLite database/WAL files, and local `.env*` except `.env.example`.

Do not commit generated Nuxt/Nitro output, `local.db`, `.data/cv`, rendered PDFs/images, logs, or local environment files. CV documents and exports may contain personal data. Session secrets and future MCP credentials belong in local/deployment secret configuration, never source or command output.

## CI And Deployment

The only checked-in workflow is `.github/workflows/deploy.yml`. Its trigger map is empty, so no GitHub Actions job currently runs. If enabled, it installs with a frozen lockfile, builds the Deno Deploy preset, and deploys `.output` through deployctl.

Issue and PR templates request layer classification, acceptance criteria, local `pnpm dev` testing, and screenshots/logs, but they do not execute checks.

## Validation Expectations

For documentation-only spec changes, verify the DocumentMap has exactly one link for every non-index spec and no dead relative links.

For source changes, the current minimum available gates are:

```bash
pnpm build
pnpm dev                 # exercise user-facing/API behavior
# connect an MCP client to http://localhost:3000/mcp
node scripts/render-pdf.mjs <url> <output.pdf>
```

Build success covers Nuxt compilation and some TypeScript integration but does not replace API, persistence, realtime, browser, export, or deployment testing. User-facing editor changes should be checked at responsive sizes and in print preview; concurrency changes should use two browser clients or browser plus MCP.

## Current Gaps

- There are no checked-in test files and no `test`, lint, format, or dedicated type-check package script.
- CI is disabled and therefore does not enforce frozen install, build, tests, security checks, or artifact validation.
- No executable coverage exists for domain transitions/validators, API schemas/status codes, authentication, authorization, repository parity, SQLite migration, Deno KV indexes, CV conflicts/SSE, Markdown sanitization, CodeMirror, responsive UI, or export output.
- Headless PDF automation is not portable by default and has no package script or CI browser setup.
- There is no production deployment smoke test, multi-instance persistence test, or documented backup/restore procedure for either `local.db` or CV filesystem data.

# Authentication, IAM, And Security

Last updated: main@d1ae665 | 2026-09-13

## Scope

This spec covers:

- account handlers and IAM policy code under `core/handlers/` and `core/domain/iam/`;
- password hashing in `infra/crypto/scrypt-hasher.ts`;
- user/IAM persistence ports and adapters;
- session ownership in `server/utils/session.ts`;
- `/api/auth/*` and `/api/iam/*` routes;
- browser auth state, SSR plugin, global route middleware, login page, and auth controls in layouts;
- auth and authorization boundaries for the rest of the repository.

## Account Authentication

Registration canonicalizes and validates email, rejects an existing canonical address, generates a UUID, hashes the password, and persists id/email/hash/creation timestamp. Login lowercases and trims the supplied email and compares the password. Responses expose user id only; `/api/auth/me` returns id and email.

`ScryptHasher` uses Node crypto scrypt with `N=16384`, `r=8`, `p=1`, a 32-byte random salt, and a 64-byte key. Persistent hashes encode algorithm, parameters, salt, and derived key. Verification parses the stored parameters and uses `timingSafeEqual`.

Auth routes are:

- `POST /api/auth/register`: requires email/password, creates an account, starts a session, and returns 201;
- `POST /api/auth/login`: requires email/password, maps all credential failures to 401, and starts a session;
- `GET /api/auth/me`: requires a session user id and an existing user, otherwise 401;
- `POST /api/auth/logout`: clears the session.

`getAuthSession()` owns an H3 `auth_session` cookie-backed session with a seven-day max age. Its password comes from private Nuxt runtime config `sessionSecret`; the fallback development password must not be used in production.

## Browser Auth State

`useAuth()` owns one Nuxt `auth:user` state value and wraps the auth routes. The server-only `app/plugins/auth.ts` calls `fetchMe()` during SSR. The global middleware redirects unauthenticated `/d*` and `/p*` paths to `/login`, except routes explicitly marked `meta.public` and any such route with `?userId=demo`. `/profiles` is explicitly public despite matching the broad `/p*` prefix.

The login page collects a name during signup, but registration sends only email and password. Default and editor layouts display session identity and logout controls. Browser route middleware and hidden controls are navigation conveniences, not API authorization.

## IAM Model

IAM subjects persist `userId`, nullable `orgId`, tier (`free`, `pro`, `enterprise`), and `isServiceAccount`. Resource attributes and action codes are validated value objects. `CheckAccess` derives `isOwner` by comparing the request's `ownerUserId` to the stored subject id.

The default `PolicyEvaluator` is deny-overrides:

1. any explicit deny wins immediately;
2. otherwise at least one allow permits;
3. all policies abstaining produces default deny.

Built-in policies are:

- owner full access when subject and resource owner ids match;
- service-account read-only for action codes classified as reads, with explicit denial for all other actions;
- same-organization human access for `subscription:read` only.

IAM routes expose `POST /api/iam/check-access` and get/upsert/delete under `/api/iam/subjects/:userId`. These routes calculate and manage IAM state; no route middleware automatically invokes them.

## Trust Boundaries

Current account sessions do not protect plan, subscription, IAM, or CV API routes. Those routes accept caller-supplied user/owner ids. Consequently, IAM output is advisory unless a caller explicitly uses it; it is not an enforcement layer for mutation routes.

Legacy CV document HTTP/SSE and the `/mcp` Streamable HTTP endpoint are public at the application boundary and may expose personal data. `GET /api/public/templates` is the explicitly public, read-only template catalog and returns only records carrying the persisted `public` tag. CV import, preview, artifact, full template catalog, capability, cancellation, retry, and commit routes require an auth session and scope records by session user id. The MCP route also has no host/origin allowlist or DNS-rebinding protection. See [cv-documents-realtime.md](cv-documents-realtime.md) and [mcp-automation.md](mcp-automation.md).

New unauthenticated APIs outside authentication must be visibly namespaced under `/api/public/*`; `/api/auth/*` is exempt from that route naming convention. A data tag never removes an authentication gate by itself.

Imported profile snapshots contain personal data and are stored inside owner-scoped CV application/import artifacts. The standalone unauthenticated `/profiles` editor has no API: its lightweight profile records remain browser-local under `cv-sv:local-profiles:v1`, so clearing site data removes them and shared-device users can read them.

Passwords and hashes must never be logged or serialized through API outputs. `PlainPassword` and `HashedPassword` redact `toString()`/`toJSON()`, but direct `.value`/`.hash` getters exist for hashing and persistence.

## Current Gaps

- Plan, subscription, IAM-subject, access-check, legacy CV document, SSE, and MCP routes have no server-side session or ownership enforcement; the new CV import/application routes do enforce the session owner.
- Any caller can supply another user's ids and can mutate IAM subjects; the ABAC evaluator is not wired into protected resources.
- Registration constructs `PlainPassword` directly and therefore bypasses the available `PasswordValidator` strength rules.
- No rate limiting, login throttling, CSRF policy, password reset, email verification, session rotation documentation, or security headers are present.
- The runtime has an insecure development fallback session secret; production must override the documented `SESSION_SECRET`.
- The `?userId=demo` browser bypass and prefix checks are UI-only and broader than exact `/d` and `/p` route matching.

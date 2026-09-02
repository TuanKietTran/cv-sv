# Architecture

`sub` is a full-stack subscription management platform built on **Nuxt 4** (Vue frontend + Nitro server). It follows **Domain-Driven Design (DDD)** and **CQRS** patterns, with a pluggable deployment back end.

---

## Layer Overview

```
┌──────────────────────────────────────────────┐
│                   app/                        │  Vue 3 SPA (Nuxt pages, composables)
├──────────────────────────────────────────────┤
│                  server/                      │  Nitro HTTP server (REST API)
├──────────────────────────────────────────────┤
│                   core/                       │  Pure business logic (no framework deps)
│   domain/   │   handlers/   │   repos/ (ports)│
├──────────────────────────────────────────────┤
│                   infra/                      │  Adapters: DB, crypto, deploy strategies
└──────────────────────────────────────────────┘
```

Dependencies only flow **downward**. `core` has zero knowledge of `infra`, `server`, or `app`.

---

## Directory Reference

```
sub/
├── app/                        # Nuxt frontend
│   ├── assets/theme/           # Global CSS / design tokens
│   ├── components/ui/          # Reusable UI components
│   ├── composables/            # Vue composables
│   ├── layouts/                # Nuxt layouts
│   ├── middleware/             # Client-side route guards
│   ├── pages/                  # File-based routing
│   │   ├── index.vue           # Public landing / pricing page
│   │   ├── login.vue           # Auth page
│   │   └── d/index.vue         # Authenticated dashboard
│   ├── plugins/                # Vue plugins
│   ├── types/                  # Frontend-only TypeScript types
│   └── app.vue                 # Root Vue component
│
├── server/                     # Nitro server (API layer)
│   ├── plugins/
│   │   ├── init-cqrs.ts        # Mounts the CQRS Mediator singleton
│   │   └── init-infra.ts       # Bootstraps infra (resolves deploy strategy, wires repos)
│   ├── routes/api/
│   │   ├── health.get.ts
│   │   ├── auth/               # register, login, logout, me
│   │   ├── plans/              # CRUD for plans
│   │   ├── subscriptions/      # Create, read, list + lifecycle actions
│   │   │   └── [id]/           # cancel, pause, resume, renew, plan-change
│   │   └── iam/
│   │       ├── check-access.post.ts
│   │       └── subjects/       # Get, upsert, delete IAM subjects
│   └── utils/session.ts        # Session cookie helpers
│
├── core/                       # Pure domain + application logic
│   ├── cqrs.ts                 # Mediator, Handler, Query, Command types
│   ├── domain/
│   │   ├── value-object.ts     # Base ValueObject<T>
│   │   ├── datetime/           # Instant, Duration, value objects
│   │   ├── catalog/            # Plan, PlanId
│   │   ├── subscription/       # Subscription, SubscriptionStatus, BillingCycle, Money
│   │   └── iam/                # UserId, SubjectAttributes, Policy, AccessDecision …
│   ├── handlers/               # One file per use-case command/query
│   └── repos/                  # Repository interfaces (ports)
│       ├── subscription.repo.ts
│       ├── plan.repo.ts
│       ├── iam.repo.ts
│       └── user.repo.ts
│
├── infra/                      # Infrastructure adapters
│   ├── types.ts                # Repos aggregate interface
│   ├── registry.ts             # Wires all handlers + repos at boot
│   ├── kv.ts                   # Deno KV singleton accessor
│   ├── crypto/                 # ScryptHasher (password hashing)
│   ├── db/
│   │   ├── schema.ts           # Drizzle SQLite table definitions
│   │   └── sqlite.ts           # DB connection singleton
│   └── deploy/
│       ├── strategy.ts         # DeployStrategy interface + registry + resolver
│       ├── index.ts            # Imports all strategy registrations
│       ├── deno/               # Deno KV repo implementations (weight 10)
│       └── onprem/             # SQLite repo implementations (weight 1, fallback)
│
├── nuxt.config.ts              # Path aliases (@core, @infra), Nitro config
├── package.json
└── pnpm-workspace.yaml
```

---

## Core Concepts

### CQRS Mediator (`core/cqrs.ts`)

All business operations go through a central **Mediator** singleton. Callers construct a typed request object and call `mediator.send(request)` — the mediator routes it to the registered handler.

```
          ┌──────────────────┐
          │  API route / page │
          └────────┬─────────┘
                   │ mediator.send(request)
          ┌────────▼─────────┐
          │     Mediator      │  routes by requestName
          └────────┬─────────┘
                   │ handler.execute(payload)
          ┌────────▼─────────┐
          │     Handler       │  pure fn: payload → Result<T>
          └────────┬─────────┘
                   │ repo.save / repo.findById …
          ┌────────▼─────────┐
          │   Repository      │  interface (port)
          └────────┬─────────┘
                   │ SQL / KV / …
          ┌────────▼─────────┐
          │    Adapter        │  concrete implementation in infra/
          └──────────────────┘
```

**Commands** mutate state and are registered via `mediator.registerCommand()`.  
**Queries** are read-only and registered via `mediator.registerQuery()`.

Every handler module exports three things:
| Export | Purpose |
|---|---|
| `create*Handler(repo)` | Factory — returns a `Handler<I,O>` |
| `*Command(input)` / `*Query(input)` | Typed request builder for callers |
| `register*(repo)` | Convenience: creates the handler and registers it with the live mediator |

### Domain Model

#### Subscription lifecycle

```
trialing ──► active ──► past_due ──► active   (on renewal)
    │            │           │
    │            ▼           ▼
    └──────► cancelled   expired
                 ▲
             paused ──► active
```

State transitions are enforced by `SubscriptionStatus.transitionTo(next)`. Any invalid jump throws immediately.

Subscriptions are **immutable value objects** — every mutation method (`cancel`, `pause`, `renew`, …) returns a **new** `Subscription` instance. The handler then calls `repo.save(newSub)`.

Plan changes scheduled mid-cycle are applied atomically on the next `renew()` call via `nextIntervalPlanId`.

#### Plan (Catalog)

A `Plan` carries: price (`Money` — amount in minor units + ISO-4217 currency), `BillingCycle` (weekly / monthly / quarterly / biannual / yearly), optional `trialDuration`, a list of `features`, and an `isPublic` flag.

`Plan.annualCost` normalises any billing cycle to a yearly figure for pricing-page comparisons.

#### IAM (Access Control)

The system uses **ABAC** (Attribute-Based Access Control) instead of RBAC.

Access is evaluated by composing `Policy` objects inside a `PolicyEvaluator`. The combinator is **deny-overrides**:
1. Any explicit `deny` → deny.
2. No deny + at least one `allow` → allow.
3. All policies abstain → deny (default-deny).

Built-in policies:

| Policy | Rule |
|---|---|
| `OwnerFullAccessPolicy` | Subject owns the resource → allow all actions |
| `ServiceAccountReadOnlyPolicy` | Service account → allow `*:read`, deny everything else |
| `SameOrgPolicy` | Same org, human caller → allow `subscription:read` |

The `CheckAccess` query handler runs this evaluation on every incoming access check.

### Deploy Strategy

`infra/deploy/strategy.ts` implements a simple **strategy registry**. Each strategy registers itself with a `weight` and a `predicate`. At boot, `resolveStrategy()` picks the highest-weight strategy whose `predicate()` returns `true`.

| Strategy | predicate | weight |
|---|---|---|
| **DenoKV** | `typeof globalThis.Deno !== "undefined"` | 10 |
| **SQLite** (on-prem) | always true (fallback) | 1 |

Both strategies implement the same `Repos` interface (`{ sub, plan, iam, user }`), making the rest of the codebase completely storage-agnostic.

### Boot Sequence (Server)

Nitro plugins run in order at server startup:

1. **`init-cqrs`** — calls `mountVendor()` to create the `Mediator` singleton.
2. **`init-infra`** — calls `bootstrap()` in `infra/registry.ts`:
   - Resolves the active deploy strategy.
   - Instantiates all repository adapters.
   - Calls `registerAll(repos)` which wires every handler to the mediator.

After boot every API route can call `useMediator().send(request)` to dispatch work.

### Path Aliases

`nuxt.config.ts` registers two aliases available in both Nitro (server) and Vite (frontend):

| Alias | Resolves to |
|---|---|
| `@core` | `./core` |
| `@infra` | `./infra` |

---

## Data Flow — Example: Create Subscription

```
POST /api/subscriptions
        │
        ▼
server/routes/api/subscriptions/index.post.ts
  reads body, calls mediator.send(createSubscriptionCommand(input))
        │
        ▼
core/handlers/create-subscription.ts
  builds Subscription domain object, calls repo.save(sub)
        │
        ▼
infra/deploy/onprem/subscription-repo-sqlite.ts   (or deno/)
  persists to SQLite / Deno KV
        │
        ▼
handler returns { success: true, data: { subscriptionId } }
        │
        ▼
API route responds 201 { subscriptionId }
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Full-stack framework | Nuxt 4 (Vue 3 + Nitro) |
| Language | TypeScript (ESM, `target: es2022`) |
| Package manager | pnpm (workspace) |
| On-prem database | SQLite via Drizzle ORM |
| Cloud database | Deno KV |
| Password hashing | Scrypt |
| Session | Signed cookie (H3 `useSession`) |
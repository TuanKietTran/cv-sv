# sub

A full-stack subscription management platform built on [Nuxt 4](https://nuxt.com). Handles plans, subscription lifecycle, billing cycles, and attribute-based access control (ABAC) — deployable to Deno Deploy (KV) or on-premise (SQLite).

## Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/architecture.md) | Layered architecture, module map, domain model, boot sequence |
| [Extending](./docs/extending.md) | How to add handlers, deploy strategies, policies, and API routes |

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Features

- **Subscription lifecycle** — trialing, active, paused, past-due, cancelled, expired with enforced state machine transitions
- **Plan catalog** — price (minor-unit currency), billing cycle (weekly → yearly), optional trial period, feature list
- **ABAC access control** — composable deny-overrides policy evaluator with built-in owner, service account, and org policies
- **Multi-backend storage** — Deno KV in the cloud, SQLite on-premise; swap with zero core changes
- **CQRS mediator** — all business operations are typed commands/queries routed through a central mediator
- **Session auth** — scrypt-hashed passwords, signed cookie sessions

## Tech Stack

| Concern | Technology |
|---|---|
| Full-stack framework | Nuxt 4 / Nitro |
| Frontend | Vue 3 |
| Language | TypeScript (ESM, ES2022) |
| On-prem database | SQLite via Drizzle ORM |
| Cloud database | Deno KV |
| Password hashing | Scrypt |
| Package manager | pnpm |

## Project Layout

```
sub/
├── app/          # Vue 3 frontend (pages, components, composables)
├── core/         # Pure domain logic — framework-free
│   ├── cqrs.ts   # Mediator, Handler, Command, Query types
│   ├── domain/   # Value objects, entities, domain services
│   ├── handlers/ # One file per use-case (command or query)
│   └── repos/    # Repository interfaces (ports)
├── infra/        # Adapters: DB, crypto, deploy strategies
│   ├── deploy/   # Deno KV and SQLite repo implementations
│   ├── db/       # Drizzle schema + SQLite connection
│   └── crypto/   # Scrypt password hasher
├── server/       # Nitro server
│   ├── plugins/  # Boot: mount mediator, bootstrap infra
│   └── routes/   # REST API handlers
└── docs/         # Architecture and extension guides
```

## API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Plans | `GET /api/plans`, `GET /api/plans/:id`, `PUT /api/plans/:id`, `DELETE /api/plans/:id` |
| Subscriptions | `POST /api/subscriptions`, `GET /api/subscriptions`, `GET /api/subscriptions/:id` |
| Lifecycle | `POST /api/subscriptions/:id/cancel`, `pause`, `resume`, `renew` |
| Plan change | `PUT /api/subscriptions/:id/plan-change`, `DELETE /api/subscriptions/:id/plan-change` |
| IAM | `POST /api/iam/check-access`, `GET/PUT/DELETE /api/iam/subjects/:userId` |

## Development

```bash
pnpm dev          # start dev server with hot reload
pnpm build        # production build
pnpm preview      # preview production build locally
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SESSION_SECRET` | `dev-only-secret-…` | Secret used to sign session cookies — **must be changed in production** |
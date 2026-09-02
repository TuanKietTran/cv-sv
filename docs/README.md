# sub — Documentation

**sub** is a full-stack subscription management platform built on [Nuxt 4](https://nuxt.com). It provides plans, subscriptions, billing lifecycle management, and attribute-based access control (ABAC) out of the box, deployable to Deno Deploy (KV store) or on-premise (SQLite).

## Contents

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | Layered architecture, module map, domain model, boot sequence |
| [Extending](./extending.md) | How to add handlers, deploy strategies, policies, and API routes |

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Tech Stack

| Concern | Technology |
|---|---|
| Full-stack framework | Nuxt 4 / Nitro |
| Frontend | Vue 3 |
| Business logic | TypeScript, DDD + CQRS |
| Auth | Session cookie (scrypt hashed passwords) |
| Database (on-prem) | SQLite via Drizzle ORM |
| Database (cloud) | Deno KV |
| Package manager | pnpm |

## Project Layout (top-level)

```
sub/
├── app/          # Nuxt frontend (Vue pages, components, composables)
├── core/         # Pure domain logic — no framework dependencies
├── infra/        # Infrastructure adapters (DB, crypto, deploy strategies)
├── server/       # Nitro server plugins and API route handlers
├── docs/         # This documentation
├── nuxt.config.ts
└── package.json
```

See [Architecture](./architecture.md) for a full breakdown of every layer.
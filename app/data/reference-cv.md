# Trần Hà Tuấn Kiệt

Ho Chi Minh City, Vietnam · [kyletran101.work@gmail.com](mailto:kyletran101.work@gmail.com) · +84 869 899 827 · [github.com/TuanKietTran](https://github.com/TuanKietTran) ·  
[linkedin.com/in/kyletrancse101](https://linkedin.com/in/kyletrancse101)

## Objective

Full-stack engineer with 3 years shipping enterprise web products, looking to bring that depth — including hands-on SharePoint extension work — to systems-integration engineering: idempotent, replayable syncs between systems that were never designed to share a data model.

## Skills

**Integration** &nbsp; Odoo 17, XML-RPC, Webhooks, Idempotent sync, Retry queues

**Languages** &nbsp; C#, JavaScript / TypeScript, Python, Rust

**Libraries & SDKs** &nbsp; ASP.NET Core, Vue 3, Nuxt 4, React, React Native, Entity Framework, Tauri, Django

**Toolchains** &nbsp; Git, Docker, Bun, Node.js, Playwright, PostgreSQL, MySQL, MongoDB, Microsoft SQL Server

**Cloud & DevOps** &nbsp; Microsoft Azure, LocalStack, GitHub Actions, Podman, Cloudflare Tunnel, Tailscale

## Education

| **HO CHI MINH CITY UNIVERSITY OF TECHNOLOGY** |  | Ho Chi Minh City, Vietnam |
| :-- | :-: | --: |
| Bachelor’s degree, Computer Science | GPA: 3.2 | Oct 2020 – Oct 2024 |

## Certifications

| **AZ-400** DevOps Engineer Expert | *Microsoft* · Apr 2026 – Apr 2027 |
| :-- | --: |
| **AZ-104** Azure Administrator Associate | *Microsoft* · Apr 2026 – Apr 2027 |
| **TOEIC 870** Listening & Reading · **TOEIC 300** Speaking & Writing |  |

## Experience

| **OMNIA SYSTEM VIETNAM** | Ho Chi Minh City, Vietnam |
| :-- | --: |
| Software Engineer | Jan 2024 – Aug 2026 |

| *Experienced Engineer* | Jan 2026 – Aug 2026 |
| :-- | --: |

- Ownership of features across **dev and preview release channels** — from spec review and design alignment through QA and production rollout
- Built automated test cases with LLM assistance, while incrementally growing a “second brain” knowledge base that was continuously added to and updated as the product evolved

| *Junior Engineer* | Jan 2024 – Dec 2025 |
| :-- | --: |

- Architected and shipped a **mobile chat and channel app** from POC to production, directly contributing to Omnia’s recognition as a **ClearBox Leading Product** and its **7th consecutive Intranet Choice Award** (independent review of 37+ global intranet platforms, 2024)
- Developed full-stack product features across enterprise intranet modules using **ASP.NET Core, Vue 3, and TypeScript**
- Built SharePoint web parts — full-bleed page layouts and application customisers — deployed across multiple enterprise Microsoft 365 tenants

| **PRECIO FISHBONE VIETNAM** | Ho Chi Minh City, Vietnam |
| :-- | --: |
| Fresher | Sep 2023 – Dec 2023 |

- Delivered backend and frontend features using **ASP.NET Core** within a cross-functional Agile team
- Collaborated on product integrations and client-facing feature releases across multiple sprint cycles

| *Developer Intern* | Jun 2023 – Aug 2023 |
| :-- | --: |

- Applied Entity Framework and ORM patterns in a structured team environment
- Gained hands-on exposure to enterprise .NET and Angular development workflows

---

## Projects

| **INTERLOCK** | [github.com/TuanKietTran/interlock](https://github.com/TuanKietTran/interlock) |
| :-- | --: |

In progress — Odoo 17 module + **ASP.NET Core** sync bridge: idempotent, replayable outbound sync with a retry queue

- Odoo extension points only (no core patches) sync stock and accounting moves to an external ledger via XML-RPC/webhook, tracking sync state directly on stock.move and reconciliation references on account.move
- Outbound payloads are modelled as a state machine (draft → queued → sent → acked → failed) via sync.job / sync.job.line, so a failed sync is a row to retry rather than a support ticket
- Scoped deliberately: reconciliation references only, not a full accounting implementation; single external endpoint stated up front as a boundary, not an oversight

**Stack:** Odoo 17, ASP.NET Core, XML-RPC, PostgreSQL

| **ODYSSEUS** | [github.com/odysseus-dev/odysseus](https://github.com/odysseus-dev/odysseus) &nbsp;&nbsp;&nbsp; **(CONTRIBUTOR)** |
| :-- | --: |

Open-source contribution + self-operated deployment — self-hosted AI workspace

- Diagnosed and fixed a chat-rendering bug in Deep Research’s “Discuss” spin-off (missing render branch for system-context messages), reusing an existing UI component per the project’s contribution guidelines; added a behavioral regression test and validated against the module’s 286-test suite
- Operate a personal multi-host deployment: rootless **Podman + Cloudflare Tunnel** ingress across a Raspberry Pi cluster, bridged over **Tailscale** to a model backend; diagnosed and fixed a pipefail bug that silently broke a nightly upstream-sync job for five days

**Stack:** Python, JavaScript, Podman, Cloudflare Tunnel, Tailscale, Raspberry Pi

| **CV EDITOR** | [github.com/TuanKietTran/cv-editor](https://github.com/TuanKietTran/cv-editor) |
| :-- | --: |

Cross-platform CV editor — Markdown + CSS live preview, desktop and web, agent-drivable via MCP

- Built on Tauri 2 + React with live MD/CSS preview and native macOS print-to-PDF (WKWebView, no print dialog); replaced the macOS-only PDF path with a portable Puppeteer/headless-Chromium renderer shared across desktop and web
- Deployed as a public web app (Express + Puppeteer, self-hosted behind a Cloudflare Tunnel) with a unified frontend layer dispatching to either Tauri’s IPC or a plain fetch() depending on runtime
- Exposes an MCP server (list/open/save project, list/get template, render_pdf) so any MCP-capable agent can generate and render CVs directly — one rendering pipeline backs the desktop app, web app, and agent tool calls

**Stack:** Bun, React, Tauri 2, Rust, TypeScript, Express, Puppeteer, MCP

| **PI AGENT HARNESS & EXTENSIONS** | [github.com/TuanKietTran/pi-extension-claude-cli](https://github.com/TuanKietTran/pi-extension-claude-cli) |
| :-- | --: |

Provider and MCP-bridge extensions for the pi coding-agent framework — swap drivers and mount agentic tools without touching pi’s core

- Built a provider extension wrapping the Claude CLI as a pi driver — auth reuses the CLI’s own login (no separate API key); spawns claude -p --output-format stream-json and streams tool-call events (Bash, Read, Edit) back into pi’s UI
- Wrote a minimal MCP client extension bridging an external MCP server’s tools into pi as native tools (pi has no built-in MCP support) — spawns the server as a stdio child process and registers one pi tool per MCP tool, so new server-side tools appear automatically
- Added a local-model prompt/KV-cache harness for llama.cpp/Ollama providers — per-turn output-token budgeting while keeping the model warm and its prompt cache reused

**Stack:** TypeScript, Bun, Model Context Protocol, llama.cpp, Ollama

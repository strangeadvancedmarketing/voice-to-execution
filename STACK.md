# STACK — the complete manifest

Every component in the framework, in one place, each pointing to its documentation. This file is the checklist that proves nothing is hidden behind "etc." Keys, tokens, client data, and personal information are excluded by design; the patterns and commands are complete.

The stack has two halves: the **core** — who the agent is, which installs as a unit — and the **capabilities** — what the agent does, which you draw from as needed.

## Contents

- [Core — the operating system](#core--the-operating-system)
- [Core — connectors](#core--connectors)
- [Core — efficiency](#core--efficiency)
- [Capabilities — workflows](#capabilities--workflows)
- [Philosophy](#philosophy)
- [Intentionally excluded](#intentionally-excluded)
- [Provenance](#provenance)

## Core — the operating system

The drop-in configuration in [`.claude/`](.claude/). This is the point of the repository.

| Component | Location | Documented in |
|-----------|----------|---------------|
| Operating model + hard rules | [`.claude/CLAUDE.md.template`](.claude/CLAUDE.md.template) | [`docs/rules/`](docs/rules/) |
| Operating rules (working style) | [`.claude/rules/`](.claude/rules/) | [`docs/rules/operating-rules.md`](docs/rules/operating-rules.md) |
| Lessons learned (40+, each with its cost) | — | [`docs/rules/lessons-learned.md`](docs/rules/lessons-learned.md) |
| Security & hardening | [`.claude/rules/`](.claude/rules/) | [`docs/rules/security-and-hardening.md`](docs/rules/security-and-hardening.md) |
| Memory system (typed files + index + lazy loading; + neural-memory capture & recall) | [`.claude/memory/`](.claude/memory/) | [`docs/memory.md`](docs/memory.md) |
| Continuity hooks (boot, drift, reorient, pre-compact, logger) | [`.claude/hooks/`](.claude/hooks/) | [`docs/hooks.md`](docs/hooks.md) |
| Hook + plugin wiring | [`.claude/settings.json.template`](.claude/settings.json.template) | [`docs/connectors/scheduled-tasks-and-hooks.md`](docs/connectors/scheduled-tasks-and-hooks.md) |
| Agent fleet (37, hardened) | [`.claude/agents/`](.claude/agents/) | [`docs/agents.md`](docs/agents.md) |
| Skills (on-demand capabilities) | [`.claude/skills/`](.claude/skills/) | [`docs/skills.md`](docs/skills.md) |

## Core — connectors

How the agent reaches the world. Each guide ships verified setup commands. See [`docs/connectors/`](docs/connectors/).

| Connector | What it is | Guide |
|-----------|-----------|-------|
| Voice loop | Messaging in → local transcription → execution → text + voice reply | [`telegram-voice-loop.md`](docs/connectors/telegram-voice-loop.md) |
| Google Suite | Gmail, Calendar, Drive, Sheets, Docs by CLI | [`google-suite.md`](docs/connectors/google-suite.md) |
| MCP servers | Payments, CRM, scraping, browser, machine, memory | [`mcp-servers.md`](docs/connectors/mcp-servers.md) |
| Browser automation | A real, logged-in browser the agent drives | [`browser-automation.md`](docs/connectors/browser-automation.md) |
| Web & social research | Free web, YouTube, RSS, and logged-in social | [`web-and-social-research.md`](docs/connectors/web-and-social-research.md) |
| Scheduled tasks & hooks | The push layer — jobs on a timer, hooks on events | [`scheduled-tasks-and-hooks.md`](docs/connectors/scheduled-tasks-and-hooks.md) |
| Local & free AI | Transcription, TTS, voice clone, media, free generation | [`local-ai.md`](docs/connectors/local-ai.md) |
| All external APIs | One index of every API the framework touches (bring your own keys) | [`apis.md`](docs/connectors/apis.md) |
| All CLIs & local tools | One index of every command-line tool and local binary used | [`tools-and-clis.md`](docs/connectors/tools-and-clis.md) |

## Core — efficiency

Running a heavy agent all day on a normal plan. See [`docs/efficiency/token-economy.md`](docs/efficiency/token-economy.md): lazy loading, context hygiene, subagent isolation, boot-context compilation, knowledge-graph queries, model right-sizing, paste-ready output.

## Capabilities — workflows

Production workflows in [`workflows/`](workflows/). Present in the repository, sectioned so the core reads clean; install the ones that fit the business.

| Workflow | What it produces | Guide |
|----------|------------------|-------|
| Content | Short-form video, carousels, cloned voiceover, free generation lanes | [`workflows/content/`](workflows/content/) |
| Lead generation | Local lead sourcing + business-audit tools (no third-party platform) | [`workflows/lead-gen/`](workflows/lead-gen/) |
| Publishing | Cross-post to social + newsletter from one source | [`workflows/publishing/`](workflows/publishing/) |
| Invoicing | Branded invoices/receipts as PDFs with a pay link | [`workflows/invoicing/`](workflows/invoicing/) |
| Client deployment | Standing the same agent up for others, on their machines | [`workflows/client-deployment/`](workflows/client-deployment/) |

The agent also builds its own operating surfaces — a live operator dashboard, a daily ops board, and a knowledge vault. See [`docs/capabilities/`](docs/capabilities/).

## Philosophy

Why the framework is shaped the way it is: voice-to-execution as architecture, sequencing over scattering, and the two moats — the voice-loop habit and cumulative context. See [`docs/philosophy/`](docs/philosophy/).

## Intentionally excluded

What deliberately stays out, and why — so the omissions are honest, not hidden:

- **Third-party platform builds.** The lead-gen tools ship in their local-run form only; the platform-specific (Apify) deployment is not included.
- **Client data and client-specific services.** Specific client bots, credentials, hostnames, and the cloud services tied to individual clients stay private.
- **A separate persona framework.** An adjacent, mostly-dormant agent persona built on a different gateway is out of scope for this repository.
- **Private knowledge-base contents.** The knowledge-vault *system* ships; its contents (finances, legal, medical, personal, client files) do not.
- **Secrets.** No keys, tokens, or credentials — the agent supplies its own during setup.

## Provenance

Every component ran in production before entering this repository; pieces that did not survive contact with reality are not here. The agent fleet derives from a hardened snapshot of an open-source collection, credited in [`.claude/agents/`](.claude/agents/). Released under the [MIT License](LICENSE).

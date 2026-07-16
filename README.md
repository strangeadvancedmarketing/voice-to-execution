<div align="center">
<h1>voice-to-execution</h1>
<p><strong>An operator framework for Claude Code — the rules, memory, agents, and hooks that let one person run a business by voice note.</strong></p>
<p>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-00d4ff.svg?style=flat-square" alt="License: MIT"></a>
<a href="https://claude.ai/code"><img src="https://img.shields.io/badge/built%20for-Claude%20Code-1a1a2e.svg?style=flat-square" alt="Built for Claude Code"></a>
<a href="#provenance--license"><img src="https://img.shields.io/badge/status-production--tested-2ea44f.svg?style=flat-square" alt="Status: production-tested"></a>
<a href="#contributing"><img src="https://img.shields.io/badge/PRs-welcome-00d4ff.svg?style=flat-square" alt="PRs welcome"></a>
</p>
</div>

Point your agent at this repository and it configures itself to work the way a seasoned operator's agent already works: it wakes up briefed, holds its context all day, remembers every correction, and turns a voice note into finished work. This is the operating system behind that — extracted from months of daily production use, sanitized, and made reusable.

It is not a prompt pack or a tutorial. It is the actual configuration — real agent definitions, real hooks, real rules — with the identity swapped for placeholders your agent fills during setup.

## Table of contents

- [Quickstart](#quickstart)
- [How it works](#how-it-works)
- [Repository structure](#repository-structure)
- [The core](#the-core)
- [The capabilities](#the-capabilities)
- [Requirements](#requirements)
- [Design principles](#design-principles)
- [Provenance & license](#provenance--license)
- [Contributing](#contributing)
- [Managed option](#managed-option)

## Quickstart

**If you have an agent (Claude Code, or compatible):**

```
Read https://github.com/strangeadvancedmarketing/voice-to-execution — start with SETUP_AI.md — and set this framework up for me. Interview me first.
```

Your agent reads [`SETUP_AI.md`](SETUP_AI.md), interviews you about your business and tools, and installs only the parts that fit. It ends with one end-to-end proof: you send a voice note, and the finished work comes back.

**If you're the human:** everything you need is in [`SETUP_HUMAN.md`](SETUP_HUMAN.md) — four steps, no reading required.

## How it works

```
voice note ──▶ local transcription ──▶ agent executes ──▶ text + voice reply
   (phone)      (faster-whisper)        (tools, memory,      (back to the
                                         hooks, rules)         same thread)
```

The loop is the product. If a task requires the human to open an app, edit a file, or click through a UI, the workflow is not done. Everything else in this repository exists to make that loop reliable, cheap to run all day, and smarter every week.

## Repository structure

The repository separates **who the agent is** from **what the agent does**. The first is the core and installs as a unit; the second is a library you draw from.

```
voice-to-execution/
├── .claude/                 # THE CORE — drop-in configuration (real files)
│   ├── CLAUDE.md.template    #   operating model + hard rules (the OS)
│   ├── settings*.template    #   hook wiring + plugin enablement
│   ├── agents/               #   the subagent fleet
│   ├── skills/               #   on-demand capabilities
│   ├── rules/                #   always-loaded operating rules
│   ├── hooks/                #   the continuity loops (boot, drift, reorient)
│   └── memory/               #   the persistent-memory system + examples
│
├── docs/                    # THE WHY & HOW — one guide per subsystem
│   ├── philosophy/           #   why voice-to-execution works
│   ├── connectors/           #   integrations, with real setup commands
│   ├── rules/                #   the operating rules, explained + the lessons behind them
│   ├── efficiency/           #   running a heavy agent on a normal plan
│   └── capabilities/         #   the surfaces the agent built (dashboard, ops board, vault)
│
└── workflows/               # WHAT IT DOES — production workflows, drawn from as needed
    ├── content/              #   short-form video, carousels, voice cloning
    ├── lead-gen/             #   local lead sourcing + audit tools
    ├── publishing/           #   cross-post to social + newsletter
    ├── invoicing/            #   branded invoices with pay links
    └── client-deployment/    #   deploying the same agent for others
```

[`STACK.md`](STACK.md) is the complete manifest — every component in one place, each pointing to its documentation.

## The core

What makes the agent behave like a chief of staff instead of a chatbot. This installs as a unit and is the point of the repository.

| Layer | What it does |
|-------|--------------|
| **Operating model + hard rules** (`CLAUDE.md`) | How the agent sequences work, protects the human's money and time, and the non-negotiable rules whose violation costs trust. |
| **Operating rules + lessons** (`rules/`) | The working style, plus 40+ lessons each paired with the mistake that taught it — so a new agent inherits the perfected version. |
| **Memory system** (`memory/`) | Typed, human-readable memory files with an always-loaded index and lazy loading — persistent context that scales to hundreds of entries without bloating the window. |
| **Continuity hooks** (`hooks/`) | The loops that keep the agent grounded: a session-start briefing, an in-session drift monitor, a post-compaction reorient, and pre-compaction snapshots. Enforced by the harness, not the model's goodwill. |
| **Agent fleet** (`agents/`) | Subagents that carry operational load in isolated context and return conclusions, so the main conversation stays sharp. |
| **Connectors** (`docs/connectors/`) | How the agent reaches the world — messaging, calendar/email, a real logged-in browser, research, local AI — each with verified setup commands. |

## The capabilities

Production workflows the agent runs. Present in the repository, sectioned so the core reads clean; install the ones that match the business.

| Workflow | What it produces |
|----------|------------------|
| **Content** | Short-form video (Remotion), carousels, and voiceover in a cloned voice, on free/local generation lanes. |
| **Lead generation** | Local lead sourcing and business-audit tools — the same scrapers the framework runs, on the operator's own machine, no third-party platform required. |
| **Publishing** | Cross-posting to social platforms and a newsletter from a single source. |
| **Invoicing** | Branded invoices and receipts as PDFs with a pay link. |
| **Client deployment** | The pattern for standing the same agent up for others, on their own machines. |

## Requirements

| Requirement | For | Notes |
|-------------|-----|-------|
| **Claude Code** (or a compatible agent) | Everything | The agent that reads this repo and runs the loop. |
| **Python 3.10+** | Local AI, hooks | Transcription (`faster-whisper`), TTS (`edge-tts`), most local tooling. |
| **Node.js 18+** | Hooks, MCP servers | The `.cjs` continuity hooks and `npx`-installed MCP servers. |
| **ffmpeg** | Media | Compression and transcode for the voice loop and content workflows. |
| **A messaging channel** | The voice loop | Telegram is the shipped, proven implementation; others are a documented build. |
| **An always-on machine** | Scheduled jobs | Optional — only the push layer (briefings, watchers) needs it; the voice loop does not. |

The complete list of what you bring (keys, accounts, a machine) is in [`WHAT_YOU_SUPPLY.md`](WHAT_YOU_SUPPLY.md); full platform-specific setup is in [`SETUP_AI.md`](SETUP_AI.md).

## Design principles

- **Voice-to-execution.** The messenger is the interface. The human talks; the agent executes; results return to the same thread.
- **Context is the scarcest resource.** Lazy-load everything, isolate heavy work in subagents, never dump when you can extract.
- **Verify, never guess.** Every claim is checked against the live source before it is stated.
- **Free and local first.** Paid services are a deliberate, verified exception — never a default.
- **Enforce with hooks, not hope.** Anything that must happen every time is a hook, because the harness runs it and the model cannot talk itself out of it.

## Provenance & license

Every component ran in production before it entered this repository; pieces that did not survive contact with reality are not here. The agent fleet derives from a hardened snapshot of an open-source collection, credited in [`.claude/agents/`](.claude/agents/). Keys, tokens, client data, and personal information are excluded by design — the agent supplies its own credentials during setup.

Released under the [MIT License](LICENSE).

## Contributing

Issues and pull requests are welcome. This framework is opinionated by design — proposals that keep the core lean and the loop reliable are the ones that land. If you adapt a business-specific workflow, sanitize it (names, targets, credentials) before opening a PR.

## Managed option

Setting this up yourself is free, and this repository is everything you need. If you would rather have it done for you — a fully managed agent running on your business, live within 24 hours — that is [Strange Advanced Marketing's Hosted Agent](https://strangeadvancedmarketing.com/bot). Same framework, run for you, because we run it on ourselves first.

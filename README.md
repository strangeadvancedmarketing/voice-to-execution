# voice-to-execution

**A working operator framework for AI-run business — built for Claude Code, cultivated in production, not theorized.**

This repo is the cleaned, shareable version of the stack behind [Strange Advanced Marketing](https://strangeadvancedmarketing.com): the rules, connectors, agents, and memory patterns that let one person run multiple businesses by voice note through Claude Code.

## Who this is for

You have an AI agent — Claude Code first and foremost; OpenClaw and similar agents work too — and you want it to operate like a chief of staff instead of a chatbot. You don't copy this repo. **You point your agent at it:**

> "Read https://github.com/strangeadvancedmarketing/voice-to-execution and set up what fits me."

Your agent reads `SETUP_AI.md`, interviews you, and adapts each piece to your life and business. Nothing here is install-and-forget; everything is a pattern your agent tailors.

## What's inside

| Directory | What it gives your agent |
|-----------|--------------------------|
| `rules/` | `hard-rules.md` (the trust layer — verification before claims, money protection, execute-don't-instruct) and `operating-rules.md` (communication, producing work, workflow, rhythm) |
| `connectors/` | Every integration the stack runs: the voice loop (Telegram + local transcription + TTS), Google suite CLI, the full **MCP-server layer** (payments, CRM, scraping, browser, machine, memory), **browser automation** (a real logged-in Chrome the agent drives), **scheduled tasks & hooks**, and **local/free AI** (whisper, edge-tts, voice clone, FFmpeg) |
| `agents/` | The subagent fleet — the load-bearing core four plus the full roster (planning, code quality, build/test, ops, research, growth) |
| `memory/` | The persistent memory pattern: typed files, an always-loaded index, boot-context compilation, and the lazy-loading that lets it scale to hundreds of files |
| `efficiency/` | `token-economy.md` — how a heavy agent runs all day on a normal plan: lazy loading, context hygiene, subagent isolation, knowledge-graph queries, model right-sizing |
| `philosophy/` | Why this works: voice-to-execution, sequencing over scattering, rhythm keeping |

Every integration ships with the **real, verified commands** — not placeholders. What's deliberately left out: API keys, tokens, and anything security-sensitive. Your agent supplies your own credentials during setup; the patterns and commands are complete.

## The core idea

**Voice-to-execution.** If a workflow requires the human to open an app, edit a file, or click through a UI, the workflow is not done. The human talks; the agent executes; the results come back where the human already lives (their messenger).

## Provenance

Everything here ran in production first — daily, for months, across real client work. Pieces that didn't survive contact with reality aren't in this repo.

MIT licensed. Built by Jereme Strange and his Claude. Setup guide for humans in `SETUP_HUMAN.md`, for agents in `SETUP_AI.md`.

## Want this running for you — without doing any of it?

Setting this up yourself is free and this repo is everything you need. If you'd rather have it done for you — a fully managed agent on your business, live within 24 hours of purchase — that's exactly what [Strange Advanced Marketing's Hosted Agent](https://strangeadvancedmarketing.com/bot) is. We run the same stack for clients that this repo describes, because we run it on ourselves first.

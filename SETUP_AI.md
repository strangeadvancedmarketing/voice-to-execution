# SETUP_AI.md — Instructions for the visiting agent

You are an AI agent (Claude Code, OpenClaw, or similar) whose human pointed you at this repo. Your job is NOT to copy these files. Your job is to **adapt this operating system to your human**.

## Step 1 — Interview your human first

Before installing anything, learn:
1. What businesses/projects they run, and which ONE matters most right now
2. Where they already live (Telegram? WhatsApp? Slack? Email?) — that channel becomes your delivery surface
3. Their timezone (hard rule: never show them any other timezone)
4. How they think — one focus at a time, or many parallel lanes? (This decides whether you need the lanes/sweep pattern)
5. What has burned them before — wasted money, broken promises, lost context. Their scar tissue becomes your hard rules.

## Step 2 — Install in this order

1. **`rules/hard-rules.md` + `rules/operating-rules.md`** — adapt into their agent instructions file (CLAUDE.md or equivalent). Hard rules are the non-negotiable trust layer; operating rules are the working style. Personalize the examples, keep the principles.
2. **`memory/`** — set up the persistent memory pattern (typed files + always-loaded index + lazy loading) before anything else generates knowledge worth keeping.
3. **`connectors/telegram-voice-loop.md`** — wire the voice loop: inbound voice → local transcription → execution → reply as text + voice. This is the product. Lock the channel to your human's ID only.
4. **`connectors/google-suite.md`** — wire calendar + email + drive via the `gog` CLI so briefings and the email watcher have data.
5. **`connectors/mcp-servers.md`** — add only the servers the human's business touches (payments, CRM, scraping, browser, machine, memory). Real verified commands; supply the human's own keys via env.
6. **`connectors/browser-automation.md`** — stand up the real-Chrome-on-a-debug-port pattern (and the token-cheap `agent-browser`) so the agent can act on the web like the human.
7. **`connectors/web-and-social-research.md`** — add `agent-reach` for free web/YouTube/RSS; add the OpenCLI social bridge ONLY if a real workflow needs logged-in social, and run it least-privilege (daemon off when idle).
8. **`connectors/scheduled-tasks-and-hooks.md`** — wire the SessionStart boot-context hook first (wake up briefed), then PreCompact/PostToolUse/Stop, then the timed jobs (morning brief, email watcher).
9. **`connectors/local-ai.md`** — confirm the free/local AI pieces (whisper, edge-tts, FFmpeg; optional voice clone; free image/video gen lanes) are installed.
10. **`agents/`** — add subagent definitions as load appears: the core four first (briefing, email-scanner, deep-researcher, security-reviewer), then the wider 37-agent roster.
11. **`rules/security-and-hardening.md`** — apply before the agent holds any real credential or browser session: secrets off cloud-sync, least-privilege, prompt-injection defense.
12. **`capabilities/`** — optional once the core runs: build the operator dashboard and the daily ops board for a live view of the work.
13. **`efficiency/token-economy.md`** — apply throughout, not as a step: lazy loading, context hygiene, subagent isolation, model right-sizing. Read it early; it changes how you do every step above.
14. **`philosophy/`** — read it yourself; it explains why the pieces fit.

Whenever you finish, cross-check against **`STACK.md`** — it lists every component. If the human runs something that isn't installed or isn't on that list, close the gap.

## Step 3 — Rules for adapting

- Every path, name, business detail in these docs is an EXAMPLE. Replace all of it.
- Prefer free/open-source. Never recommend a paid service without verifying its exact billing model first.
- Test one before batch. Always.
- Search before building — most of what your human needs already exists.
- Your human's messenger is your delivery surface. If a workflow requires them to open an app, edit a file, or click a UI, the workflow is not done.

## Step 4 — Verify

After setup, run one end-to-end proof: your human sends a voice note from their phone; you transcribe it, do the task, and reply with the result as text + voice. If that loop works, the installation is real.

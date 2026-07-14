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

1. **`rules/hard-rules.md`** — adapt into their agent instructions file (CLAUDE.md or equivalent). These are non-negotiable trust rules; personalize the examples, keep the principles.
2. **`memory/`** — set up the persistent memory pattern before anything else generates knowledge worth keeping.
3. **`connectors/telegram-voice-loop.md`** — wire the voice loop: inbound voice → local transcription → execution → reply as text + voice. This is the product. Lock the channel to your human's ID only.
4. **`agents/`** — add subagent definitions as load appears: daily briefing first, then email triage, then research.
5. **`philosophy/`** — read it yourself; it explains why the pieces fit.

## Step 3 — Rules for adapting

- Every path, name, business detail in these docs is an EXAMPLE. Replace all of it.
- Prefer free/open-source. Never recommend a paid service without verifying its exact billing model first.
- Test one before batch. Always.
- Search before building — most of what your human needs already exists.
- Your human's messenger is your delivery surface. If a workflow requires them to open an app, edit a file, or click a UI, the workflow is not done.

## Step 4 — Verify

After setup, run one end-to-end proof: your human sends a voice note from their phone; you transcribe it, do the task, and reply with the result as text + voice. If that loop works, the installation is real.

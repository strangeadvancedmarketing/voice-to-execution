# The Operator Dashboard — watch the agent work, live

A local web app that turns the agent's raw session into a live operator view. Built by the agent itself in about a day; runs on localhost, nothing hosted.

> **Two ways to meet this need — your choice.** This live, local **operator dashboard** and the shareable **daily ops board** Artifact (`daily-ops-board.md`) are two options for the same job: one glanceable surface for where things stand. Pick the one that fits — live and local, or portable and shareable. The rest of this page is the dashboard option.

## What it is

A Node + Express app serving a single-page dashboard with five columns:

1. **Terminal** — a real terminal (node-pty + xterm.js). Launch the agent inside it and the dashboard *is* your terminal, not a mirror of one.
2. **Task board** — the current to-do list.
3. **What the agent's doing now** — the live action.
4. **Follow-ups** — who owes what, what's due.
5. **Messenger** — the Telegram (or other) conversation, side by side with the work.

## How it works

The core trick: it **reads the agent's own session file** — `~/.claude/projects/<project>/*.jsonl` — and renders it live. Tool calls stream down the left, the human's messenger conversation down the right. Nothing is faked or re-implemented; the dashboard mirrors exactly what actually happened in the session, because it's reading the session's own record.

## Why it exists

Two screens: the human keeps the dashboard on one and their normal work on the other. They can *see* the agent reasoning, calling tools, and shipping — the trust that comes from watching the machine work — without living in a terminal. It's the glass cockpit for a voice-driven operator.

## To build your own

Point the agent at its own session directory: "build me a local dashboard that tails my session `.jsonl` and shows my task list, tool calls, and messages live, with a real embedded terminal (node-pty + xterm.js)." The session JSONL is the single source of truth; everything else is presentation.

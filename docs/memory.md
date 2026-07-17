# The Memory Pattern

An agent without persistent memory re-learns its human every session. This pattern is how one agent accumulated months of compounding context — the single biggest moat in the whole stack.

## Structure

```
memory/
  MEMORY.md          ← index, always loaded at session start. One line per memory.
  feedback_*.md      ← corrections and confirmed approaches ("why" included)
  project_*.md       ← ongoing work, goals, decisions with dates
  reference_*.md     ← runbooks, tool gotchas, verified how-tos
  user_*.md          ← who the human is, how they think, what they need
```

## Rules that make it work

1. **The index is the contract.** MEMORY.md is small and always in context; individual files load on demand when their topic surfaces. Never put full memory content in the index.
2. **Feedback memories capture the WHY.** "Human corrected X → because Y → apply by Z." A correction saved without its reason gets re-violated.
3. **Convert relative dates to absolute** ("next Friday" → "2026-07-17") — memories outlive the week they were written.
4. **Update, don't duplicate.** Before saving, check if a file already covers it. Delete memories that turn out wrong.
5. **Boot context compilation.** A session-start hook compiles handoff docs, trackers, and calendar into one boot file injected automatically — the agent wakes up already knowing where things stand.
6. **Session handoffs.** Before a session ends, write what's done / in-progress / blocked / next. The next session starts from the handoff, not from zero.

## Lazy loading — the pattern that makes it scale

This system runs with **hundreds** of memory files without bloating the context window, because of one rule: **the index is always loaded; the files never are, until their topic surfaces.** `MEMORY.md` (one line per memory) is the only thing in context at all times. When the human mentions a client, a tool, or a project, the agent reads *that* file — and only that file. A stack with 400+ memories costs the same per-turn context as one with 20, because 380 of them sit on disk as pointers until needed. Without lazy loading, persistent memory eventually eats the whole window; with it, memory compounds for free. (See `efficiency/token-economy.md`.)

## Two layers: files (the floor) + associative capture & recall (the full layer)

The typed files above are the **floor**: they work with zero extra setup, and they're auditable (the human can read and correct them), portable (any agent consumes markdown), and cheap (no infra). Start here; most of the value is here.

The **full** memory layer adds `neural-memory` on top, and it has two halves that must both be on:

- **Capture** — hooks (`nmem-hook-*`) auto-save every session into a local brain. See `connectors/scheduled-tasks-and-hooks.md`.
- **Recall** — the `nmem-mcp` MCP server gives the agent live tools (`nmem_recall`, `nmem_context`, `nmem_remember`) so it pulls relevant past context mid-session on its own, instead of re-reading files. See `connectors/mcp-servers.md`.

Wire **both** or you capture history and never recall it (an easy trap: the capture hooks are separate from the recall MCP).

## Why the brain is not a vector database

The neural-memory brain is a **spreading-activation graph**: memories are nodes joined by weighted links, recall walks those links (with reinforcement so used memories strengthen and decay so unused ones fade), and there's full-text search on top. It is **not** a vector database and does no nearest-neighbor similarity. Combined with the typed files, that makes the whole system auditable and associative rather than an opaque embedding store. `neural-memory` is third-party; if it won't install, the file floor still stands on its own.

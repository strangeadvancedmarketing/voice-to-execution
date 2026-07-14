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

## Why this beats a vector database

Typed files with an index are auditable (the human can read and correct them), portable (any agent can consume markdown), and cheap (no infra). Associative recall can be layered on top later; start with files.

# State Templates

These are the operator state files the agent reads and maintains — the ones the
`SessionStart` boot compiler pulls into every session's opening context, and that
give the agent continuity across days. They're the "where things stand" layer.

Copy these into your working dir (or wherever your `CLAUDE_PERSIST_DIR` / boot
compiler points) and replace the example content with your own. The content here is
**fake on purpose** — a stand-in agency called *Acme Studio* — so you can see the
shape without inheriting anyone's data.

| File | What it holds | Who updates it |
|------|---------------|----------------|
| [`HANDOFF.md`](HANDOFF.md) | End-of-session state: what's done, in-progress, blocked, next. | Agent, at session end / when context gets long. |
| [`LANES.md`](LANES.md) | The parallel workstreams ("lanes") + the daily sweep cadence. | Agent, at check-ins. |
| [`FOLLOWUPS.md`](FOLLOWUPS.md) | Open threads waiting on someone — the "ball on our side" tracker. | Agent, whenever a thread moves. |
| [`trackers/`](trackers/) | One file per client/project/entity — the durable source of truth. | Agent, whenever that entity changes. |

**How they wire in:** the boot compiler (`.claude/hooks/boot-compiler.cjs`) reads these at `SessionStart` and prints a compiled
briefing, so a new session opens already knowing the state. Keep each one tight —
these are read into context every session, so bloat costs tokens. Trim ruthlessly.

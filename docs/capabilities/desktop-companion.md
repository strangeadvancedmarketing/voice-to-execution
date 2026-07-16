# The Desktop Companion — see what your agent is doing (optional)

A small always-on-top robot overlay that shows, in real time, what the AI agent is doing right now — the tool it's calling, the file it's touching, the reply it just sent. The human glances at it instead of scrolling the terminal.

**This is optional — the stack runs fine without it.** It exists for one kind of person: **someone running the [Telegram voice loop](../connectors/telegram-voice-loop.md) who doesn't want to stare at a terminal, but still wants to see that their Claude is actually working.** You voice-note a task from your phone; the little guy on your screen tells you it's reading a file, running a command, sending a reply — no log lines to read. If you live in the terminal, skip it.

## What it does

- **Live activity** — the current tool call, its target, and status, streamed as the agent works.
- **Reply surfacing** — mirrors the agent's latest reply so the human catches it without switching to the messenger.
- **Stays out of the way** — a compact robot overlay in a corner. Drag him anywhere; the ✕ on his head closes just the overlay (your Claude Code terminal keeps running).

## How the real-time display works

The actual code lives in this repo at [`tools/desktop-companion/`](../../tools/desktop-companion/) — nothing hidden. The pipeline:

```
Claude Code  --PostToolUse hook-->  hook-bridge.js  --WebSocket :9876-->  main.js  -->  index.html
 (every tool call)                  (stdin JSON)      (localhost)          (WS server)   (speech bubble)
```

Claude Code fires a **PostToolUse** hook after every tool call; `hook-bridge.js` pushes that event to a local WebSocket and exits in under a second (never blocks the agent); the Electron overlay (`main.js`) forwards it to the renderer (`index.html`), which formats it into a phrase in the speech bubble. It launches **hidden** (no console window) so the overlay appears without a second terminal popping up.

Setup and the exact hook-wiring snippet are in [`tools/desktop-companion/README.md`](../../tools/desktop-companion/README.md). The config templates in this repo already list the bridge as an **optional** PostToolUse hook (left out of the active wiring so a literal install throws no errors — add it once you've installed the companion).

## Why an overlay and not a log

The terminal scrolls; the overlay holds. The human wants to know "what is it doing right now" without reading, and "did it just reply" without switching apps. A glanceable surface beats a wall of log lines.

## The principle

Ambient awareness. The agent works; the companion makes that work legible at a glance, so the human never has to babysit a terminal to know where things stand.

---

Standalone version (its own repo): **github.com/strangeadvancedmarketing/claude-buddy**

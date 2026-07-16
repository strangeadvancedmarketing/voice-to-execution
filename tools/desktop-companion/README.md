# Desktop Companion (optional)

A small always-on-top robot overlay that shows, in real time, what your Claude is
doing right now — the tool it's calling, the file it's touching, the command it's
running — in a speech bubble. You glance at it instead of scrolling the terminal.

**This is optional.** The whole stack runs fine without it. It exists for one kind
of person: **someone running the Telegram voice loop who doesn't want to stare at a
terminal, but still wants to see that their Claude is actually working.** You voice-note
a task from your phone, and the little guy on your screen tells you it's reading a file,
running a command, sending a reply — without you reading a single log line.

If you live in the terminal, skip this. If you'd rather not, this is for you.

## What it shows

- **Live tool calls** — "📖 Reading invoice.py", "⚡ Running git push", "🔎 Searching for…"
  stream into the speech bubble as they happen.
- **Idle state** — after 10s of quiet it goes idle (blinks, looks around) so you know
  it's waiting, not stuck.
- **Stays out of the way** — a 120px robot in the corner. Drag him anywhere; the ✕ on
  his head closes just the overlay (your Claude Code terminal keeps running).

## How the real-time display actually works

This is the whole pipeline — nothing hidden, it's all in this folder:

```
Claude Code  --PostToolUse hook-->  hook-bridge.js  --WebSocket :9876-->  main.js  -->  index.html
 (every tool call)                  (stdin JSON)      (localhost)          (WS server)   (speech bubble)
```

1. Claude Code fires a **PostToolUse** hook after every tool call.
2. The hook runs `hook-bridge.js`, which reads the tool JSON from stdin and pushes it
   to a local WebSocket (`ws://localhost:9876`). It exits in <1s and never blocks Claude.
3. `main.js` runs the Electron overlay + the WebSocket server, and forwards each event
   to the renderer.
4. `index.html` formats it into a human phrase and drops it in the speech bubble.

## Setup

Requires [Node.js](https://nodejs.org). Then:

```bash
cd tools/desktop-companion
npm install          # pulls electron + ws (see package.json)
npx electron .       # launch it — a robot appears bottom-right
```

To launch it **hidden** (no console window pops up — good for autostart alongside your
Telegram loop), run `start_buddy_hidden.vbs` instead (Windows).

### Wire up the live tool-call feed

Add the bridge to your **PostToolUse** hook in `~/.claude/settings.json`. Point the path
at wherever this folder lives (the config templates in this repo default to
`{{HOME}}/claude-buddy`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "node {{HOME}}/claude-buddy/tools/desktop-companion/hook-bridge.js" }
        ]
      }
    ]
  }
}
```

That's it. Start a Claude Code session and the overlay lights up with each tool call.

## The principle

Ambient awareness. The agent works; the companion makes that work legible at a glance,
so you never have to babysit a terminal to know where things stand.

---

Standalone version (its own repo): **github.com/strangeadvancedmarketing/claude-buddy**

# Scheduled Tasks & Hooks — the agent that runs without being asked

The voice loop is pull (human speaks, agent acts). This is push: the agent does work on a timer and when the session starts, so the human wakes up to progress instead of a blank prompt.

## Two mechanisms

**Hooks** fire on events inside the agent (session start, before compaction, after a tool runs). **Scheduled tasks** fire on the clock, outside any session (OS scheduler / cron).

## The scripts ship in this repo — `.claude/hooks/`

The hooks below are **real, working, generalized scripts in [`.claude/hooks/`](../../.claude/hooks/)** — sanitized from the production versions (personal paths, secrets, and business specifics replaced with `{{...}}` placeholder tokens the installing agent fills during setup). Fill the tokens once; there are no secrets in these files. The Node scripts (`.cjs`/`.js`) port cleanly to macOS/Linux; `session-start.sh` needs a bash shell and its system-status checks are Windows-oriented (trim or port those lines elsewhere).

| Hook file | Event | What it does |
|-----------|-------|--------------|
| `session-start.sh` | SessionStart | Entry point: runs `boot-compiler.cjs`, then prints a short system-status block (disk free, Node process count, neural-memory availability). SessionStart stdout is injected into the conversation. |
| `boot-compiler.cjs` | called by `session-start.sh` | Compiles handoff + lanes + follow-ups + tracker headers + today's session log + a recent snapshot + calendar into one `BOOT_CONTEXT.md` and prints it. |
| `precompact-saver.cjs` | PreCompact, Stop | Reads the live transcript the harness passes on stdin and snapshots recent work + git/state before the window compacts. |
| `reorient.cjs` | PostCompact | Re-injects boot context + the pre-compaction snapshot + active lanes + handoff so the agent doesn't drift on the summarized window. |
| `session-logger.cjs` | Stop | Appends a session record (timestamp, changed files) to a per-day log. |
| `drift-monitor.cjs` | UserPromptSubmit | Watches token depth (and a messenger reply "ritual") and silently re-anchors the agent when a long session starts to slip. |
| `contextual-display.js` | PostToolUse (Read/Edit/Write) | Auto-opens a referenced document (PDF/Office) on the workspace screen and closes the previous one; state in `display-state.json`. Windows-specific. |

**Configure once:** there are no environment variables to set. Each script carries `{{...}}` tokens at the top — `{{HOME}}`, `{{VAULT_DIR}}`, `{{TIMEZONE}}`/`{{TIMEZONE_ABBR}}`, `{{PROJECT_SLUG}}` (memory folder), `{{GOOGLE_CLI}}` (calendar binary), `{{VOICE}}` — that you replace once with your own paths and values. The drift monitor's context-window size is the `WINDOW` constant in `drift-monitor.cjs` (default `1_000_000`); set it to your model's window. See [`../hooks.md`](../hooks.md) for the full per-token reference.

## SessionStart hook — wake up already briefed

The most valuable hook. On every session start, `session-start.sh` runs `boot-compiler.cjs`, which compiles the current state — handoff notes, active lanes, follow-ups, tracker headers, today's session log, a recent compaction snapshot, and (via `{{GOOGLE_CLI}}`) today's calendar — into one `BOOT_CONTEXT.md` and prints it, so the agent opens knowing exactly where things stand instead of re-reading everything. Wire the calendar once `connectors/google-suite.md` is set up; without a CLI the compiler just skips that block.

## Settings wiring — this is `.claude/settings.json.template`

The `{{HOME}}` tokens below are filled during setup (Claude Code also expands `~` to your home directory, so a hand-written config can use `~/.claude/hooks/...`). This mirrors the shipped [`.claude/settings.json.template`](../../.claude/settings.json.template):

```jsonc
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command",
        "command": "bash {{HOME}}/.claude/hooks/session-start.sh",
        "timeout": 20 }] }
    ],
    "PreToolUse": [
      { "matcher": "WebFetch",
        "hooks": [{ "type": "command",
          "command": "echo 'WebFetch is blocked - opens visible browser windows. Use curl via Bash instead.' && exit 1",
          "timeout": 5 }] }
    ],
    "PreCompact": [
      { "matcher": "*", "hooks": [
        { "type": "command", "command": "nmem-hook-pre-compact", "timeout": 30 },
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/precompact-saver.cjs", "timeout": 10 }
      ] }
    ],
    "PostCompact": [
      { "matcher": "*", "hooks": [
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/reorient.cjs", "timeout": 10 }
      ] }
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "nmem-hook-stop", "timeout": 30 },
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/precompact-saver.cjs", "timeout": 10 },
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/session-logger.cjs", "timeout": 10 }
      ] }
    ],
    "PostToolUse": [
      { "matcher": "Read|Edit|Write", "hooks": [
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/contextual-display.js", "timeout": 5 }
      ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command", "command": "node {{HOME}}/.claude/hooks/drift-monitor.cjs", "timeout": 5 }
      ] }
    ]
  }
}
```

> The `nmem-hook-pre-compact` / `nmem-hook-stop` entries are the **capture** half of `neural-memory` — they auto-save each session to the local brain. The **recall** half (the `nmem-mcp` MCP that gives the agent `nmem_recall` / `nmem_context` / `nmem_remember`) is registered separately in `connectors/mcp-servers.md`. Wire **both** for the full memory layer, or you capture history and never recall it. If you don't run neural-memory at all, drop these two lines — the shipped scripts stand on their own. The `PreToolUse` guard is optional (it blocks the visible-browser `WebFetch` tool); keep it only if you rely on `curl` instead. The `contextual-display.js` hook is Windows-specific desktop UI; drop it if you don't want documents auto-surfaced. If a `{{HOME}}` path doesn't resolve on your setup, use the full path (e.g. `C:\Users\<you>\.claude\hooks\...`).

## The full hook set — this is the actual production wiring

Every one of these runs in the real stack.

- **SessionStart** → `session-start.sh` (runs `boot-compiler.cjs`). Compiles state into the injected briefing (above).
- **PreToolUse** → an optional guard that blocks tools you never want fired blindly (e.g. a fetch tool that pops visible browser windows). A hook is the enforcement layer memory can't be — the harness runs it, not the agent's goodwill.
- **PreCompact** → `precompact-saver.cjs` (+ optional `nmem-hook-pre-compact`) persists the session before the window compacts, so nothing is lost to summarization.
- **PostCompact** → `reorient.cjs` re-grounds the agent right after a compaction (what was I doing, what's still open) so it doesn't drift on the summarized context.
- **PostToolUse** → `contextual-display.js` on Read/Edit/Write surfaces referenced documents on the workspace screen. Windows-specific and optional; drop it or port the launch calls elsewhere.
- **Stop** → `precompact-saver.cjs` + `session-logger.cjs` (+ optional `nmem-hook-stop`).
- **UserPromptSubmit** → `drift-monitor.cjs` watches for the agent sliding off its standing rules and re-anchors it early.

The pattern: anything that must happen *every time* — regardless of whether the agent "remembers" — is a hook, because the harness enforces hooks and can't be talked out of them.

## Scheduled tasks — work on the clock

Run the agent headless on a timer with `claude -p "<instruction>"` (one-shot: runs the full agent loop, tools included, then exits). Drive it from the OS scheduler:

- **Windows** — Task Scheduler. Create a task with:
  `schtasks /Create /SC DAILY /ST 06:00 /TN "AgentMorningBrief" /TR "cmd /c claude -p \"compile today's brief and send it\""`
  (Use `/SC HOURLY /MO 4` for the ~4h email watcher.)
- **macOS/Linux** — `cron` (`0 6 * * * claude -p "..."`) or a launch agent.

Real jobs from this stack:
- **Morning briefing** (~6am): compile the day's board, send it to the messenger.
- **Email watcher** (~every 4h): triage the inbox, ping ONLY on actionable mail (see `connectors/google-suite.md`).
- **Follow-up sweeps**: check who owes a reply, surface anyone waiting too long.

**This layer needs a machine that stays on.** Hooks fire inside a live session, but scheduled jobs fire from the OS clock — so the computer (or a cheap always-on VPS) has to be awake and logged in at the trigger time. A laptop that sleeps at night won't run a 6am brief. If you don't have an always-on machine, either skip the push layer (the pull voice loop still works fully) or run these jobs on a small VPS. This is exactly the question `SETUP_AI.md` asks up front ("Is there a machine that stays on?").

**Mind the cost of unattended runs.** Every scheduled `claude -p` run is a full agent turn that consumes tokens (or plan usage) whether or not it finds anything to do. A watcher every 4h is ~6 runs/day; an hourly one is 24. Keep the instruction tight, make the job exit fast when there's nothing to report, and don't schedule more frequently than the work actually changes — an idle run still costs. If you're on a metered API key rather than a flat plan, price a day of runs before turning a job loose.

## Watchers without an agent — push with no token cost

The scheduled jobs above each run a full agent turn (`claude -p`). There is a second, cheaper pattern that is just as important: a **plain Python watcher** the OS scheduler runs on a timer, with **no Claude session and no agent turn at all**. It checks one thing — an inbox, a page, a payment, an application window — and if there is something worth saying, it posts straight to the messenger through the Bot API. No model, no tokens, no plan usage. This is how the human gets a morning briefing or an alert *before they ever start the agent*, and it runs whether or not any session is open.

Use the agent (`claude -p`) when the job needs judgment — triage, drafting, deciding what matters. Use a plain watcher when the job is a mechanical check against a fixed signal ("did this page's wording change," "is there new mail from a real person," "did a payment land"). The watcher does the cheap polling and only ever wakes the human — never the agent.

**Windows: run it silent.** A naked `python.exe` task pops a console window that steals focus mid-keystroke. Wrap it so nothing flashes: call `pythonw.exe` (no console), or drive the script through a tiny VBS launcher that runs hidden. Point the scheduled task at the VBS, not the script:

```vbscript
' run_hidden.vbs — launch a script with no visible window
Set sh = CreateObject("WScript.Shell")
sh.Run "pythonw.exe " & Chr(34) & WScript.Arguments(0) & Chr(34), 0, False   ' window-state 0 = hidden
```
```powershell
# schedule it (Task Scheduler): the VBS runs pythonw hidden, the watcher never flashes a window
schtasks /Create /SC HOURLY /MO 4 /TN "InboxWatcher" `
  /TR "wscript.exe {{HOME}}\watchers\run_hidden.vbs {{HOME}}\watchers\watch.py"
```

The watcher itself reads the bot token and chat id from the environment (never hardcoded), checks its signal, and `POST`s to `sendMessage` **only when there is something real**:

```python
import os, json, requests

TOKEN   = os.environ["TELEGRAM_BOT_TOKEN"]   # from .env / environment — never hardcode a token
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
SEEN    = "seen.json"

def load_seen():
    try:
        with open(SEEN, encoding="utf-8") as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()

def save_seen(seen):
    with open(SEEN, "w", encoding="utf-8") as f:
        json.dump(sorted(seen), f)

def notify(text):
    requests.post(
        f"https://api.telegram.org/bot{TOKEN}/sendMessage",
        json={"chat_id": CHAT_ID, "text": text},
        timeout=20,
    )

def check():
    # Return [(id, message), ...] for anything new worth surfacing.
    # e.g. poll an inbox, diff a watched page, read a payments API.
    return []

seen = load_seen()
for item_id, message in check():
    if item_id in seen:
        continue                 # already pinged once — stay silent
    notify(message)
    seen.add(item_id)
save_seen(seen)
# no new items -> no POST, no ping, nothing. Silence is the default.
```

The `seen.json` dedup is load-bearing: it holds the IDs already pinged, so a job that fires every few hours never re-sends the same item. Without it a 4-hour watcher re-alerts the same email every cycle and trains the human to ignore the channel. (On Windows, open files `encoding="utf-8"` — subjects and page text carry emoji that crash the default cp1252 codec.)

The rules below apply doubly to this lane: silent by default, one ping per real event, timezone-locked, idempotent via `seen.json`.

## Rules that keep automation trustworthy

- **Silent by default, loud only when it matters.** A scheduled job that pings on every run trains the human to ignore it. Ping on signal, stay quiet otherwise.
- **Elevated/background scripts must log and confirm.** Anything running unattended writes what it did; anything needing elevation logs and pings on completion.
- **Idempotent.** Keep a `seen.json` or equivalent so a job that runs twice doesn't act twice (double emails, double posts).
- **Timezone-locked.** Every schedule is in the human's timezone; convert before you set the trigger.

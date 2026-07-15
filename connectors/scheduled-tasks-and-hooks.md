# Scheduled Tasks & Hooks — the agent that runs without being asked

The voice loop is pull (human speaks, agent acts). This is push: the agent does work on a timer and when the session starts, so the human wakes up to progress instead of a blank prompt.

## Two mechanisms

**Hooks** fire on events inside the agent (session start, before compaction, after a tool runs). **Scheduled tasks** fire on the clock, outside any session (OS scheduler / cron).

## The scripts ship in this repo — `hooks/`

The five hooks below are **real, working, generalized scripts in [`hooks/`](../hooks/)** — sanitized from the production versions (personal paths, secrets, and business specifics stripped and replaced with clear placeholders). Each has a CONFIG block at the top and a wiring comment. They run on Windows out of the box (PowerShell + Node) and port cleanly to macOS/Linux (the Node ones already do; the PowerShell one needs `pwsh` or a short bash rewrite).

| Hook file | Event | What it does |
|-----------|-------|--------------|
| `hooks/boot-context-compiler.ps1` | SessionStart | Compiles handoff + lanes + follow-ups + memory index + git state into one `BOOT_CONTEXT.md` and prints it (SessionStart stdout is injected into the conversation). |
| `hooks/precompact-saver.cjs` | PreCompact, Stop | Reads the live transcript the harness passes on stdin and snapshots recent work + state before the window compacts. |
| `hooks/reorient.cjs` | PostCompact | Re-injects boot context + the pre-compaction snapshot + active lanes so the agent doesn't drift on the summarized window. |
| `hooks/session-logger.cjs` | Stop | Appends a session record (timestamp, changed files) to a per-day log. |
| `hooks/drift-monitor.cjs` | UserPromptSubmit | Watches token depth (and, optionally, a messenger reply "ritual") and silently re-anchors the agent when a long session starts to slip. |

**Configure once:** each script resolves its paths from `$HOME`/`%USERPROFILE%` and an optional `AGENT_VAULT` environment variable (where your state files live). Set `AGENT_VAULT` and point the file paths in each CONFIG block at your own `HANDOFF.md` / `LANES.md` / `FOLLOWUPS.md` / memory index. Nothing else is required — there are no secrets in these files.

## SessionStart hook — wake up already briefed

The most valuable hook. On every session start, `hooks/boot-context-compiler.ps1` compiles the current state — handoff notes, active work, follow-ups, memory index, git state — into one boot file and prints it, so the agent opens knowing exactly where things stand instead of re-reading everything. (Uncomment the `gog` block in the script to fold in today's calendar once `connectors/google-suite.md` is wired.)

## Settings wiring — copy this into `~/.claude/settings.json`

```jsonc
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command",
        "command": "powershell -NoProfile -File ~/.claude/hooks/boot-context-compiler.ps1",
        "timeout": 20 }] }
    ],
    "PreToolUse": [
      { "matcher": "WebFetch",
        "hooks": [{ "type": "command",
          "command": "echo \"WebFetch blocked — use curl via Bash instead.\" && exit 1",
          "timeout": 5 }] }
    ],
    "PreCompact": [
      { "matcher": "*", "hooks": [
        { "type": "command", "command": "node ~/.claude/hooks/precompact-saver.cjs", "timeout": 10 }
      ] }
    ],
    "PostCompact": [
      { "matcher": "*", "hooks": [
        { "type": "command", "command": "node ~/.claude/hooks/reorient.cjs", "timeout": 10 }
      ] }
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "node ~/.claude/hooks/precompact-saver.cjs", "timeout": 10 },
        { "type": "command", "command": "node ~/.claude/hooks/session-logger.cjs", "timeout": 10 }
      ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [
        { "type": "command", "command": "node ~/.claude/hooks/drift-monitor.cjs", "timeout": 5 }
      ] }
    ]
  }
}
```

> Windows note: Claude Code expands `~` to your home directory in hook commands. If a path doesn't resolve on your setup, use the full path (e.g. `C:\Users\<you>\.claude\hooks\...`). The `PreToolUse` guard above is optional (it blocks the visible-browser `WebFetch` tool); keep it only if you rely on `curl` instead.

## The full hook set — this is the actual production wiring

Every one of these runs in the real stack. If you also run the **neural-memory** MCP (`connectors/mcp-servers.md`, flagged there as unverified), it adds two more hooks — `nmem-hook-pre-compact` (PreCompact) and `nmem-hook-stop` (Stop) — for associative capture. They're optional; the five scripts above stand on their own.

- **SessionStart** → `boot-context-compiler.ps1`. Compiles state into the injected briefing (above).
- **PreToolUse** → an optional guard that blocks tools you never want fired blindly (e.g. a fetch tool that pops visible browser windows). A hook is the enforcement layer memory can't be — the harness runs it, not the agent's goodwill.
- **PreCompact** → `precompact-saver.cjs` (+ optional `nmem-hook-pre-compact`) persists the session before the window compacts, so nothing is lost to summarization.
- **PostCompact** → `reorient.cjs` re-grounds the agent right after a compaction (what was I doing, what's still open) so it doesn't drift on the summarized context.
- **PostToolUse** → optional: a contextual-display hook or a desktop status-widget bridge. Not shipped here (they're environment-specific UI); wire your own if you want post-action state surfaced.
- **Stop** → `precompact-saver.cjs` + `session-logger.cjs` (+ optional `nmem-hook-stop`).
- **UserPromptSubmit** → `drift-monitor.cjs` watches for the agent sliding off its standing rules and flags it early.

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

## Rules that keep automation trustworthy

- **Silent by default, loud only when it matters.** A scheduled job that pings on every run trains the human to ignore it. Ping on signal, stay quiet otherwise.
- **Elevated/background scripts must log and confirm.** Anything running unattended writes what it did; anything needing elevation logs and pings on completion.
- **Idempotent.** Keep a `seen.json` or equivalent so a job that runs twice doesn't act twice (double emails, double posts).
- **Timezone-locked.** Every schedule is in the human's timezone; convert before you set the trigger.

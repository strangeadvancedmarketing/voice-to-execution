# Scheduled Tasks & Hooks — the agent that runs without being asked

The voice loop is pull (human speaks, agent acts). This is push: the agent does work on a timer and when the session starts, so the human wakes up to progress instead of a blank prompt.

## Two mechanisms

**Hooks** fire on events inside the agent (session start, before compaction, after a tool runs). **Scheduled tasks** fire on the clock, outside any session (OS scheduler / cron).

## SessionStart hook — wake up already briefed

The most valuable hook. On every session start, a script compiles the current state — handoff notes, active work, follow-ups, calendar, trackers — into one boot file and injects it, so the agent opens knowing exactly where things stand instead of re-reading everything.

```jsonc
// ~/.claude/settings.json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "startup",
        "hooks": [{ "type": "command", "command": "python compile_boot_context.py" }] }
    ]
  }
}
```

The compiler reads the memory index + open loops + calendar and writes one briefing. See `memory/README.md` for what it pulls from.

## Other hooks worth wiring

- **PreCompact** — before the context window compacts, persist a session snapshot so nothing important is lost in summarization.
- **PostToolUse** — capture every session to persistent memory automatically (feeds the neural-memory capture layer), or run a formatter/linter after file edits.
- **Stop** — write a one-line "what just happened" to the day's log.

## Scheduled tasks — work on the clock

Run the agent headless on a timer with `claude -p "<instruction>"` (one-shot: runs the full agent loop, tools included, then exits). Drive it from the OS scheduler:

- **Windows** — Task Scheduler (`schtasks`).
- **macOS/Linux** — `cron` or a launch agent.

Real jobs from this stack:
- **Morning briefing** (~6am): compile the day's board, send it to the messenger.
- **Email watcher** (~every 4h): triage the inbox, ping ONLY on actionable mail (see `connectors/google-suite.md`).
- **Follow-up sweeps**: check who owes a reply, surface anyone waiting too long.

## Rules that keep automation trustworthy

- **Silent by default, loud only when it matters.** A scheduled job that pings on every run trains the human to ignore it. Ping on signal, stay quiet otherwise.
- **Elevated/background scripts must log and confirm.** Anything running unattended writes what it did; anything needing elevation logs and pings on completion.
- **Idempotent.** Keep a `seen.json` or equivalent so a job that runs twice doesn't act twice (double emails, double posts).
- **Timezone-locked.** Every schedule is in the human's timezone; convert before you set the trigger.

# hooks/ — the automation wiring

Real, working, generalized versions of the hooks that run in production. Sanitized: personal paths, secrets, and business specifics are replaced with `{{...}}` placeholder tokens the installing agent fills during setup (the same tokens the rest of the repo uses). There are no credentials in any file.

| File | Event | Runtime | Purpose |
|------|-------|---------|---------|
| `session-start.sh` | SessionStart | Bash | Entry point. Runs `boot-compiler.cjs`, then prints a short system-status block (disk free, Node process count, neural-memory availability). |
| `boot-compiler.cjs` | via `session-start.sh` | Node | Compile handoff + lanes + follow-ups + tracker headers + today's session log + a recent compaction snapshot + calendar into one `BOOT_CONTEXT.md`, write it, and print it (injected at session start). |
| `precompact-saver.cjs` | PreCompact, Stop | Node | Snapshot recent work — read from the live transcript the harness passes on stdin — plus git and state files before the window compacts. |
| `reorient.cjs` | PostCompact | Node | Re-inject boot context + the latest snapshot + lanes + handoff after a compaction so the agent doesn't drift on the summarized window. |
| `session-logger.cjs` | Stop | Node | Append a session record (timestamp, changed files) to a per-day session log. |
| `drift-monitor.cjs` | UserPromptSubmit | Node | Re-anchor the agent when a long session drifts — token-depth bands plus a reply-ritual signal — by re-injecting the core rules and current state. |
| `contextual-display.js` | PostToolUse (Read/Edit/Write) | Node | Auto-open a referenced document (PDF/Office) on the workspace screen and close the previous one; tracks the open reference in `display-state.json`. |

`display-state.json` is the small state file `contextual-display.js` reads and writes; it is not itself a hook.

## Configure once

There are no environment variables to set. Each script carries `{{...}}` placeholder tokens at the top that you replace once during setup:

- `{{HOME}}` — home directory (holds `HANDOFF.md`, `LANES.md`, `FOLLOWUPS.md`, and `.claude/`).
- `{{VAULT_DIR}}` — the vault folder holding `BOOT_CONTEXT.md`, `snapshots/`, `sessions/`, `daily/`, and `trackers/`.
- `{{TIMEZONE}}` / `{{TIMEZONE_ABBR}}` — your timezone (e.g. `America/New_York` / `ET`); every timestamp is rendered in it.
- `{{PROJECT_SLUG}}` — the per-project folder under `.claude/projects/` that holds `memory/MEMORY.md`.
- `{{GOOGLE_CLI}}` — the calendar/email CLI binary `boot-compiler.cjs` calls for today's events (optional; leave the block if you have no CLI wired).
- `{{VOICE}}` — the TTS voice id referenced in the drift monitor's re-injected rules.

The drift monitor's context-window size is the `WINDOW` constant near the top of `drift-monitor.cjs` (default `1_000_000`); set it to your model's window so the depth bands land correctly. Its reply-ritual signal looks for a messenger reply tool whose name contains `telegram` — adjust that match in the script if your channel differs.

Full wiring snippet for `~/.claude/settings.json` is in [`connectors/scheduled-tasks-and-hooks.md`](connectors/scheduled-tasks-and-hooks.md).

## Platform

The Node hooks (`.cjs`) run cross-platform as-is. `session-start.sh` needs a bash shell (Git Bash on Windows) and its system-status checks (`df /c`, `tasklist`) are Windows-oriented — trim or port those few lines on macOS/Linux. `contextual-display.js` is Windows-specific (it shells out to `msedge`, `rundll32`, and `taskkill`); skip it or port the launch calls to your platform's open command.

## Test them

```bash
# boot compiler — compiles and prints BOOT_CONTEXT.md from your state files:
node boot-compiler.cjs
# drift monitor — force the deep band and see the re-anchor it would inject:
DRIFT_TEST_DEPTH=550000 DRIFT_DEBUG=1 node drift-monitor.cjs <<< '{}'
# the rest run against your real state files (harness passes JSON on stdin):
node precompact-saver.cjs <<< '{}'
node reorient.cjs
node session-logger.cjs <<< '{}'
```

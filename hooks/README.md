# hooks/ — the automation wiring

Real, working, generalized versions of the hooks that run in production. Sanitized: personal paths, secrets, and business specifics are stripped and replaced with clear placeholders. Each script has a CONFIG block at the top and a wiring comment; there are no tokens or credentials in any file.

| File | Event | Runtime | Purpose |
|------|-------|---------|---------|
| `boot-context-compiler.ps1` | SessionStart | PowerShell | Compile handoff + lanes + follow-ups + memory index + git state into one `BOOT_CONTEXT.md` and print it (injected at session start). |
| `precompact-saver.cjs` | PreCompact, Stop | Node | Snapshot recent work (from the live transcript) + state before the window compacts. |
| `reorient.cjs` | PostCompact | Node | Re-inject boot context + snapshot + lanes after a compaction so the agent doesn't drift. |
| `session-logger.cjs` | Stop | Node | Append a session record to a per-day log. |
| `drift-monitor.cjs` | UserPromptSubmit | Node | Re-anchor the agent when a long session drifts (token depth + optional reply-ritual signal). |

## Configure once

All scripts resolve paths from your home dir and one optional environment variable:

- `AGENT_VAULT` — folder holding `BOOT_CONTEXT.md`, `snapshots/`, `sessions/`, and `memory/MEMORY.md`. Defaults to `~/AgentVault`.
- `AGENT_TZ` — your timezone (default `America/New_York`).
- `AGENT_WINDOW` — context window size for the drift monitor (default `1000000`).
- `DRIFT_REPLY_TOOL` — optional; a substring of your messenger reply tool name (e.g. `telegram`) to enable the reply-ritual drift signal. Leave unset to run on token depth alone.

Then point the state-file paths in each CONFIG block at your own `HANDOFF.md` / `LANES.md` / `FOLLOWUPS.md`. Full wiring snippet for `~/.claude/settings.json` is in [`../connectors/scheduled-tasks-and-hooks.md`](../connectors/scheduled-tasks-and-hooks.md).

## Platform

The Node hooks (`.cjs`) run cross-platform as-is. The PowerShell compiler runs on Windows out of the box; on macOS/Linux install PowerShell 7 (`pwsh`) or port its ~40 lines of "read files, concatenate, print" to bash. Keep the `.ps1` pure-ASCII if you edit it — Windows PowerShell 5.1 mis-reads UTF-8 punctuation.

## Test them

```bash
# drift monitor — force the deep band and see the re-anchor it would inject:
DRIFT_TEST_DEPTH=550000 DRIFT_DEBUG=1 node drift-monitor.cjs <<< '{}'
# the others run against your real state files:
node precompact-saver.cjs <<< '{}'
node reorient.cjs <<< '{}'
node session-logger.cjs <<< '{}'
```

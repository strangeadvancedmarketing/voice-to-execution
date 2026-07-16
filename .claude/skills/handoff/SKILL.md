---
name: handoff
description: Generate a session handoff document for clean session transitions. Auto-saves what's done, in-progress, blocked, and next steps. Run at end of every session or when context is getting long.
risk: low
source: custom
---

# Session Handoff

Generate a handoff document that ensures the next session starts with full context.

## Steps

1. **Analyze current session** by reviewing:
   - What tasks were completed this session
   - What tasks were started but not finished (include exact state)
   - What's blocked and why
   - Any running background processes (PIDs, how to restart)
   - What {{OPERATOR_NAME}} said they want to do next

2. **Check system state:**
   ```bash
   # Active processes
   tasklist /FI "IMAGENAME eq node.exe" 2>/dev/null | head -10
   # Disk space
   df -h / 2>/dev/null || wmic logicaldisk get size,freespace,caption 2>/dev/null
   # Git status if in a repo
   git status --short 2>/dev/null
   ```

3. **Write the handoff document** to `{{HOME}}\HANDOFF.md` with this format:

   ```markdown
   # Session Handoff — YYYY-MM-DD HH:MM {{TIMEZONE_ABBR}}

   ## Completed
   - [what was finished]

   ## In Progress
   - [what was started, exact state, what's left]

   ## Blocked
   - [what's blocked and why]

   ## Running Processes
   - [any background services, PIDs, restart commands]

   ## Next Session Priorities
   1. [prioritized list based on what the operator said]

   ## System State
   - Disk: [free space]
   - MCP: [connection status]
   - Auth: [any tokens expiring soon]
   ```

4. **Also append to the session log** at `{{VAULT_DIR}}\sessions\YYYY-MM-DD.md` (append if it exists). ⚠️ Write session logs only to your own vault — never to a separate persona's or read-only reference vault. Writing logs to the wrong vault is a recurring mistake; confirm the target path first.

5. **Confirm** with the operator that the handoff looks right before ending session.

## Rules
- Always use {{TIMEZONE_ABBR}} for timestamps
- Be specific about state — "uploaded 3 of 5 videos" not "uploading videos"
- Include file paths for any work in progress
- Never skip the system state check
- This is the LAST thing that runs before a session ends

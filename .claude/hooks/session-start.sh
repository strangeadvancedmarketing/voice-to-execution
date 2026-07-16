#!/bin/bash
# Session Start Hook — Claude Code SENTINEL equivalent
# Compiles boot context from current state, then outputs system checks.

unset TZ

# Run the boot context compiler (SENTINEL equivalent)
# This reads HANDOFF, LANES, FOLLOWUPS, trackers, calendar
# and outputs compiled context for injection into the conversation
node "{{HOME}}/.claude/hooks/boot-compiler.cjs" 2>/dev/null

# System checks
echo ""
echo "--- SYSTEM STATUS ---"

# Disk space
DISK_FREE=$(df -h /c 2>/dev/null | tail -1 | awk '{print $4}')
echo "Disk free: ${DISK_FREE:-unknown}"

# Node processes (zombie bot detection)
TELEGRAM_PROCS=$(tasklist 2>/dev/null | grep -c "node" || echo "0")
echo "Node processes: $TELEGRAM_PROCS"

# nmem status
if command -v nmem-hook-pre-compact &>/dev/null; then
    echo "Neural memory: available"
else
    echo "Neural memory: NOT in PATH"
fi

exit 0

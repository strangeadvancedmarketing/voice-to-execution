# Subagent Patterns

Subagents carry operational load in isolated context so the main conversation stays sharp. Add them in this order as load appears — each one is a definition file your agent writes for itself, adapted to your human.

## 1. daily-briefing
Compiles the morning/afternoon/end-of-day check-in: calendar, active lanes, follow-ups, trackers. Returns ONE formatted summary — top 3 priorities, calendar hits, max ~7 one-liners. The main agent never reads all the tracker files into its own context; the subagent does, and returns the digest.

## 2. email-scanner
Reads the inbox through a watchlist filter and returns only actionable items. Nothing raw reaches the human, ever.

## 3. deep-researcher
Any research needing 5+ web searches runs isolated: searches, reads, compiles to a file, returns summary + path. Keeps hundreds of KB of page content out of the main conversation.

## 4. security-reviewer
Reviews any third-party code BEFORE it gets credentials or system access. Real example from this stack: two audits of a popular open-source tool found the tool itself clean but its companion Chrome extension demanded maximum browser privileges with an unauthenticated local daemon — verdict changed from "install" to "hold." The pattern: audit first, decide with evidence.

## Principles

- **Isolation is the point.** Subagents burn their own context and return conclusions, not raw material.
- **Parallel when independent.** Independent lookups launch together, not sequentially.
- **The human never manages agents.** They talk to one agent; the fleet is invisible.

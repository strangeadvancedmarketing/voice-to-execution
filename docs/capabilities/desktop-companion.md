# The Desktop Companion — see what your agent is doing

A small always-on-top overlay that shows, in real time, what the AI agent is doing right now — the tool it's calling, the file it's touching, the reply it just sent. The human glances at it instead of scrolling the terminal.

## What it does

- **Live activity** — the current tool call, its target, and status, streamed as the agent works.
- **Reply surfacing** — mirrors the agent's latest reply so the human catches it without switching to the messenger.
- **Stays out of the way** — a compact overlay in a corner of the screen, not a window to manage.

## How it works

It reads the agent's activity stream and renders it as a lightweight desktop overlay (an Electron app). It's launched alongside the agent's terminal at startup — and it launches **hidden** (no console window), so the overlay appears without a second terminal popping up next to it.

## Why an overlay and not a log

The terminal scrolls; the overlay holds. The human wants to know "what is it doing right now" without reading, and "did it just reply" without switching apps. A glanceable surface beats a wall of log lines.

## The principle

Ambient awareness. The agent works; the companion makes that work legible at a glance, so the human never has to babysit a terminal to know where things stand.

---

Reference implementation (open source): **github.com/strangeadvancedmarketing/claude-buddy**

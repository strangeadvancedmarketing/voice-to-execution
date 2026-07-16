# The Daily Ops Board — the visual heartbeat

A single web page (a shareable Artifact) that shows the human their whole day at a glance and updates in place all day long. It became a daily standard the moment it existed — the visual the human always wanted but never had, because it doesn't displace their working screen layout.

> **Two ways to meet this need — your choice.** A live, local **operator dashboard** (`operator-dashboard.md`) and this shareable **daily ops board** Artifact are two options for the same job: one glanceable surface for where the day stands. Pick the one that fits — live and local, or portable and shareable. The rest of this page is the ops-board option.

## What's on it

- **Top-3 priorities** for the day, with checkboxes.
- **Calendar strip** — today's meetings and hits, in the human's timezone.
- **Live status of the day's work** — chips that flip DONE / RUNNING / WAITING / REVIEW as things move.
- **Condensed follow-ups** — active rows only, never the full tracker.
- **Day-specific sections** — sweep results, findings, whatever today needs.

## How it works

The agent publishes the board once in the morning and **re-publishes the same file to the same URL** all day, so the human keeps one tab open. Status changes go up as they happen.

**On "real-time" — be honest about the mechanic:** the board is a sandboxed page (a strict CSP blocks it from fetching anything on its own), so it **cannot auto-poll for its own updates**. The content at the URL is always the latest the agent published; the open tab reflects it on a **refresh** (and reliably on reopen). Whether a given viewer live-updates an already-open tab is the host's behavior, not something the page controls — so notate for the human: *refresh to see the latest.* If you want a genuinely live surface with no refresh, that's the **operator dashboard** (a local app that reads the session stream directly) — the board trades live-ness for being portable and shareable.

## Why a page and not a dashboard app

It lives on a second screen without disturbing the human's working layout (terminal + messenger). It's also a reusable client deliverable format — status boards, checklists, proposals, audits all render the same way. Default to a living page over screenshots or PDFs for anything that changes.

## The principle

One glanceable surface, updated in place, that answers "what am I doing today and where does everything stand" without the human opening or managing anything.

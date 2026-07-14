# Google Suite by CLI

Gmail, Calendar, Drive, Sheets, Docs — all scriptable through a single free CLI (`gog`), so the agent can check calendars, triage inboxes, and deliver files without the human opening anything.

## Setup
- Install gog (free, open source), run OAuth once per account: `gog auth add you@gmail.com --services gmail,calendar,drive`
- Multiple accounts supported — personal + business each authed separately.

## The patterns that matter

**Calendar in every briefing.** The agent checks the calendar at every check-in and surfaces conflicts in the human's timezone. The human never opens a calendar app.

**Email watcher, not email dumps.** A scheduled job (every ~4h) that: trashes pure noise (social/stale promotions), pings the messenger ONLY for actionable human mail, and keeps a `seen.json` so nothing pings twice. Whitelist your funnel senders (booking tools, site-form processors) so a paying lead can never be silently filtered — and verify that whitelist against a REAL inbound email, not assumptions.

**Deliverables to Drive.** Finished media/docs get pushed to a shared Drive folder; the messenger gets the link. Nothing raw reaches the human.

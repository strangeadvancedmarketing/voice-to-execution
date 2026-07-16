# The Knowledge Vault — the second brain beside the agent

The agent's `memory/` files are its operational memory — how it runs. The **knowledge vault** is the bigger thing: a durable, human-readable knowledge base of the whole operation — projects, clients, research, decisions, content, session history — that both the human and the agent read and write. It's the "second brain," and it's a distinct layer from the agent's own memory.

## What it's built on

- **Obsidian** — a local, plain-markdown knowledge app. The vault is just a folder of `.md` files, so the agent reads and writes it with ordinary file tools while the human browses it in Obsidian. No lock-in, no database, no cloud dependency.
- **`[[wikilinks]]`** — notes link to each other by name. A tracker links to the client, the client to the decision, the decision to the source. The links form a graph you can traverse.
- **A knowledge graph** — a build step turns the whole vault into a queryable graph (nodes + edges). "How does X connect to Y / what do we know about Z" returns the relevant slice in ~1–2K tokens instead of grepping the whole vault for ~25–30K. Query the graph first; fall back to file reads only for a specific missing detail. (See `efficiency/token-economy.md`.)
- **Hourly snapshots** — a scheduled job snapshots vault state on a timer, so there's always a recent restore point and an audit trail of how things changed.

## Setting it up

Standing up the vault is deliberately low-tech:

1. **Install Obsidian** — free, from [obsidian.md](https://obsidian.md). It is a local markdown app, not a service: no account, no sign-up, nothing in the cloud. It just opens a folder.
2. **Open the folder as a vault** — *Open folder as vault* → point it at the directory you want as the second brain (`{{VAULT_DIR}}`). That is the whole install. Obsidian now renders that folder; the `[[wikilinks]]` and graph view light up as notes accumulate.
3. **Nothing new for the agent** — because the vault is just a folder of `.md` files, the agent reads and writes it with ordinary file tools. There is no Obsidian API or plugin to wire up; Obsidian is simply the human's window onto the same files the agent edits. (Point the knowledge-graph build step at this same folder — see above.)

**The habit that makes it a second brain.** The vault only pays off if the agent actually writes to it *as it works* — not as a separate documentation chore, but continuously: a tracker per client as state changes, research outputs when a subagent finishes, a session log and handoff at the end of each session. Treat it as the agent's own persistent workspace — the place it externalizes memory that outlives the context window. A vault the agent only reads goes stale; one it writes to every session compounds.

## How it's organized

Folders by kind, so both brain-halves know where things live:
- `trackers/` — one file per client or project, the **source of truth** for its state. Read the tracker before acting on that client.
- `research/` — compiled research outputs (the deep-researcher agent writes here).
- `content/` — the content archive.
- `sessions/` + `logs/` — session history and handoffs.
- `design_system/` — the reusable design language.
- `state/` — small machine-readable state files for watchers/jobs.

## The pattern that makes it work

- **Trackers are canonical.** Before the agent acts on a client or project, it reads that tracker — not its own recollection. The vault, not memory, is the source of truth for live state.
- **The graph is the cheap lookup.** For anything cross-cutting, query the graph before reading files.
- **Snapshots make it safe to write freely.** Because state is snapshotted hourly, the agent can update the vault continuously without fear of losing a prior version.
- **Plain markdown keeps it portable.** Any agent, any editor, any git host can consume it. The knowledge outlives any one tool.

> Note: a real vault holds private client, financial, and personal data — that content stays out of any public share by the "minus sensitive info" rule. What's reusable is the *system*: Obsidian + wikilinks + a graph + snapshots + canonical trackers. Copy the system; keep your own contents private.

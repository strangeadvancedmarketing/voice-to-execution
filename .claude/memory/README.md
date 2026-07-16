# Memory System

This directory holds the agent's **persistent memory** — a flat store of small,
single-topic Markdown files that accumulate across sessions. It is how the agent
remembers operating rules, tool runbooks, and project state instead of relearning
them every conversation.

Memory is not conversation history. It is a curated, human-and-agent-editable
knowledge base. Each file is one durable fact, rule, or note. The store grows
monotonically: sessions add and refine files; nothing important is thrown away.

> This public repo ships the **system** — the structure, format, and mechanics —
> plus a handful of fully sanitized example files under `examples/`. The real
> store's private contents (client data, personal facts, credentials) are not
> included. Use the examples as format templates and write your own.

---

## The four memory types

Every memory file is named with a type prefix. The prefix is the primary
organizing convention — it tells you (and the agent) what the file is for.

| Prefix       | Holds                                                                 | Typical body shape                          |
|--------------|-----------------------------------------------------------------------|---------------------------------------------|
| `feedback_`  | An operating rule or behavioral correction — how the agent should act | Incident → **Why** → **How to apply**       |
| `reference_` | A tool / CLI / API / connector runbook — how something works          | Prose runbook: install, invocation, gotchas |
| `project_`   | A workflow, product, or piece of state — what's being built and where | Insight → design/direction → **Status**     |
| `user_`      | Operator profile — who the agent works for, preferences, context      | Stable descriptive prose                    |

Rough real-world distribution (one operator's store as it matured):

- `feedback_` — the largest bucket. Behavioral rules compound fastest, because
  every correction the operator gives becomes a permanent rule.
- `reference_` — the second largest. One file per tool, CLI, connector, or API.
- `project_` — workflows, pipelines, products, and live deployment state.
- `user_` — a small, stable set describing the operator and how they work.

The store grew to **~437 files** in active daily use. At that scale the naming
convention and the index (below) are what keep it navigable.

---

## File format

Each memory file is Markdown with a YAML frontmatter block, then a free-form body.

### Frontmatter

```yaml
---
name: feedback_example_rule_name
description: "One sentence stating the rule and the trigger for reading this file."
metadata:
  node_type: memory
  type: feedback          # feedback | reference | project | user
  originSessionId: <uuid> # the session that created the memory (optional but useful)
---
```

Field notes:

- **`name`** — a stable identifier. Usually mirrors the filename; some files use
  a short human phrase instead. Either is fine as long as it's stable.
- **`description`** — the single most important field. It is what a reader (human
  or agent) sees when deciding whether to open the file. Write it as *"what the
  rule is + when to read it,"* not a vague topic label. Front-load `HARD` or a
  date if the rule is a hard constraint or time-sensitive.
- **`metadata.node_type: memory`** — marks the file as a memory node (this also
  lets a knowledge-graph pass treat the whole store as typed nodes).
- **`metadata.type`** — the type prefix, repeated as structured data.
- **`metadata.originSessionId`** — traceability back to the conversation that
  produced the memory. Optional.

An older, flatter frontmatter form also appears in mature stores and remains
valid — `type` and `originSessionId` sit at the top level with no `metadata`
wrapper:

```yaml
---
name: Context hygiene — grep, don't dump
description: Extract specific slices from large output instead of dumping it into context
type: feedback
originSessionId: <uuid>
---
```

Prefer the `metadata:` form for new files; the parser accepts both.

### Body conventions

- **`feedback_` and `project_` files** follow a **Why + How-to-apply** shape.
  This is deliberate: a rule the agent can't reconstruct the *reason* for is a
  rule it will misapply or silently drop. Lead with the concrete incident or
  insight that produced the rule, state **Why** it matters, then give a concrete,
  bulleted **How to apply**. Project files close with a **Status** line so the
  next session knows what's done and what's pending.
- **`reference_` files** are runbooks. Prose over ceremony: what the tool is,
  how to install/invoke it (real commands, real paths), the gotchas that bit us,
  and any cost/safety notes. Enough that someone could rebuild or re-run it.
- **`[[wikilinks]]`** — link related memories inline with double-bracket
  wikilinks, e.g. `Ties [[feedback_verify_before_denying]].` These turn the flat
  store into a graph: they let the agent pull a related rule when it opens one,
  and they become real edges when the store is indexed (see below). Use the
  target file's `name`/stem inside the brackets.

Keep files **small and single-topic**. One rule, one tool, one project per file.
When a rule evolves, edit its file in place or append a dated note — don't fork a
near-duplicate. Small files are what make selective, low-cost retrieval possible.

---

## The index: `MEMORY.md`

`MEMORY.md` is the always-loaded table of contents for the entire store. It is
the one memory file that is read into context at the start of **every** session.
Everything else is loaded lazily.

The pattern:

- **One line per memory**, grouped under category headers, in the form
  `` `name.md` — one-line hook ``. The hook is a compressed restatement of the
  file's `description`.
- **Buckets.** Low-signal or closely related files are collapsed onto a single
  line (`Read by name: a.md, b.md, c.md`) to keep the index short. Any file on a
  bucket line is still individually readable by name.
- **Star / flag markers** (`★`, `HARD`, dates) mark the highest-signal or hardest
  rules so they stand out in the always-loaded view.
- The index is **compacted periodically** — as the store grows, entries get
  shortened and bucketed so the always-loaded cost stays roughly flat.

### Why an index + lazy-loading (the scale problem)

Loading 400+ files into every session is impossible — it would blow the context
window and cost a fortune in cache reads on every turn. Loading none of them
means the agent forgets everything between sessions. The index resolves the
tension:

1. **`MEMORY.md` is always loaded.** The agent always knows *what it knows* — the
   full menu of rules and references, at roughly one line each.
2. **Individual files are loaded on-topic.** When a conversation touches a
   subject, the agent reads the specific file(s) the index points to — and only
   those.

This keeps the always-on cost bounded (one compact index) while making the full
depth of the store available on demand. The index is the routing layer; the
files are the storage layer.

---

## Integration points

The memory store is one layer in a larger context system. It connects to:

- **The boot-context hook (session start).** A `SessionStart` hook compiles a
  boot-context document (recent handoff, active lanes, follow-ups, trackers,
  calendar) and injects it at session start. `MEMORY.md` is loaded alongside it,
  so the agent wakes up knowing both the current state *and* the full memory
  menu. The hook handles *what's happening now*; the memory index handles *what I
  permanently know.* See `../hooks/` for the hook layer.

- **Neural / associative memory (optional).** A separate associative-recall layer
  (a neural-memory MCP server, capture-on-stop hooks) can run in parallel. The
  distinction: the file-based memory here is **deliberate and curated** — you can
  read, edit, and audit every rule. Associative memory is **automatic and fuzzy**
  — it surfaces related past context you didn't explicitly file. They complement
  each other; the file store is the source of truth.

- **Knowledge-graph indexing (optional).** Because every file is a typed node
  (`node_type: memory`) with `[[wikilinks]]` as edges, the whole store can be
  compiled into a queryable knowledge graph. A graph query then returns just the
  relevant slice for a question (~1–2K tokens) instead of grepping and reading
  many files raw (~25–30K tokens). At 400+ files this is a large retrieval-cost
  win, and it's the reason the wikilink and frontmatter conventions are worth
  keeping consistent.

---

## Starting your own store

1. Keep `MEMORY.md` as the always-loaded index; add one line per file.
2. Name every file with a type prefix: `feedback_`, `reference_`, `project_`, or
   `user_`.
3. Write a sharp `description` — it's the field that gets read most.
4. For rules and projects, always answer **Why** and **How to apply**. For tools,
   write a real runbook. Link related memories with `[[wikilinks]]`.
5. When you correct the agent, capture the correction as a `feedback_` file so it
   sticks. That single habit is what makes the store compound over time.

See `MEMORY.md.template` for the index format and `examples/` for one fully
worked file of each of the three main types.

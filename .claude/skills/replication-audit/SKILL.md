---
name: replication-audit
description: Use when turning a live system or stack into a shareable public repo, faithfully cloning or replicating a repo, or auditing a repo for completeness and safety before publishing. Encodes an audit-then-ship-real-files method with a case-insensitive leak sweep, correctness gates, and a red-team test performed by a fresh agent. Triggers on "replicate my stack", "make a shareable version of my setup", "clone this repo faithfully", "audit this repo before publishing", "sanitize this repo", or "is this repo complete and safe to share".
---

# Replication Audit

Turn a live operator system into a repository another agent can point at and faithfully reproduce — minus secrets, PII, and client data. Or audit an existing repository against the same bar. This is the checklist built by getting it wrong first; every rule here has a failure behind it.

## The core principle

**Ship the real files, not descriptions of them.** You cannot install a description. A README that lists 37 agents is not 37 agents. Copy the actual artifacts; change only identity, keys, security holes, and client data. Prose belongs on top as a map, never in place of the files.

## Phase 1 — Audit from real sources (never reconstruct from memory)

- Read the actual config files, one by one: `agents/`, `skills/`, `rules/`, `hooks/`, settings, the operator-instructions file, the memory index. Do not summarize from recollection.
- **Roughly two-thirds of a real machine lives OUTSIDE the agent-config directory.** Go find it: local tool scripts, standalone pipelines, deployed cloud services, scheduled jobs and watchers, the knowledge vault, secret stores, deployment targets. A config-only view will silently miss most of the system.
- Fan out parallel subagents by domain (config / memory / vault / tools+infra); each returns a structured inventory. Synthesize one master inventory listing every component — it becomes the checklist for everything after.
- **Verify counts by counting the actual files.** Never state "20 of X are Y" from memory. (A real run claimed 20 code reviewers; the true number was 11.)

## Phase 2 — Ship real files, sanitized

- Copy each real artifact into the repo. Change ONLY: names, API keys, secrets, security holes, client info. Keep all real logic and commands intact.
- Use placeholder tokens for identity — e.g. `{{OPERATOR_NAME}}`, `{{HOME}}`, `{{PRIMARY_BUSINESS}}`, `{{CLIENT_A}}`, and `{{ENV:VAR_NAME}}` for anything secret. Keep one token dictionary so every file is consistent.
- Dormant or imported components ship too — the repo mirrors the real setup. Flag them with a `> NOTE:`; never silently drop them, and never add anything to fit a cleaner story.
- Write docs in a clean, professional register — not internal-thoughts prose. Benchmark structure against real top-tier repositories rather than self-grading.

## Phase 3 — Sanitization sweep (the part that leaks)

- **Run the leak sweep CASE-INSENSITIVE (`grep -ri`).** A capitalized name slipped a case-sensitive sweep once and reached a near-final state — never again.
- Sweep for: operator name(s), business names, client names, SSH endpoints and IPs, emails, chat/user ids, Drive/Sheet/repo ids, home paths, and phone/EIN/medical/legal/personal data.
- Secret patterns: `sk-`, `sk_live`, `rk_live`, `ghp_`, `AIza`, `xoxb-`, `-----BEGIN`, and bot tokens.
- Distinguish INTENTIONAL brand references (the publisher's own name/site, which is a funnel) from actual leaks — do not scrub the former.

## Phase 4 — Correctness gates (all must pass)

- **No dangling references.** Every active hook or command in a shipped config must point to a file that actually ships, or be clearly marked optional. A hook wired to an un-shipped file errors on the first session.
- **Valid config.** Parse every JSON/settings template.
- **Zero broken internal links.** Scan every markdown link's relative target; ignore code-comment false positives (e.g. `[label](url)` inside a snippet).
- **Runnable snippets actually run.**

## Phase 5 — Test as a real agent (finds what audits miss)

- Point a FRESH agent at the finished repo as the true use case: a human hands their agent the repo and says "set this up." **The agent does the technical work — the human's own technical level is irrelevant.** Do not score "could a non-technical human self-install"; score "can the AGENT reproduce a faithful, complete, error-free mirror."
- Instruct it to red-team, not rubber-stamp: walk the install order, open every referenced file, and hunt for dead ends, missing files, and wrong instructions. Score it.
- Fix what it finds — then **re-test to prove the score moved.** A claim of "fixed" is not a fix.

## The lessons (burned in)

- **Verify, never guess** — especially numbers; count the actual files.
- **Describe vs contain** — ship the real files.
- **Mirror the real setup** — don't add or remove to fit a narrative.
- **Case-insensitive leak sweeps, always.**
- **Honesty over polish** — state plainly what is optional, dormant, unverified, or a rebuild-pattern-not-shipped. Honesty is the most trust-building thing in the repo.
- **Nothing is published or pushed until the owner reviews and says go.**

---
name: feedback_example_verify_before_claiming
description: "HARD: for any is-it-done / is-it-broken / does-it-still-X claim, check the live running thing FIRST — never conclude from a stale local copy, an adjacent folder, or a subagent's summary. Negative claims do the most damage when wrong."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 00000000-0000-0000-0000-000000000000
---

<!-- EXAMPLE FILE. Generic, placeholder content — teaches the feedback_ format,
     contains no real project or personal data. A feedback_ file captures an
     operating rule: lead with the incident that produced it, then Why, then a
     concrete How-to-apply. -->

**The incident:** The agent reported that a deployed feature "still routes through
the old service and was never migrated." It based that on a local copy of a config
file and an adjacent, out-of-date project folder. When the live endpoint was
actually checked, the migration had shipped and was running correctly. A failure
was reported that did not exist — the local files were old parallel versions, not
what was live.

**Why this matters:** The agent tends to reach for the nearest readable artifact —
a local file, an adjacent folder, a subagent's summary — and treat it as truth,
instead of checking the actual running system. Wrong **negative** claims ("it was
never done," "it's broken") do the most damage: they send the operator to fix
something that isn't broken, or to distrust work that was correct.

**How to apply — HARD:**
- Any claim of the form *"it still does X" / "it was never done" / "it's broken" /
  "it points to Y"* → check the **live, running source of truth FIRST**, before
  saying a word. Live site → request it directly. Deployed service → read the code
  that is actually deployed, or hit the endpoint. Repo state → check the remote,
  not a scratch clone.
- A local copy, an old folder, or a subagent's report is **evidence, not truth** —
  name it as such ("the local copy shows…") and reconcile it with the live thing
  before concluding.
- Especially for negative claims, verify against the real thing twice before
  delivering bad news.
- Ties [[feedback_example_rule_name]], [[reference_example_tool]].

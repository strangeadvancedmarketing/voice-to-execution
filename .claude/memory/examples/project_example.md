---
name: project_example_workflow
description: "<Example workflow/product>: the closed-loop idea, the proposed design, and current status. Captured <date> — sequence after in-flight work; NOT a build-now."
metadata:
  node_type: memory
  type: project
  originSessionId: 00000000-0000-0000-0000-000000000000
---

<!-- EXAMPLE FILE. Generic, placeholder content — teaches the project_ format,
     contains no real client, financial, or personal data. A project_ file tracks
     a workflow, product, or piece of live state: lead with the insight, sketch
     the design direction, and ALWAYS close with a Status line so the next session
     knows what is done and what is pending. -->

**The insight (<date>):** A recurring bottleneck is that <the thing the workflow
solves> currently depends on someone remembering to do it by hand. When it's left
to memory, steps get dropped. The goal is to close the loop so the system handles
propagation itself.

**What it should do — a CLOSED LOOP:** from here on, when we update a shared
component, the system automatically checks *does this target have this component?
if yes, apply the update and verify.* The trigger can come from the work itself or
from a keyword linking to the build — no manual "remember to also update X" step.

**Design direction (proposed, NOT yet built):**
- **Registry:** the seed already exists — the per-target notes under `<tracker
  dir>`. Formalize a manifest: each target → components deployed + version. Each
  shared component gets a version stamp.
- **Propagation:** when a component version bumps, find targets on an older version
  that have it → update them, verify, log the result.
- **Trigger:** the agent maintains the registry as part of its normal workflow;
  improving a component prompts the who-has-this check + propagation.

**Status:** CAPTURED as a project on <date>. NOT a "build now" — sequence as a
focused design pass after in-flight work. Instance #1 = <the first concrete case>,
handled manually for now; it is the seed case the system generalizes from.

Related: [[project_example_other]], [[feedback_example_rule_name]],
[[reference_example_tool]].

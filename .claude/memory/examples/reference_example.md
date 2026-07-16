---
name: reference_example_tool
description: "Runbook for <example-cli>: what it is, how to install/invoke, cost mechanism, and the gotchas that bit us. Read when <example-cli> / this workflow comes up."
metadata:
  node_type: memory
  type: reference
  originSessionId: 00000000-0000-0000-0000-000000000000
---

<!-- EXAMPLE FILE. Generic, placeholder content — teaches the reference_ format,
     contains no real credentials, paths, or client data. A reference_ file is a
     runbook: what the tool is, how to run it, what it costs, and what to watch
     out for. Real commands and real paths (with secrets removed) — enough that
     someone could rebuild or re-run it. -->

**`<example-cli>`** — a command-line tool that <does the one thing it does>.
Installed <date> because <the reason it earned a place in the stack>. Prefer it
over <the alternative> because <the concrete reason>.

**INSTALL (done):**
```
pip install <example-package>          # package name may differ from the command
```
- CLI entry point: `<example-cli>` (verify with `<example-cli> --version`).
- Config lives at `{{HOME}}/.config/<example-cli>/config.toml`.
- Any secret is sourced from the environment, never hardcoded:
  `export EXAMPLE_API_KEY={{ENV:EXAMPLE_API_KEY}}` (set in `.env`, not committed).

**HOW IT RUNS:**
```
<example-cli> run --input <path> --out <path>     # the main invocation
<example-cli> query "<question>"                  # retrieval / read path
<example-cli> --update                            # incremental re-run (only changed inputs)
```
Pipeline: detect inputs → process → write outputs to `<out-dir>/`. Retrieval after
a run is cheap; a full re-run is not — use `--update` to reprocess only what
changed.

**COST:** <free / metered / per-unit>. If metered, verify the real per-unit cost on
ONE unit and watch the balance delta before running a batch — never assume the
price. See [[feedback_example_rule_name]].

**GOTCHAS (things that bit us):**
- On Windows, force UTF-8 for subprocess I/O (`errors=replace`) — the default
  code page crashes on non-ASCII output.
- The tool reports success (exit 0) even when it processed zero inputs; check the
  output count, not just the exit code — ties [[feedback_example_verify_before_claiming]].
- Auth tokens expire on a rolling window; if a run fails with a 401, refresh
  before retrying rather than re-running blindly.

**TO ADJUST:** edit the query list / filters in `config.toml`. Keep changes
conservative and confirm before any destructive operation (delete, overwrite).

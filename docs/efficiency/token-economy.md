# Token Economy — running a heavy agent without burning the budget

An agent that reads everything into its main context every turn gets slow, expensive, and dumber (a bloated window degrades reasoning). This stack runs all day on a normal plan because context is treated as the scarcest resource. These are the patterns that make that possible — the human called them out by name; they matter as much as any connector.

## 1. Lazy loading — the index is always loaded, the content is not

The memory index (`MEMORY.md`) is small and always in context — one line per memory. The full memory files load **only when their topic surfaces**. The agent knows what it knows from the index; it reads the actual file on demand.

The same rule applies to everything: eager-read only the small, always-relevant things (handoff, index, today's boot context). Everything else is a *pointer* the agent follows when the topic comes up. Know the path; read on demand.

## 2. Context hygiene — never dump, always extract

When fetching a web page or a large tool output, never pour the whole thing into context.

```bash
# macOS/Linux (or Git-for-Windows Bash):
curl -sL URL -o /tmp/page.html          # save to disk
grep -i -o ".\{0,100\}keyword.\{0,300\}" /tmp/page.html | head   # extract ONLY the slice you need
```
```powershell
# Windows (PowerShell) equivalent — %TEMP% instead of /tmp, Select-String instead of grep:
curl.exe -sL URL -o "$env:TEMP\page.html"
Select-String -Path "$env:TEMP\page.html" -Pattern "keyword" -Context 0,2 | Select-Object -First 5
```

Read a specific offset/range of a big file, not the whole file. Grep/head/tail to the exact lines. Dumping a full page re-caches hundreds of KB every subsequent turn — the cost is paid over and over, not once.

## 3. Subagent isolation — burn context somewhere else

Heavy work (research across many sources, reading a large codebase, triaging an inbox) runs in a **subagent** with its own context window. It does the messy reading and returns only the conclusion. The main conversation never sees the raw material — it gets the digest. Hundreds of KB of pages, gone from the main window; a five-line summary remains.

Launch independent subagents in parallel, not one after another — separate lookups finish together instead of stacking.

## 4. Boot context compilation — one briefing, not fifty reads

Instead of the agent reading a dozen state files at the start of every session, a SessionStart hook compiles them **once** into a single boot briefing and injects that. One compiled read replaces fifty scattered ones. (See `connectors/scheduled-tasks-and-hooks.md`.)

## 5. Knowledge graph — query, don't grep-the-world

For "how does X connect to Y / what do we know about Z" across a large knowledge base, a pre-built knowledge graph returns the relevant slice in ~1–2K tokens instead of ~25–30K of raw file reads. Build the graph from the memory + docs once, query it first, and fall back to direct file reads only when the graph lacks a specific detail.

## 6. Model selection — right-size the model to the task

Not every call needs the biggest model. Use a fast, cheap model for high-frequency, low-stakes work (mechanical edits, simple lookups, worker subagents) and reserve the deepest model for genuinely hard reasoning (architecture, complex debugging, judgment). Matching model to task is a multiplier on both cost and speed.

## 7. Paste-ready over back-and-forth

When the agent produces something the human will copy (a caption, a message to forward, a command), it goes in its OWN message with zero extra words. One clean copy beats three turns of "here's the caption" → "can you resend just the caption" → resend. Fewer round-trips is fewer tokens.

## The mindset

Context is money and clarity at the same time. Every pattern here trades a little structure now for a window that stays small, fast, and sharp all day. An agent that respects its context can run a business on a plan that a dump-everything agent would blow through by noon.

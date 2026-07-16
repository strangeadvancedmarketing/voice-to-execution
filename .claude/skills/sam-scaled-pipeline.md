---
name: sam-scaled-pipeline
description: Scaled lead pipeline — 200+ targets per run using parallel subagents for processing, expanded CDP discovery, overnight DM queue
user_invocable: true
---

# Scaled Lead Pipeline

> NOTE: needs Chrome running with `--remote-debugging-port=9222`.

Scaled version of `sam-lead-pipeline` that processes 200+ targets per run using parallel subagents. Covers your full target region.

## Architecture

```
Discovery (sequential, ~60-90 min)
    → One CDP session, N cities x 33 categories (randomized, capped at 300 queries)
    → Output: scaled_targets.json (200+ handles)
    → Checkpoint: scaled_raw_handles.json (all handles before IG filtering)

Processing (parallel, ~6 min)
    → process_chunks.py splits into N chunks
    → N subagents each run process_single_chunk.py
    → Each agent: generate site, create short link, update sheet row
    → Output: all sites built, links created, sheet populated

DMs (sequential overnight, ~90 min for 200)
    → send_dms_scaled.py with 20-35s random delays
    → Follow + DM via CDP
    → Sheet status updates as each sends
    → Runs unattended overnight
```

## Step 1: Discovery — full target region

```bash
python find_ig_targets_scaled.py [target_count] [max_queries] [output_file]
python find_ig_targets_scaled.py 200 300 scaled_targets.json
```

**N cities** across all regions of your target area.
**33 categories** of contractors.
**Randomized query order** to spread across cities/categories.
**Early stop** when 3x target count handles collected (buffer for Phase 2 filtering).
**Progress saves** every 25 targets.

## Step 2: Enrichment + Logos (Sequential CDP)

Same as base pipeline — run enrichment and logo scraping before chunking:
```bash
python enrich_from_gmaps.py
python scrape_ig_logos.py
```

Logo scraping needs CDP (one Chrome session), so this runs BEFORE parallel processing.

## Step 3: Chunk + Parallel Processing

```bash
# Split targets into chunks
python process_chunks.py scaled_targets.json 5

# Each subagent runs one chunk (spawned by the Claude Code orchestrator)
python process_single_chunk.py chunk_1.json
python process_single_chunk.py chunk_2.json
# ... etc
```

Each chunk file contains targets + sheet row offset. No inter-agent coordination needed.

## Step 4: Git Push

After all subagents complete:
```bash
cd {{HOME}}\contractor_sites
git add -A && git commit -m "feat: add batch N sites" && git push origin master
```

## Step 5: Overnight DM Queue

```bash
python send_dms_scaled.py scaled_targets.json scaled_short_links.json
# Optional: --offset N --limit N for partial runs
```

Test ONE DM first, get approval, then run the full batch overnight.

## Work Distribution (No Duplication)

- Orchestrator pre-assigns target ranges (targets 1-40, 41-80, etc.)
- Each subagent only touches its assigned sheet rows
- Deduplication happens BEFORE distribution (all existing JSON files scanned)

## Prerequisites

- Chrome running with `--remote-debugging-port=9222`
- Chrome logged into Instagram
- {{GOOGLE_CLI}} authenticated for Google Sheets
- GitHub push access for the contractor-sites repo

## File Locations

- Discovery: `find_ig_targets_scaled.py`
- Chunk coordinator: `process_chunks.py`
- Chunk processor: `process_single_chunk.py`
- DM sender: `send_dms_scaled.py`
- Targets: `scaled_targets.json`
- Short links: from chunk results

## Scaling Numbers

| Targets | Discovery   | Enrichment | Processing (5 agents) | DMs (overnight) |
|---------|-------------|------------|----------------------|-----------------|
| 50      | ~20 min     | ~15 min    | ~2 min               | ~25 min         |
| 100     | ~35 min     | ~30 min    | ~4 min               | ~50 min         |
| 200     | ~60 min     | ~60 min    | ~6 min               | ~100 min        |

## Status: SCRIPTS BUILT, NEEDS FIRST TEST RUN

Next: test with 10 targets across 2 subagents before full-scale run.

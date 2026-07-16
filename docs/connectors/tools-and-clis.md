# Tools & CLIs — the complete local reference

Every local CLI, binary, and tool the framework drives, in one place, so a replicator can see the full surface. This is the machine layer under the connectors — where [`apis.md`](apis.md) lists the external APIs and [`mcp-servers.md`](mcp-servers.md) lists the agent's MCP hands, this file lists the executables that run on the human's own box.

The rule is the same throughout: **free and local first.** Most of what's here is free and runs entirely on the machine; the few paid tools are marked, and each carries the "verify the cost before you rely on it" caveat. Install commands are given where a tool is a real public package; where a tool is custom to this stack or built from source, that's said plainly rather than dressed up as a one-line install.

> Windows note: `pip`, `npx`, `npm`, `winget`, and `python` all work in PowerShell once Python and Node are on PATH (see `SETUP_AI.md`). Paths shown as `{{HOME}}` are the user's home directory.

## The base runtime (install these first)

Everything else assumes these are present. All free.

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **python** (3.10+) | Local AI, hooks, every custom script | Free | [python.org](https://python.org) / `winget install Python.Python.3.12` |
| **node** (18+) / **npx** / **npm** | `.cjs` continuity hooks, MCP servers, Remotion, most JS tooling | Free | [nodejs.org](https://nodejs.org) / `winget install OpenJS.NodeJS` |
| **git** | Source control, deploy-by-push, snapshots | Free | `winget install Git.Git` |
| **gh** (GitHub CLI) | `gh search repos` / `gh search code` (search-before-build, mandatory before any new implementation), `gh api`, GitHub Pages deploy | Free | `winget install GitHub.cli` |
| **pip** / **uv** / **uvx** | Python package + tool installs; `uvx` runs some MCP servers | Free | ships with Python / `pip install uv` |

Used by: the whole stack. `gh search` is required by [`../rules/`](../rules/) development workflow before building anything new.

## Google Workspace CLI

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **`{{GOOGLE_CLI}}`** (a Google Workspace CLI, e.g. `gog`) | Script-friendly, JSON-first CLI for Gmail, Calendar, Drive, Docs, Sheets, Contacts, Tasks — multi-account via `-a <account>`. Drives inbox triage, briefings, and file delivery. | Free (own OAuth client) | Custom Go binary (openclaw/gogcli) — build from source or grab a release; no blind-trust public package name |

The single most-used binary in the stack: every watcher, briefing, and email/calendar action goes through it. Full setup and command patterns in [`google-suite.md`](google-suite.md). Stores its own OAuth refresh tokens in its config dir — never in the repo.

## Voice I/O — the core loop

The transcribe → execute → speak loop. All free and local.

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **`faster-whisper`** | Local speech-to-text for inbound voice notes; the `transcribe.py` entry point routes short notes to the small model on CPU and holds a warm daemon so repeat calls skip model load | Free, local | `pip install faster-whisper` |
| **`edge-tts`** | The agent's spoken replies — pick one voice (`{{VOICE}}`) and lock a rate | Free | `pip install edge-tts` |
| **Chatterbox** (local voice clone) | Optional: generate content in the human's own cloned voice, offline, no per-generation cost — content only, never to mislead | Free, local | `pip install chatterbox-tts` (Torch CPU) |
| **ffmpeg** / **ffprobe** | Every audio/video transform: extract audio for transcription, normalize loudness, compress under a messenger's size cap, match formats before concat | Free, local | `winget install Gyan.FFmpeg` |

The `transcribe.py` entry point and warm-daemon pattern are custom to this stack (they wrap `faster-whisper` with vocabulary biasing and a socket daemon) — the mechanism, not a package, is what transfers. Full detail and the emoji/markdown speech-cleaning pass are in [`local-ai.md`](local-ai.md). The loop itself is documented in [`telegram-voice-loop.md`](telegram-voice-loop.md).

## Knowledge & research

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **graphify** | Turn a folder / memory store / vault into a queryable knowledge graph; `graphify query/path/explain` returns the relevant slice for ~1–2K tokens instead of tens of KB of raw reads — query it *before* grepping across memory | Free (runs through the host agent session, no API key) | `pip install graphifyy` (engine); the skill wrapper is custom |
| **agent-reach** | Free web search, page reads, YouTube transcripts, and RSS without a browser window; routes each request to a free backend. `agent-reach doctor --json` shows which backend is live | Free | Custom skill for this stack — not a blind public `pip`/`npm` install; build the thin equivalent from free pieces if absent |
| **mcporter** | MCP call bridge that `agent-reach` uses under the hood (e.g. `mcporter call 'exa.web_search_exa(...)'`); config is cwd-sensitive | Free tier (Exa) | `npm install -g mcporter` |
| **yt-dlp** | Download YouTube transcripts/subtitles (`--write-auto-subs`) and source video for archiving | Free | `pip install yt-dlp` |

Used by the research and monitoring layer — see [`web-and-social-research.md`](web-and-social-research.md) for `agent-reach`/`mcporter` sourcing and risk notes, and [`../efficiency/token-economy.md`](../efficiency/token-economy.md) for the graphify query-first pattern.

## Deployment & source infrastructure

For standing up the small services and static sites the framework builds.

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **wrangler** | Deploy Cloudflare Workers & Pages (`wrangler deploy`, `pages deploy`); secrets set as wrangler secrets, never in `wrangler.toml` | Free tier | `npm install -g wrangler` |
| **netlify-cli** | Deploy sites/functions (`netlify deploy --prod`) | Free tier | `npm install -g netlify-cli` |
| **apify** (CLI) | Deploy/manage the lead-gen actors as an optional hosted runner (the same scrapers also run fully local) | Free tier + paid | `npm install -g apify-cli` |

Where used: the deployed-service pattern in [`../../workflows/lead-gen/`](../../workflows/lead-gen/) and the deployment notes in [`apis.md`](apis.md). Wrangler's OAuth token expires ~24h — expect a refresh step.

## Browser automation

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **Playwright** | Drive a real browser; `connect_over_cdp` to a debug Chrome for logged-in sessions that beat bot detection | Free | `pip install playwright` / `npm i playwright` (+ `playwright install`) |
| **Debug Chrome** (`--remote-debugging-port=9222`) | A persistent, human-owned Chrome tab the agent attaches to over CDP — the pattern for anything behind a login | Free | launch flag on installed Chrome; raw CDP via `websocket-client` for Chrome 136+ |

Full pattern, including the raw-CDP fallback for newer Chrome, is in [`browser-automation.md`](browser-automation.md).

## Local AI generation

Free/local generation lanes, plus one metered paid lane behind a cost gate.

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **`gradio_client`** | Drive free Hugging Face ZeroGPU Spaces for short video / image gen programmatically (~5 GPU-min/day free) | Free tier | `pip install gradio_client` |
| **`fal_client`** | Higher-end paid video/image models (Seedance/Kling/Veo/Wan) — **empirically verify per-unit cost on ONE generation before any batch** | Paid | `pip install fal-client` |

Both covered in [`local-ai.md`](local-ai.md) and used by [`../../workflows/content/`](../../workflows/content/). The paid lane exists only where the free lanes provably can't do the job.

## Video assembly

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **Remotion** (`@remotion/mcp`, `remotion` CLI) | Programmatic video in React — composition, then `npx remotion render`; the MCP layer is in [`mcp-servers.md`](mcp-servers.md) | Free (self-host) | `npm i remotion @remotion/cli` |
| **CapCut draft tooling** (`pycapcut` / `capcut-cli`) | Generate CapCut `draft_content.json` programmatically so edits open in the human's own editor rather than being flattened by the agent | Free | `pip install pycapcut` / community CLI (verify against your CapCut version) |

CapCut draft generation is version-sensitive — treat it as staged/unverified until confirmed against the installed editor. Content workflows: [`../../workflows/content/`](../../workflows/content/).

## Document & media utilities

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **Tesseract-OCR** | OCR text out of image-only PDFs (paired with a PDF renderer like PyMuPDF) | Free, local | `winget install UB-Mannheim.TesseractOCR` |
| **SumatraPDF** | Silent PDF viewing/printing (`SumatraPDF -print-to <printer> -silent`) for invoice/print flows | Free | portable exe / `winget install SumatraPDF.SumatraPDF` |
| **PIL / PyMuPDF / pypdf** | Image composition (OG cards, favicons), PDF render + text extraction | Free | `pip install pillow pymupdf pypdf` |
| **Cloudflare WARP** | Restore connectivity when an ISP blocks an endpoint | Free | `winget install Cloudflare.Warp` |

## Publishing & messaging helpers

| Tool | What it's for | Cost | Install |
|------|---------------|------|---------|
| **Telegram sender** (`tg_send`-style helper) | Fire-and-forget Telegram push from background watchers before a session exists; token from env/`.env`, never in the repo | Free | small custom script over the Telegram Bot API — see [`telegram-voice-loop.md`](telegram-voice-loop.md) |
| **Postiz** (CLI) | Cross-post scheduling across social platforms | Paid (cloud-only) | `npm install -g postiz` (self-host is gated — treat as cloud) |

The publishing workflows that use these live in [`../../workflows/publishing/`](../../workflows/publishing/).

## Honest notes

- **Custom vs public.** `{{GOOGLE_CLI}}`, the `transcribe.py`/daemon entry point, `agent-reach`, and the Telegram sender are **custom to this stack** — built or vendored, not one-line installs from a public registry. They're listed because the framework genuinely uses them; the transferable thing is the pattern, and each says so above. Everything with a real `pip`/`npm`/`winget` line is a public package verified to exist.
- **Free/local first is not a slogan.** The base runtime, voice I/O, `graphify`, `agent-reach`, the free generation lanes, and every document utility run at $0 on the human's machine. Only `fal_client`, `apify` (hosted mode), and `Postiz` cost money — each marked, each behind the "verify the cost first" rule.
- **Never commit a key.** Tools that need credentials (`{{GOOGLE_CLI}}`, `fal_client`, the Telegram sender, `wrangler`/`netlify` deploy targets) read them from env or a local, git-ignored `.env` supplied during setup.

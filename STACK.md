# The Complete Stack — every component, accounted for

This is the full map. Everything the operator runs, connects to, or was built to do, in one place — so nothing lives only in someone's memory. Each item points to where it's documented. Keys, tokens, and private business data are deliberately excluded; the patterns and commands are complete.

## 1. The voice loop (the product)
- **Telegram voice loop** — voice in → local transcription → execution → text + voice reply. `connectors/telegram-voice-loop.md`
- **Inbound transcription** — `faster-whisper` (small, local, custom vocab). `connectors/local-ai.md`
- **Outbound voice** — `edge-tts`, one locked voice. `connectors/local-ai.md`
- **Reactions & receipts** — 👀/✅ as silent status; paste-ready messages. `rules/operating-rules.md`

## 2. Connectors — everything the agent plugs into
- **Google Suite** via the `gog` CLI (Gmail, Calendar, Drive, Sheets, Docs). `connectors/google-suite.md`
- **MCP server layer** — Stripe, HubSpot, Apify (local npx); Canva, Zapier, HuggingFace (hosted); Playwright, desktop-commander, neural-memory. `connectors/mcp-servers.md`
- **Browser automation** — real logged-in Chrome on a debug port (CDP), the token-cheaper `agent-browser`, shadow-DOM piercing, captcha/final-submit team-flow. `connectors/browser-automation.md`
- **Web & social research** — `agent-reach` (free web/pages/YouTube/RSS) + the OpenCLI extension bridge for logged-in social. `connectors/web-and-social-research.md`
- **Scheduled tasks & hooks** — see section 5. `connectors/scheduled-tasks-and-hooks.md`
- **Local & free AI** — whisper, edge-tts, voice clone, FFmpeg, free image/video gen lanes. `connectors/local-ai.md`

## 3. Agents — the 37-agent fleet
Planning, code review (11 language + domain reviewers), build/test resolvers, maintenance, ops & monitoring, research, growth/business, chief-of-staff. Full named roster + provenance: `agents/README.md`

## 4. Memory — the compounding moat
- **Typed memory files** (`feedback_/project_/reference_/user_`) + always-loaded `MEMORY.md` index. `memory/README.md`
- **Lazy loading** — index always in context, files on demand; scales to hundreds. `memory/README.md`, `efficiency/token-economy.md`
- **Neural/associative capture** — a capture hook saves every session; a query layer recalls across them (optional layer on top of files). `connectors/mcp-servers.md`

## 5. Automation — hooks & scheduled jobs (the actual wired set)
- **SessionStart** → boot-context compiler; wake up briefed. `connectors/scheduled-tasks-and-hooks.md`
- **PreToolUse** → guard/block tools you never want fired blindly.
- **PreCompact** → neural-memory capture + session snapshot before the window compacts.
- **PostCompact** → reorient hook; re-ground after summarization so the agent doesn't drift.
- **PostToolUse** → contextual state display + companion widget bridge.
- **Stop** → neural-memory capture + snapshot-saver + session-logger to the day log.
- **UserPromptSubmit** → drift-monitor; flags sliding off standing rules early.
- **Scheduled jobs** → morning briefing, ~4h email watcher, follow-up sweeps (OS scheduler / cron). `connectors/scheduled-tasks-and-hooks.md`

## 6. Efficiency — running heavy on a normal plan
Lazy loading, context hygiene (extract don't dump), subagent isolation, boot-context compilation, knowledge-graph queries, model right-sizing, paste-ready over round-trips. `efficiency/token-economy.md`

## 7. Skills & plugins — packaged capabilities
- **~33 custom + plugin skills** across content/media, marketing/SEO, design, research, and ops (tip-video, video-pipeline, compress, handoff, invoice, graphify, deep-research, agent-reach, context-budget, the SEO suite, cold-email, lead-magnets, landing-page-generator, impeccable, data-scraper-agent, and more). `skills/README.md`
- **Plugin bundles** — small-business, sales, marketing, customer-support, productivity, brand-voice + tooling plugins (skill-creator, hookify, mcp-server-dev, session-report, playground, claude-md-management, frontend-design) + operator plugins (telegram, ponytail). `skills/README.md`

## 8. Built capabilities — apps the agent produced
- **Operator dashboard** — local Node/Express app; reads the session `.jsonl` live; 5 columns incl. a real embedded terminal (node-pty + xterm.js). `capabilities/operator-dashboard.md`
- **Daily ops board** — a shareable page updated in place all day; top-3, calendar, live DONE/RUNNING/WAITING chips, follow-ups. `capabilities/daily-ops-board.md`
- **Knowledge graph** — build a graph from memory + docs, query it first for cheap cross-topic lookups. `efficiency/token-economy.md`

## 9. Rules — the operating contract
- **Hard rules** (trust layer): verify before claiming, protect the money, execute-don't-instruct, test-one-before-batch, one-playbook, timezone discipline. `rules/hard-rules.md`
- **Operating rules** (working style): lead with outcome, plain-text messenger, paste-ready, no raw data, root-cause fixes, sequencing. `rules/operating-rules.md`
- **Security & hardening**: secrets off cloud-sync, token ACLs, audit-before-access, least-privilege, prompt-injection defense, risky tools off when idle. `rules/security-and-hardening.md`

## 10. Philosophy — why it works
Voice-to-execution as architecture; sequencing over scattering; the voice-loop habit + cumulative context as the two moats. `philosophy/voice-to-execution.md`

---

**How to use this map:** a visiting agent reads `SETUP_AI.md`, interviews the human, and installs the pieces that fit — in the order given there. This file is the checklist that proves nothing was left out. If you run something that isn't on this list, it belongs here — add it.

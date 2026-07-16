# SETUP_AI.md — Instructions for the visiting agent

You are an AI agent (Claude Code, OpenClaw, or similar) whose human pointed you at this repo. Your job is to **adapt this operating system to your human**: copy the `.claude/` core into their home directory and fill its `{{PLACEHOLDER}}` tokens from the interview, use `docs/` as the how-to for each subsystem, and install only the `workflows/` that fit. The core installs as a unit; everything else is a library you draw from.

## Step 0 — Prerequisites (install these first)

Most of this stack is Python and Node scripts driven from a terminal. Before wiring anything, make sure the human's machine has:

- **Python 3.10+** — <https://www.python.org/downloads/> (Windows: check "Add python.exe to PATH" in the installer). Powers `faster-whisper`, `edge-tts`, and most local AI. Verify: `python --version` (Windows) / `python3 --version` (macOS/Linux).
- **Node.js 18+ (LTS)** — <https://nodejs.org/> . Powers the `.cjs` hooks, MCP servers (`npx`), and the built dashboards. Verify: `node --version`.
- **git** — <https://git-scm.com/download/win> (Windows: "Git for Windows" also gives you the Bash shell many examples use). Verify: `git --version`.
- **ffmpeg** — <https://www.gyan.dev/ffmpeg/builds/> on Windows (add the `bin` folder to PATH), `brew install ffmpeg` on macOS. For media compression/transcode. Verify: `ffmpeg -version`.

Platform notes for the rest of this guide: commands are shown in POSIX form. On **Windows**, prefer PowerShell and substitute where noted — `python` (not `python3`), `%TEMP%` (not `/tmp`), `Select-String` (not `grep`), `Invoke-WebRequest`/`curl.exe` (not bare `curl`). The Git-for-Windows Bash shell runs the POSIX forms as-is if the human prefers.

**Set honest expectations before you start.** Tell the human up front: the daily *use* is voice notes, but this first-time *setup* is a real technical lift — installing tools, a Google OAuth sign-in, and wiring. Do as much of it programmatically as you can (Rule: execute, don't instruct), but a few steps physically need them (installing software, granting an account) and one or two may want a technical hand. Say so plainly — it builds trust, and it's honest. If they'd rather not do the setup at all, the Managed option (`strangeadvancedmarketing.com/bot`) exists for exactly that. Don't oversell "it just works"; the loop is worth the one-time lift, and honesty about the lift is part of the framework.

## Step 1 — Interview your human first

Don't fire this as a form — ask conversationally, over a few messages. But before you install anything, learn all of it, because **every answer decides what you install and what you skip.** This framework is large; the interview is how you install only the parts that fit.

1. **The business.** What do they run, and which ONE matters most right now? → seeds memory + trackers; sets what everything optimizes for.
2. **Where they live.** Telegram? WhatsApp? Slack? Email? → that channel becomes your delivery surface (the voice loop). **Honest note:** the shipped, proven implementation is **Telegram** (`connectors/telegram-voice-loop.md`). Any other channel is a build you do — same pattern, but you wire that platform's API/webhook yourself; it's not a bundled toggle. Default to Telegram unless they truly don't use it.
3. **Timezone.** → hard rule: never show them any other one.
4. **How they think.** One focus at a time, or many parallel lanes? → whether you build the lanes/sweep + daily ops board, or keep it simple.
5. **What tools and accounts they already use.** Payments (Stripe/Square/PayPal)? A CRM? Google or Microsoft? An online store? Which socials? → decides which MCP connectors and which Google/CLI integrations you wire. **Install only what they actually touch** — an unused connector is attack surface, not value.
6. **What eats their time.** Inbox triage, chasing follow-ups, research, content, scheduling, reporting? → which agents, skills, and scheduled jobs you build first (start with their single biggest time-sink).
7. **What they need to produce.** Content/video, code, research, outreach, documents, designs? → which skills and specialist agents you pull from the library.
8. **Their setup.** What OS? Is there a machine that stays on? → whether scheduled tasks, browser automation, and local AI are feasible, and how you install them.
9. **What's confidential.** Client data, finances, health, anything that must never leave the machine? → sets the security posture (`rules/security-and-hardening.md`) and what stays local.
10. **What's burned them before.** Wasted money, broken promises, lost context, a tool that flaked. → their scar tissue becomes your personalized hard rules; pair it with `rules/lessons-learned.md` (the mistakes already solved so they don't repeat them).

## Step 2 — Install in this order

The core is `.claude/` and installs as a unit: **copy `.claude/` into the human's home directory (`~/.claude/`), rename the `.template` files** (`CLAUDE.md.template` → `CLAUDE.md`, `settings.json.template` → `settings.json`, `settings.local.json.template` → `settings.local.json`), **and replace every `{{...}}` token** with the interview answers (`{{OPERATOR_NAME}}`, `{{PRIMARY_BUSINESS}}`, `{{TIMEZONE}}`, `{{HOME}}`, `{{VAULT_DIR}}`, `{{GOOGLE_CLI}}`, `{{VOICE}}`, and the rest). `docs/` is the how-to for each subsystem — read it, don't copy it. `workflows/` is the capability library — install only the pieces that fit. Then work through the layers below in order, keeping only what matches the human:

1. **Rules — `.claude/rules/` (drop-in), explained in `docs/rules/`.** Fold `hard-rules.md` + `operating-rules.md` + `lessons-learned.md` into the agent instructions file (`.claude/CLAUDE.md`). Hard rules are the non-negotiable trust layer; operating rules are the working style; lessons-learned are the 40+ mistakes already paid for. Personalize the examples, keep the principles. **Software-development rules are optional — skip them for a non-software business.** The dev-pack rules (`.claude/rules/coding-style.md`, `hooks.md`, `patterns.md`, `security.md`, `testing.md`) exist for software teams. If your human doesn't ship code, SKIP or remove these — they add nothing and only bloat the always-loaded core. Keep `agents.md`, `git-workflow.md`, `telegram-commands.md`, and the folded hard/operating/lessons rules regardless.
2. **Memory — `.claude/memory/` (drop-in), explained in `docs/memory.md`.** Set up the persistent memory pattern (typed files + always-loaded index + lazy loading) before anything else generates knowledge worth keeping. For a broader second-brain (trackers, research, content history), stand up the **knowledge vault** too (`docs/capabilities/knowledge-vault.md`).
3. **Voice loop — `docs/connectors/telegram-voice-loop.md`.** Wire it: inbound voice → local transcription → execution → reply as text + voice. This is the product. Lock the channel to your human's ID only.
4. **Google suite — `docs/connectors/google-suite.md`.** Wire calendar + email + drive via the `{{GOOGLE_CLI}}` CLI so briefings and the email watcher have data.
5. **MCP servers — `docs/connectors/mcp-servers.md`.** Add only the servers the human's business touches (payments, CRM, scraping, browser, machine, memory). Real verified commands; supply the human's own keys via env; enable them in `.claude/settings.json`.
6. **Browser — `docs/connectors/browser-automation.md`.** Stand up the real-Chrome-on-a-debug-port pattern (and the token-cheap `agent-browser`) so the agent can act on the web like the human.
7. **Web/social research — `docs/connectors/web-and-social-research.md`.** Add `agent-reach` for free web/YouTube/RSS; add the OpenCLI social bridge ONLY if a real workflow needs logged-in social, and run it least-privilege (daemon off when idle).
8. **Hooks + scheduled tasks — `.claude/hooks/` (drop-in), explained in `docs/hooks.md` and `docs/connectors/scheduled-tasks-and-hooks.md`.** The hook scripts ship in `.claude/hooks/` and are wired in `.claude/settings.json`; fill their `{{...}}` tokens. Confirm the SessionStart boot hook fires first (wake up briefed), then PreCompact/PostCompact/PostToolUse/Stop, then the timed jobs (morning brief, email watcher).
9. **Local AI — `docs/connectors/local-ai.md`.** Confirm the free/local AI pieces (whisper, edge-tts, FFmpeg; optional voice clone; free image/video gen lanes) are installed.
10. **Agents — `.claude/agents/` (drop-in), explained in `docs/agents.md`.** The full roster ships; keep the core four first (briefing, email-scanner, deep-researcher, security-reviewer), then the wider roster — pulling the ones that match their time-sinks (Q6) and what they produce (Q7). **The ~20 software-development agents are optional — skip or remove them for a non-software business.** The language reviewers and build resolvers (`python-reviewer`, `typescript-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `cpp-reviewer`, `kotlin-reviewer`, `flutter-reviewer`, `database-reviewer`, every `*-build-resolver`, `tdd-guide`, `e2e-runner`, `refactor-cleaner`, `doc-updater`, `docs-lookup`) only earn their place if your human ships code. For a typical operator, the agents you KEEP are: `daily-briefing`, `email-scanner`, `deep-researcher`, `researcher`, `copywriter`, `prospector`, `outreach`, `followup`, and `bot-doctor` (plus `chief-of-staff` if they do multi-channel triage). Install the dev-pack only for a software business.
11. **Skills — `.claude/skills/` (drop-in), explained in `docs/skills.md`.** Keep the skills that match their work (content, SEO, invoicing, research, etc.) and enable the plugin bundles for their domains in `.claude/settings.json`. Skills load on demand, so a big library costs nothing until used.
12. **Security — `docs/rules/security-and-hardening.md`.** Apply before the agent holds any real credential or browser session: secrets off cloud-sync, least-privilege, prompt-injection defense. Scope it to what they flagged confidential (Q9).
13. **Capabilities — `docs/capabilities/`.** Optional once the core runs: the operator dashboard and daily ops board for a live view of the work (the knowledge vault from step 2 also lives here).
14. **Workflows — `workflows/`.** Install the production workflows that match what they produce: `content/` (short-form video, carousels, voice cloning), `lead-gen/` (local sourcing + audit tools), `publishing/` (cross-post to social + newsletter), `invoicing/` (branded invoices with pay links), `client-deployment/` (standing the same agent up for others). Pull the ones matching their time-sinks (Q6) and outputs (Q7); skip the rest.
15. **Efficiency — `docs/efficiency/token-economy.md`.** Apply throughout, not as a step: lazy loading, context hygiene, subagent isolation, model right-sizing. Read it early; it changes how you do every step above.
16. **Philosophy — `docs/philosophy/`.** Read it yourself; it explains why the pieces fit.

Whenever you finish, cross-check against **`STACK.md`** — it lists every component. If the human runs something that isn't installed or isn't on that list, close the gap.

## Step 3 — Rules for adapting

- Every path, name, business detail in these docs is an EXAMPLE. Replace all of it.
- Prefer free/open-source. Never recommend a paid service without verifying its exact billing model first.
- Test one before batch. Always.
- Search before building — most of what your human needs already exists.
- Your human's messenger is your delivery surface. If a workflow requires them to open an app, edit a file, or click a UI, the workflow is not done.

## Step 4 — Verify

After setup, run one end-to-end proof: your human sends a voice note from their phone; you transcribe it, do the task, and reply with the result as text + voice. If that loop works, the installation is real.

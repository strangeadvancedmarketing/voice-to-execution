# SETUP_AI.md — Instructions for the visiting agent

You are an AI agent (Claude Code, OpenClaw, or similar) whose human pointed you at this repo. Your job is NOT to copy these files. Your job is to **adapt this operating system to your human**.

## Step 0 — Prerequisites (install these first)

Most of this stack is Python and Node scripts driven from a terminal. Before wiring anything, make sure the human's machine has:

- **Python 3.10+** — <https://www.python.org/downloads/> (Windows: check "Add python.exe to PATH" in the installer). Powers `faster-whisper`, `edge-tts`, and most local AI. Verify: `python --version` (Windows) / `python3 --version` (macOS/Linux).
- **Node.js 18+ (LTS)** — <https://nodejs.org/> . Powers the `.cjs` hooks, MCP servers (`npx`), and the built dashboards. Verify: `node --version`.
- **git** — <https://git-scm.com/download/win> (Windows: "Git for Windows" also gives you the Bash shell many examples use). Verify: `git --version`.
- **ffmpeg** — <https://www.gyan.dev/ffmpeg/builds/> on Windows (add the `bin` folder to PATH), `brew install ffmpeg` on macOS. For media compression/transcode. Verify: `ffmpeg -version`.

Platform notes for the rest of this guide: commands are shown in POSIX form. On **Windows**, prefer PowerShell and substitute where noted — `python` (not `python3`), `%TEMP%` (not `/tmp`), `Select-String` (not `grep`), `Invoke-WebRequest`/`curl.exe` (not bare `curl`). The Git-for-Windows Bash shell runs the POSIX forms as-is if the human prefers.

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

1. **`rules/hard-rules.md` + `rules/operating-rules.md` + `rules/lessons-learned.md`** — adapt into their agent instructions file (CLAUDE.md or equivalent). Hard rules are the non-negotiable trust layer; operating rules are the working style; lessons-learned are the 40+ mistakes already paid for (fold the ones that fit into their instructions). Personalize the examples, keep the principles.
2. **`memory/`** — set up the persistent memory pattern (typed files + always-loaded index + lazy loading) before anything else generates knowledge worth keeping. For a broader second-brain (trackers, research, content history), stand up the **knowledge vault** too (`capabilities/knowledge-vault.md`).
3. **`connectors/telegram-voice-loop.md`** — wire the voice loop: inbound voice → local transcription → execution → reply as text + voice. This is the product. Lock the channel to your human's ID only.
4. **`connectors/google-suite.md`** — wire calendar + email + drive via the `gog` CLI so briefings and the email watcher have data.
5. **`connectors/mcp-servers.md`** — add only the servers the human's business touches (payments, CRM, scraping, browser, machine, memory). Real verified commands; supply the human's own keys via env.
6. **`connectors/browser-automation.md`** — stand up the real-Chrome-on-a-debug-port pattern (and the token-cheap `agent-browser`) so the agent can act on the web like the human.
7. **`connectors/web-and-social-research.md`** — add `agent-reach` for free web/YouTube/RSS; add the OpenCLI social bridge ONLY if a real workflow needs logged-in social, and run it least-privilege (daemon off when idle).
8. **`connectors/scheduled-tasks-and-hooks.md`** — wire the SessionStart boot-context hook first (wake up briefed), then PreCompact/PostToolUse/Stop, then the timed jobs (morning brief, email watcher).
9. **`connectors/local-ai.md`** — confirm the free/local AI pieces (whisper, edge-tts, FFmpeg; optional voice clone; free image/video gen lanes) are installed.
10. **`agents/`** — add subagent definitions as load appears: the core four first (briefing, email-scanner, deep-researcher, security-reviewer), then the wider 37-agent roster — pulling the ones that match their time-sinks (Q6) and what they produce (Q7).
11. **`skills/`** — install the skills that match their work (content, SEO, invoicing, research, etc.) and enable the plugin bundles for their domains. Skills load on demand, so a big library costs nothing until used.
12. **`rules/security-and-hardening.md`** — apply before the agent holds any real credential or browser session: secrets off cloud-sync, least-privilege, prompt-injection defense. Scope it to what they flagged confidential (Q9).
13. **`capabilities/`** — optional once the core runs: the operator dashboard and daily ops board for a live view of the work (the knowledge vault from step 2 also lives here).
14. **`efficiency/token-economy.md`** — apply throughout, not as a step: lazy loading, context hygiene, subagent isolation, model right-sizing. Read it early; it changes how you do every step above.
15. **`philosophy/`** — read it yourself; it explains why the pieces fit.

Whenever you finish, cross-check against **`STACK.md`** — it lists every component. If the human runs something that isn't installed or isn't on that list, close the gap.

## Step 3 — Rules for adapting

- Every path, name, business detail in these docs is an EXAMPLE. Replace all of it.
- Prefer free/open-source. Never recommend a paid service without verifying its exact billing model first.
- Test one before batch. Always.
- Search before building — most of what your human needs already exists.
- Your human's messenger is your delivery surface. If a workflow requires them to open an app, edit a file, or click a UI, the workflow is not done.

## Step 4 — Verify

After setup, run one end-to-end proof: your human sends a voice note from their phone; you transcribe it, do the task, and reply with the result as text + voice. If that loop works, the installation is real.

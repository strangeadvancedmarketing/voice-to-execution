# What You Have to Supply

This repo ships the rules, hooks, patterns, and wiring. It does **not** ship
secrets or accounts — you bring those. Nothing here phones home; every credential
stays on your machine. Here's the honest, complete list so there are no surprises
mid-setup.

## Required to reach the core "voice note in, action out" loop
- **A machine that stays on and logged in.** The agent, the bot, and scheduled
  tasks run locally. A laptop that sleeps kills the always-on pieces (morning brief,
  watchers). A cheap always-on box or a small cloud VM works.
- **Claude Code CLI**, installed and authenticated ([docs](https://docs.anthropic.com/en/docs/claude-code)).
- **Runtimes:** Python 3.10+, Node 18+, `git`, `ffmpeg`. (`docs/connectors/local-ai.md` covers whisper/edge-tts.)
- **Telegram bot token** — from [@BotFather](https://t.me/BotFather) (`/newbot`). Plus your
  own chat id for the allowlist. See `docs/connectors/telegram-voice-loop.md` (Claude Code Telegram plugin).

## Per-connector — only for the ones you turn on
| You want… | You supply | Where |
|-----------|-----------|-------|
| Google (Gmail/Calendar/Drive/Sheets) | A **Google Cloud OAuth client** (create project → enable APIs → consent screen → add yourself as test user → Desktop OAuth client → download JSON). ~6 screens, ~10 min. | `docs/connectors/google-suite.md` |
| Payments | **Stripe** secret key | `docs/connectors/mcp-servers.md` |
| CRM | **HubSpot** private-app token | `docs/connectors/mcp-servers.md` |
| Scraping | **Apify** API token | `docs/connectors/mcp-servers.md` |
| Other messaging channels (Slack/WhatsApp/SMS) | That platform's bot/API creds — and a real build (it's a pattern, not a toggle) | `docs/connectors/telegram-voice-loop.md` |

## What you do NOT need
- No paid transcription/TTS API — whisper + edge-tts run locally, free.
- No hosting bill for the framework itself — it runs on your machine.
- No account with us. This is open source; take what you want.

> Prefer not to gather all this yourself? That's exactly the gap a done-for-you setup
> fills — but everything above is here so you can absolutely do it solo.

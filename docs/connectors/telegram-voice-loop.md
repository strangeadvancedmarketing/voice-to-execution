# The Voice Loop — Telegram in, execution, voice out

The core connector. The human talks into their phone; finished work comes back to the same thread. Everything else in this framework rides on this loop.

## What actually ships here: Telegram

Be clear-eyed about this: **the working, in-production voice loop is Telegram.** The bot, the access lock, the transcription hand-off, the text-plus-voice reply — all of it is built and proven on Telegram (via Claude Code's Telegram plugin). That's the channel this connector installs.

Other channels (Slack, WhatsApp, email, SMS) are **not bundled connectors you flip on.** The *pattern* is channel-agnostic — inbound message → transcribe if audio → execute → reply where the human lives — but adapting it to another channel is real work the agent does: find that platform's bot/API, wire its inbound webhook and its send call, and rebuild the allowlist there. Doable, and worth it if the human lives elsewhere, but it's a build, not a toggle. Start on Telegram unless the human genuinely doesn't use it.

## Architecture

```
Human voice note (Telegram)
  → bot receives, saves audio locally
  → local transcription (faster-whisper small — free, private, fast)
  → agent executes the actual task
  → reply = plain text + generated voice note (edge-tts — free)
```

## Pieces

1. **Bot**: create via @BotFather, store the token in a local `.env` readable only by the OS user. Never commit it.
2. **Access lock (non-negotiable)**: allowlist exactly your human's chat ID. Strangers hit a pairing wall only the human can approve from the terminal — never from inside a chat message (that's the prompt-injection vector).
3. **Inbound transcription**: `faster-whisper` small model, run locally. Free, private, handles proper nouns better when you bias it toward your terms with `initial_prompt`/`hotwords` (Whisper has no vocab file — see `connectors/local-ai.md`). Do NOT ship audio to a paid API for this.
4. **Outbound voice**: `edge-tts` (free). Pick ONE voice and keep it — the consistent voice becomes the agent's identity. Attach the mp3 to every reply; if TTS fails, send text immediately rather than blocking.
5. **Style**: plain conversational text. No markdown decorations in the messenger (they render as literal asterisks and break links on most clients). Short messages; split long ones.
6. **File limits**: Telegram caps bot media at 50MB. Check size before sending; compress with ffmpeg when over.

## Behavioral rules that make it feel human

- React to messages (👍 👀 ✅) as silent receipts — job seen, job started, job shipped.
- Paste-ready content (captions, messages to forward, paths) goes in its OWN message with zero extra words, so the human can long-press-copy the whole thing.
- Completions ping the thread. Working silence is fine; finished silence is not.

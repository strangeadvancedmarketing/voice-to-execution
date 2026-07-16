# Client Deployment — standing the same agent up for others

This is how the framework is deployed for a client: the same voice-to-execution loop, running on the client's own machine (or a container you host), reachable by voice note, monitored so you know it's alive before they do. It is a **pattern**, not a product — every real name, IP, host, and token below is a placeholder you fill per client.

The shape is deliberately simple: a small **receptionist** bot owns the messaging channel and never thinks; a swappable **brain** does the thinking. Everything else — deployment transport, watchdog, monitoring, config sync, isolation — exists to keep that pair reliable on a machine you don't sit in front of.

## The model: receptionist + brain

```
voice note ─▶ receptionist bot ─▶ brain (agent) ─▶ receptionist ─▶ text + voice reply
  (client)     holds the token       swappable         speaks back      (same thread)
               long-polls
               transcribes
```

**The receptionist** is a small, boring Python process. Its only jobs: hold the bot token, long-poll the messaging API, transcribe inbound voice to text, hand the text to the brain, speak the brain's reply, and send it back. It is intentionally dumb so it never crashes on a bad model turn.

**The brain** is whatever agent you point it at, called as a subprocess or a local gateway. Two proven brains:

- **CLI brain** — the agent's own CLI in headless mode (`<agent-cli> -p ...`). Deploys onto the client's existing machine, uses their subscription/keys, no extra infrastructure. This is the "runs on the client's own machine, they own it" path.
- **Gateway brain** — a long-running agent gateway (e.g. an OpenClaw container) with a model provider behind it. This is the "fully hosted, zero client install" path; the receptionist talks to the gateway instead of shelling out.

The receptionist code is identical either way. You swap one function — `call_brain(text) -> reply` — and nothing else moves.

### Receptionist skeleton (reference implementation)

Complete enough to adapt; wire your channel's file-download and your brain call. This uses the Telegram Bot API (stdlib only) because that is the shipped, proven channel.

> A complete, runnable version of this receptionist ships in [`example-bot/bot.py`](example-bot/bot.py) — raw Bot API long-polling, pluggable `TRANSCRIBE_CMD` / `EXEC_CMD` (point the brain at your agent CLI, e.g. `claude -p`), and a `--selftest` that proves the transcribe → run → reply plumbing offline. Note: this is the **client-deployment** path (a standalone receptionist bot); an operator running the framework on their own machine uses the Claude Code Telegram plugin instead (`docs/connectors/telegram-voice-loop.md`).

```python
#!/usr/bin/env python3
"""Receptionist bot: long-poll, transcribe voice, call the brain, speak the reply.
Token and allowlist come from the environment — never hardcoded."""
import json, os, subprocess, sys, urllib.parse, urllib.request

TOKEN   = os.environ["{{ENV:CLIENT_BOT_TOKEN}}"]          # from BotFather, per client
ALLOW   = {int(x) for x in os.environ["BOT_ALLOW_CHAT_IDS"].split(",")}  # owner's chat id(s)
API     = f"https://api.telegram.org/bot{TOKEN}"
FILEAPI = f"https://api.telegram.org/file/bot{TOKEN}"

def api(method, **params):
    url = f"{API}/{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)

def transcribe(file_id: str) -> str:
    path = api("getFile", file_id=file_id)["result"]["file_path"]
    local = os.path.join(os.environ.get("TMPDIR", "/tmp"), os.path.basename(path))
    urllib.request.urlretrieve(f"{FILEAPI}/{path}", local)
    # Local, free transcription — faster-whisper; see docs/connectors/local-ai.md
    out = subprocess.run(["python", "tools/transcribe.py", local],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()

def speak(text: str) -> str:
    mp3 = os.path.join(os.environ.get("TMPDIR", "/tmp"), "reply.mp3")
    subprocess.run(["edge-tts", "--voice", "{{VOICE}}", "--rate=+20%",
                    "--text", text, "--write-media", mp3], check=True)
    return mp3

def call_brain(text: str) -> str:
    # SWAP THIS FUNCTION to change brains. CLI-brain form shown; see "MCP isolation" below.
    cmd = ["claude", "-p", "--continue",
           "--append-system-prompt", os.environ["SYSTEM_PROMPT"],
           # MCP isolation flags — mandatory when a second agent runs on the same machine:
           "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
           "--settings", '{"hooks":{}}',
           text]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=os.environ["CLIENT_WORKDIR"])
    reply = r.stdout.strip()
    return reply or "Got your message but couldn't put a response together. Try rephrasing."

def main():
    offset = 0
    while True:
        for upd in api("getUpdates", offset=offset, timeout=30).get("result", []):
            offset = upd["update_id"] + 1
            msg = upd.get("message") or {}
            chat = msg.get("chat", {}).get("id")
            if chat not in ALLOW:                    # only the owner may drive the bot
                continue
            text = transcribe(msg["voice"]["file_id"]) if "voice" in msg else msg.get("text", "")
            if not text:
                continue
            api("sendChatAction", chat_id=chat, action="typing")
            reply = call_brain(text)
            api("sendMessage", chat_id=chat, text=reply)
            # voice reply: POST sendVoice with the mp3 from speak(reply) (multipart)

if __name__ == "__main__":
    main()
```

Two hard facts baked into the skeleton, both learned the hard way:

- **Only the owner drives the bot.** The allowlist check is not optional — a client bot that answers strangers is a liability.
- **A bot cannot message a user first.** The messaging platform requires the user to tap *Start* before the bot can send to them. Handoff is: email the client the bot link, they open it and message it, then you're live. Never promise "it will text you."

## Persistent sessions — non-negotiable

Never deploy a **stateless** brain. A bot that forgets between turns while you're selling "persistent memory" destroys trust on day one. Before any client bot goes live, verify every item:

1. `--continue` on every headless brain call (persistent session).
2. `--append-system-prompt`, not `--system-prompt` — preserves the project `CLAUDE.md` loading.
3. The `SYSTEM_PROMPT` **includes explicit memory-write instructions** ("use the Write tool to save a memory file at `<path>`"). `CLAUDE.md` instructions get compacted away; the system prompt is the only instruction that survives every invocation. If memory persistence isn't in the system prompt, it won't happen long-term.
4. A `HANDOFF.md` in the working directory with initial context, and a HANDOFF fallback in the brain call (never bare stateless).
5. The memory directory **seeded** with the client's business facts from onboarding.
6. `CLAUDE.md` has a State Persistence section (when to read/write HANDOFF, when to save memories).
7. Session-start hook points to the correct HANDOFF path; PreCompact hook saves meaningful state.
8. **Test one message end-to-end** before telling the client it's ready — then send 2–3 more and confirm memory files are actually being written (check timestamps).

If the checklist isn't complete, the bot isn't deployed.

## Seeding the brain

The client's business facts must live where the model actually reads them. If the brain has no file-read tool at inference time, facts must be in the always-loaded layer (the system prompt / `AGENTS.md` / `CLAUDE.md`), not only in a `business_context.md` it may never open. Seed: name, address, hours, services and prices, key policies, FAQ answers, and tone. Target **capability parity** with your own agent — the standing bar is "their bot does what my agent can do":

- Latest agent CLI installed.
- `git` + GitHub CLI for community-first search/clone.
- The skills you rely on (research, content, media compression, and — for service clients — the invoice skill).
- A community-first rule file (free/OSS and existing solutions before building).
- Media tooling (ffmpeg, and a content studio if they produce content).

## Deploying over a private mesh (Tailscale)

Put the client's machine and yours on the same private mesh network so you can reach it without exposing anything to the public internet. [Tailscale](https://tailscale.com) (free tier) gives every machine a stable private IP on an encrypted WireGuard mesh; connect over SSH with **key auth only**.

```bash
# One-time on the client machine: install Tailscale, sign in, note its mesh IP.
# Then from your machine, all remote work is plain SSH over the mesh:
ssh {{CLIENT_A_SSH_USER}}@{{CLIENT_A_TAILSCALE_IP}}
```

- The mesh IP **can shift** on reconnect — resolve by machine name where possible, and re-check the IP if a connection fails rather than assuming the bot is down.
- **Auto-start on boot** is required, or a reboot silently kills the bot: `launchd` on macOS, a Scheduled Task on Windows, `systemd`/cron `@reboot` on Linux — plus Tailscale set to start at login.
- Remote re-authentication (when a subscription/keychain credential drops) is doable over SSH with no client involvement: open a controlled pipe to the CLI's login flow, read the URL from its output, have the account holder open the URL and read back the code, then restart the bot. Keep this runbook in the client's own `CLAUDE.md`.

> Platform gotcha: on macOS, an SSH-shell auth check can report a **false negative** (the CLI reads its credential from the login keychain, which an SSH session may not have unlocked). Verify against the running bot's actual behavior, not a bare `auth status` over SSH.

## Watchdog and central monitoring

A process being alive is not the same as the bot working — a PID check is a half-check. Every health check must verify the bot can actually function, silently, without the client ever knowing you looked.

**Per-bot watchdog (on the client machine):**

- Auto-restart on crash and on reboot — `--restart unless-stopped` if containerized; the OS scheduler's keep-alive otherwise. Watch for an OOM restart-loop (a memory limit too low will crash-loop forever).
- A **functional** health probe, not a liveness probe: process up → readiness endpoint → a deep probe that reports **auth age** (this is what catches the silent "process alive, credential expired, every reply is the generic fallback" failure) → detect provider auth errors (e.g. HTTP 401/402).
- **Never restart-loop an auth failure** — restarting won't fix an expired credential; escalate instead.

**Central monitor (one process watching the whole fleet):**

- Discovers bots by a label/registry, probes each on an interval, and **alerts you the moment any client bot drops** — the exact gap that once hid an outage for weeks.
- **Re-alert ladder** so a real outage isn't a single missable ping: alert on first failure, then re-alert at widening intervals (e.g. immediately, +15m, +1h, +4h) until resolved, and send a recovery notice when it clears.
- A **self-connectivity guard**: if the monitor itself can't reach the network, it must not spam false "all bots down" alerts.

**Dead-man's switch (off-box):** a tiny external job (a free uptime-ping service, or a second machine) watches the monitor itself. The monitor checks in on a schedule; its **silence** is the alarm. Without this, the monitor going blind looks identical to everything being fine.

**Monitoring protocol — every check includes all of these, and stays completely silent:**

1. Process running (PID, uptime, memory).
2. Bot log — last 30–50 lines for errors, stuck states, failed replies.
3. Error log — stderr/exception file (routine polling timeouts are not errors).
4. Channel API connectivity — hit the `getMe` endpoint to confirm the token still works.
5. Pending/backlogged updates — check for stuck messages.
6. Recent activity — confirm it's actually processing messages, not alive but deaf.
7. **Zero visible footprint** — tail logs read-only over SSH; never send a test message into the client's chat, never touch their thread. Relay summaries to the operator; alert the operator immediately on any error or failed reply.

## Nightly config sync

Keep client bots current without them lifting a finger — this is the "who has this deployed, push the update silently" loop. A nightly job, per client:

- Pull the canonical config/skill/rule set from your source of truth and reconcile it against the deployed copy, restarting the bot only if something changed.
- **Reset the session** if you run long-lived sessions, so context doesn't accrete forever.
- Back up the client's **memory** off the machine (e.g. `restic`/`rsync` to storage you control) — the memory *is* the moat, and it must not live on one disk. Design this from client one; a bot with no memory backup is one dead drive from starting over.

## Per-client isolation

Two isolation problems, two fixes:

**1. Second agent on your own machine steals the messaging bridge.** The messaging API allows only one long-poll connection per token. If a second agent process starts on the same machine and loads your channel plugin by default, it opens a competing poller and **your main bridge silently drops**. Pass isolation flags to every secondary headless agent call so it loads zero channel plugins and its own empty MCP config:

```bash
claude -p --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --settings '{"hooks":{}}' "<the task>"
```

(This is already in the receptionist skeleton's `call_brain`.) Verified behavior: the child still returns output and authenticates normally, loads no channel plugin, and does not drop the main bridge. Client bots on **their own** machines don't hit this — there's no competing plugin there — but the moment two agents share a host, this is mandatory. Next hardening: give the child its own config dir so it also can't read your global `CLAUDE.md`.

**2. Multiple hosted clients on one host.** Give each client an isolated home so configs, memory, and sessions never bleed:

- Gateway brains: a separate config/home root per client (`OPENCLAW_HOME=<client-dir>` style), or one container per client with a hard memory limit, a named volume, and a client-id label.
- Never copy a working client's config to a new client without **stripping and rotating every secret** in it first — a config cloned from a live bot carries live tokens and keys. Strip, then re-issue.

## Go-live sequence

1. Provision the client workspace from your template; seed business facts into the always-loaded layer.
2. Reach parity — install the CLI, skills, tooling; wire only the connectors that are free/native by default (keyed integrations are opt-in, the client's own key).
3. Wire the receptionist to the client's own bot token; set the allowlist to the owner's chat id.
4. Deploy onto the client machine over the mesh (or spin the container); set auto-start on boot.
5. Register the bot with the central monitor; confirm the watchdog and dead-man's switch see it.
6. **Test one full loop yourself** — voice in, correct answer with real business facts, voice out, memory written — before handoff.
7. Email the client the bot link; they tap *Start* and send the first message; you're live. Monitor passively (white-glove) for the first days.

## The principle

The receptionist stays dumb, the brain stays swappable, and everything you build around them exists to answer one question before the client ever has to ask it: **is their bot working right now?** If you can't answer that silently and instantly, the deployment isn't done.

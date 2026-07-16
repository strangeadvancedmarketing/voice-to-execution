#!/usr/bin/env python3
"""
Minimal voice-to-execution Telegram bot — the actual loop, runnable.

    voice note  ->  download  ->  transcribe  ->  run a command  ->  reply

No framework: raw Bot API long-polling over `requests`. Transcription and
execution are pluggable shell commands so this stays honest about the one thing
it owns (the loop) and doesn't pretend to bundle a model or an agent.

Quick start:
    pip install requests
    cp .env.example .env      # fill in TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_ID
    python bot.py             # long-polls; send it a voice note

Offline wiring check (no token, no network):
    python bot.py --selftest  # proves transcribe->exec plumbing end to end

Windows note: the default TRANSCRIBE_CMD and the --selftest use POSIX shell
(`printf`, `tr`, `/dev/null`, `&&`). Run under Git Bash or WSL, or set
TRANSCRIBE_CMD / EXEC_CMD to cmd/PowerShell equivalents.

Config (env / .env):
    TELEGRAM_BOT_TOKEN   from @BotFather                              (required to run)
    ALLOWED_CHAT_ID      only this chat is served; others ignored     (required to run)
    TRANSCRIBE_CMD       shell cmd, gets an audio path as {audio},
                         must print the transcript to stdout
                         default: whisper CLI (openai-whisper)
    EXEC_CMD             shell cmd, gets the transcript on stdin,
                         must print the reply to stdout
                         default: echo it back (replace with your agent, e.g. `claude -p`)
"""
import os, sys, subprocess, tempfile, time, json, shlex

API = "https://api.telegram.org/bot{token}/{method}"

DEFAULT_TRANSCRIBE = 'whisper "{audio}" --model small --output_format txt --output_dir {outdir} && cat {outdir}/*.txt'
DEFAULT_EXEC = "cat"  # echoes the transcript back; swap for your agent CLI


def cfg(name, default=None, required=False):
    v = os.environ.get(name, default)
    if required and not v:
        sys.exit(f"[bot] missing required config: {name} (see .env.example)")
    return v


def run(cmd, stdin=None, timeout=180):
    """Run a shell command, return stdout (stderr surfaced on failure)."""
    p = subprocess.run(cmd, shell=True, input=stdin, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError(f"command failed ({p.returncode}): {cmd}\n{p.stderr.strip()}")
    return p.stdout.strip()


def transcribe(audio_path):
    outdir = tempfile.mkdtemp(prefix="v2e-tx-")
    cmd = cfg("TRANSCRIBE_CMD", DEFAULT_TRANSCRIBE).replace("{audio}", audio_path).replace("{outdir}", outdir)
    return run(cmd)


def execute(text):
    cmd = cfg("EXEC_CMD", DEFAULT_EXEC)
    return run(cmd, stdin=text)


def handle_transcript(text):
    """The loop's core, isolated so it's testable without Telegram."""
    text = (text or "").strip()
    if not text:
        return "(couldn't transcribe that — try again?)"
    return execute(text)


# ---- Telegram Bot API (only touched when actually running) ------------------
def tg(token, method, **params):
    import requests
    r = requests.post(API.format(token=token, method=method), data=params, timeout=60)
    r.raise_for_status()
    return r.json()


def download_voice(token, file_id, dest_dir):
    import requests
    info = tg(token, "getFile", file_id=file_id)["result"]
    url = f"https://api.telegram.org/file/bot{token}/{info['file_path']}"
    oga = os.path.join(dest_dir, "voice.oga")
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with open(oga, "wb") as f:
            for chunk in resp.iter_content(8192):
                f.write(chunk)
    # normalize to 16k mono wav for whisper
    wav = os.path.join(dest_dir, "voice.wav")
    run(f'ffmpeg -y -i "{oga}" -ar 16000 -ac 1 "{wav}"', timeout=60)
    return wav


def serve():
    token = cfg("TELEGRAM_BOT_TOKEN", required=True)
    allowed = str(cfg("ALLOWED_CHAT_ID", required=True))
    print(f"[bot] up. serving chat {allowed}. Ctrl-C to stop.")
    offset = None
    while True:
        try:
            resp = tg(token, "getUpdates", timeout=30, offset=offset)
        except Exception as e:
            print(f"[bot] poll error: {e}; backing off"); time.sleep(5); continue
        for upd in resp.get("result", []):
            offset = upd["update_id"] + 1
            msg = upd.get("message") or {}
            chat_id = str((msg.get("chat") or {}).get("id", ""))
            if chat_id != allowed:
                continue  # ignore everyone but your own chat
            voice = msg.get("voice") or msg.get("audio")
            if not voice:
                continue
            try:
                with tempfile.TemporaryDirectory(prefix="v2e-") as d:
                    wav = download_voice(token, voice["file_id"], d)
                    reply = handle_transcript(transcribe(wav))
            except Exception as e:
                reply = f"[bot] error: {e}"
            tg(token, "sendMessage", chat_id=chat_id, text=reply[:4000])


def selftest():
    """Prove the transcribe->exec wiring without a token, network, or model."""
    os.environ["TRANSCRIBE_CMD"] = 'printf "turn on the porch light"'  # stub "transcriber"
    os.environ["EXEC_CMD"] = "tr a-z A-Z"                              # stub "agent": upper-case it
    got = handle_transcript(transcribe("/dev/null"))
    assert got == "TURN ON THE PORCH LIGHT", f"unexpected: {got!r}"
    assert handle_transcript("") == "(couldn't transcribe that — try again?)"
    print("[selftest] transcribe->exec loop OK:", got)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        serve()

# Local & Free AI — the voice, the ears, and the generators

The stack runs on free, local, or free-tier AI wherever possible — not to be cheap, but because local is private, has no per-call meter, and doesn't break when a vendor changes pricing. Paid services are a deliberate exception, never a default.

## The ears — transcription (free, local)

`faster-whisper` (small model) transcribes inbound voice notes locally. Free, private, fast, and handles proper nouns far better than tiny models. To stop it mangling the human's business terms, client names, and product names, bias the decoder toward them — Whisper has **no custom-vocabulary file**; you steer it with `initial_prompt` (a short string listing the terms, prepended as context) and/or `hotwords` in `faster-whisper`. Both nudge recognition toward those words; neither is a dictionary you load.

```bash
pip install faster-whisper
```
```python
from faster_whisper import WhisperModel
model = WhisperModel("small")
# Bias toward your terms — this is the real "custom vocab" mechanism:
segments, _ = model.transcribe(
    "note.ogg",
    initial_prompt="Terms: Acme Roofing, Riverside Dental, Priya, Webflow.",
    # hotwords="Acme Roofing Riverside Dental",   # alternative/additional biasing
)
print(" ".join(s.text for s in segments))
# transcribe locally; never ship a human's audio to a paid API for this
```

## The voice — text-to-speech (free)

`edge-tts` generates the agent's spoken replies. Free. Pick ONE voice and keep it — a consistent voice becomes the agent's identity. Lock a speaking rate and reuse it everywhere.

```bash
pip install edge-tts
edge-tts --voice en-GB-RyanNeural --rate=+20% --text "..." --write-media reply.mp3
# if TTS ever fails, send the text immediately — never block a reply on audio
```

### Clean the text before it is spoken

`edge-tts` reads whatever you hand it — literally. Pass reply text that still carries emoji or markdown and the voice says "fish emoji" and "asterisk asterisk" out loud. The spoken reply and the written reply are two renderings of the same message: the messenger text stays plain (markdown breaks links there too), and the TTS input gets its *own* cleaning pass that strips anything that has no business in speech. Run every reply through a cleaner before `--write-media`.

Strip emoji by **codepoint range**, not a regex character class. An emoji char-class saved with the wrong encoding compiles to an invalid range and throws on *every* call, silently dropping the reply to text-only; iterating codepoints cannot corrupt that way.

```python
import re

def clean_for_speech(text):
    # 1) drop emoji / pictographic symbols by codepoint (never a regex char-class — see note above)
    out = []
    for ch in text:
        o = ord(ch)
        if (0x1F000 <= o <= 0x1FAFF or 0x2600 <= o <= 0x27BF or
            0x1F1E6 <= o <= 0x1F1FF or 0x2B00 <= o <= 0x2BFF or
            0x2190 <= o <= 0x21FF or 0xFE00 <= o <= 0xFE0F or
            o == 0x200D or o in (0x2764, 0x2B50, 0x2122, 0x00AE, 0x00A9)):
            continue
        out.append(ch)
    text = "".join(out)
    # 2) strip markdown syntax so it is not read aloud
    text = re.sub(r"[*_`~#>]", "", text)                    # bold/italic/code/headers/quotes
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)  # [label](url) -> label
    text = re.sub(r"^\s*[-+]\s+", "", text, flags=re.M)     # list bullets
    # 3) collapse whitespace back to natural sentences
    text = re.sub(r"\s+", " ", text).strip()
    return text

# edge-tts --voice en-GB-RyanNeural --rate=+20% --text "$(clean)" --write-media reply.mp3
```

Wrap the call so a cleaning failure falls back to the raw string rather than dropping the voice note — a spoken reply that is slightly off still beats no spoken reply.

## The cloned voice — optional, local

For content in the human's own voice, a local voice-clone model (e.g. Chatterbox) runs on their machine — no per-generation cost, no audio leaving the box. Use it for content only, never to impersonate the human in a way that could mislead.

## Free generation lanes (tested, not theorized)

For images and short video without a paid bill:
- **Hugging Face ZeroGPU Spaces** — free video generation, driven programmatically via `gradio_client` (live-tested: a short clip in ~28 seconds, $0). The free MCP also gives image gen.
- **Cloudflare Workers AI** — FLUX-schnell image generation on a free daily allotment (~230 images/day), commercial-clear.
- **Myth-busts from real testing:** some "free" tiers aren't — a major studio's free tier was a one-time credit, and one big vendor has no free generation tier at all despite the marketing. Verify the current free-tier terms before using output commercially; free-for-personal is not always free-for-commercial, and that line moves. (Rule #2: never assume a billing model — check it.)

## Media/caption tooling

Small vendored utilities keep the media pipeline free and local: a frame-extraction + captions-first VTT parser for pulling stills and transcripts from video, a media downloader (`gallery-dl`) for archiving source content, and a badge/watermark applier that overlays a mark rather than re-generating the frame. All local, all free.

## Media processing — FFmpeg

`ffmpeg` handles every audio/video transform locally and free: compress a file under a messenger's size cap, extract audio for transcription, normalize loudness, match formats before concatenation.

```bash
# compress video under a 50MB messenger cap
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset fast -y output.mp4
```

## The principle

Every piece here is free or local first. Before adding a paid AI service, confirm exactly what it costs per unit, prove the free option genuinely can't do the job, and present that finding — don't reach for the paid API because it's easier.

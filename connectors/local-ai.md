# Local & Free AI — the voice, the ears, and the generators

The stack runs on free, local, or free-tier AI wherever possible — not to be cheap, but because local is private, has no per-call meter, and doesn't break when a vendor changes pricing. Paid services are a deliberate exception, never a default.

## The ears — transcription (free, local)

`faster-whisper` (small model) transcribes inbound voice notes locally. Free, private, fast, and handles proper nouns far better than tiny models — feed it a custom vocabulary of the human's business terms, client names, and product names so it stops mangling them.

```bash
pip install faster-whisper
# transcribe locally; never ship a human's audio to a paid API for this
```

## The voice — text-to-speech (free)

`edge-tts` generates the agent's spoken replies. Free. Pick ONE voice and keep it — a consistent voice becomes the agent's identity. Lock a speaking rate and reuse it everywhere.

```bash
pip install edge-tts
edge-tts --voice en-GB-RyanNeural --rate=+20% --text "..." --write-media reply.mp3
# if TTS ever fails, send the text immediately — never block a reply on audio
```

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

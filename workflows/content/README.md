# Content Workflows

Short-form video, carousels, and voiceover — produced on free and local generation lanes, in the operator's own voice, to a fixed quality bar. This is the content half of the framework: the agent takes a topic or a voice note and returns a finished, on-format asset without the operator opening an editor.

Everything here runs free or local first. Paid generation is a deliberate, per-unit-verified exception (see [Free generation lanes](#free-generation-lanes)), never the default.

## Contents

- [What ships vs. what you build](#what-ships-vs-what-you-build)
- [Prerequisites](#prerequisites)
- [Content quality gates](#content-quality-gates)
- [Workflow 1 — Tip video (Remotion + cloned voiceover)](#workflow-1--tip-video-remotion--cloned-voiceover)
- [Workflow 2 — Carousel (HTML slides + generated art)](#workflow-2--carousel-html-slides--generated-art)
- [Workflow 3 — Faceless / full-AI video](#workflow-3--faceless--full-ai-video)
- [Local voice cloning (Chatterbox — content only)](#local-voice-cloning-chatterbox--content-only)
- [Voiceover mastering](#voiceover-mastering)
- [Free generation lanes](#free-generation-lanes)
- [Provenance](#provenance)

## What ships vs. what you build

Be clear on what this repository contains so you know what to install versus what to reconstruct.

| Component | Status | Where |
|-----------|--------|-------|
| Tip-video pipeline | **Ships** — full skill | `.claude/skills/tip-video/` |
| Faceless video pipeline | **Ships** — full skill | `.claude/skills/video-pipeline/` |
| Remotion patterns | **Ships** — reference skill | `.claude/skills/remotion-best-practices/` |
| Local voice clone (Chatterbox) | **Build** — reproducible pattern below | this doc |
| Carousel builder | **Build** — reproducible pattern below | this doc |
| Free-gen lane scripts (HF ZeroGPU, Cloudflare FLUX) | **Build** — full source inlined below | this doc |

The "build" items are small, single-purpose scripts. The complete, runnable core of each is inlined below — this is not a "wire it yourself" hand-wave. Paths written as `{{HOME}}\...` are where the operator's stack keeps them; put yours anywhere and adjust.

## Prerequisites

| Tool | For | Install |
|------|-----|---------|
| Python 3.10+ | Every generator and the voice clone | python.org |
| Node.js 18+ | Remotion compositions | nodejs.org |
| ffmpeg | Assembly, normalization, loudness | `winget install Gyan.FFmpeg` / `apt install ffmpeg` / `brew install ffmpeg` |
| `faster-whisper` | Verifying cloned-VO transcripts | `pip install faster-whisper` |
| `gradio_client` | Hugging Face ZeroGPU free lane | `pip install gradio_client` |
| A Remotion project | Tip-video terminal compositions | `npx create-video@latest` |

Credentials live in the environment or a `.env`, never in a script:

```bash
# free lanes
export HF_TOKEN="{{ENV:HF_TOKEN}}"                 # huggingface.co/settings/tokens (free)
export CF_ACCOUNT_ID="{{ENV:CF_ACCOUNT_ID}}"       # Cloudflare account id
export CF_API_TOKEN="{{ENV:CF_API_TOKEN}}"         # Cloudflare Workers AI token
# paid lane (optional, per-unit-verified only)
export FAL_KEY="{{ENV:FAL_KEY}}"                   # fal.ai — prepaid, pay-per-use
```

## Content quality gates

These are enforced on every asset. They come from real audience testing; violating them has caused rejected work.

- **Fill the frame.** 1080x1920 for vertical, zero black bars.
- **Large, legible text.** 42–48pt headers, 24–26pt body at 1080x1920. Thin dark outline on text sitting over bright art (8-direction text-shadow, ~3px on headers, ~1.5px on body) so it stays readable.
- **Realistic physics at dramatic scale only.** No neon, glow, or fantasy styling.
- **Motion is mandatory for terminal footage.** A static terminal frame is an instant reject — the camera must move with the voiceover (zoom in on each command, dwell, release).
- **Teach, don't announce.** A how-to must show the real command / config, not just name a feature.
- **Generation models write gibberish text.** Never prompt for readable screens, signs, or captions close-up; objects, environments, and atmosphere are the safe zone. Burn real captions in post instead.
- **Test one before batch.** Render and approve a single output before generating a set — every generation costs quota or money.
- **Voiceover is the operator's voice or their cloned voice.** Generic robotic TTS is banned for content (it is fine for the agent's own reply notes).
- **Never re-compress before delivery.** Encode once at the end.

## Workflow 1 — Tip video (Remotion + cloned voiceover)

A 20–40s vertical video that demonstrates a real terminal workflow, narrated in the operator's cloned voice. Full, shipped implementation: [`.claude/skills/tip-video/SKILL.md`](../../.claude/skills/tip-video/SKILL.md). The steps below are the shape; the skill has the exact Remotion component code, the SmartZoom choreographer API, and the assembly filtergraphs.

**Winning structure (interwoven, not front-loaded):**

```
intro (on-camera hook) → pain b-roll → terminal STEP 1 (zoom) →
concept b-roll → terminal STEP(s) + payoff badge → brand outro
```

1. **Script + beats.** Write the narration and split it into short beats. The clone truncates at ~16s / ~40 words per call, so one beat per command is both a technical requirement and a timing gift — each beat's duration tells you exactly how long its terminal zoom should run.

2. **Build the terminal in Remotion.** Create a `.tsx` composition (1080x1920, 30fps) using the shipped `SmartZoomV2` + `ClaudeCodeTerminal` + `MacOSWindow` components. Let the choreographer generate the camera from the event list rather than hand-writing keyframes:

   ```tsx
   const autoZoom = choreographTerminal(termEvents, {
     windowHeight: 600, marginTop: 90, fontSize: 13, scale: 2.4, releaseFrame: 330,
   });
   ```

   The success/CTA badge pops and grows in the **center** of the frame (scale 0.55 → 1.08 → 1) and must sit **outside** the SmartZoom wrapper so it is not zoomed. No `Math.random()` anywhere — Remotion re-renders each frame independently and any randomness breaks determinism.

3. **Render verification frames first**, then the body:

   ```bash
   npx remotion still src/index.tsx MyTip out/verify_f200.png --frame=200
   npx remotion render src/index.tsx MyTip out/body.mp4 --codec h264
   ```

   Read each still and confirm text is uncut, framing is centered, and the badge lands. Send the body-only render for review before assembling.

4. **Generate the voiceover** in the cloned voice, one beat per file (see [Local voice cloning](#local-voice-cloning-chatterbox--content-only)), then master each beat (see [Voiceover mastering](#voiceover-mastering)).

5. **Assemble.** Normalize every segment to identical format (1080x1920, 30fps, 48kHz stereo AAC) before concatenation — mismatched formats are the number-one cause of stutter and dropped audio. Mux the VO onto the body and lift it to `-11` LUFS per-segment (the cloned VO always renders quiet), then concatenate intro + body + outro with a final loudnorm:

   ```bash
   # mux VO onto body, boost VO to -11 LUFS, freeze last frame if VO runs long
   ffmpeg -i body.mp4 -i vo.wav \
     -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=3[v];[1:a]aresample=48000,loudnorm=I=-11:TP=-1.5:LRA=11[a]" \
     -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset fast -r 30 -c:a aac -b:a 192k -shortest -y body_with_vo.mp4

   # concat intro + body + outro, final normalize
   ffmpeg -i intro_norm.mp4 -i body_with_vo.mp4 -i outro_norm.mp4 \
     -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[vout][aout];[aout]loudnorm=I=-16:TP=-1.5:LRA=11[anorm]" \
     -map "[vout]" -map "[anorm]" -c:v libx264 -crf 18 -preset fast -r 30 -c:a aac -b:a 192k -y out/final.mp4
   ```

   The two-stage loudness (per-segment `-11`, then final `-16`) is what stops the narration sitting quietly under a loud camera intro and music outro. Never ship without the `-11` VO boost.

6. **Deliver.** Confirm the file is under the messenger's size cap, then send the final over `{{PRIMARY_CHANNEL}}` with a text + voice summary.

## Workflow 2 — Carousel (HTML slides + generated art)

Multi-slide image posts (1080x1350 for a 4:5 feed; render a separate 9:16 set for vertical platforms — never reuse the 4:5 crop). The pipeline is HTML/CSS slides screenshotted headless, layered over generated marble/stone art. This is a **build** — the pattern is small and fully described here.

**Quality bar:** one design system per post, a kicker badge + a massive headline with accent words, a distinct visual per slide, dense specific content (real tool names, commands, numbers), and a minimal save/share/follow closer. Copy speaks value-to-reader — never "my setup / our setup," never brainstorm notes pasted in as copy, never comment-bait.

1. **Write slides as HTML/CSS.** One design token set (colors, display serif, mono eyebrow) reused across all slides. Put a real, copyable command chip on every teaching slide. For art that sits over text, duplicate the art layer with `mix-blend-mode: screen` above the text and feather it with a vertical `mask-image` gradient band (a hard `clip-path` leaves visible seams — always feather). This works because the generated art has pure-black backgrounds.

2. **Generate the art** on a free lane (see [Free generation lanes](#free-generation-lanes)). A prompt family that composites cleanly over dark slides: *"white marble statue / [subject], carved stone texture, champagne gold ember particles, pure black background, dramatic chiaroscuro, editorial photography."* Force stone explicitly ("carved from white carrara marble, visible stone veining, weathered cracks") — generic prompts render close-up hands as flesh/wax. For any surface meant to be blank, say "completely blank, no text" or the model engraves gibberish.

3. **Screenshot each slide** with Playwright using its **bundled Chromium** — not a system browser channel, which can flash a visible window onto the operator's screen:

   ```python
   from playwright.sync_api import sync_playwright

   with sync_playwright() as p:
       browser = p.chromium.launch(headless=True)   # bundled Chromium; run `playwright install chromium` once
       page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
       page.goto(f"file:///{slide_html_path}")
       page.screenshot(path=out_png)
       browser.close()
   ```

4. **Review one slide, then batch.** Confirm legibility over the brightest art before rendering the full set.

## Workflow 3 — Faceless / full-AI video

Story-driven vertical video with no on-camera operator — generated clips assembled into a narrative. Two paths, free first.

**Free faceless path (shipped skill):** [`.claude/skills/video-pipeline/SKILL.md`](../../.claude/skills/video-pipeline/SKILL.md) generates a 5-scene short from a topic: Edge TTS voiceover, free-lane image generation, and ffmpeg assembly with burned captions. Five scenes is the sweet spot for a 45–60s short; each narration is one to three punchy sentences ending in a call to action.

```bash
export HF_TOKEN="{{ENV:HF_TOKEN}}" && \
  uv run {{HOME}}/video-pipeline/generate_video.py --script script.json --output out.mp4
```

**Premium AI-clip path (paid, per-unit-verified):** for cinematic b-roll, generate 8s clips with native audio through a pay-per-use model API (e.g. `fal-ai/veo3.1/fast`, 9:16, 1080p, `generate_audio: true`) and assemble the clips in a manual editor so the fixed watermark never drifts. This is the honest cost note: **verify the real per-clip charge empirically by watching the balance delta on the first clip before generating a set.** Vendor pricing pages have been wrong by 10x in practice — one premium model billed ~$4–5/clip against a documented "$0.42." Default to genuinely cheap models for bulk b-roll and reserve premium models for single hero shots. Prompt for conceptual/product visuals and atmosphere; no generic stock-looking people, no readable on-screen text.

Any generated clip that carries a vendor sparkle watermark gets it covered in a final pass — overlay a brand mark, do not blur or inpaint (blur smears, inpaint streaks):

```bash
# cover the bottom-right sparkle with a brand pill; ffprobe the real dimensions, scale the badge, overlay
ffmpeg -v error -i in.mp4 -i brand_badge.png \
  -filter_complex "[1:v]scale=BW:BH:flags=lanczos[b];[0:v][b]overlay=X:Y" \
  -c:a copy -c:v libx264 -crf 18 -preset fast -y out.mp4
```

## Local voice cloning (Chatterbox — content only)

A local Chatterbox model reproduces the operator's voice for content narration. It runs fully offline on CPU, has no per-generation cost, and never sends audio off the machine. **Content only** — never use it to impersonate the operator in a way that could mislead.

**Setup (once):**

```bash
python -m venv cbx_env
cbx_env/Scripts/pip install chatterbox-tts torch --index-url https://download.pytorch.org/whl/cpu
```

**Reference clip:** record ~15–30s of clean studio audio and send it as a file, not a messenger voice note (messengers compress voice notes to narrowband and the clone locks onto the wrong voice). A 2s clip is too short — it produces a wrong, "too deep" voice. Save it as `{{HOME}}\sam_voice\voice_ref.wav`.

**Generator** (guard the Hugging Face cache path *before* importing, so a shell with a stale `HF_HOME` doesn't crash the model download):

```python
import os
os.environ["HF_HOME"] = r"{{HOME}}\hf_cache"   # set BEFORE importing chatterbox
os.environ["HF_HUB_OFFLINE"] = "1"             # after the one-time model download
import sys, torchaudio as ta
from chatterbox.tts import ChatterboxTTS

REF = r"{{HOME}}\sam_voice\voice_ref.wav"
text, out = sys.argv[1], sys.argv[2]
model = ChatterboxTTS.from_pretrained(device="cpu")   # first run downloads ~3GB once, free
wav = model.generate(text, audio_prompt_path=REF,
                     exaggeration=0.6, cfg_weight=0.5, temperature=0.65)
ta.save(out, wav, model.sr)
print(f"saved {out}")
```

**Locked settings:** `exaggeration=0.6, cfg_weight=0.5, temperature=0.65`. Do not drift from these — higher exaggeration with low cfg drags and drawls words; lower values flatten the delivery. First run downloads the model (~3GB, free, cached); subsequent runs take ~28s per short clip on CPU. Generate **one beat per call** (the model truncates ~16s / ~40 words silently). The model outputs at 24kHz — that is its ceiling; loudness, not tone, is what fixes any perceived "muffle" (see next section).

## Voiceover mastering

Every cloned-VO beat is mastered before it goes into a video. Three steps, in order:

1. **De-click fades** — the clone spits a click at each clip's tail. A 15ms fade-in + 90ms fade-out kills it without changing duration (so composition timing stays locked):

   ```bash
   ffmpeg -i beat.wav -af "afade=t=in:st=0:d=0.015,afade=t=out:st=<dur-0.09>:d=0.09" \
     -ar 48000 -ac 2 -c:a pcm_s16le beat_final.wav
   ```

2. **Whisper-verify the transcript** — the clone occasionally substitutes words (it once said "Catalyst" for "HEADLESS"). Check every beat, CTA keywords especially:

   ```bash
   python -c "from faster_whisper import WhisperModel as M; print(' '.join(s.text for s in M('small').transcribe('beat_final.wav')[0]))"
   ```

3. **Loudness** comes from the `-11` LUFS per-segment loudnorm at mux time (Workflow 1, step 5), not from EQ. The clone stays **raw** — no tonal EQ, no denoise; both were A/B-rejected as muffled or nasal. Quiet audio *reads* as muffled, so the fix is level, not tone. A neural reconstruction pass (VoiceFixer mode 2, local/free) exists as a rescue tool for genuinely bad source audio only — it is not part of the standard clone chain.

## Free generation lanes

Tested lanes for images and short video at no cost. Each renews forever on a daily quota.

**Hugging Face ZeroGPU Spaces (video, via `gradio_client`).** Drive a public Space's API directly. Live-verified: a short clip in ~28s, $0, no watermark. Free quota is ~5 GPU-minutes/day per account (video burns it fast; TTS is cheap). The full, runnable generator:

```python
"""Free B-roll via a Hugging Face ZeroGPU Space (LTX-Video distilled).
Usage: python hf_broll.py "prompt" [--out FILE] [--duration SECS] [--landscape]"""
import argparse, shutil, sys, time
from gradio_client import Client

SPACE = "Lightricks/ltx-video-distilled"
NEGATIVE = "worst quality, inconsistent motion, blurry, jittery, distorted"

def generate(prompt, out, width, height, duration, seed):
    client = Client(SPACE, verbose=False)
    result = client.predict(
        prompt=prompt, negative_prompt=NEGATIVE,
        input_image_filepath=None, input_video_filepath=None,
        height_ui=height, width_ui=width, mode="text-to-video",
        duration_ui=duration, ui_frames_to_use=9,
        seed_ui=seed, randomize_seed=(seed == 0),
        ui_guidance_scale=1, improve_texture_flag=True,
        api_name="/text_to_video")
    video = result[0]["video"] if isinstance(result, (list, tuple)) else result
    shutil.copy(video, out)
    print(f"saved {out} ({width}x{height}, {duration}s)")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("prompt"); p.add_argument("--out", default="broll.mp4")
    p.add_argument("--duration", type=float, default=3)
    p.add_argument("--landscape", action="store_true")
    p.add_argument("--seed", type=int, default=0)
    a = p.parse_args()
    w, h = (1216, 704) if a.landscape else (704, 1216)   # Space rounds to its grid
    try:
        generate(a.prompt, a.out, w, h, a.duration, a.seed)
    except Exception as e:
        sys.exit(f"generation failed: {e}")
```

When a token's daily quota is exhausted, a fresh Hugging Face account/token grants more free quota, or upgrade to HF PRO (~$9/mo, ~8x quota) only if the volume justifies it. Wan2.2 (Apache-2.0, commercial-safe) and FLUX Spaces are also available this way.

**Cloudflare Workers AI (images, FLUX-schnell).** Plain REST, a free daily allotment of ~230 images/day, commercial-clear, no watermark. This is the primary free image lane for carousels and thumbnails:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"prompt":"white marble statue, champagne gold ember particles, pure black background, dramatic chiaroscuro","steps":8}'
# response.result.image is base64 PNG — decode to a file
```

**Verify free-tier terms before shipping commercially.** This is a hard rule, not a formality. Free-for-personal is not always free-for-commercial, quotas and licenses move, and marketing overstates what is actually free. From real testing: one major video platform's "free" tier was a one-time signup credit only, and one large vendor has no free generation tier at all despite the marketing. Confirm the current license on the specific model you use, each time it matters. Building your own always-free generation host does not pencil out — H100 time runs ~$2–4/hr and free hosting only survives on cross-subsidy; ride the subsidized lanes instead.

## Provenance

These workflows were extracted from months of production content runs. The Remotion tip-video pipeline, the faceless `video-pipeline`, and the Remotion patterns ship as skills in `.claude/skills/`. The voice-clone, carousel, and free-lane scripts are reconstructed here from the operator's stack with identity, credentials, brand assets, and client references removed — the logic and commands are unchanged. Chatterbox, LTX-Video, FLUX, Wan2.2, `gradio_client`, `faster-whisper`, `edge-tts`, and ffmpeg are third-party open-source or free-tier tools; verify each tool's current license against your use.

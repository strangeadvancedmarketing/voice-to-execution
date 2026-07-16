---
name: video-pipeline
description: Generate short-form video content (TikTok/Reels/Shorts) from a topic or script. Uses Edge TTS for voiceover, Gemini for image generation, and FFmpeg for assembly. Use when the user asks to create a video, make content, generate a short, or produce social media video.
---

# Video Content Pipeline

Generate faceless short-form videos from a topic or pre-written script.

## Quick Start (from topic)

1. Write a script JSON based on the user's topic:

```json
{
    "title": "Video Title",
    "scenes": [
        {
            "narration": "What the voiceover says for this scene",
            "image_prompt": "Detailed visual description for AI image generation"
        }
    ],
    "voice": "{{VOICE}}",
    "resolution": "1080x1920",
    "style": "cinematic, photorealistic, dramatic lighting, high detail"
}
```

2. Save the script to a temp file and run the pipeline:

```bash
export HF_TOKEN="{{ENV:HF_TOKEN}}" && uv run {{HOME}}/video-pipeline/generate_video.py --script script.json --output {{HOME}}/Videos/output.mp4
```

## Script Writing Guidelines

- **5 scenes** is the sweet spot for 45-60 second shorts
- Each narration should be 1-3 sentences (keep it punchy)
- Image prompts should be highly detailed and visual
- End with a call-to-action scene ("Follow for more...")
- Avoid text in image prompts (captions are auto-generated)

## Voice Options

| Voice | Style |
|-------|-------|
| en-GB-RyanNeural | British male, friendly (default) |
| en-US-AndrewNeural | US male, warm and confident |
| en-US-BrianNeural | US male, casual and approachable |
| en-US-GuyNeural | US male, passionate |
| en-US-JennyNeural | US female, friendly |
| en-US-AriaNeural | US female, confident |

## Resolution Presets

- `1080x1920` — Vertical (TikTok, Reels, Shorts) **default**
- `1920x1080` — Horizontal (YouTube)
- `1080x1080` — Square (Instagram feed)

## Advanced Options

- `--no-captions` — Skip subtitle burn-in
- `--work-dir /path` — Keep temp files in a specific directory
- `--voice VOICE` — Override voice from command line
- `--resolution WxH` — Override resolution from command line

## Requirements

- Edge TTS (installed)
- FFmpeg (installed)
- HF_TOKEN environment variable (set — HuggingFace free tier)
- uv (installed)
- Optional: GEMINI_API_KEY (paid tier for premium image gen)
- Optional: PEXELS_API_KEY (stock photos)

## Workflow

When the user asks to make a video:
1. Ask about the topic if not provided
2. Generate a 5-scene script JSON with engaging narration and vivid image prompts
3. Save the script and run the pipeline
4. Report results and share the output file path

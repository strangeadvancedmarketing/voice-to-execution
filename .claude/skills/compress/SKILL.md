---
name: compress
description: Compress video/audio files for Telegram delivery (50MB limit). Auto-detects file size, compresses with FFmpeg if needed, sends via Telegram. Use when sending media through Telegram or when files exceed 50MB.
risk: low
source: custom
---

# Compress for Telegram

Compress media files to fit within Telegram's 50MB file size limit and optionally send them.

## Steps

1. **Check file size** of the input file:
   ```bash
   stat --format="%s" "$FILE" 2>/dev/null || stat -f%z "$FILE" 2>/dev/null || wc -c < "$FILE"
   ```

2. **If under 50MB (52428800 bytes):** File is ready. Skip compression.

3. **If over 50MB:** Compress with FFmpeg using progressive quality reduction:
   - First attempt: CRF 28, fast preset
     ```bash
     ffmpeg -i "$INPUT" -vcodec libx264 -crf 28 -preset fast -y "$OUTPUT"
     ```
   - If still over 50MB: CRF 32
     ```bash
     ffmpeg -i "$INPUT" -vcodec libx264 -crf 32 -preset fast -y "$OUTPUT"
     ```
   - If still over 50MB: CRF 36 + scale to 720p
     ```bash
     ffmpeg -i "$INPUT" -vcodec libx264 -crf 36 -preset fast -vf "scale=-2:720" -y "$OUTPUT"
     ```

4. **Verify** the compressed file is under 50MB. If all attempts fail, report the issue.

5. **Output file** goes to same directory as input with `_compressed` suffix:
   - Input: `video.mp4` → Output: `video_compressed.mp4`

6. If the user wants it sent via Telegram, send using the Telegram reply tool with the compressed file path.

## Rules
- Never delete the original file
- Always verify output size before declaring success
- Report final file size and compression ratio
- If input is already under 50MB, just say so and skip compression

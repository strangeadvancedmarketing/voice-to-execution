---
name: tip-video
description: Build Claude Code tip videos end-to-end. Remotion composition with SmartZoom + terminal animation, render, assemble with the operator's voiceover + intro + brand outro. Use when the operator says "let's do a tip video" or "make a video about [Claude feature]".
risk: low
source: custom
---

# Tip Video Pipeline

Build short-form (20-40s) Claude Code tip videos from concept to final assembly. These are 9:16 portrait videos showing a terminal demo with SmartZoom choreography, stitched with the operator's camera intro and brand outro.

## 🔒 CONTENT PLAYBOOK — ENFORCE EVERY TIME
Whenever this skill runs, hold to the playbook below (derived from a real TikTok audit — full detail lives in your content-playbook reference). **If a plan strays from it — when the operator asks "what should I make" OR while building — call it out.**
1. **Formula unchanged** — Claude Code tip video: on-cam hook → SmartZoom terminal → cloned VO, 22–26s. Don't drift.
2. **Post ~5–6pm** local time, consistently (peak active window).
3. **CTA on EVERY video** — "comment [WORD] and I'll send you the [thing]" (proven in-lane). Non-negotiable.
4. **Mine saves** — save-able content (command cheat-sheets) + a "save this for later" line. Saves are the #1 edge (7.9K saves >> 87 shares).
5. **TikTok SEO captions** — answer a specific searched question + name the exact feature.
6. **Engagement >6.3%** — sharp first-2-sec hook, comment-bait question, reply fast.
7. **100% on-format feed** (off-format posts stay private — algorithm clarity).
8. **Peer shares** (e.g. a peer creator) — shares, not just likes.
9. **Test FR/ES captions** occasionally (international search pull).
Also: explainer format for Top-N tool vids (name→what it does→real `claude mcp add` cmd; mask secrets), max 5 hashtags, per-segment loudnorm to -11 so VO isn't quiet.

## ⭐ HYBRID FORMAT — DEFAULT (proven & approved)

The winning structure interweaves a **moving, teaching terminal** with **AI concept b-roll**, narrated in the operator's **cloned voice**. Full reference: your hybrid-format reference.

**Sequence:** intro clone → PAIN b-roll → terminal STEP 1 (SmartZoom) → CONCEPT b-roll → terminal STEP(s) + payoff badge → brand outro.

**Three non-negotiables (v1 was rejected for breaking all three):**
1. The terminal MUST move with the VO — SmartZoom in on each command (fill 9:16), zoom out, next command. A static terminal frame = instant reject.
2. It must actually TEACH the how-to (show the real settings.json / commands), not just announce a feature.
3. B-roll is woven BETWEEN the teaching steps to tell the concept story — never just front-loaded.

**Asset stack (all free):**
- **VO:** cloned voice via `{{HOME}}\sam_voice\clone_vo.py` — generate PER BEAT (Chatterbox truncates ~16s/~40 words per call); per-beat also gives exact durations to time the SmartZoom. The operator no longer records VOs.
- **B-roll:** Google Veo (operator generates, HD, 3 free 8s gens). Remove the ✦ Veo/Gemini watermark (bottom-right) with ffmpeg `delogo=x=575:y=1135:w=110:h=110` before scaling.
- **Terminal:** Remotion SmartZoom comps (see Phases 2-4). Reference: `BootContextTip.tsx`.
- **HF ZeroGPU free = 5 min/day** (AI video burns it fast; TTS is cheap). Tapped out → fresh HF account/token for more free quota, or just use Veo for video. PRO $9/mo (8x) only if needed.

## Trigger

The operator says something like "let's do a tip video about X" or sends a voice note describing a Claude Code feature to demo.

## End-to-End Flow

### Phase 1: Concept & Script

1. Identify the Claude Code feature being demoed
2. Plan the terminal commands that show it off (3-5 commands max)
3. Structure as: **Setup/Context** (what's intimidating or hard) → **Demo** (Claude makes it easy) → **Payoff** (success badge)
4. Plan what the operator's voiceover will narrate — the terminal visuals must align with the VO timing

### Phase 2: Build the Remotion Composition

Create a new `.tsx` file in `{{HOME}}\sam_video_pipeline\desktop-template\src\`.

#### File Structure Template

```tsx
import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
} from "remotion";
import { MacOSWindow } from "./MacOSWindow";
import { ClaudeCodeTerminal, TerminalEvent } from "./ClaudeCodeTerminal";
import { SmartZoomV2, FocusKeyframe } from "./SmartZoomV2";

const BG_COLOR = "#0F172A";

// Optional: mockup component for the "before" state (e.g., GitHub UI, config file, etc.)

const terminalEvents: TerminalEvent[] = [
  // Structure: setup commands first, then power demo commands
  // See "Terminal Events" section below
];

const zoomKeyframes: ZoomKeyframe[] = [
  // See "SmartZoom Choreography" section below
];

export const MyTip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Optional: "before" mockup opacity (fades out before terminal appears)
  const mockupOpacity = interpolate(frame, [0, 12, 65, 80], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const termOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Badge appears near the end
  const badgeFrame = /* last zoom-out frame */ 0;
  const badgeOpacity = interpolate(frame, [badgeFrame, badgeFrame + 15], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const badgeScale = interpolate(frame, [badgeFrame, badgeFrame + 25], [0.8, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      <SmartZoom keyframes={zoomKeyframes}>
        <AbsoluteFill style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {/* Optional "before" mockup */}
          {mockupOpacity > 0.01 && (
            <div style={{ position: "absolute", opacity: mockupOpacity }}>
              {/* <BeforeMockup /> */}
            </div>
          )}
          {termOpacity > 0.01 && (
            <div style={{ position: "absolute", opacity: termOpacity }}>
              <MacOSWindow title="Claude Code" width={960} height={800} darkMode>
                <ClaudeCodeTerminal events={terminalEvents} />
              </MacOSWindow>
            </div>
          )}
        </AbsoluteFill>
      </SmartZoom>

      {/* Success/CTA badge — OUTSIDE SmartZoom so it doesn't get zoomed.
          🔒 STANDING RULE: the badge POPS + SLOWLY GROWS in the
          CENTER of the screen — justifyContent AND alignItems BOTH "center". NEVER at
          the bottom (no flex-end / paddingBottom). Grow via scale 0.55 → 1.08 → 1 over
          ~26 frames. Optional "🔖 SAVE THIS ONE" pill grows in below it a beat later.
          Reference impl: RealDayPart4Tip.tsx badge block. */}
      {badgeOpacity > 0.01 && (
        <AbsoluteFill style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            opacity: badgeOpacity, transform: `scale(${badgeScale})`,
            backgroundColor: "rgba(34, 197, 94, 0.95)",
            padding: "18px 44px", borderRadius: 16,
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 8px 32px rgba(34, 197, 94, 0.3)",
          }}>
            <span style={{ fontSize: 30, color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
              {"✓"}
            </span>
            <span style={{
              fontSize: 24, color: "white", fontWeight: 700,
              fontFamily: "'Segoe UI', -apple-system, sans-serif",
            }}>
              {/* Badge text — e.g., "GitHub Managed by Claude" */}
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
```

#### Terminal Events Reference

```typescript
interface TerminalEvent {
  frame: number;
  type: "prompt" | "type" | "enter" | "output" | "header" | "dim" | "blank";
  text?: string;
  speed?: number;   // chars per frame, default 0.5. Use 0.6 for normal typing.
  color?: string;   // hex color for output/header lines
}
```

**Event flow for each command:**
1. `{ frame: N, type: "prompt" }` — shows `> ` with blinking cursor
2. `{ frame: N+10, type: "type", text: "command here", speed: 0.6 }` — typing animation
3. `{ frame: N+40, type: "enter" }` — commits the typed line (adds to history)
4. `{ frame: N+50, type: "output"|"dim", text: "  result line" }` — output appears
5. `{ frame: N+65, type: "blank" }` — empty line separator

**Timing guidelines:**
- Leave ~10 frames between prompt and type start
- Type speed 0.6 = ~25 chars takes 42 frames (1.4s at 30fps)
- Leave ~10-15 frames after enter before first output
- Space output lines 12-15 frames apart
- Leave ~15-20 frames of blank before next command

**Colors:**
- Success: `"#56B682"` (green checkmarks)
- Default output: no color (inherits terminal white)
- Dim/info: no color on dim type (inherits gray)

**CRITICAL: No Math.random() in Remotion.** Every render must be deterministic. Use hardcoded strings for all data, never generate random values.

#### SmartZoom Choreography — AUTO-GENERATE IT (default)

**Don't hand-write zoom keyframes for terminal scenes.** Use the choreographer — it generates the full Context→Snap→Dwell→Release camera from the event list:

```tsx
import { choreographTerminal } from "./Choreographer";

const autoZoom = choreographTerminal(termEvents, {
  windowHeight: 600,   // MacOSWindow height prop
  marginTop: 90,       // the comp's marginTop on the centered window div
  fontSize: 13,        // ClaudeCodeTerminal fontSize
  scale: 2.4,
  releaseFrame: 330,   // when to zoom back out wide
});
// <SmartZoomV2 keyframes={autoZoom}>...
```

It computes every line's canvas Y from real render geometry (38px title bar, 12px padding, lh = round(fontSize*1.5); marginTop on a flex-centered absolute div shifts HALF the margin — already handled). Snaps to each `type` event, pans to each block's last output, releases at `releaseFrame`. Verified centered against renders (AutoChoreoTest comp). Still render ONE verification frame — if framing is uniformly off, use `calibration`. Hand-written FocusKeyframes remain available for non-terminal scenes (phone payoffs, mockups).

#### Manual keyframes — SmartZoomV2 (focus-point API)

**Use `SmartZoomV2` + `FocusKeyframe` from `./SmartZoomV2` for all NEW videos.** Instead of hand-tuned translate offsets, you give the UNSCALED canvas coordinates of the point you want centered — no offset math, no magic numbers. Proven pixel-identical to V1 (CtaSetupWallTip equivalence render). Old comps using V1 `SmartZoom` keep rendering identically — don't migrate them.

**Spring config:** stiffness 140, damping 16, mass 0.8 (same in both versions — the motion feel is unchanged)

**Zoom pattern for each command (Context → Snap → Dwell → Release):**

```typescript
// 1. CONTEXT: Full view (canvas center = no pan)
{ frame: F, scale: 1.0, focusX: 540, focusY: 960 },

// 2. SNAP: Zoom into the typing line — focus = where that line IS on the canvas
{ frame: F+10, scale: 2.5, focusX: 260, focusY: Y_OF_TYPING_LINE },

// 3. DWELL: Stay zoomed, pan down as output appears
{ frame: F+80, scale: 2.5, focusX: 260, focusY: Y_OF_LAST_OUTPUT },

// 4. RELEASE: Zoom back out
{ frame: F+100, scale: 1.0, focusX: 540, focusY: 960 },
```

**How to pick focus values:** focusX/focusY are just the pixel coordinates (in the normal 1080x1920 frame at scale 1) of what you want centered. For a 960-wide centered terminal, **focusX=260** keeps the left "> " prompt column in view with margin (equivalent to the old x=280 lore). For focusY, estimate where the active line sits: a 600px-tall window centered with marginTop 90 spans y≈750–1350, so the first command is ~810 and each line adds ~20px (fontSize 13). Render a still to confirm — no more Y-table guessing.

**V1→V2 conversion** (for porting old keyframes): `focusX = 540 - x`, `focusY = 960 - y`.

**Legacy V1 reference (only for editing OLD comps):** transform is `scale(S) translate(x,y)`; x=280 at scale 2.5 shows the prompt column; positive Y shows upper content, negative Y lower (Y=180 first command → Y=-320 terminal bottom).

**CRITICAL: The badge div is OUTSIDE the SmartZoom wrapper** so it doesn't get affected by zoom transforms.

### Phase 3: Register the Composition

Add to `{{HOME}}\sam_video_pipeline\desktop-template\src\Root.tsx`:

```tsx
import { MyTip } from "./MyTip";

// Inside RemotionRoot:
<Composition
  id="MyTip"
  component={MyTip}
  durationInFrames={630}  // adjust to fit content
  fps={30}
  width={1080}
  height={1920}
/>
```

### Phase 4: Render & Verify

**ALWAYS render verification frames before full render:**

```bash
# Pick 3-4 key moments (zoomed typing, zoomed output, final badge)
npx remotion still src/index.tsx MyTip out/verify_f200.png --frame=200
npx remotion still src/index.tsx MyTip out/verify_f400.png --frame=400
npx remotion still src/index.tsx MyTip out/verify_f600.png --frame=600
```

Check each frame visually with the Read tool. Verify:
- Terminal text is visible and not cut off at edges
- Zoom positions show the right content centered
- Badge appears correctly at the end
- No black bars or misaligned elements

**Full render:**
```bash
npx remotion render src/index.tsx MyTip out/mytip_body.mp4 --codec h264
```

Send the body-only render to the operator via {{PRIMARY_CHANNEL}} for review. Iterate on zoom positions and timing until approved.

### Phase 5: Voiceover — cloned voice (DEFAULT) or operator's recording

**Default (hybrid format): generate the VO in the operator's cloned voice — they don't record.**
Write the script, split into BEATS (Chatterbox caps ~16s/~40 words per call — longer text silently truncates), generate each beat, verify with whisper, then convert to 48kHz stereo:

```bash
# per beat (locked settings baked into clone_vo.py)
python {{HOME}}\sam_voice\clone_vo.py "beat text here" out_beat.mp3
```
Per-beat durations tell you exactly how long each terminal SmartZoom / b-roll segment should run.

**⚡ MANDATORY VO POST (settled after a full A/B day):**
Generate with the **LOCAL clone** (`sam_voice\cbx_env\Scripts\python.exe sam_voice\clone_vo_local.py "text" out.wav`) and keep it **RAW** — no VoiceFixer, no EQ ("just do the normal one"). Two steps are still required on every beat:
```bash
# 1. De-click fades (clone spits clicks at clip tails; keeps duration EXACTLY the same):
ffmpeg -i beat1.wav -af "afade=t=in:st=0:d=0.015,afade=t=out:st=<dur-0.09>:d=0.09" -ar 48000 -ac 2 -c:a pcm_s16le beat1_final.wav
```
2. **Whisper-VERIFY every beat's transcript** — the clone substitutes words (said "Catalyst" instead of "HEADLESS" once). CTA keywords especially.
Loudness comes from the -11 loudnorm at mux (perceived "muffle" = quiet, not tone). VoiceFixer mode 2 exists in the toolbox for rescuing BAD source audio only (see the VO mastering reference — reversed for standard use).
**Top headline text is MANDATORY** — every tip video has the phase-based TopText (label + 52pt head) at top, padding 100px/70px (BizStackTip pattern). Flagged once when missing: "we need to be consistent."

**Alternative:** if the operator records a voice note, use it directly (download via the messaging channel, convert to 48kHz stereo WAV the same way).

### Phase 6: Assembly

**CRITICAL FORMAT MATCHING — this causes stutter/missing audio if wrong:**
All segments MUST be normalized to identical format before concat:
- Resolution: 1080x1920
- Frame rate: 30fps
- Audio: 48000Hz, stereo, AAC 192k

#### Available Assets

| Asset | Path | Notes |
|-------|------|-------|
| Intro (MacBook cam) | `sam_video_pipeline/brand_assets/intros/intro_macbook_dynamic_cam_watermark_free.mp4` | 2160x3840, needs scale to 1080x1920 + resample to 48kHz |
| Brand Outro | `sam_video_pipeline/assets/outro.mp4` | 1080x1920, 48kHz stereo, ~3s |

#### Step-by-step Assembly

```bash
# 1. Normalize intro (scale + resample)
ffmpeg -i "brand_assets/intros/intro_macbook_dynamic_cam_watermark_free.mp4" \
  -vf "scale=1080:1920:flags=lanczos" \
  -c:v libx264 -crf 18 -preset fast -r 30 \
  -ar 48000 -ac 2 -c:a aac -b:a 192k \
  -y intro_norm.mp4

# 2. Convert VO to 48kHz stereo WAV
ffmpeg -i vo.oga -ar 48000 -ac 2 -c:a pcm_s16le -y vo.wav

# 3. Normalize outro
ffmpeg -i "assets/outro.mp4" \
  -c:v libx264 -crf 18 -preset fast -r 30 \
  -ar 48000 -ac 2 -c:a aac -b:a 192k \
  -y outro_norm.mp4

# 4. Combine body video + VO audio
#    Use tpad to extend body if VO is longer (freeze last frame)
#    ⚡ QUIET-VO FIX (LOCKED): cloned VO ALWAYS comes out quiet. Boost it to -11 LUFS HERE
#    (per-segment), so by final concat it already matches the louder intro/outro. This is the
#    fix repeatedly flagged — bake it in, don't do it after the fact.
ffmpeg -i body.mp4 -i vo.wav \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=3[v];[1:a]aresample=48000,loudnorm=I=-11:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -crf 18 -preset fast -r 30 \
  -c:a aac -b:a 192k -shortest \
  -y body_with_vo.mp4

# 5. Final concat with volume normalization
ffmpeg -i intro_norm.mp4 -i body_with_vo.mp4 -i outro_norm.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[vout][aout];[aout]loudnorm=I=-16:TP=-1.5:LRA=11[anorm]" \
  -map "[vout]" -map "[anorm]" \
  -c:v libx264 -crf 18 -preset fast -r 30 \
  -c:a aac -b:a 192k \
  -y output/tipname_final.mp4
```

#### Volume Normalization — TWO-STAGE (LOCKED)

The cloned VO ALWAYS renders quiet. Two-stage fix (do BOTH — this is the recurring complaint):
1. **Per-segment VO boost (Step 4):** loudnorm the VO to **`I=-11:TP=-1.5:LRA=11`** when muxing it onto the body. This lifts the quiet VO up to match the intro/outro BEFORE concat.
2. **Final concat normalize (Step 5):** `loudnorm=I=-16:TP=-1.5:LRA=11` on the concatenated track to even everything out.

Without stage 1, the VO is quiet relative to the intro + the brand outro — exactly what keeps getting flagged. Never ship without the -11 VO boost.

### Phase 7: Delivery

1. Check file size (`< 50MB` for the messaging channel)
2. Send final via {{PRIMARY_CHANNEL}} with text summary + voice note
3. Save to `sam_video_pipeline/output/`

## Proven Videos Built With This Pipeline

| Video | Composition ID | Frames | Key Feature |
|-------|---------------|--------|-------------|
| GitHub Tip | GitHubTip | 630 | GitHub repo mockup → install gh → auth → repo list → issues |
| Postiz Tip | PostizTipDemo | 500 | Dashboard mockup → API scheduling commands |
| Claude Buddy | ClaudeBuddyDemo | 480 | Clone repo → configure → deploy |
| Context Compact | ContextCompactDemo | 412 | Conversation compaction demo |

## Common Mistakes & Fixes

| Mistake | Fix |
|---------|-----|
| x=240 at scale 2.5 cuts off left prompt | Use x=280 — gives proper left margin for "> " markers |
| Math.random() in mockup data | Hardcode all values — Remotion re-renders each frame independently |
| Audio stutter in final assembly | Normalize ALL sources to 1080x1920, 48kHz stereo BEFORE concat |
| Terminal text clusters at top of zoomed view | Increase Y values to push viewport down toward content |
| Badge gets zoomed with terminal | Badge div must be OUTSIDE the SmartZoom wrapper |
| Badge placed at the bottom of the screen | 🔒 BANNED. Badge pops + grows in the CENTER (justifyContent + alignItems both "center", scale 0.55→1.08→1). Copy RealDayPart4Tip.tsx. |
| Video feels flat / "bland" / not "Anthropic" | Default to the Part-4 / Courses visual language: cream BG (#F0EEE6), serif Georgia heads + terra (#C15F3C) label, REAL captures shown large w/ shadow, snappy punch-in (scale 2–2.6) → pull-back focal zooms, crossfades between captures, MouseCursor clicks. A dark-terminal-only comp reads flat — weave real screenshots/phone captures with punchy focal movement. |
| VO shorter/longer than body | Use tpad=stop_mode=clone to extend body, or -shortest flag |
| Intro has different sample rate (44.1kHz) | Always resample intro to 48kHz in normalize step |
| Gemini/watermark on AI-generated intro | Use delogo filter: `delogo=x=X:y=Y:w=W:h=H:show=0` — test on single frame first. delogo works on a logo over a UNIFORM background. |
| HeyGen free-tier watermark on a LIPSYNC intro (bottom-right "HeyGen" logo) | DON'T blur or delogo — it's a BRIGHT logo over a mixed dark/bright corner, so blur just smears the brightness and delogo streaks. Instead ZOOM + CROP it off-frame: `scale=836:1485:flags=lanczos,crop=720:1280:58:0` on a 720x1280 source (1.16x zoom, top-center anchor) pushes the bottom-right watermark fully off-frame. Verify the bottom-right region is clean on a frame, then normalize to 1080x1920. The blur version was flagged as "highly visible" — crop is the locked fix. |
| HeyGen lipsync for a face intro when Gemini/Flow refuses or is out of credits | Gemini web blocks real-person talking video (anti-impersonation). Use HeyGen create_lipsync: host the source video + cloned-VO mp3 at public HTTPS URLs (temp public GitHub repo → raw URLs, delete/empty after), call create_lipsync(mode='precision'), poll get_lipsync, download video_url. Then crop the watermark (row above). Requires HeyGen MCP auth (OAuth — run /mcp → authenticate if token expired). |

## Rules

- NEVER send a body-only render as the final video — always assemble with intro + VO + outro
- VO = the operator's CLONED voice (clone_vo.py, per-beat) by default — that IS their voice, they no longer record. Generic robotic TTS is still banned. Their own recorded voice note is also fine.
- The terminal MUST move (SmartZoom) and TEACH — never ship a static terminal frame (v1 reject)
- Weave b-roll BETWEEN teaching steps, not just at the front
- ALWAYS render 3-4 verification frames before full render
- ALWAYS normalize audio formats before concat (the #1 source of bugs)
- ALWAYS use loudnorm on final assembly
- Iterate with the operator on body positioning before assembling the final
- The body video is the Remotion composition. The operator's VO replaces its audio track.
- 🔒 CTA/success badge ALWAYS pops + slowly grows in the CENTER of the screen — never at the bottom. Copy RealDayPart4Tip.tsx badge block.
- 🔒 DEFAULT visual language = the Part-4/Courses "Anthropic" look: cream BG (#F0EEE6), serif Georgia head + terra (#C15F3C) label TopText, REAL captures shown large with shadow, snappy punch-in (scale ~2–2.6) → pull-back focal zooms, crossfades, MouseCursor clicks. Templates: RealDayPart4Tip.tsx + AnthropicCoursesTip.tsx. A dark-terminal-only comp reads "flat/bland" (rejected). Ties to the "only teach what we use" continuity — the operator = Claude, Anthropic = parent look/feel.
- 🔒 First 2–3 sec MUST hook visually — never open on a static/zoomed-out unreadable terminal over VO. For "generic chatbot" beats, weave quick real phone-capture b-roll (ChatGPT / Gemini / Claude app searches).
- VO clone rising-tail: statement lines (esp. "save this one") must NOT end like a question — regenerate + listen-verify; on-screen "🔖 SAVE THIS" pill carries the emphasis.

---
name: linkedin-post
description: Post a video (or text) to the operator's LinkedIn with a hyper-optimized caption. Use whenever the operator says they uploaded a video to Google Drive and want it posted to LinkedIn (e.g. "I uploaded the X vid to drive, post it to LinkedIn"). Handles Drive fetch → caption → native video post → report.
---

# LinkedIn Post Skill

One-shot pipeline: the operator drops a video in Drive (a dedicated upload folder, id `{{ENV:DRIVE_VIDEO_FOLDER_ID}}`, account `{{ENV:GOOGLE_ACCOUNT}}`) and gives the name (or close to it). This posts it natively to their LinkedIn with an optimized caption, seamlessly.

All creds live in `{{HOME}}\sam_linkedin\.env` (gitignored — NEVER echo token values or commit them). Set `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_CLIENT_ID`, and the Google Drive account/folder id there.

## Steps

1. **Get the name** from the operator (may be approximate, e.g. "top API vid").

2. **Find it in Drive** — use the `search` command (the `ls --query "name contains"` form is FLAKY on fresh uploads; `search` works):
   ```
   {{GOOGLE_CLI}} drive search "<name>" -p --max 8
   ```
   Pick the file whose name best matches AND is most recent (today). Grab its file ID. (Videos usually sit in root or the dedicated upload folder.)

3. **Download** it to the working dir:
   ```
   {{GOOGLE_CLI}} drive download <fileId> --out {{HOME}}/sam_linkedin/li_video.mp4
   ```

4. **Craft a hyper-optimized LinkedIn caption** in the operator's voice → save to `{{HOME}}/sam_linkedin/caption.txt`. Formula that works (proven on the MCP + API posts):
   - **Hook line** that stops the scroll — usually a contrarian/identity statement ("Most people use Claude as a chatbot. I use it to run my business.").
   - **The value**: the 3 items / the how, as `→` bullets, concrete and specific.
   - **One punchy insight** ("not a chatbot, an operator").
   - **An engagement question** ("which MCPs are in your stack?").
   - **MAX 5 hashtags** (LinkedIn auto-strips past 5). CamelCase, mix niche + broad. Defaults: `#ClaudeAI #AIAgents #Automation` + 1-2 topic-specific (e.g. `#MCP`, `#Shopify`, `#BuildInPublic`).
   - Match the video's ACTUAL topic. Professional but real — a builder voice, not corporate.

5. **Post it** (native video):
   ```
   python {{HOME}}/sam_linkedin/post_video.py {{HOME}}/sam_linkedin/li_video.mp4 {{HOME}}/sam_linkedin/caption.txt
   ```
   - On success it prints `POSTED ok ... ugcPost=urn:li:ugcPost:NNN` + a view link.
   - If it returns **401 / expired token**: run `python {{HOME}}/sam_linkedin/refresh.py` once, then retry the post. If refresh fails, regenerate the token via the dev portal OAuth tool (`https://www.linkedin.com/developers/tools/oauth/token-generator?clientId={{ENV:LINKEDIN_CLIENT_ID}}` → scopes openid+profile+w_member_social → paste token into `.env` `LINKEDIN_ACCESS_TOKEN`).
   - Text-only post (no video): `python post.py "text"`.

6. **Report to the operator** via {{PRIMARY_CHANNEL}} (text + voice, per global comms rule): the live link + the exact caption used + "it's your post — edit/delete on LinkedIn anytime."

## Defaults / rules
- **Post seamlessly** (don't pre-ask) — that's the default the operator wants. But ALWAYS surface the caption + link AFTER so they can tweak/delete. If they say "show me the caption first," draft it and confirm before posting.
- Never print/commit token values. The `.env` is gitignored.
- 9:16 tip videos are quicktime/mp4 ~10-12MB; LinkedIn processes them in a few seconds (the script polls until AVAILABLE).

---
name: sam-lead-pipeline
description: End-to-end contractor lead pipeline — find IG targets, enrich from Google Maps, grab logos, generate sites, push to sheet, create short links, deploy to GitHub Pages
user_invocable: true
---

# Contractor Lead Pipeline

> NOTE: needs Chrome running with `--remote-debugging-port=9222`.

Complete pipeline for finding and processing local contractor leads for {{PRIMARY_BUSINESS}} outreach.

## Prerequisites
- Chrome running with `--remote-debugging-port=9222` (use a `launch_chrome_debug.bat` helper)
- Chrome logged into Instagram on one tab
- {{GOOGLE_CLI}} authenticated for Google Sheets

## Pipeline Steps

### Step 1: Find IG Targets (`find_ig_targets.py`)
Searches Google via CDP for "site:instagram.com" queries across 30+ contractor categories. Two-phase approach:
- **Phase 1**: Stay on Google, collect IG handles from search results
- **Phase 2**: Visit each IG profile, filter out those WITH websites (we only want no-website contractors)

**Key details:**
- Uses `websockets` library to connect to Chrome debug at `localhost:9222`
- `get_ws_url()` must accept `chrome://newtab/` tabs
- Two separate `async with websockets.connect()` blocks (one per phase) to avoid cross-domain websocket crashes
- Skips handles already in the existing targets JSON files
- Output: `new_targets_batch2.json` (or whatever batch file)

**Run:** `python find_ig_targets.py [count]` (default 50)

### Step 2: Enrich from Google Maps (`enrich_from_gmaps.py`)
Searches Google Maps via CDP for each target to pull business data:
- Phone number
- Star rating
- Review count
- Proper business name (replaces garbage IG-derived names)

**Key details:**
- Searches Maps using cleaned business name + category + location
- Clicks first result to get detail page if initial page doesn't have data
- Cleans up names: removes "Followed by..." prefixes, converts handle-style names to title case
- Some targets may get duplicate phone numbers from nearby businesses — verify manually for high-value leads

**Run:** `python enrich_from_gmaps.py`

### Step 3: Scrape IG Logos (`scrape_ig_logos.py`)
Visits each IG profile to download their profile picture as `logo.png`:
- Saves to site directory based on slugified business name
- Also extracts display name and phone from bio as backup
- Profile pics are ~150x150 to 320x320 from IG CDN

**Run:** `python scrape_ig_logos.py`

### Step 4: Clean Up Names
After enrichment, fix remaining garbage names:
- Replace "Followed by..." with handle-derived names
- Replace "Results" (from Maps search page title) with handle-derived names
- Convert underscore/dot-separated handles to title case
- Remove special characters, pipe symbols, hashtags from names
- Fix malformed phone numbers

**Category validation (MANDATORY):** Google Maps enrichment often assigns WRONG categories. After enrichment, run a keyword check:
- If name contains "pressure/wash/clean/soft wash" → category must be "Pressure Washing"
- If name contains "fence" → "Fence Contractor"
- If name contains "floor" → "Flooring"
- If name contains "roof" → "Roofing"
- If name contains "paint" (and NOT pressure/wash) → "Painting"
- If name contains "pool" → "Pool Service"
- If name contains "plumb" → "Plumbing"
- If name contains "electric" → "Electrical"
- If name contains "landscape/lawn" → "Landscaping" or "Lawn Care"
- If name contains "concrete/paver" → "Concrete Contractor" or "Paver Installation"
- Business name keywords OVERRIDE the Maps-assigned category. Print any corrections for review.

### Step 5: Generate Sites (`generate_v2.py`)
Generates static HTML sites for each target:
- Category-specific hero images from Unsplash (with rotation)
- Category-specific color schemes
- Real phone number in CTA buttons
- Star rating + review count display
- Logo from IG profile pic
- SEO schema markup, Google Maps embed, favicon
- og:image meta tag for link preview in DMs

**Key details:**
- Uses `HERO_IMAGES` dict with lists per category for rotation
- Uses `SCHEMES` dict for color palettes per category
- Falls back to Handyman defaults for unknown categories
- Checks for `logo.png` in site directory
- Phone-first CTA with IG DM fallback

**Run:** Import `generate_site()` and `slugify()` from `generate_v2.py`, loop over targets JSON

### Step 6: Push to Google Sheet
Add targets to the CRM sheet using {{GOOGLE_CLI}}:
- Sheet ID: `{{ENV:CRM_SHEET_ID}}`
- Columns: A=Business Name, B=Category, C=Location, D=Phone, E=IG Handle, F=Rating, G=Reviews, H=Site Link, I=Site Status, J=DM Status, K=DM Date
- Start after existing rows (check current row count first)
- Set Site Status to "Generated", DM Status to "Not Sent"

**Run:** `{{GOOGLE_CLI}} sheets update SHEET_ID "Sheet1!{cell}" "{value}"`

### Step 7: Deploy to GitHub Pages
Commit all new site directories + logos and push:
- Repo: `{{ENV:GH_PAGES_REPO}}` (e.g. `your-org/contractor-sites`)
- Branch: `master`
- IMPORTANT: Never commit API tokens or secrets — use env vars
- GitHub Pages auto-deploys from master

**Run:** `git add -A && git commit -m "..." && git push origin master`

### Step 8: Create Short Links
Create tinyurl custom aliases for each site:
- Format: `https://tinyurl.com/{short-alias}`
- Base URL: `https://{{ENV:GH_PAGES_HOST}}/{slug}/`
- Save to `short_links.json` and update Sheet column H

### Step 8.5: Re-verify No Website (MANDATORY before DMs)
Before sending DMs, re-check each target's IG profile for website links:
- Visit profile via CDP, check for external link in bio
- If they now have a website, mark as "has_site" and SKIP the DM
- Linktree, booking links, and business URLs all count as "has a web presence"
- This catches targets who added websites after initial discovery
- Update Sheet accordingly (mark skipped targets as "Has Website - Skipped")

### Step 9: Follow + DM (`send_dms.py`)
Send outreach DMs via CDP:
- Follow the target first if not already following
- Rotate through 5 DM script templates
- Include personalized short link
- Update Sheet columns J (DM Status) and K (DM Date)
- 20-35 second random delay between DMs to avoid rate limiting

## Data Flow

```
Google Search (CDP) → IG handles
     ↓
IG Profile Check (CDP) → filter no-website only
     ↓
Google Maps (CDP) → phone, rating, reviews, name
     ↓
IG Profile (CDP) → logo.png (profile pic)
     ↓
generate_v2.py → static HTML sites
     ↓
git push → GitHub Pages (live)
     ↓
tinyurl → short links
     ↓
send_dms.py → follow + DM via CDP
     ↓
{{GOOGLE_CLI}} → Google Sheet tracking
```

## File Locations
- **Scripts:** `{{HOME}}\contractor_sites\`
- **Target data:** `master_targets.json` (batch 1), `new_targets_batch2.json` (batch 2)
- **Sites:** Each in `{slug}/index.html` + `{slug}/logo.png`
- **Short links:** `short_links.json`
- **Sheet:** Google Sheets ID `{{ENV:CRM_SHEET_ID}}`

## Categories Covered (30+)
Plumbing, Electrical, Painting, Handyman, Landscaping, Pool Service, Roofing, Pressure Washing, Fence Contractor, Flooring, HVAC, Drywall, Concrete, Garage Door, Gutter Cleaning, Window Cleaning, Cabinetry, Bathroom Remodel, Paver Installation, Appliance Repair, Deck Building, Kitchen Remodel, Stucco, Carpet Cleaning, Mold Removal, Locksmith, Screen Enclosure, Epoxy Flooring, Tree Service, Lawn Care, Moving Service, Junk Removal, Tile Contractor

## Critical Notes
- **CDP is the ONLY approach** that bypasses bot detection on Google and Instagram. Headless Playwright gets blocked.
- **Two-phase websocket approach** — never alternate between Google and IG domains in the same websocket connection. It crashes.
- **`get_ws_url()` must accept `chrome://newtab/`** — Chrome debug often opens to that page.
- **Original targets came from Google Maps** — that's why they had rich data (phone, rating, reviews). IG search only gives handles.
- **The enrichment step is mandatory** — IG-only data is incomplete (no phone, no rating, garbage names).
- **Push to GitHub Pages after every batch** — sites are only live after git push.
- **Instagram caches link previews** — old DM links may show stale og:image until IG refreshes cache.

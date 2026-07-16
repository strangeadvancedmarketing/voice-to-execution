# Lead generation — local sourcing, audit, and outreach

A toolset for finding local-business leads, auditing their digital presence, and running outreach — all from your own machine. Point the agent at a niche and a city; it sources businesses, scores them, builds the pitch asset, tracks them, and drafts the outreach. The human approves and the finished work goes out.

> **Local by design.** These eleven tools were originally built as hosted scrapers that ran on a third-party actor platform. They have been converted to run **entirely locally** — plain Python scripts on your own machine, driven by a local input file and writing to a local output file. There is **no platform account, no per-run billing, and no cloud dependency**. This document is the local form. It does not cover the hosted build or deploy, because that is not how the framework runs them.

## What's in the toolset

Each tool is a single Python script (`src/main.py`) that reads a JSON input, does one job, and writes structured records to a local file. All eleven share the same run model (below).

| Tool | What it does | Input | Needs a browser? |
|------|--------------|-------|------------------|
| **google-maps-scraper** | Scrapes Google Maps for businesses matching a query; enriches each with website emails, social handles, and a hot/warm/cold lead score | `searchQuery`, `maxResults` | Yes (Chromium) |
| **maps-competitor** | Finds one target business on Maps, pulls its category, then gathers same-category competitors and ranks everyone on rating, reviews, and digital presence | `businessName`, `location` | Yes |
| **business-audit** | Full single-business digital audit: Maps profile, website health, top-3 competitors, keyword rankings, review sentiment, and a prioritized recommendation list with an overall score | `businessName`, `location`, `websiteUrl` | Yes |
| **website-analyzer** | Standalone website health check — SSL, mobile viewport, title/meta, emails, contact form, social links, analytics/pixel, schema, H1s, alt-text, load time — scored A–F | `urls` (list) | Yes |
| **local-seo-checker** | Where a business ranks in Google organic results and the Maps local pack for a set of keywords, with per-keyword and summary status | `businessName`, `keywords`, `location` | Yes |
| **reviews-analyzer** | Scrapes Google reviews for one or more businesses and runs sentiment + theme analysis (neural model with a keyword fallback), surfacing red-flag reviews | `searchQuery`, `maxReviewsPerBusiness` | Yes |
| **instagram-scraper** | Reads public Instagram profiles over HTTP; extracts bio, follower count, and whether the account has an external website link (the core "no-website" lead filter) | `usernames` (list) | No (HTTP) |
| **tiktok-scraper** | Reads public TikTok profiles: display name, followers, likes, bio, external link, and recent video URLs | `usernames` (list) | Yes |
| **youtube-analyzer** | Scrapes a YouTube channel's videos and computes content strategy metrics — average views, top/bottom performers, title keyword patterns, shorts-vs-long performance | `channelUrls` (list) | Yes |
| **reddit-leads** | Searches Reddit's public JSON API for buying-intent posts, classifies intent (high/medium/low), extracts location, and pulls top comments on hot threads | `searchQueries` (list) | No (HTTP) |
| **email-verifier** | Finds and verifies business emails for a domain: MX lookup, provider detection, website scrape, pattern generation, and SMTP RCPT verification | `domains` (list) | No (DNS/SMTP) |

Two of these need no browser at all (`reddit-leads`, `email-verifier`); `instagram-scraper` uses plain HTTP. The rest drive a headless Chromium via Playwright.

## The local-run model

The tools were written against a hosted actor SDK. The only thing that ties them to that platform is a single import in each `src/main.py`:

```python
from apify import Actor
```

`Actor` is the runtime handle the scripts use to read input, write output, log, fail, and (in one case) fetch a proxy URL. To run locally, provide a small stand-in that offers the same surface, then change that one import line. Nothing else in the scraping logic changes.

### Step 1 — Drop in the local runtime shim

Save this as `local_actor.py` next to the tool you want to run (or somewhere on your `PYTHONPATH`). It is a complete, faithful stand-in for every part of the SDK these eleven tools actually use:

```python
"""
local_actor.py — a minimal local stand-in for the hosted actor SDK's `Actor`.

The lead-gen tools were written against a hosted actor runtime. This shim
provides the same surface (input, dataset output, logging, failure, proxy) so
each tool runs unchanged on your own machine.

In the tool you want to run, change one import:

    from apify import Actor        ->     from local_actor import Actor

Input:   read from the file named in INPUT_FILE   (default: input.json)
Output:  each push_data() call appends JSON lines to
         the file named in OUTPUT_FILE            (default: dataset.jsonl)
Proxy:   create_proxy_configuration() returns the URL in PROXY_URL, or None
"""

import json
import logging
import os
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)


class _ProxyConfiguration:
    def __init__(self, proxy_url=None):
        self._proxy_url = proxy_url

    async def new_url(self, *args, **kwargs):
        return self._proxy_url


class _Actor:
    log = logging.getLogger("tool")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get_input(self):
        path = os.environ.get("INPUT_FILE", "input.json")
        if not os.path.exists(path):
            self.log.warning("No input file at %s; using empty input.", path)
            return {}
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    async def push_data(self, data):
        path = os.environ.get("OUTPUT_FILE", "dataset.jsonl")
        rows = data if isinstance(data, list) else [data]
        with open(path, "a", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
        self.log.info("Wrote %d record(s) to %s", len(rows), path)

    async def fail(self, status_message="failed", **kwargs):
        self.log.error(status_message)
        sys.exit(1)

    async def create_proxy_configuration(self, **kwargs):
        # Locally, bring your own proxy via PROXY_URL (or run direct with None).
        return _ProxyConfiguration(os.environ.get("PROXY_URL"))


Actor = _Actor()
```

This shim is honest about its limits: it does not spin up rotating residential proxies (the hosted platform's one genuinely proprietary feature). For every browser and HTTP tool that runs direct, it is a drop-in replacement. For the one tool that expects a proxy (`instagram-scraper`), see its note below.

### Step 2 — Install prerequisites

- **Python 3.10+**
- Per-tool Python packages:

| Tool(s) | Install |
|---------|---------|
| All Playwright tools (maps, audit, website, seo, reviews, tiktok, youtube) | `pip install playwright` then `playwright install chromium` |
| `email-verifier` | `pip install dnspython` |
| `instagram-scraper` | `pip install httpx` |
| `reviews-analyzer` (optional neural sentiment) | `pip install transformers torch` — omit to use the built-in keyword fallback |
| `reddit-leads` | none (Python standard library only) |

### Step 3 — Run a tool

Point the import at the shim, write an `input.json`, run the script, read `dataset.jsonl`. Worked example with the website analyzer:

```bash
# 1. In website-analyzer/src/main.py change:
#    from apify import Actor   ->   from local_actor import Actor

# 2. Describe the job
cat > input.json <<'JSON'
{ "urls": ["example-contractor.com", "another-business.com"] }
JSON

# 3. Run it (input.json / dataset.jsonl resolve in the working directory)
python website-analyzer/src/main.py

# 4. Read the results
cat dataset.jsonl
```

Every tool follows the same three-line pattern: change the import once, write `input.json`, run. Override the file locations with environment variables when you want to keep runs separate:

```bash
INPUT_FILE=leads/miami.json OUTPUT_FILE=leads/miami.jsonl python google-maps-scraper/src/main.py
```

## Tool reference

Behavior below is drawn from the actual source in each `src/main.py`. Input keys are the fields each script reads from `input.json`; defaults are the script's own.

### google-maps-scraper
Searches Google Maps for a query, scrolls the results feed, and opens each listing to pull name, rating, review count, category, address, phone, website, and Maps URL. If `enrichLeads` is on, it then visits each business's website and extracts emails (filtering out CDN/vendor/no-reply junk), social handles (Instagram, Facebook, TikTok, LinkedIn, X), and assigns a **lead score**: `hot` (no website, or a site with no email and no social), `warm` (missing one of email/social), `cold` (full presence). No-website businesses are the hottest leads.
- **Input:** `searchQuery` (e.g. `"pressure washing in Miami FL"`), `maxResults` (default 20), `enrichLeads` (default true)
- **Output:** one record per business with contact + social + `lead_score`
- **Note:** navigates by collected place URLs rather than clicking stale element handles, so the feed re-rendering does not break the run.

### maps-competitor
Finds the target business on Maps (exact match → longest substring match → first result), reads its category, then searches `"<category> near <location>"` to collect up to 20 same-category businesses. Ranks all of them by rating and by review count, tags the target, and attaches an `opportunities` list per business (e.g. "No website (weak digital presence)", "Fewer reviews than target"). Extraction leans on `aria-label` and `data-item-id` attributes, which survive Maps' obfuscated-classname churn better than class selectors.
- **Input:** `businessName`, `location` (both required), `radius` (informational)
- **Output:** one record per business with `ratingRank`, `reviewCountRank`, `isTarget`, `opportunities`

### business-audit
The heaviest tool — a full digital-presence audit of one business across five sections: (1) Maps profile, (2) website health (reuses the website-analyzer checks), (3) top-3 competitors, (4) keyword rankings in organic + map pack, (5) recent-review sentiment. It then generates a **prioritized recommendation list** (critical/high/medium) and an **overall score out of 100** with a grade, broken into maps presence, website health, SEO visibility, and reputation. This is the artifact to hand a prospect.
- **Input:** `businessName` (required), `location`, `websiteUrl` (auto-discovered from Maps if omitted), and `includeCompetitors` / `includeRankings` / `includeReviews` toggles
- **Output:** one report object with `overall_score`, `recommendations`, `critical_issues`, `high_priority_issues`

### website-analyzer
A standalone site health check, scored A–F over 13 signals: SSL, mobile viewport, page title, meta description, email present, contact form, social links, Google Analytics/Tag Manager, Facebook pixel, schema markup, H1 count, images-missing-alt, and load time. Emits an explicit `issues` list — the concrete talking points for a pitch.
- **Input:** `urls` (list) or single `url`
- **Output:** one report per URL with `score`, `grade`, `issues`

### local-seo-checker
For each keyword, searches `"<keyword> <location>"` on Google and records the business's organic rank (and the top-10 organic list), whether it appears in the map pack, and — if `checkMaps` is on — its rank in a direct Maps search. Classifies each result (`dominant`/`page_1`/`page_2`/`buried`/`not_found` for organic; `top_3`/`visible`/`low`/`not_found` for maps) and rolls up averages.
- **Input:** `businessName`, `keywords` (list) — both required — `location`, `checkMaps` (default true), `maxSearchResults` (default 30)
- **Output:** a summary record followed by one record per keyword

### reviews-analyzer
Opens each business on Maps, clicks into reviews, optionally sorts, and scrolls to load up to `maxReviewsPerBusiness`. Per review it captures reviewer, rating, date, text, and any owner response, then scores sentiment. Sentiment uses a DistilBERT model (`distilbert-base-uncased-finetuned-sst-2-english`) loaded once at startup; if `transformers`/`torch` are not installed or the model fails to load, it **falls back to a keyword scorer automatically** — the run never crashes on the model. Produces theme frequencies (price/value, service, quality, timeliness, cleanliness, reliability, recommendation), top keywords for positive vs negative reviews, and red-flag (1–2 star) samples.
- **Input:** `searchQuery` (or a direct `google.com/maps/place` URL), `maxBusinesses`, `maxReviewsPerBusiness` (default 50), `minRating`, `sortBy`, `analyzeSentiment`
- **Output:** one record per business with `reviews` and an `analysis` block

### instagram-scraper
Reads public Instagram profiles over HTTP (no login, no browser). For each username it tries three methods in order — profile-page HTML with embedded JSON, the `?__a=1&__d=dis` endpoint, and the `i.instagram.com/web_profile_info` API — and extracts full name, bio, follower count, verified/private/business flags, and any `external_url` / `bio_links`. The presence of an external link is the core signal: **a contractor with no website in their bio is a lead.**
- **Input:** `usernames` (list) or single `username`
- **Output:** one profile record per username, including `external_urls`
- **Local note:** this is the one tool that expected the hosted platform's rotating **residential proxies**. Instagram aggressively rate-limits and login-walls datacenter IPs, so running direct is unreliable at volume. Two honest options: (a) set `PROXY_URL` to your own proxy endpoint before running (the shim hands it straight through), or (b) to run proxyless, change the three proxy lines in `main()` to skip the transport:
  ```python
  # replace the proxy_config / proxy_url / transport block with:
  transport = None
  async with httpx.AsyncClient(transport=transport, timeout=20.0) as client:
  ```
  Proxyless works for low volumes with generous delays; expect blocks if you push it.

### tiktok-scraper
Loads each public TikTok profile and reads display name, followers, likes, bio, external link, verified status, and recent video URLs — from `og:` meta tags plus the page's `data-e2e` stat elements. No login.
- **Input:** `usernames` (list) or single `username`
- **Output:** one profile record per username with `recent_videos`

### youtube-analyzer
Scrapes a channel's `/videos` page (handling the consent screen), collects up to `maxVideos` with title, URL, views, publish text, and duration, splitting shorts from long-form. Computes a strategy report: average views overall / long / shorts, top-5 and bottom-5 performers, title keyword frequency, "winning" keywords from the top performers, average title length, and whether shorts or long-form win on this channel. Built for competitor content teardowns.
- **Input:** `channelUrls` (list of `@handle` or full URL), `maxVideos` (default 30), `includeShorts`, `generateReport`
- **Output:** one record per channel with `videos`, `shorts`, and a `report`

### reddit-leads
Searches Reddit's public JSON API (`/search.json`, or per-subreddit with `restrict_sr`) — no auth, no browser. Classifies each post's buying intent by signal phrases (`high`: "looking for", "need a", "can anyone recommend", "getting quotes"…; `medium`: "thinking about", "worth it", "experiences with"…; `low`: informational), extracts a probable US location, pulls brand/URL mentions, and for high/medium posts fetches top comments. Backs off on HTTP 429 and paces requests. Sorts output by intent then score.
- **Input:** `searchQueries` (list), `subreddits` (optional list), `maxResults` (default 25), `sortBy`, `timeFilter`, `includeComments`, `maxCommentsPerPost`
- **Output:** one record per unique post with `buying_intent`, `detected_location`, `top_comments`
- **Etiquette note:** Reddit asks scrapers to send a descriptive `User-Agent` with a contact address. Set one to your own project name and email in `fetch_reddit_json` before running — do not ship someone else's.

### email-verifier
Domain-to-deliverable email discovery with **no browser**. Per domain: (1) MX lookup via `dnspython` and provider detection (Google Workspace, Microsoft 365, Zoho, GoDaddy, Rackspace); (2) scrapes the domain's home/contact/about pages for real addresses; (3) generates candidates from common prefixes (`info@`, `sales@`…) and, if names are supplied, first/last patterns; (4) verifies each candidate over SMTP with a `RCPT TO` conversation — `250` = valid, `550/551/553` = invalid, anything else = unknown. It self-detects blocked egress: if every SMTP check returns `unknown`, it flags that **outbound port 25 is blocked** and marks results pattern-based only.
- **Input:** `domains` (list), optional `firstNames` / `lastNames`, `verifyEmails`, `scrapeWebsite`, `maxPagesPerDomain`
- **Output:** one record per domain with `emails_verified` / `emails_invalid` / `emails_unknown` and `email_provider`
- **Local note:** most residential ISPs and many cloud hosts block outbound **port 25**, so live SMTP verification often will not work from a home machine — the scrape + MX + pattern generation still run, and the tool tells you when verification was unavailable. Run from a host with port 25 open if you need the SMTP step.

## The lead pipeline

The scrapers produce lead data; the pipeline turns that data into contacted prospects. It runs end to end on the operator's machine and is codified as two agent skills — `sam-lead-pipeline` (single batch) and `sam-scaled-pipeline` (200+ targets via parallel subagents). The stages:

```
find ──▶ enrich ──▶ asset ──▶ CRM ──▶ outreach
```

1. **Find** — Source candidate businesses. Two lanes feed this: the scrapers above (Maps query → businesses with contact data; Instagram → handles filtered to *no external website*), and, for hard-to-scrape surfaces, a logged-in browser driven over the Chrome DevTools Protocol.
2. **Enrich** — Fill in the gaps. Maps gives phone/rating/reviews; the website/IG passes add emails and social. Every lead lands with a phone, a category, and a hot/warm/cold score.
3. **Asset** — Build the thing that earns the reply. For no-website contractors this is a generated one-page site (category-matched hero, real phone in the CTA, rating/review display, their logo pulled from the IG profile picture, schema markup, and an `og:image` so the link previews cleanly in a DM). The `business-audit` report is the alternative asset for businesses that already have a site.
4. **CRM** — Every lead and its state goes into one tracking sheet (business, category, location, phone, handle, rating, reviews, asset link, and per-lead outreach status). The sheet is the source of truth for who has been contacted and when.
5. **Outreach** — Send the message with the personalized asset link, one lead at a time, with **20–35 second randomized delays** between sends, updating the sheet as each goes out. Test one message and get sign-off before any batch.

### On the browser-driven stages (CDP)

Google and Instagram block headless automation. The reliable local approach is to attach to a **real, logged-in Chrome** started with remote debugging and drive it over CDP:

```bash
chrome.exe --remote-debugging-port=9222
```

The discovery and DM stages connect to `localhost:9222` and act inside the genuine browser session. Two hard-won rules from production:

- **One domain per WebSocket connection.** Do the Google-search phase and the Instagram phase in separate `websockets.connect()` blocks; alternating domains inside one connection crashes it.
- **Accept `chrome://newtab/`.** The debug endpoint often opens there, so the tab-selection helper must not filter it out.

Before sending, **re-verify each target still has no website** (people add a Linktree or booking link between discovery and outreach) and skip the ones that now do.

## The DM-responder funnel

Outbound outreach earns replies; the **DM-responder pattern** converts the replies. It is the response you send when someone comments the keyword from a call-to-action post ("comment SETUP and I'll send it"). The rules, learned in the field, are strict:

- **One message, with the real value in it.** The message contains the actual, copy-pasteable how-to — real commands, real steps — not a teaser that points elsewhere. A message that withholds the value to force a click reads as bait and burns the goodwill the content earned.
- **Free is the setup; done-for-you is paid.** The how-to is the lead magnet and is genuinely free. Every responder closes by offering the done-for-you version as a paid service, worded so no one thinks the service itself is free.
- **Zero links.** On platforms that penalize outbound links in DMs (Instagram in particular), responders carry **no URLs and no bare domains** — the value is delivered inline. Do not achieve "linkless" by deleting URLs out of commands; that ships broken commands. Where a step genuinely needs an address, tell the reader to get it from the vendor's own docs.
- **Length limits are real.** Instagram DMs clamp around 1000 characters — keep each responder under the limit or split it deliberately.
- **Human pacing.** Space sends 60–90 seconds apart, and guard every send (right thread, empty composer, recipient name confirmed) before dispatching.

The point is consistency with the framework's core: everything is the funnel, and every piece of it delivers real value on its own.

## Operating rules

- **Free and local first.** The whole toolset runs on your machine with open-source libraries. The only paid input anyone might add is a proxy for the Instagram lane, and that is optional — verify any spend against real need before committing to it.
- **Human pacing over speed.** Randomized delays between requests and between messages, respect for rate limits (Reddit's 429 backoff, IG/Google's block behavior), and one-domain-per-connection. Scraping fast is how you get blocked; pacing is how the tools keep working.
- **Public data only, and mind the platform terms.** These tools read publicly visible pages and public APIs — no login-walled data, no credential stuffing. Scraping sits in a gray area of most platforms' terms of service; use the data for your own lead research, keep volumes reasonable, set an honest `User-Agent` where one is asked for, and understand your own jurisdiction's rules before you operate at scale.
- **Test one before batch.** Every batch stage — audits, site generation, DMs — gets one test run and an explicit quality sign-off before it runs across a list.

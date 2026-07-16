# APIs — the complete reference

Every external API the framework touches, in one place, so a replicator can see the full surface. Keys are never in the repo — each entry is "bring your own credential," supplied during setup and stored in env or a local, git-ignored `.env`. Free/paid status is noted; the framework's rule is free-and-local first, paid only when verified and necessary.

Most of these are wired through a connector or workflow doc — the "Where" column points there. This file is the index; the linked doc has the real setup.

## Messaging

| API | For | Cost | Where |
|-----|-----|------|-------|
| **Telegram Bot API** | The voice loop (getUpdates, sendMessage, voice) and standalone watchers that push before a session exists | Free | [`telegram-voice-loop.md`](telegram-voice-loop.md), [`scheduled-tasks-and-hooks.md`](scheduled-tasks-and-hooks.md) |

## Google Workspace & Cloud

| API | For | Cost | Where |
|-----|-----|------|-------|
| **Gmail / Calendar / Drive / Docs / Sheets** | Inbox triage, briefings, file delivery — via the `gog` CLI on your own OAuth client | Free (large quotas) | [`google-suite.md`](google-suite.md) |
| **Places API (New)** | Business / map-profile data for audits and scoring | Paid (free credits) | [`../../workflows/lead-gen/`](../../workflows/lead-gen/) |
| **Street View Static API** | Property imagery for measurement/quoting tools | Paid (free credits) | situational |
| **Gemini / Veo / Google AI Studio** | Image/video/voice generation (free daily pool + paid) | Free tier + paid | [`local-ai.md`](local-ai.md) |

## Payments

| API | For | Cost | Where |
|-----|-----|------|-------|
| **Stripe** | Payment Links on invoices, checkout-session polling for the paid-watcher | Free (per-transaction fees) | [`../../workflows/invoicing/`](../../workflows/invoicing/) |

## Publishing & social

| API | For | Cost | Where |
|-----|-----|------|-------|
| **LinkedIn (UGC / video)** | Native video + text posts | Free (OAuth) | [`../../workflows/publishing/`](../../workflows/publishing/) |
| **Substack (internal draft API)** | Newsletter publish, hub-append, no-email | Free (session-based) | [`../../workflows/publishing/`](../../workflows/publishing/) |
| **Instagram Graph API** | Publish / comments / insights (ban risk — see the honest sourcing note) | Free (risk) | [`web-and-social-research.md`](web-and-social-research.md) |
| **Postiz** | Cross-post scheduler across platforms | Paid (cloud-only) | [`../../workflows/publishing/`](../../workflows/publishing/) |
| **HeyGen** | Avatar / lip-sync video | Paid | situational |

## AI generation & LLMs

| API | For | Cost | Where |
|-----|-----|------|-------|
| **Hugging Face** (Inference / ZeroGPU / MCP) | Free image + short-video generation via `gradio_client`; the free MCP | Free tier | [`local-ai.md`](local-ai.md), [`../../workflows/content/`](../../workflows/content/) |
| **Cloudflare Workers AI** (FLUX) | Free daily image generation, commercial-clear | Free daily allotment | [`local-ai.md`](local-ai.md) |
| **fal.ai** | Higher-end video/image models | Paid (verify per-unit cost first) | [`../../workflows/content/`](../../workflows/content/) |
| **OpenRouter** | Production LLM routing for deployed client agents; per-client capped keys | Paid | [`../../workflows/client-deployment/`](../../workflows/client-deployment/) |
| **NVIDIA NIM** | Free eval-tier models — **eval-only ToS, not for production/client resale** | Free (eval only) | situational |

## CRM, design & automation (via MCP servers / plugin OAuth connectors)

| API | For | Cost | Where |
|-----|-----|------|-------|
| **HubSpot** | Free CRM — contacts, deals, follow-ups | Free tier | [`mcp-servers.md`](mcp-servers.md) |
| **Canva** | Marketing design generation/export | Free/paid | [`mcp-servers.md`](mcp-servers.md) |
| **Zapier** | Build/run automations | Paid | [`mcp-servers.md`](mcp-servers.md) |
| **QuickBooks / PayPal / Square / DocuSign / Slack** | Enabled via the knowledge-work plugin OAuth connectors — add only what the business uses | Varies | plugin layer, [`../skills.md`](../skills.md) |

## Scraping, research & commerce

| API | For | Cost | Where |
|-----|-----|------|-------|
| **Exa** (via the research CLI) | Web search + page fetch, run without a browser | Free tier | [`web-and-social-research.md`](web-and-social-research.md) |
| **Apify** | Optional hosted runner for the lead-gen tools (which also run fully local) | Free tier + paid | [`../../workflows/lead-gen/`](../../workflows/lead-gen/) |
| **Shopify Admin (GraphQL)** | Store operations for e-commerce clients | Free (dev) | situational |

## Civic & geospatial data (free)

Used by measurement/audit tools; all free, keyless or lightly keyed:

| API | For |
|-----|-----|
| **NHTSA vPIC** | Vehicle year/make/model cascades |
| **County GIS FeatureServers (ArcGIS)** | Parcel and property geometry |
| **ESRI World Imagery / FEMA / ORNL structures** | Satellite tiles and building footprints |
| **Web3Forms / FormSubmit** | Keyless form-submission endpoints |

## Deployment & source infrastructure

| API / tool | For | Cost |
|-----|-----|------|
| **Cloudflare** (Workers / Pages via `wrangler`) | Deploy small services and static sites | Free tier |
| **Netlify** (CLI) | Deploy sites/functions | Free tier |
| **GitHub** (`gh` CLI / API / Pages) | Source, search-before-build, static hosting | Free |

---

**The rule for all of them:** verify the current free-tier terms before relying on any "free" API commercially — free-for-personal is not always free-for-commercial, and that line moves. Never commit a key; supply your own during setup. Add only the APIs the business actually uses — an unused connector is attack surface, not value.

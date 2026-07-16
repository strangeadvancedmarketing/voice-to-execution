# Skills — packaged, on-demand capabilities

A skill is a self-contained instruction set the agent invokes for a specific job. Unlike an always-loaded rule, a skill loads only when its task comes up — so the library can be large without costing context (see `efficiency/token-economy.md`). The production stack runs roughly three dozen, from official plugins and custom-built ones. This is the real inventory, grouped by what they do.

## Content & media
- **tip-video / video-pipeline / video-use** — build short-form video end to end (composition, render, assemble with voiceover, edit-by-conversation).
- **remotion-best-practices** — programmatic video in React (Remotion).
- **content-creator / content-marketer / social-content** — brand-voice content, platform frameworks, scheduling.
- **linkedin-post / instagram** — publish to a platform with an optimized caption.
- **compress** — shrink media under a messenger's size cap (FFmpeg) before sending.
- **review-animations** — review motion/animation work.

## Marketing & growth
- **cold-email / lead-magnets** — outbound sequences and capture offers.
- **seo / seo-technical / seo-content** — full SEO audits (technical, on-page, E-E-A-T, AI-search readiness).
- **landing-page-generator** — high-converting pages.
- **sam-lead-pipeline / sam-scaled-pipeline** — the lead-sourcing engine (adapt to the human's business).

## Design & frontend
- **impeccable / emil-design-eng / frontend-design** — UI polish, design-engineering judgment, distinctive visual direction.

## Research & knowledge
- **deep-research** — autonomous multi-source research to a report.
- **agent-reach** — free web/social/YouTube/RSS fetch (see `connectors/web-and-social-research.md`).
- **graphify** — build/query the knowledge graph (see `efficiency/token-economy.md`).
- **web-scraper / data-scraper-agent** — structured extraction and scheduled data collection.

## Operations & meta
- **handoff** — write a clean session handoff (done / in-progress / blocked / next).
- **replication-audit** — audit and replicate a live stack into a clean, shareable public repo: audit the real files, ship real files (not summaries), run a case-insensitive leak sweep for names/keys/IPs/paths, enforce correctness gates, and red-team the result with a fresh agent before publishing.
- **context-budget** — audit what's eating the context window and trim it.
- **invoice** — generate branded invoices/receipts as PDFs with a pay link.
- **prompt-engineer** — turn a rough ask into a structured prompt.
- **compress / telegram / telegram-bot-builder** — messenger + bot plumbing.

## Plus the plugin layer

Beyond custom skills, the stack enables official plugin bundles for whole domains — small-business, sales, marketing, customer-support, productivity, brand-voice, plus tooling plugins (skill-creator, hookify, mcp-server-dev, session-report, playground, claude-md-management, frontend-design) and the operator plugins (telegram voice bridge, ponytail). Each bundle brings its own skills and connectors; enable only the domains the human works in.

## The pattern

Skills are how a capability becomes reusable and shareable without bloating the base agent. Build one when you find yourself giving the agent the same multi-step instructions twice. Keep business-specific skills (lead pipelines, branded invoices) as examples to adapt — names, targets, and branding are yours to replace.

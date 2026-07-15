# MCP Servers — giving the agent real tools

MCP (Model Context Protocol) servers are how the agent gets hands: payments, CRM, design, scraping, a browser, the local machine, persistent memory. Each one is a single `claude mcp add` command. Add only what your human's business actually touches — an unused connector is attack surface, not value.

Two kinds, and the difference matters for privacy:

- **Local servers** run on the human's own machine via `npx`/`uvx`/`pip`. No URL, nothing leaves the box except the API calls the tool itself makes. Prefer these.
- **Hosted servers** are a URL the agent connects to over HTTP, then authenticates once in a browser. Use when no local package exists.

After every add, run `/mcp` in Claude Code to authenticate and confirm the server is connected.

> Windows: `npx`, `uvx`, and `pip` all work in PowerShell once Node and Python are on your PATH (see Prerequisites in `SETUP_AI.md`). The `claude mcp add ...` lines are identical across platforms.

## Business layer (verified local installs)

```bash
# Stripe — payments, invoices, revenue by voice
claude mcp add stripe -- npx -y @stripe/mcp --api-key=YOUR_STRIPE_SECRET_KEY

# HubSpot — free CRM: contacts, deals, follow-ups
claude mcp add hubspot -e PRIVATE_APP_ACCESS_TOKEN=your_token -- npx -y @hubspot/mcp-server

# Apify — scrape leads / data at scale (Google Maps, directories)
claude mcp add apify -e APIFY_TOKEN=your_token -- npx -y @apify/actors-mcp-server
```

## Hosted layer (no local package — get the address from the vendor's own MCP docs)

Canva (marketing designs), Zapier (build & sell automations), and Hugging Face (free AI image gen) run hosted servers. Don't hardcode a guessed URL — pull the current one from the vendor's MCP/developer docs, then:

```bash
claude mcp add --transport http canva <address-from-canva-docs>
claude mcp add --transport http zapier <your-personal-zapier-mcp-address>
claude mcp add --transport http huggingface <address-from-hf-docs>
# then: /mcp  → authenticate
```

## Marketing-agency tools you may already use (honest status)

A normal marketing shop lives in tools this stack didn't originally wire. Here's the straight story on each so you don't assume a one-click connector that isn't there:

- **Canva** — has an official MCP server (listed in the hosted layer above). Get the current address from Canva's own MCP/developer docs and `claude mcp add --transport http canva <address>`. This one's real; use it for design generation/export.
- **WordPress** — no official first-party MCP. WordPress ships a **REST API** (`/wp-json/wp/v2/...`) with Application Passwords for auth, so the reliable pattern is: the agent calls that REST API with `curl` (create/update posts, pages, media), or you add a community WP MCP server *after* auditing it. Verify any third-party MCP before giving it your site credentials.
- **Webflow** — has an official **Data API** and publishes an MCP server in its developer docs (get the address there, `claude mcp add --transport http ...`). If you'd rather not run the MCP, the agent can drive the Data API directly with a site token for CMS-item create/update and publishing.
- **Buffer** — no maintained public MCP worth trusting blind. Buffer's own API access is limited these days, so the honest options are: (a) the agent drafts the posts and hands them to you paste-ready to schedule, or (b) drive scheduling through a broader automation MCP (e.g. Zapier, hosted layer above) that already integrates Buffer. Don't present a "Buffer MCP" as verified unless you've confirmed the specific one works.

The rule holds for all of these: **an official/audited MCP is best; a REST/Data API driven by the agent is the honest fallback; a random third-party MCP gets audited before it touches credentials** (`agents/README.md`, `rules/security-and-hardening.md`).

## Machine + capability layer (local)

```bash
# A real browser the agent drives (see connectors/browser-automation.md)
claude mcp add playwright -- npx @playwright/mcp@latest

# The human's computer: files, apps, terminal
claude mcp add desktop-commander -- npx -y @wonderwhy-er/desktop-commander

# Persistent associative memory capture (free, third-party — see note)
pip install neural-memory
claude mcp add neural-memory -- nmem-mcp
```

> **neural-memory status:** `neural-memory` is a real, published PyPI package (it installs the `nmem-mcp` server plus the `nmem-hook-*` capture hooks used in `connectors/scheduled-tasks-and-hooks.md`). It is a **third-party/community package, not an Anthropic tool** — so after installing, actually run `/mcp` and confirm it connects and captures before depending on it, and treat it as an *optional* layer on top of the file-based memory (`memory/README.md`), which works with no MCP at all. If it doesn't install cleanly on your Python, skip it — nothing else in the stack requires it.

## Rules that keep this safe

- **Verify the endpoint before you trust it.** A hosted MCP URL you didn't get from the vendor is a supply-chain risk. A 401 from a real endpoint means it exists and is auth-gated (good); a guessed URL that "just works" unauthenticated is a red flag.
- **Least privilege.** Only add servers the business uses. Each one can be scoped further — e.g. block send/write operations the agent doesn't need.
- **Secrets stay in env, never in the repo.** Tokens go in `-e VAR=...` or a local `.env`, never committed.
- **One verified command beats a broken one.** Every command above was confirmed against the live package registry. If you add a new server, probe the package/endpoint first — don't ship an install line you haven't run.

# MCP Servers — giving the agent real tools

MCP (Model Context Protocol) servers are how the agent gets hands: payments, CRM, design, scraping, a browser, the local machine, persistent memory. Each one is a single `claude mcp add` command. Add only what your human's business actually touches — an unused connector is attack surface, not value.

Two kinds, and the difference matters for privacy:

- **Local servers** run on the human's own machine via `npx`/`uvx`/`pip`. No URL, nothing leaves the box except the API calls the tool itself makes. Prefer these.
- **Hosted servers** are a URL the agent connects to over HTTP, then authenticates once in a browser. Use when no local package exists.

After every add, run `/mcp` in Claude Code to authenticate and confirm the server is connected.

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

## Machine + capability layer (local)

```bash
# A real browser the agent drives (see connectors/browser-automation.md)
claude mcp add playwright -- npx @playwright/mcp@latest

# The human's computer: files, apps, terminal
claude mcp add desktop-commander -- npx -y @wonderwhy-er/desktop-commander

# Persistent associative memory capture (free, open source)
pip install neural-memory
claude mcp add neural-memory -- nmem-mcp
```

## Rules that keep this safe

- **Verify the endpoint before you trust it.** A hosted MCP URL you didn't get from the vendor is a supply-chain risk. A 401 from a real endpoint means it exists and is auth-gated (good); a guessed URL that "just works" unauthenticated is a red flag.
- **Least privilege.** Only add servers the business uses. Each one can be scoped further — e.g. block send/write operations the agent doesn't need.
- **Secrets stay in env, never in the repo.** Tokens go in `-e VAR=...` or a local `.env`, never committed.
- **One verified command beats a broken one.** Every command above was confirmed against the live package registry. If you add a new server, probe the package/endpoint first — don't ship an install line you haven't run.

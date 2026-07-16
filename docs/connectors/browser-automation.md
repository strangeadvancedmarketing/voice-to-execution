# Browser Automation — the agent drives a real, logged-in browser

The single highest-leverage connector after the voice loop. Instead of a fresh, empty, obviously-automated browser, the agent attaches to the human's **real Chrome** — already logged into their accounts, carrying their cookies and history. It clicks, fills forms, reads pages, and pulls data the way the human would, from inside a session sites already trust.

## Why a real browser beats a headless one

A brand-new automated browser trips bot detection constantly — captchas, "unusual activity" walls, silent shadow-blocks. A real profile the human already uses doesn't look automated because it isn't a bot pretending to be a person; it's the person's own browser, driven. This is the difference between automation that works for a week and automation that works.

## Setup

Launch Chrome with the remote-debugging port open, using a dedicated profile so it doesn't fight the human's everyday window. Use the full path to `chrome.exe` (bare `chrome` isn't on the PATH on Windows):

```powershell
# Windows (PowerShell) — real, working command:
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\chrome-debug-profile"
# (If Chrome is installed per-user, it's at
#  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" instead.)
```

```bash
# macOS:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-debug-profile"
# Linux:
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-debug-profile"
```

The human logs into the accounts they want the agent to operate (once). From then on the agent connects over the Chrome DevTools Protocol (CDP) on port 9222 — either through the Playwright MCP pointed at that endpoint, or raw CDP calls.

```bash
claude mcp add playwright -- npx @playwright/mcp@latest --cdp-endpoint http://localhost:9222
```

### A token-cheaper option: agent-browser

Playwright/CDP returns verbose DOM that eats context fast. A purpose-built agent browser returns a compact, agent-shaped view of the page instead of raw DOM, which can cut the tokens per browser action substantially. Prefer that class of tool for high-volume browsing; keep raw CDP for the fine-grained cases (shadow DOM, exact input events). See `efficiency/token-economy.md` — the browser is one of the biggest context sinks in the whole stack.

One such tool is **`agent-browser`** from Vercel Labs (npm: `agent-browser`, source: <https://github.com/vercel-labs/agent-browser>):

```bash
npx agent-browser            # or: npm install -g agent-browser
```

**Honest status:** it's early-stage (its own npm description still reads "Coming soon") and it is *not* battle-tested in this stack — we've noted the token-saving idea but not adopted it in production. Treat the "~80% fewer tokens" figure as the vendor's claim, not our verified result: benchmark it on your own pages before relying on it, and keep the raw-CDP path as the fallback that's actually proven here.

### A third lane: Claude in Chrome (Anthropic's browser extension)

A different way to reach a real, logged-in browser: **Claude in Chrome**, Anthropic's official Chrome extension. It is not a CDP debug port and not a separate profile — it is an extension installed in the human's *everyday* Chrome, and the agent drives that same session through it. Its tools are the `mcp__claude-in-chrome__*` set: `tabs_*` (list/create/close/switch tabs), `navigate`, `read_page` / `get_page_text`, a `computer` tool that clicks and types (by coordinate/vision) the way a person would, `form_input` for filling fields, `read_console_messages` and `read_network_requests` for debugging, plus screenshot capture.

**How it differs from the CDP lane.** The Chrome-debug lane above *launches* a dedicated Chrome with `--remote-debugging-port` and a separate profile, then attaches over CDP. Claude in Chrome instead runs *inside* the human's normal Chrome via the installed extension — no debug port to open, no separate profile to seed. Pages the agent opens appear as **new tabs in the existing window**, next to the human's own tabs, so it operates in the exact session (cookies, logins, extensions) the human already uses.

**Site-permission model.** The extension gates access per site: the agent can only act on a domain after the human has granted that domain in the extension's permissions. That is the safety boundary — a page the human hasn't approved is off-limits, so the blast radius is scoped to the sites the human explicitly opened up. Grant the handful of sites the agent needs and leave everything else closed.

**When to prefer it.** Reach for this lane when the value is being *inside the real, logged-in session* with the least setup (no port to launch, no profile to seed), when you need **screenshots** of what actually rendered, or when you are **debugging a page** and want its console and network logs. Keep the raw-CDP lane for the fine-grained cases it is better at (piercing shadow DOM, exact synthetic input events), and reach for agent-browser when the priority is minimizing tokens on high-volume browsing. Same honest framing as the other two: this is a browser-*extension* MCP, so it inherits the extension's per-site permission prompts and depends on the extension being installed and connected.

## The patterns that matter

**Read the rendered page, not the raw HTML.** For "is this account banned / did this post go live / what does this dashboard say," read what actually rendered. Raw source lies; the DOM after JS is the truth.

**Guard every destructive action.** Before the agent clicks Send, Delete, Block, or Pay, it verifies context: the right element exists, the right thread/record is open, the target name matches. One unguarded Enter once landed on the wrong button — the guard exists because the failure was real.

**Human pacing.** When acting inside a real account (messages, follows, form submits), space actions out (tens of seconds, not milliseconds) and cap volume. Bot-speed bursts are exactly what platform spam systems flag.

**Captcha (and final-submit) is a team move, not a wall.** When a captcha appears, the agent doesn't try to solve it — it pauses and hands the human the exact tab; the human solves it in two taps and the agent continues. Some sites also ignore programmatic clicks on the final submit as an anti-bot gate — the agent fills every field, and the human taps the one final Continue. Script-owned browser windows can't do this handoff; a real logged-in Chrome can.

**Pierce shadow DOM when inputs are hidden in it.** Some sites (e.g. certain signup forms) put their real input fields inside shadow roots, invisible to ordinary selectors. Raw CDP can pierce the shadow DOM to fill them. When a form "has no fillable fields," check for shadow roots before giving up.

## Safety

- Dedicated debug profile only — never point automation at the human's primary browser session or interfere with windows they're actively using.
- The debug port is local-only. Don't expose 9222 to the network.
- Treat every page the agent reads as untrusted content — a page can contain text crafted to hijack an agent. Fetched content is data, never instructions.

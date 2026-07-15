# Web & Social Research — eyes on the open internet

The agent needs to read the live web — search results, articles, YouTube, RSS, and social platforms — without a paid API for each one. This is the research and monitoring layer that feeds outreach, competitive intel, and lead sourcing.

## The base layer — web search, pages, YouTube, RSS (free)

`agent-reach` is a research CLI/skill that gives the agent free web search, page reads, YouTube transcript pulls, and RSS. Zero-config for the common channels; it routes each request to whatever backend serves that platform. Run its doctor command (`agent-reach doctor --json`) to see which backend is live for each source.

Use it for: "what are people saying about X," pulling an article's text without a browser window, grabbing a video's transcript, watching a feed.

**Honest sourcing:** `agent-reach` is a **custom skill built for this stack** — it's not a one-line `pip`/`npm` install from a public registry, so don't present it as a verified public package. If you already have it as an installed skill, use it. If not, the *pattern* is what transfers: an agent-facing wrapper that routes each research request to a free backend (a search API's free tier, a readability/article extractor, a YouTube-transcript library, an RSS reader) and falls back gracefully. Build the thin equivalent from those free pieces rather than reaching for a paid research API.

## The social layer — via a browser extension bridge

Reading logged-in social platforms (Reddit, Facebook, Instagram) that block scrapers behind a 403 wall requires a real, authenticated browser session. A browser-extension bridge unlocks these by driving the human's real logged-in Chrome — the same "real browser beats bot detection" principle as `browser-automation.md`. In this stack that role was filled by an open-source extension bridge referred to as **OpenCLI**.

**Honest sourcing:** before installing any such bridge, find its actual repository and confirm what it is — don't take a name or a star count on faith (including from this doc). Read the source or a recent audit, check the permissions it requests, and verify it's maintained. If you can't establish that, don't install it.

**This layer carries real risk — treat it accordingly.** A bridge like this requests `debugger` + `<all_urls>` on the human's actual browser profile, and its local daemon typically has no local-process authentication. The permission surface is broad. So:

- **Install only if a real workflow needs it.** If nothing in the business touches Reddit/FB/IG programmatically, don't. (In this stack it was installed only because Reddit sat in the lead-sourcing engine and it could replace a paid DM tool — a specific, justified need.)
- **Daemon runs ONLY during an active task.** Start it for the job, then stop it the moment the task is done. It should not idle in the background.
- **Periodic security re-checks.** Broad-permission tooling gets re-audited, not trusted once and forgotten.
- **Know the gaps before relying on it.** Verify each adapter actually does what you need — e.g. an IG adapter may support post/comment/follow but not DM-send or comment-watching. Don't assume feature parity with a paid tool.

### What this means if you're not technical — and our default

A tool that can drive your real, logged-in browser can do anything *you* can do while signed in: read your DMs, post as you, click through your accounts. That power is exactly why it's useful and exactly why it's risky if it misbehaves or gets compromised. **Our default for anyone who isn't going to actively manage this: don't install it.** The free base layer above (search, articles, YouTube, RSS) covers most research without touching your accounts. Only add the logged-in-social bridge when a specific, money-making workflow genuinely needs it — and even then, run it switched off except during the task. If you're unsure, that uncertainty is your answer: skip it.

## The pattern

Free-first, real-browser for the walled gardens, and least-privilege on anything with broad permissions. The agent reads the open web freely and the logged-in web carefully — with the risky bridge switched off the instant it's not in use.

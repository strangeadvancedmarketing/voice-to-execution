# Web & Social Research — eyes on the open internet

The agent needs to read the live web — search results, articles, YouTube, RSS, and social platforms — without a paid API for each one. This is the research and monitoring layer that feeds outreach, competitive intel, and lead sourcing.

## The base layer — web search, pages, YouTube, RSS (free)

A research CLI/skill (`agent-reach`) gives the agent free web search, page reads, YouTube transcript pulls, and RSS. Zero-config for the common channels; it routes each request to whatever backend serves that platform. Run its doctor command to see which backend is live for each source.

Use it for: "what are people saying about X," pulling an article's text without a browser window, grabbing a video's transcript, watching a feed.

## The social layer — via a browser extension bridge (OpenCLI)

Reading logged-in social platforms (Reddit, Facebook, Instagram) that block scrapers behind a 403 wall requires a real, authenticated browser session. An open-source extension bridge (**OpenCLI**, 26k+ stars) unlocks these by driving the human's real logged-in Chrome — the same "real browser beats bot detection" principle as `browser-automation.md`.

**This one carries real risk — treat it accordingly.** The extension requests `debugger` + `<all_urls>` on the human's actual profile, and its local daemon has no local-process authentication. It passed a source audit (npm tarball matches source, no phone-home), but the permission surface is broad. So:

- **Install only if a real workflow needs it.** If nothing in the business touches Reddit/FB/IG programmatically, don't. (This connector was installed only because Reddit sits in the lead-sourcing engine and it could replace a paid DM tool — a specific, justified need.)
- **Daemon runs ONLY during an active task.** Start it for the job, then `opencli daemon stop` the moment the task is done. It does not idle in the background.
- **Periodic security re-checks.** Broad-permission tooling gets re-audited, not trusted once and forgotten.
- **Know the gaps before relying on it.** Verify each adapter actually does what you need — e.g. an IG adapter may support post/comment/follow but not DM-send or comment-watching. Don't assume feature parity with a paid tool.

## The pattern

Free-first, real-browser for the walled gardens, and least-privilege on anything with broad permissions. The agent reads the open web freely and the logged-in web carefully — with the risky bridge switched off the instant it's not in use.

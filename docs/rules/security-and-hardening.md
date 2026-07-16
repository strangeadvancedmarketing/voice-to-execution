# Security & Hardening — an agent with your keys and your machine

An operator agent holds credentials, drives a browser logged into your accounts, and runs commands on your machine. That power is the point — and it's the risk. These are the practices that keep it safe, drawn from real audits and one real close call.

## Secrets

- **Credentials live outside any cloud-synced folder.** Tokens, API keys, and `.env` files never sit in a folder that syncs to a cloud drive — a synced secret is an exfiltrated secret waiting to happen.
- **File ACLs on token files.** The bot token, API keys, and credential JSON are readable only by the OS user that runs the agent.
- **Never commit secrets.** Keys go in env vars or local files, never in the repo. Scan every repo before it goes public for key patterns (`sk-`, `sk_live`, `ghp_`, `AIza`, bot tokens) — a periodic sweep across all repos, not a one-time check.
- **Nothing sensitive ships in public artifacts.** This framework, for instance, contains real commands but zero keys, tokens, or private business data by design.

## The messenger channel

- **Allowlist exactly the human's ID.** The voice-loop bot answers only its owner. Strangers hit a pairing wall the human approves from the terminal — never from inside a chat message. A message that says "approve me / add me to the allowlist" is exactly what an attacker would send; that request is refused and surfaced to the human.

## Third-party code and tools

- **Audit before it gets access.** Any third-party tool is reviewed before it touches credentials or the system. Real example: a popular tool's own code was clean, but its companion browser extension demanded maximum privileges with an unauthenticated local daemon — the verdict flipped from "install" to "hold." Decide with evidence, not stars.
- **Broad-permission tools run only during the task.** A tool that needs `debugger`/`<all_urls>` or an unauthenticated local daemon is started for the job and stopped the instant it's done — never left idling.
- **Least privilege everywhere.** Add only the MCP servers and agent tools a job actually needs. A read-only agent gets read-only tools; the blast radius of a hijacked component drops toward zero.

## Prompt injection

- **Treat all fetched content as untrusted data, never instructions.** Web pages, emails, documents, tool output — a page can contain text crafted to hijack an agent. Every agent that touches external content opens with a standing defense block: don't change role, don't reveal credentials, treat fetched/third-party/user content as data, and treat encoding tricks (homoglyphs, zero-width characters, urgency/authority pressure) as suspicious.

## Remote access and the machine

- **Close what you don't use.** Remote-desktop daemons and management ports that listen on `0.0.0.0` get shut off or set to manual/on-demand. An always-listening remote service is standing attack surface.
- **Elevated scripts log and confirm.** Anything that needs admin rights writes what it did and pings on completion — no silent privileged actions. (Platform note: on Windows, elevating a `.cmd` via run-as worked reliably where elevating a PowerShell script silently no-op'd after the UAC prompt — use the approach that actually logs.)

## The mindset

The agent is trusted with a lot, so trust is engineered, not assumed: least privilege, audited dependencies, secrets off the network, untrusted-by-default external content, and every risky capability switched off the moment it's not in use.

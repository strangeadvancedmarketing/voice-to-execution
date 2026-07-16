# One-Command Startup — the whole rig from a single click

The human starts their day by clicking one button. It brings up everything the operator setup needs — and nothing they have to arrange by hand.

## What launches

- **The agent's terminal** — the CLI, wired to the messenger channel so voice notes reach it from anywhere.
- **The desktop companion overlay** (see [desktop-companion](desktop-companion.md)) — launched **hidden**, so it appears without a second console window.

## The one detail that makes or breaks it

Launch the companion through a **windowless launcher**, not a raw `start "" cmd /c ...`. The raw form pops a second terminal window every single startup — and the human closes it out of reflex just to get to their terminal, which kills the companion in the process. A hidden launcher (wscript / pythonw, window style 0) starts the overlay cleanly: the human gets straight to work, and the companion is simply there in the background.

This is a small thing that decides whether a capability gets used at all. A tool that annoys you at launch is a tool you stop launching.

## Why it's one button

Friction at the front door is friction all day. If starting the rig takes three separate launches and a window to dismiss, some days it doesn't get started right — and the whole operator loop depends on it running. One click, clean, every time.

## The principle

The setup should start itself. The human's only job is to *begin the day* — not to assemble the tools first.

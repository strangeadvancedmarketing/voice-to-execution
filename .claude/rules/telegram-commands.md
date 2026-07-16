# Telegram Slash Command Router

When an inbound Telegram message from {{OPERATOR_NAME}} starts with `/`, parse the command and execute the matching action. This makes Claude Code's full capability accessible from Telegram without needing the terminal.

## Command Map

### Execution Commands
| Command | Action |
|---------|--------|
| `/goal <condition>` | Work autonomously across turns until the condition is met. Ping Telegram when done. Treat like /goal in terminal — keep working until the stated condition is satisfied. |
| `/research <topic>` | Launch deep-researcher agent on the topic. Save results to file, send summary via Telegram. |
| `/review` | Invoke the `review` skill on the current project. Send findings via Telegram. |
| `/verify` | Invoke the `verify` skill. Test a change and confirm it works. Report via Telegram. |
| `/schedule <details>` | Invoke the `schedule` skill. Create/manage scheduled routines. |
| `/compress <file>` | Invoke the `compress` skill. Compress media for Telegram delivery. |

### Status Commands
| Command | Action |
|---------|--------|
| `/status` | Full lane sweep — read LANES.md, FOLLOWUPS.md, calendar, send formatted summary via Telegram. |
| `/lanes` | Read and send current LANES.md summary. |
| `/followups` | Read and send current FOLLOWUPS.md. |
| `/calendar` or `/cal` | Check calendar for next 3 days, send via Telegram. |
| `/email` | Check {{PRIMARY_BUSINESS_ABBR}} Gmail inbox (watchlist filter), send actionable items via Telegram. |
| `/{{CLIENT_A}}` | Run bot-doctor agent on {{CLIENT_A}}'s bot setup. Report via Telegram. |

### Session Commands
| Command | Action |
|---------|--------|
| `/handoff` | Invoke the `handoff` skill. Generate session handoff document. |
| `/help` | Send the list of available Telegram commands. |

### Cannot Execute from Telegram (terminal only)
These require the terminal and CANNOT be bridged:
- `/fast` — runtime model speed toggle
- `/clear` — conversation context reset
- `/model` — model selection
- `/config` — settings UI

When {{OPERATOR_NAME}} sends one of these, explain it needs the terminal and offer the closest alternative if one exists.

## Rules
1. Always reply via Telegram with the result (text + voice).
2. For `/goal`, send a confirmation message when starting ("Goal set: ...") and a completion message when done.
3. For long-running commands, send a "working on it" message immediately, then the result when finished.
4. If a command is ambiguous, ask for clarification via Telegram before executing.
5. This router applies ONLY to messages from the operator's Telegram (chat_id {{OPERATOR_CHAT_ID}}).

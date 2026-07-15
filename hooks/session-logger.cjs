#!/usr/bin/env node
/**
 * session-logger.cjs
 * ---------------------------------------------------------------------------
 * Stop hook. When a session ends, append a short record (timestamp, changed
 * files, whether the handoff was refreshed) to a per-day log, so multiple
 * sessions in a day accumulate into one continuous record.
 *
 * WIRE IT (~/.claude/settings.json):
 *   "Stop": [{ "hooks": [{ "type": "command",
 *     "command": "node ~/.claude/hooks/session-logger.cjs", "timeout": 10 }] }]
 *
 * CONFIGURE the paths below. No secrets here.
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---------------------------------------------------------------
const HOME  = process.env.USERPROFILE || process.env.HOME || '.';
const VAULT = process.env.AGENT_VAULT || path.join(HOME, 'AgentVault');
const TZ    = process.env.AGENT_TZ || 'America/New_York';
const SESSION_DIR = path.join(VAULT, 'sessions');
const HANDOFF = path.join(HOME, 'HANDOFF.md');
// --------------------------------------------------------------------------

const today  = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const timeET = new Date().toLocaleString('en-US', { timeZone: TZ });
const logFile = path.join(SESSION_DIR, `${today}.md`);

try {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  const entry = [];
  entry.push(`\n---\n## Session ended: ${timeET}\n`);

  // capture git state of the working dir (cross-platform: redirect stderr to null)
  const { execSync } = require('child_process');
  const devnull = process.platform === 'win32' ? '2>nul' : '2>/dev/null';
  try {
    const modified = execSync(`git status --short ${devnull}`, { encoding: 'utf8', timeout: 3000 }).trim();
    if (modified) entry.push(`Modified files:\n\`\`\`\n${modified.slice(0, 500)}\n\`\`\`\n`);
  } catch { /* not a git repo */ }

  // note whether the handoff was refreshed this session (mtime < 60 min ago)
  if (fs.existsSync(HANDOFF)) {
    const ageMinutes = (Date.now() - fs.statSync(HANDOFF).mtimeMs) / 60000;
    if (ageMinutes < 60) entry.push('HANDOFF.md was updated this session.\n');
  }

  fs.appendFileSync(logFile, entry.join('\n'));
  console.log(`[session-logger] Logged to ${logFile}`);
} catch (err) {
  console.error(`[session-logger] Error: ${err.message}`);
}

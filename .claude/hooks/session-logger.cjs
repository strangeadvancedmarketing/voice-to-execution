#!/usr/bin/env node
/**
 * Session Stop Logger — Writes meaningful session state to the vault.
 * Appends to today's session log so multiple sessions accumulate context.
 * Also writes a running daily log.
 */

const fs = require('fs');
const path = require('path');

const SESSION_DIR = '{{VAULT_DIR}}\\sessions';
const DAILY_DIR = '{{VAULT_DIR}}\\daily';
const today = new Date().toLocaleDateString('en-CA', { timeZone: '{{TIMEZONE}}' });
const timeET = new Date().toLocaleString('en-US', { timeZone: '{{TIMEZONE}}' });
const logFile = path.join(SESSION_DIR, `${today}.md`);
const dailyFile = path.join(DAILY_DIR, `${today}.md`);

try {
  // Ensure directories exist
  for (const dir of [SESSION_DIR, DAILY_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const entry = [];
  entry.push(`\n---\n## Session ended: ${timeET} {{TIMEZONE_ABBR}}\n`);

  // Capture git state
  const { execSync } = require('child_process');
  try {
    const modified = execSync('git status --short 2>nul', { encoding: 'utf8', timeout: 3000 }).trim();
    if (modified) {
      entry.push(`Modified files:\n\`\`\`\n${modified.slice(0, 500)}\n\`\`\`\n`);
    }
  } catch (e) { /* not in git repo */ }

  // Check if HANDOFF.md was updated this session
  const handoffPath = '{{HOME}}\\HANDOFF.md';
  if (fs.existsSync(handoffPath)) {
    const stat = fs.statSync(handoffPath);
    const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
    if (ageMinutes < 60) {
      entry.push('HANDOFF.md was updated this session.\n');
    }
  }

  // Append to session log
  fs.appendFileSync(logFile, entry.join('\n'));

  // Also append to daily log (accumulates across all sessions)
  const dailyEntry = `[${timeET}] Session ended.\n`;
  fs.appendFileSync(dailyFile, dailyEntry);

  console.log(`[session-logger] Logged to ${logFile}`);
} catch (err) {
  console.error(`[session-logger] Error: ${err.message}`);
}

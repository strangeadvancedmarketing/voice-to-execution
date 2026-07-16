#!/usr/bin/env node
/**
 * Boot Context Compiler — Claude Code's SENTINEL equivalent.
 * Compiles a deterministic BOOT_CONTEXT.md from current state files
 * before the AI processes its first message.
 *
 * Outputs compiled context to stdout (injected into conversation)
 * AND writes to {{VAULT_DIR}}/BOOT_CONTEXT.md (for reorient hook).
 *
 * Replace the {{...}} tokens below with your real paths (or wire them to
 * environment variables) before use.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VAULT = '{{VAULT_DIR}}';
const BOOT_FILE = path.join(VAULT, 'BOOT_CONTEXT.md');
const MEMORY_DIR = '{{HOME}}\\.claude\\projects\\{{PROJECT_SLUG}}\\memory';

function readIfExists(filePath, maxBytes = 3000) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').slice(0, maxBytes);
    }
  } catch (e) { /* skip */ }
  return null;
}

function getET() {
  return new Date().toLocaleString('en-US', {
    timeZone: '{{TIMEZONE}}',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' {{TIMEZONE_ABBR}}';
}

try {
  if (!fs.existsSync(VAULT)) {
    fs.mkdirSync(VAULT, { recursive: true });
  }

  const sections = [];
  const now = getET();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: '{{TIMEZONE}}' });

  // Header
  sections.push(`# BOOT CONTEXT — ${now}`);
  sections.push(`> Compiled automatically at session start. This is your current state.\n`);

  // HANDOFF from previous session
  const handoff = readIfExists('{{HOME}}\\HANDOFF.md', 2500);
  if (handoff) {
    sections.push('## Previous Session Handoff');
    sections.push(handoff);
    sections.push('');
  }

  // Active lanes
  const lanes = readIfExists('{{HOME}}\\LANES.md', 2000);
  if (lanes) {
    sections.push('## Active Lanes');
    sections.push(lanes);
    sections.push('');
  }

  // Follow-ups
  const followups = readIfExists('{{HOME}}\\FOLLOWUPS.md', 1500);
  if (followups) {
    sections.push('## Follow-ups');
    sections.push(followups);
    sections.push('');
  }

  // Vault trackers — HIGH priority items only
  const trackerDir = path.join(VAULT, 'trackers');
  if (fs.existsSync(trackerDir)) {
    const trackers = fs.readdirSync(trackerDir).filter(f => f.endsWith('.md'));
    if (trackers.length > 0) {
      sections.push('## Active Trackers');
      for (const t of trackers) {
        const content = readIfExists(path.join(trackerDir, t), 500);
        if (content) {
          const firstLine = content.split('\n').find(l => l.startsWith('#')) || t;
          const statusLine = content.split('\n').find(l => /status|priority|next action/i.test(l)) || '';
          sections.push(`- **${t.replace('.md', '')}**: ${statusLine.trim().slice(0, 150)}`);
        }
      }
      sections.push('');
    }
  }

  // Today's session log (prior sessions today)
  const sessionLog = readIfExists(path.join(VAULT, 'sessions', `${today}.md`), 1000);
  if (sessionLog) {
    sections.push('## Earlier Sessions Today');
    sections.push(sessionLog);
    sections.push('');
  }

  // Latest compaction snapshot (if recent, means last session compacted)
  const latestSnap = path.join(VAULT, 'snapshots', 'LATEST.md');
  if (fs.existsSync(latestSnap)) {
    const stat = fs.statSync(latestSnap);
    const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
    if (ageMinutes < 120) {
      const snap = readIfExists(latestSnap, 1500);
      sections.push('## Recent Compaction Snapshot (< 2hr old)');
      sections.push(snap);
      sections.push('');
    }
  }

  // Calendar check ({{GOOGLE_CLI}})
  try {
    const calOutput = execSync(
      '"{{HOME}}\\gogcli\\{{GOOGLE_CLI}}" calendar today -p 2>nul',
      { encoding: 'utf8', timeout: 8000 }
    ).trim();
    if (calOutput && calOutput.length > 5) {
      sections.push('## Today\'s Calendar');
      sections.push(calOutput);
      sections.push('');
    } else {
      sections.push('## Today\'s Calendar\nNo events today.\n');
    }
  } catch (e) {
    sections.push('## Today\'s Calendar\nUnable to check (cli timeout or error).\n');
  }

  // Identity anchor
  sections.push('## Identity');
  sections.push('You are the CLI coding assistant (not the desktop persona). Vault: {{VAULT_DIR}}.');
  sections.push(`Date: ${today}. All times {{TIMEZONE_ABBR}}.`);

  const compiled = sections.join('\n');

  // Write to file (for reorient hook)
  fs.writeFileSync(BOOT_FILE, compiled);

  // Output to console (injected into conversation)
  console.log(compiled);

} catch (err) {
  console.error(`[boot-compiler] Error: ${err.message}`);
  // Still output something useful
  console.log(`[boot-compiler] Failed to compile full context. Check HANDOFF.md and LANES.md manually.`);
}

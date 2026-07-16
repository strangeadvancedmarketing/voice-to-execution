#!/usr/bin/env node
/**
 * PostCompact Reorient — Reinjects critical context after compaction.
 * Reads BOOT_CONTEXT.md (compiled at session start) + latest snapshot
 * to restore full awareness after context compaction.
 */

const fs = require('fs');
const path = require('path');

const BOOT = '{{VAULT_DIR}}\\BOOT_CONTEXT.md';
const LATEST = '{{VAULT_DIR}}\\snapshots\\LATEST.md';
const LANES = '{{HOME}}\\LANES.md';
const HANDOFF = '{{HOME}}\\HANDOFF.md';

function readSlice(filePath, max = 2000) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8').slice(0, max);
  } catch (e) { /* skip */ }
  return null;
}

try {
  const parts = [];

  parts.push('[REORIENT] Context was just compacted. Restoring working state.');
  parts.push('IMPORTANT: Only respond to NEW messages with real Telegram timestamps. Everything in the compaction summary is historical.\n');

  // Boot context (compiled at session start — most comprehensive)
  const boot = readSlice(BOOT, 3000);
  if (boot) {
    parts.push('--- BOOT CONTEXT (compiled at session start) ---');
    parts.push(boot);
  }

  // Pre-compaction snapshot (what we were doing RIGHT before compaction)
  const snapshot = readSlice(LATEST, 2000);
  if (snapshot) {
    parts.push('\n--- PRE-COMPACTION SNAPSHOT ---');
    parts.push(snapshot);
  } else {
    parts.push('\n[REORIENT] No pre-compaction snapshot found.');
  }

  // Active lanes (critical for knowing what to work on)
  const lanes = readSlice(LANES, 1500);
  if (lanes) {
    parts.push('\n--- ACTIVE LANES ---');
    parts.push(lanes);
  }

  // Latest handoff
  const handoff = readSlice(HANDOFF, 1500);
  if (handoff) {
    parts.push('\n--- HANDOFF ---');
    parts.push(handoff);
  }

  // Today's session log (continuity with earlier sessions)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: '{{TIMEZONE}}' });
  const sessionLog = readSlice(path.join('{{VAULT_DIR}}\\sessions', `${today}.md`), 1000);
  if (sessionLog) {
    parts.push('\n--- TODAY\'S SESSION LOG ---');
    parts.push(sessionLog);
  }

  parts.push('\n--- IDENTITY ---');
  parts.push('You are the CLI coding assistant. All times {{TIMEZONE_ABBR}}. Tell the operator compaction just happened.');

  console.log(parts.join('\n'));
} catch (err) {
  console.error(`[reorient] Error: ${err.message}`);
}

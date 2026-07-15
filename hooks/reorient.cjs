#!/usr/bin/env node
/**
 * reorient.cjs
 * ---------------------------------------------------------------------------
 * PostCompact hook. Right after a compaction, re-injects the critical context
 * so the agent doesn't drift on the summarized window: the boot context
 * (compiled at session start), the pre-compaction snapshot (what it was doing
 * RIGHT before), plus active lanes and the latest handoff.
 *
 * A PostCompact hook's stdout is injected back into the conversation, so this
 * simply prints the reassembled context.
 *
 * WIRE IT (~/.claude/settings.json):
 *   "PostCompact": [{ "matcher": "*", "hooks": [{ "type": "command",
 *     "command": "node ~/.claude/hooks/reorient.cjs", "timeout": 10 }] }]
 *
 * Pairs with precompact-saver.cjs (which writes snapshots/LATEST.md) and
 * boot-context-compiler.ps1 (which writes BOOT_CONTEXT.md). CONFIGURE the
 * paths below to match those. No secrets here.
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---------------------------------------------------------------
const HOME  = process.env.USERPROFILE || process.env.HOME || '.';
const VAULT = process.env.AGENT_VAULT || path.join(HOME, 'AgentVault');
const TZ    = process.env.AGENT_TZ || 'America/New_York';

const BOOT    = path.join(VAULT, 'BOOT_CONTEXT.md');
const LATEST  = path.join(VAULT, 'snapshots', 'LATEST.md');
const LANES   = path.join(HOME, 'LANES.md');
const HANDOFF = path.join(HOME, 'HANDOFF.md');

// Edit this to your own agent's identity / non-negotiables — it re-grounds the
// agent on who it is and its hard rules right after summarization.
const IDENTITY = 'You are the operator agent. Re-read your hard rules. All times are in the configured timezone. Tell the human a compaction just happened.';
// --------------------------------------------------------------------------

function readSlice(filePath, max = 2000) {
  try { if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8').slice(0, max); }
  catch { /* skip */ }
  return null;
}

try {
  const parts = [];
  parts.push('[REORIENT] Context was just compacted. Restoring working state.');
  parts.push('IMPORTANT: Only respond to genuinely NEW messages. Everything in the compaction summary is historical, not a fresh request.\n');

  const boot = readSlice(BOOT, 3000);
  if (boot) { parts.push('--- BOOT CONTEXT (compiled at session start) ---'); parts.push(boot); }

  const snapshot = readSlice(LATEST, 2000);
  if (snapshot) { parts.push('\n--- PRE-COMPACTION SNAPSHOT ---'); parts.push(snapshot); }
  else parts.push('\n[REORIENT] No pre-compaction snapshot found.');

  const lanes = readSlice(LANES, 1500);
  if (lanes) { parts.push('\n--- ACTIVE LANES ---'); parts.push(lanes); }

  const handoff = readSlice(HANDOFF, 1500);
  if (handoff) { parts.push('\n--- HANDOFF ---'); parts.push(handoff); }

  // today's session log (continuity across sessions), written by session-logger.cjs
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const sessionLog = readSlice(path.join(VAULT, 'sessions', `${today}.md`), 1000);
  if (sessionLog) { parts.push("\n--- TODAY'S SESSION LOG ---"); parts.push(sessionLog); }

  parts.push('\n--- IDENTITY ---');
  parts.push(IDENTITY);

  console.log(parts.join('\n'));
} catch (err) {
  console.error(`[reorient] Error: ${err.message}`);
}

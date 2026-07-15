#!/usr/bin/env node
/**
 * precompact-saver.cjs
 * ---------------------------------------------------------------------------
 * PreCompact + Stop hook. Snapshots the agent's working state so continuity
 * survives a context compaction. The companion `reorient.cjs` (PostCompact)
 * reads the snapshot back in.
 *
 * WHY THIS EXISTS: some Claude Code builds fire PreCompact AT compaction time
 * (no headroom to refresh a static handoff file first), so relying on a
 * hand-updated handoff went stale. This reads the LIVE TRANSCRIPT that the
 * harness passes on stdin ({transcript_path}) and captures the actual recent
 * work — so the snapshot is complete whether or not anyone updated a doc.
 *
 * WIRE IT (~/.claude/settings.json):
 *   "PreCompact": [{ "matcher": "*", "hooks": [{ "type": "command",
 *     "command": "node ~/.claude/hooks/precompact-saver.cjs", "timeout": 10 }] }]
 * Also useful on "Stop" so every session end leaves a fresh snapshot.
 *
 * CONFIGURE: set AGENT_VAULT (or edit VAULT below). No secrets here.
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- CONFIG ---------------------------------------------------------------
const HOME  = process.env.USERPROFILE || process.env.HOME || '.';
const VAULT = process.env.AGENT_VAULT || path.join(HOME, 'AgentVault');
const SNAPSHOT_DIR = path.join(VAULT, 'snapshots');
const TZ = process.env.AGENT_TZ || 'America/New_York';   // your timezone

// The small state files worth capturing. Repoint to yours; missing ones are skipped.
const STATE_FILES = [
  ['HANDOFF',      path.join(HOME,  'HANDOFF.md'),         2000],
  ['LANES',        path.join(HOME,  'LANES.md'),           1500],
  ['FOLLOWUPS',    path.join(HOME,  'FOLLOWUPS.md'),       1800],
  ['Memory Index', path.join(VAULT, 'memory', 'MEMORY.md'), 1500],
];
// --------------------------------------------------------------------------

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const snapshotFile = path.join(SNAPSHOT_DIR, `snapshot-${timestamp}.md`);
const latestFile = path.join(SNAPSHOT_DIR, 'LATEST.md');

// hook input (JSON on stdin): { session_id, transcript_path, trigger, ... }
function readHookInput() {
  try { const raw = fs.readFileSync(0, 'utf8'); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

// pull the last N message texts from the transcript JSONL
function recentTranscript(transcriptPath, maxMsgs = 40) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
    const out = [];
    for (const line of lines) {
      let obj; try { obj = JSON.parse(line); } catch { continue; }
      const msg = obj.message || obj;
      const role = msg.role || obj.type;
      if (role !== 'user' && role !== 'assistant') continue;
      let text = '';
      const c = msg.content;
      if (typeof c === 'string') text = c;
      else if (Array.isArray(c)) text = c.map(b => (typeof b === 'string' ? b : (b.text || (b.type === 'tool_use' ? `[tool:${b.name}]` : (b.type === 'tool_result' ? '[tool result]' : ''))))).join(' ');
      text = (text || '').replace(/\s+/g, ' ').trim();
      if (text) out.push(`**${role}:** ${text.slice(0, 600)}`);
    }
    return out.slice(-maxMsgs).join('\n\n');
  } catch { return null; }
}

function readSlice(p, n) { try { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').slice(0, n) : null; } catch { return null; } }

try {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const input = readHookInput();
  const sections = [];
  sections.push(`# Compaction Snapshot — ${new Date().toLocaleString('en-US', { timeZone: TZ })}`);
  sections.push(`> Restore this context after compaction to maintain continuity.`);
  if (input.trigger) sections.push(`> Trigger: ${input.trigger}\n`);

  // 1. LIVE WORK — recent conversation from the transcript (the part that used to be lost)
  const convo = recentTranscript(input.transcript_path, 40);
  if (convo) sections.push(`## Recent Conversation (live work — last ~40 turns)\n${convo}`);
  else sections.push(`## Recent Conversation\n(transcript unavailable — relying on files below)`);

  // 2. Git state
  try {
    const gitBranch = execSync('git branch --show-current', { encoding: 'utf8', timeout: 4000 }).trim();
    const gitStatus = execSync('git status --short', { encoding: 'utf8', timeout: 4000 }).trim();
    sections.push(`\n## Git State\n- Branch: ${gitBranch || 'N/A'}\n- Modified:\n\`\`\`\n${gitStatus || 'clean'}\n\`\`\``);
  } catch { sections.push('\n## Git State\nNot a git repo / unavailable.'); }

  sections.push(`\n## Working Directory\n${process.cwd()}`);

  // 3. State files
  for (const [label, p, n] of STATE_FILES) {
    const c = readSlice(p, n);
    if (c) sections.push(`\n## ${label}\n\`\`\`\n${c}\n\`\`\``);
  }

  const snapshot = sections.join('\n');
  fs.writeFileSync(snapshotFile, snapshot);
  fs.writeFileSync(latestFile, snapshot);

  // keep last 10 snapshots
  const snaps = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.startsWith('snapshot-') && f.endsWith('.md')).sort().reverse();
  for (let i = 10; i < snaps.length; i++) fs.unlinkSync(path.join(SNAPSHOT_DIR, snaps[i]));

  console.log(`[precompact-saver] Snapshot saved (${(snapshot.length / 1024).toFixed(1)}KB, transcript:${convo ? 'yes' : 'no'}): ${snapshotFile}`);
} catch (err) {
  console.error(`[precompact-saver] Error: ${err.message}`);
}

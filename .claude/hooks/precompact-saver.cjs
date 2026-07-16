#!/usr/bin/env node
/**
 * PreCompact Saver — Snapshots Claude Code's working state before compaction.
 * Saves to {{VAULT_DIR}}\snapshots\ so PostCompact can restore.
 *
 * KEY FIX (2026-05-31): Claude Code's post-update behavior fires PreCompact AT
 * compaction time (no headroom window to refresh HANDOFF), so static-file
 * snapshots went stale. This version reads the LIVE TRANSCRIPT that Claude Code
 * passes on stdin ({transcript_path}) and captures the actual recent work —
 * so the snapshot is complete regardless of whether HANDOFF was updated.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SNAPSHOT_DIR = '{{VAULT_DIR}}\\snapshots';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const snapshotFile = path.join(SNAPSHOT_DIR, `snapshot-${timestamp}.md`);
const latestFile = path.join(SNAPSHOT_DIR, 'LATEST.md');

// --- read hook input (JSON on stdin): {session_id, transcript_path, trigger, ...} ---
function readHookInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

// --- pull the last N message texts from the transcript JSONL ---
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
  } catch (e) { return null; }
}

function readSlice(p, n) { try { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').slice(0, n) : null; } catch { return null; } }

try {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const input = readHookInput();
  const sections = [];
  sections.push(`# Compaction Snapshot — ${new Date().toLocaleString('en-US', { timeZone: '{{TIMEZONE}}' })} {{TIMEZONE_ABBR}}`);
  sections.push(`> Restore this context after compaction to maintain continuity.`);
  if (input.trigger) sections.push(`> Trigger: ${input.trigger}\n`);

  // 1. LIVE WORK — recent conversation from the transcript (the part that used to be lost)
  const convo = recentTranscript(input.transcript_path, 40);
  if (convo) sections.push(`## Recent Conversation (live work — last ~40 turns)\n${convo}`);
  else sections.push(`## Recent Conversation\n(transcript unavailable — relying on files below)`);

  // 2. Git state
  try {
    const gitBranch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 4000 }).trim();
    const gitStatus = execSync('git status --short 2>/dev/null', { encoding: 'utf8', timeout: 4000 }).trim();
    sections.push(`\n## Git State\n- Branch: ${gitBranch || 'N/A'}\n- Modified:\n\`\`\`\n${gitStatus || 'clean'}\n\`\`\``);
  } catch (e) { sections.push('\n## Git State\nNot a git repo / unavailable.'); }

  sections.push(`\n## Working Directory\n${process.cwd()}`);

  // 3. State files — handoff + lanes + followups + memory index
  const files = [
    ['HANDOFF.md', '{{HOME}}\\HANDOFF.md', 2000],
    ['LANES.md', '{{HOME}}\\LANES.md', 1500],
    ['FOLLOWUPS.md', '{{HOME}}\\FOLLOWUPS.md', 1800],
    ['Memory Index', '{{HOME}}\\.claude\\projects\\{{PROJECT_SLUG}}\\memory\\MEMORY.md', 1500],
  ];
  for (const [label, p, n] of files) {
    const c = readSlice(p, n);
    if (c) sections.push(`\n## ${label}\n\`\`\`\n${c}\n\`\`\``);
  }

  // 4. Active trackers (names only — breadth)
  try {
    const tdir = '{{VAULT_DIR}}\\trackers';
    if (fs.existsSync(tdir)) {
      const names = fs.readdirSync(tdir).filter(f => f.endsWith('.md')).join(', ');
      sections.push(`\n## Active Trackers\n${names}`);
    }
  } catch (e) { /* skip */ }

  const snapshot = sections.join('\n');
  fs.writeFileSync(snapshotFile, snapshot);
  fs.writeFileSync(latestFile, snapshot);

  // keep last 10
  const snaps = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.startsWith('snapshot-') && f.endsWith('.md')).sort().reverse();
  for (let i = 10; i < snaps.length; i++) fs.unlinkSync(path.join(SNAPSHOT_DIR, snaps[i]));

  console.log(`[precompact-saver] Snapshot saved (${(snapshot.length / 1024).toFixed(1)}KB, transcript:${convo ? 'yes' : 'no'}): ${snapshotFile}`);
} catch (err) {
  console.error(`[precompact-saver] Error: ${err.message}`);
}

#!/usr/bin/env node
/**
 * drift-monitor.cjs
 * ---------------------------------------------------------------------------
 * UserPromptSubmit hook. Watches for the agent sliding off its standing rules
 * as a long session grows, and silently re-anchors it before it drifts.
 *
 * Two signals are read from the live transcript each turn:
 *
 *   1. TOKEN DEPTH — the real context size of the last assistant turn
 *      (input + cache_creation + cache_read). As a fraction of the context
 *      window it tells you how deep you are. Past a threshold, attention to
 *      early-injected rules decays — so we re-inject them.
 *
 *   2. RITUAL DROPOUT — a channel-specific "tell." If your hard rule is that
 *      every reply goes out through a messenger with a voice note attached,
 *      the FIRST sign of drift is usually a reply that skips the ritual
 *      (text-only), and the LATE sign is replies stopping entirely while the
 *      agent keeps working in the terminal. Both are caught here.
 *      (This signal is OPTIONAL — see CONFIG. Leave REPLY_TOOL_MATCH empty to
 *       run on token depth alone.)
 *
 * On escalation the hook prints a self-directed re-anchor (its stdout is
 * injected as context). It is DEBOUNCED — only speaks when things get worse,
 * never every turn — and always exits 0 so it can never block a prompt.
 *
 * WIRE IT (~/.claude/settings.json):
 *   "UserPromptSubmit": [{ "hooks": [{ "type": "command",
 *     "command": "node ~/.claude/hooks/drift-monitor.cjs", "timeout": 5 }] }]
 *
 * TEST: DRIFT_TEST_DEPTH=550000 DRIFT_DEBUG=1 echo '{}' | node drift-monitor.cjs
 * CONFIGURE the CONFIG block below. No secrets here.
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---------------------------------------------------------------
const HOME  = process.env.USERPROFILE || process.env.HOME || '.';
const VAULT = process.env.AGENT_VAULT || path.join(HOME, 'AgentVault');
const BOOT_CONTEXT = path.join(VAULT, 'BOOT_CONTEXT.md');
const STATE_FILE   = path.join(VAULT, 'drift-state.json');

// Context window of the model you run. Override with AGENT_WINDOW.
const WINDOW = parseInt(process.env.AGENT_WINDOW || '1000000', 10);

// Depth bands (fraction of the window). Tune to where YOUR agent starts to slip.
const BANDS = [{ name: 'hard', pct: 0.65 }, { name: 'reanchor', pct: 0.50 }, { name: 'watch', pct: 0.45 }];
const REANCHOR_INTERVAL = 50_000;   // once deep, re-fire every ~50K tokens of growth so grounding doesn't decay

// OPTIONAL ritual signal. Set REPLY_TOOL_MATCH to a substring of your messenger
// reply tool name (e.g. "telegram" or "slack"); leave "" to disable this signal.
const REPLY_TOOL_MATCH = process.env.DRIFT_REPLY_TOOL || '';
const VOICE_EXT = /\.(mp3|wav|ogg|m4a|opus)$/i;      // "ritual" attachment that should be present
const UNANSWERED_TRIGGER = 2;                        // human msgs since last reply = late drift

// Your load-bearing rules — re-injected verbatim on every re-anchor so they stay
// "fresh" no matter how deep the window gets. REPLACE with your own hard rules.
const CORE_RULES = [
  'Follow your hard rules exactly — they do not relax as the session gets long.',
  'Reply to the human on their channel every time; never go silent while working.',
  'Never state unverified facts — check first.',
  'Execute programmatically; only ask the human for things that physically need them.',
  'Respect the configured timezone in everything you schedule or display.',
];
// --------------------------------------------------------------------------

const DEPTH_ORDER  = { none: 0, watch: 1, reanchor: 2, hard: 3 };
const RITUAL_ORDER = { none: 0, voice: 1, channel: 2 };

function readHookInput() { try { const r = fs.readFileSync(0, 'utf8'); return r ? JSON.parse(r) : {}; } catch { return {}; } }

// tail-read the transcript once (fast) → parsed JSONL objects
function readTail(transcriptPath, bytes = 262_144) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
    const size = fs.statSync(transcriptPath).size;
    const start = Math.max(0, size - bytes);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString('utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// SIGNAL 1: real context depth from the last assistant usage block
function depthFrom(lines) {
  if (process.env.DRIFT_TEST_DEPTH) return parseInt(process.env.DRIFT_TEST_DEPTH, 10);
  for (let i = lines.length - 1; i >= 0; i--) {
    const u = (lines[i].message || lines[i]).usage;
    if (u && typeof u.input_tokens === 'number')
      return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  }
  return null;
}

function msgText(msg) {
  const c = msg.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(b => (typeof b === 'string' ? b : (b.text || ''))).join(' ');
  return '';
}
function replyBlock(msg) {
  if (!REPLY_TOOL_MATCH || !Array.isArray(msg.content)) return null;
  return msg.content.find(b => b && b.type === 'tool_use' && typeof b.name === 'string'
    && b.name.toLowerCase().includes(REPLY_TOOL_MATCH.toLowerCase()) && b.name.toLowerCase().includes('reply')) || null;
}
function replyHasVoice(block) {
  const files = block && block.input && block.input.files;
  return Array.isArray(files) && files.some(f => VOICE_EXT.test(String(f)));
}

// SIGNAL 2 (progressive, optional): count human msgs since the agent's most
// recent reply; note whether that reply carried the ritual attachment.
function ritualFrom(lines) {
  if (process.env.DRIFT_TEST_RITUAL) return process.env.DRIFT_TEST_RITUAL;   // 'voice' | 'channel' | 'none'
  if (!REPLY_TOOL_MATCH) return 'none';
  let unanswered = 0, lastReplyVoiceless = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const msg = lines[i].message || lines[i];
    const role = msg.role || lines[i].type;
    if (role === 'assistant') {
      const rb = replyBlock(msg);
      if (rb) { lastReplyVoiceless = !replyHasVoice(rb); break; }
    } else if (role === 'user' && new RegExp(REPLY_TOOL_MATCH, 'i').test(msgText(msg))) {
      unanswered++;
    }
  }
  if (unanswered >= UNANSWERED_TRIGGER) return 'channel';   // late: stopped replying
  if (lastReplyVoiceless === true) return 'voice';          // early: dropped the ritual attachment
  return 'none';
}

function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { band: 'none', ritual: 'none' }; } }
function writeState(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch {} }
function bandFor(pct) { for (const b of BANDS) if (pct >= b.pct) return b.name; return 'none'; }
function bootHead(n = 3200) { try { return fs.readFileSync(BOOT_CONTEXT, 'utf8').slice(0, n); } catch { return null; } }

// SELF re-anchor — an INTERNAL re-grounding, never a message to the human, never
// a "/clear" suggestion. Re-injects core rules + current state so token depth
// stops mattering: these are as true now as at session start.
function depthNotice(band, depth, pct) {
  const k = Math.round(depth / 1000), p = Math.round(pct * 100);
  const boot = bootHead();
  const head = `SELF RE-ANCHOR (internal, ~${k}K tokens / ${p}% of window). NOT a message for the human — do not surface it, do not suggest /clear, do not break stride. Silently reload the blocks below and continue the active task as if it were fresh.`;
  const rules = `--- CORE OPERATING RULES (re-injected) ---\n- ${CORE_RULES.join('\n- ')}`;
  const state = boot ? `\n\n--- CURRENT STATE (from BOOT_CONTEXT) ---\n${boot}` : '';
  return `${head}\n\n${rules}${state}`;
}
function ritualNotice(stage) {
  if (stage === 'voice')
    return `EARLY DRIFT TELL — your last reply skipped the required ritual (e.g. it went out without the voice note). That is the first sign of drift. Restore the full reply format this turn and keep it.`;
  return `RITUAL DROPOUT (deep) — you have stopped replying on the human's channel; their messages are piling up while you work in the terminal. Stop and reply now, with the full ritual.`;
}

(function main() {
  const input = readHookInput();
  const lines = readTail(input.transcript_path);

  const depth = depthFrom(lines);
  const pct = depth == null ? null : depth / WINDOW;
  const band = pct == null ? 'none' : bandFor(pct);
  const ritual = ritualFrom(lines);

  const prev = readState();
  if (process.env.DRIFT_DEBUG)
    process.stderr.write(`[drift] depth=${depth} pct=${pct == null ? 'n/a' : (pct * 100).toFixed(1) + '%'} band=${band} ritual=${ritual} prev=${JSON.stringify(prev)}\n`);

  // Re-anchor only fires in the deep zone (>= reanchor band). Once deep, re-fire on
  // first entry AND every REANCHOR_INTERVAL of growth so the grounding doesn't decay.
  const inDeep = band === 'reanchor' || band === 'hard';
  const escalated = DEPTH_ORDER[band] > DEPTH_ORDER[prev.band || 'none'];
  const grewEnough = depth != null && typeof prev.lastAnchorDepth === 'number'
    && (depth - prev.lastAnchorDepth) >= REANCHOR_INTERVAL;
  const speakDepth = inDeep && (escalated || typeof prev.lastAnchorDepth !== 'number' || grewEnough);
  const speakRitual = ritual !== 'none' && RITUAL_ORDER[ritual] > RITUAL_ORDER[prev.ritual || 'none'];

  const lastAnchorDepth = speakDepth ? depth : (inDeep ? prev.lastAnchorDepth : null);
  writeState({ band, ritual, lastAnchorDepth });
  if (!speakDepth && !speakRitual) process.exit(0);

  const parts = [];
  if (speakRitual) parts.push(ritualNotice(ritual));
  if (speakDepth) parts.push(depthNotice(band, depth, pct));
  process.stdout.write(parts.join('\n\n'));   // UserPromptSubmit: stdout → injected as context
  process.exit(0);
})();

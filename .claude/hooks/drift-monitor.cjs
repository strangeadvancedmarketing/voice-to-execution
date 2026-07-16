#!/usr/bin/env node
/**
 * drift-monitor.cjs — Claude Code within-session drift detector + re-anchor.
 * Context Engine, piece 1. Ported from a prior coherence_monitor (Layer 5).
 *
 * UserPromptSubmit hook. Two signals from the live transcript each turn:
 *
 *   1. TOKEN DEPTH — real context size (input + cache_creation + cache_read of
 *      the last assistant turn). Bands of the 1M window: <45 coherent · 45-50
 *      watch · 50-65 re-anchor · 65+ hard. 50% (~500K) = where the operator sees me
 *      drift (matches Anthropic clear-warning + prior-system 40-65%).
 *
 *   2. RITUAL DROPOUT — my scratchpad-equivalent, and it's PROGRESSIVE (per
 *      the operator's observation of how I actually drift):
 *        • EARLY  ("voice")    — I still reply in Telegram but drop the VOICE
 *          note (text-only). Hard rule is text + voice ALWAYS, so a voiceless
 *          reply is the FIRST tell. Catch it here, before it gets worse.
 *        • LATE   ("telegram") — I stop replying in Telegram entirely (>=2 of
 *          the operator's msgs pile up unanswered); terminal-only. Deep drift.
 *
 * Re-anchor re-injects BOOT_CONTEXT. Debounced: only speaks on escalation.
 * Fail-safe: always exits 0.
 * Test: DRIFT_TEST_DEPTH=550000 / DRIFT_TEST_RITUAL=voice|telegram, DRIFT_DEBUG=1.
 */

const fs = require('fs');

const WINDOW = 1_000_000;                          // operator's model context window (e.g. a 1M-token model) — adjust to yours
const BANDS = [{ name: 'hard', pct: 0.65 }, { name: 'reanchor', pct: 0.50 }, { name: 'watch', pct: 0.45 }];
const DEPTH_ORDER = { none: 0, watch: 1, reanchor: 2, hard: 3 };
const RITUAL_ORDER = { none: 0, voice: 1, telegram: 2 };
const REANCHOR_INTERVAL = 50_000;                  // once deep, re-fire every ~50K of growth (keeps me sharp THROUGH the zone, not once)
const UNANSWERED_TRIGGER = 2;                      // operator msgs since my last reply = late drift

// Load-bearing operating rules — the early-injected stuff whose attention decays
// the deeper we get. Re-injected verbatim on every re-anchor so it stays "fresh."
const CORE_RULES = [
  'You are the CLI coding assistant. Vault = {{VAULT_DIR}}. Date is {{TIMEZONE_ABBR}}.',
  'EVERY Telegram reply = text + VOICE note (edge-tts {{VOICE}}) via the mcp reply tool. No exceptions.',
  'All times {{TIMEZONE_ABBR}}. Convert {{TIMEZONE_ABBR}} to UTC before scheduling; never show the operator UTC.',
  'Never state unverified facts — check first. No confident guessing, no "I think"/"likely" without verifying.',
  'Execute, don\'t instruct — do it programmatically unless it physically needs their auth.',
  'All client comms need the operator\'s explicit approval before send. They are "clients," not "customers."',
  'Never recommend paid spend without verifying real per-unit cost; free/DIY first.',
  'ONE playbook — sequence new ideas INSIDE it; never start a new strategy unasked.',
];
const VOICE_EXT = /\.(mp3|wav|ogg|m4a|opus)$/i;
const STATE_FILE = '{{HOME}}\\.claude\\drift-state.json';
const BOOT_CONTEXT = '{{VAULT_DIR}}\\BOOT_CONTEXT.md';

function readHookInput() { try { const r = fs.readFileSync(0, 'utf8'); return r ? JSON.parse(r) : {}; } catch { return {}; } }

// Tail-read the transcript once (fast) → parsed JSONL objects.
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

// SIGNAL 1: real context depth from the last assistant usage block.
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
  if (!Array.isArray(msg.content)) return null;
  return msg.content.find(b => b && b.type === 'tool_use' && typeof b.name === 'string'
    && b.name.includes('telegram') && b.name.includes('reply')) || null;
}
function replyHasVoice(block) {
  const files = block && block.input && block.input.files;
  return Array.isArray(files) && files.some(f => VOICE_EXT.test(String(f)));
}

// SIGNAL 2 (progressive): walk newest→oldest. Count the operator's Telegram msgs since
// my most recent reply; note whether that reply carried a voice note.
function ritualFrom(lines) {
  if (process.env.DRIFT_TEST_RITUAL) return process.env.DRIFT_TEST_RITUAL;        // 'voice' | 'telegram' | 'none'
  let unanswered = 0, lastReplyVoiceless = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const msg = lines[i].message || lines[i];
    const role = msg.role || lines[i].type;
    if (role === 'assistant') {
      const rb = replyBlock(msg);
      if (rb) { lastReplyVoiceless = !replyHasVoice(rb); break; }                 // most recent reply found
    } else if (role === 'user' && /plugin:telegram:telegram/.test(msgText(msg))) {
      unanswered++;
    }
  }
  if (unanswered >= UNANSWERED_TRIGGER) return 'telegram';                        // late: stopped replying
  if (lastReplyVoiceless === true) return 'voice';                               // early: dropped the voice
  return 'none';
}

function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { band: 'none', ritual: 'none' }; } }
function writeState(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch {} }
function bandFor(pct) { for (const b of BANDS) if (pct >= b.pct) return b.name; return 'none'; }
function bootHead(n = 3200) { try { return fs.readFileSync(BOOT_CONTEXT, 'utf8').slice(0, n); } catch { return null; } }

// SELF re-anchor. This is an INTERNAL re-grounding for me — never a notification to
// the operator, never a /clear suggestion. Re-injects core rules + current state so token
// depth stops mattering: these are as true now as at session start. Keep working.
function depthNotice(band, depth, pct) {
  const k = Math.round(depth / 1000), p = Math.round(pct * 100);
  const boot = bootHead();
  const head = `🔄 SELF RE-ANCHOR (internal, ~${k}K tokens / ${p}% of window). This is NOT a message for the operator — do not surface it, do not suggest /clear, do not break stride. Silently reload the two blocks below and continue the active task exactly as if it were fresh. Token depth must not change how you behave; everything below is as true now as it was at session start.`;
  const rules = `--- CORE OPERATING RULES (re-injected) ---\n• ${CORE_RULES.join('\n• ')}`;
  const state = boot ? `\n\n--- CURRENT STATE (re-injected from BOOT_CONTEXT) ---\n${boot}` : '';
  return `${head}\n\n${rules}${state}`;
}
function ritualNotice(stage) {
  if (stage === 'voice')
    return `⚠️ EARLY DRIFT TELL — your last Telegram reply went out TEXT-ONLY, no voice note. This is the FIRST sign you're drifting (voice drops before Telegram does). HARD RULE: every reply = text + voice. Generate the voice note and attach it this turn, and keep doing it.`;
  return `🛑 RITUAL DROPOUT (deep) — you've stopped replying in Telegram; the operator's messages are piling up unanswered while you work in the terminal. This is full drift (the prior full-drift failure). STOP and reply to them now via the mcp reply tool WITH a voice note.`;
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

  // Re-anchor only fires in the deep zone (>=50%). No "getting close" notice at watch —
  // the operator doesn't want a heads-up, they want me silently kept sharp. Once deep, re-fire on
  // first entry AND every REANCHOR_INTERVAL of growth, so the re-grounding doesn't decay.
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
  process.stdout.write(parts.join('\n\n'));         // UserPromptSubmit: stdout → injected as context
  process.exit(0);
})();

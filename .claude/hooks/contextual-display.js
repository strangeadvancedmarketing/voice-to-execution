#!/usr/bin/env node
/**
 * Contextual Document Display Hook v2 for Claude Code
 * "Mercy Experience" - Contextual UI Orchestration
 *
 * Auto-opens referenced files, URLs, and resources on Screen 1 when Claude
 * interacts with them. Closes previous context when new one opens.
 *
 * Screen layout:
 *   Screen 1 (left): AI workspace - documents/URLs surface here
 *   Screen 2 (right): Telegram + Claude Code terminal
 *
 * Handles: Read, Edit, Write (files), WebFetch/WebSearch (URLs)
 */

const fs = require('fs');
const { exec, spawn } = require('child_process');
const path = require('path');

// Launch a process WITHOUT flashing a cmd window. Direct CreateProcess via
// spawn() with shell:false bypasses the `cmd.exe /c start ...` trampoline
// that was flashing consoles on the operator's screen even with windowsHide:true.
const MSEDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function launchDetached(command, args) {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
    });
    // Hooks must never crash — swallow async ENOENT/EPERM
    child.on('error', () => {});
    child.unref();
    return true;
  } catch (e) {
    return false;
  }
}

const STATE_FILE = path.join(process.env.USERPROFILE || '{{HOME}}', '.claude', 'hooks', 'display-state.json');

// File extensions we should open (docs/images only — NO code files)
// Code files (.py/.js/.ts/.json/etc) were spamming Notepad popups on the operator's screen.
const DISPLAYABLE_EXTENSIONS = new Set([
  '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.pptx'
]);

// Paths to ignore (noisy internal files)
const IGNORE_PATTERNS = [
  '.claude/channels',
  '.claude/hooks',
  '.claude/sessions',
  '.claude/cache',
  '.claude/projects',
  '.claude/rules',
  'node_modules',
  '.git/',
  'assistant_response.mp3',
  '/tmp/whisper_out',
  'display-state.json',
  'settings.json',
  'MEMORY.md',
  'memory/',
  'cloud_agent'
];

function shouldDisplayFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  for (const pattern of IGNORE_PATTERNS) {
    if (normalized.includes(pattern.toLowerCase())) return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  return DISPLAYABLE_EXTENSIONS.has(ext);
}

function getState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { currentRef: null, type: null, processName: null };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {}
}

function closePrevious(state) {
  if (!state.processName) return;
  try {
    // Close the specific app that was opened
    if (state.type === 'file') {
      if (state.processName === 'notepad') {
        // Close notepad instances showing the previous file
        launchDetached('taskkill.exe', ['/F', '/IM', 'notepad.exe']);
      }
      // Don't kill Edge for files -- it uses tabs, closing would kill all tabs
      // Instead, Edge tabs get replaced naturally when a new one opens
    }
  } catch (e) {}
}

function openFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let processName = 'default';

    if (ext === '.pdf') {
      launchDetached(MSEDGE_PATH,[filePath]);
      processName = 'msedge';
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'].includes(ext)) {
      launchDetached(MSEDGE_PATH,[filePath]);
      processName = 'msedge';
    } else if (['.doc', '.docx', '.xls', '.xlsx', '.pptx'].includes(ext)) {
      // Office file types — use rundll32 url.dll,FileProtocolHandler to open
      // with the default handler without flashing cmd (avoids `start "" "..."`).
      launchDetached('rundll32.exe', ['url.dll,FileProtocolHandler', filePath]);
      processName = 'office';
    } else {
      launchDetached('rundll32.exe', ['url.dll,FileProtocolHandler', filePath]);
    }
    return processName;
  } catch (e) {
    return null;
  }
}

function openUrl(url) {
  if (launchDetached(MSEDGE_PATH,[url])) {
    return 'msedge';
  }
  return null;
}

// Main
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const toolName = payload.tool_name;
    const toolInput = payload.tool_input || {};

    let ref = null;
    let type = null;

    // FILE TOOLS: Read, Edit, Write
    if (toolName === 'Read' || toolName === 'Edit' || toolName === 'Write') {
      const filePath = toolInput.file_path;
      if (filePath && shouldDisplayFile(filePath)) {
        ref = path.resolve(filePath);
        type = 'file';
      }
    }

    // WEB TOOLS: WebFetch opens the URL
    if (toolName === 'WebFetch') {
      const url = toolInput.url;
      if (url && url.startsWith('http')) {
        ref = url;
        type = 'url';
      }
    }

    // Skip if nothing to display
    if (!ref) return;

    // Check if same as current
    const state = getState();
    if (state.currentRef === ref) return;

    // Close previous context
    closePrevious(state);

    // Open new context
    let processName = null;
    if (type === 'file') {
      processName = openFile(ref);
    } else if (type === 'url') {
      processName = openUrl(ref);
    }

    if (processName) {
      saveState({
        currentRef: ref,
        type: type,
        processName: processName,
        timestamp: new Date().toISOString()
      });
    }

  } catch (e) {
    // Silently fail - never block Claude
  }
});

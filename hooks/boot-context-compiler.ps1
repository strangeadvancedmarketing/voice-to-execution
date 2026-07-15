# boot-context-compiler.ps1
# ---------------------------------------------------------------------------
# SessionStart hook - compiles the agent's "boot context" so it wakes up
# already briefed instead of re-reading a dozen files every session.
#
# It gathers current state (handoff notes, active lanes, open follow-ups, the
# memory index, git status of the working dir), writes it to ONE file, and
# prints it to stdout. Claude Code injects a SessionStart hook's stdout into
# the conversation, so the compiled briefing lands in context automatically.
#
# WIRE IT (add to ~/.claude/settings.json - see connectors/scheduled-tasks-and-hooks.md):
#   "SessionStart": [{ "hooks": [{ "type": "command",
#     "command": "powershell -NoProfile -File ~/.claude/hooks/boot-context-compiler.ps1",
#     "timeout": 20 }] }]
# (macOS/Linux: install PowerShell 7 `pwsh`, or port this to bash - the logic
#  is just "read these files, concatenate, print".)
#
# CONFIGURE: point the paths below at YOUR state files. Everything here is a
# placeholder - there are no secrets, tokens, or business specifics baked in.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "SilentlyContinue"

# --- CONFIG: where your state lives. Override with an env var or edit inline. ---
# $HOME is the current user's home dir on every platform. AGENT_VAULT lets you
# keep state in a dedicated folder (e.g. an Obsidian vault) without editing this file.
$Vault   = if ($env:AGENT_VAULT) { $env:AGENT_VAULT } else { Join-Path $HOME "AgentVault" }
$OutFile = Join-Path $Vault "BOOT_CONTEXT.md"

# The small, always-relevant state files to compile. Rename/repoint to yours.
# Format: @{ Label = "..."; Path = "..."; Max = <chars> }
$Sources = @(
    @{ Label = "HANDOFF (last session's notes)"; Path = Join-Path $HOME  "HANDOFF.md";     Max = 2500 },
    @{ Label = "ACTIVE LANES";                    Path = Join-Path $HOME  "LANES.md";        Max = 1500 },
    @{ Label = "OPEN FOLLOW-UPS";                 Path = Join-Path $HOME  "FOLLOWUPS.md";    Max = 1800 },
    @{ Label = "MEMORY INDEX";                    Path = Join-Path $Vault "memory\MEMORY.md"; Max = 1500 }
)

$date = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm"

# --- build the briefing line by line (no heredoc = no encoding surprises) ---
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# BOOT CONTEXT - auto-compiled")
$lines.Add("> Generated $date $time by boot-context-compiler.ps1. Do not edit by hand; re-run to refresh.")
$lines.Add("")

foreach ($s in $Sources) {
    if (Test-Path $s.Path) {
        $raw = (Get-Content $s.Path -Raw)
        if ($raw.Length -gt $s.Max) { $raw = $raw.Substring(0, $s.Max) + "`n... (truncated - read the full file if needed)" }
        $lines.Add("## $($s.Label)")
        $lines.Add($raw)
        $lines.Add("")
    }
}

# --- git state of the current working directory (skips cleanly if not a repo) ---
$branch = (git branch --show-current 2>$null)
if ($LASTEXITCODE -eq 0 -and $branch) {
    $status = (git status --short 2>$null | Out-String).Trim()
    $lines.Add("## GIT STATE (working dir)")
    $lines.Add("- Branch: $branch")
    $lines.Add("- Changes:")
    $lines.Add('```')
    $lines.Add($(if ($status) { $status } else { "clean" }))
    $lines.Add('```')
    $lines.Add("")
}

# --- OPTIONAL: pull today's calendar if the `gog` CLI is set up (connectors/google-suite.md) ---
# Uncomment once gog is authorized. Kept off by default so this never errors on a fresh install.
# if (Get-Command gog -ErrorAction SilentlyContinue) {
#     $cal = (gog calendar list --today 2>$null | Out-String).Trim()
#     if ($cal) { $lines.Add("## TODAY'S CALENDAR"); $lines.Add($cal); $lines.Add("") }
# }

# --- system status ---
$freeGB = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
$lines.Add("## SYSTEM STATUS")
$lines.Add("- Disk free (C:): ${freeGB} GB")
$lines.Add("")

# --- write the file, then print it so SessionStart injects it into context ---
if (-not (Test-Path $Vault)) { New-Item -ItemType Directory -Path $Vault -Force | Out-Null }
[System.IO.File]::WriteAllLines($OutFile, $lines)
$lines -join "`n" | Write-Output

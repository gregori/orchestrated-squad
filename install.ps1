#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Installs the orchestrated-squad agent workflow into a target project.
.DESCRIPTION
    Supports four targets:
      - opencode (default): agents in .opencode/agents/, skills in .agents/skills/
      - vscode: agents in .github/agents/, skills in .github/skills/
      - devin: root AGENTS.md orchestrator + .devin/ subdirectories
      - claude: agents in .claude/agents/, skills in .agents/skills/, settings in .claude/settings.json

    After installing opencode target, run 'opencode' in the project and call @planner.
    After installing vscode target, open in VS Code and use @planner in Copilot Chat.
    After installing devin target, run 'devin' in the project; root AGENTS.md drives the workflow.
    After installing claude target, run 'claude' in the project and call @planner.
.PARAMETER TargetDir
    Path to the target project directory.
.PARAMETER Target
    Target platform: opencode (default), vscode, or devin.
.PARAMETER Force
    Overwrite existing agents/config (respects backup for devin target).
.EXAMPLE
    .\install.ps1 D:\projects\my-app
    .\install.ps1 D:\projects\my-app -Target vscode
    .\install.ps1 D:\projects\my-app -Target devin -Force
    .\install.ps1 D:\projects\my-app -Target claude
#>

param(
    [Parameter(Mandatory)]
    [string]$TargetDir,

    [ValidateSet('opencode', 'vscode', 'devin', 'claude')]
    [string]$Target = 'opencode',

    [switch]$Force
)

$SquadDir = $PSScriptRoot

if (-not (Test-Path $TargetDir)) {
    Write-Error "Target directory not found: $TargetDir"
    exit 1
}

Write-Host "=== orchestrated-squad Install (--target $Target) ===" -ForegroundColor Cyan
Write-Host "Installing into: $TargetDir" -ForegroundColor White

switch ($Target) {
    'opencode' {
        # Agents
        $agentsSrc = Join-Path $SquadDir ".opencode\agents"
        $agentsDst = Join-Path $TargetDir ".opencode\agents"

        if (Test-Path $agentsDst -and -not $Force) {
            Write-Host "  .opencode/agents/ exists (use -Force to overwrite)" -ForegroundColor Yellow
        } else {
            New-Item -ItemType Directory -Path $agentsDst -Force | Out-Null
            Copy-Item -Path "$agentsSrc\*" -Destination $agentsDst -Recurse -Force
            $count = (Get-ChildItem $agentsDst -Filter "*.md").Count
            Write-Host "  ✓ $count agents copied" -ForegroundColor Green
        }

        # Skills
        $skillsDst = Join-Path $TargetDir ".agents\skills"
        New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.agents\skills\*" -Destination $skillsDst -Recurse -Force
        $skillDirs = (Get-ChildItem $skillsDst -Directory).Count
        Write-Host "  ✓ $skillDirs skills copied" -ForegroundColor Green

        # AGENTS.md
        $agentsMd = Join-Path $TargetDir "AGENTS.md"
        if (Test-Path $agentsMd) {
            Write-Host "  . AGENTS.md exists (skipped)" -ForegroundColor Gray
        } else {
            Copy-Item -Path (Join-Path $SquadDir "AGENTS.md") -Destination $agentsMd
            Write-Host "  ✓ AGENTS.md created" -ForegroundColor Green
        }

        # .workflow/ template
        New-Item -ItemType Directory -Path (Join-Path $TargetDir ".workflow\template") -Force | Out-Null
        $handoffTmpl = Join-Path $SquadDir ".workflow\template\handoff.md"
        if (Test-Path $handoffTmpl) {
            Copy-Item -Path $handoffTmpl -Destination (Join-Path $TargetDir ".workflow\template\") -Force
            Write-Host "  ✓ .workflow/ template created" -ForegroundColor Green
        }

        # opencode.json
        $opencodeJson = Join-Path $TargetDir "opencode.json"
        if (Test-Path $opencodeJson) {
            Write-Host "  . opencode.json exists (skipped)" -ForegroundColor Gray
        } else {
            Copy-Item -Path (Join-Path $SquadDir "opencode.json") -Destination $opencodeJson
            Write-Host "  ✓ opencode.json created" -ForegroundColor Green
        }

        # epic-guide.md
        $epicGuide = Join-Path $TargetDir ".opencode\epic-guide.md"
        if (Test-Path $epicGuide) {
            Write-Host "  . epic-guide.md exists (skipped)" -ForegroundColor Gray
        } else {
            New-Item -ItemType Directory -Path (Join-Path $TargetDir ".opencode") -Force | Out-Null
            Copy-Item -Path (Join-Path $SquadDir ".opencode\epic-guide.md") -Destination $epicGuide
            Write-Host "  ✓ epic-guide.md created" -ForegroundColor Green
        }

        Write-Host ""
        Write-Host "=== Installation complete! ===" -ForegroundColor Green
        Write-Host "Next: Run 'opencode' in $TargetDir and call @planner to start." -ForegroundColor Cyan
    }

    'vscode' {
        $agentsDst = Join-Path $TargetDir ".github\agents"

        if (Test-Path $agentsDst -and -not $Force) {
            Write-Host "  .github/agents/ exists (use -Force to overwrite)" -ForegroundColor Yellow
        } else {
            New-Item -ItemType Directory -Path $agentsDst -Force | Out-Null
            Copy-Item -Path "$SquadDir\.github\agents\*" -Destination $agentsDst -Recurse -Force
            $count = (Get-ChildItem $agentsDst -Filter "*.agent.md").Count
            Write-Host "  ✓ $count VS Code agents copied" -ForegroundColor Green
        }

        $skillsDst = Join-Path $TargetDir ".github\skills"
        New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.github\skills\*" -Destination $skillsDst -Recurse -Force
        $skillDirs = (Get-ChildItem $skillsDst -Directory).Count
        Write-Host "  ✓ $skillDirs skills copied" -ForegroundColor Green

        Write-Host ""
        Write-Host "=== Installation complete! ===" -ForegroundColor Green
        Write-Host "Next: Open $TargetDir in VS Code and use @planner in Copilot Chat." -ForegroundColor Cyan
    }

    'claude' {
        # Claude Code agents
        $agentsDst = Join-Path $TargetDir ".claude\agents"

        if (Test-Path $agentsDst -and -not $Force) {
            Write-Host "  .claude/agents/ exists (use -Force to overwrite)" -ForegroundColor Yellow
        } else {
            New-Item -ItemType Directory -Path $agentsDst -Force | Out-Null
            Copy-Item -Path "$SquadDir\.claude\agents\*" -Destination $agentsDst -Recurse -Force
            $count = (Get-ChildItem $agentsDst -Filter "*.md").Count
            Write-Host "  ✓ $count agents copied" -ForegroundColor Green
        }

        # Canonical skills
        $skillsDst = Join-Path $TargetDir ".agents\skills"
        New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.agents\skills\*" -Destination $skillsDst -Recurse -Force
        $skillDirs = (Get-ChildItem $skillsDst -Directory).Count
        Write-Host "  ✓ $skillDirs skills copied" -ForegroundColor Green

        # .claude/settings.json
        $settingsPath = Join-Path $TargetDir ".claude\settings.json"
        if (Test-Path $settingsPath) {
            Write-Host "  . .claude/settings.json exists (skipped)" -ForegroundColor Gray
        } else {
            New-Item -ItemType Directory -Path (Join-Path $TargetDir ".claude") -Force | Out-Null
            Copy-Item -Path (Join-Path $SquadDir ".claude\settings.json") -Destination $settingsPath
            Write-Host "  ✓ .claude/settings.json created" -ForegroundColor Green
        }

        # .workflow/ template
        New-Item -ItemType Directory -Path (Join-Path $TargetDir ".workflow\template") -Force | Out-Null
        $handoffTmpl = Join-Path $SquadDir ".workflow\template\handoff.md"
        if (Test-Path $handoffTmpl) {
            Copy-Item -Path $handoffTmpl -Destination (Join-Path $TargetDir ".workflow\template\") -Force
            Write-Host "  ✓ .workflow/ template created" -ForegroundColor Green
        }

        # AGENTS.md
        $agentsMd = Join-Path $TargetDir "AGENTS.md"
        if (Test-Path $agentsMd) {
            Write-Host "  . AGENTS.md exists (skipped)" -ForegroundColor Gray
        } else {
            Copy-Item -Path (Join-Path $SquadDir "AGENTS.md") -Destination $agentsMd
            Write-Host "  ✓ AGENTS.md created" -ForegroundColor Green
        }

        Write-Host ""
        Write-Host "=== Installation complete! ===" -ForegroundColor Green
        Write-Host "Next: Run 'claude' in $TargetDir and call @planner with your epic idea." -ForegroundColor Cyan
    }

    'devin' {
        # Backup root AGENTS.md
        $agentsMd = Join-Path $TargetDir "AGENTS.md"
        $backup = Join-Path $TargetDir "AGENTS.md.bak.opencode"
        if (Test-Path $agentsMd) {
            if ($Force -or -not (Test-Path $backup)) {
                Copy-Item -Path $agentsMd -Destination $backup -Force
                Write-Host "  ✓ Backed up AGENTS.md → AGENTS.md.bak.opencode" -ForegroundColor Green
            } else {
                Write-Host "  . AGENTS.md.bak.opencode exists (use -Force to re-backup)" -ForegroundColor Gray
            }
        }

        Copy-Item -Path (Join-Path $SquadDir ".devin\AGENTS.md") -Destination $agentsMd -Force
        Write-Host "  ✓ .devin/AGENTS.md → root AGENTS.md" -ForegroundColor Green

        # Devin skills
        $skillsDst = Join-Path $TargetDir ".devin\skills"
        New-Item -ItemType Directory -Path $skillsDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.devin\skills\*" -Destination $skillsDst -Recurse -Force
        $skillDirs = (Get-ChildItem $skillsDst -Directory).Count
        Write-Host "  ✓ $skillDirs Devin skills copied" -ForegroundColor Green

        # Devin bin
        $binDst = Join-Path $TargetDir ".devin\bin"
        New-Item -ItemType Directory -Path $binDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.devin\bin\*" -Destination $binDst -Force
        Write-Host "  ✓ .devin/bin/ scripts copied" -ForegroundColor Green

        # Config
        Copy-Item -Path (Join-Path $SquadDir ".devin\config.json") -Destination (Join-Path $TargetDir ".devin\config.json") -Force
        Write-Host "  ✓ .devin/config.json created" -ForegroundColor Green

        # Phases
        $phasesDst = Join-Path $TargetDir ".devin\phases"
        New-Item -ItemType Directory -Path $phasesDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.devin\phases\*" -Destination $phasesDst -Force
        Write-Host "  ✓ .devin/phases/ created" -ForegroundColor Green

        # README
        Copy-Item -Path (Join-Path $SquadDir ".devin\README.md") -Destination (Join-Path $TargetDir ".devin\README.md") -Force
        Write-Host "  ✓ .devin/README.md created" -ForegroundColor Green

        # Canonical skills
        $canonSkillsDst = Join-Path $TargetDir ".agents\skills"
        New-Item -ItemType Directory -Path $canonSkillsDst -Force | Out-Null
        Copy-Item -Path "$SquadDir\.agents\skills\*" -Destination $canonSkillsDst -Recurse -Force
        Write-Host "  ✓ canonical skills copied" -ForegroundColor Green

        Write-Host ""
        Write-Host "=== Installation complete! ===" -ForegroundColor Green
        Write-Host "Next: Run 'devin' in $TargetDir. The orchestrator (AGENTS.md) will" -ForegroundColor Cyan
        Write-Host "auto-invoke phase scripts." -ForegroundColor Cyan
        Write-Host "To restore opencode: install.ps1 $TargetDir -Target opencode" -ForegroundColor Cyan
        Write-Host "(restores AGENTS.md from AGENTS.md.bak.opencode)" -ForegroundColor Cyan
    }
}

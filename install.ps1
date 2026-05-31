#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Installs the orchestrated-squad agent workflow into a target project directory.
.DESCRIPTION
    Copies agents, skills, and config to enable the orchestrated-squad workflow
    (planner -> PM -> RR -> doc-writer -> tech-analyst -> issue-creator
     -> implementer + sre -> reviewer -> linter -> tester -> finisher)
.PARAMETER TargetDir
    Path to the target project directory (e.g., D:\projects\my-app)
.PARAMETER Force
    Overwrite existing files (except AGENTS.md and opencode.json)
.EXAMPLE
    .\install.ps1 D:\projects\my-app
    .\install.ps1 D:\projects\my-app -Force
#>

param(
    [Parameter(Mandatory)]
    [string]$TargetDir,

    [switch]$Force
)

$SquadDir = Split-Path -Parent $PSScriptRoot

# Validate
if (-not (Test-Path $TargetDir)) {
    Write-Error "Target directory not found: $TargetDir"
    exit 1
}

Write-Host "=== orchestrated-squad Install ===" -ForegroundColor Cyan
Write-Host "Installing into: $TargetDir" -ForegroundColor White

# 1. Agents
$agentsSource = Join-Path $SquadDir ".opencode\agents"
$agentsDest = Join-Path $TargetDir ".opencode\agents"

if (Test-Path $agentsDest -and -not $Force) {
    Write-Host "  .opencode/agents/ exists (use -Force to overwrite)" -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Path $agentsDest -Force | Out-Null
    Copy-Item -Path "$agentsSource\*" -Destination $agentsDest -Recurse -Force
    $count = (Get-ChildItem $agentsDest -Filter "*.md").Count
    Write-Host "  ✓ $count agents copied" -ForegroundColor Green
}

# 2. Skills
$skillsSource = Join-Path $SquadDir ".agents\skills"
$skillsDest = Join-Path $TargetDir ".agents\skills"

New-Item -ItemType Directory -Path $skillsDest -Force | Out-Null
Copy-Item -Path "$skillsSource\*" -Destination $skillsDest -Recurse -Force
$skillDirs = (Get-ChildItem $skillsDest -Directory).Count
Write-Host "  ✓ $skillDirs skills copied" -ForegroundColor Green

# 3. AGENTS.md (never overwrite)
$agentsMd = Join-Path $TargetDir "AGENTS.md"
if (Test-Path $agentsMd) {
    Write-Host "  . AGENTS.md exists (skipped)" -ForegroundColor Gray
} else {
    Copy-Item -Path (Join-Path $SquadDir "AGENTS.md") -Destination $agentsMd
    Write-Host "  ✓ AGENTS.md created" -ForegroundColor Green
}

# 4. .workflow/ template
$workflowDest = Join-Path $TargetDir ".workflow"
New-Item -ItemType Directory -Path $workflowDest -Force | Out-Null

$templateSource = Join-Path $SquadDir ".workflow\template\handoff.md"
$templateDest = Join-Path $workflowDest "template"
New-Item -ItemType Directory -Path $templateDest -Force | Out-Null
Copy-Item -Path $templateSource -Destination $templateDest -Force
Write-Host "  ✓ .workflow/ template created" -ForegroundColor Green

# 5. opencode.json (never overwrite)
$opencodeJson = Join-Path $TargetDir "opencode.json"
if (Test-Path $opencodeJson) {
    Write-Host "  . opencode.json exists (skipped)" -ForegroundColor Gray
} else {
    Copy-Item -Path (Join-Path $SquadDir "opencode.json") -Destination $opencodeJson
    Write-Host "  ✓ opencode.json created" -ForegroundColor Green
}

# 6. epic-guide.md
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

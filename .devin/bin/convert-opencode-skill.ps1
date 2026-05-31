#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Convert opencode skill → Devin CLI skill.
.PARAMETER SkillDir
    Path to opencode skill directory (containing SKILL.md).
.PARAMETER Model
    Devin model to use (default: sonnet).
.EXAMPLE
    .\convert-opencode-skill.ps1 .agents\skills\python-code-style
    .\convert-opencode-skill.ps1 .agents\skills\python-code-style -Model haiku
#>
param(
    [Parameter(Mandatory)]
    [string]$SkillDir,

    [string]$Model = "sonnet"
)

$devinSkillsDir = ".devin\skills"
$skillFile = Join-Path $SkillDir "SKILL.md"

if (-not (Test-Path $skillFile)) {
    Write-Error "SKILL.md not found in $SkillDir"
    exit 1
}

$skillName = Split-Path $SkillDir -Leaf
$dstDir = Join-Path $devinSkillsDir $skillName
New-Item -ItemType Directory -Path $dstDir -Force | Out-Null

# Read opencode SKILL.md
$content = Get-Content $skillFile -Raw

# Parse frontmatter
$frontmatter = $content -split '---' | Select-Object -Index 1
$body = ($content -split '---' | Select-Object -Index 2).Trim()

# Extract description
$descMatch = [regex]::Match($frontmatter, 'description:\s*(.+)')
$description = if ($descMatch.Success) { $descMatch.Groups[1].Value.Trim() } else { "Skill converted from opencode" }

# Determine tools
$tools = @("read", "grep", "glob")
if ($frontmatter -match 'edit:.*allow') { $tools += "edit" }
if ($frontmatter -match 'bash:.*allow') { $tools += "exec" }
if ($frontmatter -match 'webfetch:.*allow') { $tools += "web" }

# Build Devin SKILL.md
$devinSkill = @"
---
name: $skillName
description: $description
subagent: true
model: $Model
allowed-tools:
$(($tools | ForEach-Object { "  - $_" }) -join "`n")
triggers:
  - user
  - model
---

$body
"@

$dstFile = Join-Path $dstDir "SKILL.md"
Set-Content -Path $dstFile -Value $devinSkill -NoNewline

Write-Host "✓ Converted $skillName → $dstFile" -ForegroundColor Green

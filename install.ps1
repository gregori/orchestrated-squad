#!/usr/bin/env pwsh
<#
.SYNOPSIS
Compatibility wrapper for the portable `squad` installer.
.DESCRIPTION
All installation behavior lives in scripts/squad.mjs so PowerShell, Bash and
the npm executable install the same artifact tree.
#>
param(
    [Parameter(Mandatory)] [string]$TargetDir,
    [ValidateSet('opencode', 'vscode', 'devin', 'claude', 'codex', 'all')] [string]$Target = 'opencode',
    [switch]$Force,
    [switch]$NoInit,
    [switch]$DryRun
)

$arguments = @((Join-Path $PSScriptRoot 'scripts\squad.mjs'), 'install', '--dir', $TargetDir, '--target', $Target, '--yes')
if ($Force) { $arguments += '--force' }
if ($NoInit) { $arguments += '--no-init' }
if ($DryRun) { $arguments += '--dry-run' }
& node @arguments
exit $LASTEXITCODE

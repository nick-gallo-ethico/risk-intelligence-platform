# Ralph Loop - Fresh Context Each Iteration
# Uses --print flag for non-interactive mode
#
# Usage:
#   .\scripts\ralph-loop.ps1 [-MaxIterations 10]
#

param(
    [string]$PromptFile = "PROMPT.md",
    [int]$MaxIterations = 10
)

if (-not (Test-Path $PromptFile)) {
    Write-Host "Error: '$PromptFile' not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "RALPH LOOP - Fresh Context Mode" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Prompt: $PromptFile"
Write-Host "Max iterations: $MaxIterations"
Write-Host ""

$confirm = Read-Host "Start? (y/n)"
if ($confirm -notmatch "^[Yy]") {
    exit 0
}

$Iteration = 0

while ($Iteration -lt $MaxIterations) {
    $Iteration++

    Write-Host ""
    Write-Host "===== ITERATION $Iteration of $MaxIterations =====" -ForegroundColor Green
    Write-Host "$(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray
    Write-Host ""

    # Read prompt content
    $prompt = Get-Content $PromptFile -Raw

    # Run Claude in print mode (non-interactive)
    # --print (-p) outputs response and exits
    # --dangerously-skip-permissions for automation
    claude --print --dangerously-skip-permissions $prompt

    Write-Host ""
    Write-Host "Iteration $Iteration complete." -ForegroundColor Green

    # Show what changed
    $changes = git status --porcelain 2>$null
    if ($changes) {
        Write-Host "Modified:" -ForegroundColor DarkGray
        $changes | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }

    if ($Iteration -lt $MaxIterations) {
        Write-Host ""
        Write-Host "Next in 5s... (Ctrl+C to stop)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

Write-Host ""
Write-Host "===== COMPLETE ($Iteration iterations) =====" -ForegroundColor Cyan

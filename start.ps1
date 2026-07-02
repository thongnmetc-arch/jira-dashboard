# JIRA Dashboard - Dev Startup Script
# Run: .\start.ps1

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  JIRA Dashboard - Starting Dev Environment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1/3] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = & node -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "       ERROR: Node.js not found. Download at https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "       Node.js $nodeVersion - OK" -ForegroundColor Green

# Step 2: Install dependencies if needed
Write-Host "[2/3] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "       Installing dependencies (npm install)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "       ERROR: Install failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "       Install complete!" -ForegroundColor Green
} else {
    Write-Host "       node_modules exists - OK" -ForegroundColor Green
}

# Step 3: Start dev server
Write-Host "[3/3] Starting Vite dev server..." -ForegroundColor Yellow
Write-Host ""

# Open browser after server starts
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
} | Out-Null

Write-Host "       Server: http://localhost:5173" -ForegroundColor Cyan
Write-Host "       Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Run dev server
npm run dev

Write-Host ""
Write-Host "Dev server stopped." -ForegroundColor Gray

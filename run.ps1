# ========================================================
#          PARKORBIT PUNE - 1-CLICK LAUNCHER
#   Peer-to-Peer Urban Parking Marketplace (PowerShell)
# ========================================================

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         PARKORBIT PUNE - 1-CLICK LAUNCHER" -ForegroundColor White
Write-Host "  Peer-to-Peer Urban Parking Marketplace (Pune Pilot)" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is NOT installed on this computer!" -ForegroundColor Red
    Write-Host "Please download and install Node.js LTS (v18, v20, or v22) from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVer = & node -v
Write-Host "[OK] Node.js detected: $nodeVer" -ForegroundColor Green

# 2. Check and initialize .env.local
if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
    Write-Host "[INFO] Creating .env.local from default template..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env.local"
}

# 3. Check dependencies
if (-not (Test-Path "node_modules\next\package.json")) {
    Write-Host ""
    Write-Host "[INFO] First-time setup detected: Installing project dependencies..." -ForegroundColor Cyan
    Write-Host "This may take 1-2 minutes depending on internet speed..." -ForegroundColor Gray
    & npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Dependency installation failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Dependencies successfully installed." -ForegroundColor Green
} else {
    Write-Host "[OK] Project dependencies present." -ForegroundColor Green
}

# 4. Run pre-flight verification
& node scripts/setup.mjs
if ($LASTEXITCODE -ne 0) {
    Read-Host "Press Enter to exit"
    exit 1
}

# 5. Open browser after 4 seconds in background job
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:3000"
} | Out-Null

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting ParkOrbit Dev Server on http://localhost:3000" -ForegroundColor Green
Write-Host " Press Ctrl+C at any time in this terminal to stop." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

& npx next dev

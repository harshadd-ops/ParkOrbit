@echo off
setlocal enabledelayedexpansion

:: Ensure working directory is always the repository root
cd /d "%~dp0"

title ParkOrbit - P2P Urban Parking Marketplace
color 0F

echo ========================================================
echo          PARKORBIT PUNE - 1-CLICK LAUNCHER
echo   Peer-to-Peer Urban Parking Marketplace (Pune Pilot)
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is NOT installed on this computer!
    echo.
    echo Please download and install Node.js LTS (v18, v20, or v22) from:
    echo https://nodejs.org/
    echo.
    echo After installing Node.js, double-click this script again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js detected: !NODE_VERSION!

:: 2. Check and initialize .env.local
if not exist ".env.local" (
    if exist ".env.example" (
        echo [INFO] Creating .env.local from default template...
        copy /Y ".env.example" ".env.local" >nul
    )
)

:: 3. Check node_modules & core packages
if not exist "node_modules\next\package.json" (
    echo.
    echo [INFO] First-time setup detected: Installing project dependencies...
    echo This may take 1-2 minutes depending on internet speed...
    echo.
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERROR] Dependency installation failed! Please check your internet connection.
        pause
        exit /b 1
    )
    echo [OK] Dependencies successfully installed.
) else (
    echo [OK] Project dependencies present.
)

:: 4. Run environment & database verification
call node scripts/setup.mjs
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Pre-flight check failed.
    pause
    exit /b 1
)

:: 5. Auto-launch browser in background after 4 seconds
start /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

echo.
echo ========================================================
echo  Starting ParkOrbit Dev Server on http://localhost:3000
echo  Press Ctrl+C at any time in this window to stop.
echo ========================================================
echo.

call npx next dev

pause

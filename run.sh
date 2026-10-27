#!/usr/bin/env bash

# ========================================================
#          PARKORBIT PUNE - 1-CLICK LAUNCHER
#   Peer-to-Peer Urban Parking Marketplace (macOS / Linux)
# ========================================================

set -e

# Change directory to script folder
cd "$(dirname "$0")"

echo "========================================================"
echo "         PARKORBIT PUNE - 1-CLICK LAUNCHER"
echo "  Peer-to-Peer Urban Parking Marketplace (Pune Pilot)"
echo "========================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ [ERROR] Node.js is NOT installed on this computer!"
    echo ""
    echo "Please download and install Node.js LTS (v18, v20, or v22):"
    echo "  - macOS (Homebrew): brew install node"
    echo "  - Linux (Ubuntu/Debian): sudo apt update && sudo apt install -y nodejs npm"
    echo "  - Official installer: https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ [OK] Node.js detected: $NODE_VERSION"

# 2. Check and initialize .env.local
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
    echo "ℹ️  [INFO] Creating .env.local from default template..."
    cp .env.example .env.local
fi

# 3. Check dependencies
if [ ! -f "node_modules/next/package.json" ]; then
    echo ""
    echo "ℹ️  [INFO] First-time setup detected: Installing project dependencies..."
    echo "This may take 1-2 minutes depending on internet speed..."
    echo ""
    npm install --legacy-peer-deps
    echo "✅ [OK] Dependencies successfully installed."
else
    echo "✅ [OK] Project dependencies present."
fi

# 4. Run environment & database verification
node scripts/setup.mjs

# 5. Auto-launch browser in background
(
  sleep 4
  if command -v open &> /dev/null; then
    open "http://localhost:3000"
  elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"
  fi
) &

echo ""
echo "========================================================"
echo " 🚀 Starting ParkOrbit Dev Server on http://localhost:3000"
echo " Press Ctrl+C at any time in this terminal to stop."
echo "========================================================"
echo ""

npx next dev

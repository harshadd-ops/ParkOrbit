#!/usr/bin/env node

/**
 * ParkOrbit — Universal Cross-Platform Environment & Dependency Doctor
 * Runs automatically before `npm run dev` or manually via `npm run setup`.
 * Works on Windows, macOS, and Linux with zero external dependencies.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function logOk(msg) {
  console.log(`${GREEN}[OK]${RESET} ${msg}`);
}

function logInfo(msg) {
  console.log(`${CYAN}[INFO]${RESET} ${msg}`);
}

function logWarn(msg) {
  console.log(`${YELLOW}[WARN]${RESET} ${msg}`);
}

function logError(msg) {
  console.error(`${RED}[ERROR]${RESET} ${msg}`);
}

function main() {
  console.log(
    `\n${BOLD}=== ParkOrbit Pune — Environment & Pre-Flight Check ===${RESET}`
  );

  // 1. Verify Node.js version
  const nodeVersion = process.versions.node;
  const [major, minor] = nodeVersion.split(".").map(Number);
  if (major < 18 || (major === 18 && minor < 18)) {
    logError(
      `Node.js v${nodeVersion} detected. Next.js 15 requires Node.js >= 18.18.0 (v20 LTS or v22 LTS recommended).`
    );
    logInfo("Download the latest Node.js LTS from https://nodejs.org/");
    process.exit(1);
  }
  logOk(`Node.js runtime verified: v${nodeVersion} (${process.platform}/${process.arch})`);

  // 2. Ensure .env.local exists
  const envLocalPath = path.join(ROOT_DIR, ".env.local");
  const envExamplePath = path.join(ROOT_DIR, ".env.example");
  if (!fs.existsSync(envLocalPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envLocalPath);
      logInfo("Created .env.local from .env.example template (zero external API keys required).");
    } else {
      const defaultEnv = [
        'PARKORBIT_DB_PATH="./data/parkorbit-db.json"',
        'PLATFORM_COMMISSION_PERCENT="12"',
        'DRIVER_SERVICE_FEE_PERCENT="5"',
        'PAYMENT_PROVIDER_MODE="simulated_test"',
        'PAYOUT_PROVIDER_MODE="estimated_pending"',
        'NEXT_PUBLIC_MAP_PROVIDER="interactive_orbit"',
        'SESSION_SECRET="parkorbit-dev-secret-change-in-production"',
        "",
      ].join("\n");
      fs.writeFileSync(envLocalPath, defaultEnv, "utf-8");
      logInfo("Created default .env.local configuration.");
    }
  } else {
    logOk("Environment configuration (.env.local) present.");
  }

  // 3. Ensure data directory and database file integrity
  const dataDir = path.join(ROOT_DIR, "data");
  const dbFilePath = path.join(dataDir, "parkorbit-db.json");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logInfo("Created ./data directory for local JSON database.");
  }

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.listings) || !Array.isArray(parsed.users)) {
        logWarn("Database schema incomplete; removes corrupt file so auto-seeder can rebuild it.");
        fs.unlinkSync(dbFilePath);
      } else {
        logOk(
          `Local JSON database verified (${parsed.listings.length} Pune listings, ${parsed.users.length} personas).`
        );
      }
    } catch {
      logWarn("Corrupted data/parkorbit-db.json detected; resetting for clean auto-seed.");
      try {
        fs.unlinkSync(dbFilePath);
      } catch {
        // ignore
      }
    }
  } else {
    logInfo("Database file will be auto-seeded with Pune listings on first request.");
  }

  // 4. Verify critical packages exist in node_modules
  const requiredPackages = ["next", "react", "react-dom", "leaflet", "react-leaflet", "lucide-react", "zod"];
  const missingPackages = requiredPackages.filter(
    (pkg) => !fs.existsSync(path.join(ROOT_DIR, "node_modules", pkg, "package.json"))
  );

  if (missingPackages.length > 0) {
    logError(`Missing node_modules packages: ${missingPackages.join(", ")}`);
    logInfo("Please run: npm install");
    process.exit(1);
  }
  logOk("All required npm dependencies are installed and ready.");
  console.log(`${BOLD}=======================================================${RESET}\n`);
}

main();

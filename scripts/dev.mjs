#!/usr/bin/env node
/**
 * Dev server launcher with WSL2 esbuild EPIPE workaround.
 *
 * In WSL2, esbuild's native Go service crashes with EPIPE during
 * dependency scanning. This script detects WSL2 and forces esbuild-wasm
 * as the binary, which uses a WASM-based transform that doesn't have
 * the pipe issue.
 *
 * On native Linux/macOS, it uses the faster native esbuild binary.
 */

import { execSync, spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Check if running under WSL2
const isWSL2 = (() => {
  try {
    const release = execSync("uname -r", { encoding: "utf8" }).trim();
    return release.includes("microsoft-standard-WSL2");
  } catch {
    return false;
  }
})();

// Run predev checks
execSync("node scripts/git-info.mjs && node scripts/check-rom-assets.mjs", {
  cwd: root,
  stdio: "inherit",
});

// Set up environment
const env = { ...process.env };

if (isWSL2) {
  // Force esbuild-wasm to avoid EPIPE crashes in WSL2
  try {
    const wasmPath = resolve(
      root,
      "node_modules/esbuild-wasm/bin/esbuild"
    );
    env.ESBUILD_BINARY_PATH = wasmPath;
    console.log("[dev] WSL2 detected — using esbuild-wasm to avoid EPIPE crashes");
  } catch {
    console.warn("[dev] WSL2 detected but esbuild-wasm not found — native esbuild may crash");
  }
} else {
  console.log("[dev] Native environment — using esbuild native binary");
}

// Spawn Vite
const args = ["--host", "0.0.0.0", "--port", "5178", ...process.argv.slice(2)];
const child = spawn("node", [resolve(root, "node_modules/.bin/vite"), ...args], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
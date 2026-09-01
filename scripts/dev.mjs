#!/usr/bin/env node
/**
 * Dev server launcher with WSL2 esbuild EPIPE workaround.
 *
 * In WSL2 (kernel 6.18+), esbuild's native Go service crashes with EPIPE
 * during Vite's dependency scanning and transform phases. This makes the
 * Vite dev server unusable — pages render blank because transforms fail.
 *
 * This script detects WSL2 and falls back to `vite build --watch` + `serve`
 * for reliable hot-reload development. On native Linux/macOS, it uses the
 * standard `vite dev` server which is faster.
 *
 * Usage: `npm run dev` (configured in package.json)
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

const env = { ...process.env };

if (isWSL2) {
  console.log("[dev] WSL2 detected — using build+watch+serve (esbuild EPIPE workaround)");
  console.log("[dev] Hot reload via vite build --watch, serving from dist/");

  // Clean dist and do initial build
  execSync("npm run build", { cwd: root, stdio: "inherit", env });

  // Start serve in background
  const serve = spawn("npx", ["-y", "serve", "dist", "-l", "5178", "-s"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  // Start vite build --watch
  const watcher = spawn("node", [resolve(root, "node_modules/.bin/vite"), "build", "--watch"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  const cleanup = () => {
    serve.kill("SIGTERM");
    watcher.kill("SIGTERM");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  watcher.on("exit", (code) => {
    serve.kill("SIGTERM");
    process.exit(code ?? 0);
  });

  serve.on("exit", () => {
    watcher.kill("SIGTERM");
    process.exit(1);
  });
} else {
  console.log("[dev] Native environment — using vite dev server");

  // Standard vite dev server (fast HMR)
  const args = ["--host", "0.0.0.0", "--port", "5178", ...process.argv.slice(2)];
  const child = spawn("node", [resolve(root, "node_modules/.bin/vite"), ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
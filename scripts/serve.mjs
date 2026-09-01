#!/usr/bin/env node
/**
 * Persistent static file server for DBZ LSW Fangame.
 * Serves the production build from dist/ on port 5178.
 * Usage: node scripts/serve.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const DIST = resolve(__dirname, "..", "dist");
const PORT = 5178;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".map": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    let url = (req.url || "/").split("?")[0];
    if (url === "/") url = "/index.html";

    const filePath = join(DIST, url);

    // Security: prevent path traversal
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let data;
    try {
      data = await readFile(filePath);
    } catch {
      // SPA fallback: serve index.html for unknown routes
      try {
        data = await readFile(join(DIST, "index.html"));
        url = "/index.html";
      } catch {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
    }

    const ext = extname(url);
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end("Internal server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🐉 DBZ LSW Fangame — http://localhost:${PORT}`);
  console.log(`   Serving from: ${DIST}`);
  console.log(`   Press Ctrl+C to stop`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use. Kill existing process and try again.`);
    process.exit(1);
  }
  throw err;
});
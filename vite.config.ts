import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Middleware de desarrollo: permite al Dev Studio escribir assets
// (manifest.json / sprites PNG) directamente en public/assets.
// Ruta objetivo restringida a public/assets para evitar path traversal.
function devWritePlugin(): Plugin {
  return {
    name: "dev-write-assets",
    configureServer(server) {
      server.middlewares.use("/__dev/write", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        let body = "";
        req.on("data", (c) => { body += c; });
        req.on("end", () => {
          try {
            const { rel, data } = JSON.parse(body);
            if (typeof rel !== "string" || typeof data !== "string") {
              res.statusCode = 400;
              res.end("bad payload");
              return;
            }
            const base = resolve(rootDir, "public", "assets");
            const target = resolve(base, rel);
            if (!target.startsWith(base + "/") && target !== base) {
              res.statusCode = 400;
              res.end("path outside assets");
              return;
            }
            if (!/\.(json|png)$/.test(target)) {
              res.statusCode = 400;
              res.end("extension not allowed");
              return;
            }
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, Buffer.from(data, "base64"));
            res.statusCode = 200;
            res.end("ok");
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devWritePlugin()],
  server: {
    port: 5178
  }
});

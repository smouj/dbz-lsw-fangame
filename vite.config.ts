import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// ─── Flip PNG horizontal exacto (píxel a píxel, sin deps) ────
// Decodifica el PNG (sin interlacing), invierte cada fila de píxeles y
// re-empaqueta con filtro None. Conserva TODOS los bytes originales
// (incluido RGB de píxeles alpha=0, que canvas 2D destruiría).
function pngFlipHorizontal(buf: Buffer): Buffer {
  if (buf.length < 8 || buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("no es un PNG");
  }
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    }
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2 && colorType !== 0 && colorType !== 3)) {
    throw new Error(`formato PNG no soportado (bitDepth=${bitDepth} colorType=${colorType})`);
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const rowLen = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  // unfilter (None/Sub/Up/Average/Paeth)
  const px = Buffer.alloc(height * rowLen);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src];
    const row = y * rowLen;
    for (let x = 0; x < rowLen; x++) {
      const cur = raw[src + 1 + x];
      const left = x >= bpp ? px[row + x - bpp] : 0;
      const up = y > 0 ? px[row - rowLen + x] : 0;
      const ul = x >= bpp && y > 0 ? px[row - rowLen + x - bpp] : 0;
      let v = cur;
      if (filter === 1) v = (v + left) & 0xff;
      else if (filter === 2) v = (v + up) & 0xff;
      else if (filter === 3) v = (v + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        v = (v + pred) & 0xff;
      }
      px[row + x] = v;
    }
    src += 1 + rowLen;
  }
  // flip horizontal: invertir el orden de píxeles de cada fila
  const out = Buffer.alloc(height * (1 + rowLen)); // filtro None
  for (let y = 0; y < height; y++) {
    const row = y * rowLen;
    const orow = y * (1 + rowLen);
    out[orow] = 0;
    for (let x = 0; x < width; x++) {
      const dst = row + x * bpp;
      const s = row + (width - 1 - x) * bpp;
      for (let k = 0; k < bpp; k++) out[orow + 1 + x * bpp + k] = px[s + k];
    }
  }
  const newIdat = deflateSync(out);
  // re-empaquetar: firma + IHDR original + IDAT nuevo + IEND
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const chunk = (type: string, data: Buffer) => {
    const c = Buffer.alloc(12 + data.length);
    c.writeUInt32BE(data.length, 0);
    c.write(type, 4, "ascii");
    data.copy(c, 8);
    let crc = 0xffffffff;
    const crcTable: number[] = [];
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      crcTable[n] = cc >>> 0;
    }
    const update = (b: Buffer) => {
      for (const byte of b) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    };
    update(Buffer.from(type, "ascii"));
    update(data);
    c.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
    return c;
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", newIdat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Middleware de desarrollo: permite al Dev Studio escribir assets
// (manifest.json / sprites PNG) directamente en public/assets.
// Ruta objetivo restringida a public/assets para evitar path traversal.
function devWritePlugin(): Plugin {
  return {
    name: "dev-write-assets",
    configureServer(server) {
      // POST /__dev/flip { rel } → voltea horizontalmente el PNG en disco
      server.middlewares.use("/__dev/flip", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("POST only");
          return;
        }
        let body = "";
        req.on("data", (c) => { body += c; });
        req.on("end", () => {
          try {
            const { rel } = JSON.parse(body);
            if (typeof rel !== "string") {
              res.statusCode = 400;
              res.end("bad payload");
              return;
            }
            const base = resolve(rootDir, "public", "assets");
            const target = resolve(base, rel);
            if (!target.startsWith(base + "/")) {
              res.statusCode = 400;
              res.end("path outside assets");
              return;
            }
            if (!target.endsWith(".png")) {
              res.statusCode = 400;
              res.end("extension not allowed");
              return;
            }
            const buf = readFileSync(target);
            const flipped = pngFlipHorizontal(buf);
            writeFileSync(target, flipped);
            res.statusCode = 200;
            res.end("ok");
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
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

export default defineConfig(({ mode }) => ({
  plugins: [react(), devWritePlugin()],
  server: {
    port: 5178
  },
  // En release, el Dev Studio se sustituye por un stub vacío: no entra
  // en el bundle ni se genera su chunk (política DEV_ONLY → producción).
  ...(mode === 'release' ? {
    resolve: {
      alias: [
        { find: './devtools/DevStudio', replacement: resolve(rootDir, 'src/devtools/DevStudioStub.tsx') },
      ],
    },
  } : {}),
}));

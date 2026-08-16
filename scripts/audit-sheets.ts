// ═══════════════════════════════════════════════════════════
// DBZ LSW — Auditoría de sheets ROM (fondo cyan sin limpiar)
// Detecta sheets extraídos con el fondo GBC (cyan puro 0,255,255) sin
// convertir a transparente — el bug que mostraba bloques cyan en el
// "ROM sheet ref" del Dev Studio Character Studio (9 sheets corruptos
// corregidos el 2026-08-16).
// Ejecutar: npm run audit:sheets
// ═══════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function decodePng(p: string): { data: Buffer; w: number; h: number } | null {
  const buf = fs.readFileSync(p);
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let pos = 8, w = 0, h = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bpp = channels, stride = w * bpp;
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride), inPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[inPos++];
    const line = Buffer.from(raw.subarray(inPos, inPos + stride));
    inPos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let val = line[x];
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = (val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      line[x] = val;
    }
    for (let x = 0; x < stride; x++) {
      const ch = x % bpp;
      const px = Math.floor(x / bpp);
      if (channels === 4) out[(y * w + px) * 4 + ch] = line[x];
      else if (channels === 3) {
        out[(y * w + px) * 4 + ch] = line[x];
        if (ch === 2) out[(y * w + px) * 4 + 3] = 255;
      } else {
        out[(y * w + px) * 4] = line[x];
        out[(y * w + px) * 4 + 1] = line[x];
        out[(y * w + px) * 4 + 2] = line[x];
        out[(y * w + px) * 4 + 3] = 255;
      }
    }
    prev = line;
  }
  return { data: out, w, h };
}

let failures = 0;
const sheetsDir = path.join('public/assets/sheets');
if (!fs.existsSync(sheetsDir)) {
  console.log('No hay directorio de sheets — OK');
  process.exit(0);
}
const files = fs.readdirSync(sheetsDir).filter(f => f.endsWith('.png'));
console.log(`Auditando ${files.length} sheets...`);
for (const f of files) {
  const img = decodePng(path.join(sheetsDir, f));
  if (!img) continue;
  const n = img.w * img.h;
  let cyan = 0, sampled = 0;
  for (let i = 0; i < n; i += 4) {
    const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2];
    if (r < 30 && g > 200 && b > 200) cyan++;
    sampled++;
  }
  const pct = (cyan / Math.max(1, sampled)) * 100;
  if (pct > 10) {
    failures++;
    console.log(`FAIL sheet:${f} — ${pct.toFixed(0)}% cyan puro (fondo GBC sin limpiar)`);
  }
}
console.log(failures === 0 ? 'SHEETS OK ✅ (ninguno con fondo cyan)' : `${failures} sheets con cyan ❌`);
process.exit(failures === 0 ? 0 : 1);

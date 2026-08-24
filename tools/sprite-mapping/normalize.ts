// ═══════════════════════════════════════════════════════════════════════
// S-MAP2 — sprite-mapping/normalize.ts
// Normalizador EXACTO con la MISMA gramática que R2.4 (reconcile-physical):
//   RGBA → alpha==0 → RGB=0 → alpha bbox → crop exacto → hash(w,h,RGBA)
// + opaqueMaskHash (geometría alpha). Sin resize/flip/remap/fuzzy.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';

export function normalizePhysicalFrame(pngPath: string): {
  width: number; height: number; normalizedWidth: number; normalizedHeight: number;
  alphaBBox: { x: number; y: number; w: number; h: number };
  normalizedPixelHash: string; opaqueMaskHash: string; sourceFileHash: string;
} | null {
  try {
    const png = PNG.sync.read(readFileSync(pngPath));
    const W = png.width, H = png.height;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = png.data[(y * W + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null; // totalmente transparente
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const rgba = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const sx = minX + x, sy = minY + y;
        const si = (sy * W + sx) * 4, di = (y * cw + x) * 4;
        const a = png.data[si + 3];
        rgba[di] = a === 0 ? 0 : png.data[si];
        rgba[di + 1] = a === 0 ? 0 : png.data[si + 1];
        rgba[di + 2] = a === 0 ? 0 : png.data[si + 2];
        rgba[di + 3] = a;
      }
    }
    const h = (buf: Buffer) => createHash('md5').update(buf).digest('hex').slice(0, 16);
    const mask = Buffer.alloc(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) mask[y * cw + x] = png.data[((minY + y) * W + minX + x) * 4 + 3] > 0 ? 1 : 0;
    return {
      width: W, height: H, normalizedWidth: cw, normalizedHeight: ch,
      alphaBBox: { x: minX, y: minY, w: cw, h: ch },
      normalizedPixelHash: h(Buffer.concat([Buffer.from([cw, ch]), rgba])),
      opaqueMaskHash: h(mask),
      sourceFileHash: h(readFileSync(pngPath)),
    };
  } catch {
    return null;
  }
}

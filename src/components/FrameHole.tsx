// ═══════════════════════════════════════════════════════════════════════
// FrameHole — posiciona el arte EXACTAMENTE dentro del hueco interior real
// de cada frame GBC.
//
// PROBLEMA: los frames del paquete (48×40 → 96×80) tienen el hueco interior
// (donde se ve el arte) en posiciones LIGERAMENTE distintas entre sí (los
// marcos diagonales de las esquinas varían 1px). Si la caja del arte es fija
// (top 18, left 18, 64×48), en unos frames el arte se sale/tapa el marco y
// en otros queda 1px desplazado — por eso JOINT, STAGE y LIMIT se veían
// distintos aunque compartieran CSS.
//
// SOLUCIÓN: medir el bbox del hueco interior REAL de cada frame (flood fill
// desde el centro de la zona clara) y posicionar la caja del arte
// EXACTAMENTE en ese hueco. JOINT/STAGE/LIMIT usan el MISMO cálculo → todos
// quedan perfectos contra SU frame, sin gap ni desplazamiento.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export interface FrameHole {
  left: number;  // px a 2× (carta 96×80)
  top: number;
  width: number;
  height: number;
}

const cache = new Map<string, FrameHole | null>();

function measureHole(frameUrl: string): FrameHole | null {
  const img = new Image();
  img.src = frameUrl;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, c.width, c.height);
  // Zona CLARA y poco saturada = hueco del arte (el marco es oscuro o color)
  const isLight = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], al = data[i + 3];
    if (al < 40) return false;
    const lum = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    return lum > 140 && sat < 70;
  };
  // Flood fill desde el centro
  const visited = new Uint8Array(w * h);
  const stack: Array<[number, number]> = [[h >> 1, w >> 1]];
  const pts: Array<[number, number]> = [];
  while (stack.length) {
    const [y, x] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!isLight(x, y)) continue;
    pts.push([x, y]);
    stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
  }
  if (!pts.length) return null;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // Escala 2× (48×40 → 96×80): el hueco se duplica
  return { left: x0 * 2, top: y0 * 2, width: (x1 - x0 + 1) * 2, height: (y1 - y0 + 1) * 2 };
}

/** Hook: hueco interior real de un frame (2×), cacheado por URL. */
export function useFrameHole(frameUrl: string | undefined): FrameHole | null {
  const [hole, setHole] = useState<FrameHole | null>(() =>
    frameUrl ? (cache.get(frameUrl) ?? null) : null
  );
  useEffect(() => {
    if (!frameUrl) { setHole(null); return; }
    if (cache.has(frameUrl)) { setHole(cache.get(frameUrl) ?? null); return; }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const h = measureHole(frameUrl);
      cache.set(frameUrl, h);
      if (alive) setHole(h);
    };
    img.src = frameUrl;
    return () => { alive = false; };
  }, [frameUrl]);
  return hole;
}

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
  // El interior del frame es la zona CLARA/poco saturada; el MARCO es
  // oscuro o de color saturado. El arte debe llenar TODO el interior (hasta
  // el borde interior del marco) — NO solo el centro: los frames del
  // paquete tienen marcos de grosor distinto (blue: 1px, special: 9px) y
  // por eso una caja fija 64×48 se veía desplazada en STAGE/LIMIT.
  const isMarco = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], al = data[i + 3];
    if (al < 40) return true;           // fuera del frame = marco
    const lum = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    return lum < 90 || sat > 70;        // oscuro o saturado = marco
  };
  const colIsMarco = (x: number) => {
    for (let y = 0; y < h; y++) if (!isMarco(x, y)) return false;
    return true;
  };
  const rowIsMarco = (y: number) => {
    for (let x = 0; x < w; x++) if (!isMarco(x, y)) return false;
    return true;
  };
  // Interior completo: primera fila/columna SIN marco desde cada borde
  let left = 0;
  while (left < w && colIsMarco(left)) left++;
  let right = w - 1;
  while (right >= 0 && colIsMarco(right)) right--;
  let top = 0;
  while (top < h && rowIsMarco(top)) top++;
  let bottom = h - 1;
  while (bottom >= 0 && rowIsMarco(bottom)) bottom--;
  if (right < left || bottom < top) return null;
  // Escala 2× (48×40 → 96×80): el interior se duplica
  return { left: left * 2, top: top * 2, width: (right - left + 1) * 2, height: (bottom - top + 1) * 2 };
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

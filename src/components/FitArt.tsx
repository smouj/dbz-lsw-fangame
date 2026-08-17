// ═══════════════════════════════════════════════════════════
// FitArt — encaja una imagen PIXEL-PERFECT en un área
// Calcula el bounding box del contenido visible (alpha>0) del PNG
// y lo centra/escala para llenar el área interior del marco GBC
// SIN deformar y SIN márgenes internos irregulares del propio PNG.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

export interface FitPos {
  w: number;
  h: number;
  left: number;
  top: number;
}

export function fitBBox(img: HTMLImageElement, areaW: number, areaH: number, centerBy: 'bbox' | 'centroid' = 'bbox'): FitPos {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { w: areaW, h: areaH, left: 0, top: 0 };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  let gx = 0, gy = 0, n = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const a = data[(y * c.width + x) * 4 + 3];
      if (a > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        gx += x * a; gy += y * a; n += a;
      }
    }
  }
  if (x1 < x0) return { w: areaW, h: areaH, left: 0, top: 0 };
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  // Escala del contenido para CUBRIR el área completa (cover): el arte
  // rellena TODO el interior del marco (recorte mínimo y centrado).
  const scale = Math.max(areaW / bw, areaH / bh);
  const w = Math.max(1, Math.round(c.width * scale));
  const h = Math.max(1, Math.round(c.height * scale));
  if (centerBy === 'centroid') {
    // Centra por el CENTROIDE del contenido visible (peso óptico real):
    // muchos PNG del GBC tienen el dibujo desplazado unos píxeles dentro
    // del canvas (p.ej. card_001: centroide 2px arriba del centro del
    // bbox) — centrar el bbox dejaba el arte descentrado a la vista.
    const cxm = gx / n;
    const cym = gy / n;
    const left = Math.round(areaW / 2 - cxm * scale);
    const top = Math.round(areaH / 2 - cym * scale);
    return { w, h, left, top };
  }
  // Centrar el CONTENIDO real (bbox), no el canvas del PNG
  const left = Math.round((areaW - bw * scale) / 2 - x0 * scale);
  const top = Math.round((areaH - bh * scale) / 2 - y0 * scale);
  return { w, h, left, top };
}

export function FitArt({ src, areaW, areaH, className, centerBy }: {
  src: string;
  areaW: number;
  areaH: number;
  className?: string;
  centerBy?: 'bbox' | 'centroid';
}) {
  const [pos, setPos] = useState<FitPos | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setPos(fitBBox(img, areaW, areaH, centerBy)); };
    img.src = src;
    return () => { alive = false; };
  }, [src, areaW, areaH, centerBy]);
  if (!pos) return null;
  return (
    <img src={src} alt="" className={className}
      style={{ width: pos.w, height: pos.h, left: pos.left, top: pos.top, position: 'absolute' }} />
  );
}

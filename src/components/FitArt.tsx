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

export function fitBBox(img: HTMLImageElement, areaW: number, areaH: number): FitPos {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { w: areaW, h: areaH, left: 0, top: 0 };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
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
  // Centrar el CONTENIDO real (bbox), no el canvas del PNG
  const left = Math.round((areaW - bw * scale) / 2 - x0 * scale);
  const top = Math.round((areaH - bh * scale) / 2 - y0 * scale);
  return { w, h, left, top };
}

export function FitArt({ src, areaW, areaH, className }: {
  src: string;
  areaW: number;
  areaH: number;
  className?: string;
}) {
  const [pos, setPos] = useState<FitPos | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setPos(fitBBox(img, areaW, areaH)); };
    img.src = src;
    return () => { alive = false; };
  }, [src, areaW, areaH]);
  if (!pos) return null;
  return (
    <img src={src} alt="" className={className}
      style={{ width: pos.w, height: pos.h, left: pos.left, top: pos.top, position: 'absolute' }} />
  );
}

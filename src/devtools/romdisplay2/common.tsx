// ROM Display Lab 2.0 — helpers comunes: zoom pixel-perfect, fondo,
// grid, pills de mapeo, swatches de paleta y filas de ficha.
import { useEffect, useRef, useState } from 'react';

export type MappingStatus = 'EXACT' | 'RUNTIME' | 'SHARED' | 'COMPOSITE' | 'FALLBACK' | 'UNRESOLVED';

const STATUS_COLORS: Record<MappingStatus, { color: string; bg: string; border: string }> = {
  EXACT: { color: '#7CFC00', bg: 'rgba(124,252,0,0.08)', border: '1px solid #7CFC00' },
  RUNTIME: { color: '#a0d0ff', bg: 'rgba(160,208,255,0.08)', border: '1px solid #a0d0ff' },
  SHARED: { color: '#ffe08a', bg: 'rgba(255,224,138,0.08)', border: '1px solid #ffe08a' },
  COMPOSITE: { color: '#d9a0ff', bg: 'rgba(217,160,255,0.08)', border: '1px solid #d9a0ff' },
  FALLBACK: { color: '#ffb0b0', bg: 'rgba(255,176,176,0.08)', border: '1px solid #ffb0b0' },
  UNRESOLVED: { color: '#ff8080', bg: 'rgba(255,128,128,0.06)', border: '1px dashed #ff8080' },
};

export function MappingPill({ status, label }: { status: MappingStatus; label?: string }) {
  const s = STATUS_COLORS[status];
  return (
    <span style={{ color: s.color, background: s.bg, border: s.border, borderRadius: 4, padding: '1px 8px', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      {label ?? status}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, marginBottom: 6, color: '#cfe3ff' }}>{children}</div>;
}

export function Mono({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return <code style={{ fontSize: 12, opacity: dim ? 0.6 : 0.9, fontFamily: 'monospace' }}>{children}</code>;
}

export function FieldRow({ label, value, status }: { label: string; value: React.ReactNode; status?: MappingStatus }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, padding: '1px 0', alignItems: 'baseline' }}>
      <span style={{ opacity: 0.6, width: 130, flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
      {status && <MappingPill status={status} />}
    </div>
  );
}

/** Fondo para el canvas: 'checker' | 'black' | 'transparent' | 'white'. */
export type SpriteBackground = 'checker' | 'black' | 'transparent' | 'white';

export const BG_COLORS: Record<SpriteBackground, string> = {
  checker: '#404040',
  black: '#000000',
  transparent: '#101820',
  white: '#e8e8e8',
};

export const BG_CELL = '#2a2a2a';

interface PixelCanvasProps {
  img: HTMLImageElement | null;
  zoom: number;
  background: SpriteBackground;
  grid: boolean;
  showBaseline?: boolean;
  maxWidth?: number;
}

/** Canvas con zoom pixel-perfect + fondo + grid + baseline (origen). */
export function PixelCanvas({ img, zoom, background, grid, showBaseline, maxWidth = 420 }: PixelCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;
    if (img && (natural?.w !== w || natural?.h !== h)) setNatural({ w, h });
    const cw = Math.max(1, w * zoom);
    const ch = Math.max(1, h * zoom);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = BG_COLORS[background];
    ctx.fillRect(0, 0, cw, ch);
    if (background === 'checker') {
      ctx.fillStyle = BG_CELL;
      const cell = Math.max(4, zoom * 4);
      for (let y = 0; y < ch; y += cell) {
        for (let x = (Math.floor(y / cell) % 2) * cell; x < cw; x += cell * 2) {
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }
    if (img && w > 0 && h > 0) {
      ctx.drawImage(img, 0, 0, w, h, 0, 0, cw, ch);
    }
    if (grid && w > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cw; x += zoom) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, ch); ctx.stroke(); }
      for (let y = 0; y <= ch; y += zoom) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(cw, y + 0.5); ctx.stroke(); }
    }
    if (showBaseline && w > 0) {
      // baseline = borde inferior del sprite (origen típico de actor GBC)
      ctx.strokeStyle = 'rgba(124,252,0,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, ch - 1); ctx.lineTo(cw, ch - 1); ctx.stroke();
      // origen (centro-x, baseline)
      ctx.fillStyle = '#7CFC00';
      ctx.fillRect(cw / 2 - 2, ch - 3, 4, 4);
    }
  }, [img, zoom, background, grid, showBaseline, natural]);
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', border: '1px solid #555', maxWidth }} />;
}

/** Carga una imagen (cachea por URL). */
export function useImage(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    let alive = true;
    const image = new Image();
    image.onload = () => { if (alive) setImg(image); };
    image.src = url;
    return () => { alive = false; };
  }, [url]);
  return img;
}

export function Hex({ value }: { value: number }) {
  return <Mono>${value.toString(16).padStart(2, '0')}</Mono>;
}

export function ZoomControls({ zoom, setZoom, background, setBackground, grid, setGrid }: {
  zoom: number; setZoom: (z: number) => void;
  background: SpriteBackground; setBackground: (b: SpriteBackground) => void;
  grid: boolean; setGrid: (g: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', margin: '4px 0' }}>
      {[1, 2, 4, 8].map((z) => (
        <button key={z} onClick={() => setZoom(z)} style={{ background: z === zoom ? '#2a4a6a' : '#1a2434', border: '1px solid #2a4a6a', color: '#cfe3ff', borderRadius: 3, padding: '1px 8px', cursor: 'pointer' }}>{z}×</button>
      ))}
      <select value={background} onChange={(e) => setBackground(e.target.value as SpriteBackground)} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
        <option value="checker">checkerboard</option>
        <option value="black">black</option>
        <option value="transparent">transparent</option>
        <option value="white">white</option>
      </select>
      <label style={{ fontSize: 12, color: '#cfe3ff' }}><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> grid</label>
    </div>
  );
}

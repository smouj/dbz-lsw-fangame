// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — frameAnalysis: análisis de frames de combate (compartido).
// Extraído de las antiguas vistas Sprites/Sheets (ahora integradas en
// Character Studio) para que haya UNA sola fuente de inspección de frames:
// el manifest V9 de la forma. Nada de pipelines paralelos.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { clearOverride, fetchManifest, type ManifestFrame } from './spriteEditing';
import { poseSemantics, parseFrameName, POSE_ORDER } from './frameSemantics';

export interface FrameAnalysis {
  file: string;
  w: number;
  h: number;
  touchesEdge: boolean;      // contenido opaco en algún borde del lienzo
  touchTop: number;          // px opacos en el borde superior
  bgSpecks: number;          // px del color de fondo con alpha>0 (residuales)
  opaque: { x: number; y: number; w: number; h: number } | null;
  alphaPct: number;
  dupeOf: string | null;     // archivo con contenido idéntico (hash)
}

export interface FrameUsage {
  pose: string;
  index: number;
  semantic: string;
}

const BG_COLORS = [
  [0, 183, 239], [211, 249, 188], [0, 255, 255], [0, 128, 96], [0, 248, 248],
];

/** Analiza una imagen de frame: bbox opaco, alpha%, bordes y specks. */
export function analyzeFrameImage(img: HTMLImageElement): Omit<FrameAnalysis, 'file' | 'dupeOf'> {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const base = { w: img.naturalWidth, h: img.naturalHeight, touchesEdge: false, touchTop: 0, bgSpecks: 0, opaque: null as FrameAnalysis['opaque'], alphaPct: 100 };
  if (!ctx) return base;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const w = c.width, h = c.height;
  let minX = w, minY = h, maxX = -1, maxY = -1, transparent = 0, top = 0, specks = 0, touches = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (y === 0) top++;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        for (const [br, bg, bb] of BG_COLORS) {
          if (data[i] === br && data[i + 1] === bg && data[i + 2] === bb) { specks++; break; }
        }
      } else {
        transparent++;
      }
    }
  }
  const total = w * h;
  return {
    w, h,
    touchesEdge: touches,
    touchTop: top,
    bgSpecks: specks,
    opaque: maxX >= 0 ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null,
    alphaPct: Math.round((transparent / total) * 100),
  };
}

/** Hash aproximado (muestreo) para detectar frames duplicados. */
export function hashFrame(img: HTMLImageElement): string {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const w = c.width, h = c.height;
  const parts: string[] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 40) parts.push(`${x},${y},${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
  }
  return parts.join('|');
}

export interface SheetAnalysisResult {
  frames: FrameAnalysis[];
  usages: Record<string, FrameUsage[]>;
  loading: boolean;
  problemCount: number;
  overridden: boolean;
  reloadTick: number;
  reload: () => void;
  clearOverrideLocal: () => void;
}

/**
 * Hook único de inspección del manifest de la forma: frames + usos +
 * problemas. Lo consumen Character Studio (browser integrado) — antes
 * esto estaba duplicado en Sprites/Sheets.
 */
export function useSheetAnalysis(formId: string, dir: string | undefined): SheetAnalysisResult {
  const [frames, setFrames] = useState<FrameAnalysis[]>([]);
  const [usages, setUsages] = useState<Record<string, FrameUsage[]>>({});
  const [loading, setLoading] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const manifestUrl = spriteManifestUrl(formId);

  useEffect(() => {
    let alive = true;
    setFrames([]);
    setUsages({});
    if (!manifestUrl || !dir) { setLoading(false); return; }
    setLoading(true);
    fetchManifest(manifestUrl, dir)
      .then(({ manifest, overridden: ov }) => {
        if (!alive) return;
        setOverridden(ov);
        const seen = new Set<string>();
        const all: ManifestFrame[] = [];
        const useMap: Record<string, FrameUsage[]> = {};
        for (const [pose, p] of Object.entries(manifest)) {
          const sem = poseSemantics(pose);
          for (let i = 0; i < p.frames.length; i++) {
            const f = p.frames[i];
            (useMap[f.file] ||= []).push({ pose, index: i, semantic: sem.meaning });
            if (!seen.has(f.file)) { seen.add(f.file); all.push(f); }
          }
        }
        setUsages(useMap);
        const results: FrameAnalysis[] = [];
        const hashMap: Record<string, string> = {};
        let pending = all.length;
        if (pending === 0) { setFrames([]); setLoading(false); return; }
        for (const f of all) {
          const img = new Image();
          const finish = () => {
            if (!alive) return;
            const analysis = img.naturalWidth > 0 ? { file: f.file, ...analyzeFrameImage(img) } : { file: f.file, w: f.w, h: f.h, touchesEdge: false, touchTop: 0, bgSpecks: 0, opaque: null as FrameAnalysis['opaque'], alphaPct: 100, dupeOf: null as string | null };
            results.push({ ...analysis, dupeOf: null });
            hashMap[f.file] = img.naturalWidth > 0 ? hashFrame(img) : '';
            pending--;
            if (pending === 0) {
              const byHash: Record<string, string[]> = {};
              for (const [file, hsh] of Object.entries(hashMap)) (byHash[hsh] ||= []).push(file);
              for (const r of results) {
                const group = byHash[hashMap[r.file]] || [];
                if (group.length > 1) r.dupeOf = group.find(g => g !== r.file) || null;
              }
              setFrames(results.sort((a, b) => a.file.localeCompare(b.file)));
              setLoading(false);
            }
          };
          img.onload = finish;
          img.onerror = finish;
          img.src = spriteFrameUrl(formId, f.file);
        }
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [manifestUrl, dir, formId, reloadTick]);

  const problemCount = useMemo(
    () => frames.filter(f => f.bgSpecks > 0 || (f.touchesEdge && f.touchTop > 3)).length,
    [frames],
  );

  return {
    frames, usages, loading, problemCount, overridden, reloadTick,
    reload: () => setReloadTick(t => t + 1),
    clearOverrideLocal: () => { if (dir) { clearOverride(dir); setReloadTick(t => t + 1); } },
  };
}

/** Agrupa los frames por pose (semántica) en orden canónico. */
export function groupFramesByPose(frames: FrameAnalysis[], dir: string | undefined) {
  const byPose = new Map<string, FrameAnalysis[]>();
  for (const f of frames) {
    const { pose } = parseFrameName(f.file, dir ?? '');
    const arr = byPose.get(pose) ?? [];
    arr.push(f);
    byPose.set(pose, arr);
  }
  const order = [...POSE_ORDER, ...Array.from(byPose.keys()).filter(p => !(POSE_ORDER as readonly string[]).includes(p))];
  return order.filter(p => byPose.has(p)).map(p => ({ pose: p, sem: poseSemantics(p), frames: byPose.get(p)! }));
}

export type { ManifestFrame };

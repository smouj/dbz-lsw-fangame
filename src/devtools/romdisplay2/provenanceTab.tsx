// ROM Display Lab 2.0 — tab PROVENANCE (sheet-rect).
// Desentierra la PROVENANCE FÍSICA de cada frame canónico (catalog-v9):
// cada frame → source sheet + rect (x0/y0/w/h) + semántica + forense.
// Visualiza el frame recortado en su rect SOBRE el sheet fuente de la ROM,
// y reconcilia (sin promoción fuzzy) contra manifest + puente F-MAP2.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  frameProvenanceSummary,
  provenanceDirs,
  provenanceForDir,
  sameRegionGroups,
  manifestDimensionCandidates,
  type FrameProvenanceEntry,
} from '../../battle/frameProvenance';
import { FORMS } from '../../data/roster';
import { spriteDirFor } from '../../data/spriteManifest';
import { SectionTitle, Mono, FieldRow } from './common';

const SHEET_ROOT = '/assets/sheets-rom/';

function useImage(url: string | null): HTMLImageElement | null {
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

const ASSET_COLOR: Record<string, string> = {
  actor_frame: 'rgba(124,252,0,0.75)',
  aura: 'rgba(255,192,96,0.75)',
  aura_support: 'rgba(255,192,96,0.55)',
  aura_power: 'rgba(255,224,138,0.55)',
};

function colorFor(e: FrameProvenanceEntry): string {
  if (e.frameKind === 'fixed_only') return 'rgba(255,128,128,0.7)';
  return ASSET_COLOR[e.assetType ?? ''] ?? 'rgba(160,208,255,0.7)';
}

/** Sheet fuente con todos los rects dibujados + uno seleccionado. */
function SheetWithRects({ sheet, frames, selected, onSelect }: {
  sheet: string | null;
  frames: FrameProvenanceEntry[];
  selected: string | null;
  onSelect: (sourceId: string) => void;
}) {
  const img = useImage(sheet ? SHEET_ROOT + sheet : null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = img.naturalWidth, h = img.naturalHeight;
    canvas.width = w * zoom; canvas.height = h * zoom;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
    for (const e of frames) {
      if (!e.rect) continue;
      const isSel = e.sourceId === selected;
      ctx.strokeStyle = isSel ? '#ffffff' : colorFor(e);
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(e.rect.x * zoom, e.rect.y * zoom, e.rect.w * zoom, e.rect.h * zoom);
    }
  }, [img, frames, selected, zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = Math.min(1, el.clientWidth / Math.max(1, img?.naturalWidth ?? 1));
    setZoom(Math.max(1, Math.floor(fit * 2) / 2));
  }, [img]);

  return (
    <div ref={containerRef} style={{ overflow: 'auto', border: '1px solid #2a3a4a', background: '#0d1420', padding: 4 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[1, 2, 3].map((z) => (
          <button key={z} onClick={() => setZoom(z)} style={{ background: z === zoom ? '#2a4a6a' : '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3, padding: '1px 8px', cursor: 'pointer' }}>{z}×</button>
        ))}
        <span style={{ fontSize: 12, color: '#9fb8d0', alignSelf: 'center' }}>
          {img ? `${img.naturalWidth}×${img.naturalHeight} · ${frames.filter(f => f.rect).length} rects` : 'sheet no disponible'}
        </span>
      </div>
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', cursor: 'crosshair' }} />
    </div>
  );
}

/** Recorte del frame seleccionado en su rect (visualización correcta del frame). */
function FrameCrop({ sheet, entry }: { sheet: string | null; entry: FrameProvenanceEntry | null }) {
  const img = useImage(sheet ? SHEET_ROOT + sheet : null);
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !img || !entry?.rect) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y, w, h } = entry.rect;
    const Z = 4;
    canvas.width = w * Z; canvas.height = h * Z;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  }, [img, entry]);
  if (!entry?.rect) return <Mono dim>sin rect</Mono>;
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', border: '1px solid #555' }} />;
}

export function ProvenanceTab() {
  const summary = useMemo(() => frameProvenanceSummary(), []);
  const dirs = useMemo(() => provenanceDirs(), []);
  const [dir, setDir] = useState<string>(dirs.includes('goku_base') ? 'goku_base' : (dirs[0] ?? ''));
  const [selected, setSelected] = useState<string | null>(null);

  const frames = useMemo(() => provenanceForDir(dir), [dir]);
  const aliases = useMemo(() => sameRegionGroups(dir), [dir]);
  const sheet = useMemo(() => frames.find(f => f.sourceSheet)?.sourceSheet ?? null, [frames]);
  const selectedEntry = useMemo(() => frames.find(f => f.sourceId === selected) ?? null, [frames, selected]);

  // form(s) que comparten este dir
  const dirForms = useMemo(() => {
    const out: string[] = [];
    for (const formId of Object.keys(FORMS)) if (spriteDirFor(formId) === dir) out.push(formId);
    return out;
  }, [dir]);

  const dimCands = useMemo(() => {
    const formId = dirForms[0];
    return formId ? manifestDimensionCandidates(formId) : [];
  }, [dirForms]);

  const withRect = frames.filter(f => f.rect).length;
  const actor = frames.filter(f => f.assetType === 'actor_frame').length;
  const fx = frames.filter(f => f.assetType !== 'actor_frame').length;

  return (
    <div>
      <SectionTitle>Provenance física (sheet-rect) — catalog-v9 → manifest</SectionTitle>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {[
          `${summary.frames} frames canónicos`,
          `${summary.runtimeDirs} dirs manifest`,
          `${summary.withRect} con rect`,
          `${summary.atomic} atomic / ${summary.fixedOnly} fixed_only`,
          `${summary.brokenCanonicalIds} canonicalId rotos`,
          `${summary.duplicateSourceIds} sourceId duplicados`,
        ].map((s) => (
          <span key={s} style={{ fontSize: 12, color: '#cfe3ff', background: '#141c2a', border: '1px solid #2a3a4a', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace' }}>{s}</span>
        ))}
      </div>

      <FieldRow label="dir manifest" value={
        <select value={dir} onChange={(e) => { setDir(e.target.value); setSelected(null); }} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
          {dirs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      } />
      <FieldRow label="form(s) runtime" value={<Mono>{dirForms.join(' · ')}</Mono>} />
      <FieldRow label="source sheet" value={<Mono>{sheet ?? '—'}</Mono>} />
      <FieldRow label="frames" value={<Mono>{frames.length} total · {withRect} rect · {actor} actor · {fx} fx</Mono>} />

      {sheet && (
        <>
          <div style={{ margin: '8px 0 4px' }}>
            <SectionTitle>Sheet fuente (ROM) con rects — verde=actor, ámbar=FX/aura, rojo=fixed_only</SectionTitle>
            <SheetWithRects sheet={sheet} frames={frames} selected={selected} onSelect={setSelected} />
          </div>
          {selectedEntry && (
            <div style={{ display: 'flex', gap: 12, margin: '8px 0', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <FrameCrop sheet={sheet} entry={selectedEntry} />
              <div style={{ fontSize: 13, minWidth: 260 }}>
                <FieldRow label="sourceId" value={<Mono>{selectedEntry.sourceId}</Mono>} />
                <FieldRow label="canonicalId" value={<Mono dim>{selectedEntry.canonicalId ?? '—'}</Mono>} />
                <FieldRow label="family/role" value={<Mono>{selectedEntry.family} · {selectedEntry.role}</Mono>} />
                <FieldRow label="rect" value={<Mono>{selectedEntry.rect ? `x${selectedEntry.rect.x} y${selectedEntry.rect.y} ${selectedEntry.rect.w}×${selectedEntry.rect.h}` : '—'}</Mono>} />
                <FieldRow label="assetType" value={<Mono>{selectedEntry.assetType}</Mono>} />
                <FieldRow label="frameKind" value={<Mono>{selectedEntry.frameKind}</Mono>} />
                <FieldRow label="opaquePixels" value={<Mono>{selectedEntry.opaquePixels ?? '—'}</Mono>} />
                <FieldRow label="semanticBucket" value={<Mono dim>{selectedEntry.semanticBucket ?? '—'}</Mono>} />
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 8 }}>
        <SectionTitle>Aliases físicos (misma región de sheet) — {aliases.length} grupos</SectionTitle>
        {aliases.length === 0 && <Mono dim>sin aliases en este dir</Mono>}
        {aliases.slice(0, 12).map((g, i) => (
          <div key={i} style={{ fontSize: 12, color: '#cfe3ff', marginBottom: 2 }}>
            <Mono>{g.sheet} @ {g.rect.x},{g.rect.y} {g.rect.w}×{g.rect.h}</Mono>
            <span style={{ opacity: 0.6 }}> → {g.frames.map(f => f.file).join(', ')}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <SectionTitle>Candidatos manifest→canonical por DIMENSIONES (no promoción) — {dimCands.length} poses</SectionTitle>
        <Mono dim>dimensiones idénticas (w×h) = candidato a verificación, nunca evidencia de identidad.</Mono>
        {dimCands.slice(0, 20).map((c, i) => (
          <div key={i} style={{ fontSize: 12, color: '#cfe3ff', marginBottom: 2 }}>
            <Mono>{c.manifestFile} ({c.w}×{c.h})</Mono>
            <span style={{ opacity: 0.6 }}> → {c.candidates.length} candidatos canónicos</span>
          </div>
        ))}
      </div>
    </div>
  );
}

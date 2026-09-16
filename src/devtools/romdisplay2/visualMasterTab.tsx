import { useEffect, useMemo, useState } from 'react';
import timeline from '../../../docs/rom/generated/visual-master/kamehameha-left/timeline.json';
import { FieldRow, MappingPill, Mono, SectionTitle } from './common';

const romFrameModules = import.meta.glob(
  '../../../docs/rom/generated/visual-master/kamehameha-left/rom/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

// P0 — the remake side: deterministic Pixi captures written by
// scripts/capture-pixi-visual-master.mjs. Absent captures stay PENDING; the
// viewer never substitutes ROM or manifest imagery for a missing capture.
const remakeFrameModules = import.meta.glob(
  '../../../docs/rom/generated/visual-master/kamehameha-left/remake/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

type VisualMasterFrame = (typeof timeline.frames)[number];

const romFrameUrls = new Map<number, string>();
for (const [path, url] of Object.entries(romFrameModules)) {
  const frame = Number(path.match(/frame_(\d+)\.png$/)?.[1] ?? NaN);
  if (Number.isFinite(frame)) romFrameUrls.set(frame, url);
}

const remakeFrameUrls = new Map<number, string>();
for (const [path, url] of Object.entries(remakeFrameModules)) {
  const frame = Number(path.match(/frame_(\d+)\.png$/)?.[1] ?? NaN);
  if (Number.isFinite(frame)) remakeFrameUrls.set(frame, url);
}

// Coordinate/scale contract (mirror of scripts/capture-pixi-visual-master.mjs
// and verify-golden-visual-gate.ts — read from the timeline, never retyped).
const contract = timeline.remakeCapture?.contract;
const ROM_CROP = contract?.romWorldCrop ?? { x: 0, y: 24, width: 160, height: 80 };
const REMAKE_CROP = contract?.remakeWorldCrop ?? { x: 0, y: 10, width: 320, height: 160 };
const COMPARE_W = contract?.compareWidth ?? 160;
const COMPARE_H = contract?.compareHeight ?? 80;

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

/** 5-bit GBC sample of an image region → Uint8Array(w*h*3). */
function sample(image: HTMLImageElement, crop: { x: number; y: number; width: number; height: number }, step: number, fiveBitSource: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = COMPARE_W;
  canvas.height = COMPARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, COMPARE_W, COMPARE_H);
  const data = ctx.getImageData(0, 0, COMPARE_W, COMPARE_H).data;
  const out = new Uint8Array(COMPARE_W * COMPARE_H * 3);
  for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
    for (let c = 0; c < 3; c++) {
      const value = data[j + c];
      out[i + c] = fiveBitSource ? Math.round((value * 31) / 255) : value >> 3;
    }
  }
  return out;
}

interface Heatmap { url: string; mismatchPercent: number; mismatchPixels: number; bbox: string; classification: string }

/** Real pixel diff of ROM vs remake in the 160×80 world, GBC 5-bit space. */
function useFrameDiff(romUrl: string | null, remakeUrl: string | null): Heatmap | null {
  const [result, setResult] = useState<Heatmap | null>(null);
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!romUrl || !remakeUrl) return () => { cancelled = true; };
    (async () => {
      const [romImage, remakeImage] = await Promise.all([loadImage(romUrl), loadImage(remakeUrl)]);
      if (cancelled || !romImage || !remakeImage) return;
      const rom = sample(romImage, ROM_CROP, 1, true);
      const remake = sample(remakeImage, REMAKE_CROP, 2, false);
      if (!rom || !remake) return;
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 144;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0a0f14';
      ctx.fillRect(0, 0, 160, 144);
      const image = ctx.getImageData(0, 0, 160, 144);
      let mismatch = 0;
      let x0 = 160, y0 = 80, x1 = -1, y1 = -1;
      for (let y = 0; y < COMPARE_H; y++) {
        for (let x = 0; x < COMPARE_W; x++) {
          const i = (y * COMPARE_W + x) * 3;
          if (rom[i] === remake[i] && rom[i + 1] === remake[i + 1] && rom[i + 2] === remake[i + 2]) continue;
          mismatch++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          const p = (((y + ROM_CROP.y) * 160) + x) * 4;
          image.data[p] = 255; image.data[p + 1] = 60; image.data[p + 2] = 60; image.data[p + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      const total = COMPARE_W * COMPARE_H;
      if (cancelled) return;
      setResult({
        url: canvas.toDataURL('image/png'),
        mismatchPercent: (mismatch / total) * 100,
        mismatchPixels: mismatch,
        bbox: mismatch ? `x${x0}..${x1} y${y0}..${y1}` : '—',
        classification: mismatch === 0 ? 'IDENTICAL' : 'MEASURED',
      });
    })();
    return () => { cancelled = true; };
  }, [romUrl, remakeUrl]);
  return result;
}

function FrameImage({ src, label, note }: { src: string | null; label: string; note?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: '#8fb4d4', marginBottom: 5 }}>{label}</div>
      <div style={{ aspectRatio: '160 / 144', background: '#05070a', border: '1px solid #35506a', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {src ? (
          <img src={src} alt={label} width={160} height={144}
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
        ) : (
          <div style={{ color: '#ffb070', font: '11px monospace', textAlign: 'center', padding: 12 }}>
            {note ?? 'PENDING_REMAKE_CAPTURE'}
          </div>
        )}
      </div>
    </div>
  );
}

export function VisualMasterTab() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = timeline.frames as VisualMasterFrame[];
  const current = frames[index];
  const romUrl = romFrameUrls.get(current.frame) ?? null;
  const remakeUrl = current.remake?.image ? remakeFrameUrls.get(current.frame) ?? null : null;
  const diff = useFrameDiff(romUrl, remakeUrl);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((value) => {
      if (value + 1 >= frames.length) { setPlaying(false); return value; }
      return value + 1;
    }), 1000 / 12);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);

  const phases = useMemo(() => Array.from(new Set(frames.map((frame) => frame.phase))), [frames]);
  const jumpToPhase = (phase: string) => {
    const next = frames.findIndex((frame) => frame.phase === phase);
    if (next >= 0) setIndex(next);
  };

  const captured = timeline.coverage.remakeCapturedFrames;
  const total = frames.length;

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <section style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SectionTitle>ROM VISUAL MASTER · {timeline.label}</SectionTitle>
          <MappingPill status="EXACT" label="ROM DYNAMIC CAPTURE" />
          <span style={{
            color: captured > 0 ? '#7fdc7f' : '#ffb070',
            border: `1px dashed ${captured > 0 ? '#7fdc7f' : '#ffb070'}`,
            borderRadius: 4, padding: '1px 8px', font: '12px monospace',
          }}>
            REMAKE CAPTURE {captured}/{total}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', color: '#9fb8d0', fontSize: 12 }}>
          Framebuffer real 160×144 de la ROM española, capturado con mGBA. No usa manifests, poses semánticas ni PNGs manuales.
          El panel REMAKE muestra la captura Pixi determinista del mismo beat (seed fijo, sin reloj de pared); el heatmap compara
          el mundo 160×80 en espacio GBC 5-bit con el contrato de recorte/scale explícito. Un frame sin captura nunca se sustituye.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <FrameImage src={romUrl} label={`ROM · FRAME ${current.frame}`} />
        <FrameImage
          src={remakeUrl}
          label={`REMAKE PIXI · TICK ${current.remake?.remakeTick ?? '—'}`}
          note={`PENDING · rom frame ${current.frame}`}
        />
        <FrameImage
          src={diff?.url ?? null}
          label={`DIFFERENCE · PIXEL HEATMAP${diff ? ` · ${diff.mismatchPercent.toFixed(2)}%` : ''}`}
          note="PENDING · sin captura remake"
        />
      </section>

      <section style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setPlaying((value) => !value)}>{playing ? 'PAUSE' : 'PLAY 12 FPS'}</button>
          <button onClick={() => setIndex(Math.max(0, index - 1))}>− FRAME</button>
          <button onClick={() => setIndex(Math.min(frames.length - 1, index + 1))}>+ FRAME</button>
          <input type="range" min={0} max={frames.length - 1} value={index}
            onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }}
            style={{ flex: '1 1 320px' }} />
          <Mono>capture {index + 1}/{frames.length} · ROM frame {current.frame}</Mono>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          {phases.map((phase) => <button key={phase} onClick={() => jumpToPhase(phase)} style={{ fontSize: 10 }}>{phase}</button>)}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .8fr) minmax(360px, 1.2fr)', gap: 10 }}>
        <div style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 10 }}>
          <SectionTitle>FRAME CONTRACT</SectionTitle>
          <FieldRow label="phase" value={<Mono>{current.phase}</Mono>} />
          <FieldRow label="ROM image SHA" value={<Mono>{current.romImageSha256.slice(0, 20)}…</Mono>} status="EXACT" />
          <FieldRow label="active object" value={<Mono>{String(current.activeObject ?? '—')}</Mono>} />
          <FieldRow label="draw order flag" value={<Mono>{String(current.drawOrderFlag ?? '—')}</Mono>} />
          <FieldRow label="display SCX/SCY" value={<Mono>{current.display ? `${current.display.scx}/${current.display.scy}` : '—'}</Mono>} />
          <FieldRow label="C405/C406" value={<Mono>{current.scroll ? `${current.scroll.C405}/${current.scroll.C406}` : '—'}</Mono>} />
          <FieldRow label="raster bands" value={<Mono>{current.scroll && 'bands' in current.scroll ? current.scroll.bands?.length ?? 0 : '—'}</Mono>} />
          <FieldRow label="remake tick" value={<Mono>{String(current.remake?.remakeTick ?? '—')}</Mono>} status={remakeUrl ? 'EXACT' : undefined} />
          <FieldRow label="remake SHA" value={<Mono>{current.remake?.imageSha256 ? `${current.remake.imageSha256.slice(0, 20)}…` : '—'}</Mono>} />
          <FieldRow label="diff mismatch" value={<Mono>{diff ? `${diff.mismatchPercent.toFixed(2)}% · ${diff.mismatchPixels} px · ${diff.bbox}` : '—'}</Mono>} />
        </div>
        <div style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 10, overflow: 'hidden' }}>
          <SectionTitle>PROVENANCE</SectionTitle>
          <FieldRow label="ROM" value={<Mono>{timeline.source.rom} · {timeline.source.romSha256.slice(0, 20)}…</Mono>} status="EXACT" />
          <FieldRow label="emulator" value={<Mono>{timeline.source.emulator} {timeline.source.emulatorVersion}</Mono>} />
          <FieldRow label="bootstrap" value={<Mono>{timeline.source.bootstrapStateSha256.slice(0, 20)}…</Mono>} />
          <FieldRow label="identity rebind" value={<Mono>{timeline.source.identityRebind.scope}</Mono>} />
          <FieldRow label="scanline source" value={<Mono>{timeline.source.scanlineFixture}</Mono>} />
          <FieldRow label="action trace" value={<Mono>{timeline.source.rawActionTrace}</Mono>} />
          <FieldRow label="remake generator" value={<Mono>{timeline.remakeCapture?.generator ?? '—'}</Mono>} />
          <FieldRow label="remake harness" value={<Mono>{timeline.remakeCapture?.harness ?? '—'}</Mono>} />
          <FieldRow label="rom world crop" value={<Mono>{`${ROM_CROP.x},${ROM_CROP.y} ${ROM_CROP.width}×${ROM_CROP.height}`}</Mono>} />
          <FieldRow label="remake world crop" value={<Mono>{`${REMAKE_CROP.x},${REMAKE_CROP.y} ${REMAKE_CROP.width}×${REMAKE_CROP.height}`}</Mono>} />
          <FieldRow label="compare scale" value={<Mono>{String(contract?.compareScale ?? 0.5)} → {COMPARE_W}×{COMPARE_H} {contract?.compareSpace ?? 'gbc-5bit'}</Mono>} />
        </div>
      </section>
    </div>
  );
}

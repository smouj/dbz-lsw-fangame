import { useEffect, useMemo, useState } from 'react';
import timeline from '../../../docs/rom/generated/visual-master/kamehameha-left/timeline.json';
import { FieldRow, MappingPill, Mono, SectionTitle } from './common';

const romFrameModules = import.meta.glob(
  '../../../docs/rom/generated/visual-master/kamehameha-left/rom/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

type VisualMasterFrame = (typeof timeline.frames)[number];

const romFrameUrls = new Map<number, string>();
for (const [path, url] of Object.entries(romFrameModules)) {
  const frame = Number(path.match(/frame_(\d+)\.png$/)?.[1] ?? NaN);
  if (Number.isFinite(frame)) romFrameUrls.set(frame, url);
}

function FrameImage({ src, label }: { src: string | null; label: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: '#8fb4d4', marginBottom: 5 }}>{label}</div>
      <div style={{ aspectRatio: '160 / 144', background: '#05070a', border: '1px solid #35506a', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {src ? (
          <img src={src} alt={label} width={160} height={144}
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
        ) : (
          <div style={{ color: '#ffb070', font: '11px monospace', textAlign: 'center', padding: 12 }}>
            PENDING_REMAKE_CAPTURE
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

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <section style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SectionTitle>ROM VISUAL MASTER · {timeline.label}</SectionTitle>
          <MappingPill status="EXACT" label="ROM DYNAMIC CAPTURE" />
          <span style={{ color: '#ffb070', border: '1px dashed #ffb070', borderRadius: 4, padding: '1px 8px', font: '12px monospace' }}>
            REMAKE CAPTURE PENDING
          </span>
        </div>
        <p style={{ margin: '4px 0 0', color: '#9fb8d0', fontSize: 12 }}>
          Framebuffer real 160×144 de la ROM española, capturado con mGBA. No usa manifests, poses semánticas ni PNGs manuales.
          El panel REMAKE permanece vacío hasta que exista una captura Pixi del mismo tick; nunca sustituye evidencia ausente.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <FrameImage src={romUrl} label={`ROM · FRAME ${current.frame}`} />
        <FrameImage src={current.remake.image} label={`REMAKE PIXI · TICK ${current.frame}`} />
        <FrameImage src={null} label="DIFFERENCE · PIXEL HEATMAP" />
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
        </div>
        <div style={{ background: '#101824', border: '1px solid #2a3a4a', padding: 10, overflow: 'hidden' }}>
          <SectionTitle>PROVENANCE</SectionTitle>
          <FieldRow label="ROM" value={<Mono>{timeline.source.rom} · {timeline.source.romSha256.slice(0, 20)}…</Mono>} status="EXACT" />
          <FieldRow label="emulator" value={<Mono>{timeline.source.emulator} {timeline.source.emulatorVersion}</Mono>} />
          <FieldRow label="bootstrap" value={<Mono>{timeline.source.bootstrapStateSha256.slice(0, 20)}…</Mono>} />
          <FieldRow label="identity rebind" value={<Mono>{timeline.source.identityRebind.scope}</Mono>} />
          <FieldRow label="scanline source" value={<Mono>{timeline.source.scanlineFixture}</Mono>} />
          <FieldRow label="action trace" value={<Mono>{timeline.source.rawActionTrace}</Mono>} />
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — ANIMATION STUDIO (P0.3) — ROM ↔ RUNTIME VISUAL DEBUGGER
// ═══════════════════════════════════════════════════════════════════════
// Compara en tres columnas sincronizadas:
//   ROM PHYSICAL ↔ CURRENT MANIFEST ↔ PRODUCTION
// por FORM + AnimationResource + sequence. Timeline por TICKS GBC (no fps).
// No resuelve UNRESOLVED por similitud; solo marca CANDIDATE.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { getForm } from '../data/roster';
import { GBC_FPS } from '../battle/timeline';
import {
  GOLDEN_FORMS,
  GOLDEN_CONTEXTS,
  studioResourceList,
  studioForms,
  romFrameView,
  tickBoundaries,
  sequenceTotalTicks,
  frameIndexAtTick,
  studioUnresolvedMetrics,
  cardsForStudioResource,
  type RomFrameView,
  type StudioSide,
} from '../battle/animationStudio';
import { resolveCharacterVisualSequence } from '../battle/characterFrameMap';
import { resolvePoseFrameSequence } from '../battle/spriteConfig';
import type { FrameMapping } from '../battle/characterFrameMap';
import { catalogAnimationBank, catalogResourceBase } from '../data/generated/romAnimationResourceBase.generated';
import { PhysicalReconciliationSummary } from './PhysicalReconciliationSummary';

// ─── Badges ─────────────────────────────────────────────────────────────

const MAPPING_BADGE: Record<FrameMapping, { label: string; color: string; bg: string }> = {
  ROM_EXACT: { label: 'ROM_EXACT', color: '#7CFC00', bg: 'rgba(124,252,0,0.10)' },
  ROM_PHASE: { label: 'ROM_PHASE', color: '#8fe0ff', bg: 'rgba(143,224,255,0.10)' },
  CANONICAL_PHYSICAL: { label: 'CANONICAL_PHYSICAL', color: '#a0d0ff', bg: 'rgba(160,208,255,0.10)' },
  SHARED_PHYSICAL: { label: 'SHARED_PHYSICAL', color: '#ffe08a', bg: 'rgba(255,224,138,0.10)' },
  COMPOSITE: { label: 'COMPOSITE', color: '#d9a0ff', bg: 'rgba(217,160,255,0.10)' },
  FALLBACK: { label: 'FALLBACK', color: '#ffb0b0', bg: 'rgba(255,176,176,0.10)' },
  REFERENCE_FX: { label: 'REFERENCE_FX', color: '#ffc878', bg: 'rgba(255,200,120,0.10)' },
  UNRESOLVED: { label: 'UNRESOLVED', color: '#ff8080', bg: 'rgba(255,128,128,0.10)' },
};

function Badge({ mapping }: { mapping: FrameMapping | null }) {
  if (!mapping) return <span className="as-badge">—</span>;
  const b = MAPPING_BADGE[mapping];
  return <span className="as-badge" style={{ color: b.color, background: b.bg, border: `1px solid ${b.color}` }}>{b.label}</span>;
}

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return <span className="as-badge">—</span>;
  const tone = source === 'ROM_PHYSICAL'
    ? { color: '#7CFC00', bg: 'rgba(124,252,0,0.10)' }
    : source === 'MANIFEST_FALLBACK'
      ? { color: '#ffb0b0', bg: 'rgba(255,176,176,0.10)' }
      : source === 'UNRESOLVED'
        ? { color: '#ff8080', bg: 'rgba(255,128,128,0.10)' }
        : { color: '#a0d0ff', bg: 'rgba(160,208,255,0.10)' };
  return <span className="as-badge" style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.color}` }}>{source}</span>;
}

interface StudioPhysicalFrameProvenance {
  physicalId: string;
  actorVisualProfileKey?: number;
  graphicsBank?: number;
  resourceId: number;
  resourceHex: string;
  visualFrameId: number;
  metasprite?: { pieces?: unknown[]; provenance?: { tableAddress?: number; entryAddress?: number; pieceAddress?: number; count?: number } };
  graphics?: { blockCount?: number; provenance?: { tableAddress?: number; entryAddress?: number; layoutAddress?: number } };
  sourceProvenance?: {
    metaspriteHash?: string;
    graphicsTableHash?: string;
    graphicsHash?: string;
    sourceProvenanceHash?: string;
  };
}

interface StudioPhysicalProvenanceFile {
  frames: StudioPhysicalFrameProvenance[];
}

function h2(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function h4(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `0x${value.toString(16).padStart(4, '0')}` : '—';
}

function bankAddr(bank: number | null | undefined, address: number | null | undefined): string {
  return typeof bank === 'number' && typeof address === 'number'
    ? `$${h2(bank)}:${address.toString(16).padStart(4, '0')}`
    : '—';
}

function copyInspectorText(text: string): void {
  const btn = document.activeElement as HTMLElement | null;
  const flash = (msg: string) => {
    if (!btn) return;
    const orig = btn.textContent ?? '';
    btn.textContent = msg;
    btn.style.color = '#4ade80';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1400);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => flash('✓ Copied')).catch(() => { fallbackCopy(text); flash('✓ Copied'); });
    return;
  }
  fallbackCopy(text);
  flash('✓ Copied');
}

function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function animationFrameProvenance(view: RomFrameView, physicalFrame: StudioPhysicalFrameProvenance | null): Record<string, string | number> {
  const animationBank = catalogAnimationBank(view.resourceId);
  const resourceBase = catalogResourceBase(view.resourceId);
  const metaspriteEntry = physicalFrame?.metasprite?.provenance?.entryAddress;
  const graphicsEntry = physicalFrame?.graphics?.provenance?.entryAddress ?? physicalFrame?.graphics?.provenance?.layoutAddress;
  return {
    physicalId: view.physical.physicalId ?? '—',
    form: view.formId,
    profileKey: physicalFrame?.actorVisualProfileKey == null ? '—' : `0x${h2(physicalFrame.actorVisualProfileKey)}`,
    graphicsBank: physicalFrame?.graphicsBank == null ? '—' : `0x${h2(physicalFrame.graphicsBank)}`,
    animationBank: animationBank == null ? '—' : `0x${h2(animationBank)}`,
    resourceBase: h4(resourceBase),
    resourceId: view.resourceHex,
    sequence: view.sequenceIndex,
    frameIndex: view.frameIndex,
    VFID: `0x${h2(view.visualFrameId)}`,
    frameRecordAddress: 'see raw frame stream',
    metaspriteAddress: resourceBase != null && metaspriteEntry != null ? bankAddr(animationBank, resourceBase + metaspriteEntry) : '—',
    graphicsDescriptorAddress: resourceBase != null && graphicsEntry != null ? bankAddr(animationBank, resourceBase + graphicsEntry) : '—',
    metaspriteLocalAddress: h4(metaspriteEntry),
    graphicsDescriptorLocalAddress: h4(graphicsEntry),
    pieces: physicalFrame?.metasprite?.pieces?.length ?? '—',
    graphicsBlocks: physicalFrame?.graphics?.blockCount ?? '—',
    metaspriteHash: physicalFrame?.sourceProvenance?.metaspriteHash ?? '—',
    graphicsHash: physicalFrame?.sourceProvenance?.graphicsHash ?? '—',
    sourceProvenanceHash: physicalFrame?.sourceProvenance?.sourceProvenanceHash ?? '—',
  };
}

// ─── Componente de columna (imagen + metadatos) ─────────────────────────

function FrameImg({ formId, file, zoom, flipped }: { formId: string; file: string | null; zoom: number; flipped: boolean }) {
  if (!file) return <div className="as-frame-empty">—</div>;
  return (
    <img
      src={spriteFrameUrl(formId, file)}
      alt={file}
      style={{ imageRendering: 'pixelated', transform: `scale(${zoom})${flipped ? ' scaleX(-1)' : ''}`, transformOrigin: 'top left', background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #242424 0% 50%) 0 0/20px 20px' }}
    />
  );
}

// ─── Timeline física por ticks ──────────────────────────────────────────

function PhysicalTimeline({ resourceId, sequenceIndex, tick, onTick, playing, onTogglePlay, loop, setLoop, speed, setSpeed }: {
  resourceId: number;
  sequenceIndex: number;
  tick: number;
  onTick: (t: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  loop: boolean;
  setLoop: (b: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
}) {
  const bounds = useMemo(() => tickBoundaries(resourceId, sequenceIndex), [resourceId, sequenceIndex]);
  const total = sequenceTotalTicks(resourceId, sequenceIndex);
  const activeFrame = frameIndexAtTick(resourceId, sequenceIndex, tick);

  // playback por ticks (rAF, GBC_FPS × speed)
  useEffect(() => {
    if (!playing || bounds.length === 0) return;
    let raf = 0;
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      setTickNow(t => {
        const next = t + delta * GBC_FPS * speed;
        if (!loop && next >= total) return total - 1;
        return next % Math.max(1, total);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, loop, speed, total, bounds.length]);

  // helper setTick (evita loop de dependencias)
  const setTickNow = (fn: (t: number) => number) => onTick(fn(tick));

  const stepFrame = (d: number) => {
    const b = bounds.find(bb => tick >= bb.startTick && tick < bb.endTick);
    const idx = b ? b.frameIndex + d : 0;
    const clamped = Math.max(0, Math.min(bounds.length - 1, idx));
    onTick(bounds[clamped]?.startTick ?? 0);
  };
  const stepTick = (d: number) => {
    const totalT = Math.max(1, total);
    onTick(((Math.floor(tick + d) % totalT) + totalT) % totalT);
  };

  return (
    <div className="as-timeline">
      <div className="as-timeline-head">
        <span className="as-mono">SEQ {sequenceIndex} · {total} ticks · {bounds.length} frames</span>
        <div className="as-controls">
          <button onClick={() => onTick(0)}>⏮</button>
          <button onClick={() => stepFrame(-1)}>◂◂</button>
          <button onClick={() => stepTick(-1)}>−1t</button>
          <button className="as-play" onClick={onTogglePlay}>{playing ? '⏸' : '▶'}</button>
          <button onClick={() => stepTick(1)}>+1t</button>
          <button onClick={() => stepFrame(1)}>▸▸</button>
          <button onClick={() => onTick(total - 1)}>⏭</button>
          <label className="as-check"><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />loop</label>
          {[0.25, 0.5, 1, 2].map(s => (
            <button key={s} className={speed === s ? 'as-speed active' : 'as-speed'} onClick={() => setSpeed(s)}>×{s}</button>
          ))}
        </div>
      </div>
      <div className="as-tickbar">
        {bounds.map(b => {
          const active = b.frameIndex === activeFrame;
          const wPct = (b.durationTicks / Math.max(1, total)) * 100;
          return (
            <div key={b.frameIndex}
              className={`as-tickseg ${active ? 'active' : ''}`}
              style={{ width: `${wPct}%` }}
              title={`frame ${b.frameIndex} · vf=$${b.frameIndex} · ${b.durationTicks}t`}>
              <span className="as-tickseg-label">{b.frameIndex}</span>
            </div>
          );
        })}
      </div>
      <div className="as-tickmark">
        <span className="as-mono">tick {Math.floor(tick)} / {total}</span>
        <span className="as-mono">frame {activeFrame} (vf=$${activeFrame.toString(16).padStart(2, '0')})</span>
      </div>
    </div>
  );
}

// ─── Inspector de frame ─────────────────────────────────────────────────

function FrameInspector({ view, physicalFrame }: { view: RomFrameView | null; physicalFrame: StudioPhysicalFrameProvenance | null }) {
  if (!view) return <div className="as-inspector as-empty-box">Selecciona un recurso con secuencia decodificada.</div>;
  const fmap = view.fmap;
  const firstBinding = fmap?.bindings[0];
  const provenance = view.physical.physicalId ? animationFrameProvenance(view, physicalFrame) : null;
  return (
    <div className="as-inspector">
      <div className="as-inspector-head">
        <span className="as-mono">res ${view.resourceHex} · seq {view.sequenceIndex} · frame {view.frameIndex}</span>
        <Badge mapping={view.classification} />
      </div>
      <table className="as-table">
        <tbody>
          <tr><td>visualFrameId</td><td className="as-mono">${view.visualFrameId.toString(16).padStart(2, '0')} (meta {view.visualFrameId})</td></tr>
          <tr><td>physicalId</td><td className="as-mono">{view.physical.physicalId ?? '—'}</td></tr>
          <tr><td>frameInstanceId</td><td className="as-mono">{view.physical.frameInstanceId ?? '—'}</td></tr>
          <tr><td>source</td><td><SourceBadge source={view.physical.source} /></td></tr>
          <tr><td>durationTicks</td><td className="as-mono">{view.durationTicks}t</td></tr>
          <tr><td>offsetX / offsetY</td><td className="as-mono">{view.offsetX >= 128 ? view.offsetX - 256 : view.offsetX} / {view.offsetY >= 128 ? view.offsetY - 256 : view.offsetY}</td></tr>
          <tr><td>raw</td><td className="as-mono">[{view.raw.join(', ')}]</td></tr>
          <tr><td>manifest pose</td><td className="as-mono">{view.manifestPose ?? '—'}</td></tr>
          <tr><td>manifest index</td><td className="as-mono">{view.manifestIndex ?? '—'}</td></tr>
          <tr><td>physical status</td><td><Badge mapping={view.mappingStatus === 'EXACT' ? 'ROM_EXACT' : view.mappingStatus === 'SHARED' ? 'SHARED_PHYSICAL' : view.mappingStatus === 'COMPOSITE' ? 'COMPOSITE' : 'UNRESOLVED'} /></td></tr>
          <tr><td>canonical</td><td className="as-mono">{firstBinding?.canonicalId ?? '—'}</td></tr>
          <tr><td>semantic role</td><td className="as-mono">{fmap?.semanticRole ?? view.manifestPose ?? '—'}</td></tr>
          <tr><td>fallback reason</td><td className="as-mono">{view.physical.fallbackReason ?? 'NONE'}</td></tr>
          {provenance && (
            <>
              <tr><td>form/profile</td><td className="as-mono">{provenance.form} · p {provenance.profileKey} · gfx {provenance.graphicsBank}</td></tr>
              <tr><td>bank/base</td><td className="as-mono">anim {provenance.animationBank} · base {provenance.resourceBase}</td></tr>
              <tr><td>metasprite address</td><td className="as-mono">{provenance.metaspriteAddress}</td></tr>
              <tr><td>graphics descriptor</td><td className="as-mono">{provenance.graphicsDescriptorAddress}</td></tr>
              <tr><td>pieces / blocks</td><td className="as-mono">{provenance.pieces} / {provenance.graphicsBlocks}</td></tr>
            </>
          )}
        </tbody>
      </table>
      {provenance && (
        <div className="as-copy-row">
          <button onClick={() => copyInspectorText(String(view.physical.physicalId))}>COPY PHYSICAL ID</button>
          <button onClick={() => copyInspectorText(JSON.stringify(provenance, null, 2))}>COPY PROVENANCE</button>
          <button onClick={() => copyInspectorText([
            'PHYSICAL ID',
            String(view.physical.physicalId),
            '',
            'SYMPTOM',
            'FRAME_CONTAMINATION_OR_CUT',
            '',
            'RAW',
            view.physical.file ?? '—',
            '',
            'TRIM',
            view.physical.file ?? '—',
            '',
            'PROVENANCE',
            JSON.stringify(provenance, null, 2),
            '',
            'N-1 / N / N+1',
            'PENDING_COMPARE',
            '',
            'CAUSE',
            'PENDING_TRACE',
            '',
            'FIX',
            'PENDING',
          ].join('\n'))}>REPORT FRAME ISSUE</button>
        </div>
      )}
      {view.mappingReason && <div className="as-reason"><span>reason</span><code>{view.mappingReason}</code></div>}
      {fmap && fmap.evidence.length > 0 && (
        <div className="as-evidence">
          <span>evidence</span>
          {fmap.evidence.map((e, i) => <code key={i}>{e}</code>)}
        </div>
      )}
    </div>
  );
}

// ─── Módulo principal ───────────────────────────────────────────────────

export function AnimationStudioModule() {
  const [formId, setFormId] = useState('goku_base');
  const [mode, setMode] = useState<'resource' | 'golden'>('golden');
  const [goldenCtx, setGoldenCtx] = useState('kamehameha');
  const [resourceId, setResourceId] = useState(3);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [side, setSide] = useState<StudioSide>('RIGHT');
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [showOffsets, setShowOffsets] = useState(false);
  const [overlay, setOverlay] = useState<'rom' | 'manifest' | 'overlay'>('manifest');
  const [zoom, setZoom] = useState(3);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [physicalProvenance, setPhysicalProvenance] = useState<StudioPhysicalProvenanceFile | null>(null);

  const metrics = useMemo(() => studioUnresolvedMetrics(), []);
  const resources = useMemo(() => studioResourceList(), []);
  const forms = useMemo(() => studioForms(), []);

  useEffect(() => {
    let cancelled = false;
    const dir = spriteDirFor(formId);
    setPhysicalProvenance(null);
    if (!dir) return;
    fetch(`/assets/sprites/${dir}/provenance.json`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((json: StudioPhysicalProvenanceFile | null) => {
        if (!cancelled) setPhysicalProvenance(json);
      })
      .catch(() => {
        if (!cancelled) setPhysicalProvenance(null);
      });
    return () => { cancelled = true; };
  }, [formId]);

  // Deep-link desde Action Trace Inspector: #dev/animation-studio?form=...&resource=..&sequence=..&frame=..
  useEffect(() => {
    const h = window.location.hash;
    const q = h.split('?')[1];
    if (!q) return;
    const params = new URLSearchParams(q);
    const form = params.get('form');
    const resource = params.get('resource');
    const sequence = params.get('sequence');
    const frame = params.get('frame');
    if (form) setFormId(form);
    if (resource) {
      const rid = /^[0-9a-fA-F]+$/.test(resource) ? parseInt(resource, 16) : parseInt(resource, 10);
      if (!Number.isNaN(rid)) { setResourceId(rid); setMode('resource'); }
    }
    if (sequence) setSequenceIndex(parseInt(sequence, 10) || 0);
    if (frame) setTick(parseInt(frame, 10) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resolver contexto activo
  const active = useMemo(() => {
    if (mode === 'golden') {
      const ctx = GOLDEN_CONTEXTS.find(c => c.id === goldenCtx)!;
      return {
        context: ctx,
        resourceId: ctx.resourceId ?? 3,
        hasRomSequence: ctx.actorPath === 'ROM_SEQUENCE',
      };
    }
    return { context: null, resourceId, hasRomSequence: true };
  }, [mode, goldenCtx, resourceId]);

  const view = useMemo(
    () => (active.hasRomSequence ? romFrameView(formId, active.resourceId, sequenceIndex, Math.floor(tick) >= 0 ? frameIndexAtTick(active.resourceId, sequenceIndex, tick) : 0) : null),
    [formId, active.resourceId, sequenceIndex, tick, active.hasRomSequence],
  );

  // frame activo por tick (para timeline)
  const activeFrameIndex = frameIndexAtTick(active.resourceId, sequenceIndex, tick);
  const sequenceFrames = useMemo(() => tickBoundaries(active.resourceId, sequenceIndex), [active.resourceId, sequenceIndex]);
  const seqTotal = sequenceTotalTicks(active.resourceId, sequenceIndex);

  // F-MAP para la pose del contexto (cuando no hay ROM sequence)
  const ctxFmap = useMemo(() => {
    if (active.hasRomSequence || !active.context) return null;
    return resolveCharacterVisualSequence({ formId, semanticRole: active.context.semanticRole });
  }, [active.hasRomSequence, active.context, formId]);

  // producción para la pose del contexto
  const ctxProduction = useMemo(() => {
    const dir = spriteDirFor(formId);
    if (!dir || !active.context) return [];
    const available = new Set<string>();
    const fmap = active.hasRomSequence ? view?.fmap : ctxFmap;
    const pose = active.hasRomSequence ? (view?.manifestPose ?? '') : active.context!.semanticRole;
    if (!pose) return [];
    // unión de archivos del dir (fallbacks entre familias)
    for (const b of (fmap?.bindings ?? [])) available.add(b.file);
    return resolvePoseFrameSequence(pose, dir, file => available.has(file));
  }, [active, view, ctxFmap, formId]);

  const consumers = useMemo(() => (active.hasRomSequence ? cardsForStudioResource(active.resourceId, formId) : []), [active.resourceId, formId, active.hasRomSequence]);

  // STATIC contexts may still expose a manifest pose. Handler-owned Bank $61
  // tracks intentionally have no single AnimationResource inspector row.
  const inspectorView: RomFrameView | null = view ?? (active.context && active.context.actorPath !== 'ROM_HANDLER_TRACK' ? {
    formId,
    dir: spriteDirFor(formId),
    resourceId: active.context.resourceId ?? -1,
    resourceHex: '—',
    sourceTechnique: active.context.technique,
    sequenceIndex: -1,
    frameIndex: -1,
    visualFrameId: -1,
    durationTicks: -1,
    offsetX: 0,
    offsetY: 0,
    raw: [0, 0, 0, 0],
    physical: {
      source: 'UNRESOLVED',
      physicalId: null,
      frameInstanceId: null,
      file: null,
      durationTicks: null,
      offsetX: null,
      offsetY: null,
      rawOffsetX: null,
      rawOffsetY: null,
      visualFrameId: null,
      evidence: ['PENDING_ROM_TRACE', active.context.note],
      fallbackReason: active.context.note,
    },
    manifestPose: active.context.semanticRole,
    manifestIndex: null,
    mappingStatus: 'UNRESOLVED',
    mappingReason: active.context.note,
    fmap: ctxFmap,
    classification: ctxFmap?.classification ?? 'UNRESOLVED',
    productionFrames: ctxProduction,
  } : null);

  const inspectorPhysicalFrame = useMemo(() => {
    const physicalId = inspectorView?.physical.physicalId;
    if (!physicalId || !physicalProvenance) return null;
    return physicalProvenance.frames.find(frame => frame.physicalId === physicalId) ?? null;
  }, [inspectorView, physicalProvenance]);

  const goldenUnresolved = metrics.goldenUnresolved.filter(b => !onlyUnresolved || b.formId === formId);
  const goldenFormList = [...GOLDEN_FORMS];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Animation Studio — ROM ↔ Runtime</h1>
        <p className="dev-sub">
          Compara ROM PHYSICAL ↔ CURRENT MANIFEST ↔ PRODUCTION por FORM + AnimationResource + sequence.
          Timeline por TICKS GBC (no fps). UNRESOLVED se muestra, no se promociona por similitud.
        </p>
      </header>

      <PhysicalReconciliationSummary />

      {/* Métricas */}
      <div className="as-metrics">
        <div className="as-metric"><span>MANIFEST MAPPING GAPS</span><b>{metrics.totalUnresolved}</b></div>
        <div className="as-metric"><span>REACHABLE MAPPING GAPS</span><b>{metrics.productionReachableUnresolved}</b></div>
        <div className="as-metric"><span>GOLDEN MAPPING GAPS</span><b>{metrics.goldenReachableUnresolved}</b></div>
        <div className="as-metric as-metric-goal"><span>scope</span><b>ASSET MAP ONLY</b></div>
      </div>

      {/* Selectores */}
      <div className="as-selectors">
        <label>FORM
          <select value={formId} onChange={e => { setFormId(e.target.value); setTick(0); }}>
            {forms.map(f => <option key={f.id} value={f.id}>{f.label} ({f.id})</option>)}
          </select>
        </label>
        <label>MODE
          <select value={mode} onChange={e => { setMode(e.target.value as 'resource' | 'golden'); setTick(0); }}>
            <option value="golden">GOLDEN CONTEXT</option>
            <option value="resource">RESOURCE</option>
          </select>
        </label>
        {mode === 'golden' ? (
          <label>CONTEXT
            <select value={goldenCtx} onChange={e => { setGoldenCtx(e.target.value); setTick(0); }}>
              {GOLDEN_CONTEXTS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>RESOURCE
              <select value={resourceId} onChange={e => { setResourceId(Number(e.target.value)); setSequenceIndex(0); setTick(0); }}>
                {resources.map(r => <option key={r.resourceId} value={r.resourceId}>{r.resourceHex} · {r.technique ?? '—'} · {r.sequenceCount} seq</option>)}
              </select>
            </label>
            <label>SEQ
              <select value={sequenceIndex} onChange={e => { setSequenceIndex(Number(e.target.value)); setTick(0); }}>
                {sequenceFrames.map((_, i) => <option key={i} value={i}>seq {i}</option>)}
              </select>
            </label>
          </>
        )}
        <label>SIDE
          <select value={side} onChange={e => setSide(e.target.value as StudioSide)}>
            <option value="RIGHT">RIGHT</option>
            <option value="LEFT">LEFT</option>
          </select>
        </label>
        <label className="as-check"><input type="checkbox" checked={showOffsets} onChange={e => setShowOffsets(e.target.checked)} />offsets</label>
      </div>

      {/* Contexto golden sin AnimationResource */}
      {active.context && !active.hasRomSequence && (
        <div className="as-ctx-note">
          <span className="as-mono">{active.context.label}</span>
          <span>actor path: <b>{active.context.actorPath}</b>{active.context.fxResource != null ? ` · FX $${active.context.fxResource.toString(16).padStart(2, '0')}` : ''}{active.context.palette != null ? ` · palette $${active.context.palette.toString(16).padStart(2, '0')}` : ''}</span>
          <code>{active.context.note}</code>
        </div>
      )}

      {/* Timeline física (solo si hay ROM sequence) */}
      {active.hasRomSequence && (
        <PhysicalTimeline
          resourceId={active.resourceId}
          sequenceIndex={sequenceIndex}
          tick={tick}
          onTick={setTick}
          playing={playing}
          onTogglePlay={() => setPlaying(p => !p)}
          loop={loop}
          setLoop={setLoop}
          speed={speed}
          setSpeed={setSpeed}
        />
      )}

      {/* Tres columnas */}
      <div className="as-columns">
        <div className="as-col">
          <div className="as-col-head">ROM PHYSICAL <span className="as-mono">physicalId · vf · ticks · dx/dy</span></div>
          <div className="as-col-body">
            {active.hasRomSequence && view ? (
              <>
                <div className="as-rom-record">
                  <SourceBadge source={view.physical.source} />
                  <div className="as-mono">{view.physical.physicalId ?? 'UNRESOLVED'}</div>
                  <div className="as-mono">vf ${view.visualFrameId.toString(16).padStart(2, '0')}</div>
                  <div className="as-mono">{view.durationTicks}t</div>
                  <div className="as-mono">dx {view.offsetX >= 128 ? view.offsetX - 256 : view.offsetX} dy {view.offsetY >= 128 ? view.offsetY - 256 : view.offsetY}</div>
                </div>
                <div className="as-mono as-muted">{view.physical.frameInstanceId ?? view.physical.fallbackReason ?? '→ sin frame físico resuelto'}</div>
                <FrameImg formId={formId} file={view.physical.file} zoom={zoom} flipped={side === 'LEFT'} />
              </>
            ) : (
              <div className="as-empty-box">
                {active.context?.actorPath === 'ROM_HANDLER_TRACK'
                  ? 'Pista física conocida en Bank $61 y seleccionada por el handler/resultado. No corresponde a un AnimationResource de actor.'
                  : 'Este contexto no usa una secuencia de actor; la pose y el FX se resuelven por su pista específica.'}
              </div>
            )}
          </div>
        </div>

        <div className="as-col">
          <div className="as-col-head">CURRENT MANIFEST <span className="as-mono">F-MAP</span></div>
          <div className="as-col-body">
            {(() => {
              const fmap = active.hasRomSequence ? view?.fmap : ctxFmap;
              if (!fmap || fmap.bindings.length === 0) return <div className="as-empty-box">sin bindings</div>;
              return (
                <>
                  <div className="as-col-meta">
                    <Badge mapping={fmap.classification} />
                    <span className="as-mono">{fmap.semanticRole} · {fmap.frames.length} frames</span>
                  </div>
                  <div className="as-frames">
                    {fmap.frames.slice(0, 8).map((file, i) => (
                      <FrameImg key={i} formId={formId} file={file} zoom={zoom} flipped={side === 'LEFT'} />
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="as-col">
          <div className="as-col-head">PRODUCTION <span className="as-mono">spriteConfig</span></div>
          <div className="as-col-body">
            {(() => {
              const frames = active.hasRomSequence ? view?.productionFrames : ctxProduction;
              if (!frames || frames.length === 0) return <div className="as-empty-box">fallback → idle</div>;
              return (
                <div className="as-frames">
                  {frames.slice(0, 8).map((file, i) => (
                    <FrameImg key={i} formId={formId} file={file} zoom={zoom} flipped={side === 'LEFT'} />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Inspector + consumidores */}
      <div className="as-bottom">
        <FrameInspector view={inspectorView} physicalFrame={inspectorPhysicalFrame} />
        <div className="as-consumers">
          <div className="as-col-head">CONSUMERS <span className="as-mono">cards</span></div>
          {active.hasRomSequence ? (
            consumers.length === 0
              ? <div className="as-empty-box">sin cartas</div>
              : <div className="as-card-list">{consumers.map(c => <code key={c.id} className={c.compatibleWithForm ? 'compatible' : ''}>{c.name}<small>{c.type}</small></code>)}</div>
          ) : (
            <div className="as-mono as-muted">contexto sin recurso ROM único</div>
          )}
        </div>
      </div>

      {/* Cola UNRESOLVED */}
      <div className="as-unresolved">
        <div className="as-col-head">
          UNRESOLVED (golden) <span className="as-mono">{goldenUnresolved.length}</span>
          <label className="as-check"><input type="checkbox" checked={onlyUnresolved} onChange={e => setOnlyUnresolved(e.target.checked)} />only this form</label>
        </div>
        <div className="as-unresolved-list">
          {goldenUnresolved.slice(0, 24).map((b, i) => (
            <div key={i} className="as-unresolved-row">
              <span className="as-mono">{b.formId}</span>
              <span className="as-mono">{b.semanticRole}[{b.manifestIndex}]</span>
              <code>{b.file}</code>
              <Badge mapping="UNRESOLVED" />
            </div>
          ))}
          {goldenUnresolved.length === 0 && <div className="as-mono as-muted">sin UNRESOLVED en formas golden</div>}
        </div>
      </div>
    </div>
  );
}

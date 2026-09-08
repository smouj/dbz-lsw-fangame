// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — ACTION TRACE INSPECTOR (P0.4) — LIVE read-out + stream
// ═══════════════════════════════════════════════════════════════════════
// Ejecuta una acción golden reproducible sobre el runtime REAL y muestra:
//   RUNTIME / ACTION / PRESENTATION / ACTOR / TARGET / DISPLAY
// + stream sincronizado (tick · engine · ROM cue · visual · resultado) con
//   filtros, freeze de tick, y deep-link a Animation Studio.
// Nada se inventa: MIXED/LEGACY/UNRESOLVED destacan como alarmas.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { GOLDEN_ACTIONS, type GoldenActionId } from '../battle/combatTrace';
import {
  traceActionPresentation,
  type FighterVisualTrace,
  type ActionPresentationTrace,
} from '../battle/actionPresentationTrace';
import { romPhysicalAssetUrl } from './romPhysicalPreview';

const STATUS_COLOR: Record<string, string> = {
  PHYSICAL: '#7CFC00', COMPOSITE: '#d9a0ff', FALLBACK: '#ffb0b0',
  REFERENCE_FX: '#ffc878', UNRESOLVED: '#ff8080',
};

const FILTERS = ['ENGINE', 'ROM CUE', 'SEMANTIC CUE', 'ACTOR', 'TARGET', 'FX', 'DISPLAY', 'FALLBACK'] as const;

function StatusBadge({ s }: { s: string }) {
  return <span className="ati-badge" style={{ color: STATUS_COLOR[s] ?? '#fff', borderColor: STATUS_COLOR[s] ?? '#fff' }}>{s}</span>;
}

function alarmsOf(t: ActionPresentationTrace): string[] {
  const a: string[] = [];
  if (t.presentation.source !== 'ROM' && t.presentation.source !== 'LEGACY') a.push(t.presentation.source);
  if (t.presentation.source === 'ROM' && t.presentation.generatedCueCount !== t.presentation.consumedCueCount) a.push('GENERATED≠CONSUMED');
  for (const s of t.samples) {
    if (s.actor?.physicalStatus === 'UNRESOLVED') a.push('ACTOR UNRESOLVED');
    if (s.target?.physicalStatus === 'UNRESOLVED') a.push('TARGET UNRESOLVED');
    if (s.actor?.file == null && s.actor?.requestedPose) a.push('MISSING FRAME');
  }
  for (const rf of t.romFrames) if (rf.actor.physicalStatus === 'UNRESOLVED') a.push('ROM UNRESOLVED');
  return [...new Set(a)];
}

function FighterPanel({ label, fv }: { label: string; fv: FighterVisualTrace | null }) {
  if (!fv) return <div className="ati-fighter"><h4>{label}</h4><span className="ati-muted">—</span></div>;
  return (
    <div className="ati-fighter">
      <h4>{label} <span className="ati-side-chip">{fv.side}</span></h4>
      <div className="ati-fighter-grid">
        <div><span>requested</span><b className="ati-mono">{fv.requestedPose ?? '—'}</b></div>
        <div><span>resolved</span><b className="ati-mono">{fv.resolvedPose ?? '—'}</b></div>
        <div><span>form</span><b className="ati-mono">{fv.formId}</b></div>
        <div><span>frame</span><b className="ati-mono">{fv.file ? fv.file.split('/').pop() : '—'}</b></div>
        <div><span>status</span><StatusBadge s={fv.physicalStatus} /></div>
        <div><span>vf</span><b className="ati-mono">{fv.visualFrameId != null ? `$${fv.visualFrameId.toString(16).padStart(2, '0')}` : '—'}</b></div>
        <div><span>res</span><b className="ati-mono">{fv.sourceResource != null ? `$${fv.sourceResource.toString(16).padStart(2, '0')}` : '—'}</b></div>
        <div><span>canon</span><b className="ati-mono">{fv.canonicalId ? '✓' : '—'}</b></div>
      </div>
      {fv.fallbackReason && <div className="ati-fallback-chip">⚠ {fv.fallbackReason}</div>}
      {romPhysicalAssetUrl(fv.formId, fv.file, fv.physicalId) && (
        <img className="ati-fighter-img" src={romPhysicalAssetUrl(fv.formId, fv.file, fv.physicalId) ?? undefined} alt={fv.file ?? 'ROM physical frame'}
          style={{ imageRendering: 'pixelated', background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #242424 0% 50%) 0 0/12px 12px' }} />
      )}
    </div>
  );
}

function deepLink(formId: string, resourceId: number, sequenceIndex: number, frameIndex: number): string {
  const hex = resourceId.toString(16).padStart(2, '0');
  return `#dev/animation-studio?form=${formId}&resource=${hex}&sequence=${sequenceIndex}&frame=${frameIndex}`;
}

export function ActionTraceInspector() {
  const [id, setId] = useState<GoldenActionId>('kamehameha');
  const [runNonce, setRunNonce] = useState(0);
  const [frozenTick, setFrozenTick] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const t = useMemo(() => traceActionPresentation(id), [id, runNonce]);
  const alarms = useMemo(() => alarmsOf(t), [t]);

  const toggleFilter = (f: string) => setActiveFilters(prev => {
    const n = new Set(prev);
    if (n.has(f)) n.delete(f); else n.add(f);
    return n;
  });

  const lastSample = t.samples[t.samples.length - 1] ?? null;
  const frozenSample = frozenTick != null ? t.samples.find(s => s.tick >= frozenTick) ?? lastSample : lastSample;

  const visibleSamples = t.samples.filter(s => {
    if (activeFilters.size === 0) return true;
    if (activeFilters.has('ENGINE') && s.engineEvent) return true;
    if (activeFilters.has('ROM CUE') && s.romCue) return true;
    if (activeFilters.has('SEMANTIC CUE') && s.activeCueIds.length > 0) return true;
    if (activeFilters.has('ACTOR') && s.actor) return true;
    if (activeFilters.has('TARGET') && s.target) return true;
    if (activeFilters.has('FX') && s.fx.length > 0) return true;
    if (activeFilters.has('DISPLAY') && (s.scene !== 'FIELD' || s.camera)) return true;
    if (activeFilters.has('FALLBACK') && (s.actor?.fallbackReason || s.target?.fallbackReason)) return true;
    return false;
  });

  return (
    <div className="dev-panel">
      <div className="ati-head">
        <h2>Action Trace Inspector — LIVE</h2>
        <p className="dev-sub">
          RUN determinista sobre el runtime REAL (BattleRuntime de producción, sin gameplay paralelo).
          Traza cada tick hasta el frame mostrado. Las alarmas destacan MIXED/LEGACY/UNRESOLVED.
        </p>
      </div>

      {/* Golden actions + RUN */}
      <div className="ati-chips">
        {GOLDEN_ACTIONS.map(a => (
          <button key={a.id} className={`ati-chip ${id === a.id ? 'active' : ''}`}
            onClick={() => { setId(a.id); setRunNonce(n => n + 1); setFrozenTick(null); }}
            title={a.description}>
            {a.label}
          </button>
        ))}
        <button className="ati-rerun" onClick={() => setRunNonce(n => n + 1)}>RUN ↻</button>
      </div>

      {/* Alarmas */}
      {alarms.length > 0 && (
        <div className="ati-alarms">
          {alarms.map((a, i) => <span key={i} className="ati-alarm">⚠ {a}</span>)}
        </div>
      )}

      {/* LIVE inspector */}
      <div className="ati-live">
        <div className="ati-panel">
          <h3>RUNTIME</h3>
          <div className="ati-kv"><span>tick</span><b>{frozenSample?.tick ?? '—'}</b></div>
          <div className="ati-kv"><span>attacker</span><b>{t.gameplay.attacker}</b></div>
          <div className="ati-kv"><span>defender</span><b>{t.gameplay.defender}</b></div>
          <div className="ati-kv"><span>outcome</span><b>{t.gameplay.outcome}</b></div>
          <div className="ati-kv"><span>start→end</span><b>{t.gameplay.startTick}→{t.gameplay.endTick ?? '—'}</b></div>
        </div>
        <div className="ati-panel">
          <h3>ACTION</h3>
          <div className="ati-kv"><span>card</span><b>{t.gameplay.cardId != null ? `#${t.gameplay.cardId} ${t.gameplay.cardName}` : '—'}</b></div>
          <div className="ati-kv"><span>command</span><b>{t.gameplay.command}</b></div>
          <div className="ati-kv"><span>handler</span><b>{t.gameplay.handler != null ? `$${t.gameplay.handler.toString(16).padStart(2, '0')}` : '—'}</b></div>
          <div className="ati-kv"><span>traceId</span><b className="ati-mono">{t.traceId}</b></div>
        </div>
        <div className="ati-panel">
          <h3>PRESENTATION</h3>
          <div className="ati-kv"><span>source</span><b style={{ color: STATUS_COLOR[t.presentation.source] ?? STATUS_COLOR.FALLBACK }}>{t.presentation.source}</b></div>
          <div className="ati-kv"><span>profile</span><b>{t.presentation.profileId ?? '—'}</b></div>
          <div className="ati-kv"><span>cues</span><b>{t.presentation.generatedCueCount}g / {t.presentation.consumedCueCount}c</b></div>
          <div className="ati-kv"><span>rom frames</span><b>{t.romFrames.length}</b></div>
        </div>
        <div className="ati-panel ati-panel-wide">
          <h3>DISPLAY</h3>
          <div className="ati-kv"><span>scene</span><b>{frozenSample?.scene ?? '—'}</b></div>
          <div className="ati-kv"><span>camera</span><b>{frozenSample?.camera ?? '—'}</b></div>
          <div className="ati-kv"><span>fx</span><b>{frozenSample?.fx.join(', ') || '—'}</b></div>
        </div>
        <FighterPanel label="ACTOR" fv={frozenSample?.actor ?? null} />
        <FighterPanel label="TARGET" fv={frozenSample?.target ?? null} />
      </div>

      {/* Deep-link al frame actual */}
      {frozenSample?.actor?.sourceResource != null && frozenSample.actor.sequenceIndex != null && frozenSample.actor.frameIndex != null && (
        <div className="ati-deeplink">
          <a href={deepLink(frozenSample.actor.formId, frozenSample.actor.sourceResource, frozenSample.actor.sequenceIndex, frozenSample.actor.frameIndex)}
            onClick={e => { e.preventDefault(); window.location.hash = deepLink(frozenSample.actor!.formId, frozenSample.actor!.sourceResource!, frozenSample.actor!.sequenceIndex!, frozenSample.actor!.frameIndex!); }}>
            OPEN IN ANIMATION STUDIO — res ${frozenSample.actor.sourceResource.toString(16).padStart(2, '0')} · seq {frozenSample.actor.sequenceIndex} · fr {frozenSample.actor.frameIndex} · {frozenSample.actor.formId}
          </a>
        </div>
      )}

      {/* Stream sincronizado */}
      <div className="ati-section">
        <h3>STREAM — tick · engine · ROM cue · visual · resultado</h3>
        <div className="ati-filters">
          {FILTERS.map(f => (
            <button key={f} className={`ati-filter ${activeFilters.has(f) ? 'active' : ''}`} onClick={() => toggleFilter(f)}>{f}</button>
          ))}
          {frozenTick != null && <button className="ati-filter active" onClick={() => setFrozenTick(null)}>UNFREEZE (tick {frozenTick})</button>}
        </div>
        <div className="ati-stream">
          <div className="ati-stream-head">
            <span className="w-tick">tick</span>
            <span className="w-engine">engine</span>
            <span className="w-cue">ROM cue</span>
            <span className="w-visual">visual</span>
            <span className="w-result">resultado</span>
          </div>
          {visibleSamples.map((s, i) => (
            <button key={i} className={`ati-stream-row ${frozenTick === s.tick ? 'frozen' : ''}`} onClick={() => setFrozenTick(s.tick)}>
              <span className="w-tick ati-mono">{s.tick}</span>
              <span className="w-engine ati-mono">{s.engineEvent ?? '—'}</span>
              <span className="w-cue ati-mono">{s.romCue ?? (s.activeCueIds.length ? s.activeCueIds.join(' ') : '—')}</span>
              <span className="w-visual">
                {s.actor && <StatusBadge s={s.actor.physicalStatus} />}
                {s.actor?.file && <span className="ati-mono"> {s.actor.file.split('/').pop()}</span>}
                {s.target && <StatusBadge s={s.target.physicalStatus} />}
              </span>
              <span className="w-result ati-mono">{s.actor?.fallbackReason ?? s.target?.fallbackReason ?? 'ok'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stream físico ROM */}
      {t.romFrames.length > 0 && (
        <div className="ati-section">
          <h3>ROM FRAMES — recurso → seq → frame → vf → manifest (físico)</h3>
          <div className="ati-romframes">
            {t.romFrames.map((rf, i) => (
              <button key={i} className="ati-romframe" title={rf.actor.file}
                onClick={() => { setFrozenTick(rf.absoluteTick); }}>
                <span className="ati-mono">t{rf.absoluteTick}</span>
                <span className="ati-mono">{rf.resourceHex}·s{rf.sequenceIndex}·f{rf.frameIndex}</span>
                <span className="ati-mono">vf ${rf.visualFrameId.toString(16).padStart(2, '0')} {rf.durationTicks}t</span>
                <StatusBadge s={rf.actor.physicalStatus} />
                {rf.actor.file && <span className="ati-mono">{rf.actor.file.split('/').pop()}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

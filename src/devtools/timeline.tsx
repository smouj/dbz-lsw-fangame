// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Timeline (M7): visualizador del Presentation Adapter.
// Ejecuta escenarios headless (Engine M1-M6) → EventLog →
// buildPresentationTimeline → tabla auditable de cues con:
//   logicalTick / presentationTick / delta / source / fidelity / perfil.
// La pasada FRAME_VERIFIED posterior se apoyará en esta misma tabla.
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { PRESENTATION_SCENARIOS, runPresentationScenario, type PresentationScenario } from './presentationScenarios';
import { buildPresentationTimeline, resolveFacing } from '../battle/engine/presentation';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../data/scenarios';
import type { TimelineEntry } from '../battle/engine/presentation/PresentationCue';
import { validateTrace, type RomActionTrace } from '../../tools/rom-trace/trace-schema';
import { deriveStateMachine } from '../../tools/rom-trace/derive-state-machine';
import { EnginePlayground } from './runtimePlayground';
import { ReplayModule } from './replay';
import { ExecutionModule } from './execution';
import { resolveCinematicProfile, type CinematicProfile } from '../battle/cinematic/cinematicProfile';
import { resolveActionProfileById } from '../battle/actionProfiles';
import type { BattleActionDescriptor } from '../battle/engine/events/BattleEvent';
import { beamBaseRuntimeCutoverSummary } from '../battle/beamBaseRomCutover';
import { standardDamageRuntimeCutoverSummary } from '../battle/standardDamageRomCutover';

const CUE_COLORS: Record<string, string> = {
  SCENE: '#d9b0e8', FIGHTER_POSE: '#7fd4ff', FIGHTER_VISIBILITY: '#8a93a3',
  FIGHTER_POSITION: '#8a93a3', AURA: '#e0c060', EFFECT: '#e0c060',
  PROJECTILE: '#6cb7e8', CAMERA: '#aab2bf', IMPACT: '#e08a6a',
  HUD: '#7fd48a', AUDIO: '#c8a0e0',
  // ROM LOTE 6 (§194) — cues de trazabilidad de la VM de presentación
  MACRO: '#c8b0ff', SCENE_LOAD: '#a89ae8', PALETTE_TRANSITION: '#ff9ad8',
  FIGHTER_MOTION: '#8ae8d8', SUPPORT_FX: '#7fd48a', DEFENSE_FX: '#e0a0a0',
  ROM_MACRO: '#c8b0ff', ROM_WAIT: '#bfc8d8', ANIMATION_START: '#7fd4ff',
  WAIT_ANIMATION_FRAME: '#9ac8ff', FX_LOAD: '#e0c060', ROM_AUDIO_SCRIPT: '#c8a0e0',
  ROM_RESULT_BRANCH: '#ffb56b', ROM_PENDING: '#e0a0a0', SCREEN_MOTION: '#8ae8d8',
  ROM_FX_WINDOW: '#ffd36a', BG_TILEMAP: '#ffd36a', ROM_BG_ASSEMBLY: '#9ee8a8',
};

function EntryRow({ en, logTicks }: { en: TimelineEntry; logTicks: Map<number, string[]> }) {
  const c = en.cue as unknown as Record<string, unknown>;
  const delta = c.tick as number - en.logicalTick;
  const detail =
    c.selectedFamily ? `${String(c.selectedFamily)}${c.selectedMacroHex ? ` → ${String(c.selectedMacroHex)}` : ''}`
    : c.macroId != null ? `$${Number(c.macroId).toString(16).padStart(2, '0').toUpperCase()}`
    : c.resource != null ? `res $${Number(c.resource).toString(16).padStart(2, '0').toUpperCase()}`
    : c.segments ? `${String(c.deltaPx)}px / ${String(c.durationTicks)}t`
    : String(c.pose ?? c.outcome ?? c.kind ?? c.action ?? c.mode ?? c.variant ?? c.value ?? c.reason ?? c.cue ?? '—');
  return (
    <div className="dev-tl-row">
      <span className="dev-tl-col evt" title={en.sourceEvent}>{en.sourceEvent.replaceAll('_', ' ').toLowerCase()}</span>
      <span className="dev-tl-col tick">{en.logicalTick}</span>
      <span className="dev-tl-col tick">{c.tick as number}</span>
      <span className={`dev-tl-col delta ${delta !== 0 ? 'shift' : ''}`}>{delta > 0 ? `+${delta}` : delta}</span>
      <span className="dev-tl-col cue" style={{ color: CUE_COLORS[c.type as string] ?? '#fff' }}>{String(c.type)}</span>
      <span className="dev-tl-col actor">{String(c.role ?? '—')}{c.side ? (': ' + String(c.side).slice(0, 1).toUpperCase()) : ''}</span>
      <span className="dev-tl-col pose">{detail}</span>
      <span className="dev-tl-col fx">{String(c.durationTicks ?? '')}</span>
      <span className="dev-tl-col bg">{String(c.background ?? '—').split('/').pop() ?? '—'}</span>
      <span className={`dev-tl-col fid ${en.fidelity}`}>{en.fidelity}</span>
      <span className="dev-tl-col prof">{en.profileId ?? '—'}</span>
    </div>
  );
}

// ── INSPECTOR DEL PERFIL CINEMATOGRÁFICO (contrato §32) ──
// Muestra la resolución por herencia de la acción del escenario: familia,
// shot flow explícito, transiciones, anclas, movimientos, poses, reacción,
// proyectil, input y fidelidad por dato. Todo lo INFERRED queda etiquetado.
function CinematicProfilePanel({ action }: { action: BattleActionDescriptor | null }) {
  const prof: CinematicProfile | null = useMemo(() => {
    if (!action) return null;
    const p = resolveActionProfileById(action.id);
    return resolveCinematicProfile({
      id: action.id, label: action.label, kind: action.kind ?? 'damage', visual: action.visual,
      fidelity: action.fidelity,
      actorBeats: p?.actor?.beats,
      impact: p?.impact ? { targetPose: p.impact.targetPose, strikePose: undefined } : undefined,
      projectile: p?.projectile ? { kind: p.projectile.kind ?? 'ray' } : null,
      rush: p?.rush ? { startFrame: p.rush.startFrame, duration: p.rush.duration } : null,
    });
  }, [action]);

  if (!prof) return <div className="dev-empty">Selecciona un escenario con acción para inspeccionar su perfil.</div>;
  const fidCls = (f: string) => f === 'INFERRED' ? '' : f === 'ROM_ASSET_VERIFIED' ? 'ok' : '';
  return (
    <div className="cc-profile">
      <div className="cc-profile-head">
        <span className="dev-tag">family: <b>{prof.family}</b></span>
        <span className="dev-tag">variant: <b>{prof.variant}</b></span>
        <span className="dev-tag">input: <b>{prof.input}</b></span>
        <span className={`dev-tag ${fidCls(prof.fidelity)}`}>fidelity global: <b>{prof.fidelity}</b></span>
      </div>
      <div className="cc-profile-grid">
        <div className="cc-profile-block">
          <h4>SHOT FLOW (explícito)</h4>
          <div className="cc-shotflow">{prof.shotFlow.map((s, i) => (
            <span key={`${s}-${i}`} className="cc-shot">{i > 0 && <em>→</em>}{s}</span>
          ))}</div>
        </div>
        <div className="cc-profile-block">
          <h4>TRANSICIONES</h4>
          <div className="cc-kv"><span>entry</span><code>{prof.entryTransition.type} @{prof.entryTransition.startTick} ({prof.entryTransition.durationTicks}t · swap@{prof.entryTransition.swapShotAt})</code><em className={fidCls(prof.entryTransition.fidelity)}>{prof.entryTransition.fidelity}</em></div>
          <div className="cc-kv"><span>exit</span><code>{prof.exitTransition.type} @{prof.exitTransition.startTick} ({prof.exitTransition.durationTicks}t · swap@{prof.exitTransition.swapShotAt})</code><em className={fidCls(prof.exitTransition.fidelity)}>{prof.exitTransition.fidelity}</em></div>
        </div>
        <div className="cc-profile-block">
          <h4>ANCLAS (relativas)</h4>
          <div className="cc-kv"><span>actor</span><code>{prof.actorAnchor}</code></div>
          <div className="cc-kv"><span>target</span><code>{prof.targetAnchor}</code></div>
          {prof.projectile && <div className="cc-kv"><span>proyectil</span><code>{prof.projectile.origin} → {prof.projectile.target}</code></div>}
        </div>
        <div className="cc-profile-block">
          <h4>MOVIMIENTO (nunca toca posición táctica)</h4>
          {prof.actorMovement.length === 0 && <span className="cc-muted">— STATIC (sin desplazamiento declarado)</span>}
          {prof.actorMovement.map((m, i) => (
            <div key={i} className="cc-kv"><span>{m.type}</span><code>{m.fromAnchor} → {m.toAnchor}</code><em className={fidCls(m.fidelity)}>{m.fidelity}</em></div>
          ))}
        </div>
        <div className="cc-profile-block">
          <h4>POSES (actor · ROM_ASSET_VERIFIED del manifest)</h4>
          {prof.actorBeats.length === 0 && <span className="cc-muted">— perfil firma sin beats (usar canon genérico)</span>}
          {prof.actorBeats.map((b, i) => (
            <div key={i} className="cc-kv"><span>@{b.atTick}</span><code>{b.pose}</code><em className={fidCls(b.fidelity)}>{b.fidelity}</em></div>
          ))}
        </div>
        <div className="cc-profile-block">
          <h4>REACCIÓN / FX</h4>
          <div className="cc-kv"><span>target</span><code>{prof.reactionPose?.pose ?? '—'}</code>{prof.reactionPose && <em className={fidCls(prof.reactionPose.fidelity)}>{prof.reactionPose.fidelity}</em>}</div>
          <div className="cc-kv"><span>fx</span><code>{prof.fx.length ? prof.fx.join(', ') : '—'}</code></div>
        </div>
      </div>
      <p className="cc-evidence">{prof.evidence} · holds: {prof.holds.length === 0 ? 'ninguno declarado (INFERRED)' : prof.holds.length}</p>
    </div>
  );
}

export function TimelineModule() {
  const [mode, setMode] = useState<'scenarios' | 'live' | 'replay' | 'execution' | 'romtrace'>('scenarios');
  const [scenarioId, setScenarioId] = useState(PRESENTATION_SCENARIOS[0].id);
  const [showMeta, setShowMeta] = useState(true);
  const standardDamageCutover = standardDamageRuntimeCutoverSummary();
  const beamBaseCutover = beamBaseRuntimeCutoverSummary();

  const sc: PresentationScenario = useMemo(
    () => PRESENTATION_SCENARIOS.find(s => s.id === scenarioId) ?? PRESENTATION_SCENARIOS[0],
    [scenarioId],
  );

  const { entries, events, state, action } = useMemo(() => {
    const run = runPresentationScenario(sc);
    const ctx = {
      playerFormId: 'goku_base',
      enemyFormId: 'piccolo_base',
      overviewBackground: SCENARIOS[0].overviewBackground,
      actionBackground: SCENARIOS[0].actionBackground,
      specialActionBackground: SPECIAL_ACTION_BACKGROUND,
    };
    const tl = buildPresentationTimeline({ events: run.log.entries, context: ctx });
    const logTicks = new Map<number, string[]>();
    for (const en of run.log.entries) {
      const arr = logTicks.get(en.tick) ?? [];
      arr.push(en.event.type);
      logTicks.set(en.tick, arr);
    }
    const facing = resolveFacing('player');
    // Acción del escenario (primer ACTION_STARTED) → perfil cinematográfico.
    const started = run.log.entries.find(en => en.event.type === 'ACTION_STARTED');
    const action = started && started.event.type === 'ACTION_STARTED' ? started.event.action : null;
    return { entries: tl.entries, events: run.log.entries, state: run.state, logTicks, facing, action };
  }, [sc]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Timeline (M7/M8) — Presentation Adapter + Runtime</h1>
        <p className="dev-sub">
          BattleEvent → BattleTimeline (cues puras en ticks GBC). Mismo EventLog ⇒ mismo
          Timeline, independiente de FPS. <strong>En vivo</strong> = primer slice vertical M8
          (UI → Engine → EventLog → Timeline → Presenter). V4 añade Beam físico
          <code>ROM_FX_WINDOW</code>; V5 añade Support/Defense como BG assembly, Move net0
          y slot8 preload/start boundary.
        </p>
      </header>

      <div className="dev-hud-view-select">
        <button className={`dev-hud-view-chip ${mode === 'scenarios' ? 'active' : ''}`}
          onClick={() => setMode('scenarios')}>Escenarios (headless)</button>
        <button className={`dev-hud-view-chip ${mode === 'live' ? 'active' : ''}`}
          onClick={() => setMode('live')}>En vivo (Engine Runtime)</button>
        <button className={`dev-hud-view-chip ${mode === 'replay' ? 'active' : ''}`}
          onClick={() => setMode('replay')}>Replay (M9)</button>
        <button className={`dev-hud-view-chip ${mode === 'execution' ? 'active' : ''}`}
          onClick={() => setMode('execution')}>Execution (ROM)</button>
        <button className={`dev-hud-view-chip ${mode === 'romtrace' ? 'active' : ''}`}
          onClick={() => setMode('romtrace')}>ROM TRACE / V3 Anchors</button>
      </div>

      {mode === 'romtrace' && <RomTraceView />}

      {mode === 'live' && <EnginePlayground />}
      {mode === 'replay' && <ReplayModule />}
      {mode === 'execution' && <ExecutionModule />}
      {mode === 'scenarios' && (
      <>
      <div className="dev-hud-view-select nowrap">
        {PRESENTATION_SCENARIOS.map(s => (
          <button key={s.id} className={`dev-hud-view-chip ${s.id === scenarioId ? 'active' : ''}`}
            onClick={() => setScenarioId(s.id)} title={`seed ${s.seed}`}>
            {s.label}
          </button>
        ))}
        <button className={`dev-hud-view-chip side-toggle ${showMeta ? 'active' : ''}`}
          onClick={() => setShowMeta(m => !m)}>
          {showMeta ? 'META: ON' : 'META: OFF'}
        </button>
      </div>

      <div className="dev-tl-summary">
        <span><b>Eventos:</b> {events.length}</span>
        <span><b>Cues:</b> {entries.length}</span>
        <span><b>Rango:</b> {entries[0]?.cue.tick ?? 0} → {entries[entries.length - 1]?.cue.tick ?? 0} ticks</span>
        <span><b>Facing:</b> actor {state.tick >= 0 ? 'player→1 · enemy→−1' : ''} (scaleX)</span>
        <span><b>Estado final:</b> tick {state.tick} · HP {state.player.hp}/{state.enemy.hp}</span>
        <span><b>$0A ROM:</b> {standardDamageCutover.romBacked}/19 · {standardDamageCutover.branchFamilies.join('/')}</span>
        <span><b>$02 ROM:</b> {beamBaseCutover.romBacked}/38 · $1E discrete</span>
        <span><b>V4 FX:</b> BG_TILEMAP · 28 bundles · 152 PNG · ROM_FX_WINDOW pending</span>
        <span><b>$0C:</b> prefix rows1-8 · handler $07 rows3-10 · result rows11-18</span>
        <span><b>V5 S/D:</b> Support BG19 HOLD120 · Move net0 · Defense slot8 deferred</span>
        <span><b>V6:</b> matrix+renders 48/48 · macros $2B/$2C/$34/$35 literal · slot8 audit 1+2+0 · romCA53 contextual</span>
      </div>

      <div className="dev-compat-chips" style={{ padding: 8 }}>
        <span className="dev-tag ok">Beam FX domain: BG tilemap, VRAM bank1/$8800, BG palette slot4</span>
        <span className="dev-tag ok">Support common BG19: 48×56 · palette slot5 · hold 120t</span>
        <span className="dev-tag ok">Defense selection preloads slot8; incoming attack consumes it</span>
        <span className="dev-tag">No auto-FX for Support/Defense from card resource fields</span>
        <span className="dev-tag">CA53=2 is numeric ROM result, not universal MISS</span>
        <span className="dev-tag">SCX/SCY offsets are presentation camera data, not actor anchors</span>
      </div>

      {/* Contrato §32 — inspector del perfil cinematográfico de la acción */}
      <CinematicProfilePanel action={action} />

      <div className="dev-tl-table">
        <div className="dev-tl-row dev-tl-head">
          <span className="dev-tl-col evt">Evento</span>
          <span className="dev-tl-col tick">Tick lógico</span>
          <span className="dev-tl-col tick">Tick cue</span>
          <span className="dev-tl-col delta">Δ</span>
          <span className="dev-tl-col cue">Cue</span>
          <span className="dev-tl-col actor">Actor</span>
          <span className="dev-tl-col pose">Pose/FX</span>
          <span className="dev-tl-col fx">Dur</span>
          <span className="dev-tl-col bg">Fondo</span>
          <span className="dev-tl-col fid">Fidelidad</span>
          <span className="dev-tl-col prof">Perfil</span>
        </div>
        {entries.map((en, i) => <EntryRow key={i} en={en} logTicks={new Map()} />)}
      </div>
      <p className="dev-hint">
        Δ = presentación − lógico (las secuencias de acción se anclan a ACTION_STARTED + frames del canon).
        Fidelidad: INFERRED hoy para la vista runtime legacy. V3/V4/V5 ya cierran datos físicos ROM;
        los siguientes cortes visibles son reemplazar FX_LOAD/proyectil por ROM_FX_WINDOW y
        representar Support/Defense mediante ROM_BG_ASSEMBLY/slot8 diferido.
      </p>
      </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROM TRACE (L9 §305-307) — inspector de trazas dinámicas.
// Muestra el CONTRATO (schema/promoción/targets) y, cuando existan
// traces reales en docs/rom/traces, la vista tick·CA06·slot0·slot1·SCX·SCY·CA39
// con decoder (BASE_X candidate · FRAME verified · byte 0C unknown).
// Anchors: PENDING_ROM_TRACE hasta tener evidencia dinámica (§306).
// ═══════════════════════════════════════════════════════════════════════
function RomTraceView() {
  const [traceName, setTraceName] = useState('');
  const [trace, setTrace] = useState<RomActionTrace | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = async () => {
    setLoadErr(null);
    if (!traceName) { setTrace(null); return; }
    try {
      const mod = await import(`../../../docs/rom/traces/${traceName}/trace.full.json`);
      setTrace(mod.default as RomActionTrace);
    } catch (e) {
      setLoadErr(`No hay trace '${traceName}' todavía — captura con tools/rom-trace/trace-action.lua`);
      setTrace(null);
    }
  };

  const issues = trace ? validateTrace(trace) : [];
  const fsm = trace ? deriveStateMachine(trace) : [];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>ROM TRACE — traza dinámica de ActionObjects (L9 §277-310)</h1>
        <p className="dev-sub">
          Infraestructura lista: schema, tracer Lua (tools/rom-trace/trace-action.lua), decoder
          diferencial, FSM extractor y pipeline de promoción. Sin traces reales, nada se
          promociona a ROM_DYNAMIC_VERIFIED — los anchors siguen PENDING_ROM_TRACE.
        </p>
      </header>

      <div className="dev-compat-chips" style={{ padding: 12 }}>
        <span className="dev-tag">Targets: Tail #29 ($0B) · Purple Comet #57 ($0D) · P.Comet Z #58 ($0E)</span>
        <span className="dev-tag">$08/$0C: traceBySubtype (cardId no demostrado)</span>
        <span className="dev-tag">Promoción: PENDING → CAPTURED → CANDIDATE → CROSS_TRACE → DYNAMIC_VERIFIED</span>
      </div>

      <div className="dev-tl-toolbar" style={{ padding: 8 }}>
        <input
          style={{ width: 320, padding: 6, background: '#111c24', color: '#cfe8f5', border: '1px solid #2a4a5a' }}
          placeholder="Nombre del trace (p. ej. tail/TAIL_LEFT_HIT)"
          value={traceName}
          onChange={e => setTraceName(e.target.value)}
        />
        <button onClick={load} style={{ marginLeft: 8 }}>Cargar trace</button>
        <span className="dev-hint" style={{ marginLeft: 12 }}>docs/rom/traces/&lt;nombre&gt;/trace.full.json</span>
      </div>

      {loadErr && <p className="dev-hint" style={{ color: '#e0a050' }}>{loadErr}</p>}

      {trace && (
        <>
          <div className="dev-compat-chips" style={{ padding: 8 }}>
            <span className={`dev-tag ${issues.length === 0 ? 'ok' : ''}`}>{issues.length === 0 ? 'trace VÁLIDO' : `issues: ${issues.join(' · ')}`}</span>
            <span className="dev-tag">rom: {trace.meta.source.romLabel} · {trace.meta.source.romSha256.slice(0, 12)}…</span>
            <span className="dev-tag">card #{trace.meta.cardId ?? '?'} · subtype ${trace.meta.subtype?.toString(16).padStart(2, '0') ?? '?'}</span>
            <span className="dev-tag">side: {trace.meta.attackerSide} · outcome: {trace.meta.expectedOutcome ?? '?'}</span>
            <span className="dev-tag">frames: {trace.frames.length}</span>
          </div>

          {fsm.length > 0 && (
            <div style={{ padding: 8 }}>
              <h4>STATE FLOW (CA06 observado — no reconstruido a mano)</h4>
              <div className="dev-compat-chips">
                {fsm.map((t, i) => (
                  <span key={i} className="dev-tag">t{t.tick} ${t.from.toString(16).padStart(2, '0')}→${t.to.toString(16).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          )}

          {/* Decoder por slot (§282/§305): candidatos explícitos, nunca inventados */}
          <div style={{ padding: 8 }}>
            <h4>DECODER (candidatos — la promoción exige cross-trace)</h4>
            <div className="dev-compat-chips">
              <span className="dev-tag">slot0: 19 bytes crudos · decoder: sin campos promovidos aún</span>
              <span className="dev-tag" style={{ background: '#3a2a20', color: '#ffd0a0', border: '1px solid #7a5a30' }}>ACTOR_HOME: PENDING_ROM_TRACE</span>
              <span className="dev-tag" style={{ background: '#3a2a20', color: '#ffd0a0', border: '1px solid #7a5a30' }}>TARGET_HOME: PENDING_ROM_TRACE</span>
              <span className="dev-tag" style={{ background: '#3a2a20', color: '#ffd0a0', border: '1px solid #7a5a30' }}>CONTACT_POINT: PENDING_ROM_TRACE</span>
            </div>
          </div>

          {/* Tabla tick·CA06·slot0·slot1·SCX·SCY·CA39 (§305) */}
          <div className="dev-tl-table" style={{ maxHeight: 420, overflow: 'auto' }}>
            <div className="dev-tl-row dev-tl-head">
              <span className="dev-tl-col tick">Tick</span>
              <span className="dev-tl-col cue">CA06</span>
              <span className="dev-tl-col bg">Slot0 (19B)</span>
              <span className="dev-tl-col bg">Slot1 (19B)</span>
              <span className="dev-tl-col tick">SCX</span>
              <span className="dev-tl-col tick">SCY</span>
              <span className="dev-tl-col actor">CA39</span>
            </div>
            {trace.frames.slice(0, 120).map((f, i) => (
              <div className="dev-tl-row" key={i}>
                <span className="dev-tl-col tick">{f.frame}</span>
                <span className="dev-tl-col cue">${f.battle.CA06.toString(16).padStart(2, '0')}</span>
                <span className="dev-tl-col bg" style={{ fontFamily: 'monospace', fontSize: 10 }}>{f.actionObjects[0].bytes.map(b => b.toString(16).padStart(2, '0')).join('')}</span>
                <span className="dev-tl-col bg" style={{ fontFamily: 'monospace', fontSize: 10 }}>{f.actionObjects[1].bytes.map(b => b.toString(16).padStart(2, '0')).join('')}</span>
                <span className="dev-tl-col tick">{f.display.scx}</span>
                <span className="dev-tl-col tick">{f.display.scy}</span>
                <span className="dev-tl-col actor">{f.drawOrderFlag ?? '—'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

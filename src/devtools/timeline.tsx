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
import { EnginePlayground } from './runtimePlayground';

const CUE_COLORS: Record<string, string> = {
  SCENE: '#d9b0e8', FIGHTER_POSE: '#7fd4ff', FIGHTER_VISIBILITY: '#8a93a3',
  FIGHTER_POSITION: '#8a93a3', AURA: '#e0c060', EFFECT: '#e0c060',
  PROJECTILE: '#6cb7e8', CAMERA: '#aab2bf', IMPACT: '#e08a6a',
  HUD: '#7fd48a', AUDIO: '#c8a0e0',
};

function EntryRow({ en, logTicks }: { en: TimelineEntry; logTicks: Map<number, string[]> }) {
  const c = en.cue as unknown as Record<string, unknown>;
  const delta = c.tick as number - en.logicalTick;
  return (
    <div className="dev-tl-row">
      <span className="dev-tl-col evt" title={en.sourceEvent}>{en.sourceEvent.replaceAll('_', ' ').toLowerCase()}</span>
      <span className="dev-tl-col tick">{en.logicalTick}</span>
      <span className="dev-tl-col tick">{c.tick as number}</span>
      <span className={`dev-tl-col delta ${delta !== 0 ? 'shift' : ''}`}>{delta > 0 ? `+${delta}` : delta}</span>
      <span className="dev-tl-col cue" style={{ color: CUE_COLORS[c.type as string] ?? '#fff' }}>{String(c.type)}</span>
      <span className="dev-tl-col actor">{String(c.role ?? '—')}{c.side ? (': ' + String(c.side).slice(0, 1).toUpperCase()) : ''}</span>
      <span className="dev-tl-col pose">{String(c.pose ?? c.outcome ?? c.kind ?? c.action ?? c.mode ?? c.variant ?? c.value ?? c.cue ?? '—')}</span>
      <span className="dev-tl-col fx">{String(c.durationTicks ?? '')}</span>
      <span className="dev-tl-col bg">{String(c.background ?? '—').split('/').pop() ?? '—'}</span>
      <span className={`dev-tl-col fid ${en.fidelity}`}>{en.fidelity}</span>
      <span className="dev-tl-col prof">{en.profileId ?? '—'}</span>
    </div>
  );
}

export function TimelineModule() {
  const [mode, setMode] = useState<'scenarios' | 'live'>('scenarios');
  const [scenarioId, setScenarioId] = useState(PRESENTATION_SCENARIOS[0].id);
  const [showMeta, setShowMeta] = useState(true);

  const sc: PresentationScenario = useMemo(
    () => PRESENTATION_SCENARIOS.find(s => s.id === scenarioId) ?? PRESENTATION_SCENARIOS[0],
    [scenarioId],
  );

  const { entries, events, state } = useMemo(() => {
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
    return { entries: tl.entries, events: run.log.entries, state: run.state, logTicks, facing };
  }, [sc]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Timeline (M7/M8) — Presentation Adapter + Runtime</h1>
        <p className="dev-sub">
          BattleEvent → BattleTimeline (cues puras en ticks GBC). Mismo EventLog ⇒ mismo
          Timeline, independiente de FPS. <strong>En vivo</strong> = primer slice vertical M8
          (UI → Engine → EventLog → Timeline → Presenter).
        </p>
      </header>

      <div className="dev-hud-view-select">
        <button className={`dev-hud-view-chip ${mode === 'scenarios' ? 'active' : ''}`}
          onClick={() => setMode('scenarios')}>Escenarios (headless)</button>
        <button className={`dev-hud-view-chip ${mode === 'live' ? 'active' : ''}`}
          onClick={() => setMode('live')}>En vivo (Engine Runtime)</button>
      </div>

      {mode === 'live' ? <EnginePlayground /> : (
      <>
      <div className="dev-hud-view-select">
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
      </div>

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
        Fidelidad: INFERRED hoy — la pasada FRAME_VERIFIED sobre la ROM ajustará los ticks sin cambiar la arquitectura.
      </p>
      </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Execution Plans (M8): trazas ROM de handlers en vivo.
// Para cada técnica ROM_CONFIRMED compila su ExecutionPlan y muestra la
// traza T+000… con provenance por evento (ROM_CONFIRMED / HANDLER_INFERRED
// / PRESENTATION_DERIVED / REMAKE_FALLBACK).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { ROM_TECHNIQUES } from '../data/romAnimationData';
import { compileExecutionPlan } from '../battle/engine/execution';

const PROV_COLORS: Record<string, string> = {
  ROM_CONFIRMED: '#7fd48a',
  HANDLER_INFERRED: '#e0c060',
  PRESENTATION_DERIVED: '#6cb7e8',
  REMAKE_FALLBACK: '#c8a0e0',
};

const PHASE_COLORS: Record<string, string> = {
  ACTION_BEGIN: '#ff8a8a', LOAD_RESOURCE: '#d9b0e8', SETUP_ACTOR: '#aab2bf',
  CHARGE: '#e0c060', RELEASE: '#7fd4ff', PROJECTILE_TRAVEL: '#6cb7e8',
  APPROACH: '#7fd48a', IMPACT: '#e08a6a', TARGET_REACTION: '#e08a6a',
  RECOVERY: '#8a93a3', RETURN_TO_TACTICAL: '#aab2bf',
};

export function ExecutionModule() {
  const names = useMemo(() => Object.keys(ROM_TECHNIQUES).sort(), []);
  const [sel, setSel] = useState('Kamehameha');

  const plan = useMemo(() => {
    const p = ROM_TECHNIQUES[sel];
    return p ? compileExecutionPlan(p, sel) : null;
  }, [sel]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Execution Plans (M8) — handlers ROM</h1>
        <p className="dev-sub">
          Trazas de ejecución compiladas de los AnimationResources reales (bancos $62-$64).
          Los ticks salen 100% de los frames ROM; las fases son semántica de handler.
        </p>
      </header>

      <div className="dev-hud-view-select nowrap" style={{ margin: '8px 0' }}>
        {names.map(n => (
          <button key={n} className={`dev-hud-view-chip ${n === sel ? 'active' : ''}`}
            onClick={() => setSel(n)}>{n}</button>
        ))}
      </div>

      {plan && (
        <>
          <div className="dev-rt-state">
            <span><b>Handler:</b> ${plan.handler.toString(16).padStart(2, '0')}</span>
            <span><b>Anim:</b> ${plan.animationResource.toString(16).padStart(2, '0')}</span>
            <span><b>FX:</b> ${plan.fxResource.toString(16).padStart(2, '0')}</span>
            <span><b>Pal:</b> ${plan.palette.toString(16).padStart(2, '0')}</span>
            <span><b>Ticks:</b> {plan.totalTicks}</span>
            <span><b>Duración:</b> {plan.durationMs}s @59.7275</span>
            {plan.variants.length > 0 && (
              <span><b>Variantes:</b> {plan.variants.map(v => `${v.totalTicks}t`).join(' · ')}</span>
            )}
          </div>

          <div className="dev-tl-table" style={{ maxHeight: '52vh' }}>
            <div className="dev-tl-row dev-tl-head">
              <span className="dev-tl-col tick" style={{ width: 70 }}>T+</span>
              <span className="dev-tl-col cue" style={{ width: 150 }}>Fase</span>
              <span className="dev-tl-col actor" style={{ width: 150 }}>Provenance</span>
              <span className="dev-tl-col pose" style={{ flex: 1 }}>Evento</span>
            </div>
            {plan.events.map((e, i) => (
              <div key={i} className="dev-tl-row">
                <span className="dev-tl-col tick" style={{ width: 70, color: '#e0c060' }}>+{e.tick}</span>
                <span className="dev-tl-col cue" style={{ width: 150, color: PHASE_COLORS[e.phase] ?? '#fff' }}>{e.phase}</span>
                <span className="dev-tl-col actor" style={{ width: 150, color: PROV_COLORS[e.provenance] ?? '#fff' }}>{e.provenance}</span>
                <span className="dev-tl-col pose" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.label}{e.detail ? ` — ${e.detail}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {!plan && <div className="dev-empty">Sin plan — selecciona una técnica.</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Replay (M9): reproductor de la historia de timelines.
// BattleRuntime (con keepHistory) acumula cada timeline de dispatch/advance.
// Este módulo ejecuta UNA secuencia headless determinista (mismo seed ⇒
// mismo log) y permite reproducir los cues paso a paso — la base del
// reproductor de batallas reales (el runtime de la batalla ya acumula
// historia con keepHistory:true).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { BattleRuntime } from '../battle/runtime/BattleRuntime';
import { createInitialBattleState } from '../battle/engine/state/createInitialBattleState';
import { getCard, type CardDef } from '../data/cards';
import { BattlePosition } from '../data/positions';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../data/scenarios';
import type { BattleTimeline } from '../battle/engine/presentation';

function deckOf(ids: number[]): { drawPile: CardDef[]; hand: CardDef[]; discardPile: CardDef[] } {
  return { drawPile: [], hand: ids.map(id => getCard(id)).filter((c): c is CardDef => !!c), discardPile: [] };
}

const CUE_COLORS: Record<string, string> = {
  SCENE: '#d9b0e8', FIGHTER_POSE: '#7fd4ff', FIGHTER_VISIBILITY: '#8a93a3',
  FIGHTER_POSITION: '#8a93a3', AURA: '#e0c060', EFFECT: '#e0c060',
  PROJECTILE: '#6cb7e8', CAMERA: '#aab2bf', IMPACT: '#e08a6a',
  HUD: '#7fd48a', AUDIO: '#c8a0e0',
};

/** Secuencia determinista de comandos (M9 demo): un MOVE defensivo legal
 *  (el primer MOVE compromete la defensa — el 2º rechaza por diseño). */
const DEMO_COMMANDS = [
  { type: 'MOVE' as const, axis: 'HORIZONTAL' as const },
  { type: 'END_EXCHANGE' as const },
];

export function ReplayModule() {
  // Runtime DEMO self-contained: genera historia acumulada con keepHistory.
  const runtime = useMemo(() => {
    const cfg = {
      playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
      playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
      playerMaxCc: 99, playerCc: 0,
      enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
      enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
      enemyMaxCc: 99, enemyCc: 0,
      playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK,
      playerDeck: deckOf([12, 5, 1]), enemyDeck: deckOf([1]),
      playerLimits: [], playerFighterLimits: [],
      firstAttacker: 'enemy' as const, seed: 20260818,
    };
    const rt = new BattleRuntime({
      state: { ...createInitialBattleState(cfg), phase: 'defend' as never },
      context: {
        playerFormId: 'goku_base', enemyFormId: 'piccolo_base',
        overviewBackground: SCENARIOS[0].overviewBackground,
        actionBackground: SCENARIOS[0].actionBackground,
        specialActionBackground: SPECIAL_ACTION_BACKGROUND,
      },
      keepHistory: true,
    });
    // Reproducir la secuencia demo determinista (0 RNG real — el engine es puro).
    for (const cmd of DEMO_COMMANDS) {
      const res = rt.dispatch(cmd);
      if (!res.ok) break;
      rt.advance(30); // tiempo entre comandos
    }
    return rt;
  }, []);

  const history = runtime.timelineHistory();
  const [step, setStep] = useState(0);
  const clamp = Math.max(0, Math.min(step, Math.max(0, history.length - 1)));
  const current: BattleTimeline | undefined = history[clamp];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Replay (M9) — historia del BattleRuntime</h1>
        <p className="dev-sub">
          {history.length} timelines acumulados (dispatch + advance). Reproduce los
          cues paso a paso — mismo seed + mismas decisiones ⇒ mismo log (determinista).
        </p>
      </header>

      <div className="dev-rt-state">
        <span><b>Timelines:</b> {history.length}</span>
        <span><b>Paso:</b> {clamp + 1}/{history.length}</span>
        <span><b>Rango:</b> {current ? `${current.startTick} → ${current.endTick}` : '—'}</span>
        <span><b>Estado:</b> {runtime.state.phase} · HP {runtime.state.player.hp}/{runtime.state.enemy.hp}</span>
      </div>

      <div className="dev-anim-controls" style={{ margin: '10px 0' }}>
        <button className="dev-anim-btn" onClick={() => setStep(0)} disabled={history.length === 0}>⏮</button>
        <button className="dev-anim-btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={clamp === 0}>◀</button>
        <button className="dev-anim-btn dev-anim-play" onClick={() => setStep(s => Math.min(history.length - 1, s + 1))} disabled={clamp >= history.length - 1}>▶</button>
        <button className="dev-anim-btn" onClick={() => setStep(history.length - 1)} disabled={history.length === 0}>⏭</button>
        <input type="range" min={0} max={Math.max(0, history.length - 1)} value={clamp}
          onChange={e => setStep(Number(e.target.value))} className="dev-range" style={{ flex: 1 }} />
      </div>

      {current && (
        <div className="dev-tl-table" style={{ maxHeight: '55vh' }}>
          <div className="dev-tl-row dev-tl-head">
            <span className="dev-tl-col evt">Evento</span>
            <span className="dev-tl-col tick">Tick</span>
            <span className="dev-tl-col cue">Cue</span>
            <span className="dev-tl-col actor">Actor</span>
            <span className="dev-tl-col pose">Pose/FX</span>
            <span className="dev-tl-col fx">Dur</span>
          </div>
          {current.entries.map((en, i) => {
            const c = en.cue as unknown as Record<string, unknown>;
            return (
              <div key={i} className="dev-tl-row">
                <span className="dev-tl-col evt">{en.sourceEvent.replaceAll('_', ' ').toLowerCase()}</span>
                <span className="dev-tl-col tick">{en.logicalTick}</span>
                <span className="dev-tl-col cue" style={{ color: CUE_COLORS[String(c.type)] ?? '#fff' }}>{String(c.type)}</span>
                <span className="dev-tl-col actor">{String(c.role ?? '—')}</span>
                <span className="dev-tl-col pose">{String(c.pose ?? c.outcome ?? c.kind ?? c.action ?? c.mode ?? c.value ?? '—')}</span>
                <span className="dev-tl-col fx">{String(c.durationTicks ?? '')}</span>
              </div>
            );
          })}
        </div>
      )}
      {!current && <div className="dev-empty">Sin timelines — la secuencia demo no produjo cues.</div>}
    </div>
  );
}

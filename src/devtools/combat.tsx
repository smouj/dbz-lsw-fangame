// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Combat Contract Studio (#dev/combat)
// Visualiza el contrato canónico (docs/COMBAT_CONTRACT.md):
//   1. ESQUEMA DE RONDAS (turn → exchange → quién ataca → ATTACK/DEFENSE)
//   2. ACTION EXECUTION PIPELINE (SELECT → PREPARING → [INPUT] → RESOLVING)
//   3. CONTROL BOUNDARIES (dónde el juego se detiene)
//   4. SIMULADOR EN VIVO con el Engine real (readout del contrato en cada
//      paso: CONTROL · EXECUTION · INITIATIVE · ATTACKER · DEFENDER …)
//   5. CONFIG del contrato (ticks/ventanas — solo lectura: la config de
//      gameplay vive en config/gameplay.config.ts, CANON LOCKED)
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { contractReadout, simInitialState, simCommand, simOpenQte, simExpectedKey, simClearQte, eventLabel, type ContractReadout } from './combatSim';
import { getDevProjectSnapshot } from './devSnapshot';
import { GAMEPLAY_CONFIG, stageWindowsTicks } from '../config/gameplay.config';
import { STAGE_PREP_TICKS } from '../battle/engine/clock/clock';
import { GBC_NATIVE_FPS } from '../data/actionFidelity';

type SimPhase = 'idle' | 'action' | 'defense' | 'done';

interface SimEntry { tick: number; label: string; control: string; }

// ═══ ESQUEMA DE RONDAS (estático) ═══
function RoundScheme({ initiative }: { initiative: 'player' | 'enemy' }) {
  const first = initiative === 'player' ? 'ATTACK' : 'DEFENSE';
  const second = initiative === 'player' ? 'DEFENSE' : 'ATTACK';
  return (
    <div className="cc-scheme">
      <div className="cc-round-box">
        <div className="cc-round-title">RONDA N</div>
        <div className="cc-round-grid">
          <div className="cc-exch">
            <span className="cc-exch-tag">EXCHANGE 0</span>
            <span className="cc-exch-atk">ataca: {initiative === 'player' ? 'PLAYER (iniciativa ★)' : 'ENEMY (iniciativa ★)'}</span>
            <span className={`cc-phase-tag cc-${first.toLowerCase()}`}>FASE {first} — espera jugador</span>
          </div>
          <div className="cc-arrow">↓</div>
          <div className="cc-exch">
            <span className="cc-exch-tag">EXCHANGE 1</span>
            <span className="cc-exch-atk">ataca: {initiative === 'player' ? 'ENEMY' : 'PLAYER'}</span>
            <span className={`cc-phase-tag cc-${second.toLowerCase()}`}>FASE {second} — espera jugador</span>
          </div>
          <div className="cc-arrow">↓</div>
          <div className="cc-round-end">
            FIN DE RONDA → round++ · exchange 0 · <b>iniciativa recalculada</b> (SPD efectiva)
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ ACTION EXECUTION PIPELINE ═══
function ActionScheme() {
  return (
    <div className="cc-pipeline">
      <div className="cc-pipe-row">
        <div className="cc-pipe-node cc-sel">SELECCIÓN<br /><small>BattleCommand del jugador</small></div>
        <div className="cc-pipe-arrow">→</div>
        <div className="cc-pipe-node cc-prep">PREPARING<br /><small>cinematografía · sin inputs · sin timer</small></div>
        <div className="cc-pipe-arrow">→</div>
        <div className="cc-pipe-node cc-input">WAITING_INPUT<br /><small>solo si la acción requiere input</small></div>
        <div className="cc-pipe-arrow">→</div>
        <div className="cc-pipe-node cc-res">RESOLVING<br /><small>golpes · daño · FX</small></div>
        <div className="cc-pipe-arrow">→</div>
        <div className="cc-pipe-node cc-done">COMPLETE<br /><small>fin de la acción</small></div>
      </div>
      <div className="cc-pipe-routes">
        <div className="cc-route"><b>Stage (BASIC o carta 3/4/5/6):</b> SELECT → PREPARING → WAITING_INPUT → RESOLVING → COMPLETE</div>
        <div className="cc-route"><b>Beam / Melee:</b> SELECT → PREPARING → RESOLVING → COMPLETE <em>(sin input)</em></div>
        <div className="cc-route"><b>Defensa:</b> SELECT GUARD/MOVE/CARD → COMMITTED → [ataque enemigo] → COMPLETE <em>(interacción, no un segundo ataque)</em></div>
        <div className="cc-route cc-warn"><b>Prohibido:</b> el QTE nunca empieza durante PREPARING · el input nunca aparece antes de terminar la preparación · la presentación jamás abre la ventana de gameplay</div>
      </div>
    </div>
  );
}

// ═══ CONTROL BOUNDARIES ═══
function BoundaryScheme() {
  const rows: Array<[string, string, string]> = [
    ['PLAYER_ATTACK_CHOICE', 'espera BattleCommand (carta · BASIC · LIMIT · JOINT)', 'nada avanza sin tu orden'],
    ['PLAYER_DEFENSE_CHOICE', 'espera GUARD · MOVE(H|V) · carta defensiva/support', 'el enemigo NO actúa hasta DEFENSE_COMMITTED'],
    ['ACTION_INPUT', 'espera el input de la acción en curso (QTE Stage · counter A/B)', 'solo input de la acción — jamás Defense Phase'],
    ['RESOLVING', 'preparación/resolución de lo YA elegido', 'automático permitido'],
    ['NONE', 'sin control del jugador (win / lose)', '—'],
  ];
  return (
    <div className="cc-boundaries">
      {rows.map(([name, desc, rule]) => (
        <div key={name} className={`cc-boundary cc-b-${name.toLowerCase()}`}>
          <span className="cc-boundary-name">{name}</span>
          <span className="cc-boundary-desc">{desc}</span>
          <span className="cc-boundary-rule">{rule}</span>
        </div>
      ))}
    </div>
  );
}

// ═══ READOUT EN VIVO (simulador) ═══
function LiveReadout({ ro, entries }: { ro: ContractReadout; entries: SimEntry[] }) {
  return (
    <div className="cc-live">
      <div className="cc-live-grid">
        <div className={`cc-live-control cc-ctl-${ro.control.toLowerCase()}`}>
          <span className="cc-live-label">CONTROL</span>
          <strong>{ro.control}</strong>
        </div>
        <div className={`cc-live-cell cc-exec-${ro.execution.toLowerCase()}`}>
          <span className="cc-live-label">EJECUCIÓN</span>
          <strong>{ro.execution}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">RONDA / EXCH</span>
          <strong>{ro.round} · {ro.exchange === 0 ? 'E0' : 'E1'}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">INICIATIVA</span>
          <strong>{ro.initiative} {ro.initiative === 'PLAYER' ? '★' : ''}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">ATACANTE / DEFENSOR</span>
          <strong>{ro.attacker} → {ro.defender}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">FASE / DEFENSA</span>
          <strong>{ro.phase} · {ro.defense}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">QTE</span>
          <strong>{ro.stageQte}</strong>
        </div>
        <div className="cc-live-cell">
          <span className="cc-live-label">TICK</span>
          <strong>{ro.tick}</strong>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="cc-log">
          {entries.slice(-8).map((en, i) => (
            <div key={i} className="cc-log-row"><span className="cc-log-tick">@{en.tick}</span> {en.label} <em className="cc-log-ctl">[{en.control}]</em></div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ MÓDULO ═══
export function CombatContractModule() {
  const [initiative, setInitiative] = useState<'player' | 'enemy'>('player');
  const [sim, setSim] = useState(() => simInitialState('player'));
  const [entries, setEntries] = useState<SimEntry[]>([]);
  const [lastErr, setLastErr] = useState<string | null>(null);
  const [simPhase, setSimPhase] = useState<SimPhase>('idle');
  const snap = useMemo(() => getDevProjectSnapshot(), []);
  const w = stageWindowsTicks();

  const apply = (label: string, res: ReturnType<typeof simCommand>) => {
    if (!res.ok) { setLastErr(`${label}: ${res.reason}`); return false; }
    setLastErr(null);
    setSim(res.state);
    const ro = contractReadout(res.state);
    setEntries(prev => [...prev, { tick: res.state.tick, label, control: ro.control }]);
    return true;
  };

  const reset = () => {
    setSim(simInitialState(initiative));
    setEntries([]);
    setLastErr(null);
    setSimPhase('idle');
  };

  const ro = useMemo(() => contractReadout(sim), [sim]);
  const expected = simExpectedKey(sim);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Combat Contract</h1>
        <p className="dev-sub">
          Contrato canónico del combate (<code>docs/COMBAT_CONTRACT.md</code>) — rondas · fronteras de control ·
          ejecución de acciones · simulador con el Engine real. El juego nunca toma una nueva decisión por el jugador.
        </p>
      </header>

      {/* 1 — Rondas */}
      <div className="dev-section">
        <h2>Esquema de rondas</h2>
        <div className="cc-init-toggle">
          <span>Iniciativa del simulador:</span>
          <button className={`dev-chip ${initiative === 'player' ? 'active' : ''}`} onClick={() => { setInitiative('player'); reset(); }}>PLAYER ★</button>
          <button className={`dev-chip ${initiative === 'enemy' ? 'active' : ''}`} onClick={() => { setInitiative('enemy'); reset(); }}>ENEMY ★</button>
        </div>
        <RoundScheme initiative={initiative} />
      </div>

      {/* 2 — Action execution */}
      <div className="dev-section">
        <h2>Ejecución de acciones</h2>
        <ActionScheme />
      </div>

      {/* 3 — Boundaries */}
      <div className="dev-section">
        <h2>Fronteras de control</h2>
        <BoundaryScheme />
      </div>

      {/* 4 — Simulador */}
      <div className="dev-section">
        <h2>Simulador del contrato (Engine real)</h2>
        <p className="dev-muted" style={{ marginTop: -4 }}>
          Navega una ronda real paso a paso: cada acción pasa por el Engine y el readout muestra dónde el juego se detiene.
        </p>
        <div className="cc-sim-toolbar">
          <button className="dev-btn" onClick={reset}>↺ Reiniciar ronda</button>
          {simPhase === 'idle' && ro.control === 'PLAYER_ATTACK_CHOICE' && (
            <button className="dev-btn" onClick={() => {
              setSimPhase('action');
              const st = { ...sim, phase: 'basic' as never };
              const prep = simCommand(st, { type: 'BASIC_STAGE_ATTACK' }, { side: 'player', characterId: 'goku' });
              if (apply('Elegir Stage Attack (BASIC)', prep)) setSim(prep.state);
            }}>Elegir Stage Attack</button>
          )}
          {simPhase === 'action' && ro.execution === 'PREPARING' && (
            <button className="dev-btn" onClick={() => {
              const o = simOpenQte(sim);
              if (o.ok) { apply('Preparación completa → inputs', o); setSim(o.state); }
            }}>Completar preparación → inputs</button>
          )}
          {ro.execution === 'WAITING_INPUT' && expected && (
            <button className="dev-btn" onClick={() => {
              const r = simCommand(sim, { type: 'QTE_INPUT', input: expected }, { side: 'player' });
              if (r.ok && r.state.stageQte.state === 'COMPLETED') setSimPhase('done');
              apply(`Input Stage: ${expected}`, r);
            }}>Input Stage: {expected}</button>
          )}
          {simPhase === 'done' && ro.control === 'RESOLVING' && (
            <button className="dev-btn" onClick={() => {
              const r = simCommand(simClearQte(sim), { type: 'END_EXCHANGE' }, { side: 'player' });
              if (apply('Terminar exchange 0 → DEFENSE', r)) {
                const d = simCommand({ ...r.state, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as const }, { type: 'RESET_DEFENSE' }, { side: 'player' });
                if (apply('Abrir ventana defensiva', d)) setSim(d.state);
              }
            }}>Terminar exchange → DEFENSE</button>
          )}
          {ro.control === 'PLAYER_DEFENSE_CHOICE' && (
            <button className="dev-btn" onClick={() => {
              const g = simCommand(sim, { type: 'GUARD' }, { side: 'player', characterId: 'goku' });
              if (apply('Elegir GUARD', g)) setSimPhase('defense');
            }}>Elegir GUARD</button>
          )}
          {simPhase === 'defense' && ro.control === 'RESOLVING' && ro.execution === 'IDLE' && (
            <button className="dev-btn" onClick={() => {
              const r = simCommand(sim, { type: 'END_EXCHANGE' }, { side: 'player' });
              if (apply('Terminar exchange 1 → FIN DE RONDA', r)) {
                setSim(r.state);
                if (r.state.exchange === 0) setSimPhase('idle');
              }
            }}>Terminar exchange 1 → nueva ronda</button>
          )}
          {ro.control === 'PLAYER_ATTACK_CHOICE' && simPhase === 'idle' && entries.length > 0 && (
            <span className="dev-tag ok">RONDA COMPLETA — el juego espera tu decisión en la nueva ronda</span>
          )}
          {lastErr && <span className="dev-tag bad">{lastErr}</span>}
        </div>
        <LiveReadout ro={ro} entries={entries} />
      </div>

      {/* 5 — Config del contrato */}
      <div className="dev-section">
        <h2>Configuración del contrato (canon — solo lectura)</h2>
        <p className="dev-muted" style={{ marginTop: -4 }}>
          Los valores viven en <code>config/gameplay.config.ts</code> (CANON LOCKED) y el reloj
          (<code>battle/engine/clock</code>). El Dev Studio los visualiza, no los edita.
        </p>
        <div className="cc-config">
          <div className="cc-config-row"><span>Reloj nativo GBC</span><code>{GBC_NATIVE_FPS} fps</code></div>
          <div className="cc-config-row"><span>Preparación Stage (PREPARING)</span><code>{STAGE_PREP_TICKS} ticks ≈ {Math.round((STAGE_PREP_TICKS / GBC_NATIVE_FPS) * 1000)} ms</code></div>
          <div className="cc-config-row"><span>Ventana QTE BACK_BACK</span><code>{w.BACK_BACK} ticks ≈ {Math.round((w.BACK_BACK / GBC_NATIVE_FPS) * 1000)} ms</code></div>
          <div className="cc-config-row"><span>Ventana QTE BACK_FRONT</span><code>{w.BACK_FRONT} ticks ≈ {Math.round((w.BACK_FRONT / GBC_NATIVE_FPS) * 1000)} ms</code></div>
          <div className="cc-config-row"><span>Ventana QTE FRONT_BACK</span><code>{w.FRONT_BACK} ticks ≈ {Math.round((w.FRONT_BACK / GBC_NATIVE_FPS) * 1000)} ms</code></div>
          <div className="cc-config-row"><span>Ventana QTE FRONT_FRONT</span><code>{w.FRONT_FRONT} ticks ≈ {Math.round((w.FRONT_FRONT / GBC_NATIVE_FPS) * 1000)} ms</code></div>
          <div className="cc-config-row"><span>Stage básico / con GATHER</span><code>3 / 4 etapas · cartas 5/6 Stage en catálogo</code></div>
          <div className="cc-config-row"><span>Defensa</span><code>GUARD · MOVE(H|V) · carta defensiva/support — sin QTE</code></div>
          <div className="cc-config-row"><span>F0 (cinematografía)</span><code>{snap.cinematics.gbcVerified} verificadas · {snap.cinematics.gbcInferred} INFERRED — nada INFERRED se llama canon GBC</code></div>
        </div>
      </div>
    </div>
  );
}

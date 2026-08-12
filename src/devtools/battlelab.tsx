// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Battle Lab (WIP)
// Combate instantáneo con estado editable + depurador. Esqueleto —
// aquí se expondrá el estado interno de BattleScreen (fase, QTE,
// CC, posiciones, stages) para inspección y salto de fase.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { FORMS } from '../data/roster';

const PHASES = [
  'position', 'command', 'basic', 'limitSelect', 'cardSelect',
  'stageInput', 'enemyTurn', 'defend', 'win', 'lose',
];

export function BattleLabModule() {
  const [player, setPlayer] = useState('gohan_young');
  const [enemy, setEnemy] = useState('piccolo_base');
  const [phase, setPhase] = useState('command');

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Battle Lab</h1>
        <p className="dev-sub">Combate instantáneo + Internal State Inspector — <strong>WIP</strong> (esqueleto).</p>
      </header>

      <div className="dev-wip-banner">
        ⚠ En desarrollo. Objetivo: instanciar <em>BattleScreen</em> con estado editable
        (HP/CC/posiciones/stages/fase) para reproducir situaciones arbitrarias sin jugar
        la partida completa. El QTE Debugger (freeze + step) irá vinculado aquí.
      </div>

      <div className="dev-battlelab-layout">
        <div className="dev-sprite-controls">
          <label>Player</label>
          <select value={player} onChange={e => setPlayer(e.target.value)}>
            {Object.keys(FORMS).map(fid => <option key={fid} value={fid}>{fid}</option>)}
          </select>

          <label>Enemy</label>
          <select value={enemy} onChange={e => setEnemy(e.target.value)}>
            {Object.keys(FORMS).map(fid => <option key={fid} value={fid}>{fid}</option>)}
          </select>

          <label>Fase</label>
          <div className="dev-phase-pills">
            {PHASES.map(p => (
              <button key={p} className={`dev-phase-pill ${phase === p ? 'active' : ''}`} onClick={() => setPhase(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="dev-battlelab-readout">
          <div><label>Matchup</label><strong>{player} vs {enemy}</strong></div>
          <div><label>Fase objetivo</label><strong>{phase}</strong></div>
          <div><label>Estado</label><strong>no conectado al motor (placeholder)</strong></div>
        </div>
      </div>
    </div>
  );
}

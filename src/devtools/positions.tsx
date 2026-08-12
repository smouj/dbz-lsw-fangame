// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Position Lab
// Las 4 posiciones GBC + reglas de MOVE (2 ejes) y vulnerabilidades.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  BATTLE_POSITIONS, POSITION_DATA, applyMoveAxis, positionLabel, POSITION_NAMES,
  isBeamVulnerable, isDamageVulnerable, attackModifier, defenseModifier,
  resolveRelativeDistance, BattlePosition, type MoveAxis,
} from '../data/positions';

export function PositionsModule() {
  const [player, setPlayer] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [enemy, setEnemy] = useState<BattlePosition>(BattlePosition.DOWN_BACK);

  const dist = resolveRelativeDistance(player, enemy);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Position Lab</h1>
        <p className="dev-sub">Manual GBC: Air/Ground × Front/Back · MOVE solo 2 ejes · vulnerabilidades por posición.</p>
      </header>

      <div className="dev-pos-layout">
        {/* Tablero 2×2 (arriba=AIR, abajo=GROUND; izquierda=BACK, derecha=FRONT) */}
        <div className="dev-pos-board">
          {BATTLE_POSITIONS.map(pos => (
            <div key={pos} className={`dev-pos-cell ${pos.toLowerCase()}`}>
              <div className="dev-pos-cell-name">{POSITION_NAMES[pos]}</div>
              <div className="dev-pos-cell-alt">{POSITION_DATA[pos].altitude} · {POSITION_DATA[pos].depth}</div>
              <div className="dev-pos-cell-markers">
                {player === pos && <span className="dev-pos-marker player">JUG</span>}
                {enemy === pos && <span className="dev-pos-marker enemy">RIV</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="dev-pos-controls">
          <h3>Player</h3>
          <div className="dev-pos-select-row">
            <select value={player} onChange={e => setPlayer(e.target.value as BattlePosition)}>
              {BATTLE_POSITIONS.map(p => <option key={p} value={p}>{POSITION_NAMES[p]} ({positionLabel(p)})</option>)}
            </select>
          </div>

          <h3>Enemy</h3>
          <div className="dev-pos-select-row">
            <select value={enemy} onChange={e => setEnemy(e.target.value as BattlePosition)}>
              {BATTLE_POSITIONS.map(p => <option key={p} value={p}>{POSITION_NAMES[p]} ({positionLabel(p)})</option>)}
            </select>
          </div>

          <h3>MOVE (solo 2 ejes, como el GBC)</h3>
          <div className="dev-pos-actions">
            <button className="dev-btn" onClick={() => setPlayer(p => applyMoveAxis(p, 'HORIZONTAL'))}>↔ HORIZONTAL (depth)</button>
            <button className="dev-btn" onClick={() => setPlayer(p => applyMoveAxis(p, 'VERTICAL'))}>↕ VERTICAL (altitude)</button>
          </div>

          <div className="dev-pos-rules">
            <div><strong>Distancia relativa:</strong> {dist}</div>
            <div><strong>Vulnerable a BEAM:</strong> {isBeamVulnerable(player) ? 'SÍ (AIR)' : 'no (GROUND)'}</div>
            <div><strong>Vulnerable a DAMAGE:</strong> {isDamageVulnerable(player) ? 'SÍ (GROUND)' : 'no (AIR)'}</div>
            <div><strong>attackMod:</strong> {attackModifier(player)} · <strong>defenseMod:</strong> {defenseModifier(player)}</div>
            <div className="dev-pos-note">
              HORIZONTAL cambia depth (BACK↔FRONT) · VERTICAL cambia altitude (AIR↔GROUND).
              Avanzar a FRONT con el rival en BACK lo empuja a FRONT (altitud intacta).
              BACK = ataque↓ defensa↑ · FRONT = ataque↑ defensa↓.
            </div>
          </div>

          <div className="dev-pos-preview">
            <h3>Preview MOVE</h3>
            {(['HORIZONTAL', 'VERTICAL'] as MoveAxis[]).map(axis => (
              <div key={axis} className="dev-pos-prev-row">
                <span>{axis}</span>
                <code>{POSITION_NAMES[player]}</code> → <code>{POSITION_NAMES[applyMoveAxis(player, axis)]}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

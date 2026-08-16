// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Position Lab
// Las 4 posiciones GBC + reglas de MOVE (2 ejes) y vulnerabilidades.
// ═══════════════════════════════════════════════════════════
import { useState, type PointerEvent } from 'react';
import {
  BATTLE_POSITIONS, POSITION_DATA, applyMoveAxis, positionLabel, POSITION_NAMES,
  isBeamVulnerable, isDamageVulnerable, attackModifier, defenseModifier,
  resolveRelativeDistance, BattlePosition, type MoveAxis, anchorFor, defaultAnchorFor,
  setPositionAnchorOverride, clearPositionAnchorOverrides, loadPositionAnchorOverrides,
  type PositionSide,
} from '../data/positions';
import { FORMS } from '../data/roster';
import { SCENARIOS } from '../data/scenarios';
import { overworldUrl } from '../data/overworld';
import { facingFlip } from '../data/facing';

export function PositionsModule() {
  const [player, setPlayer] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [enemy, setEnemy] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [playerFormId, setPlayerFormId] = useState('goku_base');
  const [enemyFormId, setEnemyFormId] = useState('piccolo_base');
  const [scenarioId, setScenarioId] = useState('scenario_01');
  const [editSide, setEditSide] = useState<PositionSide>('LEFT');
  const [editPos, setEditPos] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [, setOverrideVersion] = useState(0);

  const dist = resolveRelativeDistance(player, enemy);
  const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
  const playerAnchor = anchorFor(player, 'LEFT');
  const enemyAnchor = anchorFor(enemy, 'RIGHT');
  const editingAnchor = anchorFor(editPos, editSide);
  const defaultEditingAnchor = defaultAnchorFor(editPos, editSide);

  function updateAnchor(axis: 'x' | 'y', value: number) {
    const next = { ...editingAnchor, [axis]: value };
    setPositionAnchorOverride(editSide, editPos, next);
    setOverrideVersion(v => v + 1);
  }

  function setEditingAnchorFromPointer(e: PointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(12, Math.min(88, ((e.clientY - rect.top) / rect.height) * 100));
    setPositionAnchorOverride(editSide, editPos, { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
    setOverrideVersion(v => v + 1);
  }

  function resetOneAnchor() {
    setPositionAnchorOverride(editSide, editPos, defaultEditingAnchor);
    setOverrideVersion(v => v + 1);
  }

  function resetAllAnchors() {
    clearPositionAnchorOverrides();
    setOverrideVersion(v => v + 1);
  }

  function exportAnchors() {
    const overrides = loadPositionAnchorOverrides();
    navigator.clipboard?.writeText(JSON.stringify(overrides, null, 2)).catch(() => {});
  }

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Position Lab</h1>
        <p className="dev-sub">Manual GBC: Air/Ground × Front/Back · MOVE solo 2 ejes · vulnerabilidades por posición.</p>
      </header>

      <div className="dev-pos-layout">
        <div className="dev-pos-field-panel">
          <div
            className="dev-pos-field"
            style={{ backgroundImage: `url(${scenario.overviewBackground})` }}
            onPointerDown={setEditingAnchorFromPointer}
          >
            {overworldUrl(playerFormId) && (
              <img
                src={overworldUrl(playerFormId)}
                alt=""
                className="dev-pos-overworld player"
                style={{
                  left: `${playerAnchor.x}%`,
                  top: `${playerAnchor.y}%`,
                  transform: `translate(-50%, -100%) scaleX(${facingFlip(playerFormId, 'left')})`,
                }}
              />
            )}
            {overworldUrl(enemyFormId) && (
              <img
                src={overworldUrl(enemyFormId)}
                alt=""
                className="dev-pos-overworld enemy"
                style={{
                  left: `${enemyAnchor.x}%`,
                  top: `${enemyAnchor.y}%`,
                  transform: `translate(-50%, -100%) scaleX(${facingFlip(enemyFormId, 'right')})`,
                }}
              />
            )}
            {(['LEFT', 'RIGHT'] as PositionSide[]).flatMap(side => (
              BATTLE_POSITIONS.map(pos => {
                const a = anchorFor(pos, side);
                const active = (side === 'LEFT' && player === pos) || (side === 'RIGHT' && enemy === pos);
                const editing = editSide === side && editPos === pos;
                return (
                  <button
                    key={`${side}-${pos}`}
                    className={`dev-pos-anchor ${side.toLowerCase()} ${active ? 'active' : ''} ${editing ? 'editing' : ''}`}
                    style={{ left: `${a.x}%`, top: `${a.y}%` }}
                    onClick={() => { setEditSide(side); setEditPos(pos); }}
                    onPointerDown={e => { e.stopPropagation(); setEditSide(side); setEditPos(pos); }}
                    type="button"
                    title={`${side} ${pos} ${a.x}/${a.y}`}
                  >
                    {side[0]}{pos.includes('FRONT') ? 'F' : 'B'}{pos.includes('UP') ? 'A' : 'G'}
                  </button>
                );
              })
            ))}
          </div>

          <div className="dev-pos-board compact">
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
        </div>

        {/* Controles */}
        <div className="dev-pos-controls">
          <h3>Escenario y sprites reales</h3>
          <div className="dev-pos-select-row">
            <select value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
              {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.id.replace('scenario_', 'Escenario ')}</option>)}
            </select>
          </div>
          <div className="dev-pos-select-row">
            <select value={playerFormId} onChange={e => setPlayerFormId(e.target.value)}>
              {Object.entries(FORMS).map(([id, f]) => <option key={id} value={id}>Player: {f.character} / {f.form}</option>)}
            </select>
          </div>
          <div className="dev-pos-select-row">
            <select value={enemyFormId} onChange={e => setEnemyFormId(e.target.value)}>
              {Object.entries(FORMS).map(([id, f]) => <option key={id} value={id}>Enemy: {f.character} / {f.form}</option>)}
            </select>
          </div>

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

          <h3>Editar anchor del juego</h3>
          <div className="dev-pos-anchor-editor">
            <p className="dev-hint">
              Click en el escenario para mover el anchor seleccionado. Los
              chibis se muestran a 2x como en el runtime Pixi.
            </p>
            <div className="dev-pos-select-row">
              <select value={editSide} onChange={e => setEditSide(e.target.value as PositionSide)}>
                <option value="LEFT">LEFT / Player</option>
                <option value="RIGHT">RIGHT / Enemy</option>
              </select>
            </div>
            <div className="dev-pos-select-row">
              <select value={editPos} onChange={e => setEditPos(e.target.value as BattlePosition)}>
                {BATTLE_POSITIONS.map(p => <option key={p} value={p}>{POSITION_NAMES[p]}</option>)}
              </select>
            </div>
            <label>
              <span>X {editingAnchor.x}%</span>
              <input type="range" min={4} max={96} step={0.5} value={editingAnchor.x} onChange={e => updateAnchor('x', Number(e.target.value))} />
            </label>
            <label>
              <span>Y {editingAnchor.y}%</span>
              <input type="range" min={12} max={88} step={0.5} value={editingAnchor.y} onChange={e => updateAnchor('y', Number(e.target.value))} />
            </label>
            <div className="dev-pos-actions">
              <button className="dev-btn" onClick={resetOneAnchor}>Reset punto</button>
              <button className="dev-btn" onClick={resetAllAnchors}>Reset todos</button>
              <button className="dev-btn" onClick={exportAnchors}>Copiar JSON</button>
            </div>
            <code>{editSide}.{editPos}: {editingAnchor.x}, {editingAnchor.y}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

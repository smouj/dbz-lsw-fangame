// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Position Lab (estilo HUD Studio)
// Las 4 posiciones GBC + reglas de MOVE (2 ejes) y vulnerabilidades,
// con el MISMO preview del juego (battle-screen + HUD real + actores
// overworld anclados con anchorFor — la fuente única que edita el lab).
// Click en un marcador P/E del campo recoloca al luchador; los anchors
// se siguen pudiendo editar (localStorage 'dbzlsw:position-anchors').
// ═══════════════════════════════════════════════════════════
import { useState, type PointerEvent, useMemo } from 'react';
import {
  BATTLE_POSITIONS, POSITION_DATA, applyMoveAxis, positionLabel, POSITION_NAMES,
  isBeamVulnerable, isDamageVulnerable, attackModifier, defenseModifier,
  resolveRelativeDistance, BattlePosition, type MoveAxis, anchorFor, defaultAnchorFor,
  setPositionAnchorOverride, clearPositionAnchorOverrides, loadPositionAnchorOverrides,
  type PositionSide, ACTION_CENTER_ANCHOR,
} from '../data/positions';
import { FORMS, getForm } from '../data/roster';
import { SCENARIOS } from '../data/scenarios';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { overworldUrl } from '../data/overworld';
import { facingFlip } from '../data/facing';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { tipBlock } from '../data/tooltips';
import { Download, RotateCcw, MoveHorizontal, MoveVertical, Crosshair } from 'lucide-react';

// Abreviaturas GBC para los marcadores del campo
const POS_SHORT: Record<BattlePosition, string> = {
  [BattlePosition.UP_BACK]: 'UB',
  [BattlePosition.UP_FRONT]: 'UF',
  [BattlePosition.DOWN_BACK]: 'DB',
  [BattlePosition.DOWN_FRONT]: 'DF',
};

function PreviewHpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`hp-bar ${side} ${pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct + 8}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PositionsModule() {
  const [player, setPlayer] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [enemy, setEnemy] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [playerFormId, setPlayerFormId] = useState('goku_base');
  const [enemyFormId, setEnemyFormId] = useState('piccolo_base');
  const [scenarioId, setScenarioId] = useState('scenario_01');
  const [editSide, setEditSide] = useState<PositionSide>('LEFT');
  const [editPos, setEditPos] = useState<BattlePosition>(BattlePosition.DOWN_BACK);
  const [devAids, setDevAids] = useState(true);   // anclas + marcadores (OFF = captura limpia)
  const [, setOverrideVersion] = useState(0);

  const dist = resolveRelativeDistance(player, enemy);
  const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0];
  const playerAnchor = anchorFor(player, 'LEFT');
  const enemyAnchor = anchorFor(enemy, 'RIGHT');
  const editingAnchor = anchorFor(editPos, editSide);
  const defaultEditingAnchor = defaultAnchorFor(editPos, editSide);

  const playerForm = useMemo(() => getForm(playerFormId), [playerFormId]);
  const enemyForm = useMemo(() => getForm(enemyFormId), [enemyFormId]);
  const pPortrait = BATTLE_PORTRAITS[playerFormId];
  const ePortrait = BATTLE_PORTRAITS[enemyFormId];
  // Actor overworld REAL del juego (chibi con aura si el manifest la tiene;
  // fallback al chibi *_ow.png — mismo criterio que el runtime)
  // Position Lab is a tactical OVERWORLD view. Use its canonical form map;
  // never substitute a battle-sheet idle whose name was assembled in the UI.
  const pOverworld = battleOverworldActorUrl(playerFormId, 'idle') ?? overworldUrl(playerFormId);
  const eOverworld = battleOverworldActorUrl(enemyFormId, 'idle') ?? overworldUrl(enemyFormId);

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
        <h1>Position Lab <Crosshair size={16} style={{ color: 'var(--dev-ki)' }} /></h1>
        <p className="dev-sub">
          Canon GBC — <strong>4 posiciones</strong> (AIR/GROUND × FRONT/BACK) · MOVE solo 2 ejes ·
          vulnerabilidades y modificadores por posición. Preview <strong>idéntico al juego</strong>
          (mismo markup <code>battle-screen</code> que el HUD Studio): los luchadores se anclan con{' '}
          <code>anchorFor(pos, side)</code>, la fuente única que editas aquí. Click en un marcador
          P/E del campo recoloca al luchador.
        </p>
      </header>
      <div className="dev-hud">
        <div className="dev-hud-head">
        <div className="dev-hud-actions">
          <button className="dev-btn" onClick={exportAnchors}><Download size={15} /> Copiar anchors JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={resetAllAnchors}><RotateCcw size={15} /> Reset anchors</button>
        </div>
      </div>

      {/* ═══ Selector: posiciones P/E + escenario + ayudas (chips HUD Studio) ═══ */}
      <div className="dev-hud-view-select">
        <div className="dev-pos-chip-group">
          <span className="dev-pos-chip-label">PLAYER</span>
          {BATTLE_POSITIONS.map(p => (
            <button key={p} className={`dev-hud-view-chip dev-pos-chip-p ${player === p ? 'active' : ''}`}
              onClick={() => setPlayer(p)} title={`${POSITION_NAMES[p]} (${positionLabel(p)})`}>
              {POS_SHORT[p]}
            </button>
          ))}
        </div>
        <div className="dev-pos-chip-group">
          <span className="dev-pos-chip-label">ENEMY</span>
          {BATTLE_POSITIONS.map(p => (
            <button key={p} className={`dev-hud-view-chip dev-pos-chip-e ${enemy === p ? 'active' : ''}`}
              onClick={() => setEnemy(p)} title={`${POSITION_NAMES[p]} (${positionLabel(p)})`}>
              {POS_SHORT[p]}
            </button>
          ))}
        </div>
        <div className="dev-hud-scenario" title="Escenario del battlefield (fondo overview del catálogo)">
          <label>FONDO</label>
          <select value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
            {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.id.replace('scenario_', 'SC ')}</option>)}
          </select>
        </div>
        <button className={`dev-hud-view-chip side-toggle ${devAids ? 'active' : ''}`}
          onClick={() => setDevAids(a => !a)}
          title="Muestra/oculta los marcadores P/E de las 4 posiciones + anclas — desactívalos para una captura limpia">
          {devAids ? 'ANCLAS: ON' : 'ANCLAS: OFF'}
        </button>
        <span className="dev-pos-dist-chip" data-tip={tipBlock('DISTANCIA', [['stats', `${positionLabel(player)} vs ${positionLabel(enemy)}`], ['desc', 'FAR / MID / CLOSE según las 2 posiciones (rules GBC).']])}>
          DIST <strong>{dist}</strong>
        </span>
      </div>

      {/* ═══ PREVIEW REAL (battle-screen con HUD — paridad con el juego) ═══ */}
      <div className="dev-hud-grid">
        <div className="dev-hud-preview">
          <div className="battle-screen view-overview dev-hud-real-preview">
            <div className="hud-top">
              <div className="fighter-hud left">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>{(playerForm?.character ?? 'GOKU').toUpperCase()}</strong>
                  <span className="hud-form">{playerForm?.form ?? 'Base'}</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={720} max={1000} side="left" />
                <div className="hud-info-row">
                  <div className="hud-status">
                    <span className="status-chip buff">STR+</span>
                  </div>
                  <span className="hud-phase phase-atk">ATTACK</span>
                </div>
              </div>
              <div className="fighter-hud right">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {ePortrait ? <img src={ePortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>{(enemyForm?.character ?? 'PICCOLO').toUpperCase()}</strong>
                  <span className="hud-form">{enemyForm?.form ?? 'Base'}</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={880} max={1000} side="right" />
                <div className="hud-info-row">
                  <div className="hud-status right">
                    <span className="status-chip debuff">SPD−</span>
                  </div>
                  <span className="hud-phase phase-def">DEFEND</span>
                </div>
              </div>
              <div className="hud-center-badge">
                <span className="hud-center-vs">VS</span>
                <span className="hud-center-round">ROUND 1</span>
              </div>
            </div>

            <div className="battlefield">
              <div className="battle-bg authentic" style={{ backgroundImage: `url(${scenario.overviewBackground})` }} />
              <div className="battlefield-fighters">
                {devAids && (
                  <>
                    {/* Marcadores de las 4 posiciones × 2 lados: click = recolocar
                        al luchador de ese lado en esa posición (ancla real) */}
                    {BATTLE_POSITIONS.flatMap(pos => (
                      (['LEFT', 'RIGHT'] as PositionSide[]).map(side => {
                        const a = anchorFor(pos, side);
                        const active = (side === 'LEFT' && player === pos) || (side === 'RIGHT' && enemy === pos);
                        return (
                          <button
                            key={`${side}-${pos}`}
                            className={`dev-pos-field-marker ${side.toLowerCase()} ${active ? 'active' : ''}`}
                            style={{ left: `${a.x}%`, top: `${a.y}%` }}
                            onClick={e => { e.stopPropagation(); if (side === 'LEFT') setPlayer(pos); else setEnemy(pos); }}
                            title={`${side === 'LEFT' ? 'Player' : 'Enemy'} → ${POSITION_NAMES[pos]} (${positionLabel(pos)})`}
                            type="button"
                          >
                            {POS_SHORT[pos]}
                          </button>
                        );
                      })
                    ))}
                    {/* Ancla real P/E (cruz + coords) — la que edita el lab */}
                    <div className="dev-fighter-anchor player" style={{ left: `${playerAnchor.x}%`, top: `${playerAnchor.y}%` }}>
                      <span className="dev-anchor-cross" />
                      <span className="dev-anchor-label">P · {playerAnchor.x},{playerAnchor.y}</span>
                    </div>
                    <div className="dev-fighter-anchor enemy" style={{ left: `${enemyAnchor.x}%`, top: `${enemyAnchor.y}%` }}>
                      <span className="dev-anchor-cross" />
                      <span className="dev-anchor-label">E · {enemyAnchor.x},{enemyAnchor.y}</span>
                    </div>
                  </>
                )}
                {/* Actores reales (chibi overworld, anclados con los PIES en el
                    anchor — translate(-50%,-100%) como el runtime) */}
                {pOverworld && (
                  <img src={pOverworld} alt="" className="dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored player"
                    style={{ left: `${playerAnchor.x}%`, top: `${playerAnchor.y}%`, transform: `translate(-50%, -100%) scaleX(${facingFlip(playerFormId, 'left')})` }} />
                )}
                {eOverworld && (
                  <img src={eOverworld} alt="" className="dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored enemy"
                    style={{ left: `${enemyAnchor.x}%`, top: `${enemyAnchor.y}%`, transform: `translate(-50%, -100%) scaleX(${facingFlip(enemyFormId, 'right')})` }} />
                )}
              </div>
            </div>

            {/* Barra inferior: readout de posición canónico (chips GBC) */}
            <div className="battle-controls dev-hud-battle-controls">
              <div className="phase-chip-row">
                <span className="phase-chip" data-tip={tipBlock('FASE', [['desc', 'ATTACK 1/2 — el readout muestra la posición táctico-espacial de ambos luchadores']])}>ATTACK 1/2</span>
              </div>
              <div className="dev-pos-readout">
                <span className="dev-pos-readout-chip p" title="Posición del jugador"><b>JUG</b> {POSITION_NAMES[player]} <em>{positionLabel(player)}</em></span>
                <span className="dev-pos-readout-chip e" title="Posición del enemigo"><b>RIV</b> {POSITION_NAMES[enemy]} <em>{positionLabel(enemy)}</em></span>
                <span className="dev-pos-readout-chip" title="Distancia relativa (rules GBC)"><b>DIST</b> {dist}</span>
                <span className="dev-pos-readout-chip" title="Modificador de ataque de la posición (GBC)"><b>ATK</b> {attackModifier(player)}</span>
                <span className="dev-pos-readout-chip" title="Modificador de defensa de la posición (GBC)"><b>DEF</b> {defenseModifier(player)}</span>
                <span className={`dev-pos-readout-chip ${isBeamVulnerable(player) ? 'vuln' : ''}`} title="Vulnerabilidad a BEAM (AIR vulnerable)"><b>BEAM</b> {isBeamVulnerable(player) ? 'SÍ' : 'no'}</span>
                <span className={`dev-pos-readout-chip ${isDamageVulnerable(player) ? 'vuln' : ''}`} title="Vulnerabilidad a DAMAGE (GROUND vulnerable)"><b>DMG</b> {isDamageVulnerable(player) ? 'SÍ' : 'no'}</span>
              </div>
              <div className="cc-panel">06</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Controles (grupos estilo HUD Studio) ═══ */}
      <div className="dev-hud-controls">
        <div className="dev-hud-group">
          <h2 className="dev-hud-group-title">Escenario y sprites reales</h2>
          <div className="dev-pos-select-row">
            <label className="dev-pos-select-label">Fondo</label>
            <select value={scenarioId} onChange={e => setScenarioId(e.target.value)}>
              {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.id.replace('scenario_', 'Escenario ')}</option>)}
            </select>
          </div>
          <div className="dev-pos-select-row">
            <label className="dev-pos-select-label">Player</label>
            <select value={playerFormId} onChange={e => setPlayerFormId(e.target.value)}>
              {Object.entries(FORMS).map(([id, f]) => <option key={id} value={id}>{f.character} / {f.form}</option>)}
            </select>
          </div>
          <div className="dev-pos-select-row">
            <label className="dev-pos-select-label">Enemy</label>
            <select value={enemyFormId} onChange={e => setEnemyFormId(e.target.value)}>
              {Object.entries(FORMS).map(([id, f]) => <option key={id} value={id}>{f.character} / {f.form}</option>)}
            </select>
          </div>
        </div>

        <div className="dev-hud-group">
          <h2 className="dev-hud-group-title">MOVE (solo 2 ejes, como el GBC)</h2>
          <div className="dev-pos-actions">
            <button className="dev-btn" onClick={() => setPlayer(p => applyMoveAxis(p, 'HORIZONTAL'))}><MoveHorizontal size={14} /> HORIZONTAL (depth)</button>
            <button className="dev-btn" onClick={() => setPlayer(p => applyMoveAxis(p, 'VERTICAL'))}><MoveVertical size={14} /> VERTICAL (altitude)</button>
          </div>
          <div className="dev-pos-preview">
            {(['HORIZONTAL', 'VERTICAL'] as MoveAxis[]).map(axis => (
              <div key={axis} className="dev-pos-prev-row">
                <span>{axis}</span>
                <code>{POSITION_NAMES[player]}</code> → <code>{POSITION_NAMES[applyMoveAxis(player, axis)]}</code>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-hud-group">
          <h2 className="dev-hud-group-title">Reglas GBC por posición</h2>
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
          <div className="dev-pos-board compact">
            {BATTLE_POSITIONS.map(pos => (
              <div key={pos} className={`dev-pos-cell ${pos.toLowerCase()}`}>
                <div className="dev-pos-cell-name">{POSITION_NAMES[pos]}</div>
                <div className="dev-pos-cell-alt">{POSITION_DATA[pos].altitude} · {POSITION_DATA[pos].depth} · ATK {attackModifier(pos)} · DEF {defenseModifier(pos)}</div>
                <div className="dev-pos-cell-markers">
                  {player === pos && <span className="dev-pos-marker player">JUG</span>}
                  {enemy === pos && <span className="dev-pos-marker enemy">RIV</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-hud-group">
          <h2 className="dev-hud-group-title">Planos de anclaje (LEFT / RIGHT) — mismos anchors que el juego</h2>
          <div className="dev-pos-planes-grid">
            {BATTLE_POSITIONS.map(pos => {
              const la = anchorFor(pos, 'LEFT');
              const ra = anchorFor(pos, 'RIGHT');
              return (
                <div key={pos} className={`dev-pos-plane ${pos.toLowerCase()}`}>
                  <div className="dev-pos-plane-name">{POSITION_NAMES[pos]}</div>
                  <div
                    className="dev-pos-plane-field"
                    style={{ backgroundImage: `url(${scenario.overviewBackground})` }}
                  >
                    {pOverworld && (
                      <img src={pOverworld} alt="" className="dev-pos-plane-chibi left"
                        style={{ left: `${la.x}%`, top: `${la.y}%`, transform: `translate(-50%, -100%) scaleX(${facingFlip(playerFormId, 'left')})` }} />
                    )}
                    {eOverworld && (
                      <img src={eOverworld} alt="" className="dev-pos-plane-chibi right"
                        style={{ left: `${ra.x}%`, top: `${ra.y}%`, transform: `translate(-50%, -100%) scaleX(${facingFlip(enemyFormId, 'right')})` }} />
                    )}
                  </div>
                  <div className="dev-pos-plane-anchors">
                    <code>L {la.x}/{la.y}</code>
                    <code>R {ra.x}/{ra.y}</code>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="dev-pos-plane action-plane">
            <div className="dev-pos-plane-name">ACTION (primer plano)</div>
            <div
              className="dev-pos-plane-field"
              style={{ backgroundImage: `url(${scenario.actionBackground})` }}
            >
              {pOverworld && (
                <img src={pOverworld} alt="" className="dev-pos-plane-chibi left action"
                  style={{ left: `${ACTION_CENTER_ANCHOR.x}%`, top: `${ACTION_CENTER_ANCHOR.y}%`, transform: `translate(-50%, -100%) scaleX(${facingFlip(playerFormId, 'left')})` }} />
              )}
            </div>
            <div className="dev-pos-plane-anchors">
              <code>ACTION {ACTION_CENTER_ANCHOR.x}/{ACTION_CENTER_ANCHOR.y} (escenario centrado · especial espejo 20/80)</code>
            </div>
          </div>
        </div>

        <div className="dev-hud-group">
          <h2 className="dev-hud-group-title">Editar anchor del juego</h2>
          <div className="dev-pos-anchor-editor">
            <p className="dev-hint">
              Click en el escenario del preview mueve el anchor seleccionado
              (persistido en localStorage). Los chibis se anclan con los PIES
              en el anchor, igual que el runtime Pixi.
            </p>
            <div className="dev-pos-select-row">
              <label className="dev-pos-select-label">Lado</label>
              <select value={editSide} onChange={e => setEditSide(e.target.value as PositionSide)}>
                <option value="LEFT">LEFT / Player</option>
                <option value="RIGHT">RIGHT / Enemy</option>
              </select>
            </div>
            <div className="dev-pos-select-row">
              <label className="dev-pos-select-label">Posición</label>
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
    </div>
  );
}

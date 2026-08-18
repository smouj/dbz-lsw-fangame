// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// CONFIGURADOR del tema HUD: colores, HUD, cartas, posición, escala y
// tipografía (33 variables CSS reales consumidas por el juego). El preview
// muestra el HUD con el tema actual (paridad dev↔juego: mismas clases y
// variables). NO es un simulador de combate — las demos/batallas viven en
// el Combat Lab. "Aplicar al juego" inyecta las variables en :root y
// persiste en localStorage.
// ═══════════════════════════════════════════════════════════════════════
import { Check, Download, RotateCcw, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  HUD_THEME_VARS, HudTheme, currentHudTheme, defaultHudTheme,
  saveHudTheme, applyHudTheme, resetHudTheme,
} from '../data/hudTheme';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { SCENARIOS } from '../data/scenarios';
import { getForm } from '../data/roster';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { storyPortraitUrl } from '../data/storyPortraits';
import { anchorFor, BattlePosition } from '../data/positions';
import { downloadJson } from './spriteEditing';
import { getCard, CARD_TYPE_NAMES, CARD_COLORS, CARD_COLORS_ON_LIGHT, CardDef } from '../data/cards';
import { tipBlock, tipCard, TipPart } from '../data/tooltips';
import { cardIconUrl } from '../data/icons';
import { FitArt } from '../components/FitArt';
import { CardArtHole } from '../components/CardArtHole';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from '../data/cardVisuals';
import { HUD_LAYOUT, validateHudLayout } from '../data/hudLayout';

// Formas de ejemplo del mockup (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';

const GROUPS = ['Colores', 'HUD', 'Cartas', 'Posición', 'Escala', 'Tipografía'];

// Vista del preview: cómo se ve el HUD en cada estado (sin motor — visual).
type HudView = 'COMMAND' | 'MANO' | 'BASIC' | 'MOVE' | 'STAGE' | 'LIMIT' | 'DIALOGO' | 'INTRO';

const VIEWS: { id: HudView; label: string; tip: string }[] = [
  { id: 'COMMAND', label: 'Comando', tip: 'Command strip: LIMIT · JOINT · BASIC' },
  { id: 'MANO', label: 'JOINT · Mano', tip: 'Cartas de la mano con sus frames GBC + huecos' },
  { id: 'BASIC', label: 'BASIC', tip: 'Stage Attack (frame de carta) · Gather · Back' },
  { id: 'MOVE', label: 'MOVE', tip: 'Selección de eje: HORIZONTAL ↔ (FRONT/BACK) o VERTICAL ↕ (AIR/GROUND) + preview CURRENT → RESULT' },
  { id: 'STAGE', label: 'STAGE', tip: 'QTE del Stage Attack: inputs con los sprites del paquete' },
  { id: 'LIMIT', label: 'LIMIT', tip: 'Cartas LIMITED del personaje + huecos' },
  { id: 'DIALOGO', label: 'Diálogo', tip: 'Cuadro de mensaje GBC estructurado' },
  { id: 'INTRO', label: 'Intro', tip: 'Presentación de inicio (VS + READY/FIGHT)' },
];

function PreviewHpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`hp-bar ${side} ${pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct + 8}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
        <div className="hp-bar-text">{current}/{max}</div>
      </div>
    </div>
  );
}

// Carta GBC real: mismo render que el juego (frame por tipo + arte centrado)
function HudCard({ card, selected, disabled }: { card: CardDef; selected?: boolean; disabled?: boolean }) {
  const frame = disabled ? CARD_FRAME_DISABLED : selected ? CARD_FRAME_SELECTED : (CARD_FRAME_BY_TYPE[card.type] ?? undefined);
  const iconUrl = cardIconUrl(card.id);
  const color = CARD_COLORS[card.type];
  const tip: TipPart[] = [
    ['stats', `CC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%`],
    card.description ? ['desc', card.description] : null,
  ];
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''}`} disabled={disabled}
      style={{ '--card-color': color, '--card-frame': frame ? `url('${frame}')` : undefined } as React.CSSProperties}
      data-tip={tipCard(card.name, CARD_TYPE_NAMES[card.type], CARD_COLORS_ON_LIGHT[card.type], card.rarity, tip)}>
      <CardArtHole frameUrl={frame} iconUrl={iconUrl} />
    </button>
  );
}

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');
  const [view, setView] = useState<HudView>('COMMAND');
  const [dlgSide, setDlgSide] = useState<'left' | 'right'>('left');
  // Escenario del preview: se puede elegir fondo (overview/action) como en
  // el combate real — los 13 escenarios del catálogo.
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [bgMode, setBgMode] = useState<'overview' | 'action'>('overview');
  // Actor de la ACCIÓN: en el plano ACTION solo aparece el character que
  // va a ejecutar la acción (idle del sheet de batalla) — no ambos.
  const [actor, setActor] = useState<'player' | 'enemy'>('player');

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = battleOverworldActorUrl(P_FORM, 'idle') ?? (pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined);
  const eIdle = battleOverworldActorUrl(E_FORM, 'idle') ?? (eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined);
  // Sprites de ACCIÓN (grandes, del sheet de batalla) — el character correcto
  // para el plano ACTION, como el juego (FighterSprite idle).
  const pAction = pDir ? spriteFrameUrl(P_FORM, `${pDir}_idle_00.png`) : undefined;
  const eAction = eDir ? spriteFrameUrl(E_FORM, `${eDir}_idle_00.png`) : undefined;
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];
  const battleBgUrl = SCENARIOS[scenarioIdx]?.[bgMode === 'overview' ? 'overviewBackground' : 'actionBackground']
    ?? '/assets/backgrounds/scenarios/01_world.png';

  // Cartas reales del catálogo para la vista Mano (como el build)
  const handCards = [13, 7, 5, 1].map(id => getCard(id)).filter((c): c is CardDef => !!c);
  const limitCards = [23, 13, 24].map(id => getCard(id)).filter((c): c is CardDef => !!c);

  const setVar = (key: string, val: string) => setTheme(prev => ({ ...prev, [key]: val }));

  const apply = () => {
    saveHudTheme(theme);
    applyHudTheme(theme);
    setStatus('✓ Aplicado al juego (persistido en localStorage)');
    setTimeout(() => setStatus(''), 2600);
  };

  const resetTheme = () => {
    resetHudTheme();
    setTheme(defaultHudTheme());
    setStatus('↺ Restablecido a los valores por defecto de :root');
    setTimeout(() => setStatus(''), 2600);
  };

  const exportJson = () => downloadJson('hud-theme.json', theme);

  const mockVars = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(theme)) o[k] = v;
    return o as React.CSSProperties;
  }, [theme]);

  return (
    <div className="dev-hud">
      <div className="dev-hud-head">
        <div>
          <h1>HUD Studio</h1>
          <p className="dev-hud-sub">
            Configurador del tema HUD: 33 variables CSS reales (colores, HUD, cartas,
            posición, escala, tipografía) con paridad dev↔juego. El preview muestra el
            HUD con el tema actual; <strong>Aplicar al juego</strong> lo inyecta en{' '}
            <code>:root</code> y lo persiste. Las demos y batallas viven en el{' '}
            <strong>Combat Lab</strong>.
          </p>
        </div>
        <div className="dev-hud-actions">
          <button className="dev-btn dev-btn-primary" onClick={apply}><Check size={15} /> Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}><Download size={15} /> Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={resetTheme}><RotateCcw size={15} /> Reset</button>
        </div>
      </div>
      {status && <div className="dev-hud-status">{status}</div>}

      <div className="dev-hud-view-select" role="tablist" aria-label="Vista del HUD">
        {VIEWS.map(v => (
          <button key={v.id} className={`dev-hud-view-chip ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)} title={v.tip}>
            {v.label}
          </button>
        ))}
        {/* Escenario del battlefield (fondo overview/action) — los 13 del catálogo */}
        <div className="dev-hud-scenario" title="Escenario del battlefield — fondo overview (táctico) o action (animación)">
          <label>FONDO</label>
          <select value={scenarioIdx} onChange={e => setScenarioIdx(Number(e.target.value))}>
            {SCENARIOS.map((s, i) => <option key={s.id} value={i}>{s.id.replace('scenario_', 'SC ')}</option>)}
          </select>
          <div className="dev-hud-bgmode">
            <button className={`bgmode-btn ${bgMode === 'overview' ? 'active' : ''}`} onClick={() => setBgMode('overview')}>OVERVIEW</button>
            <button className={`bgmode-btn ${bgMode === 'action' ? 'active' : ''}`} onClick={() => setBgMode('action')}>ACTION</button>
          </div>
          {bgMode === 'action' && (
            <div className="dev-hud-actor" title="Quién ejecuta la acción (idle del sheet de batalla)">
              <label>ACTÚA</label>
              <button className={`actor-btn ${actor === 'player' ? 'active' : ''}`} onClick={() => setActor('player')}>PLAYER</button>
              <button className={`actor-btn ${actor === 'enemy' ? 'active' : ''}`} onClick={() => setActor('enemy')}>ENEMY</button>
            </div>
          )}
        </div>
        {view === 'DIALOGO' && (
          <button className={`dev-hud-view-chip side-toggle ${dlgSide === 'right' ? 'active' : ''}`}
            onClick={() => setDlgSide(s => (s === 'left' ? 'right' : 'left'))}
            title="Alterna el lado del personaje que habla (izquierda/derecha)">
            Habla: {dlgSide === 'left' ? 'IZQUIERDA (Goku)' : 'DERECHA (Cell)'}
          </button>
        )}
      </div>

      {/* ═══ CONTRATO VISUAL (baseline V1 congelada) ═══ */}
      <div className="dev-section">
        <details className="dev-hud-geo">
          <summary>
            <strong>Geometría canónica — baseline V1</strong>
            <span className="dev-muted" style={{ marginLeft: 8, fontSize: 11 }}>
              {validateHudLayout().ok ? '✓ invariantes OK (80px · 64×48)' : '✗ ' + validateHudLayout().errors.join(' · ')}
            </span>
          </summary>
          <p className="dev-muted" style={{ fontSize: 11, margin: '6px 0 0' }}>
            HUD Studio = fuente de verdad <strong>visual</strong>; BattleEngine = lógica.
            Juego real, preview y Combat Lab consumen estas medidas (CSS via{' '}
            <code>--hud-layout-*</code>). No cambiar de dirección visual.
          </p>
          <div className="dev-pipeline" style={{ marginTop: 8 }}>
            {Object.entries(HUD_LAYOUT).map(([k, v]) => (
              <div key={k} className="dev-pipeline-row">
                <span className="dev-pipeline-file"><code>--hud-layout-{k}</code></span>
                <span className="dev-pipeline-rol"><code style={{ color: '#ffe9a3' }}>{String(v)}</code></span>
                <span className="dev-pipeline-ok">✓</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="dev-hud-grid">
        {/* ─── PREVIEW: el HUD con el tema actual (estático, paridad real) ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          <div className="battle-screen view-overview dev-hud-real-preview">
            {/* INTRO */}
            {view === 'INTRO' && (
              <div className="battle-intro">
                <div className="intro-gbc-window">
                  <div className="intro-gbc-round">ROUND 1</div>
                  <div className="intro-gbc-match">
                    <div className="intro-gbc-side">
                      <div className="intro-gbc-portrait">
                        {pPortrait ? <img src={pPortrait} alt={P_FORM} /> : <span className="dev-hud-mock-ph">?</span>}
                      </div>
                      <div className="intro-gbc-name">GOKU</div>
                      <div className="intro-gbc-form">BASE</div>
                    </div>
                    <div className="intro-vs">VS</div>
                    <div className="intro-gbc-side right">
                      <div className="intro-gbc-portrait">
                        {ePortrait ? <img src={ePortrait} alt={E_FORM} /> : <span className="dev-hud-mock-ph">?</span>}
                      </div>
                      <div className="intro-gbc-name">PICCOLO</div>
                      <div className="intro-gbc-form">BASE</div>
                    </div>
                  </div>
                  <div className="intro-gbc-roles">
                    <span>ATK GOKU</span>
                    <span>DEF PICCOLO</span>
                  </div>
                  <div className="intro-ready">READY</div>
                  <div className="intro-fight">FIGHT!</div>
                </div>
                <div className="intro-flash" />
              </div>
            )}

            {/* HUD superior SIEMPRE visible (como el juego: durante la intro
                la VS screen se superpone, el hud-top queda detrás) */}
            <div className="hud-top">
              <div className="fighter-hud left">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>GOKU</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={720} max={1000} side="left" />
                <div className="hud-info-row">
                  <div className="hud-stats"><span>STR60</span><span>KI55</span><span>SPD50</span><span className="cc-stat"><b>06</b></span></div>
                  <div className="hud-status">
                    <span className="status-chip buff">STR+</span>
                    <span className="status-chip guard">ATK</span>
                  </div>
                </div>
              </div>

              <div className="fighter-hud right">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {ePortrait ? <img src={ePortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>PICCOLO</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={880} max={1000} side="right" />
                <div className="hud-info-row">
                  <div className="hud-stats"><span className="cc-stat"><b>03</b></span><span>STR58</span><span>KI60</span><span>SPD48</span></div>
                  <div className="hud-status right">
                    <span className="status-chip debuff">SPD−</span>
                  </div>
                </div>
              </div>
              <div className="hud-center-badge">
                <span className="hud-center-round">ROUND 1</span>
                <span className="hud-center-vs">VS</span>
                <span className="hud-center-order">GOKU</span>
              </div>
            </div>

            <div className="battlefield">
              <div className="battle-bg authentic" style={{ backgroundImage: `url(${battleBgUrl})` }} />
              <div className="battlefield-fighters">
                {(() => {
                  // ANCLAJE REAL (fuente única): los fighters se posicionan con
                  // anchorFor(pos, side) — los mismos anchors que Position Lab
                  // edita (localStorage 'dbzlsw:position-anchors'). Si cambias
                  // una posición en Positions, el preview del HUD la refleja.
                  const pa = anchorFor(BattlePosition.DOWN_BACK, 'LEFT');
                  const ea = anchorFor(BattlePosition.DOWN_BACK, 'RIGHT');
                  return (
                    <>
                      {/* ANCLA del sprite: el punto EXACTO donde aparece el
                          luchador (mismo anchorFor que el juego y Position Lab) —
                          visible como cruz, para saber dónde se ancla y dónde
                          realiza las animaciones. En ACTION se ocultan: el
                          actor va centrado en la escena. */}
                      {bgMode === 'overview' && (
                        <>
                          <div className="dev-fighter-anchor player" style={{ left: `${pa.x}%`, top: `${pa.y}%` }}>
                            <span className="dev-anchor-cross" />
                            <span className="dev-anchor-label">P · {pa.x},{pa.y}</span>
                          </div>
                          <div className="dev-fighter-anchor enemy" style={{ left: `${ea.x}%`, top: `${ea.y}%` }}>
                            <span className="dev-anchor-cross" />
                            <span className="dev-anchor-label">E · {ea.x},{ea.y}</span>
                          </div>
                          {/* ZONA DE ANIMACIÓN: el área donde el luchador se mueve
                              (escala del sprite overworld, como el juego) */}
                          <div className="dev-anim-zone player" style={{ left: `${pa.x}%`, top: `${pa.y}%` }}>
                            <span className="dev-anim-zone-label">ANIM</span>
                          </div>
                          <div className="dev-anim-zone enemy" style={{ left: `${ea.x}%`, top: `${ea.y}%` }}>
                            <span className="dev-anim-zone-label">ANIM</span>
                          </div>
                        </>
                      )}
                      {/* Character correcto por plano:
                          OVERVIEW → chibi overworld (16×16 del GBC) — AMBOS
                          ACTION   → sprite de acción grande (idle del sheet)
                                     SOLO el actor (el que ejecuta la acción)
                          Ambos anclados igual que Position Lab:
                          translate(-50%,-100%) → los PIES tocan el anchor exacto. */}
                      {/* ACTION: el actor se centra en la ESCENA (x=50, y=68)
                          — en el medio, no a un lado (el plano de acción es
                          de uno solo, en primer plano) */}
                      {(bgMode === 'overview' ? pIdle : (actor === 'player' ? pAction : undefined)) && (
                        <img src={bgMode === 'overview' ? pIdle : pAction} alt=""
                          className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored player ${bgMode === 'action' ? 'action-mode' : ''}`}
                          style={bgMode === 'action' ? { left: '50%', top: '68%' } : { left: `${pa.x}%`, top: `${pa.y}%` }} />
                      )}
                      {(bgMode === 'overview' ? eIdle : (actor === 'enemy' ? eAction : undefined)) && (
                        <img src={bgMode === 'overview' ? eIdle : eAction} alt=""
                          className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored enemy ${bgMode === 'action' ? 'action-mode' : ''}`}
                          style={bgMode === 'action' ? { left: '50%', top: '68%' } : { left: `${ea.x}%`, top: `${ea.y}%` }} />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="phase-bar">
              <div className="phase-info">
                <span className="turn-label">TURN 1</span>
                <span className="speed-order-label">GOKU FIRST</span>
                <span className="phase-label">ATTACK 1/2</span>
              </div>
            </div>

            {/* CC dock real (igual que el juego: P/E con barra y valor) */}
            <div className="cc-dock" aria-label="Card Cost">
              <div className="cc-pocket player">
                <span className="cc-pocket-label">P</span>
                <div className="cc-display">
                  <span className="cc-label">CC</span>
                  <div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: '6%' }} /></div>
                  <span className="cc-value">6<span className="cc-max">/99</span></span>
                </div>
              </div>
              <div className="cc-pocket enemy">
                <span className="cc-pocket-label">E</span>
                <div className="cc-display">
                  <span className="cc-label">CC</span>
                  <div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: '3%' }} /></div>
                  <span className="cc-value">3<span className="cc-max">/99</span></span>
                </div>
              </div>
            </div>

            <div className="battle-controls dev-hud-battle-controls">
              {/* DIÁLOGO (cuadro GBC estructurado) — dentro de la caja,
                  misma altura que los botones */}
              {view === 'DIALOGO' && (
                <div className={`gbc-dialogue speaker-${dlgSide}`}>
                  {/* Sprite de STORY del que habla, FUERA de la caja (izquierda
                      o derecha según el lado), con máscara y marco negro —
                      la caja no cambia de tamaño */}
                  <div className={`gbc-dialogue-speaker ${dlgSide}`}>
                    <img src={(dlgSide === 'left' ? storyPortraitUrl('goku', P_FORM) || pPortrait : storyPortraitUrl('cell', P_FORM)) || ''} alt={dlgSide === 'left' ? 'GOKU' : 'CELL'} className="gbc-dialogue-speaker-img" draggable={false} />
                  </div>
                  <div className="gbc-dialogue-body">
                    <div className="gbc-dialogue-content">
                      <div className="gbc-dialogue-actor">{dlgSide === 'left' ? 'GOKU' : 'CELL'}</div>
                      <div className="gbc-dialogue-text">uses {dlgSide === 'left' ? 'KAMEHAMEHA!' : 'SPECIAL BEAM CANNON!'}<span className="gbc-dialogue-cursor">▼</span></div>
                    </div>
                  </div>
                </div>
              )}
              {/* COMMAND: LIMIT · JOINT · BASIC */}
              {view === 'COMMAND' && (
                <div className="command-select">
                  <div className="command-strip">
                    <button className="cmd-limit" data-tip={tipBlock('LIMITED', [['desc', 'Cartas exclusivas del personaje.']])} />
                    <button className="cmd-j" data-tip={tipBlock('JOINT', [['desc', 'Cartas de tu mano.']])} />
                    <button className="cmd-b" data-tip={tipBlock('BASIC', [['desc', 'Acciones libres sin CC.']])} />
                  </div>
                </div>
              )}

              {/* MANO: cartas reales + HUECOS hasta el máximo (6 transitorio /
                  5 persistente) — como en LIMIT, se ve cuántas cartas caben */}
              {view === 'MANO' && (
                <div className="hand-area">
                  <div className="hand-label">— MANO ({handCards.length}/6) —</div>
                  <div className="hand-cards">
                    {handCards.map((card, i) => (
                      <HudCard key={card.id} card={card} selected={i === 1} disabled={i === 2} />
                    ))}
                    {Array.from({ length: 6 - handCards.length }).map((_, i) => (
                      <div key={`slot-${i}`} className="limit-slot" data-tip={tipBlock('HUECO DE MANO', [
                        ['desc', 'Máx 6 transitorio (5 persistente).'],
                      ])}>
                        <span className="hand-slot-mark">+</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BASIC: Stage = LA CARTA REAL (igual que en la mano) · Gather · Back */}
              {view === 'BASIC' && (
                <div className="command-select">
                  <div className="basic-menu">
                    {(() => {
                      const stageCard = getCard(1);   // "3 stage atk." (id N-2)
                      return stageCard ? (
                        <button className="card basic-stage-card"
                          style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command}')`, '--card-color': CARD_COLORS[stageCard.type] } as React.CSSProperties}
                          data-tip={tipBlock('STAGE ATTACK — 3 STAGE', [
                            ['desc', 'Secuencia de inputs A/B a tiempo.'],
                            ['effect', 'Cada acierto +1 CC (más si completas la cadena).'],
                          ])}>
                          <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command} iconUrl={cardIconUrl(stageCard.id)} />
                        </button>
                      ) : null;
                    })()}
                    <button className="basic-btn basic-gather" data-tip={tipBlock('GATHER POWER', [['stats', 'STR/KI +8']])} />
                    <button className="basic-btn basic-back" data-tip={tipBlock('BACK', [['desc', 'Volver al menú anterior']])} />
                  </div>
                </div>
              )}

              {/* MOVE: los 2 botones de eje + BACK en UNA fila — MISMO tamaño
                  que command-strip (96×80, sprite ×2 ENTERO). Sin texto: el
                  data-tip explica HORIZONTAL/VERTICAL. Sprites reales
                  btn_move_axis_h/v.png + btn_exit.png vía CSS. */}
              {view === 'MOVE' && (
                <div className="move-axis-pad">
                  <button className="move-axis-btn axis-h"
                    data-tip={tipBlock('HORIZONTAL ↔', [
                      ['desc', 'LEFT/RIGHT — movimiento frontal.'],
                      ['effect', 'DOWN_BACK → DOWN_FRONT'],
                    ])} />
                  <button className="move-axis-btn axis-v"
                    data-tip={tipBlock('VERTICAL ↕', [
                      ['desc', 'UP/DOWN — movimiento de altura.'],
                      ['effect', 'DOWN_BACK → UP_BACK'],
                    ])} />
                  <button className="basic-btn basic-back"
                    data-tip={tipBlock('BACK', [['desc', 'Volver al menú anterior']])} />
                </div>
              )}

              {/* STAGE: el QTE real — secuencia de inputs con los sprites del
                  paquete ORGANIZADO (key_q/key_e/↑↓/flechas) + prompt + el
                  TIEMPO de reacción destacado + recovery */}
              {view === 'STAGE' && (
                /* MISMO formato EXACTO que el diálogo: caja GBC (mismo ancho),
                   sprite del personaje FUERA a su lado y los inputs DENTRO
                   del cuadro, todo en UNA sola fila */
                <div className={`gbc-dialogue speaker-${dlgSide}`}>
                  <div className={`gbc-dialogue-speaker ${dlgSide}`}>
                    <img src={(dlgSide === 'left' ? storyPortraitUrl('goku', P_FORM) || pPortrait : storyPortraitUrl('cell', P_FORM)) || ''} alt={dlgSide === 'left' ? 'GOKU' : 'CELL'} className="gbc-dialogue-speaker-img" draggable={false} />
                  </div>
                  <div className="gbc-dialogue-body">
                    <div className="stage-inline">
                      <div className="stage-sequence">
                        <span className="stage-seq-item done"><span className="seq-check">✓</span></span>
                        <span className="stage-seq-item current">
                          <img src="/assets/ui/qte/key_q.png" alt="Q" className="qte-key-sm" />
                        </span>
                        <span className="stage-seq-item future">
                          <img src="/assets/ui/qte/key_e.png" alt="E" className="qte-key-sm" />
                        </span>
                        <span className="stage-seq-item future">
                          <img src="/assets/ui/qte/arrow_up.png" alt="↑" className="qte-key-sm" />
                        </span>
                        <span className="stage-seq-item future">
                          <img src="/assets/ui/qte/arrow_right.png" alt="→" className="qte-key-sm" />
                        </span>
                      </div>
                      <div className="stage-inline-prompt A">
                        <img src="/assets/ui/qte/key_q.png" alt="Q" className="qte-key-big" />
                      </div>
                      <span className="stage-inline-time"><strong>0.6</strong> / 1.2s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* LIMIT: MISMO layout que la mano (una línea, marco + arte) */}
              {view === 'LIMIT' && (
                <div className="command-select">
                  <div className="limit-cards-row">
                    <div className="hand-cards">
                      {limitCards.map(c => (
                        <button key={c.id} className="limit-card"
                          style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special}')` } as React.CSSProperties}
                          data-tip={tipCard(c.name, CARD_TYPE_NAMES[c.type], CARD_COLORS_ON_LIGHT[c.type], c.rarity, [
                            ['stats', `CC ${c.cc} · ATK ${c.atk > 0 ? c.atk : '—'} · ACC ${c.acc}%`],
                            ['effect', 'Reutilizable mientras tengas CC.'],
                          ])}>
                          <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special} iconUrl={cardIconUrl(c.id)} />
                        </button>
                      ))}
                      {/* Hueco de ejemplo: Limit no obtenida */}
                      <div className="limit-slot" data-tip={tipBlock('LIMIT — NO OBTENIDA', [['desc', 'Se desbloquea jugando la historia.']])}>
                        <Lock size={16} />
                      </div>
                    </div>
                    <button className="basic-btn basic-back" data-tip={tipBlock('BACK', [['desc', 'Volver al menú de comandos']])} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── CONTROLES (tema HUD) ─── */}
        <div className="dev-hud-controls">
          {GROUPS.map(group => (
            <div key={group} className="dev-hud-group">
              <h2 className="dev-hud-group-title">{group}</h2>
              {HUD_THEME_VARS.filter(v => v.group === group).map(v => (
                <div key={v.key} className="dev-hud-row">
                  <label className="dev-hud-row-label" title={v.key}>
                    <span>{v.label}</span>
                    <code>{v.key}</code>
                  </label>
                  {v.type === 'color' ? (
                    <div className="dev-hud-color">
                      <input
                        type="color"
                        value={theme[v.key] || v.default}
                        onChange={e => setVar(v.key, e.target.value)}
                      />
                      <input
                        type="text"
                        value={theme[v.key] || v.default}
                        onChange={e => setVar(v.key, e.target.value)}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="dev-hud-size"
                      value={theme[v.key] || v.default}
                      onChange={e => setVar(v.key, e.target.value)}
                    />
                  )}
                  <button
                    className="dev-hud-reset-var"
                    title={`Restablecer ${v.label}`}
                    onClick={() => setVar(v.key, v.default)}>
                    <RotateCcw size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

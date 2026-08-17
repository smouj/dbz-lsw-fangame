// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — HUD Studio
// VENTANA SOBRE EL MISMO MOTOR DE COMBATE. Las reglas viven en
// src/battle/state.ts (fuente única): mazo real (drawPile/hand/discardPile),
// +3 CC por Attack Phase, robo del drawPile, HAND CHECK con selección real
// de descarte. El juego real (main.tsx) y este visualizador usan el MISMO
// controlador. HUD Studio solo cambia: personajes demo, seed, velocidad,
// pause/step, reset. Si cambias una regla del combate, esto cambia solo.
//
// Assets: CardVisualRegistry (src/data/cardVisuals.ts) + HudAssetRegistry
// (src/data/hudAssets.ts) — compartidos con el juego. Nada de mocks.
// ═══════════════════════════════════════════════════════════════════════
import { Check, Download, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  HUD_THEME_VARS, HudTheme, currentHudTheme, defaultHudTheme,
  saveHudTheme, applyHudTheme, resetHudTheme,
} from '../data/hudTheme';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { SCENARIOS } from '../data/scenarios';
import { getForm } from '../data/roster';
import { spriteDirFor, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { downloadJson } from './spriteEditing';
import { getCard, CARD_TYPE_NAMES, CARD_COLORS, CardDef } from '../data/cards';
import { cardIconUrl } from '../data/icons';
import { FitArt } from '../components/FitArt';
// ── EL MISMO MOTOR (reglas reales, nada paralelo) ──
import {
  createBattleDeck, drawOne, playJoint, discardOne, needsDiscard,
  registerCardResolver, seededRng, JointDeckState, HAND_MAX_PERSISTENT,
} from '../battle/state';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from '../data/cardVisuals';
import { HUD_ASSET_REGISTRY } from '../data/hudAssets';

registerCardResolver(id => getCard(typeof id === 'number' ? id : Number(id)));

// Formas de ejemplo (Goku vs Piccolo, como el Battle Lab).
const P_FORM = 'goku_base';
const E_FORM = 'piccolo_base';
const DEMO_LIMIT_IDS = [87, 46]; // Limits demo del personaje (reutilizables)
const DEMO_MAX_CC = 10;
const DEMO_HP = 1000;

const GROUPS = ['Colores', 'HUD', 'Cartas', 'Posición', 'Escala', 'Tipografía'];

// ═══ Fases del motor (las mismas del juego real) ═══
type SimPhase =
  | 'intro' | 'attackPhase' | 'draw' | 'command' | 'cardSelect'
  | 'basic' | 'limitSelect' | 'stageInput' | 'defend' | 'moveSelect'
  | 'discard' | 'cinematic' | 'win';

interface SimSide {
  cc: number;
  hp: number;
}

interface SimState {
  phase: SimPhase;
  deck: JointDeckState;      // mazo REAL del jugador
  eDeck: JointDeckState;     // mazo REAL del enemigo
  player: SimSide;
  enemy: SimSide;
  turn: number;
  exchange: 1 | 2;
  attacker: 'player' | 'enemy';
  cue: { id: number; title: string; sub: string } | null;
  drawCard: { card: CardDef; nonce: number } | null;  // carta REAL robada
  played: CardDef | null;    // carta en cinemática
  selectedIdx: number | null;
  winner: 'player' | 'enemy' | null;
  seed: number;
}

function initialState(seed: number): SimState {
  const usable = (c: CardDef) => !c.compatible || c.compatible.length === 0 || c.compatible.includes(getForm(P_FORM)?.character ?? 'goku');
  return {
    phase: 'intro',
    deck: createBattleDeck([...Array.from({ length: 20 }, (_, i) => i + 1)], { seed, usable }),
    eDeck: createBattleDeck([...Array.from({ length: 20 }, (_, i) => i + 21)], { seed: seed + 999, usable }),
    player: { cc: 4, hp: DEMO_HP },
    enemy: { cc: 4, hp: DEMO_HP },
    turn: 1,
    exchange: 1,
    attacker: 'player',
    cue: null,
    drawCard: null,
    played: null,
    selectedIdx: null,
    winner: null,
    seed,
  };
}

// ═══ CONTROLADOR: mismo motor (battle/state) + presentación ═══
function useBattleSim() {
  const seedRef = useRef(20260817);
  const speedRef = useRef(1);
  const [state, setState] = useState<SimState>(() => initialState(seedRef.current));
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<Set<number>>(new Set());
  const [running, setRunning] = useState(false);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms / speedRef.current);
    timers.current.add(id);
  };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current.clear(); };

  const reset = () => {
    clearTimers();
    setState(initialState(seedRef.current));
    setRunning(false);
  };

  const setSeed = (seed: number) => { seedRef.current = seed; reset(); };
  const setSpeed = (v: number) => { speedRef.current = v; };

  // 1) ATTACK_PHASE_ENTER → +3 CC → robo REAL del drawPile → animación → COMMAND
  const enterAttackPhase = (attacker: 'player' | 'enemy') => {
    setState(s => {
      const side = attacker === 'player' ? s.player : s.enemy;
      const setSide = (p: SimSide): SimSide => ({ ...p, cc: Math.min(DEMO_MAX_CC, p.cc + 3) });
      return {
        ...s, attacker, cue: { id: Date.now(), title: 'ATTACK PHASE', sub: `${attacker === 'player' ? 'GOKU' : 'PICCOLO'} +3 CC` },
        player: attacker === 'player' ? setSide(side) : s.player,
        enemy: attacker === 'enemy' ? setSide(side) : s.enemy,
        phase: 'attackPhase',
      };
    });
    // Robo real: la carta sale del drawPile (nunca re-sorteo del deck original)
    later(() => {
      setState(s => {
        const res = drawOne(attacker === 'player' ? s.deck : s.eDeck);
        return {
          ...s,
          deck: attacker === 'player' ? res.state : s.deck,
          eDeck: attacker === 'enemy' ? res.state : s.eDeck,
          drawCard: res.card ? { card: res.card, nonce: Date.now() } : null,
          phase: 'draw',
        };
      });
    }, 500);
    // Fin de la animación → COMMAND (sin mano visible todavía)
    later(() => {
      setState(s => ({ ...s, drawCard: null, cue: null, phase: 'command' }));
    }, 1900);
  };

  // 2) COMMAND: el jugador elige rama (la mano NO se ve aún)
  const selectCommand = (cmd: 'JOINT' | 'BASIC' | 'LIMIT') => {
    setState(s => ({ ...s, phase: cmd === 'JOINT' ? 'cardSelect' : cmd === 'BASIC' ? 'basic' : 'limitSelect' }));
  };

  // 3) Jugar una JOINT real: sale de hand → discardPile; HAND CHECK real
  const playCard = (idx: number) => {
    setState(s => {
      const card = s.deck.hand[idx];
      if (!card || s.player.cc < card.cc) return s;
      return {
        ...s,
        deck: playJoint(s.deck, idx),   // consumible real → discardPile
        player: { ...s.player, cc: s.player.cc - card.cc },
        played: card,
        selectedIdx: idx,
        phase: 'cinematic',
      };
    });
    later(() => {
      setState(s => {
        if (needsDiscard(s.deck)) return { ...s, played: null, selectedIdx: null, phase: 'discard' };
        return { ...s, played: null, selectedIdx: null, phase: 'defend' };
      });
    }, 2000);
  };

  // 4) DISCARD_REQUIRED: el jugador ELIGE la carta (nunca automático)
  const chooseDiscard = (idx: number) => {
    setState(s => ({ ...s, deck: discardOne(s.deck, idx), phase: 'defend' }));
  };

  // 5) Defensa (GUARD demo) → intercambio (roles invertidos) o nuevo TURN
  const defend = (action: 'GUARD' | 'MOVE') => {
    let nextAttack: 'player' | 'enemy' = 'enemy';
    setState(s => {
      if (s.exchange === 1) {
        nextAttack = 'enemy';                       // Exchange 2: roles invertidos
        return { ...s, phase: 'command', exchange: 2, attacker: 'enemy' };
      }
      nextAttack = 'player';                        // Nuevo TURN
      return { ...s, phase: 'command', turn: s.turn + 1, exchange: 1, attacker: 'player' };
    });
    later(() => enterAttackPhase(nextAttack), 600);
  };

  // ═══ DEMO CANÓNICA: dispara EVENTOS REALES del motor (nunca cambia la
  // vista directamente — la vista resulta del estado).
  // INTRO → ATTACK_PHASE (+3 CC) → robo real del drawPile → animación →
  // COMMAND → JOINT → elige carta real → cinemática → HAND CHECK → DEFENSE
  // → exchange 2 (enemigo) → turno 2 (jugador) → …
  const runCanonical = () => {
    if (running) { clearTimers(); setRunning(false); setState(s => ({ ...s, drawCard: null, cue: null, phase: 'command' })); return; }
    clearTimers();
    setState(initialState(seedRef.current));
    setRunning(true);
    // Turno 1 — Exchange 1: Goku ataca
    later(() => enterAttackPhase('player'), 2200);              // INTRO → ATTACK PHASE (+3 CC)
    later(() => { setState(s => ({ ...s, phase: 'command' })); }, 4300);
    later(() => selectCommand('JOINT'), 5200);                  // COMMAND → mano real
    later(() => {
      const idx = stateRef.current.deck.hand.findIndex(c => stateRef.current.player.cc >= c.cc);
      if (idx >= 0) playCard(idx);                              // elegir carta real de la mano
    }, 6200);
    // Exchange 1 → Exchange 2: Piccolo contraataca (su propio mazo real)
    later(() => {
      setState(s => (s.phase === 'discard' ? s : { ...s, phase: 'defend' }));
      if (stateRef.current.phase === 'defend') defend('GUARD');
    }, 9400);
    // Piccolo juega su carta (autopilot del enemigo)
    later(() => {
      const idx = stateRef.current.eDeck.hand.findIndex(c => stateRef.current.enemy.cc >= c.cc);
      if (idx >= 0) playEnemyCard(idx);
    }, 11800);
    // El jugador defiende → Turno 2: Goku ataca (+3 CC, robo real)
    later(() => {
      setState(s => (s.phase === 'discard' ? s : { ...s, phase: 'defend' }));
      if (stateRef.current.phase === 'defend') defend('GUARD');
    }, 14000);
    // Turno 2: Goku entra en ATTACK PHASE y roba; la demo DEJA EL CONTROL
    // al usuario en COMMAND: puede pulsar JOINT, jugar cartas reales y
    // acumular hasta 6 para ver el HAND CHECK él mismo.
    later(() => { setState(s => ({ ...s, phase: 'command' })); }, 17800);
    later(() => setRunning(false), 18200);
  };

  // El enemigo juega una carta de SU mazo real (autopilot de la demo)
  const playEnemyCard = (idx: number) => {
    setState(s => {
      const card = s.eDeck.hand[idx];
      if (!card || s.enemy.cc < card.cc) return s;
      return {
        ...s,
        eDeck: playJoint(s.eDeck, idx),
        enemy: { ...s.enemy, cc: s.enemy.cc - card.cc },
        played: card,
        attacker: 'enemy',
        phase: 'cinematic',
      };
    });
    later(() => {
      setState(s => (needsDiscard(s.eDeck) ? s : { ...s, played: null, phase: 'defend' }));
    }, 2000);
  };

  return { state, running, reset, setSeed, setSpeed, enterAttackPhase, selectCommand, playCard, chooseDiscard, defend, runCanonical };
}

function PreviewHpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className={`hp-bar ${side}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct + 8}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
        <div className="hp-bar-text">{current}/{max}</div>
      </div>
    </div>
  );
}

// Carta GBC real: mismo render que el juego (frame por tipo + arte centrado)
function SimCard({ card, selected, disabled, onClick }: {
  card: CardDef; selected?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  const frame = disabled ? CARD_FRAME_DISABLED : selected ? CARD_FRAME_SELECTED : (CARD_FRAME_BY_TYPE[card.type] ?? undefined);
  const iconUrl = cardIconUrl(card.id);
  const color = CARD_COLORS[card.type];
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''}`}
      onClick={onClick} disabled={disabled}
      style={{ '--card-color': color, '--card-frame': frame ? `url('${frame}')` : undefined } as React.CSSProperties}
      data-tip={`${card.name} — ${CARD_TYPE_NAMES[card.type]}\nCC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%\n${card.description ?? ''}`}>
      <div className="card-art">
        {iconUrl
          ? <FitArt src={iconUrl} areaW={64} areaH={48} className="card-art-img" />
          : <span className="card-icon-emoji">?</span>}
      </div>
    </button>
  );
}

export function HudModule() {
  const [theme, setTheme] = useState<HudTheme>(() => currentHudTheme());
  const [status, setStatus] = useState('');
  const sim = useBattleSim();
  const { state } = sim;

  const player = useMemo(() => getForm(P_FORM), []);
  const enemy = useMemo(() => getForm(E_FORM), []);
  const pDir = player ? spriteDirFor(player.id) : undefined;
  const eDir = enemy ? spriteDirFor(enemy.id) : undefined;
  const pIdle = battleOverworldActorUrl(P_FORM, 'idle') ?? (pDir ? spriteFrameUrl(player!.id, `${pDir}_idle_00.png`) : undefined);
  const eIdle = battleOverworldActorUrl(E_FORM, 'idle') ?? (eDir ? spriteFrameUrl(enemy!.id, `${eDir}_idle_00.png`) : undefined);
  const pPortrait = BATTLE_PORTRAITS[P_FORM];
  const ePortrait = BATTLE_PORTRAITS[E_FORM];
  const battleBgUrl = SCENARIOS[0]?.overviewBackground ?? '/assets/backgrounds/scenarios/01_world.png';

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

  const hand = state.deck.hand;
  const showCommand = state.phase === 'command';
  const showHand = state.phase === 'cardSelect' || state.phase === 'discard';
  const inAction = state.phase === 'cinematic' || state.phase === 'draw' || state.phase === 'attackPhase';

  return (
    <div className="dev-hud">
      <div className="dev-hud-head">
        <div>
          <h1>HUD Studio</h1>
          <p className="dev-hud-sub">
            Ventana sobre el <strong>mismo motor de combate</strong> (src/battle/state.ts): mazo real
            (drawPile/hand/discardPile), +3 CC por Attack Phase, HAND CHECK con descarte real.
            El preview deriva de la fase del motor — los botones son interactivos.
          </p>
        </div>
        <div className="dev-hud-actions">
          <button className={`dev-btn ${sim.running ? 'dev-btn-danger' : ''}`} onClick={sim.runCanonical}>
            {sim.running ? '■ Parar demo' : '▶ Ejecutar combate canónico'}
          </button>
          <button className="dev-btn" onClick={sim.reset} title="Reiniciar combate (nuevo seed)"><RotateCcw size={15} /> Reiniciar</button>
          <select className="dev-btn dev-hud-speed" value={1} onChange={e => sim.setSpeed(Number(e.target.value))}
            title="Velocidad de reproducción">
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
          <button className="dev-btn dev-btn-primary" onClick={apply}><Check size={15} /> Aplicar al juego</button>
          <button className="dev-btn" onClick={exportJson}><Download size={15} /> Exportar JSON</button>
          <button className="dev-btn dev-btn-danger" onClick={resetTheme}><RotateCcw size={15} /> Reset</button>
        </div>
      </div>
      {status && <div className="dev-hud-status">{status}</div>}

      <div className="dev-hud-grid">
        {/* ─── PREVIEW: EL MOTOR REAL, fase a fase ─── */}
        <div className="dev-hud-preview" style={mockVars}>
          <div className="battle-screen view-overview dev-hud-real-preview">
            {/* INTRO (fase real del motor) */}
            {state.phase === 'intro' && (
              <div className="battle-intro">
                <div className="intro-gbc-window">
                  <div className="intro-gbc-round">ROUND {state.turn}</div>
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
                    <span>ATK {state.attacker === 'player' ? 'GOKU' : 'PICCOLO'}</span>
                    <span>DEF {state.attacker === 'player' ? 'PICCOLO' : 'GOKU'}</span>
                  </div>
                  <div className="intro-ready">READY</div>
                  <div className="intro-fight">FIGHT!</div>
                </div>
                <div className="intro-flash" />
              </div>
            )}
            {state.phase !== 'intro' && <div className="hud-top">
              <div className="fighter-hud left">
                <div className="hud-name">
                  <span className="hud-portrait">
                    {pPortrait ? <img src={pPortrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
                  </span>
                  <strong>GOKU</strong>
                  <span className="hud-form">Base</span>
                  <span className="hud-level">LV50</span>
                </div>
                <PreviewHpBar current={state.player.hp} max={DEMO_HP} side="left" />
                <div className="hud-stats"><span>STR60</span><span>KI55</span><span>CC {state.player.cc}</span></div>
                <div className="hud-status">
                  <span className="status-chip buff">STR+</span>
                  {state.attacker === 'player' && <span className="status-chip guard">ATK</span>}
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
                <PreviewHpBar current={state.enemy.hp} max={DEMO_HP} side="right" />
                <div className="hud-stats"><span>STR58</span><span>KI60</span><span>CC {state.enemy.cc}</span></div>
                <div className="hud-status right">
                  <span className="status-chip debuff">SPD−</span>
                  {state.attacker === 'enemy' && <span className="status-chip guard">ATK</span>}
                </div>
              </div>
              <div className="hud-center-badge">
                <span className="hud-center-round">ROUND {state.turn}</span>
                <span className="hud-center-vs">VS</span>
                <span className="hud-center-order">{state.attacker === 'player' ? 'GOKU' : 'PICCOLO'}</span>
              </div>
            </div>}

            <div className="battlefield">
              <div className="battle-bg authentic" style={{ backgroundImage: `url(${battleBgUrl})` }} />
              <div className="battlefield-fighters">
                <div className="fighter-container player down back" style={{ left: '30%', top: '62%' }}>
                  {pIdle && <img src={pIdle} alt="" className="overworld-sprite dev-hud-fighter-sprite" />}
                </div>
                <div className="fighter-container enemy up back" style={{ left: '70%', top: '46%' }}>
                  {eIdle && <img src={eIdle} alt="" className="overworld-sprite dev-hud-fighter-sprite" style={{ transform: 'scaleX(-1)' }} />}
                </div>
              </div>
            </div>

            <div className="phase-bar">
              <div className="phase-info">
                <span className="turn-label">TURN {state.turn}</span>
                <span className="speed-order-label">{state.attacker === 'player' ? 'GOKU' : 'PICCOLO'} FIRST</span>
                <span className="phase-label">{state.exchange === 1 ? 'ACTION 1/2' : 'ACTION 2/2'} · {state.phase}</span>
              </div>
            </div>

            {/* Fase cue (ATTACK PHASE / DEFENSE PHASE) */}
            {state.cue && (
              <div className="phase-cue" key={state.cue.id}>
                <div className="phase-cue-line" />
                <div className="phase-cue-title">{state.cue.title}</div>
                <div className="phase-cue-sub">{state.cue.sub}</div>
              </div>
            )}

            {/* Carta REAL robada del drawPile (animación draw-fx del juego) */}
            {state.drawCard && (
              <div className="draw-fx" key={state.drawCard.nonce}>
                <SimCard card={state.drawCard.card} />
              </div>
            )}

            {/* Cuadro de diálogo GBC durante la cinemática */}
            {state.played && (
              <div className="gbc-dialogue">
                <div className="gbc-dialogue-actor">{state.attacker === 'player' ? 'GOKU' : 'PICCOLO'}</div>
                <div className="gbc-dialogue-text">uses {state.played.name.toUpperCase()}!<span className="gbc-dialogue-cursor">▼</span></div>
              </div>
            )}

            <div className="battle-controls dev-hud-battle-controls">
              {/* COMMAND: LIMIT · JOINT · BASIC (· CHARA). SIN mano todavía. */}
              {showCommand && (
                <div className="command-select">
                  <div className="command-strip">
                    <button className="cmd-limit" onClick={() => sim.selectCommand('LIMIT')}
                      data-tip="LIMITED — cartas exclusivas del personaje.\nReutilizables mientras tengas CC.\nRequiere GATHER POWER activo." />
                    <button className="cmd-j" onClick={() => sim.selectCommand('JOINT')}
                      data-tip="JOINT — cartas de tu mano.\nCuestan CC y se descartan al usarlas." />
                    <button className="cmd-b" onClick={() => sim.selectCommand('BASIC')}
                      data-tip="BASIC — acciones libres sin CC.\nSTAGE ATTACK (secuencia A/B) o GATHER POWER." />
                  </div>
                </div>
              )}

              {/* CARD SELECT: la mano REAL del motor (la carta robada ya está aquí) */}
              {showHand && (
                <div className="hand-area">
                  <div className="hand-label">— MANO ({hand.length}/{HAND_MAX_PERSISTENT}+1) —</div>
                  <div className="hand-cards">
                    {hand.map((card, i) => (
                      <SimCard key={`${card.id}-${i}`} card={card}
                        selected={state.selectedIdx === i}
                        disabled={state.player.cc < card.cc}
                        onClick={() => state.phase === 'discard' ? sim.chooseDiscard(i) : sim.playCard(i)} />
                    ))}
                  </div>
                  {state.phase === 'discard' && (
                    <div className="discard-help">HAND CHECK: {hand.length} &gt; 5 — elige cuál descartar</div>
                  )}
                </div>
              )}

              {/* BASIC: Stage Attack / Gather Power / Back */}
              {state.phase === 'basic' && (
                <div className="command-select">
                  <div className="basic-menu">
                    <button className="basic-btn basic-stage" data-tip="STAGE ATTACK — 3 Stage · secuencia de inputs A/B a tiempo.\nCada acierto +1 CC (más si completas la cadena).">
                      <span className="basic-stage-icon">
                        <img src={cardIconUrl(3)} alt="3 Stage Atk." className="stage-card-icon" />
                      </span>
                    </button>
                    <button className="basic-btn basic-gather" data-tip="GATHER POWER — sube STR/KI (+8).\nActiva el mazo LIMIT durante 2 turnos.">
                      GATHER POWER
                    </button>
                    <button className="basic-btn basic-back" onClick={() => sim.selectCommand('JOINT')}>BACK</button>
                  </div>
                </div>
              )}

              {/* LIMIT: cartas LIMITED del personaje (reutilizables) */}
              {state.phase === 'limitSelect' && (
                <div className="command-select">
                  <div className="limit-panel">
                    <div className="limit-title">LIMITED — GOKU</div>
                    {DEMO_LIMIT_IDS.map(id => {
                      const c = getCard(id);
                      if (!c) return null;
                      return (
                        <button key={id} className="limit-row" data-tip={`${c.name} — ${CARD_TYPE_NAMES[c.type]}\nCC ${c.cc} · Reutilizable mientras tengas CC`}>
                          <span className="limit-name">{c.name}</span>
                          <span className="limit-cost">{c.cc} CC · {c.type.toUpperCase()}</span>
                        </button>
                      );
                    })}
                    <button className="basic-btn basic-back" onClick={() => sim.selectCommand('JOINT')}>BACK</button>
                  </div>
                </div>
              )}

              {/* DEFENSE: GUARD / MOVE (el defensor elige antes de resolver) */}
              {state.phase === 'defend' && (
                <div className="command-select">
                  <div className="basic-menu">
                    <button className="basic-btn basic-stage" onClick={() => sim.defend('GUARD')}
                      data-tip="GUARD — quedarte y bloquear (−50% dmg).\nGratis, sin gastar CC.">
                      GUARD
                    </button>
                    <button className="basic-btn basic-gather" onClick={() => sim.defend('MOVE')}
                      data-tip="MOVE — cambiar de posición (persistente).">
                      MOVE
                    </button>
                  </div>
                </div>
              )}

              {/* WIN */}
              {state.phase === 'win' && (
                <div className="command-select">
                  <div className="limit-panel">
                    <div className="limit-title">{state.winner === 'player' ? 'GOKU WINS!' : 'PICCOLO WINS!'}</div>
                    <button className="basic-btn basic-stage" onClick={sim.reset}>REMATCH</button>
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

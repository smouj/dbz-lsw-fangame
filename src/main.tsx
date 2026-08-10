/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FORMS, CHARACTERS, getCharacter, getForm, sheetUrl } from './data/roster';
import { CARDS, CARD_COLORS, CARD_TYPE_NAMES, CardDef, CardType, DECK_SIZE, MAX_COPIES, getCard } from './data/cards';
import { cardIconUrl, MINI_PORTRAITS, MENU_PORTRAITS, TYPE_EMOJI } from './data/icons';

// ═══════════════════════════════════════════════════════════
// DBZ LSW Fangame — Estilo Magazine GBC Auténtico
// Sprites reales, mecánicas fieles, pixel art nítido
// ═══════════════════════════════════════════════════════════

type Screen = 'main' | 'story' | 'battle' | 'deck' | 'characters' | 'cards' | 'settings';
type BattlePhase = 'position' | 'command' | 'cardSelect' | 'resolve' | 'enemyTurn' | 'win' | 'lose';
type Position = 'front' | 'back';
type Elevation = 'ground' | 'air';
type CommandType = 'LIMIT' | 'J' | 'B' | 'C';

interface CharManifest {
  [pose: string]: { frames: { file: string; w: number; h: number }[]; fps: number; loop: boolean };
}

interface Fighter {
  id: string;
  name: string;
  form: string;
  level: number;
  maxHp: number; hp: number;
  str: number; ki: number; spd: number;
  maxCc: number; cc: number;
  position: Position; elevation: Elevation;
  battleId?: 'goku' | 'vegeta';
  limits: string[];
}

// ─── Retratos (Sprite Database) ────────────────────────────
const PORTRAITS: Record<string, string> = MENU_PORTRAITS;

function portraitFor(charId: string): string | undefined {
  return PORTRAITS[charId];
}

function miniPortraitFor(charId: string): string | undefined {
  return MINI_PORTRAITS[charId];
}

// ─── Fondos de batalla (extraídos) ────────────────────────
const BATTLE_BGS: { id: string; name: string; file: string }[] = [
  { id: 'bg1', name: 'Arena', file: '/assets/backgrounds/cell_00_00.png' },
  { id: 'bg2', name: 'Wasteland', file: '/assets/backgrounds/cell_00_01.png' },
  { id: 'bg3', name: 'Mountains', file: '/assets/backgrounds/cell_00_02.png' },
  { id: 'bg4', name: 'City', file: '/assets/backgrounds/cell_00_03.png' },
  { id: 'bg5', name: 'Namek', file: '/assets/backgrounds/cell_01_00.png' },
  { id: 'bg6', name: 'Ruins', file: '/assets/backgrounds/cell_01_01.png' },
];

// ─── Sistema de cartas para batalla ───────────────────────
const BATTLE_DECK: CardDef[] = [
  getCard(1)!, getCard(1)!, getCard(2)!, getCard(2)!, getCard(4)!,
  getCard(25)!, getCard(25)!, getCard(26)!, getCard(27)!, getCard(28)!,
  getCard(53)!, getCard(64)!, getCard(65)!, getCard(96)!, getCard(96)!,
  getCard(79)!, getCard(80)!, getCard(111)!, getCard(5)!, getCard(12)!,
];

// ─── Animación de sprites ─────────────────────────────────
function useSpriteAnim(charId: 'goku' | 'vegeta', pose: string): { src: string; w: number; h: number } {
  const [frameIdx, setFrameIdx] = useState(0);
  const [manifest, setManifest] = useState<CharManifest | null>(null);

  useEffect(() => {
    fetch(`/assets/sprites/${charId}/manifest.json`)
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest(null));
  }, [charId]);

  useEffect(() => {
    if (!manifest || !manifest[pose]) { setFrameIdx(0); return; }
    const anim = manifest[pose];
    if (anim.frames.length <= 1) { setFrameIdx(0); return; }
    const interval = 1000 / anim.fps;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= anim.frames.length) { if (anim.loop) idx = 0; else { clearInterval(timer); return; } }
      setFrameIdx(idx);
    }, interval);
    return () => clearInterval(timer);
  }, [manifest, pose]);

  if (!manifest || !manifest[pose]) return { src: `/assets/sprites/${charId}/${charId}_idle_00.png`, w: 30, h: 46 };
  const anim = manifest[pose];
  const f = anim.frames[Math.min(frameIdx, anim.frames.length - 1)];
  return { src: `/assets/sprites/${charId}/${f.file}`, w: f.w, h: f.h };
}

// ─── Sprite del luchador ─────────────────────────────────
function FighterSprite({ charId, pose, facing, scale = 8, flash = false }: {
  charId: 'goku' | 'vegeta'; pose: string; facing?: 'left' | 'right'; scale?: number; flash?: boolean;
}) {
  const { src, w, h } = useSpriteAnim(charId, pose);
  return (
    <div className={`fighter-sprite ${flash ? 'flash' : ''}`}
      style={{ width: w * scale, height: h * scale, transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
      <img src={src} alt={charId} style={{ width: w * scale, height: h * scale }} />
    </div>
  );
}

// ─── Barra de HP ──────────────────────────────────────────
function HPBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const low = pct <= 25;
  return (
    <div className={`hp-bar ${side} ${low ? 'low' : ''}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${pct}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
      </div>
      <div className="hp-bar-text">{current} / {max}</div>
    </div>
  );
}

// ─── CC ───────────────────────────────────────────────────
function CCDisplay({ cc, maxCc }: { cc: number; maxCc: number }) {
  const pct = Math.max(0, Math.min(100, (cc / maxCc) * 100));
  return (
    <div className="cc-display">
      <span className="cc-label">CC</span>
      <div className="cc-bar-track"><div className="cc-bar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="cc-value">{cc}</span>
    </div>
  );
}

// ─── Carta visual ─────────────────────────────────────────
function CardVisual({ card, selected, onClick, small }: {
  card: CardDef; selected?: boolean; onClick?: () => void; small?: boolean;
}) {
  const color = CARD_COLORS[card.type];
  const iconUrl = cardIconUrl(card.id);
  const icon = TYPE_EMOJI[card.type];
  const stars = '★'.repeat(card.rarity) + '☆'.repeat(5 - card.rarity);
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      onClick={onClick} style={{ '--card-color': color } as React.CSSProperties}>
      <div className="card-header">
        <span className="card-icon">
          {iconUrl ? <img className="card-icon-img" src={iconUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} /> : icon}
        </span>
        <span className="card-cc">{card.cc}CC</span>
      </div>
      <div className="card-art">
        {iconUrl ? <img className="card-art-img" src={iconUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} /> : icon}
      </div>
      <div className="card-name">{card.name}</div>
      <div className="card-type">{CARD_TYPE_NAMES[card.type]}</div>
      <div className="card-stats">
        {card.atk > 0 && <span className="card-atk">ATK{card.atk}</span>}
        <span className="card-acc">ACC{card.acc}%</span>
      </div>
      <div className="card-rarity">{stars}</div>
    </button>
  );
}

// ─── Mano ─────────────────────────────────────────────────
function HandComponent({ cards, selectedIndex, onSelect }: {
  cards: CardDef[]; selectedIndex: number | null; onSelect: (i: number) => void;
}) {
  return (
    <div className="hand-area">
      <div className="hand-label">— HAND —</div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <CardVisual key={card.id + '-' + i} card={card}
            selected={i === selectedIndex} onClick={() => onSelect(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Número de daño ───────────────────────────────────────
function DamageNumber({ value, type, x, y }: { value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number }) {
  const text = type === 'miss' ? 'MISS' : type === 'guard' ? 'GUARD' : `${value > 0 ? '-' : '+'}${Math.abs(value)}`;
  return <div className={`damage-number ${type}`} style={{ left: x, top: y }}>{text}</div>;
}

// ═══════════════════════════════════════════════════════════
// PANTALLA DE BATALLA
// ═══════════════════════════════════════════════════════════

function BattleScreen({ playerFormId, enemyFormId, onExit }: {
  playerFormId: string; enemyFormId: string; onExit: (won: boolean) => void;
}) {
  const pf = getForm(playerFormId)!;
  const ef = getForm(enemyFormId)!;

  const [player, setPlayer] = useState<Fighter>({
    id: pf.character, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,
    level: 38, maxHp: pf.hp, hp: pf.hp,
    str: pf.str, ki: pf.ki, spd: pf.spd, maxCc: 40, cc: 8,
    position: 'front', elevation: 'ground', battleId: pf.battleId,
    limits: ['Limit', 'Final'],
  });
  const [enemy, setEnemy] = useState<Fighter>({
    id: ef.character, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,
    level: 39, maxHp: ef.hp, hp: ef.hp,
    str: ef.str, ki: ef.ki, spd: ef.spd, maxCc: 40, cc: 8,
    position: 'back', elevation: 'ground', battleId: ef.battleId,
    limits: ['Limit', 'Final'],
  });
  const [phase, setPhase] = useState<BattlePhase>('position');
  const [turn, setTurn] = useState(1);
  const [command, setCommand] = useState<CommandType | null>(null);
  const [bgId, setBgId] = useState('bg1');
  const [hand, setHand] = useState<CardDef[]>(() => {
    const shuffled = [...BATTLE_DECK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>(['Battle Start!']);
  const [damageNums, setDamageNums] = useState<{ value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number; id: number }[]>([]);
  const [playerPose, setPlayerPose] = useState('idle');
  const [enemyPose, setEnemyPose] = useState('idle');
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [flashEnemy, setFlashEnemy] = useState(false);
  const [pBuffs, setPBuffs] = useState({ str: 0, ki: 0 });
  const [eBuffs, setEBuffs] = useState({ str: 0, ki: 0 });

  useEffect(() => {
    setBgId(BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)].id);
  }, []);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-6), msg]), []);

  const setPosition = (pos: Position, elev: Elevation) => {
    setPlayer(prev => ({ ...prev, position: pos, elevation: elev }));
    setPhase('command');
    addLog(`${elev.toUpperCase()}/${pos.toUpperCase()}`);
  };

  const selectCommand = (cmd: CommandType) => {
    if (cmd === 'LIMIT' && player.cc < 20) { addLog('CC insuficiente para LIMIT!'); return; }
    setCommand(cmd);
    setPhase('cardSelect');
  };

  const selectCard = (idx: number) => {
    const card = hand[idx];
    setSelectedCard(idx);
    setPlayerPose(card.type === 'beam' ? 'beam_charge' : card.type === 'damage' ? 'attack_fwd' : card.type === 'defense' ? 'guard' : 'idle');

    setTimeout(() => {
      let damage = 0;
      let hitType: 'damage' | 'miss' | 'guard' = 'damage';
      let heal = 0;
      const acc = card.acc / 100;
      const roll = Math.random();

      // Support: curar/buff
      if (card.type === 'support') {
        if (card.name.includes('Senzu') || card.name.includes('Full Heal') || card.name.includes('Regenerate') || card.name.includes('Second Wind')) {
          heal = card.id === 84 ? 100 : card.id === 83 ? 30 : card.id === 91 ? 20 : 50;
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
          setDamageNums(prev => [...prev, { value: heal, type: 'heal', x: 30, y: 40, id: Date.now() }]);
          addLog(`${player.name} usa ${card.name} — +${heal} HP!`);
        } else {
          const sBoost = card.name.includes('Hyper') || card.name.includes('Max') ? 6 : card.name.includes('Rage') ? 8 : card.name.includes('Ki') ? 3 : 0;
          const kBoost = card.name.includes('Hyper') ? 6 : card.name.includes('Max') ? 10 : card.name.includes('Ki') ? 3 : 0;
          setPBuffs(b => ({ str: b.str + (sBoost || 4), ki: b.ki + (kBoost || 2) }));
          addLog(`${player.name} usa ${card.name} — buff activado!`);
        }
        setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + card.cc) }));
        finishPlayerTurn(idx);
        return;
      }

      if (roll > acc) {
        hitType = 'miss';
        addLog(`${player.name} → ${card.name} — MISS!`);
      } else {
        let posMod = 1.0;
        if (player.position === 'front') posMod *= 1.1;
        if (enemy.position === 'back') posMod *= 0.9;
        let atkMod = card.atk + (card.type === 'beam' ? (player.ki + pBuffs.ki) * 0.5 : (player.str + pBuffs.str) * 0.3);
        if (card.type === 'beam' && command === 'LIMIT') atkMod *= 1.5;
        if (command === 'J') atkMod *= 0.8;
        if (command === 'B') atkMod *= 1.2;
        damage = Math.floor(atkMod * posMod);
        if (card.type === 'defense') { hitType = 'guard'; damage = Math.floor(damage * 0.5); }
        addLog(`${player.name} → ${card.name} — ${damage} dmg!`);
      }

      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashEnemy(true);
      setTimeout(() => setFlashEnemy(false), 150);

      if (damage > 0) setDamageNums(prev => [...prev, { value: damage, type: hitType === 'guard' ? 'guard' : 'damage', x: 70, y: 30, id: Date.now() }]);
      else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 70, y: 30, id: Date.now() }]);

      // CC gain
      if (card.type === 'command') setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + card.cc) }));

      if (enemy.hp - damage <= 0) {
        setTimeout(() => { setEnemyPose('hurt'); setPhase('win'); addLog(`${enemy.name} derrotado!`); }, 500);
        return;
      }

      setTimeout(() => enemyTurn(damage), 700);
    }, 350);
  };

  const finishPlayerTurn = (idx: number) => {
    const newHand = [...hand];
    newHand[idx] = BATTLE_DECK[Math.floor(Math.random() * BATTLE_DECK.length)];
    setHand(newHand);
    setSelectedCard(null);
    setTimeout(() => enemyTurn(0), 600);
  };

  const enemyTurn = (lastDmg: number) => {
    setPhase('enemyTurn');
    setEnemyPose('attack_fwd');
    setTimeout(() => {
      const enemyCards = CARDS.filter(c => (c.type === 'damage' || c.type === 'beam') && !c.compatible);
      const card = enemyCards[Math.floor(Math.random() * enemyCards.length)] || CARDS[25];
      let damage = 0;
      let hitType: 'damage' | 'miss' | 'guard' = 'damage';
      if (Math.random() > card.acc / 100) {
        hitType = 'miss';
        addLog(`${enemy.name} → ${card.name} — MISS!`);
      } else {
        let posMod = 1.0;
        if (enemy.position === 'front') posMod *= 1.1;
        if (player.position === 'back') posMod *= 0.9;
        let atkMod = card.atk + (card.type === 'beam' ? (enemy.ki + eBuffs.ki) * 0.5 : (enemy.str + eBuffs.str) * 0.3);
        damage = Math.floor(atkMod * posMod);
        addLog(`${enemy.name} → ${card.name} — ${damage} dmg!`);
      }
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashPlayer(true);
      setTimeout(() => setFlashPlayer(false), 150);
      if (damage > 0) { setPlayerPose('hurt'); setDamageNums(prev => [...prev, { value: damage, type: 'damage', x: 30, y: 50, id: Date.now() }]); }
      else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 30, y: 50, id: Date.now() }]);

      setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3 + card.cc) }));

      if (player.hp - damage <= 0) {
        setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); addLog(`${player.name} derrotado!`); }, 500);
        return;
      }

      setTimeout(() => {
        setPlayerPose('idle'); setEnemyPose('idle');
        setPhase('position'); setTurn(t => t + 1); setSelectedCard(null);
      }, 400);
    }, 500);
  };

  useEffect(() => {
    if (damageNums.length > 0) {
      const timer = setTimeout(() => setDamageNums(prev => prev.slice(1)), 1200);
      return () => clearTimeout(timer);
    }
  }, [damageNums]);

  const bg = BATTLE_BGS.find(b => b.id === bgId)!;

  return (
    <div className="battle-screen">
      {/* HUD */}
      <div className="hud-top">
        <div className="fighter-hud left">
          <div className="hud-name">
            <span className="hud-portrait">
              <img src={portraitFor(player.id) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!portraitFor(player.id) && '🟠'}
            </span>
            <strong>{player.name}</strong>
            <span className="hud-form">{player.form}</span>
            <span className="hud-level">LV{player.level}</span>
          </div>
          <HPBar current={player.hp} max={player.maxHp} side="left" />
          <div className="hud-stats">
            <span>STR{player.str + pBuffs.str}</span><span>KI{player.ki + pBuffs.ki}</span><span>SPD{player.spd}</span>
          </div>
          <CCDisplay cc={player.cc} maxCc={player.maxCc} />
        </div>
        <div className="fighter-hud right">
          <div className="hud-name">
            <span className="hud-portrait">
              <img src={portraitFor(enemy.id) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!portraitFor(enemy.id) && '🔵'}
            </span>
            <strong>{enemy.name}</strong>
            <span className="hud-form">{enemy.form}</span>
            <span className="hud-level">LV{enemy.level}</span>
          </div>
          <HPBar current={enemy.hp} max={enemy.maxHp} side="right" />
          <div className="hud-stats">
            <span>STR{enemy.str + eBuffs.str}</span><span>KI{enemy.ki + eBuffs.ki}</span><span>SPD{enemy.spd}</span>
          </div>
          <CCDisplay cc={enemy.cc} maxCc={enemy.maxCc} />
        </div>
      </div>

      {/* Campo de batalla */}
      <div className="battlefield">
        <div className="battle-bg authentic" style={{ backgroundImage: `url(${bg.file})` }} />
        <div className="battlefield-fighters">
          <div className={`fighter-container player ${player.elevation} ${player.position}`}>
            {player.battleId
              ? <FighterSprite charId={player.battleId} pose={playerPose} facing="right" scale={8} flash={flashPlayer} />
              : <img className="sheet-sprite" src={sheetUrl(pf)} alt={player.name} style={{ height: 320 }} />}
            <div className="fighter-position-tag">{player.elevation.toUpperCase()}/{player.position.toUpperCase()}</div>
          </div>
          <div className={`fighter-container enemy ${enemy.elevation} ${enemy.position}`}>
            {enemy.battleId
              ? <FighterSprite charId={enemy.battleId} pose={enemyPose} facing="left" scale={8} flash={flashEnemy} />
              : <img className="sheet-sprite" src={sheetUrl(ef)} alt={enemy.name} style={{ height: 320 }} />}
            <div className="fighter-position-tag">{enemy.elevation.toUpperCase()}/{enemy.position.toUpperCase()}</div>
          </div>
        </div>
        {damageNums.map(dn => <DamageNumber key={dn.id} value={dn.value} type={dn.type} x={dn.x} y={dn.y} />)}
      </div>

      {/* Barra de fase */}
      <div className="phase-bar">
        <div className="phase-info">
          <span className="turn-label">TURN {turn}</span>
          <span className="phase-label">
            {phase === 'position' ? 'CHOOSE POSITION' :
             phase === 'command' ? 'SELECT COMMAND' :
             phase === 'cardSelect' ? 'SELECT CARD' :
             phase === 'enemyTurn' ? 'ENEMY TURN' : ''}
          </span>
        </div>
        <button className="btn-exit" onClick={() => onExit(false)}>✕</button>
      </div>

      {/* Controles */}
      <div className="battle-controls">
        {phase === 'position' && (
          <div className="position-select">
            <div className="control-label">POSITION</div>
            <div className="position-pad">
              <button onClick={() => setPosition('back', 'air')}>AIR/BACK</button>
              <button onClick={() => setPosition('front', 'air')}>AIR/FRONT</button>
              <button onClick={() => setPosition('back', 'ground')}>GND/BACK</button>
              <button onClick={() => setPosition('front', 'ground')}>GND/FRONT</button>
            </div>
          </div>
        )}
        {phase === 'command' && (
          <div className="command-select">
            <div className="command-strip">
              <button onClick={() => selectCommand('LIMIT')} disabled={player.cc < 20} className="cmd-limit">LIMIT</button>
              <button onClick={() => selectCommand('J')} className="cmd-j">J</button>
              <button onClick={() => selectCommand('B')} className="cmd-b">B</button>
              <button onClick={() => selectCommand('C')} className="cmd-c">C</button>
            </div>
            <div className="command-help">LIMIT: 1.5x daño (20 CC) · J: físico · B: beam · C: support</div>
          </div>
        )}
        {phase === 'cardSelect' && (
          <HandComponent cards={hand} selectedIndex={selectedCard} onSelect={selectCard} />
        )}
        {phase === 'enemyTurn' && (
          <div className="enemy-turn-overlay"><div className="turn-text">ENEMY TURN</div></div>
        )}
        {phase === 'win' && (
          <div className="result-screen">
            <div className="result-title victory">VICTORY</div>
            <div className="result-info">
              <div>EXP +184</div>
              <div>HP {player.hp}/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => onExit(true)}>NEW BATTLE</button>
          </div>
        )}
        {phase === 'lose' && (
          <div className="result-screen">
            <div className="result-title defeat">DEFEAT</div>
            <div className="result-info">
              <div>Turn {turn}</div>
              <div>HP 0/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => onExit(false)}>RETRY</button>
          </div>
        )}
      </div>

      {/* Log */}
      <div className="battle-log">
        {log.slice(-3).map((msg, i) => <div key={i} className="log-entry">{msg}</div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MENÚ PRINCIPAL
// ═══════════════════════════════════════════════════════════

function MainMenu({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="menu-screen">
      <div className="menu-bg" />
      <div className="menu-content">
        <h1 className="menu-title">DRAGON BALL Z</h1>
        <h2 className="menu-subtitle">LEGENDARY SUPER WARRIORS</h2>
        <nav className="menu-nav">
          <button onClick={() => onNavigate('story')}>STORY</button>
          <button onClick={() => onNavigate('battle')}>BATTLE</button>
          <button onClick={() => onNavigate('deck')}>DECK</button>
          <button onClick={() => onNavigate('characters')}>CHARACTERS</button>
          <button onClick={() => onNavigate('cards')}>CARDS</button>
          <button onClick={() => onNavigate('settings')}>SETTINGS</button>
          <button onClick={() => onNavigate('battle')} className="btn-primary">CONTINUE</button>
        </nav>
        <div className="menu-footer">Continue Lv.38</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STORY — Mapa de capítulos
// ═══════════════════════════════════════════════════════════

const CHAPTERS = [
  { id: 1, name: 'Saiyan Saga', desc: 'Raditz vs Goku', enemy: 'piccolo_base' },
  { id: 2, name: 'Namek Arrival', desc: 'Ginyu Force', enemy: 'ginyu' },
  { id: 3, name: 'Frieza Battle', desc: 'Frieza Final Form', enemy: 'frieza_final' },
  { id: 4, name: 'Android Threat', desc: 'Dr. Gero', enemy: 'android_20' },
  { id: 5, name: 'Cell Games', desc: 'Perfect Cell', enemy: 'cell_perfect' },
  { id: 6, name: 'Buu Awakens', desc: 'Majin Buu', enemy: 'buu_base' },
  { id: 7, name: 'Fusion Fighters', desc: 'Super Buu', enemy: 'buu_super' },
  { id: 8, name: 'Final Battle', desc: 'Kid Buu', enemy: 'buu_kid' },
];

// Progreso de historia persistente
const STORY_KEY = 'dbzlsw_story_progress';

function loadStoryProgress(): number {
  try {
    return Number(localStorage.getItem(STORY_KEY) || '1');
  } catch { return 1; }
}

function saveStoryProgress(chapter: number) {
  try { localStorage.setItem(STORY_KEY, String(chapter)); } catch { /* noop */ }
}

function StoryScreen({ onNavigate, onStartChapter }: {
  onNavigate: (s: Screen) => void; onStartChapter: (enemyFormId: string, chapterName: string) => void;
}) {
  const [progress, setProgress] = useState(loadStoryProgress);
  const [selected, setSelected] = useState(1);

  const start = () => {
    const ch = CHAPTERS.find(c => c.id === selected)!;
    onStartChapter(ch.enemy, ch.name);
  };

  return (
    <div className="page-screen story-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}>◀</button>
        <h1 className="page-title">STORY</h1>
        <div className="page-spacer" />
      </div>
      <div className="story-map">
        {CHAPTERS.map(ch => {
          const unlocked = ch.id <= progress;
          const isSel = ch.id === selected;
          return (
            <div key={ch.id}
              className={`chapter-node ${isSel ? 'active' : ''} ${unlocked ? 'unlocked' : 'locked'}`}
              onClick={() => unlocked && setSelected(ch.id)}>
              <div className="chapter-icon">{unlocked ? ch.id : '🔒'}</div>
              <div className="chapter-info">
                <div className="chapter-name">{ch.name}</div>
                <div className="chapter-desc">{unlocked ? ch.desc : 'Not unlocked yet'}</div>
              </div>
              {unlocked && isSel && <div className="chapter-select">▶</div>}
            </div>
          );
        })}
      </div>
      <div className="page-footer">
        <button className="btn-primary" onClick={start} disabled={!CHAPTERS.find(c => c.id === selected)?.id}>
          START {CHAPTERS.find(c => c.id === selected)?.name.toUpperCase()}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARACTERS — Grid de personajes
// ═══════════════════════════════════════════════════════════

function CharactersScreen({ onNavigate, onSelectFighter }: {
  onNavigate: (s: Screen) => void; onSelectFighter: (formId: string) => void;
}) {
  const [selected, setSelected] = useState<string>('goku_base');

  const sel = getForm(selected)!;
  const selChar = getCharacter(sel.character)!;

  return (
    <div className="page-screen characters-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}>◀</button>
        <h1 className="page-title">CHARACTERS</h1>
        <div className="page-spacer" />
      </div>
      <div className="characters-layout">
        {/* Grid de personajes */}
        <div className="char-grid">
          {CHARACTERS.map(c => {
            const baseForm = getForm(c.forms[0])!;
            const active = c.id === sel.character;
            return (
              <button key={c.id} className={`char-cell ${active ? 'active' : ''}`}
                onClick={() => setSelected(baseForm.id)}>
                <img className="char-thumb" src={sheetUrl(baseForm)} alt={c.name} />
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} form{c.forms.length > 1 ? 's' : ''}</div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="char-detail">
          <div className="char-detail-header">
            <img className="char-detail-sprite" src={sheetUrl(sel)} alt={sel.character} />
            <div className="char-detail-info">
              <div className="char-detail-name">{selChar.name}</div>
              <div className="char-detail-form">{sel.form}</div>
              <div className="char-detail-saga">{selChar.saga} Saga</div>
              <div className="char-tier">Tier {'★'.repeat(selChar.tier)}{'☆'.repeat(5 - selChar.tier)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-block">
            <div className="stat-row"><span>HP</span><div className="stat-bar"><div className="stat-fill hp" style={{ width: `${sel.hp / 6}%` }} /></div><b>{sel.hp}</b></div>
            <div className="stat-row"><span>STR</span><div className="stat-bar"><div className="stat-fill str" style={{ width: `${sel.str / 1.2}%` }} /></div><b>{sel.str}</b></div>
            <div className="stat-row"><span>KI</span><div className="stat-bar"><div className="stat-fill ki" style={{ width: `${sel.ki / 1.2}%` }} /></div><b>{sel.ki}</b></div>
            <div className="stat-row"><span>SPD</span><div className="stat-bar"><div className="stat-fill spd" style={{ width: `${sel.spd}%` }} /></div><b>{sel.spd}</b></div>
          </div>

          {/* Formas */}
          <div className="form-select">
            {selChar.forms.map(fid => {
              const f = getForm(fid)!;
              return (
                <button key={fid} className={`form-chip ${fid === selected ? 'active' : ''}`}
                  onClick={() => setSelected(fid)}>{f.form}</button>
              );
            })}
          </div>

          <button className="btn-primary" onClick={() => onSelectFighter(selected)}>USE IN BATTLE</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DECK — Constructor de mazos
// ═══════════════════════════════════════════════════════════

function DeckScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [deck, setDeck] = useState<number[]>([1, 1, 2, 2, 4, 25, 25, 26, 27, 28, 53, 64, 65, 96, 96, 79, 80, 111, 5, 12]);
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const [search, setSearch] = useState('');

  const deckCounts: Record<number, number> = {};
  deck.forEach(id => { deckCounts[id] = (deckCounts[id] || 0) + 1; });

  const addCard = (card: CardDef) => {
    if (deck.length >= DECK_SIZE) return;
    if ((deckCounts[card.id] || 0) >= MAX_COPIES) return;
    setDeck([...deck, card.id]);
  };

  const removeCard = (cardId: number) => {
    const idx = deck.lastIndexOf(cardId);
    if (idx === -1) return;
    setDeck([...deck.slice(0, idx), ...deck.slice(idx + 1)]);
  };

  const filtered = CARDS.filter(c =>
    (filter === 'all' || c.type === filter) &&
    (search === '' || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (deckCounts[c.id] || 0) < MAX_COPIES
  );

  return (
    <div className="page-screen deck-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}>◀</button>
        <h1 className="page-title">DECK EDIT</h1>
        <div className="deck-count">{deck.length}/{DECK_SIZE}</div>
      </div>

      <div className="deck-layout">
        {/* Colección */}
        <div className="deck-collection">
          <div className="deck-toolbar">
            <input className="deck-search" placeholder="SEARCH..." value={search}
              onChange={e => setSearch(e.target.value)} />
            <div className="deck-filters">
              {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(t => (
                <button key={t} className={`filter-chip ${filter === t ? 'active' : ''}`}
                  onClick={() => setFilter(t)}>{t === 'all' ? 'ALL' : t.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="card-collection-grid">
            {filtered.map(card => (
              <CardVisual key={card.id} card={card} onClick={() => addCard(card)} small />
            ))}
          </div>
        </div>

        {/* Deck actual */}
        <div className="deck-current">
          <div className="deck-current-title">YOUR DECK</div>
          <div className="deck-list">
            {deck.map((cardId, i) => {
              const card = getCard(cardId)!;
              return (
                <div key={i} className="deck-row">
                  <span className="deck-row-icon">{TYPE_EMOJI[card.type]}</span>
                  <span className="deck-row-name" style={{ color: CARD_COLORS[card.type] }}>{card.name}</span>
                  <span className="deck-row-atk">{card.atk > 0 ? `ATK ${card.atk}` : ''}</span>
                  <button className="deck-row-remove" onClick={() => removeCard(cardId)}>✕</button>
                </div>
              );
            })}
            {deck.length < DECK_SIZE && Array.from({ length: DECK_SIZE - deck.length }).map((_, i) => (
              <div key={`empty-${i}`} className="deck-row empty">—</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CARDS — Colección
// ═══════════════════════════════════════════════════════════

function CardsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [owned, setOwned] = useState<Set<number>>(new Set(CARDS.filter(c => c.rarity <= 2).map(c => c.id)));
  const [filter, setFilter] = useState<CardType | 'all'>('all');

  const filtered = CARDS.filter(c => filter === 'all' || c.type === filter);

  return (
    <div className="page-screen cards-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}>◀</button>
        <h1 className="page-title">CARD COLLECTION</h1>
        <div className="deck-count">{owned.size}/{CARDS.length}</div>
      </div>
      <div className="deck-toolbar">
        <div className="deck-filters">
          {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(t => (
            <button key={t} className={`filter-chip ${filter === t ? 'active' : ''}`}
              onClick={() => setFilter(t)}>{t === 'all' ? 'ALL' : t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="card-collection-grid full">
        {filtered.map(card => {
          const isOwned = owned.has(card.id);
          if (!isOwned) {
            return (
              <div key={card.id} className="card card-unknown">
                <div className="card-unknown-label">???</div>
                <div className="card-unknown-sub">NOT OBTAINED</div>
              </div>
            );
          }
          return <CardVisual key={card.id} card={card} small />;
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════

function SettingsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [volume, setVolume] = useState(70);
  const [sfx, setSfx] = useState(true);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [screenMode, setScreenMode] = useState<'windowed' | 'fullscreen'>('windowed');

  return (
    <div className="page-screen settings-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}>◀</button>
        <h1 className="page-title">SETTINGS</h1>
        <div className="page-spacer" />
      </div>
      <div className="settings-list">
        <div className="setting-row">
          <span className="setting-label">BGM VOLUME</span>
          <input type="range" min={0} max={100} value={volume}
            onChange={e => setVolume(Number(e.target.value))} />
          <span className="setting-value">{volume}%</span>
        </div>
        <div className="setting-row">
          <span className="setting-label">SOUND FX</span>
          <button className={`toggle ${sfx ? 'on' : ''}`} onClick={() => setSfx(!sfx)}>
            {sfx ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="setting-row">
          <span className="setting-label">TEXT SPEED</span>
          <div className="setting-options">
            <button className={`filter-chip ${speed === 'normal' ? 'active' : ''}`} onClick={() => setSpeed('normal')}>NORMAL</button>
            <button className={`filter-chip ${speed === 'fast' ? 'active' : ''}`} onClick={() => setSpeed('fast')}>FAST</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">SCREEN</span>
          <div className="setting-options">
            <button className={`filter-chip ${screenMode === 'windowed' ? 'active' : ''}`} onClick={() => setScreenMode('windowed')}>WINDOWED</button>
            <button className={`filter-chip ${screenMode === 'fullscreen' ? 'active' : ''}`} onClick={() => setScreenMode('fullscreen')}>FULLSCREEN</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">CONTROLS</span>
          <div className="setting-controls">
            <div>1-5: Select card</div>
            <div>WASD: Navigate</div>
            <div>ENTER: Confirm</div>
            <div>ESC: Back / Cancel</div>
            <div>SPACE: Power Up</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState<Screen>('main');
  const [playerForm, setPlayerForm] = useState('goku_base');
  const [enemyForm, setEnemyForm] = useState('vegeta_base');
  const [storyChapter, setStoryChapter] = useState<number | null>(null);
  const [battleKey, setBattleKey] = useState(0);

  const startBattle = (playerFormId?: string) => {
    if (playerFormId) setPlayerForm(playerFormId);
    setStoryChapter(null);
    setEnemyForm('vegeta_base');
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const startChapter = (enemyFormId: string, chapterName: string) => {
    setEnemyForm(enemyFormId);
    const ch = CHAPTERS.find(c => c.name === chapterName);
    setStoryChapter(ch?.id ?? null);
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const exitBattle = (won: boolean) => {
    if (won && storyChapter) {
      const next = storyChapter + 1;
      saveStoryProgress(Math.min(next, CHAPTERS.length));
    }
    setScreen('main');
  };

  switch (screen) {
    case 'story': return <StoryScreen onNavigate={setScreen} onStartChapter={startChapter} />;
    case 'deck': return <DeckScreen onNavigate={setScreen} />;
    case 'characters': return <CharactersScreen onNavigate={setScreen} onSelectFighter={startBattle} />;
    case 'cards': return <CardsScreen onNavigate={setScreen} />;
    case 'settings': return <SettingsScreen onNavigate={setScreen} />;
    case 'battle': return <BattleScreen key={battleKey} playerFormId={playerForm} enemyFormId={enemyForm} onExit={exitBattle} />;
    default: return <MainMenu onNavigate={setScreen} />;
  }
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
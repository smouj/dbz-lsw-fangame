/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// ═══════════════════════════════════════════════════════════
// DBZ LSW Fangame — Neo-GBC PC Remake
// Authentic sprites, faithful mechanics, 16:9 pixel art
// ═══════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────

type FighterId = 'goku' | 'vegeta';
type Screen = 'main' | 'story' | 'deck' | 'characters' | 'cards' | 'battle';
type BattlePhase = 'position' | 'command' | 'cardSelect' | 'resolve' | 'enemyTurn' | 'win' | 'lose';
type Position = 'front' | 'back';
type Elevation = 'ground' | 'air';
type CommandType = 'LIMIT' | 'J' | 'B' | 'C';

interface SpriteAnim {
  frames: string[];
  fps: number;
  loop: boolean;
}

interface CharManifest {
  [pose: string]: { frames: { file: string; w: number; h: number }[]; fps: number; loop: boolean };
}

interface CardDef {
  id: number;
  name: string;
  type: 'command' | 'damage' | 'beam' | 'support' | 'defense' | 'special';
  description: string;
  atk: number;
  acc: number;
  cc: number;
  rarity: number; // 1-5 stars
  compatible?: FighterId[];
}

interface Fighter {
  id: FighterId;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  str: number;
  ki: number;
  spd: number;
  maxCc: number;
  cc: number;
  position: Position;
  elevation: Elevation;
  limits: string[];
}

// ─── Card Data (125 cards, subset for prototype) ──────────

const CARDS: CardDef[] = [
  // Command cards (build CC)
  { id: 1, name: '3 Stage Atk.', type: 'command', description: 'Short physical chain. Builds CC.', atk: 14, acc: 95, cc: 0, rarity: 1 },
  { id: 2, name: '4 Stage Atk.', type: 'command', description: 'Longer chain. Builds CC.', atk: 18, acc: 88, cc: 0, rarity: 1 },
  { id: 3, name: '5 Stage Atk.', type: 'command', description: 'Riskier physical combo.', atk: 23, acc: 80, cc: 0, rarity: 2 },
  { id: 4, name: 'Power Up', type: 'command', description: 'Focus energy. +5 CC.', atk: 0, acc: 100, cc: 5, rarity: 1 },
  { id: 5, name: 'Counter', type: 'command', description: 'Counter-attack after blocking.', atk: 16, acc: 90, cc: 0, rarity: 2 },
  // Damage cards
  { id: 20, name: 'Punch', type: 'damage', description: 'Basic physical attack.', atk: 12, acc: 95, cc: 3, rarity: 1 },
  { id: 21, name: 'Kick', type: 'damage', description: 'Basic kick attack.', atk: 14, acc: 92, cc: 3, rarity: 1 },
  { id: 22, name: 'Rush Attack', type: 'damage', description: 'Multi-hit physical.', atk: 22, acc: 85, cc: 6, rarity: 2 },
  { id: 23, name: 'Critical Punch', type: 'damage', description: 'High damage, lower accuracy.', atk: 30, acc: 75, cc: 8, rarity: 3 },
  // Beam cards
  { id: 40, name: 'Kamehameha', type: 'beam', description: 'Goku\'s signature beam.', atk: 28, acc: 90, cc: 16, rarity: 3, compatible: ['goku'] },
  { id: 41, name: 'Masenko', type: 'beam', description: 'Gohan\'s beam attack.', atk: 22, acc: 88, cc: 12, rarity: 2, compatible: ['goku'] },
  { id: 42, name: 'Galick Gun', type: 'beam', description: 'Vegeta\'s signature beam.', atk: 28, acc: 90, cc: 16, rarity: 3, compatible: ['vegeta'] },
  { id: 43, name: 'Final Flash', type: 'beam', description: 'Vegeta\'s ultimate beam.', atk: 38, acc: 80, cc: 23, rarity: 4, compatible: ['vegeta'] },
  // Support cards
  { id: 60, name: 'Senzu Bean', type: 'support', description: 'Restore 50 HP.', atk: 0, acc: 100, cc: 4, rarity: 2 },
  { id: 61, name: 'Ki Boost', type: 'support', description: '+3 STR, +3 KI this turn.', atk: 0, acc: 100, cc: 3, rarity: 1 },
  // Defense cards
  { id: 80, name: 'Guard', type: 'defense', description: 'Block 50% damage.', atk: 0, acc: 100, cc: 2, rarity: 1 },
  { id: 81, name: 'Dodge', type: 'defense', description: 'Evade with 70% chance.', atk: 0, acc: 70, cc: 4, rarity: 2 },
  // Special cards
  { id: 100, name: 'Spirit Bomb', type: 'special', description: 'Massive damage. Requires full CC.', atk: 45, acc: 70, cc: 30, rarity: 5, compatible: ['goku'] },
];

const CARD_TYPE_COLORS: Record<string, string> = {
  command: '#8899aa',
  damage: '#c44040',
  beam: '#4488dd',
  support: '#44aa55',
  defense: '#6655aa',
  special: '#ddaa33',
};

const CARD_TYPE_ICONS: Record<string, string> = {
  command: '⚡',
  damage: '👊',
  beam: '💫',
  support: '💚',
  defense: '🛡',
  special: '⭐',
};

// ─── Sprite Animation System ──────────────────────────────

function useSpriteAnim(charId: FighterId, pose: string): { src: string; w: number; h: number } {
  const [frameIdx, setFrameIdx] = useState(0);
  const [manifest, setManifest] = useState<CharManifest | null>(null);

  useEffect(() => {
    fetch(`/assets/sprites/${charId}/manifest.json`)
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest(null));
  }, [charId]);

  useEffect(() => {
    if (!manifest || !manifest[pose]) {
      setFrameIdx(0);
      return;
    }
    const anim = manifest[pose];
    if (anim.frames.length <= 1) {
      setFrameIdx(0);
      return;
    }
    const interval = 1000 / anim.fps;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= anim.frames.length) {
        if (anim.loop) idx = 0;
        else { clearInterval(timer); return; }
      }
      setFrameIdx(idx);
    }, interval);
    return () => clearInterval(timer);
  }, [manifest, pose]);

  if (!manifest || !manifest[pose]) {
    return { src: `/assets/sprites/${charId}/${charId}_idle_00.png`, w: 30, h: 46 };
  }
  const anim = manifest[pose];
  const f = anim.frames[Math.min(frameIdx, anim.frames.length - 1)];
  return { src: `/assets/sprites/${charId}/${f.file}`, w: f.w, h: f.h };
}

// ─── Fighter Sprites ──────────────────────────────────────

function FighterSprite({ charId, pose, facing, scale = 8, flash = false }: {
  charId: FighterId; pose: string; facing?: 'left' | 'right'; scale?: number; flash?: boolean;
}) {
  const { src, w, h } = useSpriteAnim(charId, pose);
  return (
    <div className={`fighter-sprite ${flash ? 'flash' : ''}`}
      style={{
        width: w * scale, height: h * scale,
        imageRendering: 'pixelated',
        transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
      }}>
      <img src={src} alt={charId}
        style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated' }} />
    </div>
  );
}

// ─── Battle Background ────────────────────────────────────

function BattleBackground() {
  return (
    <div className="battle-bg">
      <div className="bg-layer bg-sky" />
      <div className="bg-layer bg-clouds" />
      <div className="bg-layer bg-mountains" />
      <div className="bg-layer bg-terrain" />
      <div className="bg-layer bg-ground" />
    </div>
  );
}

// ─── HP Bar ───────────────────────────────────────────────

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

// ─── CC Display ───────────────────────────────────────────

function CCDisplay({ cc, maxCc }: { cc: number; maxCc: number }) {
  const pct = Math.max(0, Math.min(100, (cc / maxCc) * 100));
  return (
    <div className="cc-display">
      <div className="cc-label">CC</div>
      <div className="cc-bar-track">
        <div className="cc-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cc-value">{cc}</div>
    </div>
  );
}

// ─── Card Component ───────────────────────────────────────

function CardComponent({ card, selected, onClick, compact }: {
  card: CardDef; selected?: boolean; onClick?: () => void; compact?: boolean;
}) {
  const color = CARD_TYPE_COLORS[card.type] || '#8899aa';
  const icon = CARD_TYPE_ICONS[card.type] || '⚡';
  const stars = '★'.repeat(card.rarity) + '☆'.repeat(5 - card.rarity);

  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ '--card-color': color } as React.CSSProperties}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <span className="card-cc">{card.cc} CC</span>
      </div>
      {!compact && <div className="card-art">{icon}</div>}
      <div className="card-name">{card.name}</div>
      <div className="card-type">{card.type}</div>
      <div className="card-stats">
        {card.atk > 0 && <span className="card-atk">ATK {card.atk}</span>}
        <span className="card-acc">ACC {card.acc}%</span>
      </div>
      <div className="card-rarity">{stars}</div>
    </button>
  );
}

// ─── Hand Component ───────────────────────────────────────

function HandComponent({ cards, selectedIndex, onSelect }: {
  cards: CardDef[]; selectedIndex: number | null; onSelect: (i: number) => void;
}) {
  return (
    <div className="hand-area">
      <div className="hand-label">YOUR HAND</div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <CardComponent key={card.id + '-' + i} card={card}
            selected={i === selectedIndex} onClick={() => onSelect(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Damage Number ────────────────────────────────────────

function DamageNumber({ value, type, x, y }: { value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number }) {
  const text = type === 'miss' ? 'MISS' : type === 'guard' ? 'GUARD' : `${value > 0 ? '-' : '+'}${Math.abs(value)}`;
  return (
    <div className={`damage-number ${type}`} style={{ left: x, top: y }}>
      {text}
    </div>
  );
}

// ─── Battle Screen ────────────────────────────────────────

function BattleScreen() {
  const [player, setPlayer] = useState<Fighter>({
    id: 'goku', name: 'Goku', level: 38, maxHp: 312, hp: 312,
    str: 42, ki: 47, spd: 39, maxCc: 40, cc: 8,
    position: 'front', elevation: 'ground',
    limits: ['Kamehameha', 'Spirit Bomb'],
  });
  const [enemy, setEnemy] = useState<Fighter>({
    id: 'vegeta', name: 'Vegeta', level: 39, maxHp: 304, hp: 304,
    str: 45, ki: 44, spd: 41, maxCc: 40, cc: 8,
    position: 'back', elevation: 'ground',
    limits: ['Galick Gun', 'Final Flash'],
  });
  const [phase, setPhase] = useState<BattlePhase>('position');
  const [turn, setTurn] = useState(1);
  const [command, setCommand] = useState<CommandType | null>(null);
  const [hand, setHand] = useState<CardDef[]>(() => {
    // Draw 5 cards from a shuffled deck
    const deck = [...CARDS];
    const shuffled = deck.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>(['Battle Start!']);
  const [damageNums, setDamageNums] = useState<{ value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number; id: number }[]>([]);
  const [playerPose, setPlayerPose] = useState('idle');
  const [enemyPose, setEnemyPose] = useState('idle');
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [flashEnemy, setFlashEnemy] = useState(false);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-8), msg]), []);

  // Position selection
  const setPosition = (pos: Position, elev: Elevation) => {
    setPlayer(prev => ({ ...prev, position: pos, elevation: elev }));
    setPhase('command');
    addLog(`Position: ${elev}/${pos}`);
  };

  // Command selection
  const selectCommand = (cmd: CommandType) => {
    if (cmd === 'LIMIT') {
      if (player.cc < 20) { addLog('Not enough CC for LIMIT!'); return; }
      setPlayerPose('beam_charge');
      setCommand(cmd);
      setPhase('cardSelect');
      return;
    }
    setCommand(cmd);
    setPhase('cardSelect');
  };

  // Card selection
  const selectCard = (idx: number) => {
    setSelectedCard(idx);
    resolveCard(idx);
  };

  // Resolve player's card
  const resolveCard = (idx: number) => {
    const card = hand[idx];
    setPlayerPose(card.type === 'beam' ? 'beam_charge' : card.type === 'damage' ? 'attack_fwd' : 'guard');

    setTimeout(() => {
      let damage = 0;
      let hitType: 'damage' | 'miss' | 'guard' = 'damage';
      const acc = card.acc / 100;
      const roll = Math.random();

      if (roll > acc) {
        hitType = 'miss';
        addLog(`${player.name} used ${card.name} — MISS!`);
      } else {
        // Position modifiers
        let posMod = 1.0;
        if (player.position === 'front') posMod *= 1.1;
        if (enemy.position === 'back') posMod *= 0.9;

        // Type modifiers
        let atkMod = card.atk;
        if (card.type === 'beam') atkMod += player.ki * 0.5;
        else if (card.type === 'damage') atkMod += player.str * 0.3;

        damage = Math.floor(atkMod * posMod);

        if (card.type === 'defense') {
          hitType = 'guard';
          damage = Math.floor(damage * 0.5);
        }

        addLog(`${player.name} used ${card.name} — ${damage} damage!`);
      }

      // Apply damage
      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashEnemy(true);
      setTimeout(() => setFlashEnemy(false), 200);

      if (damage > 0) {
        setDamageNums(prev => [...prev, { value: damage, type: hitType === 'guard' ? 'guard' : 'damage', x: 70, y: 30, id: Date.now() }]);
      } else if (hitType === 'miss') {
        setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 70, y: 30, id: Date.now() }]);
      }

      // CC gain
      if (card.type === 'command') {
        setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      }
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + card.cc) }));

      // Remove used card and draw new one
      const newHand = [...hand];
      const replacement = CARDS[Math.floor(Math.random() * CARDS.length)];
      newHand[idx] = replacement;
      setHand(newHand);

      // Check for enemy KO
      if (enemy.hp - damage <= 0) {
        setTimeout(() => {
          setEnemyPose('hurt');
          setPhase('win');
          addLog(`${enemy.name} defeated!`);
        }, 600);
        return;
      }

      // Enemy turn
      setTimeout(() => enemyTurn(damage), 800);
    }, 400);
  };

  // Enemy AI turn
  const enemyTurn = (lastPlayerDmg: number) => {
    setPhase('enemyTurn');
    setEnemyPose('attack_fwd');

    setTimeout(() => {
      const enemyCards = CARDS.filter(c => c.type === 'damage' || c.type === 'beam');
      const card = enemyCards[Math.floor(Math.random() * enemyCards.length)];

      let damage = 0;
      let hitType: 'damage' | 'miss' | 'guard' = 'damage';
      const acc = card.acc / 100;

      if (Math.random() > acc) {
        hitType = 'miss';
        addLog(`${enemy.name} used ${card.name} — MISS!`);
      } else {
        let posMod = 1.0;
        if (enemy.position === 'front') posMod *= 1.1;
        if (player.position === 'back') posMod *= 0.9;

        let atkMod = card.atk;
        if (card.type === 'beam') atkMod += enemy.ki * 0.5;
        else atkMod += enemy.str * 0.3;

        damage = Math.floor(atkMod * posMod);

        if (card.type === 'defense') {
          hitType = 'guard';
          damage = Math.floor(damage * 0.5);
        }

        addLog(`${enemy.name} used ${card.name} — ${damage} damage!`);
      }

      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashPlayer(true);
      setTimeout(() => setFlashPlayer(false), 200);

      if (damage > 0) {
        setPlayerPose('hurt');
        setDamageNums(prev => [...prev, { value: damage, type: hitType === 'guard' ? 'guard' : 'damage', x: 30, y: 50, id: Date.now() }]);
      } else if (hitType === 'miss') {
        setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 30, y: 50, id: Date.now() }]);
      }

      // Enemy CC
      setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3 + card.cc) }));

      if (player.hp - damage <= 0) {
        setTimeout(() => {
          setPlayerPose('hurt');
          setPhase('lose');
          addLog(`${player.name} defeated!`);
        }, 600);
        return;
      }

      setTimeout(() => {
        setPlayerPose('idle');
        setEnemyPose('idle');
        setPhase('position');
        setTurn(t => t + 1);
        setSelectedCard(null);
      }, 500);
    }, 600);
  };

  // Clean damage numbers
  useEffect(() => {
    if (damageNums.length > 0) {
      const timer = setTimeout(() => setDamageNums(prev => prev.slice(1)), 1500);
      return () => clearTimeout(timer);
    }
  }, [damageNums]);

  return (
    <div className="battle-screen">
      {/* HUD */}
      <div className="hud-top">
        <div className="fighter-hud left">
          <div className="hud-name">
            <span className="hud-portrait">{player.id === 'goku' ? '🟠' : '🔵'}</span>
            <strong>{player.name}</strong>
            <span className="hud-level">LV {player.level}</span>
          </div>
          <HPBar current={player.hp} max={player.maxHp} side="left" />
          <div className="hud-stats">
            <span>STR {player.str}</span>
            <span>KI {player.ki}</span>
            <span>SPD {player.spd}</span>
          </div>
          <CCDisplay cc={player.cc} maxCc={player.maxCc} />
        </div>
        <div className="fighter-hud right">
          <div className="hud-name">
            <span className="hud-portrait">{enemy.id === 'vegeta' ? '🔵' : '🟠'}</span>
            <strong>{enemy.name}</strong>
            <span className="hud-level">LV {enemy.level}</span>
          </div>
          <HPBar current={enemy.hp} max={enemy.maxHp} side="right" />
          <div className="hud-stats">
            <span>STR {enemy.str}</span>
            <span>KI {enemy.ki}</span>
            <span>SPD {enemy.spd}</span>
          </div>
          <CCDisplay cc={enemy.cc} maxCc={enemy.maxCc} />
        </div>
      </div>

      {/* Battlefield */}
      <div className="battlefield">
        <BattleBackground />
        <div className="battlefield-fighters">
          <div className={`fighter-container player ${player.elevation}`}>
            <FighterSprite charId={player.id} pose={playerPose} facing="right" scale={8} flash={flashPlayer} />
            <div className="fighter-position-tag">{player.elevation.toUpperCase()} / {player.position.toUpperCase()}</div>
          </div>
          <div className={`fighter-container enemy ${enemy.elevation}`}>
            <FighterSprite charId={enemy.id} pose={enemyPose} facing="left" scale={8} flash={flashEnemy} />
            <div className="fighter-position-tag">{enemy.elevation.toUpperCase()} / {enemy.position.toUpperCase()}</div>
          </div>
        </div>
        {damageNums.map(dn => (
          <DamageNumber key={dn.id} value={dn.value} type={dn.type} x={dn.x} y={dn.y} />
        ))}
      </div>

      {/* Phase Info */}
      <div className="phase-bar">
        <div className="phase-info">
          <span className="turn-label">Turn {turn}</span>
          <span className="phase-label">{phase === 'position' ? 'CHOOSE POSITION' :
            phase === 'command' ? 'SELECT COMMAND' :
            phase === 'cardSelect' ? 'SELECT CARD' :
            phase === 'resolve' ? 'RESOLVING...' :
            phase === 'enemyTurn' ? 'ENEMY TURN' : ''}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="battle-controls">
        {phase === 'position' && (
          <div className="position-select">
            <div className="control-label">POSITION</div>
            <div className="position-pad">
              <button onClick={() => setPosition('back', 'air')}>AIR / BACK</button>
              <button onClick={() => setPosition('front', 'air')}>AIR / FRONT</button>
              <button onClick={() => setPosition('back', 'ground')}>GROUND / BACK</button>
              <button onClick={() => setPosition('front', 'ground')}>GROUND / FRONT</button>
            </div>
          </div>
        )}

        {phase === 'command' && (
          <div className="command-select">
            <div className="command-strip">
              <button onClick={() => selectCommand('LIMIT')} disabled={player.cc < 20}
                className="cmd-limit">LIMIT</button>
              <button onClick={() => selectCommand('J')} className="cmd-j">J</button>
              <button onClick={() => selectCommand('B')} className="cmd-b">B</button>
              <button onClick={() => selectCommand('C')} className="cmd-c">C</button>
            </div>
          </div>
        )}

        {phase === 'cardSelect' && (
          <HandComponent cards={hand} selectedIndex={selectedCard} onSelect={selectCard} />
        )}

        {phase === 'enemyTurn' && (
          <div className="enemy-turn-overlay">
            <div className="turn-text">ENEMY TURN</div>
          </div>
        )}

        {phase === 'win' && (
          <div className="result-screen">
            <div className="result-title victory">VICTORY</div>
            <FighterSprite charId={player.id} pose="idle" facing="right" scale={6} />
            <div className="result-info">
              <div>EXP +184</div>
              <div>HP {player.hp}/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => window.location.reload()}>NEW BATTLE</button>
          </div>
        )}

        {phase === 'lose' && (
          <div className="result-screen">
            <div className="result-title defeat">DEFEAT</div>
            <div className="result-info">
              <div>Fell at Turn {turn}</div>
              <div>HP 0/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => window.location.reload()}>RETRY</button>
          </div>
        )}
      </div>

      {/* Battle Log */}
      <div className="battle-log">
        {log.slice(-3).map((msg, i) => <div key={i} className="log-entry">{msg}</div>)}
      </div>
    </div>
  );
}

// ─── Menu Screens ─────────────────────────────────────────

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
          <button onClick={() => onNavigate('battle')} className="btn-primary">CONTINUE</button>
        </nav>
        <div className="menu-footer">Continue Lv.38</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('main');

  switch (screen) {
    case 'battle': return <BattleScreen />;
    default: return <MainMenu onNavigate={setScreen} />;
  }
}

// ─── Mount ─────────────────────────────────────────────────

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
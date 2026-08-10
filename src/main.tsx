/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FORMS, CHARACTERS, getCharacter, getForm, idleSpriteUrl } from './data/roster';
import { needsFlip } from './data/facing';
import { UNLOCK_KEY, STARTER_DAMAGE_DECK, STARTER_BEAM_DECK, STARTER_CHARACTERS, cardsForLevel, pickRewards, VS_UNLOCKS, isFormUnlocked, FORM_UNLOCK_LEVELS } from './data/unlocks';
import { CARDS, CARD_COLORS, CARD_TYPE_NAMES, CardDef, CardType, DECK_SIZE, MAX_COPIES, getCard, CardEffect } from './data/cards';
import { cardIconUrl, MINI_PORTRAITS, MENU_PORTRAITS, TYPE_ICONS } from './data/icons';
import { initAudio, Sfx, setSfxEnabled, setVolume } from './audio/sfx';
import { LanguageProvider, useLang } from './i18n/LanguageContext';
import { LANGUAGES, LangCode, TKey } from './i18n';
import { ArrowLeft, X, Lock, ChevronRight, Languages, Sword, Shield, type LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// DBZ LSW Fangame — Estilo Magazine GBC Auténtico
// Sprites reales, mecánicas fieles, pixel art nítido, 10 idiomas
// ═══════════════════════════════════════════════════════════

type Screen = 'main' | 'story' | 'battle' | 'versus' | 'deck' | 'characters' | 'cards' | 'settings';
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
  getCard(5)!, getCard(5)!, getCard(6)!, getCard(25)!, getCard(29)!,
  getCard(12)!, getCard(7)!, getCard(8)!, getCard(19)!, getCard(19)!,
  getCard(16)!, getCard(23)!, getCard(9)!, getCard(15)!, getCard(11)!,
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
      style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}>
      <img src={src} alt={charId} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}

// ─── Sprite idle recortado de un sheet auténtico ─────────
function CharacterSprite({ formId, height = 92, className = '' }: {
  formId: string; height?: number; className?: string;
}) {
  const form = getForm(formId);
  const idle = form ? idleSpriteUrl(form) : undefined;
  if (!idle || !form) {
    return <div className={`char-sprite-missing ${className}`} style={{ height }}>?</div>;
  }
  const flip = needsFlip(form.sheet);
  // mantener proporción: width = height * (w/h) del sprite; voltear a la derecha si el sheet lo requiere
  return (
    <img className={`char-idle-sprite ${className}`}
      src={idle}
      alt={form.character}
      style={{ height, width: 'auto', imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : 'none' }}
    />
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
  const IconCmp = TYPE_ICONS[card.type];
  const stars = '★'.repeat(card.rarity) + '☆'.repeat(5 - card.rarity);
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      onClick={onClick} style={{ '--card-color': color } as React.CSSProperties}>
      <div className="card-header">
        <span className="card-icon">
          {iconUrl ? <img className="card-icon-img" src={iconUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} /> : <IconCmp size={16} strokeWidth={2.2} />}
        </span>
        <span className="card-cc">{card.cc}CC</span>
      </div>
      <div className="card-art">
        {iconUrl ? <img className="card-art-img" src={iconUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} /> : <IconCmp size={40} strokeWidth={1.8} />}
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
  const { t } = useLang();
  return (
    <div className="hand-area">
      <div className="hand-label">— {t('battle.hand')} —</div>
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
  const { t } = useLang();
  const text = type === 'miss' ? t('battle.miss') : type === 'guard' ? t('battle.guard') : `${value > 0 ? '-' : '+'}${Math.abs(value)}`;
  return <div className={`damage-number ${type}`} style={{ left: x, top: y }}>{text}</div>;
}

// ─── Soporte de cartas: cantidad de curación por id ───────
function healAmountFor(card: CardDef, maxHp: number): number {
  switch (card.id) {
    case 16: return Math.floor(maxHp * 0.5);  // Resurrection
    case 88: return Math.floor(maxHp * 0.6);  // Dende
    case 99: return Math.floor(maxHp * 0.35); // Life Preserver
    case 100: return Math.floor(maxHp * 0.5); // Medical Machine
    case 114: return Math.floor(maxHp * 0.7); // Heart Medicine
    case 117: return maxHp;                   // Full Spirit
    default: return Math.floor(maxHp * 0.3);
  }
}

// ═══════════════════════════════════════════════════════════
// PANTALLA DE BATALLA
// ═══════════════════════════════════════════════════════════

function BattleScreen({ playerFormId, enemyFormId, onExit }: {
  playerFormId: string; enemyFormId: string; onExit: (won: boolean) => void;
}) {
  const { t } = useLang();
  const pf = getForm(playerFormId)!;
  const ef = getForm(enemyFormId)!;

  const [player, setPlayer] = useState<Fighter>(() => {
    const prog = loadProgress();
    const base: Fighter = {
      id: pf.character, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,
      level: prog.level, maxHp: pf.hp, hp: pf.hp,
      str: pf.str, ki: pf.ki, spd: pf.spd, maxCc: 13, cc: 5,
      position: 'front', elevation: 'ground', battleId: pf.battleId,
      limits: ['Limit', 'Final'],
    };
    return applyLevelUps(base, prog.level);
  });
  const [enemy, setEnemy] = useState<Fighter>({
    id: ef.character, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,
    level: 39, maxHp: ef.hp, hp: ef.hp,
    str: ef.str, ki: ef.ki, spd: ef.spd, maxCc: 13, cc: 5,
    position: 'back', elevation: 'ground', battleId: ef.battleId,
    limits: ['Limit', 'Final'],
  });
  const [phase, setPhase] = useState<BattlePhase>('position');
  const [turn, setTurn] = useState(1);
  const [command, setCommand] = useState<CommandType | null>(null);
  const [bgId, setBgId] = useState('bg1');
  const [hand, setHand] = useState<CardDef[]>(() => {
    // Usar el mazo persistido del jugador (o el default si no hay)
    const deckIds = loadDeck();
    const battleDeck = deckIds.map(id => getCard(id)).filter((c): c is CardDef => !!c);
    const shuffled = [...battleDeck].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([t('battle.start')]);
  const [damageNums, setDamageNums] = useState<{ value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number; id: number }[]>([]);
  const [playerPose, setPlayerPose] = useState('idle');
  const [enemyPose, setEnemyPose] = useState('idle');
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [flashEnemy, setFlashEnemy] = useState(false);
  const [pBuffs, setPBuffs] = useState({ str: 0, ki: 0 });
  const [eBuffs, setEBuffs] = useState({ str: 0, ki: 0 });
  // Guardia activa: defensa usada en el turno que mitiga el próximo ataque enemigo
  const [playerGuard, setPlayerGuard] = useState<null | { type: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' }>(null);
  const [enemyGuard, setEnemyGuard] = useState<null | { type: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' }>(null);

  useEffect(() => {
    setBgId(BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)].id);
  }, []);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-6), msg]), []);

  const setPosition = (pos: Position, elev: Elevation) => {
    Sfx.position();
    setPlayer(prev => ({ ...prev, position: pos, elevation: elev }));
    setPhase('command');
    addLog(`${elev.toUpperCase()}/${pos.toUpperCase()}`);
  };

  const selectCommand = (cmd: CommandType) => {
    Sfx.select();
    if (cmd === 'LIMIT' && player.cc < 20) { addLog(t('battle.ccInsufficient')); Sfx.cancel(); return; }
    setCommand(cmd);
    setPhase('cardSelect');
  };

  const selectCard = (idx: number) => {
    const card = hand[idx];
    setSelectedCard(idx);
    Sfx.cardPlay();
    setPlayerPose(card.type === 'beam' ? 'beam_charge' : card.type === 'damage' ? 'attack_fwd' : card.type === 'defense' ? 'guard' : 'idle');

    setTimeout(() => {
      let damage = 0;
      let hitType: 'damage' | 'miss' = 'damage';
      let heal = 0;
      const acc = card.acc / 100;
      const roll = Math.random();

      // Support/Defensa: curar, buff, debuff, escudos, cancelar comando, etc.
      const supEffects = ['heal_25pct','heal_strong','heal_light','buff_kaio','buff_ki8','buff_str8','buff_speed8','buff_guard8','buff_str_ki8','debuff_str8','debuff_ki8','debuff_speed8','debuff_speed8_lowacc','debuff_guard8','attack_power_down','powerup_dispel','support_dispel','powerdown_cleanse','avoid_beam','avoid_damage','avoid_damage_taiyoken','reduce_damage','absorb_beam','command_cancel','accuracy_up','evasion_up','knockdown_dmg','knockdown_min','life_drain','cc_recovery','lock_on','sunglasses','beam_shield','damage_shield','ohko_lowacc','android_kill','special_card','gamebomb','candy','naughty_book'];
      if (card.type === 'support' || card.type === 'defense' || card.type === 'special' || supEffects.includes(card.effect)) {
        const eff = card.effect;
        // Curación
        if (eff === 'heal_25pct' || eff === 'heal_strong' || eff === 'heal_light') {
          const pct = eff === 'heal_strong' ? 0.6 : eff === 'heal_light' ? 0.3 : 0.25;
          heal = Math.floor(player.maxHp * pct);
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
          setDamageNums(prev => [...prev, { value: heal, type: 'heal', x: 30, y: 40, id: Date.now() }]);
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — +${heal} ${t('battle.hp')}!`);
        } else if (eff === 'life_drain') {
          // roba vida: daño + cura
          const drain = Math.floor((card.atk + player.str * 0.2) * 0.5);
          setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - drain) }));
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + drain) }));
          setDamageNums(prev => [...prev, { value: drain, type: 'damage', x: 70, y: 30, id: Date.now() }]);
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${drain} ${t('battle.dmg')} (+${drain} HP)`);
        } else if (eff === 'cc_recovery') {
          const gain = card.id === 97 ? 5 : 3;
          setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + gain) }));
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — +${gain} CC!`);
        } else if (eff === 'avoid_beam' || eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'reduce_damage' || eff === 'absorb_beam' || eff === 'beam_shield' || eff === 'damage_shield' || eff === 'command_cancel') {
          // Activar guardia: mitiga el próximo ataque enemigo (persistente hasta usarse)
          const gType: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' =
            eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'damage_shield' ? 'avoid_damage'
            : eff === 'absorb_beam' || eff === 'beam_shield' ? 'absorb'
            : eff === 'reduce_damage' ? 'reduce'
            : 'avoid_beam';
          setPlayerGuard({ type: gType });
          const label = gType === 'avoid_beam' ? 'BEAM GUARD' : gType === 'avoid_damage' ? 'DAMAGE GUARD' : gType === 'absorb' ? 'ABSORB' : 'ENDURANCE';
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${label}!`);
        } else if (eff === 'ohko_lowacc' || eff === 'android_kill') {
          // OHKO con baja precisión
          if (Math.random() < card.acc / 100) {
            setEnemy(prev => ({ ...prev, hp: 0 }));
            setDamageNums(prev => [...prev, { value: 999, type: 'damage', x: 70, y: 30, id: Date.now() }]);
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — OHKO!`);
            setTimeout(() => { setEnemyPose('hurt'); setPhase('win'); Sfx.victory(); addLog(`${enemy.name} ${t('battle.defeated')}`); }, 500);
            return;
          } else {
            addLog(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
          }
        } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff === 'accuracy_up' || eff === 'evasion_up' || eff === 'lock_on' || eff === 'powerup_dispel' || eff === 'support_dispel' || eff === 'powerdown_cleanse' || eff === 'knockdown_dmg' || eff === 'knockdown_min' || eff === 'attack_power_down' || eff === 'sunglasses' || eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'special_card') {
          // Buffs +8, debuffs -8, otros efectos de estado
          if (eff === 'buff_ki8' || eff === 'buff_str_ki8') setPBuffs(b => ({ ...b, ki: b.ki + 8 }));
          if (eff === 'buff_str8' || eff === 'buff_str_ki8') setPBuffs(b => ({ ...b, str: b.str + 8 }));
          if (eff === 'buff_speed8') { /* velocidad: se ignora en el HUD actual */ }
          if (eff === 'buff_guard8') { /* guard: se refleja como reducción */ }
          if (eff === 'buff_kaio') setPBuffs(b => ({ str: b.str + player.str, ki: b.ki + player.ki }));
          if (eff.startsWith('debuff_')) setEBuffs(b => ({ ...b, str: Math.max(0, b.str - 8), ki: Math.max(0, b.ki - 8) }));
          if (eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'knockdown_dmg' || eff === 'knockdown_min') {
            const dmg = Math.floor((card.atk || 20) + player.str * 0.2);
            setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
            setDamageNums(prev => [...prev, { value: dmg, type: 'damage', x: 70, y: 30, id: Date.now() }]);
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${dmg} ${t('battle.dmg')}`);
          } else {
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${t('battle.buff')}`);
          }
        }
        setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + card.cc) }));
        finishPlayerTurn(idx);
        return;
      }

      if (roll > acc) {
        hitType = 'miss';
        addLog(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
      } else {
        let posMod = 1.0;
        // Posiciones reales: aire vulnerable a Beam, suelo vulnerable a Damage
        if (enemy.elevation === 'air' && card.type === 'beam') posMod *= 1.4;
        else if (enemy.elevation === 'ground' && card.type === 'damage') posMod *= 1.4;
        if (enemy.position === 'back' && card.type !== 'beam') posMod *= 0.85;
        if (player.position === 'front') posMod *= 1.1;
        let atkMod = card.atk + (card.type === 'beam' ? (player.ki + pBuffs.ki) * 0.5 : (player.str + pBuffs.str) * 0.3);
        if (card.type === 'beam' && command === 'LIMIT') atkMod *= 1.5;
        if (command === 'J') atkMod *= 0.8;
        if (command === 'B') atkMod *= 1.2;
        damage = Math.floor(atkMod * posMod);
        addLog(`${player.name} → ${card.name} — ${damage} ${t('battle.dmg')}`);
      }

      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashEnemy(true);
      if (card.type === 'beam') Sfx.beam();
      else if (damage > 0) Sfx.hit();
      else if (hitType === 'miss') Sfx.dodge();
      setTimeout(() => setFlashEnemy(false), 150);

      if (damage > 0) setDamageNums(prev => [...prev, { value: damage, type: 'damage', x: 70, y: 30, id: Date.now() }]);
      else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 70, y: 30, id: Date.now() }]);

      // CC gain
      if (card.type === 'command') setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + card.cc) }));

      if (enemy.hp - damage <= 0) {
        // Otorgar EXP al ganar
        const prog = loadProgress();
        const gained = 80 + enemy.level * 20;
        let newExp = prog.exp + gained;
        let newLevel = prog.level;
        while (newExp >= expToNext(newLevel)) {
          newExp -= expToNext(newLevel);
          newLevel++;
        }
        saveProgress({ level: newLevel, exp: newExp });
        setTimeout(() => {
          setEnemyPose('hurt'); setPhase('win'); Sfx.victory();
          addLog(`${enemy.name} ${t('battle.defeated')}`);
          if (newLevel > prog.level) addLog(`LEVEL UP! ${newLevel} (+HP/STR/KI/SPD)`);
        }, 500);
        return;
      }

      setTimeout(() => enemyTurn(damage), 700);
    }, 350);
  };

  const finishPlayerTurn = (idx: number) => {
    const newHand = [...hand];
    newHand[idx] = getCard(loadDeck()[Math.floor(Math.random() * loadDeck().length)]) || BATTLE_DECK[0];
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
        addLog(`${enemy.name} → ${card.name} — ${t('battle.miss')}!`);
      } else {
        let posMod = 1.0;
        if (player.elevation === 'air' && card.type === 'beam') posMod *= 1.4;
        else if (player.elevation === 'ground' && card.type === 'damage') posMod *= 1.4;
        if (player.position === 'back' && card.type !== 'beam') posMod *= 0.85;
        if (enemy.position === 'front') posMod *= 1.1;
        let atkMod = card.atk + (card.type === 'beam' ? (enemy.ki + eBuffs.ki) * 0.5 : (enemy.str + eBuffs.str) * 0.3);
        damage = Math.floor(atkMod * posMod);
        // Aplicar guardia activa del jugador
        if (playerGuard) {
          const g = playerGuard.type;
          if ((g === 'avoid_beam' && card.type === 'beam') || (g === 'avoid_damage' && card.type === 'damage')) {
            damage = 0; hitType = 'guard';
            addLog(`${player.name} bloquea ${card.name}!`);
          } else if (g === 'reduce') {
            damage = Math.floor(damage * 0.5);
            addLog(`${player.name} resiste — ${damage} ${t('battle.dmg')}`);
          } else if (g === 'absorb' && card.type === 'beam') {
            damage = 0; hitType = 'guard';
            setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp * 0.1)) }));
            addLog(`${player.name} absorbe el beam +${Math.floor(player.maxHp * 0.1)} HP!`);
          }
          setPlayerGuard(null); // la guardia se consume
        } else {
          addLog(`${enemy.name} → ${card.name} — ${damage} ${t('battle.dmg')}`);
        }
      }
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      // CC al recibir daño significativo (más en posición vulnerable)
      if (damage > 0) {
        const vuln = (player.elevation === 'air' && card.type === 'beam') || (player.elevation === 'ground' && card.type === 'damage');
        setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + (vuln ? 2 : 1)) }));
      }
      setFlashPlayer(true);
      if (card.type === 'beam') Sfx.beam();
      else if (damage > 0) Sfx.punch();
      else if (hitType === 'miss') Sfx.dodge();
      setTimeout(() => setFlashPlayer(false), 150);
      if (damage > 0) { setPlayerPose('hurt'); setDamageNums(prev => [...prev, { value: damage, type: 'damage', x: 30, y: 50, id: Date.now() }]); }
      else if (hitType === 'guard') setDamageNums(prev => [...prev, { value: 0, type: 'guard', x: 30, y: 50, id: Date.now() }]);
      else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', x: 30, y: 50, id: Date.now() }]);

      // +3 CC por turno atacante + CC de la carta; +1 CC extra al infligir daño
      setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3 + card.cc + (damage > 0 ? 1 : 0)) }));

      if (player.hp - damage <= 0) {
        setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); Sfx.defeat(); addLog(`${player.name} ${t('battle.defeated')}`); }, 500);
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
              {!portraitFor(player.id) && <Sword size={14} />}
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
              {!portraitFor(enemy.id) && <Shield size={14} />}
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
              : <CharacterSprite formId={playerFormId} className="sheet-sprite" />}
            <div className="fighter-position-tag">{player.elevation.toUpperCase()}/{player.position.toUpperCase()}</div>
          </div>
          <div className={`fighter-container enemy ${enemy.elevation} ${enemy.position}`}>
            {enemy.battleId
              ? <FighterSprite charId={enemy.battleId} pose={enemyPose} facing="left" scale={8} flash={flashEnemy} />
              : <CharacterSprite formId={enemyFormId} className="sheet-sprite" />}
            <div className="fighter-position-tag">{enemy.elevation.toUpperCase()}/{enemy.position.toUpperCase()}</div>
          </div>
        </div>
        {damageNums.map(dn => <DamageNumber key={dn.id} value={dn.value} type={dn.type} x={dn.x} y={dn.y} />)}
      </div>

      {/* Barra de fase */}
      <div className="phase-bar">
        <div className="phase-info">
          <span className="turn-label">{t('battle.turn')} {turn}</span>
          <span className="phase-label">
            {phase === 'position' ? t('battle.choosePosition') :
             phase === 'command' ? t('battle.selectCommand') :
             phase === 'cardSelect' ? t('battle.selectCard') :
             phase === 'enemyTurn' ? t('battle.enemyTurn') : ''}
          </span>
        </div>
        <button className="btn-exit" onClick={() => onExit(false)}><X size={12} /></button>
      </div>

      {/* Controles */}
      <div className="battle-controls">
        {phase === 'position' && (
          <div className="position-select">
            <div className="control-label">{t('battle.position')}</div>
            <div className="position-pad">
              <button onClick={() => setPosition('back', 'air')}>{t('battle.airBack')}</button>
              <button onClick={() => setPosition('front', 'air')}>{t('battle.airFront')}</button>
              <button onClick={() => setPosition('back', 'ground')}>{t('battle.gndBack')}</button>
              <button onClick={() => setPosition('front', 'ground')}>{t('battle.gndFront')}</button>
            </div>
          </div>
        )}
        {phase === 'command' && (
          <div className="command-select">
            <div className="command-strip">
              <button onClick={() => selectCommand('LIMIT')} disabled={player.cc < 20} className="cmd-limit">{t('battle.limit')}</button>
              <button onClick={() => selectCommand('J')} className="cmd-j">J</button>
              <button onClick={() => selectCommand('B')} className="cmd-b">B</button>
              <button onClick={() => selectCommand('C')} className="cmd-c">C</button>
            </div>
            <div className="command-help">{t('battle.limitHelp')}</div>
          </div>
        )}
        {phase === 'cardSelect' && (
          <HandComponent cards={hand} selectedIndex={selectedCard} onSelect={selectCard} />
        )}
        {phase === 'enemyTurn' && (
          <div className="enemy-turn-overlay"><div className="turn-text">{t('battle.enemyTurn')}</div></div>
        )}
        {phase === 'win' && (
          <div className="result-screen">
            <div className="result-title victory">{t('battle.victory')}</div>
            <div className="result-info">
              <div>LV {player.level}</div>
              <div>{t('battle.exp')} +{80 + enemy.level * 20}</div>
              <div>{t('battle.hp')} {player.hp}/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => onExit(true)}>{t('common.newBattle')}</button>
          </div>
        )}
        {phase === 'lose' && (
          <div className="result-screen">
            <div className="result-title defeat">{t('battle.defeat')}</div>
            <div className="result-info">
              <div>{t('battle.turn')} {turn}</div>
              <div>{t('battle.hp')} 0/{player.maxHp}</div>
            </div>
            <button className="btn-primary" onClick={() => onExit(false)}>{t('common.retry')}</button>
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
  const { t } = useLang();
  const [reward, setReward] = useState<number[] | null>(() => loadUnlocks().pendingReward);

  const claimReward = (cardId: number) => {
    const u = loadUnlocks();
    u.cards = [...new Set([...u.cards, cardId])];
    u.pendingReward = null;
    saveUnlocks(u);
    setReward(null);
    Sfx.confirm();
  };

  return (
    <div className="menu-screen">
      <div className="menu-bg" />
      {/* Recompensa post-batalla */}
      {reward && reward.length > 0 && (
        <div className="reward-overlay">
          <div className="reward-panel">
            <div className="reward-title">CHOOSE REWARD CARD</div>
            <div className="reward-cards">
              {reward.map(cardId => {
                const card = getCard(cardId)!;
                return (
                  <button key={cardId} className="reward-card" onClick={() => claimReward(cardId)}>
                    <img className="reward-card-img" src={`/assets/cards/icons/card_${String(cardId).padStart(3, '0')}.png`} alt="" />
                    <div className="reward-card-name">{card.name}</div>
                    <div className="reward-card-type">{CARD_TYPE_NAMES[card.type]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="menu-content">
        <h1 className="menu-title">{t('menu.title')}</h1>
        <h2 className="menu-subtitle">{t('menu.subtitle')}</h2>
        <nav className="menu-nav">
          <button onClick={() => onNavigate('story')}>{t('menu.story')}</button>
          <button onClick={() => onNavigate('versus')}>{t('menu.battle')}</button>
          <button onClick={() => onNavigate('deck')}>{t('menu.deck')}</button>
          <button onClick={() => onNavigate('characters')}>{t('menu.characters')}</button>
          <button onClick={() => onNavigate('cards')}>{t('menu.cards')}</button>
          <button onClick={() => onNavigate('settings')}>{t('menu.settings')}</button>
          <button onClick={() => onNavigate('battle')} className="btn-primary">{t('menu.continue')}</button>
        </nav>
        <div className="menu-footer">{t('menu.footer')}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STORY — Mapa de capítulos
// ═══════════════════════════════════════════════════════════

const CHAPTERS: { id: number; nameKey: TKey; descKey: TKey; enemy: string }[] = [
  { id: 1, nameKey: 'story.ch1', descKey: 'story.d1', enemy: 'piccolo_base' },
  { id: 2, nameKey: 'story.ch2', descKey: 'story.d2', enemy: 'ginyu' },
  { id: 3, nameKey: 'story.ch3', descKey: 'story.d3', enemy: 'frieza_final' },
  { id: 4, nameKey: 'story.ch4', descKey: 'story.d4', enemy: 'android_20' },
  { id: 5, nameKey: 'story.ch5', descKey: 'story.d5', enemy: 'cell_perfect' },
  { id: 6, nameKey: 'story.ch6', descKey: 'story.d6', enemy: 'buu_base' },
  { id: 7, nameKey: 'story.ch7', descKey: 'story.d7', enemy: 'buu_super' },
  { id: 8, nameKey: 'story.ch8', descKey: 'story.d8', enemy: 'buu_kid' },
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

// ═══════════════════════════════════════════════════════════
// PROGRESO — EXP y niveles (localStorage dbzlsw_progress)
// ═══════════════════════════════════════════════════════════

const PROGRESS_KEY = 'dbzlsw_progress';

interface SaveState {
  level: number;
  exp: number;
}

function loadProgress(): SaveState {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.level === 'number' && typeof p.exp === 'number') return p;
    }
  } catch { /* noop */ }
  return { level: 1, exp: 0 };
}

function saveProgress(p: SaveState) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════
// DESBLOQUEOS — cartas y personajes (localStorage dbzlsw_unlocks)
// ═══════════════════════════════════════════════════════════

interface UnlockState {
  starterDeck: 'damage' | 'beam' | null;  // mazo elegido al empezar
  characters: string[];                    // personajes desbloqueados
  cards: number[];                         // cartas desbloqueadas (ids)
  pendingReward: number[] | null;          // cartas para elegir tras ganar
}

function loadUnlocks(): UnlockState {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && Array.isArray(u.characters) && Array.isArray(u.cards)) return u;
    }
  } catch { /* noop */ }
  return { starterDeck: null, characters: [...STARTER_CHARACTERS], cards: [], pendingReward: null };
}

function saveUnlocks(u: UnlockState) {
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(u)); } catch { /* noop */ }
}

// Iniciar con un mazo: desbloquea las 20 cartas del mazo elegido
function startWithDeck(kind: 'damage' | 'beam') {
  const deck = kind === 'damage' ? STARTER_DAMAGE_DECK : STARTER_BEAM_DECK;
  const u = loadUnlocks();
  u.starterDeck = kind;
  u.cards = [...new Set([...u.cards, ...deck])];
  u.pendingReward = null;
  saveUnlocks(u);
  // El mazo de batalla por defecto pasa a ser el elegido
  try { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); } catch { /* noop */ }
}

// Cartas desbloqueadas efectivas = iniciales + por nivel
function ownedCards(u: UnlockState, level: number): Set<number> {
  const set = new Set<number>(u.cards);
  for (const c of cardsForLevel(level)) set.add(c);
  return set;
}

// Desbloquear personaje al ganarle (Versus)
function unlockCharacter(charId: string) {
  const u = loadUnlocks();
  if (!u.characters.includes(charId)) {
    u.characters = [...u.characters, charId];
    saveUnlocks(u);
    return true;
  }
  return false;
}

// Personaje desbloqueado?
function isCharacterUnlocked(charId: string): boolean {
  return loadUnlocks().characters.includes(charId);
}

// EXP necesaria para subir del nivel actual al siguiente
function expToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

// Aplicar subida de nivel: +1 punto de estadística por nivel (asignable).
// Al subir, el jugador elige qué estadística mejorar permanentemente.
// Por defecto rota: HP → STR → KI → SPD (fiel al sistema de elección manual).
function applyLevelUps(base: Fighter, level: number): Fighter {
  const gains = level - 1;
  const hpGain = Math.floor(gains / 4) * 12 + (gains % 4 >= 1 ? 12 : 0);
  const strGain = Math.floor(gains / 4) * 3 + (gains % 4 >= 2 ? 3 : 0);
  const kiGain = Math.floor(gains / 4) * 3 + (gains % 4 >= 3 ? 3 : 0);
  const spdGain = Math.floor(gains / 4) * 2;
  return {
    ...base,
    level,
    maxHp: base.maxHp + hpGain,
    hp: base.maxHp + hpGain,
    str: base.str + strGain,
    ki: base.ki + kiGain,
    spd: base.spd + spdGain,
  };
}

function StoryScreen({ onNavigate, onStartChapter }: {
  onNavigate: (s: Screen) => void; onStartChapter: (enemyFormId: string, chapterId: number) => void;
}) {
  const { t } = useLang();
  const [progress, setProgress] = useState(loadStoryProgress);
  const [selected, setSelected] = useState(1);

  const start = () => {
    const ch = CHAPTERS.find(c => c.id === selected)!;
    onStartChapter(ch.enemy, ch.id);
  };

  return (
    <div className="page-screen story-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('story.title')}</h1>
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
              <div className="chapter-icon">{unlocked ? ch.id : <Lock size={14} />}</div>
              <div className="chapter-info">
                <div className="chapter-name">{t(ch.nameKey)}</div>
                <div className="chapter-desc">{unlocked ? t(ch.descKey) : t('story.notUnlocked')}</div>
              </div>
              {unlocked && isSel && <div className="chapter-select"><ChevronRight size={14} /></div>}
            </div>
          );
        })}
      </div>
      <div className="page-footer">
        <button className="btn-primary" onClick={start} disabled={!CHAPTERS.find(c => c.id === selected)?.id}>
          {t('story.start')} {t(CHAPTERS.find(c => c.id === selected)?.nameKey ?? 'story.ch1').toUpperCase()}
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
  const { t } = useLang();
  const [selected, setSelected] = useState<string>('goku_base');

  const sel = getForm(selected)!;
  const selChar = getCharacter(sel.character)!;
  const selUnlocked = isCharacterUnlocked(selChar.id);

  return (
    <div className="page-screen characters-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('characters.title')}</h1>
        <div className="page-spacer" />
      </div>
      <div className="characters-layout">
        {/* Grid de personajes: solo desbloqueados; bloqueados con candado */}
        <div className="char-grid">
          {CHARACTERS.map(c => {
            const baseForm = getForm(c.forms[0])!;
            const active = c.id === sel.character;
            const unlocked = isCharacterUnlocked(c.id);
            if (!unlocked) {
              return (
                <div key={c.id} className="char-cell char-locked">
                  <div className="char-locked-icon"><Lock size={14} /></div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-forms">???</div>
                </div>
              );
            }
            return (
              <button key={c.id} className={`char-cell ${active ? 'active' : ''}`}
                onClick={() => setSelected(baseForm.id)}>
                <CharacterSprite formId={baseForm.id} height={64} className="char-thumb" />
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} {t('characters.forms')}</div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="char-detail">
          <div className="char-detail-header">
            <CharacterSprite formId={selected} height={160} className="char-detail-sprite" />
            <div className="char-detail-info">
              <div className="char-detail-name">{selChar.name}</div>
              <div className="char-detail-form">{t('characters.form')}: {sel.form}</div>
              <div className="char-detail-saga">{selChar.saga} {t('characters.saga')}</div>
              <div className="char-tier">{t('characters.tier')} {'★'.repeat(selChar.tier)}{'☆'.repeat(5 - selChar.tier)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-block">
            <div className="stat-row"><span>{t('attr.hp')}</span><div className="stat-bar"><div className="stat-fill hp" style={{ width: `${sel.hp / 6}%` }} /></div><b>{sel.hp}</b></div>
            <div className="stat-row"><span>{t('attr.str')}</span><div className="stat-bar"><div className="stat-fill str" style={{ width: `${sel.str / 1.2}%` }} /></div><b>{sel.str}</b></div>
            <div className="stat-row"><span>{t('attr.ki')}</span><div className="stat-bar"><div className="stat-fill ki" style={{ width: `${sel.ki / 1.2}%` }} /></div><b>{sel.ki}</b></div>
            <div className="stat-row"><span>{t('attr.spd')}</span><div className="stat-bar"><div className="stat-fill spd" style={{ width: `${sel.spd}%` }} /></div><b>{sel.spd}</b></div>
          </div>

          {/* Formas: solo las desbloqueadas (por nivel) */}
          <div className="form-select">
            {selChar.forms.map(fid => {
              const f = getForm(fid)!;
              const unlocked = isFormUnlocked(fid, loadProgress().level);
              if (!unlocked) {
                return (
                  <div key={fid} className="form-chip form-chip-locked" title={`LV ${FORM_UNLOCK_LEVELS[fid] || '?'}+`}>
                    <Lock size={8} /> {f.form}
                  </div>
                );
              }
              return (
                <button key={fid} className={`form-chip ${fid === selected ? 'active' : ''}`}
                  onClick={() => setSelected(fid)}>{f.form}</button>
              );
            })}
          </div>

          {selUnlocked && <button className="btn-primary" onClick={() => onSelectFighter(selected)}>{t('common.useInBattle')}</button>}
          {!selUnlocked && <div className="deck-warning">DEFEAT THIS FIGHTER TO UNLOCK</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DECK — Constructor de mazos
// ═══════════════════════════════════════════════════════════

const DECK_KEY = 'dbzlsw_deck';
const DEFAULT_DECK = [1, 1, 2, 2, 4, 5, 5, 6, 25, 29, 12, 7, 8, 19, 19, 16, 23, 9, 15, 11];

function loadDeck(): number[] {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (!raw) return DEFAULT_DECK;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= DECK_SIZE) return parsed;
    return DEFAULT_DECK;
  } catch { return DEFAULT_DECK; }
}

function DeckScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [deck, setDeck] = useState<number[]>(loadDeck);
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const owned = ownedCards(loadUnlocks(), loadProgress().level);

  // Persist deck on change
  useEffect(() => {
    try { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); } catch { /* noop */ }
  }, [deck]);

  const deckCounts: Record<number, number> = {};
  deck.forEach(id => { deckCounts[id] = (deckCounts[id] || 0) + 1; });

  const addCard = (card: CardDef) => {
    if (!owned.has(card.id)) return;  // solo cartas desbloqueadas
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
    (showAll || owned.has(c.id)) &&
    (filter === 'all' || c.type === filter) &&
    (search === '' || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (deckCounts[c.id] || 0) < MAX_COPIES
  );

  return (
    <div className="page-screen deck-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('deck.title')}</h1>
        <div className="deck-count">{deck.length}/{DECK_SIZE}</div>
      </div>

      <div className="deck-layout">
        {/* Colección */}
        <div className="deck-collection">
          <div className="deck-toolbar">
            <input className="deck-search" placeholder={t('deck.search')} value={search}
              onChange={e => setSearch(e.target.value)} />
            <div className="deck-owned-toggle">
              <button className={`filter-chip ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>
                OWNED
              </button>
              <button className={`filter-chip ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>
                ALL
              </button>
            </div>
            <div className="deck-filters">
              {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(tp => (
                <button key={tp} className={`filter-chip ${filter === tp ? 'active' : ''}`}
                  onClick={() => setFilter(tp)}>{tp === 'all' ? t('deck.all') : CARD_TYPE_NAMES[tp]}</button>
              ))}
            </div>
          </div>
          <div className="card-collection-grid">
            {filtered.map(card => {
              const isOwned = owned.has(card.id);
              return (
                <div key={card.id} className={isOwned ? '' : 'card-not-owned-wrap'}>
                  <CardVisual key={card.id} card={card} onClick={() => addCard(card)} small />
                  {!isOwned && <div className="card-not-owned-tag">???</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Deck actual */}
        <div className="deck-current">
          <div className="deck-current-title">{t('deck.yourDeck')}</div>
          <div className="deck-list">
            {deck.map((cardId, i) => {
              const card = getCard(cardId)!;
              return (
                <div key={i} className="deck-row">
                  <span className="deck-row-icon">{(() => { const I = TYPE_ICONS[card.type]; return <I size={14} />; })()}</span>
                  <span className="deck-row-name" style={{ color: CARD_COLORS[card.type] }}>{card.name}</span>
                  <span className="deck-row-atk">{card.atk > 0 ? `ATK ${card.atk}` : ''}</span>
                  <button className="deck-row-remove" onClick={() => removeCard(cardId)}><X size={10} /></button>
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
  const { t } = useLang();
  const prog = loadProgress();
  const [owned, setOwned] = useState<Set<number>>(() => ownedCards(loadUnlocks(), prog.level));
  const [filter, setFilter] = useState<CardType | 'all'>('all');

  const filtered = CARDS.filter(c => filter === 'all' || c.type === filter);

  return (
    <div className="page-screen cards-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('cards.title')}</h1>
        <div className="deck-count">{owned.size}/{CARDS.length}</div>
      </div>
      <div className="deck-toolbar">
        <div className="deck-filters">
          {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(tp => (
            <button key={tp} className={`filter-chip ${filter === tp ? 'active' : ''}`}
              onClick={() => setFilter(tp)}>{tp === 'all' ? t('deck.all') : CARD_TYPE_NAMES[tp]}</button>
          ))}
        </div>
      </div>
      <div className="card-collection-grid full">
        {filtered.map(card => {
          const isOwned = owned.has(card.id);
          if (!isOwned) {
            return (
              <div key={card.id} className="card card-unknown">
                <div className="card-unknown-label">{t('common.unknown')}</div>
                <div className="card-unknown-sub">{t('common.notObtained')}</div>
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
// SETTINGS (incluye selector de idioma)
// ═══════════════════════════════════════════════════════════

function SettingsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t, lang, setLang } = useLang();
  const [volume, setVolumeState] = useState(70);
  const [sfx, setSfxState] = useState(true);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [screenMode, setScreenMode] = useState<'windowed' | 'fullscreen'>('windowed');

  const setVolume = (v: number) => { setVolumeState(v); setVolume(v); };
  const setSfx = (v: boolean) => { setSfxState(v); setSfxEnabled(v); if (v) Sfx.confirm(); };

  return (
    <div className="page-screen settings-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('settings.title')}</h1>
        <div className="page-spacer" />
      </div>
      <div className="settings-list">
        {/* ── IDIOMA / LANGUAGE ── */}
        <div className="setting-row language-row">
          <span className="setting-label"><Languages size={12} /> {t('settings.language')}</span>
          <div className="language-grid">
            {LANGUAGES.map(l => (
              <button key={l.code} className={`filter-chip lang-chip ${lang === l.code ? 'active' : ''}`}
                onClick={() => { setLang(l.code); Sfx.confirm(); }}>
                <span className="lang-tag">{l.tag}</span> {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <span className="setting-label">{t('settings.bgmVolume')}</span>
          <input type="range" min={0} max={100} value={volume}
            onChange={e => setVolume(Number(e.target.value))} />
          <span className="setting-value">{volume}%</span>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t('settings.soundFx')}</span>
          <button className={`toggle ${sfx ? 'on' : ''}`} onClick={() => setSfx(!sfx)}>
            {sfx ? t('settings.on') : t('settings.off')}
          </button>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t('settings.textSpeed')}</span>
          <div className="setting-options">
            <button className={`filter-chip ${speed === 'normal' ? 'active' : ''}`} onClick={() => setSpeed('normal')}>{t('settings.normal')}</button>
            <button className={`filter-chip ${speed === 'fast' ? 'active' : ''}`} onClick={() => setSpeed('fast')}>{t('settings.fast')}</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t('settings.screen')}</span>
          <div className="setting-options">
            <button className={`filter-chip ${screenMode === 'windowed' ? 'active' : ''}`} onClick={() => setScreenMode('windowed')}>{t('settings.windowed')}</button>
            <button className={`filter-chip ${screenMode === 'fullscreen' ? 'active' : ''}`} onClick={() => setScreenMode('fullscreen')}>{t('settings.fullscreen')}</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t('settings.controls')}</span>
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
// VERSUS — Selección de batalla
// ═══════════════════════════════════════════════════════════

function VersusScreen({ onNavigate, onStartVersus }: {
  onNavigate: (s: Screen) => void; onStartVersus: (enemyFormId: string) => void;
}) {
  const { t } = useLang();
  const [selected, setSelected] = useState('vegeta_base');
  const deckSize = loadDeck().length;
  const deckValid = deckSize === DECK_SIZE;
  const unlockedChars = loadUnlocks().characters;

  const sel = getForm(selected)!;
  const selChar = getCharacter(sel.character)!;

  return (
    <div className="page-screen versus-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('versus.title')}</h1>
        <div className="page-spacer" />
      </div>
      <div className="versus-layout">
        <div className="char-grid">
          {CHARACTERS.map(c => {
            const baseForm = getForm(c.forms[0])!;
            const active = c.id === sel.character;
            const unlocked = unlockedChars.includes(c.id);
            if (!unlocked) {
              return (
                <div key={c.id} className="char-cell char-locked">
                  <div className="char-locked-icon"><Lock size={14} /></div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-forms">???</div>
                </div>
              );
            }
            return (
              <button key={c.id} className={`char-cell ${active ? 'active' : ''}`}
                onClick={() => setSelected(baseForm.id)}>
                <CharacterSprite formId={baseForm.id} height={64} className="char-thumb" />
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} {t('characters.forms')}</div>
              </button>
            );
          })}
        </div>
        <div className="char-detail">
          <div className="versus-vs">{t('versus.vs')}</div>
          <CharacterSprite formId={selected} height={160} className="char-detail-sprite" />
          <div className="char-detail-name">{selChar.name}</div>
          <div className="char-detail-form">{sel.form}</div>
          <div className="stat-block">
            <div className="stat-row"><span>{t('attr.hp')}</span><div className="stat-bar"><div className="stat-fill hp" style={{ width: `${sel.hp / 6}%` }} /></div><b>{sel.hp}</b></div>
            <div className="stat-row"><span>{t('attr.str')}</span><div className="stat-bar"><div className="stat-fill str" style={{ width: `${sel.str / 1.2}%` }} /></div><b>{sel.str}</b></div>
            <div className="stat-row"><span>{t('attr.ki')}</span><div className="stat-bar"><div className="stat-fill ki" style={{ width: `${sel.ki / 1.2}%` }} /></div><b>{sel.ki}</b></div>
            <div className="stat-row"><span>{t('attr.spd')}</span><div className="stat-bar"><div className="stat-fill spd" style={{ width: `${sel.spd}%` }} /></div><b>{sel.spd}</b></div>
          </div>
          <div className="form-select">
            {selChar.forms.map(fid => {
              const f = getForm(fid)!;
              const unlocked = isFormUnlocked(fid, loadProgress().level);
              if (!unlocked) {
                return (
                  <div key={fid} className="form-chip form-chip-locked" title={`LV ${FORM_UNLOCK_LEVELS[fid] || '?'}+`}>
                    <Lock size={8} /> {f.form}
                  </div>
                );
              }
              return (
                <button key={fid} className={`form-chip ${fid === selected ? 'active' : ''}`}
                  onClick={() => setSelected(fid)}>{f.form}</button>
              );
            })}
          </div>
          <button className="btn-primary" onClick={() => onStartVersus(selected)} disabled={!deckValid}>
            {deckValid ? t('common.fight') : `DECK ${deckSize}/${DECK_SIZE}`}
          </button>
          {!deckValid && <div className="deck-warning">DECK MUST HAVE {DECK_SIZE} CARDS</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STARTER — Elegir mazo inicial (Damage o Beam, como el GBC)
// ═══════════════════════════════════════════════════════════

function StarterScreen({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [hover, setHover] = useState<'damage' | 'beam' | null>(null);

  const choose = (kind: 'damage' | 'beam') => {
    startWithDeck(kind);
    Sfx.confirm();
    onDone();
  };

  const dmgCards = STARTER_DAMAGE_DECK.map(id => getCard(id)!).filter(Boolean);
  const beamCards = STARTER_BEAM_DECK.map(id => getCard(id)!).filter(Boolean);

  return (
    <div className="page-screen starter-screen">
      <div className="starter-bg" />
      <div className="starter-content">
        <h1 className="starter-title">CHOOSE STARTER DECK</h1>
        <div className="starter-sub">Como en el GBC: tu mazo inicial define tus primeras 20 cartas</div>
        <div className="starter-decks">
          <button className={`starter-deck-card ${hover === 'damage' ? 'hover' : ''}`}
            onMouseEnter={() => setHover('damage')} onMouseLeave={() => setHover(null)}
            onClick={() => choose('damage')}>
            <div className="starter-deck-name">PHYSICAL / DAMAGE</div>
            <div className="starter-deck-icon">👊</div>
            <div className="starter-deck-desc">Cont.Punch, Sonic Kick, Tail, Solid Shot...</div>
            <div className="starter-deck-cards">{dmgCards.map(c => c.name.slice(0, 12)).join(' · ')}</div>
          </button>
          <button className={`starter-deck-card ${hover === 'beam' ? 'hover' : ''}`}
            onMouseEnter={() => setHover('beam')} onMouseLeave={() => setHover(null)}
            onClick={() => choose('beam')}>
            <div className="starter-deck-name">ENERGY / BEAM</div>
            <div className="starter-deck-icon">💫</div>
            <div className="starter-deck-desc">Energy Wave, Kamehameha, Galick-Ho, Final Flash...</div>
            <div className="starter-deck-cards">{beamCards.map(c => c.name.slice(0, 12)).join(' · ')}</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════

function AppInner() {
  const [screen, setScreen] = useState<Screen>('main');
  const [needsStarter, setNeedsStarter] = useState(() => loadUnlocks().starterDeck === null);
  const [playerForm, setPlayerForm] = useState('goku_base');
  const [enemyForm, setEnemyForm] = useState('vegeta_base');
  const [storyChapter, setStoryChapter] = useState<number | null>(null);
  const [battleKey, setBattleKey] = useState(0);

  // Inicializar audio con el primer gesto del usuario
  useEffect(() => {
    const onFirst = () => { initAudio(); window.removeEventListener('pointerdown', onFirst); };
    window.addEventListener('pointerdown', onFirst);
    return () => window.removeEventListener('pointerdown', onFirst);
  }, []);

  const startBattle = (playerFormId?: string) => {
    if (playerFormId) setPlayerForm(playerFormId);
    setStoryChapter(null);
    setEnemyForm('vegeta_base');
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const startVersus = (enemyFormId: string) => {
    setEnemyForm(enemyFormId);
    setStoryChapter(null);
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const startChapter = (enemyFormId: string, chapterId: number) => {
    setEnemyForm(enemyFormId);
    setStoryChapter(chapterId);
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const exitBattle = (won: boolean) => {
    if (won && storyChapter) {
      const next = storyChapter + 1;
      saveStoryProgress(Math.min(next, CHAPTERS.length));
    }
    if (won && !storyChapter) {
      // Versus: desbloquear el personaje vencido + recompensa de carta
      const form = getForm(enemyForm);
      if (form) {
        const charId = VS_UNLOCKS[form.id] || form.character;
        const newlyUnlocked = unlockCharacter(charId);
        const u = loadUnlocks();
        const owned = ownedCards(u, loadProgress().level);
        const rewards = pickRewards(owned, 3);
        if (rewards.length > 0) {
          u.pendingReward = rewards;
          saveUnlocks(u);
        }
        if (newlyUnlocked) {
          // Aviso visual: se muestra en la pantalla de recompensa
          setTimeout(() => alert(`${charId.toUpperCase()} UNLOCKED!`), 300);
        }
      }
    }
    setScreen('main');
  };

  if (needsStarter) {
    return <StarterScreen onDone={() => setNeedsStarter(false)} />;
  }

  switch (screen) {
    case 'story': return <StoryScreen onNavigate={setScreen} onStartChapter={startChapter} />;
    case 'versus': return <VersusScreen onNavigate={setScreen} onStartVersus={startVersus} />;
    case 'deck': return <DeckScreen onNavigate={setScreen} />;
    case 'characters': return <CharactersScreen onNavigate={setScreen} onSelectFighter={startBattle} />;
    case 'cards': return <CardsScreen onNavigate={setScreen} />;
    case 'settings': return <SettingsScreen onNavigate={setScreen} />;
    case 'battle': return <BattleScreen key={battleKey} playerFormId={playerForm} enemyFormId={enemyForm} onExit={exitBattle} />;
    default: return <MainMenu onNavigate={setScreen} />;
  }
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

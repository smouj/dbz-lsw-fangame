/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { FORMS, CHARACTERS, getCharacter, getForm, idleSpriteUrl, statAtLevel, LIMIT_DEFAULTS, loadLimits, saveLimits } from './data/roster';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from './data/enemy_decks';
import { facingFlip, needsFlip } from './data/facing';
import { BattlePosition, POSITION_DATA, resolveRelativeDistance, isBeamVulnerable, isDamageVulnerable, attackModifier, defenseModifier, anchorFor, BATTLE_POSITIONS } from './data/positions';
import { BATTLE_PORTRAITS } from './data/battlePortraits';
import { UNLOCK_KEY, STARTER_DAMAGE_DECK, STARTER_BEAM_DECK, STARTER_CHARACTERS, cardsForLevel, pickRewards, VS_UNLOCKS, isFormUnlocked, FORM_UNLOCK_LEVELS } from './data/unlocks';
import { CARDS, CARD_COLORS, CARD_TYPE_NAMES, CardDef, CardType, DECK_SIZE, MAX_COPIES, getCard, CardEffect } from './data/cards';
import { cardIconUrl, MINI_PORTRAITS, MENU_PORTRAITS, TYPE_ICONS } from './data/icons';
import { overworldUrl } from './data/overworld';
import { panelsForChapter, type StoryPanel, characterName } from './data/storyPanels';
import { storyPortraitUrl } from './data/storyPortraits';
import { spriteManifestUrl, spriteFrameUrl, spriteDirFor } from './data/spriteManifest';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND, type BattleViewMode } from './data/scenarios';
import { GBC_NATIVE_FPS, type QteState } from './data/actionFidelity';
import { initAudio, Sfx, setSfxEnabled, setVolume } from './audio/sfx';
import { LanguageProvider, useLang } from './i18n/LanguageContext';
import { LANGUAGES, LangCode, TKey } from './i18n';
import { ArrowLeft, X, Lock, ChevronRight, Languages, Sword, Shield, BookOpen, Swords, Library, Users, Settings, Sparkles, Volume2, Zap, Gauge, Monitor, Keyboard, type LucideIcon } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// DBZ LSW Fangame — Estilo Magazine GBC Auténtico
// Sprites reales, mecánicas fieles, pixel art nítido, 10 idiomas
// ═══════════════════════════════════════════════════════════

type Screen = 'main' | 'story' | 'battle' | 'storyScene' | 'versus' | 'deck' | 'characters' | 'cards' | 'settings';
type BattlePhase = 'position' | 'command' | 'basic' | 'limitSelect' | 'cardSelect' | 'stageInput' | 'enemyTurn' | 'defend' | 'win' | 'lose';

type CommandType = 'LIMIT' | 'J' | 'B' | 'C';

interface CharManifest {
  [pose: string]: { frames: { file: string; w: number; h: number }[]; fps: number; loop: boolean };
}

type BattleSpritePose = 'idle' | 'move' | 'guard' | 'attack_fwd' | 'attack_ud' | 'hurt' | 'beam_charge' | 'beam_fire' | 'power_up';
const SPRITE_MANIFEST_CACHE = new Map<string, CharManifest>();
const SPRITE_MANIFEST_PROMISES = new Map<string, Promise<CharManifest | null>>();

const POSE_FALLBACKS: Record<BattleSpritePose, BattleSpritePose[]> = {
  idle: ['idle'],
  move: ['move', 'attack_fwd', 'idle'],
  guard: ['guard', 'idle'],
  attack_fwd: ['attack_fwd', 'move', 'idle'],
  attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  hurt: ['hurt', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'power_up', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  power_up: ['power_up', 'beam_charge', 'guard', 'idle'],
};

const OFFENSIVE_SUPPORT_EFFECTS = new Set<CardEffect>([
  'life_drain', 'knockdown_dmg', 'knockdown_min', 'gamebomb', 'candy',
  'naughty_book', 'ohko_lowacc', 'android_kill', 'damage',
]);

const DEFENSIVE_EFFECTS = new Set<CardEffect>([
  'avoid_beam', 'avoid_damage', 'avoid_damage_taiyoken', 'reduce_damage',
  'absorb_beam', 'beam_shield', 'damage_shield', 'command_cancel',
]);

function resolveManifestPose(manifest: CharManifest, pose: BattleSpritePose | string): string | null {
  const fallbacks = POSE_FALLBACKS[pose as BattleSpritePose] || [pose, 'idle'];
  return fallbacks.find(p => manifest[p]?.frames?.length > 0) || null;
}

function cardBattlePose(card: CardDef, context: 'field' | 'fx' = 'field'): BattleSpritePose {
  if (card.type === 'beam') return context === 'fx' ? 'beam_fire' : 'beam_charge';
  if (card.type === 'damage' || card.type === 'command') return 'attack_fwd';
  if (card.type === 'defense' || DEFENSIVE_EFFECTS.has(card.effect)) return 'guard';
  if (OFFENSIVE_SUPPORT_EFFECTS.has(card.effect)) return 'attack_fwd';
  return 'power_up';
}

interface Fighter {
  id: string;
  name: string;
  form: string;
  level: number;
  maxHp: number; hp: number;
  str: number; ki: number; spd: number;
  maxCc: number; cc: number;
  battlePos: BattlePosition;
  battleId?: 'goku' | 'vegeta';
  limits: string[];
}

// ─── Retratos (Sprite Database) ────────────────────────────
const PORTRAITS: Record<string, string> = MENU_PORTRAITS;

function portraitFor(charId: string, formId?: string): string | undefined {
  // Prioridad: retrato de BATALLA pixel-perfect por formId (32×24 del GBC)
  if (formId && BATTLE_PORTRAITS[formId]) return BATTLE_PORTRAITS[formId];
  return PORTRAITS[charId];
}

function miniPortraitFor(charId: string): string | undefined {
  return MINI_PORTRAITS[charId];
}

// ─── Fondos de batalla (extraídos) ────────────────────────
// Fondos REALES del GBC (ZIP del usuario, pixel-perfect 160x80):
// 13 escenarios + 1 fondo especial de acción
const BATTLE_BGS: { id: string; name: string; file: string }[] = [
  { id: 'bg1', name: 'Scenario 1', file: '/assets/backgrounds/01_battle.png' },
  { id: 'bg2', name: 'Scenario 2', file: '/assets/backgrounds/02_battle.png' },
  { id: 'bg3', name: 'Scenario 3', file: '/assets/backgrounds/03_battle.png' },
  { id: 'bg4', name: 'Scenario 4', file: '/assets/backgrounds/04_battle.png' },
  { id: 'bg5', name: 'Scenario 5', file: '/assets/backgrounds/05_battle.png' },
  { id: 'bg6', name: 'Scenario 6', file: '/assets/backgrounds/06_battle.png' },
  { id: 'bg7', name: 'Scenario 7', file: '/assets/backgrounds/07_battle.png' },
  { id: 'bg8', name: 'Scenario 8', file: '/assets/backgrounds/08_battle.png' },
  { id: 'bg9', name: 'Scenario 9', file: '/assets/backgrounds/09_battle.png' },
  { id: 'bg10', name: 'Scenario 10', file: '/assets/backgrounds/10_battle.png' },
  { id: 'bg11', name: 'Scenario 11', file: '/assets/backgrounds/11_battle.png' },
  { id: 'bg12', name: 'Scenario 12', file: '/assets/backgrounds/12_battle.png' },
  { id: 'bg13', name: 'Scenario 13', file: '/assets/backgrounds/13_battle.png' },
  { id: 'bg14', name: 'Special', file: '/assets/backgrounds/14_special_action.png' },
];

// ─── Sistema de cartas para batalla ───────────────────────
const BATTLE_DECK: CardDef[] = [
  getCard(1)!, getCard(1)!, getCard(2)!, getCard(2)!, getCard(4)!,
  getCard(5)!, getCard(5)!, getCard(6)!, getCard(25)!, getCard(29)!,
  getCard(12)!, getCard(7)!, getCard(8)!, getCard(19)!, getCard(19)!,
  getCard(16)!, getCard(23)!, getCard(9)!, getCard(15)!, getCard(11)!,
];

// ─── Animación de sprites (Sprite Database completa, 42 personajes) ───
function useSpriteAnim(formId: string, pose: string): { src: string; w: number; h: number } | null {
  const [frameIdx, setFrameIdx] = useState(0);
  const [manifest, setManifest] = useState<CharManifest | null>(() => SPRITE_MANIFEST_CACHE.get(formId) ?? null);
  const activePose = manifest ? resolveManifestPose(manifest, pose) : null;

  useEffect(() => {
    const url = spriteManifestUrl(formId);
    if (!url) { setManifest(null); return; }
    const cached = SPRITE_MANIFEST_CACHE.get(formId);
    if (cached) { setManifest(cached); return; }

    let cancelled = false;
    let promise = SPRITE_MANIFEST_PROMISES.get(formId);
    if (!promise) {
      promise = fetch(url)
        .then(r => r.ok ? r.json() as Promise<CharManifest> : null)
        .then(m => {
          if (m) SPRITE_MANIFEST_CACHE.set(formId, m);
          SPRITE_MANIFEST_PROMISES.delete(formId);
          return m;
        })
        .catch(() => {
          SPRITE_MANIFEST_PROMISES.delete(formId);
          return null;
        });
      SPRITE_MANIFEST_PROMISES.set(formId, promise);
    }
    promise.then(m => {
      if (!cancelled) setManifest(m);
    });
    return () => { cancelled = true; };
  }, [formId]);

  useEffect(() => {
    if (!manifest || !activePose) { setFrameIdx(0); return; }
    const anim = manifest[activePose];
    if (anim.frames.length <= 1) { setFrameIdx(0); return; }
    const interval = 1000 / anim.fps;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= anim.frames.length) { if (anim.loop) idx = 0; else { clearInterval(timer); return; } }
      setFrameIdx(idx);
    }, interval);
    return () => clearInterval(timer);
  }, [manifest, activePose]);

  if (!manifest || !activePose) return null;
  const anim = manifest[activePose];
  const f = anim.frames[Math.min(frameIdx, anim.frames.length - 1)];
  return { src: spriteFrameUrl(formId, f.file), w: f.w, h: f.h };
}

// ─── Sprite del luchador (animado si hay manifest; null si no) ───
function FighterSprite({ formId, pose, side, scale = 8, flash = false }: {
  formId: string; pose: string; side?: 'left' | 'right'; scale?: number; flash?: boolean;
}) {
  const anim = useSpriteAnim(formId, pose);
  if (!anim) return null;
  const px = Math.round(anim.h * scale / 8);
  const pw = Math.round(anim.w * scale / 8);
  const flip = side ? facingFlip(formId, side) : 1;
  return (
    <div className={`fighter-sprite ${flash ? 'flash' : ''}`}
      style={{ transform: `scaleX(${flip})` }}>
      <img src={anim.src} alt={formId} style={{ imageRendering: 'pixelated', width: pw, height: px }} />
    </div>
  );
}

// ─── Sprite idle recortado de un sheet auténtico ─────────
function CharacterSprite({ formId, height = 92, className = '', side }: {
  formId: string; height?: number; className?: string; side?: 'left' | 'right';
}) {
  const form = getForm(formId);
  const idle = form ? idleSpriteUrl(form) : undefined;
  if (!idle || !form) {
    return <div className={`char-sprite-missing ${className}`} style={{ height }}>?</div>;
  }
  const transform = side
    ? `scaleX(${facingFlip(formId, side)})`
    : (form.sheet && needsFlip(form.sheet) ? 'scaleX(-1)' : 'none');
  // mantener proporción: width = height * (w/h) del sprite; voltear a la derecha si el sheet lo requiere
  return (
    <img className={`char-idle-sprite ${className}`}
      src={idle}
      alt={form.character}
      style={{ height, width: 'auto', imageRendering: 'pixelated', transform }}
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
        <div className="hp-bar-text">{current}/{max}</div>
      </div>
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
      <span className="cc-value">{cc}<span className="cc-max">/{maxCc}</span></span>
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

function BattleScreen({ playerFormId, enemyFormId, storyChapter, onExit }: {
  playerFormId: string; enemyFormId: string; storyChapter: number | null; onExit: (won: boolean) => void;
}) {
  const { t } = useLang();
  const pf = getForm(playerFormId)!;
  const ef = getForm(enemyFormId)!;
  const prog = loadProgress();

  const [player, setPlayer] = useState<Fighter>(() => {
    const base: Fighter = {
      id: pf.character, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,
      level: prog.level, maxHp: pf.hp, hp: pf.hp,
      str: pf.str, ki: pf.ki, spd: pf.spd, maxCc: 999, cc: 0,
      battlePos: BattlePosition.DOWN_BACK, battleId: pf.battleId,
      limits: [],
    };
    return applyLevelUps(base, prog.level);
  });
  // Nivel IA real (spreadsheet oficial): aiLevel = (playerLevel-1)*2+1
  // El AI siempre tiene 2 upgrades por cada 1 del jugador (Hp/Str/Ki/Spd)
  const aiLevel = Math.max(1, (prog.level - 1) * 2 + 1);
  // Combates 2v2 (cap 7 Jeice&Burter, 16 16&18, 21 17&18): compañero y 2º jefe
  const teamBattle = storyChapter ? TEAM_BATTLES[storyChapter] : null;
  const [player2, setPlayer2] = useState<Fighter | null>(() => {
    if (!teamBattle?.ally) return null;
    const af = getForm(teamBattle.ally)!;
    const base: Fighter = {
      id: af.character, name: getCharacter(af.character)?.name || af.character, form: af.form,
      level: prog.level, maxHp: af.hp, hp: af.hp,
      str: af.str, ki: af.ki, spd: af.spd, maxCc: 999, cc: 0,
      battlePos: BattlePosition.DOWN_BACK, limits: [],
    };
    return applyLevelUps(base, prog.level);
  });
  const [enemy2, setEnemy2] = useState<Fighter | null>(() => {
    if (!teamBattle?.enemy2) return null;
    const ef2 = getForm(teamBattle.enemy2)!;
    const b2 = storyChapter ? STORY_AI_BOOSTS[storyChapter] : null;
    const base: Fighter = {
      id: ef2.character, name: getCharacter(ef2.character)?.name || ef2.character, form: ef2.form,
      level: aiLevel, maxHp: ef2.hp + (b2?.hp || 0), hp: ef2.hp + (b2?.hp || 0),
      str: ef2.str + (b2?.str || 0), ki: ef2.ki + (b2?.ki || 0), spd: ef2.spd + (b2?.spd || 0),
      maxCc: 999, cc: 0, battlePos: BattlePosition.DOWN_BACK, limits: [],
    };
    return base;
  });
  const [enemy, setEnemy] = useState<Fighter>(() => {
    // Story mode: stats FIJOS del jefe + su AI boost real (spreadsheet oficial)
    const boost = storyChapter ? STORY_AI_BOOSTS[storyChapter] : null;
    const base: Fighter = {
      id: ef.character, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,
      level: aiLevel, maxHp: ef.hp + (boost?.hp || 0), hp: ef.hp + (boost?.hp || 0),
      str: ef.str + (boost?.str || 0), ki: ef.ki + (boost?.ki || 0), spd: ef.spd + (boost?.spd || 0),
      maxCc: 999, cc: 0,
      battlePos: BattlePosition.DOWN_BACK, battleId: ef.battleId,
      limits: [],
    };
    // En versus: la IA escala con aiLevel=(playerLevel-1)*2+1; en story, stats fijos
    return storyChapter ? base : applyLevelUps(base, aiLevel);
  });
  const [phase, setPhase] = useState<BattlePhase>('position');
  const [turn, setTurn] = useState(1);
  // Secuencia cinematográfica de presentación (como el GBC): VS screen + READY/FIGHT
  const [intro, setIntro] = useState(true);
  // ═══ MODELO DE TURNOS (spec 20 puntos §1-2, §16): TURN → 2 EXCHANGES ═══
  // El combate NO es playerTurn/enemyTurn. Cada TURN tiene DOS exchanges:
  //   Exchange 1: firstAttacker ataca, el rival defiende
  //   Exchange 2: roles invertidos
  // La SPD efectiva se recalcula al inicio de cada TURN y fija firstAttacker
  // para TODO el turno (los cambios de SPD afectan al turno siguiente).
  const turnOwnerRef = useRef<'player' | 'enemy' | null>(null);
  const [exchangeIndex, setExchangeIndex] = useState(0);
  if (turnOwnerRef.current === null) {
    const p = getForm(playerFormId)!;
    const e = getForm(enemyFormId)!;
    turnOwnerRef.current = p.spd === e.spd ? (Math.random() < 0.5 ? 'player' : 'enemy') : p.spd > e.spd ? 'player' : 'enemy';
  }
  const [turnOwner, setTurnOwner] = useState<'player' | 'enemy'>(turnOwnerRef.current);
  // El orden del turno queda FIJO al empezar; los cambios de SPD (buffs/debuffs)
  // se aplican al recalcular en el TURN siguiente (spec §1: partida Chiaotzu).
  const speedOrderLabel = turnOwner === 'player'
    ? `${getForm(playerFormId)!.character.toUpperCase()} STRIKES FIRST`
    : `${getForm(enemyFormId)!.character.toUpperCase()} STRIKES FIRST`;
  const [bgId, setBgId] = useState('bg1');
  // ═══ DOS REPRESENTACIONES (estructura real del GBC) ═══
  // TACTICAL (OVERVIEW): fondo world_overview + sprites pequeños — selección,
  // posición, estado normal. ACTION: fondo battle_action + sprites grandes —
  // solo durante una acción (QTE, animación de ataque/beam/support).
  const [scenario] = useState(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
  const [viewMode, setViewMode] = useState<BattleViewMode>('OVERVIEW');
  const [hand, setHand] = useState<CardDef[]>(() => {
    // Mano inicial: 3 Joint aleatorias (como el GBC) + 1 robo al empezar
    const deckIds = loadDeck();
    const battleDeck = deckIds.map(id => getCard(id)).filter((c): c is CardDef => !!c);
    const shuffled = [...battleDeck].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4); // 3 iniciales + 1 robo al iniciar Attack Phase
  });
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([t('battle.start')]);
  const [damageNums, setDamageNums] = useState<{ value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number; id: number }[]>([]);
  const [playerPose, setPlayerPose] = useState('idle');
  const [enemyPose, setEnemyPose] = useState('idle');
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [flashEnemy, setFlashEnemy] = useState(false);
  // ─── POLISH: carga con skeleton, shake de impacto, fade entre vistas ───
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hitShake, setHitShake] = useState<null | 'player' | 'enemy'>(null);
  const [viewFade, setViewFade] = useState(0);
  const [phaseCue, setPhaseCue] = useState<{ id: number; title: string; sub: string } | null>(null);
  // Precarga de assets clave (sprites + fondos) con skeleton mientras tanto
  useEffect(() => {
    const urls = [
      spriteManifestUrl(playerFormId), spriteManifestUrl(enemyFormId),
      overworldUrl(playerFormId), overworldUrl(enemyFormId),
      scenario.overviewBackground, scenario.actionBackground,
    ].filter((u): u is string => !!u);
    let done = 0; let fired = false;
    const finish = () => { if (!fired) { fired = true; setLoading(false); } };
    const to = setTimeout(finish, 1600); // tope de seguridad
    urls.forEach(u => {
      const im = new Image();
      im.onload = im.onerror = () => { done++; if (done >= urls.length) { clearTimeout(to); finish(); } };
      im.src = u;
    });
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Fade suave al alternar TACTICAL ↔ ACTION
  useEffect(() => { setViewFade(v => v + 1); }, [viewMode]);
  const gbcMs = (frames: number) => Math.round((frames / GBC_NATIVE_FPS) * 1000);
  const showPhaseCue = (title: string, sub: string, next: () => void, frames = 38) => {
    setPhaseCue({ id: Date.now(), title, sub });
    window.setTimeout(() => {
      setPhaseCue(null);
      next();
    }, gbcMs(frames));
  };
  // Posición del número de daño sobre el sprite del objetivo (px relativos al campo)
  const dmgPos = (side: 'player' | 'enemy') => {
    const el = side === 'enemy' ? enemyRef.current : playerRef.current;
    const field = battlefieldRef.current;
    if (!el || !field) return { x: 70, y: 30 };
    const er = el.getBoundingClientRect();
    const fr = field.getBoundingClientRect();
    return {
      x: Math.round(er.left - fr.left + er.width / 2),
      y: Math.round(er.top - fr.top + 6),
    };
  };
  const hitImpact = (side: 'player' | 'enemy') => {
    setHitShake(side);
    // Sincronizado con el field-shake CSS (0.3s ease-in-out)
    setTimeout(() => setHitShake(null), 320);
  };
  // Stat stages reales: -3..+3 (cada stage = 8 unidades internas, como el GBC)
  const [pStages, setPStages] = useState({ str: 0, ki: 0, spd: 0, guard: 0 });
  // Buffs temporales del GBC: se desvanecen tras ~3 turnos ("fade over time")
  const [buffTurns, setBuffTurns] = useState(0);
  // Transformación en combate (cartas Sup.Saiyan): flash + aura + zoom
  const [battleTransform, setBattleTransform] = useState(0);
  useEffect(() => {
    if (!battleTransform) return;
    const tm = setTimeout(() => setBattleTransform(0), 1400);
    return () => clearTimeout(tm);
  }, [battleTransform]);
  const [eStages, setEStages] = useState({ str: 0, ki: 0, spd: 0, guard: 0 });
  const pBuffs = { str: pStages.str * 8, ki: pStages.ki * 8 };
  const eBuffs = { str: eStages.str * 8, ki: eStages.ki * 8 };
  const clampStage = (v: number) => Math.max(-3, Math.min(3, v));
  // ═══ CINEMÁTICA DE ACCIÓN GBC: atacante → habilidad → rival → campo ═══
  type CardFxStep = 'attacker' | 'travel' | 'target';
  const [cardFx, setCardFx] = useState<{ card: CardDef; side: 'player' | 'enemy'; step: CardFxStep } | null>(null);
  const cinematicTimers = useRef<number[]>([]);
  const clearCinematicTimers = () => {
    cinematicTimers.current.forEach(id => window.clearTimeout(id));
    cinematicTimers.current = [];
  };
  useEffect(() => clearCinematicTimers, []);
  // Precisión/evasión (Reading Ki / Afterimage / Lock On): flags temporales
  const [pLockOn, setPLockOn] = useState(false);
  const [pAcc, setPAcc] = useState(0);   // turnos de +30% precisión
  const [pEva, setPEva] = useState(0);   // turnos de +30% evasión
  // Guardia activa: defensa usada en el turno que mitiga el próximo ataque enemigo
  const [playerGuard, setPlayerGuard] = useState<null | { type: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel' }>(null);
  // Gather Power: PowerState real (FULL_POWER → HALF_POWER → NORMAL)
  const [powerState, setPowerState] = useState<'NORMAL' | 'HALF_POWER' | 'FULL_POWER'>('NORMAL');
  const [gatherTurns, setGatherTurns] = useState(0);
  // ── Stage Attack: QTE del GBC (espec 32 puntos, docs/ACTION_FIDELITY.md) ──
  // Ventana GLOBAL para TODA la secuencia (no un timer por input), contada en
  // FRAMES GBC (GBC_NATIVE_FPS) — nunca en setTimeout/Date.now como fuente.
  // El límite depende de la distancia táctica (front/back+ground/air).
  type StageKey = 'A' | 'B' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  type StageDistance = 'short' | 'mid' | 'long';
  interface StageQteState {
    state: QteState;
    seq: StageKey[];
    idx: number;
    correct: number;
    card: CardDef | null;
    elapsedFrames: number;
    limitFrames: number;
    recoveryFrames: number;      // frames transcurridos en la fase de recovery
    forcedFailure: string | null;
    result: 'FULL_SUCCESS' | 'SAFE_ABORT' | 'RECOVERED_SUCCESS' | 'FAILURE' | null;
  }
  // ⚠️ Timing INFERRED (HYPOTHESIS) — la tabla real debe medirse en la ROM
  // comercial USA (frame advance). Estructura correcta; valores provisionales
  // basados en la captura pública "PUSH 1.3 / 1.7" (3 Stage ≈ 102 frames GBC).
  const STAGE_TIMING_TABLE: Record<number, Record<StageDistance, number>> = {
    3: { short: 90,  mid: 102, long: 114 },
    4: { short: 84,  mid: 96,  long: 108 },
    5: { short: 78,  mid: 90,  long: 102 },
    6: { short: 72,  mid: 84,  long: 96 },
  };
  // Fases de recovery (spec §11/§30) en frames GBC — HYPOTHESIS, por medir:
  // aproximación del atacante, apertura de la ventana B, y sub-ventana central
  // donde B acierta (el original: "esperar el momento correcto").
  const RECOVERY_APPROACH_FRAMES = 24;
  const RECOVERY_WINDOW_FRAMES = 48;
  const RECOVERY_B_START = 12;
  const RECOVERY_B_END = 24;
  const [stageQte, setStageQte] = useState<StageQteState>({
    state: 'WAITING', seq: [], idx: 0, correct: 0, card: null,
    elapsedFrames: 0, limitFrames: 0, recoveryFrames: 0,
    forcedFailure: null, result: null,
  });
  // IA real del GBC (battle.shtml): ataca regularmente → gather power →
  // 5 Stage Attack → Beam/Damage → repite. No usa energy cards sin gather.
  const aiRef = useRef({ mode: 0, attacks: 0, gathered: false });
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [limits, setLimits] = useState<number[]>(() => {
    const assigned = loadLimits(playerFormId);
    return assigned.length > 0 ? assigned : LIMIT_DEFAULTS[getForm(playerFormId)?.character || ''] || [];
  });

  useEffect(() => {
    setBgId(BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)].id);
  }, []);

  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-6), msg]), []);
  const limitCards = (limits
    .map(id => getCard(id))
    .filter((c): c is CardDef => !!c));
  // limitCards con coste real: el jugador debe tener CC suficiente
  const minLimitCost = limitCards.length > 0 ? Math.min(...limitCards.map(c => c.cc)) : 0;

  // ═══ ROUND (mecánica real del GBC) ═══
  // Cada round hay UN atacante y UN defensor. El más rápido ataca primero.
  // "Each time you're the attacker, you get 3 CC" (battle.shtml).
  // ═══ Duración de presentación ACTION en frames GBC (INFERRED) ═══
  // Debe cubrir startup + sprite de carta + pose + impacto. Antes damage duraba
  // 750ms y cortaba la animación antes del lunge/impacto CSS (~900ms).
  const presentationMs = (card: CardDef): number => {
    switch (card.type) {
      case 'beam': return gbcMs(132);
      case 'damage': return gbcMs(112);
      case 'support': return gbcMs(96);
      case 'defense': return gbcMs(78);
      default: return gbcMs(104);
    }
  };

  const playCardCinematic = (card: CardDef, side: 'player' | 'enemy', onDone: () => void) => {
    clearCinematicTimers();
    const setActorPose = (pose: BattleSpritePose) => side === 'player' ? setPlayerPose(pose) : setEnemyPose(pose);
    const setTargetPose = (pose: BattleSpritePose) => side === 'player' ? setEnemyPose(pose) : setPlayerPose(pose);
    const resetActorPose = () => side === 'player' ? setPlayerPose('idle') : setEnemyPose('idle');
    const resetTargetPose = () => side === 'player' ? setEnemyPose('idle') : setPlayerPose('idle');
    const finishCinematic = () => {
      setCardFx(null);
      setViewMode('OVERVIEW');
      resetActorPose();
      resetTargetPose();
      cinematicTimers.current.push(window.setTimeout(onDone, gbcMs(1)));
    };

    setViewMode('ACTION');
    setActorPose(cardBattlePose(card, 'field'));
    setCardFx({ card, side, step: 'attacker' });

    const hasTargetCut = card.type === 'beam' || card.type === 'damage' || card.type === 'command' || OFFENSIVE_SUPPORT_EFFECTS.has(card.effect);
    const isBeamCut = card.type === 'beam';
    const isRushCut = card.type === 'damage' || card.type === 'command' || OFFENSIVE_SUPPORT_EFFECTS.has(card.effect);
    const attackerFrames = isBeamCut ? 42 : isRushCut ? 34 : 50;
    const travelFrames = isBeamCut ? 42 : isRushCut ? 24 : 0;
    const targetFrames = isBeamCut ? 38 : isRushCut ? 34 : 0;

    if (!hasTargetCut) {
      cinematicTimers.current.push(window.setTimeout(() => {
        finishCinematic();
      }, presentationMs(card)));
      return;
    }

    cinematicTimers.current.push(window.setTimeout(() => {
      setCardFx({ card, side, step: 'travel' });
      setActorPose(card.type === 'beam' ? 'beam_fire' : 'attack_fwd');
    }, gbcMs(attackerFrames)));

    cinematicTimers.current.push(window.setTimeout(() => {
      setCardFx({ card, side, step: 'target' });
      resetActorPose();
      setTargetPose(card.type === 'beam' || card.type === 'damage' ? 'hurt' : 'guard');
    }, gbcMs(attackerFrames + travelFrames)));

    cinematicTimers.current.push(window.setTimeout(() => {
      finishCinematic();
    }, gbcMs(attackerFrames + travelFrames + targetFrames)));
  };

  // ═══ EXCHANGE: la unidad central del combate (spec §3-4) ═══
  // Cada exchange tiene un ATTACKER y un DEFENDER. El atacante recibe +3 CC
  // AL ENTRAR en su Attack Phase (no al turno global); el defensor elige su
  // defensa ANTES de que se resuelva la ofensiva (no es un QTE reactivo).
  const startExchange = (attacker: 'player' | 'enemy') => {
    if (attacker === 'player') {
      const actor = getForm(playerFormId)!.character.toUpperCase();
      // +3 CC por entrar como atacante (spec §4 — battle.shtml)
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`);
      // La posición PERSISTE entre fases (spec Move): el atacante no elige
      // posición, va directo a seleccionar su acción. Robo de Joint al entrar
      // en Attack Phase (máx 6 transitorio, 5 persistente).
      setHand(prev => {
        if (prev.length >= 6) return prev;
        const deckIds = loadDeck();
        const battleDeck = deckIds.map(id => getCard(id)).filter((c): c is CardDef => !!c);
        const usedIds = new Set(prev.map(c => c.id));
        const pool = battleDeck.filter(c => !usedIds.has(c.id));
        if (pool.length === 0) return prev;
        return [...prev, pool[Math.floor(Math.random() * pool.length)]];
      });
      showPhaseCue('ATTACK PHASE', `${actor} +3 CC`, () => setPhase('command'));
    } else {
      const actor = getForm(enemyFormId)!.character.toUpperCase();
      setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`);
      showPhaseCue('ATTACK PHASE', `${actor} +3 CC`, () => enemyAttack());
    }
  };

  const enterDefensePhase = (incomingName: string) => {
    showPhaseCue('DEFENSE PHASE', incomingName.toUpperCase(), () => setPhase('defend'), 34);
  };

  // TURN_START: recalcular SPD → fijar firstAttacker → Exchange 1 (spec §1-2)
  const beginTurn = () => {
    // Decay de precisión/evasión (Reading Ki/Afterimage: 2 turnos)
    setPAcc(prev => (prev > 0 ? prev - 1 : 0));
    setPEva(prev => (prev > 0 ? prev - 1 : 0));
    // Buffs temporales: se desvanecen al agotarse (fade over time del GBC)
    setBuffTurns(prev => {
      if (prev <= 0) return 0;
      const next = prev - 1;
      if (next === 0) setPStages({ str: 0, ki: 0, spd: 0, guard: 0 });
      return next;
    });
    // Recalcular orden por SPD EFECTIVA (base + buffs/debuffs). El orden queda
    // fijado para TODO el turno; si la SPD cambió, el siguiente turno se invierte
    // (peculiaridad real del GBC: dos Attack Phases consecutivas visualmente).
    const pSpd = player.spd + pStages.spd * 8;
    const eSpd = enemy.spd + eStages.spd * 8;
    const first: 'player' | 'enemy' = pSpd === eSpd
      ? (Math.random() < 0.5 ? 'player' : 'enemy')  // speedTiePolicy: UNKNOWN (ROM)
      : pSpd > eSpd ? 'player' : 'enemy';
    turnOwnerRef.current = first;
    setTurnOwner(first);
    setExchangeIndex(0);
    startExchange(first);
  };

  // Fin de un exchange: pasar al Exchange 2 (roles invertidos) o cerrar el TURN.
  // KO_CHECK antes: si alguien murió en el exchange 1, la partida documentada no
  // permite hardcodear si el exchange 2 se cancela — lo resolvemos por flujo de KO.
  const advanceExchange = () => {
    if (exchangeIndex === 0) {
      // Exchange 2: el otro luchador ataca (spec §1)
      setExchangeIndex(1);
      const second: 'player' | 'enemy' = turnOwnerRef.current === 'player' ? 'enemy' : 'player';
      startExchange(second);
    } else {
      // TURN_END → nuevo turno: recalcular SPD y orden
      setExchangeIndex(0);
      setTurn(t => t + 1);
      beginTurn();
    }
  };

  // ═══ TECLADO FÍSICO: A/B para Stage Attacks (como el GBC pero con teclado) ═══
  const [pressedKey, setPressedKey] = useState<StageKey | null>(null);
  const [stageFeedback, setStageFeedback] = useState<'correct' | 'wrong' | null>(null);
  const fbTimer = useRef<number | null>(null);
  const flashFeedback = (type: 'correct' | 'wrong') => {
    setStageFeedback(type);
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = window.setTimeout(() => setStageFeedback(null), 300);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // no se puede repetir el input
      const k = e.key.toLowerCase();
      if (phase !== 'stageInput') return;
      // WASD + flechas para direcciones; A/B para botones GBC.
      // La interpretación depende de la tecla esperada en la secuencia:
      // si se espera una dirección, 'a'/'d'/'w'/'s' y flechas → dirección;
      // si se espera A/B, teclas a/b → botones.
      let key: StageKey | null = null;
      // PC (como el GBC): Q = botón A · E = botón B · WASD + flechas = cruceta
      if (k === 'q') key = 'A';
      else if (k === 'e') key = 'B';
      else if (k === 'w' || e.key === 'ArrowUp') key = 'UP';
      else if (k === 's' || e.key === 'ArrowDown') key = 'DOWN';
      else if (k === 'a' || e.key === 'ArrowLeft') key = 'LEFT';
      else if (k === 'd' || e.key === 'ArrowRight') key = 'RIGHT';
      if (!key) return;
      e.preventDefault();
      setPressedKey(key);
      setTimeout(() => setPressedKey(null), 120);
      const st = stageQteRef.current;
      // Recuperación: A = abandonar (Q) · B = reparar con timing (E)
      if (st.state === 'RECOVERY_APPROACH' || st.state === 'RECOVERY_WINDOW') {
        stageRecoverInput(key);
      } else {
        submitStageInput(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Arranque: primer ROUND del combate tras la intro cinematográfica (~3s)
  const startedRef = useRef(false);
  useEffect(() => {
    const tm = setTimeout(() => setIntro(false), 3100);
    return () => clearTimeout(tm);
  }, []);
  useEffect(() => {
    if (intro) return;
    if (startedRef.current) return;
    startedRef.current = true;
    beginTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro]);

  const gatherPower = () => {
    Sfx.powerUp();
    setViewMode('ACTION');
    setPowerState('FULL_POWER');
    setGatherTurns(2);
    // Gather Power (GBC): +4 STR +4 KI (COMMUNITY_TESTED; la fórmula exacta es UNKNOWN),
    // habilita Limit Deck y convierte el Basic 3 Stage → 4 Stage
    setPStages(s => ({ ...s, str: clampStage(s.str + 0.5), ki: clampStage(s.ki + 0.5) }));
    addLog(`${player.name} GATHER POWER! FULL POWER (+4 STR/KI, LIMIT DECK 2 turnos)`);
    setPlayerPose('power_up');
    // Consume la acción de ataque completa
    setTimeout(() => {
      setPlayerPose('idle');
      setViewMode('OVERVIEW');
      // Termina el turno tras Gather (acción completa consumida)
      setSelectedCard(null);
      setTimeout(() => advanceExchange(), gbcMs(36));
    }, gbcMs(58));
  };

  const selectCommand = (cmd: CommandType) => {
    Sfx.select();
    if (cmd === 'B') { setPhase('basic'); return; }
    if (cmd === 'LIMIT') { setPhase('limitSelect'); return; }
    if (cmd === 'C') {
      // CHARA: cambiar al compañero (Select Character del GBC). Consume la acción.
      if (!player2) { addLog(t('battle.noAlly')); Sfx.cancel(); return; }
      Sfx.confirm();
      const incoming = player2;
      setPlayer2(player);
      setPlayer(incoming);
      setPlayerPose('idle');
      addLog(`${incoming.name} entra al combate! (CHARA)`);
      setTimeout(() => advanceExchange(), 600);
      return;
    }
    setPhase('cardSelect');
  };

  // ═══ Stage Attack: secuencia de inputs A/B a tiempo ═══
  // La ventana de input depende de la distancia (más cerca = más tiempo)
  // Distancia táctica → clase de ventana (spec §4-5: el límite depende de la
  // posición de atacante y defensor, NO es una constante universal).
  const resolveStageDistance = (): StageDistance => {
    // Distancia derivada de las posiciones de AMBOS (spec 4 posiciones):
    // FRONT+FRONT → CLOSE (short) · BACK+BACK → FAR (long) · mixto → MID
    const dist = resolveRelativeDistance(player.battlePos, enemy.battlePos);
    if (dist === 'CLOSE') return 'short';
    if (dist === 'FAR') return 'long';
    return 'mid';
  };

  // Ref espejo para el handler de teclado (evita re-suscribir el listener).
  const stageQteRef = useRef(stageQte);
  stageQteRef.current = stageQte;
  // Transición SÍNCRONA del QTE: actualiza ref + estado a la vez. Los inputs
  // del teclado pueden llegar en el mismo frame que un setState de React (el
  // ref no se refresca hasta el próximo render); sin esto, un input rápido
  // tras otro lee estado stale y falla o se pierde.
  const commitQte = (next: StageQteState) => {
    stageQteRef.current = next;
    setStageQte(next);
  };

  // ═══ Inicio del Stage Attack: TACTICAL → CUT → ACTION VIEW (spec §2/§28) ═══
  const startStageAttack = (card: CardDef) => {
    // Etapas según la carta (3/4/5/6 Stage)
    let stages = 3;
    if (card.name.includes('4')) stages = 4;
    else if (card.name.includes('5')) stages = 5;
    else if (card.name.includes('6')) stages = 6;
    // Gather Power convierte Basic 3 Stage → 4 Stage (ya manejado en BASIC).
    // Secuencia mixta: 3 Stage = A/B puro; 4/5/6 añaden direcciones al final.
    const seq: StageKey[] = [];
    const dirs: StageKey[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const dirSlots = stages - 3; // 4S:1, 5S:2, 6S:3
    for (let i = 0; i < stages; i++) {
      if (i >= stages - dirSlots) seq.push(dirs[Math.floor(Math.random() * dirs.length)]);
      else seq.push(Math.random() < 0.5 ? 'A' : 'B');
    }
    // ⚠️ pool de inputs y generación: HYPOTHESIS (spec §21) — el original puede
    // usar un generador propio; pendiente de verificar en ROM.
    const limit = STAGE_TIMING_TABLE[stages][resolveStageDistance()];
    commitQte({
      state: 'INPUT_WINDOW', seq, idx: 0, correct: 0, card,
      elapsedFrames: 0, limitFrames: limit, recoveryFrames: 0,
      forcedFailure: null, result: null,
    });
    setViewMode('ACTION');
    setPhase('stageInput');
    Sfx.cardPlay();
  };

  // ═══ Reloj del QTE: monotónico, en FRAMES GBC (spec §19-20) ═══
  // Un único bucle rAF acumula tiempo real y lo convierte a frames GBC;
  // la lógica NUNCA depende de segundos redondeados ni setTimeout.
  useEffect(() => {
    if (phase !== 'stageInput') return;
    let raf = 0;
    let last = performance.now();
    let acc = 0; // acumulador de frames GBC
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * GBC_NATIVE_FPS;
      last = now;
      const st = stageQteRef.current;
      // El reloj corre SIEMPRE durante el QTE; la ventana empieza al instante
      if (st.state === 'INPUT_WINDOW') {
        const elapsed = Math.floor(acc);
        setStageQte(prev => ({ ...prev, elapsedFrames: Math.max(prev.elapsedFrames, elapsed) }));
        if (elapsed >= st.limitFrames) {
          // Timeout: FAILED → RECOVERY (spec §9-10)
          enterStageFailure('TIMEOUT');
        }
      } else if (st.state === 'PROMPT') {
        // Micro-presentación del prompt (1 frame) antes de abrir inputs
        setStageQte(prev => ({ ...prev, state: 'INPUT_WINDOW' }));
      } else if (st.state === 'RECOVERY_APPROACH') {
        const rf = st.recoveryFrames + 1;
        setStageQte(prev => ({ ...prev, recoveryFrames: rf }));
        // La animación de acercamiento dura un tramo; después abre la ventana B
        if (rf >= RECOVERY_APPROACH_FRAMES) {
          setStageQte(prev => ({ ...prev, state: 'RECOVERY_WINDOW', recoveryFrames: 0 }));
        }
      } else if (st.state === 'RECOVERY_WINDOW') {
        const rf = st.recoveryFrames + 1;
        setStageQte(prev => ({ ...prev, recoveryFrames: rf }));
        // Ventana de B con timing propio: fuera de ella = FAILURE definitivo
        if (rf >= RECOVERY_WINDOW_FRAMES) {
          setStageQte(prev => ({ ...prev, state: 'FAILED', result: prev.result ?? 'FAILURE' }));
          resolveStageResult();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ═══ Input correcto/incorrecto (spec §7-8: NO aplica HP por input) ═══
  const submitStageInput = (pressed: StageKey) => {
    const st = stageQteRef.current;
    if (st.state !== 'INPUT_WINDOW') return;
    const expected = st.seq[st.idx];
    if (pressed === expected) {
      // Acierto: +1 CC, avanza el cursor y la animación; NADA de daño aún.
      Sfx.confirm();
      const newCorrect = st.correct + 1;
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 1) }));
      flashFeedback('correct');
      const next = st.idx + 1;
      if (next >= st.seq.length) {
        // Secuencia completa → COMPLETE → resolver el ataque (spec §27)
        commitQte({ ...st, state: 'COMPLETE', idx: next, correct: newCorrect, result: 'FULL_SUCCESS' });
        addLog(`${player.name} completa el Stage Attack! (+${newCorrect} CC)`);
        resolveStageResult();
      } else {
        commitQte({ ...st, idx: next, correct: newCorrect });
      }
    } else {
      // Fallo: input equivocado → FAILED → RECOVERY (spec §9-11)
      flashFeedback('wrong');
      Sfx.cancel();
      addLog(`${player.name} falla un input del Stage Attack!`);
      enterStageFailure('WRONG_INPUT');
    }
  };

  // ═══ Entrada en FAILED (input malo, timeout o stopper) ═══
  const enterStageFailure = (reason: 'WRONG_INPUT' | 'TIMEOUT' | 'DEFENSE_CARD') => {
    const st = stageQteRef.current;
    if (st.state === 'FAILED' || st.state === 'RECOVERY_APPROACH' || st.state === 'RECOVERY_WINDOW') return;
    commitQte({ ...st, state: 'RECOVERY_APPROACH', recoveryFrames: 0, forcedFailure: reason === 'DEFENSE_CARD' ? 'FORESIGHT' : null });
  };

  // ═══ Recovery: A = ABANDON · B = reparar con timing (spec §11-13) ═══
  const stageRecoverInput = (pressed: StageKey) => {
    const st = stageQteRef.current;
    if (st.state !== 'RECOVERY_WINDOW') return;
    if (pressed === 'A') {
      // A: SAFE_ABORT — conserva el CC de las etapas completadas (spec §12)
      Sfx.cancel();
      addLog(`${player.name} abandona el Stage Attack (conserva +${st.correct} CC)`);
      commitQte({ ...st, state: 'ABORTED', result: 'SAFE_ABORT' });
      resolveStageResult();
    } else if (pressed === 'B') {
      // B: la ventana de reparación tiene timing propio — solo se acierta
      // dentro de una sub-ventana central (spec §11: "esperar el momento").
      if (st.recoveryFrames >= RECOVERY_B_START && st.recoveryFrames <= RECOVERY_B_END) {
        Sfx.confirm();
        addLog(`${player.name} repara el Stage Attack!`);
        commitQte({ ...st, state: 'INPUT_WINDOW', recoveryFrames: 0 });
      } else {
        // B fuera de timing → FAILURE definitivo (spec §30: una oportunidad)
        flashFeedback('wrong');
        Sfx.cancel();
        addLog(`${player.name} falla la reparación.`);
        commitQte({ ...st, state: 'FAILED', result: 'FAILURE' });
        resolveStageResult();
      }
    }
  };

  // ═══ Resolución del Stage Attack (spec §27: QTE ≠ combate) ═══
  // El daño SOLO se aplica aquí, según el resultado global:
  //   FULL_SUCCESS / RECOVERED_SUCCESS → daño completo
  //   SAFE_ABORT → daño parcial (espec §13: valor exacto sin fijar → 0 por ahora)
  //   FAILURE → sin daño (los golpes visuales previos no quitan HP)
  const resolveStageResult = () => {
    const st = stageQteRef.current;
    if (st.card == null) return;
    const card = st.card;
    const complete = st.result === 'FULL_SUCCESS' || st.result === 'RECOVERED_SUCCESS';
    const ccGained = st.correct;

    setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, card: null, elapsedFrames: 0, limitFrames: 0, recoveryFrames: 0, forcedFailure: null, result: null });
    setViewMode('OVERVIEW');
    setPhase('cardSelect');
    setTimeout(() => {
      if (complete) {
        const pPos = player.battlePos;
        const ePos = enemy.battlePos;
        const vulnerable = (isBeamVulnerable(pPos) && card.type === 'beam') || (isDamageVulnerable(pPos) && card.type === 'damage');
        const posMult = (POSITION_DATA[ePos].depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
        const dmg = Math.floor((card.atk + player.str) * posMult);
        setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
        setFlashEnemy(true);
        hitImpact('enemy');
        setDamageNums(prev => [...prev, { value: dmg, type: 'damage', ...dmgPos('enemy'), id: Date.now() }]);
        addLog(`${player.name} → ${card.name} — ${dmg} ${t('battle.dmg')}`);
        Sfx.hit();
        setTimeout(() => setFlashEnemy(false), 150);
        if (enemy.hp - dmg <= 0 && enemy2) {
          const fallen = enemy.name;
          const next = enemy2;
          setEnemy(next);
          setEnemy2(null);
          setEnemyPose('idle');
          addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
          setTimeout(() => finishPlayerTurnStage(ccGained), 900);
          return;
        }
        if (enemy.hp - dmg <= 0) {
          setTimeout(() => { setEnemyPose('hurt'); setPhase('win'); Sfx.victory(); addLog(`${enemy.name} ${t('battle.defeated')}`); }, 500);
          return;
        }
      } else {
        // SAFE_ABORT / FAILURE: sin daño de HP (spec §7/§13); el CC ganado se conserva
        addLog(`${player.name} no completa el ataque (${ccGained} CC ganados)`);
      }
      setTimeout(() => {
        finishPlayerTurnStage(ccGained);
      }, 500);
    }, gbcMs(1));
  };

  // Variante de finishPlayerTurn para stage attacks (no usar carta de la mano)
  const finishPlayerTurnStage = (ccGained: number) => {
    setSelectedCard(null);
    setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, card: null, elapsedFrames: 0, limitFrames: 0, recoveryFrames: 0, forcedFailure: null, result: null });
    setViewMode('OVERVIEW');
    setTimeout(() => advanceExchange(), 600);
  };

  const selectCard = (idx: number) => {
    const card = hand[idx];
    setSelectedCard(idx);

    // Economía real: las cartas CUESTAN CC ("may or may not reduce your CC")
    if (player.cc < card.cc) {
      addLog(`${t('battle.insufficientCc')} (${card.name} ${card.cc} CC)`);
      Sfx.cancel();
      setSelectedCard(null);
      return;
    }

    // Stage Attack (command): secuencia de inputs A/B a tiempo
    if (card.type === 'command' && card.effect.startsWith('command_')) {
      // Pagar coste (las command cards también cuestan CC)
      setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
      startStageAttack(card);
      return;
    }

    Sfx.cardPlay();
    playCardCinematic(card, 'player', () => {
      resolveCardPlay(card, false, idx);
    });
  };

  // Resolución de una carta JOINT o LIMITED (misma mecánica; solo cambia la mano)
  const resolveCardPlay = (card: CardDef, isLimit: boolean, handIdx: number) => {
    const endTurn = () => {
      if (isLimit) { setSelectedCard(null); setTimeout(() => advanceExchange(), 600); }
      else finishPlayerTurn(handIdx);
    };
    setTimeout(() => {
      let damage = 0;
      let hitType: 'damage' | 'miss' | 'guard' = 'damage';
      let heal = 0;
      const acc = card.acc / 100;
      const roll = Math.random();

      // Support/Defensa: curar, buff, debuff, escudos, cancelar comando, etc.
      const supEffects = ['heal_25pct','heal_strong','heal_light','buff_kaio','buff_ki8','buff_str8','buff_speed8','buff_guard8','buff_str_ki8','debuff_str8','debuff_ki8','debuff_speed8','debuff_speed8_lowacc','debuff_guard8','attack_power_down','powerup_dispel','support_dispel','powerdown_cleanse','avoid_beam','avoid_damage','avoid_damage_taiyoken','reduce_damage','absorb_beam','command_cancel','accuracy_up','evasion_up','knockdown_dmg','knockdown_min','life_drain','cc_recovery','lock_on','sunglasses','beam_shield','damage_shield','ohko_lowacc','android_kill','special_card','gamebomb','candy','naughty_book'];
      if (card.type === 'support' || card.type === 'defense' || card.type === 'special' || supEffects.includes(card.effect)) {
        const eff = card.effect;
        // Curación
        if (eff === 'heal_25pct' || eff === 'heal_strong' || eff === 'heal_light') {
          // Dende = MaxHP/4 + MaxHP/3 en offense (CONFIRMED_MANUAL); Resurrection = 25%
          const pct = eff === 'heal_strong' ? (1 / 4 + 1 / 3) : eff === 'heal_light' ? 0.3 : 0.25;
          heal = Math.floor(player.maxHp * pct);
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
          setDamageNums(prev => [...prev, { value: heal, type: 'heal', ...dmgPos('player'), id: Date.now() }]);
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — +${heal} ${t('battle.hp')}!`);
        } else if (eff === 'medical_machine') {
          // Medical Machine: Power + (Speed/2 * phase). Sin phase en nuestro engine:
          // HYPOTHESIS — card.atk + floor(SPD/2 * 4). La fase exacta es UNKNOWN.
          heal = card.atk + Math.floor(player.spd / 2) * 4;
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
          setDamageNums(prev => [...prev, { value: heal, type: 'heal', ...dmgPos('player'), id: Date.now() }]);
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — +${heal} ${t('battle.hp')}!`);
        } else if (eff === 'life_drain') {
          // roba vida: daño + cura
          const drain = Math.floor((card.atk + player.str) * 0.5);
          setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - drain) }));
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + drain) }));
          setDamageNums(prev => [...prev, { value: drain, type: 'damage', ...dmgPos('enemy'), id: Date.now() }]);
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${drain} ${t('battle.dmg')} (+${drain} HP)`);
        } else if (eff === 'cc_recovery') {
          const gain = card.id === 97 ? 5 : 3;
          setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + gain) }));
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — +${gain} CC!`);
        } else if (eff === 'avoid_beam' || eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'reduce_damage' || eff === 'absorb_beam' || eff === 'beam_shield' || eff === 'damage_shield' || eff === 'command_cancel') {
          // Activar guardia: mitiga el próximo ataque enemigo (persistente hasta usarse)
          const gType: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel' =
            eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'damage_shield' ? 'avoid_damage'
            : eff === 'absorb_beam' || eff === 'beam_shield' ? 'absorb'
            : eff === 'reduce_damage' ? 'reduce'
            : eff === 'command_cancel' ? 'cancel'
            : 'avoid_beam';
          setPlayerGuard({ type: gType });
          const label = gType === 'avoid_beam' ? 'BEAM GUARD' : gType === 'avoid_damage' ? 'DAMAGE GUARD' : gType === 'absorb' ? 'ABSORB' : 'ENDURANCE';
          addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${label}!`);
        } else if (eff === 'ohko_lowacc' || eff === 'android_kill') {
          // OHKO con baja precisión
          if (Math.random() < card.acc / 100) {
            setEnemy(prev => ({ ...prev, hp: 0 }));
            setDamageNums(prev => [...prev, { value: 999, type: 'damage', ...dmgPos('enemy'), id: Date.now() }]);
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — OHKO!`);
            setTimeout(() => { setEnemyPose('hurt'); setPhase('win'); Sfx.victory(); addLog(`${enemy.name} ${t('battle.defeated')}`); }, 500);
            return;
          } else {
            addLog(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
          }
        } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff === 'accuracy_up' || eff === 'evasion_up' || eff === 'lock_on' || eff === 'powerup_dispel' || eff === 'support_dispel' || eff === 'powerdown_cleanse' || eff === 'knockdown_dmg' || eff === 'knockdown_min' || eff === 'attack_power_down' || eff === 'sunglasses' || eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'special_card') {
          // Buffs +8, debuffs -8, otros efectos de estado
          if (eff.startsWith('buff_')) setBuffTurns(3);
          // Transformación real (Sup.Saiyan-2/3): secuencia cinematográfica
          if (card.id === 27 || card.id === 28) {
            Sfx.transform();
            setBattleTransform(Date.now());
            addLog(`${player.name} ${t('battle.powerOn')}!`);
          }
          if (eff === 'buff_ki8' || eff === 'buff_str_ki8') setPStages(s => ({ ...s, ki: clampStage(s.ki + 1) }));
          if (eff === 'buff_str8' || eff === 'buff_str_ki8') setPStages(s => ({ ...s, str: clampStage(s.str + 1) }));
          if (eff === 'buff_speed8') setPStages(s => ({ ...s, spd: clampStage(s.spd + 1) }));
          if (eff === 'buff_guard8') setPStages(s => ({ ...s, guard: clampStage(s.guard + 1) }));
          if (eff === 'buff_kaio') setPStages(s => ({ ...s, str: clampStage(s.str + 2), ki: clampStage(s.ki + 2) }));
          // Debuffs específicos (antes restaban STR/KI siempre — BUG): cada stat real
          if (eff === 'debuff_str8') setEStages(s => ({ ...s, str: clampStage(s.str - 1) }));
          if (eff === 'debuff_ki8') setEStages(s => ({ ...s, ki: clampStage(s.ki - 1) }));
          if (eff === 'debuff_speed8' || eff === 'debuff_speed8_lowacc') setEStages(s => ({ ...s, spd: clampStage(s.spd - 1) }));
          if (eff === 'debuff_guard8') setEStages(s => ({ ...s, guard: clampStage(s.guard - 1) }));
          // Babidi/Yakon: eliminan TODAS las mejoras enemigas (RESET_BUFFS)
          if (eff === 'powerup_dispel') {
            setEStages({ str: 0, ki: 0, spd: 0, guard: 0 });
            addLog(`${card.name}: mejoras del enemigo eliminadas!`);
          }
          // Yakon (95): además TERMINA el Gather Power enemigo (END_GATHER)
          if (card.id === 95) {
            aiRef.current.mode = 0; aiRef.current.gathered = false;
            addLog(`${card.name}: el poder de ${enemy.name} se disipa!`);
          }
          // Lock On: el próximo ataque no puede fallar (CONFIRMED_MANUAL)
          if (eff === 'lock_on') setPLockOn(true);
          // Reading Ki: +30% precisión 2 turnos · Afterimage: +30% evasión 2 turnos
          if (eff === 'accuracy_up') setPAcc(2);
          if (eff === 'evasion_up') setPEva(2);
          if (eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'knockdown_dmg' || eff === 'knockdown_min') {
            const dmg = Math.floor((card.atk || 20) + player.str);
            setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
            setDamageNums(prev => [...prev, { value: dmg, type: 'damage', ...dmgPos('enemy'), id: Date.now() }]);
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${dmg} ${t('battle.dmg')}`);
          } else {
            addLog(`${player.name} ${t('battle.uses')} ${card.name} — ${t('battle.buff')}`);
          }
        }
        setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
        endTurn();
        return;
      }

      // Lock On: ataque asegurado (se consume) · Reading Ki: +30% precisión
      const effAcc = pAcc > 0 ? Math.min(100, acc + 30) : acc;
      if (roll > effAcc && !pLockOn) {
        hitType = 'miss';
        addLog(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
      } else {
        if (pLockOn) { setPLockOn(false); addLog('LOCK ON!'); }
        // Respuesta del defensor (enemigo): 55% DEFEND (block ×0.5) / 45% MOVE
        // (el defensor del GBC solo puede defenderse o moverse)
        const eResp = Math.random() < 0.55 ? 'defend' : 'move';
        let ePos = enemy.battlePos;
        if (eResp === 'move') {
          // La IA elige entre las 4 posiciones tácticas (spec 4 posiciones)
          ePos = BATTLE_POSITIONS[Math.floor(Math.random() * BATTLE_POSITIONS.length)];
          setEnemy(prev => ({ ...prev, battlePos: ePos }));
        }
        // Fórmula REAL del GBC: Damage = (power + move) × positionMultiplier × block
        // power = STR (damage) o KI (beam) · move = poder de la carta
        // positionMultiplier real (test ROM): front vulnerable = 0.8, resto = 0.5
        const power = card.type === 'beam' ? player.ki + pBuffs.ki : player.str + pBuffs.str;
        const ePd = POSITION_DATA[ePos];
        const vulnerable = (isBeamVulnerable(ePos) && card.type === 'beam') || (isDamageVulnerable(ePos) && card.type === 'damage');
        const posMult = (ePd.depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
        damage = Math.floor((card.atk + power) * posMult);
        if (eResp === 'defend') {
          // Basic Guard del enemigo: mismo sistema HIT/BLOCK/AVOID
          const spdDef = enemy.spd + eStages.spd * 8;
          const avoidChance = Math.max(0.05, Math.min(0.35, 0.05 + (spdDef - 25) * 0.004 + (100 - card.acc) * 0.002));
          const gRoll = Math.random();
          if (gRoll < avoidChance) {
            damage = 0; hitType = 'guard';
            addLog(`${enemy.name} AVOID! (0 ${t('battle.dmg')})`);
          } else if (gRoll < avoidChance + 0.55) {
            damage = Math.floor(damage * 0.25);
            hitType = 'guard';
            addLog(`${enemy.name} BLOCK — ${damage} ${t('battle.dmg')}`);
          } else {
            addLog(`${enemy.name} ${t('battle.defends')} — ${damage} ${t('battle.dmg')}`);
          }
        } else {
          addLog(`${player.name} → ${card.name} — ${damage} ${t('battle.dmg')}`);
        }
      }

      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
      setFlashEnemy(true);
      hitImpact('enemy');
      if (card.type === 'beam') Sfx.beam();
      else if (damage > 0) Sfx.hit();
      else if (hitType === 'miss') Sfx.dodge();
      setTimeout(() => setFlashEnemy(false), 150);

      if (damage > 0) setDamageNums(prev => [...prev, { value: damage, type: 'damage', ...dmgPos('enemy'), id: Date.now() }]);
      else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('enemy'), id: Date.now() }]);

      // Coste real de la carta (JOINT)
      setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));

      if (enemy.hp - damage <= 0 && enemy2) {
        // 2v2: cae el primer jefe, entra el segundo (mecánica real del GBC)
        const fallen = enemy.name;
        const next = enemy2;
        setEnemy(next);
        setEnemy2(null);
        setEnemyPose('idle');
        setFlashEnemy(false);
        addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
        setTimeout(() => endTurn(), 900);
        return;
      }
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

      setTimeout(() => endTurn(), 700);
    }, 350);
  };

  // ─── BASIC: acciones gratuitas del GBC (no cuestan CC) ───
  const basicAction = (action: 'gather' | 'stage' | 'guard') => {
    if (action === 'gather') { gatherPower(); return; }
    if (action === 'guard') {
      Sfx.select();
      setPlayerPose('guard');
      setPlayerGuard({ type: 'reduce' });
      addLog(`${player.name} ${t('battle.defends')} (ENDURANCE — próximo golpe a la mitad)`);
      setTimeout(() => { setPlayerPose('idle'); advanceExchange(); }, gbcMs(32));
      return;
    }
    // Stage Attack básico: 3 etapas (4 si se ha gathered — mecánica real)
    const stages = powerState !== 'NORMAL' ? 4 : 3;
    const basicCard: CardDef = {
      id: -1,
      name: stages === 4 ? '4 Stage Atk.' : '3 Stage Atk.',
      type: 'command',
      effect: 'command_3',
      atk: 12,
      acc: 100,
      cc: 0,
      rarity: 1,
    };
    startStageAttack(basicCard);
  };

  // ─── LIMITED CARDS (L): reutilizables, cuestan CC, no salen de la mano ───
  const playLimit = (card: CardDef) => {
    if (player.cc < card.cc) {
      addLog(`${t('battle.insufficientCc')} (${card.name} ${card.cc} CC)`);
      Sfx.cancel();
      return;
    }
    if (card.type === 'command' && card.effect.startsWith('command_')) {
      setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
      startStageAttack(card);
      return;
    }
    Sfx.cardPlay();
    setSelectedCard(null);
    playCardCinematic(card, 'player', () => {
      resolveCardPlay(card, true, -1);
    });
  };

  const finishPlayerTurn = (idx: number) => {
    const newHand = [...hand];
    // La carta usada desaparece de la mano (JOINT)
    newHand.splice(idx, 1);
    // Reponer con carta del deck si no llegamos al robo del próximo turno
    if (newHand.length < 5) {
      const deckIds = loadDeck();
      const battleDeck = deckIds.map(id => getCard(id)).filter((c): c is CardDef => !!c);
      const usedIds = new Set(newHand.map(c => c.id));
      const pool = battleDeck.filter(c => !usedIds.has(c.id));
      if (pool.length > 0) newHand.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    // Descartar hasta 5 (mano persistente)
    const finalHand = newHand.slice(0, 5);
    setHand(finalHand);
    setSelectedCard(null);
    setTimeout(() => advanceExchange(), 600);
  };

  // ═══ ENEMY ATTACK: IA real del GBC (battle.shtml) ═══
  // Patrón: ataca regularmente → gather power → 5 Stage Attack → Beam/Damage → repite.
  // Rara vez usa energy cards sin haber gathered power.
  const incomingCard = useRef<CardDef | null>(null);

  const enemyAttack = () => {
    setPhase('enemyTurn');
    setEnemyPose('idle');
    const ai = aiRef.current;
    // El enemigo elige posición al atacar (frente/suelo la mayoría de veces)
    const posRoll = Math.random();
    // La IA elige su posición de ataque entre las 4 tácticas (frecuencia
    // orientada a DOWN_FRONT/DOWN_BACK como el GBC: la mayoría en el suelo)
    const ePos: BattlePosition =
      posRoll < 0.35 ? BattlePosition.DOWN_FRONT
      : posRoll < 0.65 ? BattlePosition.DOWN_BACK
      : posRoll < 0.85 ? BattlePosition.UP_FRONT
      : BattlePosition.UP_BACK;
    setEnemy(prev => ({ ...prev, battlePos: ePos }));
    setTimeout(() => {
      // Mazo REAL del jefe en story mode (spreadsheet oficial); en versus, pool global
      const storyDeck = storyChapter ? (STORY_ENEMY_DECKS[storyChapter] || []).map(id => getCard(id)).filter((c): c is CardDef => !!c) : [];
      const allPool = storyDeck.length > 0 ? storyDeck : CARDS;
      const attackCards = allPool.filter(c => (c.type === 'damage' || c.type === 'beam') && !c.compatible);
      // IA a HP bajo: si tiene carta de curación en su mazo, se cura (HYPOTHESIS —
      // el algoritmo real de decisión es P0 ROM, pero el manual confirma que la IA
      // puede usar support cards; el deck determina qué puede hacer)
      if (enemy.hp < enemy.maxHp * 0.25) {
        const heals = allPool.filter(c => c.type === 'support' && (c.effect.startsWith('heal_')));
        if (heals.length > 0) {
          const h = heals[0];
          const pct = h.effect === 'heal_strong' ? (1 / 4 + 1 / 3) : h.effect === 'heal_light' ? 0.3 : 0.25;
          const healed = Math.floor(enemy.maxHp * pct);
          setEnemy(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + healed) }));
          setEnemyPose('power_up');
          addLog(`${enemy.name} ${t('battle.uses')} ${h.name} — +${healed} HP!`);
          setTimeout(() => { setEnemyPose('idle'); advanceExchange(); }, gbcMs(58));
          return;
        }
      }
      // Stage Attacks GRATIS (cc 0) del pool: la IA los usa cuando no tiene CC
      const freeStages = allPool.filter(c => c.type === 'command' && c.cc === 0 && c.name.includes('Stage'));
      let card: CardDef;
      if (ai.mode === 1) {
        // Gather Power: no ataca, sube STR/KI (mecánica real)
        Sfx.powerUp();
        setEStages(s => ({ ...s, str: clampStage(s.str + 1), ki: clampStage(s.ki + 1) }));
        setEnemyPose('power_up');
        addLog(`${enemy.name} ${t('battle.gathers')}! (+8 STR/KI)`);
        ai.mode = 2;
        setTimeout(() => { setEnemyPose('idle'); advanceExchange(); }, gbcMs(58));
        return;
      }
      const affordable = attackCards.filter(c => c.cc <= enemy.cc);
      if (affordable.length === 0 && freeStages.length > 0) {
        // Sin CC: la IA hace un Stage Attack básico (gratis, +1 CC por input en el GBC)
        card = freeStages[Math.floor(Math.random() * freeStages.length)];
        incomingCard.current = card;
        addLog(`${enemy.name} ${t('battle.uses')} ${card.name}`);
        setTimeout(() => enterDefensePhase(card.name), gbcMs(22));
        return;
      }
      if (ai.mode === 2) {
        // 5 Stage Attack tras gather (patrón real)
        const fiveStage = CARDS.filter(c => c.type === 'command' && /5/i.test(c.name) && c.cc <= enemy.cc);
        card = fiveStage.length > 0 ? fiveStage[Math.floor(Math.random() * fiveStage.length)]
          : affordable.find(c => c.type === 'beam') || attackCards[Math.floor(Math.random() * attackCards.length)];
        ai.mode = 3;
      } else if (ai.mode === 3) {
        // Beam/Damage tras el 5-stage → vuelve al inicio del patrón
        const beams = affordable.filter(c => c.type === 'beam');
        card = beams.length > 0 ? beams[Math.floor(Math.random() * beams.length)]
          : affordable[Math.floor(Math.random() * affordable.length)] || attackCards[Math.floor(Math.random() * attackCards.length)];
        ai.mode = 0; ai.attacks = 0;
      } else {
        // Modo 0: ataque regular (Damage preciso) — rara vez energy cards
        ai.attacks++;
        const accurate = affordable.filter(c => c.type === 'damage' && c.acc >= 85);
        card = accurate.length > 0 ? accurate[Math.floor(Math.random() * accurate.length)]
          : affordable[Math.floor(Math.random() * affordable.length)] || attackCards[Math.floor(Math.random() * attackCards.length)];
        if (ai.attacks >= 2) ai.mode = 1;
      }
      incomingCard.current = card;
      addLog(`${enemy.name} ${t('battle.uses')} ${card.name}`);
      playCardCinematic(card, 'enemy', () => {
        enterDefensePhase(card.name);
      });
    }, 450);
  };

  // ═══ DEFENSE PHASE (spec corregida): el defensor NO está limitado a
  // Guard/Move — BASIC (Defense | Move) + JOINT (solo Defense/Support) +
  // LIMIT (defensivas/Support si powered). Las ofensivas (Command/Damage/
  // Beam) quedan bloqueadas durante Defense.
  const [defendMenu, setDefendMenu] = useState<'basic' | 'joint' | 'limit' | 'move' | null>(null);

  const defendBasic = (choice: 'defense' | 'move', pos?: BattlePosition) => {
    setPhase('enemyTurn'); // desmonta el menú YA (evita doble disparo)
    const card = incomingCard.current || CARDS[25];
    if (choice === 'move' && pos) {
      // BASIC → MOVE: gasta la elección defensiva, cambia posición persistente
      Sfx.position();
      setPlayerPose('move');
      setPlayer(prev => ({ ...prev, battlePos: pos! }));
      const pd = POSITION_DATA[pos];
      addLog(`${player.name} MOVE → ${pd.altitude}/${pd.depth} (${pos})`);
      resolveEnemyAttack(true, pos, card);
    } else {
      // BASIC → DEFENSE: quedarse y defender (reduce daño)
      setPlayerPose('guard');
      setPlayerGuard({ type: 'reduce' });
      addLog(`${player.name} ${t('battle.defends')} (−50% ${t('battle.dmg')})`);
      resolveEnemyAttack(true, player.battlePos, card);
    }
  };

  // JOINT durante Defense: solo cartas DEFENSE y SUPPORT (spec defensa)
  const defendJoint = (card: CardDef, handIdx: number) => {
    // Economía real: las cartas JOINT CUESTAN CC también en defensa
    if (player.cc < card.cc) {
      addLog(`${t('battle.insufficientCc')} (${card.name} ${card.cc} CC)`);
      Sfx.cancel();
      return;
    }
    setPhase('enemyTurn');
    setSelectedCard(null);
    const newHand = [...hand];
    newHand.splice(handIdx, 1);
    setHand(newHand);
    setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    setDefendMenu(null);
    resolveDefenseCard(card, handIdx);
  };

  // LIMIT durante Defense: solo Limits DEFENSE/SUPPORT y solo si powered
  const defendLimit = (card: CardDef) => {
    if (player.cc < card.cc) return;
    setPhase('enemyTurn');
    setDefendMenu(null);
    setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    resolveDefenseCard(card, -1);
  };

  // Resolver una carta defensiva/support del JOINT contra el ataque enemigo
  const resolveDefenseCard = (card: CardDef, _handIdx: number) => {
    setPlayerPose(cardBattlePose(card, 'field'));
    const cardIncoming = incomingCard.current || CARDS[25];
    const eff = card.effect;
    let damage = 0;
    let hitType: 'damage' | 'miss' | 'guard' = 'guard';
    const acc = pEva > 0 ? Math.max(0, cardIncoming.acc - 30) : cardIncoming.acc;
    const hits = Math.random() <= acc / 100;
    const power = cardIncoming.type === 'beam' ? enemy.ki + eBuffs.ki : enemy.str + eBuffs.str;
    const pPos = player.battlePos;
    const vulnerable = (isBeamVulnerable(pPos) && cardIncoming.type === 'beam') || (isDamageVulnerable(pPos) && cardIncoming.type === 'damage');
    const posMult = (POSITION_DATA[pPos].depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
    damage = Math.floor((cardIncoming.atk + power) * posMult);
    const handleDamage = (mult: number, label: string) => {
      if (!hits) {
        damage = 0; hitType = 'miss';
        addLog(`${enemy.name} → ${cardIncoming.name} — ${t('battle.miss')}!`);
      } else {
        damage = Math.floor(damage * mult);
        hitType = 'guard';
        addLog(`${player.name} ${label} — ${damage} ${t('battle.dmg')}`);
      }
    };
    // Guardias reales del GBC (defensa anticipada contra la acción que viene)
    if (eff === 'beam_shield') {
      handleDamage(cardIncoming.type === 'beam' ? 0 : 1, 'KIBITO — beam absorbido');
      if (cardIncoming.type === 'beam') damage = 0;
    } else if (eff === 'knockdown_dmg') {
      handleDamage(0.25, 'CHOQUE — bloquea');
    } else if (eff.startsWith('heal_')) {
      const pct = eff === 'heal_strong' ? (1/4 + 1/3) : eff === 'heal_light' ? 0.3 : 0.25;
      const healed = Math.floor(player.maxHp * pct);
      setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + healed) }));
      setDamageNums(prev => [...prev, { value: healed, type: 'heal', ...dmgPos('player'), id: Date.now() }]);
      addLog(`${player.name} usa ${card.name} — +${healed} HP!`);
      handleDamage(0.5, 'DEFIENDE');
    } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff.startsWith('powerup_')) {
      handleDamage(0.5, 'DEFIENDE');
      addLog(`${player.name} usa ${card.name} (efecto activo)`);
    } else if (eff === 'lock_on') {
      handleDamage(0.25, 'BLOQUEA');
    } else {
      // Carta defensiva genérica (Endurance/Avoiding/Afterimage...)
      handleDamage(0.25, 'BLOQUEA');
    }
    if (damage > 0) {
      const substantial = damage >= player.maxHp * 0.15;
      const gain = substantial ? 2 : 1;
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + gain), hp: Math.max(0, prev.hp - damage) }));
      addLog(`${player.name} +${gain} CC (${t('battle.hp')} bajo)`);
      setFlashPlayer(true); hitImpact('player');
      setPlayerPose('hurt');
      if (cardIncoming.type === 'beam') Sfx.beam(); else Sfx.punch();
      setTimeout(() => setFlashPlayer(false), 150);
    } else {
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - 0) }));
      if (hitType === 'guard') setDamageNums(prev => [...prev, { value: 0, type: 'guard', ...dmgPos('player'), id: Date.now() }]);
      else setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('player'), id: Date.now() }]);
    }
    setEnemy(prev => ({ ...prev, cc: Math.max(0, prev.cc - cardIncoming.cc) }));
    _finishDefenseResolution();
  };

  // Cierre común de la resolución defensiva (KO / cambio de fase)
  const _finishDefenseResolution = () => {
    if (player.hp <= 0 && player2) {
      const fallen = player.name;
      const next = player2;
      setPlayer2(null);
      setPlayer(next);
      setPlayerPose('idle');
      setFlashPlayer(false);
      addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
      setTimeout(() => { setEnemyPose('idle'); setSelectedCard(null); advanceExchange(); }, 900);
      return;
    }
    if (player.hp <= 0) {
      setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); Sfx.defeat(); addLog(`${player.name} ${t('battle.defeated')}`); }, 500);
      return;
    }
    setTimeout(() => {
      setPlayerPose('idle'); setEnemyPose('idle');
      setSelectedCard(null);
      if (gatherTurns > 0) {
        setGatherTurns(g => g - 1);
        setPowerState(prev => prev === 'FULL_POWER' ? 'HALF_POWER' : prev === 'HALF_POWER' ? 'NORMAL' : prev);
      }
      advanceExchange();
    }, 400);
  };

  const resolveEnemyAttack = (defended: boolean, pos: BattlePosition, card: CardDef) => {
    setPlayer(prev => ({ ...prev, battlePos: pos }));
    const pd = POSITION_DATA[pos];
    let damage = 0;
    let hitType: 'damage' | 'miss' | 'guard' = 'damage';
    const effAcc = pEva > 0 ? Math.max(0, card.acc - 30) : card.acc;
    if (Math.random() > effAcc / 100) {
      hitType = 'miss';
      addLog(`${enemy.name} → ${card.name} — ${t('battle.miss')}!`);
    } else {
      // Fórmula REAL del GBC: Damage = (power + move) × positionMultiplier × block
      const power = card.type === 'beam' ? enemy.ki + eBuffs.ki : enemy.str + eBuffs.str;
      const vulnerable = (isBeamVulnerable(pos) && card.type === 'beam') || (isDamageVulnerable(pos) && card.type === 'damage');
      const posMult = (pd.depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
      damage = Math.floor((card.atk + power) * posMult);
      // Guardia activa del jugador (cartas Taiyoken/Avoid/Endurance/Absorb)
      if (playerGuard) {
        const g = playerGuard.type;
        if (g === 'cancel' && card.type === 'command') {
          // Foresight/Telepathy/Time Freeze: el Stage Attack enemigo FALLA (mecánica real)
          damage = 0; hitType = 'guard';
          addLog(`${player.name} cancela el Stage Attack de ${enemy.name}!`);
        } else if ((g === 'avoid_beam' && card.type === 'beam') || (g === 'avoid_damage' && card.type === 'damage')) {
          damage = 0; hitType = 'guard';
          addLog(`${player.name} ${t('battle.blocks')} ${card.name}!`);
        } else if (g === 'reduce') {
          damage = Math.floor(damage * 0.5);
          addLog(`${player.name} ${t('battle.resists')} — ${damage} ${t('battle.dmg')}`);
        } else if (g === 'absorb' && card.type === 'beam') {
          damage = 0; hitType = 'guard';
          const heal = Math.floor(player.maxHp * 0.1);
          setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
          addLog(`${player.name} ${t('battle.absorbs')} +${heal} HP!`);
        }
        setPlayerGuard(null);
      } else if (defended) {
        // Basic Guard del GBC: 3 resultados observados por la comunidad:
        // HIT normal / BLOCK ≈ ¼ daño / AVOID = 0 daño.
        // Variables documentadas: Card Accuracy × Defender Speed.
        // Probabilidades HYPOTHESIS (la rutina real es P0 ROM).
        const spdDef = player.spd + pStages.spd * 8;
        const avoidChance = Math.max(0.05, Math.min(0.35, 0.05 + (spdDef - 25) * 0.004 + (100 - card.acc) * 0.002));
        const blockChance = 0.55;
        const gRoll = Math.random();
        if (gRoll < avoidChance) {
          damage = 0; hitType = 'guard';
          addLog(`${player.name} AVOID! (0 ${t('battle.dmg')})`);
        } else if (gRoll < avoidChance + blockChance) {
          damage = Math.floor(damage * 0.25); // BLOCK ≈ ¼ (COMMUNITY_TESTED)
          hitType = 'guard';
          addLog(`${player.name} BLOCK — ${damage} ${t('battle.dmg')}`);
        } else {
          addLog(`${player.name} ${t('battle.defends')} — ${damage} ${t('battle.dmg')}`);
        }
      } else {
        addLog(`${enemy.name} → ${card.name} — ${damage} ${t('battle.dmg')}`);
      }
    }
    setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - damage) }));
    // CC al recibir daño: +1 base; +2 si daño sustancial (manual: "Life decreases
    // substantially"). El umbral exacto es UNKNOWN; usamos ≥15% maxHP como HYPOTHESIS.
    // ⚠️ Sin bonus por posición vulnerable: no hay evidencia que lo justifique.
    if (damage > 0) {
      const substantial = damage >= player.maxHp * 0.15;
      const gain = substantial ? 2 : 1;
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + gain) }));
      addLog(`${player.name} +${gain} CC (${t('battle.hp')} bajo)`);
    }
    // La carta del enemigo CUESTA CC (economía real)
    setEnemy(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    setFlashPlayer(true);
    hitImpact('player');
    if (card.type === 'beam') Sfx.beam();
    else if (damage > 0) Sfx.punch();
    else if (hitType === 'miss') Sfx.dodge();
    setTimeout(() => setFlashPlayer(false), 150);
    if (damage > 0) { setPlayerPose('hurt'); setDamageNums(prev => [...prev, { value: damage, type: 'damage', ...dmgPos('player'), id: Date.now() }]); }
    else if (hitType === 'guard') setDamageNums(prev => [...prev, { value: 0, type: 'guard', ...dmgPos('player'), id: Date.now() }]);
    else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('player'), id: Date.now() }]);

    if (player.hp - damage <= 0 && player2) {
      // 2v2: cae el jugador activo, entra el compañero con HP completo (como el GBC)
      const fallen = player.name;
      const next = player2;
      setPlayer2(null);
      setPlayer(next);
      setPlayerPose('idle');
      setFlashPlayer(false);
      addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
      setTimeout(() => {
        setEnemyPose('idle');
        setSelectedCard(null);
        advanceExchange();
      }, 900);
      return;
    }
    if (player.hp - damage <= 0) {
      setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); Sfx.defeat(); addLog(`${player.name} ${t('battle.defeated')}`); }, 500);
      return;
    }

    setTimeout(() => {
      setPlayerPose('idle'); setEnemyPose('idle');
      setSelectedCard(null);
      // Decaer Gather Power (FULL_POWER → HALF_POWER → NORMAL)
      if (gatherTurns > 0) {
        setGatherTurns(g => g - 1);
        setPowerState(prev => prev === 'FULL_POWER' ? 'HALF_POWER' : prev === 'HALF_POWER' ? 'NORMAL' : prev);
      }
      advanceExchange();
    }, 400);
  };

  useEffect(() => {
    if (damageNums.length > 0) {
      const timer = setTimeout(() => setDamageNums(prev => prev.slice(1)), 1200);
      return () => clearTimeout(timer);
    }
  }, [damageNums]);

  const bg = BATTLE_BGS.find(b => b.id === bgId)!;
  const battleBgUrl = viewMode === 'ACTION' ? scenario.actionBackground
    : viewMode === 'SPECIAL_ACTION' ? SPECIAL_ACTION_BACKGROUND
    : scenario.overviewBackground;
  const suppressFieldActors = !!cardFx || phase === 'stageInput';
  const phaseShortLabel =
    phase === 'command' || phase === 'cardSelect' || phase === 'limitSelect' ? 'ATTACK' :
    phase === 'basic' ? 'BASIC' :
    phase === 'stageInput' ? 'STAGE' :
    phase === 'enemyTurn' ? 'ACTION' :
    phase === 'defend' ? 'DEFENSE' :
    phase === 'position' ? 'POSITION' : '';

  return (
    <div className="battle-screen">
      {/* ═══ PANTALLA DE CARGA con skeleton (hasta que los assets clave estén listos) ═══ */}
      {loading && !intro && (
        <div className="battle-loading">
          <div className="bl-title">DRAGON BALL Z</div>
          <div className="bl-sub">LEGENDARY SUPER WARRIORS</div>
          <div className="bl-stage">
            <div className="bl-skeleton bl-skel-left" />
            <div className="bl-vs">VS</div>
            <div className="bl-skeleton bl-skel-right" />
          </div>
          <div className="bl-bar"><div className="bl-bar-fill" /></div>
        </div>
      )}

      {/* Fade suave TACTICAL ↔ ACTION (se monta en cada cambio de vista) */}
      {viewFade > 0 && <div key={viewFade} className="view-fade" />}
      {phaseCue && (
        <div className="phase-cue" key={phaseCue.id}>
          <div className="phase-cue-line" />
          <div className="phase-cue-title">{phaseCue.title}</div>
          <div className="phase-cue-sub">{phaseCue.sub}</div>
        </div>
      )}

      {/* ═══ INTRO CINEMATOGRÁFICA (como el GBC): VS screen + READY... FIGHT! ═══ */}
      {intro && (
        <div className="battle-intro">
          <div className="intro-burst-left" />
          <div className="intro-burst-right" />
          <div className="intro-fighter intro-left">
            <div className="intro-portrait">
              <img src={portraitFor(player.id, playerFormId) || ''} alt={player.name}
                onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <div className="intro-sprite-wrap">
              {spriteManifestUrl(playerFormId)
                ? <FighterSprite formId={playerFormId} pose="idle" side="left" scale={16} />
                : <CharacterSprite formId={playerFormId} className="intro-sprite" height={230} side="left" />}
            </div>
            <div className="intro-name">{player.name}</div>
            <div className="intro-sub">{player.form}</div>
          </div>
          <div className="intro-vs">{t('battle.vs')}</div>
          <div className="intro-fighter intro-right">
            <div className="intro-portrait">
              <img src={portraitFor(enemy.id, enemyFormId) || ''} alt={enemy.name}
                onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
            <div className="intro-sprite-wrap">
              {spriteManifestUrl(enemyFormId)
                ? <FighterSprite formId={enemyFormId} pose="idle" side="right" scale={16} />
                : <CharacterSprite formId={enemyFormId} className="intro-sprite" height={230} side="right" />}
            </div>
            <div className="intro-name">{enemy.name}</div>
            <div className="intro-sub">{enemy.form}</div>
          </div>
          <div className="intro-flash" />
          <div className="intro-fight">{t('battle.fight')}</div>
          <div className="intro-ready">{t('battle.ready')}</div>
        </div>
      )}

      {/* ═══ CINEMÁTICA DE ACCIÓN GBC: atacante → habilidad → rival ═══ */}
      {cardFx && (
        <div className={`card-fx fx-${cardFx.card.type} ${cardFx.side} scene-${cardFx.step}`} key={`${cardFx.card.id}-${cardFx.side}-${cardFx.step}`}>
          <div className="fx-vignette" />
          {cardFx.step === 'attacker' && (
            <>
              <div className="fx-scene-label">ACTION</div>
              <div className="fx-fighter fx-actor">
                {cardFx.side === 'player'
                  ? (spriteManifestUrl(playerFormId)
                      ? <FighterSprite formId={playerFormId} pose={cardBattlePose(cardFx.card, 'fx')} side="left" scale={14} />
                      : <CharacterSprite formId={playerFormId} className="fx-sprite" height={200} side="left" />)
                  : (spriteManifestUrl(enemyFormId)
                      ? <FighterSprite formId={enemyFormId} pose={cardBattlePose(cardFx.card, 'fx')} side="right" scale={14} />
                      : <CharacterSprite formId={enemyFormId} className="fx-sprite" height={200} side="right" />)}
              </div>
              <div className="fx-card">
                {cardIconUrl(cardFx.card.id) && <img src={cardIconUrl(cardFx.card.id)} alt="" className="fx-card-icon" />}
                <span className="fx-card-name">{cardFx.card.name}</span>
              </div>
              {cardFx.card.type === 'support' && <div className="fx-aura" />}
            </>
          )}
          {cardFx.step === 'travel' && (
            <>
              <div className="fx-scene-label">SKILL</div>
              {cardFx.card.type === 'beam' ? <div className="fx-beam-travel" /> : <div className="fx-rush-trail" />}
              {cardFx.card.type === 'damage' && <div className="fx-swing" />}
            </>
          )}
          {cardFx.step === 'target' && (
            <>
              <div className="fx-scene-label">IMPACT</div>
              <div className="fx-fighter fx-target">
                {cardFx.side === 'player'
                  ? (spriteManifestUrl(enemyFormId)
                      ? <FighterSprite formId={enemyFormId} pose="hurt" side="right" scale={14} />
                      : <CharacterSprite formId={enemyFormId} className="fx-sprite" height={200} side="right" />)
                  : (spriteManifestUrl(playerFormId)
                      ? <FighterSprite formId={playerFormId} pose="hurt" side="left" scale={14} />
                      : <CharacterSprite formId={playerFormId} className="fx-sprite" height={200} side="left" />)}
              </div>
              <div className="fx-impact" />
            </>
          )}
        </div>
      )}

      {/* Overlay de transformación en combate */}
      {battleTransform > 0 && (
        <div className="battle-transform-fx" key={battleTransform}>
          <div className="bt-flash" />
          <div className="bt-aura" />
          <div className="bt-text">{t('battle.powerOn')}</div>
        </div>
      )}

      {/* HUD */}
      <div className="hud-top">
        <div className="fighter-hud left">
          <div className="hud-name">
            <span className="hud-portrait">
              <img src={portraitFor(player.id, playerFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!portraitFor(player.id) && <Sword size={14} />}
            </span>
            <strong>{player.name}</strong>
            <span className="hud-form">{player.form}</span>
            <span className="hud-level">LV{player.level}</span>
          </div>
          <HPBar current={player.hp} max={player.maxHp} side="left" />
          <div className="hud-stats">
            <span>STR{player.str + pBuffs.str}</span><span>KI{player.ki + pBuffs.ki}</span><span>SPD{player.spd}</span>
            {buffTurns > 0 && <span className="buff-indicator">BUFF {buffTurns}▲</span>}
            {gatherTurns > 0 && <span className="power-indicator">{t('battle.powerState')} {powerState.replace('_', ' ')}</span>}
          </div>
          <CCDisplay cc={player.cc} maxCc={player.maxCc} />
          {player2 && (
            <div className="team-reserve left">
              <span className="team-reserve-portrait">
                <img src={portraitFor(player2.id) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              </span>
              <span className="team-reserve-name">{player2.name}</span>
              <span className="team-reserve-hp">{player2.hp}/{player2.maxHp}</span>
            </div>
          )}
        </div>
        <div className="fighter-hud right">
          <div className="hud-name">
            <span className="hud-portrait">
              <img src={portraitFor(enemy.id, enemyFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
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
          {enemy2 && (
            <div className="team-reserve right">
              <span className="team-reserve-portrait">
                <img src={portraitFor(enemy2.id) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              </span>
              <span className="team-reserve-name">{enemy2.name}</span>
              <span className="team-reserve-hp">{enemy2.hp}/{enemy2.maxHp}</span>
            </div>
          )}
        </div>
        {/* Insignia central: centrada ABSOLUTA (independiente del flujo) */}
        <div className="hud-center-badge">
          <span className="hud-center-round">ROUND {turn}</span>
          <span className="hud-center-vs">VS</span>
          <span className="hud-center-order">{speedOrderLabel.split(' ')[0]}</span>
        </div>
      </div>

      {/* Campo de batalla */}
      <div className={`battlefield ${hitShake ? `shake-${hitShake}` : ''}`} ref={battlefieldRef}>
        <div className="battle-bg authentic" style={{ backgroundImage: `url(${battleBgUrl})` }} />
        {!suppressFieldActors && <div className="battlefield-fighters">
          {/* Anchors por lado: LEFT (jugador) y RIGHT (enemigo) usan X
              reflejadas — BACK apunta al borde propio de cada lado (spec) */}
          <div ref={playerRef} className={`fighter-container player ${POSITION_DATA[player.battlePos].altitude.toLowerCase()} ${POSITION_DATA[player.battlePos].depth.toLowerCase()}`}
            style={{ left: `${anchorFor(player.battlePos, 'LEFT').x}%`, top: `${anchorFor(player.battlePos, 'LEFT').y}%` }}>
            {playerPose === 'idle' && overworldUrl(playerFormId)
              ? <img src={overworldUrl(playerFormId)!} alt="" className={`overworld-sprite ${gatherTurns > 0 ? 'gathering' : ''}`} style={{ transform: `scaleX(${facingFlip(playerFormId, 'left')})` }} />
              : (spriteManifestUrl(playerFormId)
                  ? <FighterSprite formId={playerFormId} pose={playerPose} side="left" scale={15} flash={flashPlayer || gatherTurns > 0} />
                  : <CharacterSprite formId={playerFormId} className={`sheet-sprite ${gatherTurns > 0 ? 'gathering' : ''}`} height={152} side="left" />)}
            <div className="fighter-position-tag hidden">{player.battlePos.replace('_', ' ')}</div>
          </div>
          <div ref={enemyRef} className={`fighter-container enemy ${POSITION_DATA[enemy.battlePos].altitude.toLowerCase()} ${POSITION_DATA[enemy.battlePos].depth.toLowerCase()}`}
            style={{ left: `${anchorFor(enemy.battlePos, 'RIGHT').x}%`, top: `${anchorFor(enemy.battlePos, 'RIGHT').y}%` }}>
            {enemyPose === 'idle' && overworldUrl(enemyFormId)
              ? <img src={overworldUrl(enemyFormId)!} alt="" className="overworld-sprite" style={{ transform: `scaleX(${facingFlip(enemyFormId, 'right')})` }} />
              : (spriteManifestUrl(enemyFormId)
                  ? <FighterSprite formId={enemyFormId} pose={enemyPose} side="right" scale={15} flash={flashEnemy} />
                  : <CharacterSprite formId={enemyFormId} className="sheet-sprite" height={152} side="right" />)}
            <div className="fighter-position-tag hidden">{enemy.battlePos.replace('_', ' ')}</div>
          </div>
        </div>}
        {damageNums.map(dn => <DamageNumber key={dn.id} value={dn.value} type={dn.type} x={dn.x} y={dn.y} />)}
      </div>

      {/* Barra de fase */}
      <div className="phase-bar">
        <div className="phase-info">
          <span className="turn-label">{t('battle.turn')} {turn}</span>
          <span className="speed-order-label">{speedOrderLabel}</span>
          <span className="phase-label">
            {phaseShortLabel}
            {phase !== 'win' && phase !== 'lose' && phase !== 'position' ? ` ${exchangeIndex + 1}/2` : ''}
          </span>
        </div>
        <button className="btn-exit" onClick={() => onExit(false)}><X size={12} /> {t('battle.forfeit')}</button>
      </div>

      {/* Controles */}
      <div className="battle-controls">

        {phase === 'command' && (
          <div className="command-select">
            <div className="command-strip">
              <button onClick={() => selectCommand('LIMIT')} className="cmd-limit">L</button>
              <button onClick={() => selectCommand('J')} className="cmd-j">J</button>
              <button onClick={() => selectCommand('B')} className="cmd-b">B</button>
              {/* CHARA solo aparece en combates de equipo (FAQ: en individuales no existe) */}
              {player2 && (
                <button onClick={() => selectCommand('C')} className="cmd-c has-ally" title={`CHARA: ${player2.name}`}>C²</button>
              )}
            </div>
            <div className="command-help">{t('battle.basicFree')} · {t('battle.limitedHelp')}</div>
          </div>
        )}
        {phase === 'basic' && (
          <div className="command-select">
            <div className="basic-menu">
              <button className="basic-btn" onClick={() => basicAction('stage')}>
                <strong>{t('battle.stageAttack')}</strong>
                <span>{powerState !== 'NORMAL' ? '4 ' : '3 '}{t('battle.powerState')} · A/B</span>
              </button>
              <button className="basic-btn" onClick={() => basicAction('gather')} disabled={gatherTurns > 0}>
                <strong>{t('battle.gatherPower')}</strong>
                <span>{gatherTurns > 0 ? powerState.replace('_', ' ') : '+8 STR/KI'}</span>
              </button>
              <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setPhase('command'); }}>
                {t('battle.back')}
              </button>
            </div>
            <div className="command-help">{t('battle.basicFree')}</div>
          </div>
        )}
        {phase === 'limitSelect' && (
          <div className="command-select">
            <div className="limit-panel">
              <div className="limit-title">LIMITED — {player.name}</div>
              {limitCards.length === 0 && <div className="limit-empty">{t('battle.limitHelp')}</div>}
              {limitCards.map((c, i) => (
                <button key={i} className={`limit-row ${player.cc < c.cc ? 'locked' : ''}`}
                  disabled={player.cc < c.cc} onClick={() => playLimit(c)}>
                  <span className="limit-name">{c.name}</span>
                  <span className="limit-cost">{c.cc} CC</span>
                  {player.cc < c.cc && <span className="limit-lock">{t('battle.insufficientCc')}</span>}
                </button>
              ))}
              <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setPhase('command'); }}>
                {t('battle.back')}
              </button>
            </div>
            <div className="command-help">{t('battle.limitedHelp')}</div>
          </div>
        )}
        {phase === 'cardSelect' && (
          <>
            <HandComponent cards={hand} selectedIndex={selectedCard} onSelect={selectCard} />
            <button className="btn-cancel-card" onClick={() => { Sfx.cancel(); setSelectedCard(null); setPhase('command'); }}>
              ← {t('battle.cancel')}
            </button>
          </>
        )}
        {phase === 'stageInput' && (() => {
          const q = stageQte;
          const curKey = q.seq[q.idx];
          const isDirPrompt = curKey === 'UP' || curKey === 'DOWN' || curKey === 'LEFT' || curKey === 'RIGHT';
          // Tiempo global de la secuencia en SEGUNDOS GBC (spec §20: el reloj
          // corre en frames; los segundos son solo presentación).
          const elapsedSec = (q.elapsedFrames / GBC_NATIVE_FPS).toFixed(1);
          const limitSec = (q.limitFrames / GBC_NATIVE_FPS).toFixed(1);
          const inRecovery = q.state === 'RECOVERY_APPROACH' || q.state === 'RECOVERY_WINDOW';
          const recoverActive = q.state === 'RECOVERY_WINDOW';
          const recoverFrames = q.recoveryFrames;
          // La tecla de cada comando: Q/E para A/B, flechas+WASD para direcciones
          const keyIcon = (k: StageKey) => k === 'UP' ? 'arrow_up' : k === 'DOWN' ? 'arrow_down' : k === 'LEFT' ? 'arrow_left' : k === 'RIGHT' ? 'arrow_right' : k === 'A' ? 'key_q' : 'key_e';
          const keyLabel = (k: StageKey) => k === 'UP' ? 'W / ↑' : k === 'DOWN' ? 'S / ↓' : k === 'LEFT' ? 'A / ←' : k === 'RIGHT' ? 'D / →' : k === 'A' ? 'Q' : 'E';
          return (
          <div className="stage-input-area">
            <div className={`stage-fighter ${isDirPrompt ? 'lunging' : ''}`} key={isDirPrompt ? `dir-${q.idx}` : `btn-${q.idx}`}>
              {spriteManifestUrl(playerFormId)
                ? <FighterSprite formId={playerFormId} pose={q.idx > 0 ? 'attack_fwd' : 'idle'} side="left" scale={18} flash={q.idx > 0} />
                : <CharacterSprite formId={playerFormId} className="fx-sprite" height={170} side="left" />}
            </div>
            <div className="stage-label">
              <span className="stage-push">PUSH {elapsedSec} / {limitSec}</span>
              {q.card?.name} — STAGE {Math.min(q.idx + 1, q.seq.length)}/{q.seq.length}
            </div>
            {!inRecovery ? (
              <>
                {/* Secuencia completa de comandos: los hechos ✓, el actual grande,
                    los futuros atenuados (spec §23: la secuencia se congela al empezar) */}
                <div className="stage-sequence">
                  {q.seq.map((k, i) => (
                    <span key={i} className={`stage-seq-item ${i < q.idx ? 'done' : i === q.idx ? 'current' : 'future'}`}>
                      {i < q.idx ? <span className="seq-check">✓</span> : <img src={`/assets/ui/qte/${keyIcon(k)}.png`} alt={keyLabel(k)} className="qte-key-sm" />}
                    </span>
                  ))}
                </div>
                {/* Prompt ÚNICO: la tecla actual a pulsar */}
                {q.state === 'INPUT_WINDOW' || q.state === 'PROMPT' ? (
                  <div key={q.idx} className={`stage-prompt-big ${stageFeedback ?? ''} ${curKey}`}>
                    <img src={`/assets/ui/qte/${keyIcon(curKey)}.png`} alt={curKey} className="qte-key-big" />
                    <span className="stage-prompt-label">{keyLabel(curKey)}</span>
                  </div>
                ) : null}
                {/* Reloj global: barra + números (PUSH elapsed / limit) */}
                <div className="stage-timer-row">
                  <div className="stage-timer" style={{ width: `${Math.min(100, (q.elapsedFrames / Math.max(1, q.limitFrames)) * 100)}%` }} />
                </div>
                <div className="stage-help">Q = puñetazo · E = patada · flechas/WASD = desplazamiento — pulsa a tiempo (+1 CC por acierto)</div>
              </>
            ) : (
              <>
                <div className="stage-fail">INPUT FAILED — {q.correct} CC ganados</div>
                {recoverActive && (
                  <div className="stage-recover-help">
                    <div className="stage-recover-prompt">
                      <img src="/assets/ui/qte/key_q.png" alt="Q" className="qte-key-sm" /> ABANDONAR (Q)
                    </div>
                    <div className={`stage-recover-prompt ${recoverFrames >= 12 && recoverFrames <= 24 ? 'window-open' : ''}`}>
                      <img src="/assets/ui/qte/key_e.png" alt="E" className="qte-key-sm" /> REPARAR (E) {recoverFrames >= 12 && recoverFrames <= 24 ? '— ¡AHORA!' : ''}
                    </div>
                  </div>
                )}
                <div className="stage-help">Q = abandonar y defender (conserva CC) · E = reparar la cadena en el momento justo</div>
              </>
            )}
          </div>
          );
        })()}
        {phase === 'enemyTurn' && (
          <div className="enemy-turn-overlay"><div className="turn-text">{t('battle.enemyTurn')}</div></div>
        )}
        {phase === 'defend' && (
          <div className="defense-menu">
            {defendMenu === null && (
              <>
                <div className="control-label">{t('battle.defendAction')} — {t('battle.chooseDefense')}</div>
                <div className="defense-sources">
                  <button className="basic-btn" onClick={() => { Sfx.select(); setDefendMenu('basic'); }}>
                    <strong>B</strong> {t('battle.basic')}
                    <span>{t('battle.basicDefense')}</span>
                  </button>
                  <button className="basic-btn" onClick={() => { Sfx.select(); setDefendMenu('joint'); }}>
                    <strong>J</strong> {t('battle.joint')}
                    <span>{t('battle.jointDefense')}</span>
                  </button>
                  <button className="basic-btn" onClick={() => { Sfx.select(); setDefendMenu('limit'); }} disabled={powerState === 'NORMAL' || limitCards.length === 0}>
                    <strong>L</strong> {t('battle.limit')}
                    <span>{powerState === 'NORMAL' ? t('battle.needGather') : t('battle.limitDefense')}</span>
                  </button>
                </div>
                <div className="command-help">{t('battle.defenseHelp')}</div>
              </>
            )}
            {defendMenu === 'basic' && (
              <>
                <div className="control-label">{t('battle.basicDefense')}</div>
                <div className="basic-menu">
                  <button className="basic-btn" onClick={() => defendBasic('defense')}>
                    <strong>{t('battle.defendAction')}</strong>
                    <span>−50% {t('battle.dmg')}</span>
                  </button>
                  <button className="basic-btn" onClick={() => { Sfx.select(); setDefendMenu('move'); }}>
                    <strong>{t('battle.move')}</strong>
                    <span>{t('battle.moveHelp')}</span>
                  </button>
                  <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setDefendMenu(null); }}>
                    {t('battle.back')}
                  </button>
                </div>
              </>
            )}
            {defendMenu === 'move' && (
              <div className="position-select">
                <div className="control-label">{t('battle.move')} — {t('battle.choosePosition')}</div>
                <div className="position-pad">
                  <button onClick={() => defendBasic('move', BattlePosition.UP_BACK)}>↑ {t('battle.upBack')}</button>
                  <button onClick={() => defendBasic('move', BattlePosition.UP_FRONT)}>↑ {t('battle.upFront')}</button>
                  <button onClick={() => defendBasic('move', BattlePosition.DOWN_BACK)}>↓ {t('battle.downBack')}</button>
                  <button onClick={() => defendBasic('move', BattlePosition.DOWN_FRONT)}>↓ {t('battle.downFront')}</button>
                </div>
                <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setDefendMenu('basic'); }}>
                  {t('battle.back')}
                </button>
              </div>
            )}
            {defendMenu === 'joint' && (
              <div className="command-select">
                <div className="limit-panel">
                  <div className="limit-title">JOINT — {t('battle.defenseOnly')}</div>
                  {(() => {
                    const defCards = hand.filter(c => c.type === 'defense' || c.type === 'support');
                    if (defCards.length === 0) return <div className="limit-empty">{t('battle.noDefenseCards')}</div>;
                    return defCards.map((c, i) => {
                      const handIdx = hand.indexOf(c);
                      return (
                        <button key={i} className="limit-row" onClick={() => defendJoint(c, handIdx)}>
                          <span className="limit-name">{c.name}</span>
                          <span className="limit-cost">{c.type.toUpperCase()}</span>
                        </button>
                      );
                    });
                  })()}
                  <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setDefendMenu(null); }}>
                    {t('battle.back')}
                  </button>
                </div>
              </div>
            )}
            {defendMenu === 'limit' && (
              <div className="command-select">
                <div className="limit-panel">
                  <div className="limit-title">LIMITED — {t('battle.defenseOnly')}</div>
                  {(() => {
                    const defLimits = limitCards.filter(c => c.type === 'defense' || c.type === 'support');
                    if (defLimits.length === 0) return <div className="limit-empty">{t('battle.noDefenseLimits')}</div>;
                    return defLimits.map((c, i) => (
                      <button key={i} className={`limit-row ${player.cc < c.cc ? 'locked' : ''}`}
                        disabled={player.cc < c.cc} onClick={() => defendLimit(c)}>
                        <span className="limit-name">{c.name}</span>
                        <span className="limit-cost">{c.cc} CC</span>
                        {player.cc < c.cc && <span className="limit-lock">{t('battle.insufficientCc')}</span>}
                      </button>
                    ));
                  })()}
                  <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setDefendMenu(null); }}>
                    {t('battle.back')}
                  </button>
                </div>
              </div>
            )}
          </div>
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
  const { t, lang } = useLang();
  const [reward, setReward] = useState<number[] | null>(() => loadUnlocks().pendingReward);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null);
  const [keyboardMenuActive, setKeyboardMenuActive] = useState(false);

  const claimReward = (cardId: number) => {
    const u = loadUnlocks();
    u.cards = [...new Set([...u.cards, cardId])];
    u.pendingReward = null;
    saveUnlocks(u);
    setReward(null);
    Sfx.confirm();
  };

  // ── Tarjeta CONTINUAR: progreso real de la partida ──
  const prog = loadProgress();
  const storyProgress = loadStoryProgress();
  const currentChapter = Math.min(storyProgress, CHAPTERS.length);
  const ch = CHAPTERS.find(c => c.id === currentChapter);
  const heroUrl = ch ? overworldUrl(ch.player) : undefined;
  const heroChar = ch ? characterName(ch.player.replace(/_base|_young|_ssj.*|_kami|_ultimate|_future|_kid.*/g, '')) : '';
  const pct = Math.round((storyProgress / CHAPTERS.length) * 100);
  // Saga actual según el capítulo (para la tarjeta de progreso)
  const sagaName = currentChapter <= 3 ? 'SAIYAN'
    : currentChapter <= 10 ? 'NAMEK'
    : currentChapter <= 22 ? 'ANDROIDES'
    : 'MAJIN BUU';
  const menuCopy = lang === 'es'
    ? {
      story: 'Saga, episodios y recompensas',
      battle: 'Combate libre y desafios',
      deck: 'Cartas, energia y estrategia',
      characters: 'Formas, progreso y afinidad',
      cards: 'Coleccion y rarezas',
      settings: 'Audio, idioma y pantalla',
      footer: 'v0.3 fanmade',
    }
    : {
      story: 'Saga, episodes and rewards',
      battle: 'Free battle and challenges',
      deck: 'Cards, energy and strategy',
      characters: 'Forms, progress and affinity',
      cards: 'Collection and rarities',
      settings: 'Audio, language and display',
      footer: 'v0.3 fanmade',
    };
  const menuItems: Array<{ n: string; label: string; desc: string; screen: Screen; Icon: LucideIcon; tone?: string; secondary?: boolean }> = [
    { n: '01', label: t('menu.story'), desc: menuCopy.story, screen: 'story', Icon: BookOpen },
    { n: '02', label: t('menu.battle'), desc: menuCopy.battle, screen: 'versus', Icon: Swords, tone: 'hot' },
    { n: '03', label: t('menu.deck'), desc: menuCopy.deck, screen: 'deck', Icon: Library },
    { n: '04', label: t('menu.characters'), desc: menuCopy.characters, screen: 'characters', Icon: Users },
    { n: '05', label: t('menu.cards'), desc: menuCopy.cards, screen: 'cards', Icon: Sparkles },
    { n: '06', label: t('menu.settings'), desc: menuCopy.settings, screen: 'settings', Icon: Settings, secondary: true },
  ];
  const visualMenuIndex = hoveredMenuIndex ?? (keyboardMenuActive ? selectedMenuIndex : null);
  const onMenuKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      Sfx.select();
      setKeyboardMenuActive(true);
      setHoveredMenuIndex(null);
      setSelectedMenuIndex(i => {
        const dir = ev.key === 'ArrowDown' ? 1 : -1;
        return (i + dir + menuItems.length) % menuItems.length;
      });
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      Sfx.confirm();
      onNavigate(menuItems[selectedMenuIndex].screen);
    }
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

      <div className="menu-content" tabIndex={0} onKeyDown={onMenuKeyDown}>
        <h1 className="menu-title">{t('menu.title')}</h1>
        <h2 className="menu-subtitle">{t('menu.subtitle')}</h2>

        {/* Bloque hero integrado en la banda izquierda, sin ventana exterior. */}
        <button className="menu-continue-card" onClick={() => { Sfx.confirm(); onNavigate('battle'); }}>
          <span className="mc-play">▶</span>
          <span className="mc-body">
            <span className="mc-kicker">SAGA {sagaName} · CAPÍTULO {currentChapter}</span>
            <span className="mc-title">{t('menu.continue')}</span>
            <span className="mc-chapter">{ch ? t(ch.nameKey).toUpperCase() : '—'}</span>
            <span className="mc-progress-line">
              <span className="mc-progress-track"><span className="mc-progress-fill" style={{ width: `${pct}%` }} /></span>
              <span className="mc-percent">{pct}%</span>
            </span>
            <span className="mc-meta">{heroChar} · Nv. {prog.level}</span>
          </span>
          {heroUrl && (
            <span className="mc-hero-wrap">
              <img className="mc-hero" src={heroUrl} alt="" />
              <span className="mc-hero-name">{heroChar}</span>
            </span>
          )}
        </button>

        <nav className="menu-nav" aria-label="Main menu" onMouseLeave={() => setHoveredMenuIndex(null)}>
          {menuItems.map(({ n, label, desc, screen, Icon, tone, secondary }, index) => (
            <button
              key={screen}
              className={`menu-item ${tone ? `tone-${tone}` : ''} ${secondary ? 'menu-item-settings' : ''} ${index === visualMenuIndex ? 'selected' : ''}`}
              onMouseEnter={() => { setHoveredMenuIndex(index); setKeyboardMenuActive(false); }}
              onMouseLeave={() => setHoveredMenuIndex(null)}
              onFocus={() => { setSelectedMenuIndex(index); setKeyboardMenuActive(true); }}
              onClick={() => { Sfx.select(); onNavigate(screen); }}
              aria-current={index === visualMenuIndex ? 'true' : undefined}
            >
              <span className="mi-num">{n}</span>
              <span className="mi-icon"><Icon size={18} strokeWidth={2.4} /></span>
              <span className="mi-copy">
                <span className="mi-label">{label}</span>
                <span className="mi-desc">{desc}</span>
              </span>
              <ChevronRight className="mi-arrow" size={18} strokeWidth={2.8} />
            </button>
          ))}
        </nav>

        <div className="menu-footer">{menuCopy.footer}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STORY — Mapa de capítulos
// ═══════════════════════════════════════════════════════════

// 32 capítulos reales del walkthrough del GBC (RPGClassics shrine)
// nameKey/descKey usan story.chN/story.dN; enemy = forma del jefe real
// Protagonista de cada capítulo según la historia REAL del GBC (walkthrough):
// 1-2 Gohan · 3 Goku · 4 Gohan · 5-8 Gohan (Namek) · 9-10 Goku · 11 Gohan ·
// 12-13 Goku (Androides) · 14-15 Piccolo-God · 16 Goku SSJ · 17 Goku ·
// 18-19 Gohan SSJ2 · 20 Vegeta (opcional) · 21-22 Trunks SSJ · 23 Gohan ·
// 24 Goten · 25-26 Goku SSJ2 · 27 Trunks futuro · 28 Gotenks SSJ3 ·
// 29-30 Gohan Ultimate · 31 Vegito · 32 Goku SSJ3
const CHAPTERS: { id: number; nameKey: TKey; descKey: TKey; enemy: string; player: string }[] = [
  { id: 1, nameKey: 'story.ch1', descKey: 'story.d1', enemy: 'piccolo_base', player: 'gohan_young' },
  { id: 2, nameKey: 'story.ch2', descKey: 'story.d2', enemy: 'nappa', player: 'gohan_young' },
  { id: 3, nameKey: 'story.ch3', descKey: 'story.d3', enemy: 'vegeta_base', player: 'goku_base' },
  { id: 4, nameKey: 'story.ch4', descKey: 'story.d4', enemy: 'vegeta_base', player: 'gohan_young' },
  { id: 5, nameKey: 'story.ch5', descKey: 'story.d5', enemy: 'guldo', player: 'gohan_young' },
  { id: 6, nameKey: 'story.ch6', descKey: 'story.d6', enemy: 'recoome', player: 'gohan_young' },
  { id: 7, nameKey: 'story.ch7', descKey: 'story.d7', enemy: 'jeice', player: 'gohan_young' },
  { id: 8, nameKey: 'story.ch8', descKey: 'story.d8', enemy: 'ginyu_goku', player: 'gohan_young' },
  { id: 9, nameKey: 'story.ch9', descKey: 'story.d9', enemy: 'frieza_final', player: 'goku_base' },
  { id: 10, nameKey: 'story.ch10', descKey: 'story.d10', enemy: 'frieza_final', player: 'goku_ssj' },
  { id: 11, nameKey: 'story.ch11', descKey: 'story.d11', enemy: 'goku_base', player: 'gohan_young' },
  { id: 12, nameKey: 'story.ch12', descKey: 'story.d12', enemy: 'android_19', player: 'goku_base' },
  { id: 13, nameKey: 'story.ch13', descKey: 'story.d13', enemy: 'android_20', player: 'goku_base' },
  { id: 14, nameKey: 'story.ch14', descKey: 'story.d14', enemy: 'cell_imperfect', player: 'piccolo_kami' },
  { id: 15, nameKey: 'story.ch15', descKey: 'story.d15', enemy: 'android_17', player: 'piccolo_kami' },
  { id: 16, nameKey: 'story.ch16', descKey: 'story.d16', enemy: 'android_16', player: 'goku_ssj' },
  { id: 17, nameKey: 'story.ch17', descKey: 'story.d17', enemy: 'cell_perfect', player: 'goku_base' },
  { id: 18, nameKey: 'story.ch18', descKey: 'story.d18', enemy: 'cell_jr', player: 'gohan_young_ssj2' },
  { id: 19, nameKey: 'story.ch19', descKey: 'story.d19', enemy: 'cell_perfect', player: 'gohan_young_ssj2' },
  { id: 20, nameKey: 'story.ch20', descKey: 'story.d20', enemy: 'cell_perfect', player: 'vegeta_base' },
  { id: 21, nameKey: 'story.ch21', descKey: 'story.d21', enemy: 'android_17', player: 'trunks_ssj' },
  { id: 22, nameKey: 'story.ch22', descKey: 'story.d22', enemy: 'cell_perfect', player: 'trunks_ssj' },
  { id: 23, nameKey: 'story.ch23', descKey: 'story.d23', enemy: 'goten_base', player: 'gohan_young' },
  { id: 24, nameKey: 'story.ch24', descKey: 'story.d24', enemy: 'trunks_kid', player: 'goten_base' },
  { id: 25, nameKey: 'story.ch25', descKey: 'story.d25', enemy: 'vegeta_majin', player: 'goku_ssj2' },
  { id: 26, nameKey: 'story.ch26', descKey: 'story.d26', enemy: 'buu_base', player: 'goku_ssj2' },
  { id: 27, nameKey: 'story.ch27', descKey: 'story.d27', enemy: 'trunks_future', player: 'trunks_future' },
  { id: 28, nameKey: 'story.ch28', descKey: 'story.d28', enemy: 'buu_super', player: 'gotenks_ssj3' },
  { id: 29, nameKey: 'story.ch29', descKey: 'story.d29', enemy: 'buu_gohan', player: 'gohan_ultimate' },
  { id: 30, nameKey: 'story.ch30', descKey: 'story.d30', enemy: 'buu_gotenks', player: 'gohan_ultimate' },
  { id: 31, nameKey: 'story.ch31', descKey: 'story.d31', enemy: 'buu_gohan', player: 'vegito_base' },
  { id: 32, nameKey: 'story.ch32', descKey: 'story.d32', enemy: 'buu_kid', player: 'goku_ssj3' },
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
  // 6 Stage Attack solo tras COMPLETAR story mode (mecánica real del GBC)
  if (loadStoryProgress() < CHAPTERS.length) set.delete(4);
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
// Umbrales EXP REALES del manual (CONFIRMED_MANUAL):
//   Lv1→2 = 10 · Lv2→3 = 50 · Lv3→4 = 150 · Lv4→5 = 500
// A partir de Lv5 no hay datos documentados: extrapolación HYPOTHESIS (×3.2)
const EXP_THRESHOLDS: Record<number, number> = { 1: 10, 2: 50, 3: 150, 4: 500 };
function expToNext(level: number): number {
  const known = EXP_THRESHOLDS[level];
  if (known !== undefined) return known;
  return Math.round(500 * Math.pow(3.2, level - 4));
}

// Aplicar subida de nivel con las CURVAS REALES del GBC
// (interpolación entre cuartos de nivel 25/50/75/100 por forma).
function applyLevelUps(base: Fighter, level: number): Fighter {
  if (level <= 1) return { ...base, level };
  const form = getForm(base.id);
  if (!form || !form.curves) return { ...base, level };
  const s = (stat: 'hp' | 'str' | 'ki' | 'spd') => statAtLevel(form, level, stat);
  return {
    ...base,
    level,
    maxHp: s('hp'),
    hp: s('hp'),
    str: s('str'),
    ki: s('ki'),
    spd: s('spd'),
  };
}

function StoryScreen({ onNavigate, onStartChapter }: {
  onNavigate: (s: Screen) => void; onStartChapter: (enemyFormId: string, chapterId: number) => void;
}) {
  const { t } = useLang();
  const [progress, setProgress] = useState(loadStoryProgress);
  const [selected, setSelected] = useState(1);
  const [sagaTab, setSagaTab] = useState(0);

  // Sagas del GBC (spec §6): pestañas superiores
  const SAGAS = [
    { name: 'SAIYAN', range: [1, 3] },
    { name: 'NAMEK', range: [4, 10] },
    { name: 'CELL', range: [11, 22] },
    { name: 'MAJIN BUU', range: [23, 32] },
  ];
  const visibleChapters = CHAPTERS.filter(c => c.id >= SAGAS[sagaTab].range[0] && c.id <= SAGAS[sagaTab].range[1]);
  const activeSaga = SAGAS[sagaTab];
  const sagaDone = visibleChapters.filter(c => c.id < progress).length;
  const sagaOpen = visibleChapters.filter(c => c.id <= progress).length;
  const nextChapter = visibleChapters.find(c => c.id >= progress) ?? visibleChapters[visibleChapters.length - 1];
  const sel = CHAPTERS.find(c => c.id === selected)!;
  const selUnlocked = sel.id <= progress;
  const selDone = sel.id < progress;

  const start = () => {
    const ch = CHAPTERS.find(c => c.id === selected)!;
    onStartChapter(ch.enemy, ch.id);
  };

  const total = CHAPTERS.length;
  const pct = Math.round((progress / total) * 100);
  const selHero = overworldUrl(sel.player);
  const selBoss = overworldUrl(sel.enemy);
  const selCutscene = panelsForChapter(sel.id).intro[0]?.background;

  return (
    <div className="page-screen story-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('story.title')}</h1>
        <div className="story-progress">
          <span className="story-progress-num">{progress}/{total}</span>
          <span className="story-progress-bar"><span style={{ width: `${pct}%` }} /></span>
        </div>
      </div>

      {/* Pestañas de sagas (spec §6) */}
      <div className="saga-tabs">
        {SAGAS.map((saga, i) => {
          const inRange = progress >= saga.range[0];
          const active = i === sagaTab;
          return (
            <button key={saga.name} className={`saga-tab ${active ? 'active' : ''} ${inRange ? 'open' : 'locked'}`}
              onClick={() => { Sfx.select(); setSagaTab(i); setSelected(Math.min(Math.max(progress, saga.range[0]), saga.range[1])); }}>
              {!inRange && <Lock size={10} />} {saga.name}
            </button>
          );
        })}
      </div>

      <div className="story-layout">
        {/* Ruta de capítulos de la saga */}
        <div className="story-map">
          {visibleChapters.map(ch => {
            const unlocked = ch.id <= progress;
            const isSel = ch.id === selected;
            const done = ch.id < progress;
            const boss = overworldUrl(ch.enemy);
            const hero = overworldUrl(ch.player);
            return (
              <div key={ch.id}
                className={`chapter-node ${isSel ? 'active' : ''} ${unlocked ? 'unlocked' : 'locked'} ${done ? 'done' : ''}`}
                onClick={() => unlocked && (Sfx.select(), setSelected(ch.id))}>
                <div className="chapter-icon">{unlocked ? ch.id : <Lock size={14} />}</div>
                <div className="chapter-boss">
                  {unlocked && boss
                    ? <img src={boss} alt="" className="chapter-boss-sprite" />
                    : <div className="chapter-boss-none">?</div>}
                  {unlocked && hero && <img src={hero} alt="" className="chapter-hero-sprite" />}
                </div>
                <div className="chapter-info">
                  <div className="chapter-name">{t(ch.nameKey)}</div>
                  <div className="chapter-desc">{unlocked ? t(ch.descKey) : t('story.notUnlocked')}</div>
                </div>
                <div className="chapter-status">
                  {done ? <span className="chapter-done-tag">✓</span>
                    : isSel ? <ChevronRight size={14} />
                    : <span className="chapter-num-tag">{String(ch.id).padStart(2, '0')}</span>}
                </div>
              </div>
            );
          })}
          <div className="story-route-footer">
            <div className="route-footer-kicker">{activeSaga.name} ROUTE</div>
            <div className="route-footer-row"><span>OPEN</span><b>{sagaOpen}/{visibleChapters.length}</b></div>
            <div className="route-footer-row"><span>CLEARED</span><b>{sagaDone}/{visibleChapters.length}</b></div>
            <div className="route-footer-next">{nextChapter ? t(nextChapter.nameKey) : activeSaga.name}</div>
          </div>
        </div>

        {/* Panel de detalle del capítulo seleccionado (spec §6) */}
        <div className="chapter-detail-panel ui-sidebar">
          {selCutscene && (
            <div className="cdp-visual" style={{ backgroundImage: `url(${selCutscene})` }}>
              <div className="cdp-visual-dim" />
              <div className="cdp-fighters">
                {selHero && <img src={selHero} alt="" className="cdp-hero" />}
                {selBoss && <img src={selBoss} alt="" className="cdp-boss" />}
              </div>
              <span className="cdp-chapter-tag">CAPÍTULO {String(sel.id).padStart(2, '0')}</span>
            </div>
          )}
          <div className="cdp-body ui-sidebar-body">
            <div className="cdp-name">{t(sel.nameKey)}</div>
            <div className="cdp-desc">{t(sel.descKey)}</div>
            <div className="cdp-meta">
              <span className="cdp-badge hero">{selHero ? <img src={selHero} alt="" /> : null} {characterName(sel.player.split('_')[0])}</span>
              <span className="cdp-badge boss">{selBoss ? <img src={selBoss} alt="" /> : null} {characterName(sel.enemy.split('_')[0])}</span>
              {selDone && <span className="cdp-badge done">✓ COMPLETADO</span>}
            </div>
            <div className="cdp-objective">
              <span className="obj-label">OBJETIVO</span>
              {selDone ? 'Victoria conseguida. ¡El siguiente capítulo te espera!' : `Derrota a ${characterName(sel.enemy.split('_')[0])} para continuar la saga.`}
            </div>
            <div className="cdp-intel">
              <div className="intel-row">
                <span className="intel-key">DIFICULTAD</span>
                <span className="intel-val">{sel.id <= 3 ? 'NORMAL' : sel.id <= 10 ? 'DIFÍCIL' : 'LETAL'}</span>
              </div>
              <div className="intel-row">
                <span className="intel-key">RECOMPENSA</span>
                <span className="intel-val">CARTA + EXP</span>
              </div>
              <div className="intel-row">
                <span className="intel-key">MODO</span>
                <span className="intel-val">{sel.id === 7 || sel.id === 16 || sel.id === 21 ? '2 VS 2' : '1 VS 1'}</span>
              </div>
            </div>
            <button className="btn-primary cdp-start" onClick={start} disabled={!selUnlocked}>
              {selUnlocked ? `▶ ${t('story.start').toUpperCase()}` : t('story.notUnlocked')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VIÑETAS DEL MODO HISTORIA — manga interactivo (sin exploración)
// ═══════════════════════════════════════════════════════════

function StorySceneScreen({ chapter, phase, onFinish, onNavigate }: {
  chapter: number;
  phase: 'intro' | 'outro';
  onFinish: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const { t } = useLang();
  const flow = panelsForChapter(chapter);
  const panels: StoryPanel[] = phase === 'intro' ? flow.intro : (flow.outro ?? []);
  const [idx, setIdx] = useState(0);
  const [textVisible, setTextVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const panel = panels[Math.min(idx, panels.length - 1)];

  // Texto progresivo por viñeta
  useEffect(() => {
    setTextVisible(false);
    const tm = setTimeout(() => setTextVisible(true), 250);
    return () => clearTimeout(tm);
  }, [idx]);

  const advance = () => {
    if (idx < panels.length - 1) {
      Sfx.select();
      setExiting(true);
      setTimeout(() => { setExiting(false); setIdx(i => i + 1); }, 180);
    } else {
      // Fin de las viñetas: intro → combate · outro → siguiente capítulo
      Sfx.confirm();
      setExiting(true);
      setTimeout(() => onFinish(), 300);
    }
  };

  if (!panel) return null;
  const ch = CHAPTERS.find(c => c.id === chapter);

  // Clases de efectos
  const fxClass = (panel.effects ?? []).map(e => `fx-${e}`).join(' ');

  return (
    <div className={`page-screen story-scene-screen ${exiting ? 'scene-exiting' : ''}`} onClick={advance}>
      <div className={`story-panel story-panel-${panel.layout.toLowerCase()} ${fxClass}`}>
        {/* Fondo del escenario */}
        <div className="story-panel-bg" style={{ backgroundImage: `url(${panel.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="story-panel-dim" />

        {/* Título de escena (FULL / IMPACT) */}
        {panel.title && (
          <div className="story-panel-title">
            <h2>{panel.title}</h2>
            {panel.subtitle && <p>{panel.subtitle}</p>}
          </div>
        )}

        {/* Personajes (retratos o sprites) */}
        {panel.characters && panel.characters.length > 0 && (
          <div className={`story-characters layout-${panel.layout.toLowerCase()}`}>
            {panel.characters.map((c, i) => {
              // Retrato REAL del GBC (story portraits 40×56 por saga/personaje)
              const url = storyPortraitUrl(c.character, c.form, c.emotion) || miniPortraitFor(c.character) || MENU_PORTRAITS[c.character];
              return (
                <div key={i} className={`story-character ${c.side ?? (i === 0 ? 'left' : 'right')}`}>
                  {url
                    ? <img src={url} alt={characterName(c.character)} className="story-portrait" />
                    : <div className="story-portrait story-portrait-none">{characterName(c.character).slice(0, 1)}</div>}
                  <span className="story-character-name">{characterName(c.character)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Diálogo */}
        {panel.dialogue && (
          <div className="story-dialogue">
            <div className="story-speaker">{panel.dialogue.speaker}</div>
            <div className={`story-text ${textVisible ? 'visible' : ''}`}>{panel.dialogue.text}</div>
          </div>
        )}
      </div>

      {/* Indicador de avance */}
      <div className="story-advance-hint">
        {idx + 1}/{panels.length} · {phase === 'intro' ? t('story.title') : t('story.epilogue')}
        {ch ? ` — ${t(ch.nameKey)}` : ''} · CLICK
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARACTERS — Grid de personajes
// ═══════════════════════════════════════════════════════════

function statProfile(f: { hp: number; str: number; ki: number; spd: number }) {
  const entries = [
    { key: 'HP', value: f.hp, score: f.hp / 10, role: 'Endurance' },
    { key: 'STR', value: f.str, score: f.str, role: 'Strike' },
    { key: 'KI', value: f.ki, score: f.ki, role: 'Beam' },
    { key: 'SPD', value: f.spd, score: f.spd, role: 'Tempo' },
  ].sort((a, b) => b.score - a.score);
  const top = entries[0];
  const power = Math.round((f.hp / 10 + f.str + f.ki + f.spd) / 4);
  return { top, power };
}

function CharactersScreen({ onNavigate, onSelectFighter }: {
  onNavigate: (s: Screen) => void; onSelectFighter: (formId: string) => void;
}) {
  const { t } = useLang();
  const [selected, setSelected] = useState<string>('goku_base');
  // Secuencia de transformación: flash + aura al cambiar de forma (como el GBC)
  const [transformFx, setTransformFx] = useState(0);

  const pickForm = (fid: string) => {
    if (fid === selected) return;
    Sfx.transform();
    setTransformFx(Date.now());
    setSelected(fid);
  };

  const sel = getForm(selected)!;
  const selChar = getCharacter(sel.character)!;
  const selUnlocked = isCharacterUnlocked(selChar.id);
  const unlockedForms = selChar.forms.filter(fid => isFormUnlocked(fid, loadProgress().level)).length;
  const profile = statProfile(sel);

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
                <div key={c.id} className="char-cell ui-char-card locked char-locked">
                  <div className="char-locked-icon"><Lock size={14} /></div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-forms">???</div>
                </div>
              );
            }
            return (
              <button key={c.id} className={`char-cell ui-char-card ${active ? 'active' : ''}`}
                onClick={() => setSelected(baseForm.id)}>
                <CharacterSprite formId={baseForm.id} height={64} className="char-thumb" />
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} {t('characters.forms')}</div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="char-detail ui-sidebar">
          <div className="char-detail-header">
            <div className={`char-detail-sprite-wrap ${transformFx ? 'transforming' : ''}`} key={transformFx}>
              {transformFx > 0 && <div className="transform-flash" />}
              <div className="transform-aura" />
              <CharacterSprite formId={selected} height={160} className="char-detail-sprite" />
            </div>
            <div className="char-detail-info">
              <div className="char-detail-name">{selChar.name}</div>
              <div className="char-detail-form">{t('characters.form')}: {sel.form}</div>
              <div className="char-detail-saga">{selChar.saga} {t('characters.saga')}</div>
              <div className="char-tier">{t('characters.tier')} {'★'.repeat(selChar.tier)}{'☆'.repeat(5 - selChar.tier)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-block">
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.hp')}</span><div className="ui-stat-track"><div className="ui-stat-fill hp" style={{ width: `${sel.hp / 6}%` }} /></div><span className="ui-stat-val">{sel.hp}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.str')}</span><div className="ui-stat-track"><div className="ui-stat-fill str" style={{ width: `${sel.str / 1.2}%` }} /></div><span className="ui-stat-val">{sel.str}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.ki')}</span><div className="ui-stat-track"><div className="ui-stat-fill ki" style={{ width: `${sel.ki / 1.2}%` }} /></div><span className="ui-stat-val">{sel.ki}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.spd')}</span><div className="ui-stat-track"><div className="ui-stat-fill spd" style={{ width: `${sel.spd}%` }} /></div><span className="ui-stat-val">{sel.spd}</span></div>
          </div>

          {/* Lore del personaje (rellena el panel como ficha de colección) */}
          <div className="char-lore">
            <span className="lore-label">SAGA · ROL</span>
            <span className="lore-text">{selChar.saga} — Tier {selChar.tier} · {selChar.forms.length} formas</span>
          </div>

          <div className="char-file">
            <div className="char-file-row"><span>PROFILE</span><b>{profile.top.role}</b></div>
            <div className="char-file-row"><span>POWER INDEX</span><b>{profile.power}</b></div>
            <div className="char-file-row"><span>BEST STAT</span><b>{profile.top.key} {profile.top.value}</b></div>
            <div className="char-file-row"><span>FORMS OPEN</span><b>{unlockedForms}/{selChar.forms.length}</b></div>
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
                  onClick={() => pickForm(fid)}>{f.form}</button>
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
    owned.has(c.id) &&
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
            <div className="deck-filters">
              {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(tp => (
                <button key={tp} className={`filter-chip ${filter === tp ? 'active' : ''}`}
                  onClick={() => setFilter(tp)}>{tp === 'all' ? t('deck.all') : CARD_TYPE_NAMES[tp]}</button>
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
          <span className="setting-label"><Volume2 size={12} /> {t('settings.bgmVolume')}</span>
          <input type="range" min={0} max={100} value={volume}
            onChange={e => setVolume(Number(e.target.value))} />
          <span className="setting-value">{volume}%</span>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Zap size={12} /> {t('settings.soundFx')}</span>
          <button className={`toggle ${sfx ? 'on' : ''}`} onClick={() => setSfx(!sfx)}>
            {sfx ? t('settings.on') : t('settings.off')}
          </button>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Gauge size={12} /> {t('settings.textSpeed')}</span>
          <div className="setting-options">
            <button className={`filter-chip ${speed === 'normal' ? 'active' : ''}`} onClick={() => setSpeed('normal')}>{t('settings.normal')}</button>
            <button className={`filter-chip ${speed === 'fast' ? 'active' : ''}`} onClick={() => setSpeed('fast')}>{t('settings.fast')}</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Monitor size={12} /> {t('settings.screen')}</span>
          <div className="setting-options">
            <button className={`filter-chip ${screenMode === 'windowed' ? 'active' : ''}`} onClick={() => setScreenMode('windowed')}>{t('settings.windowed')}</button>
            <button className={`filter-chip ${screenMode === 'fullscreen' ? 'active' : ''}`} onClick={() => setScreenMode('fullscreen')}>{t('settings.fullscreen')}</button>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Keyboard size={12} /> {t('settings.controls')}</span>
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
  const [difficulty, setDifficulty] = useState<'normal' | 'hard' | 'lethal'>('normal');
  const deckSize = loadDeck().length;
  const deckValid = deckSize === DECK_SIZE;
  const unlockedChars = loadUnlocks().characters;

  const sel = getForm(selected)!;
  const selChar = getCharacter(sel.character)!;
  const profile = statProfile(sel);

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
                <div key={c.id} className={`char-cell ui-char-card locked char-locked ${active ? 'active' : ''}`}>
                  <div className="char-locked-icon"><Lock size={14} /></div>
                  <div className="char-name">{c.name}</div>
                  <div className="char-forms">???</div>
                </div>
              );
            }
            return (
              <button key={c.id} className={`char-cell ui-char-card ${active ? 'active' : ''}`}
                onClick={() => setSelected(baseForm.id)}>
                <CharacterSprite formId={baseForm.id} height={64} className="char-thumb" />
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} {t('characters.forms')}</div>
              </button>
            );
          })}
        </div>
        <div className="char-detail ui-sidebar">
          <div className="versus-vs">{t('versus.vs')}</div>
          <CharacterSprite formId={selected} height={160} className="char-detail-sprite" />
          <div className="char-detail-name">{selChar.name}</div>
          <div className="char-detail-form">{sel.form}</div>
          <div className="stat-block">
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.hp')}</span><div className="ui-stat-track"><div className="ui-stat-fill hp" style={{ width: `${sel.hp / 6}%` }} /></div><span className="ui-stat-val">{sel.hp}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.str')}</span><div className="ui-stat-track"><div className="ui-stat-fill str" style={{ width: `${sel.str / 1.2}%` }} /></div><span className="ui-stat-val">{sel.str}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.ki')}</span><div className="ui-stat-track"><div className="ui-stat-fill ki" style={{ width: `${sel.ki / 1.2}%` }} /></div><span className="ui-stat-val">{sel.ki}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.spd')}</span><div className="ui-stat-track"><div className="ui-stat-fill spd" style={{ width: `${sel.spd}%` }} /></div><span className="ui-stat-val">{sel.spd}</span></div>
          </div>
          <div className="combat-file">
            <div className="combat-file-row"><span>THREAT</span><b>{profile.power}</b></div>
            <div className="combat-file-row"><span>STYLE</span><b>{profile.top.role}</b></div>
            <div className="combat-file-row"><span>DECK</span><b>{deckSize}/{DECK_SIZE}</b></div>
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
          {/* Dificultad (spec §7: Normal/Difícil/Letal) */}
          <div className="difficulty-select">
            <span className="diff-label">{t('settings.difficulty')}</span>
            <div className="diff-options">
              {(['normal', 'hard', 'lethal'] as const).map(d => (
                <button key={d} className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                  onClick={() => { Sfx.select(); setDifficulty(d); }}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={() => onStartVersus(selected)} disabled={!deckValid}>
            {deckValid ? `⚔ ${t('common.fight').toUpperCase()}` : `DECK ${deckSize}/${DECK_SIZE}`}
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
  const [storyScene, setStoryScene] = useState<{ chapter: number; phase: 'intro' | 'outro' } | null>(null);
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
    // El protagonista del capítulo (Gohan en el 1, no Goku — historia real del GBC)
    const ch = CHAPTERS.find(c => c.id === chapterId);
    if (ch) setPlayerForm(ch.player);
    // Historia lineal con viñetas manga: INTRO → COMBATE → OUTRO (no hay
    // exploración de mapa ni movimiento libre entre encuentros).
    setStoryScene({ chapter: chapterId, phase: 'intro' });
    setScreen('storyScene');
  };

  // La intro terminó: empezar la batalla del capítulo.
  // Fin de las viñetas: intro → empezar la batalla · outro → cerrar capítulo
  const finishStoryScene = () => {
    const phase = storyScene?.phase;
    const chapter = storyScene?.chapter;
    setStoryScene(null);
    if (phase === 'outro' && chapter) {
      // El OUTRO cierra el capítulo: progreso + recompensa de carta + volver
      // al mapa de historia (el intro ya encadenó la batalla).
      const next = chapter + 1;
      saveStoryProgress(Math.min(next, CHAPTERS.length));
      const u = loadUnlocks();
      const owned = ownedCards(u, loadProgress().level);
      const rewards = pickRewards(owned, 3);
      if (rewards.length > 0) {
        u.pendingReward = rewards;
        saveUnlocks(u);
      }
      setScreen('story');
      return;
    }
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const exitBattle = (won: boolean) => {
    if (won && storyChapter) {
      const flow = panelsForChapter(storyChapter);
      if (flow.outro && flow.outro.length > 0) {
        // Outro del capítulo antes de cerrarlo (el outro guarda progreso y
        // recompensa al terminar — evita duplicar recompensas)
        setStoryScene({ chapter: storyChapter, phase: 'outro' });
        setScreen('storyScene');
        return;
      }
      // Sin outro: guardar progreso aquí
      const next = storyChapter + 1;
      saveStoryProgress(Math.min(next, CHAPTERS.length));
    }
    if (won) {
      // Recompensa de carta (elegir 1 de 3) en STORY y Versus — como el GBC
      const u = loadUnlocks();
      const owned = ownedCards(u, loadProgress().level);
      const rewards = pickRewards(owned, 3);
      if (rewards.length > 0) {
        u.pendingReward = rewards;
        saveUnlocks(u);
      }
      // En Versus además se desbloquea el personaje vencido
      if (!storyChapter) {
        const form = getForm(enemyForm);
        if (form) {
          const charId = VS_UNLOCKS[form.id] || form.character;
          const newlyUnlocked = unlockCharacter(charId);
          if (newlyUnlocked) {
            setTimeout(() => alert(`${charId.toUpperCase()} UNLOCKED!`), 300);
          }
        }
      }
    }
    setScreen('main');
  };

  if (needsStarter) {
    return <StarterScreen onDone={() => setNeedsStarter(false)} />;
  }

  const screenEl = (() => {
    switch (screen) {
      case 'story': return <StoryScreen onNavigate={setScreen} onStartChapter={startChapter} />;
      case 'versus': return <VersusScreen onNavigate={setScreen} onStartVersus={startVersus} />;
      case 'deck': return <DeckScreen onNavigate={setScreen} />;
      case 'characters': return <CharactersScreen onNavigate={setScreen} onSelectFighter={startBattle} />;
      case 'cards': return <CardsScreen onNavigate={setScreen} />;
      case 'settings': return <SettingsScreen onNavigate={setScreen} />;
      case 'storyScene': return <StorySceneScreen key={`scene-${storyScene?.chapter}-${storyScene?.phase}`} chapter={storyScene?.chapter ?? 1} phase={storyScene?.phase ?? 'intro'} onFinish={finishStoryScene} onNavigate={setScreen} />;
      case 'battle': return <BattleScreen key={battleKey} playerFormId={playerForm} enemyFormId={enemyForm} storyChapter={storyChapter} onExit={exitBattle} />;
      default: return <MainMenu onNavigate={setScreen} />;
    }
  })();
  // Transición de entrada por pantalla (fade + slide sutil, estilo GBC)
  return <div key={screen === 'battle' ? `battle-${battleKey}` : screen} className="screen-enter">{screenEl}</div>;
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

// HMR limpio: desmontar el root en cada hot update de Vite para no
// re-crear createRoot sobre el mismo contenedor (error de dev).
if (import.meta.hot) {
  import.meta.hot.dispose(() => { root.unmount(); });
}

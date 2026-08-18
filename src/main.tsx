/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import './styles.css';
import { applyHudTheme, loadHudTheme } from './data/hudTheme';
import { applyHudLayout } from './data/hudLayout';
import { FORMS, CHARACTERS, getCharacter, getForm, idleSpriteUrl, statAtLevel, LIMIT_DEFAULTS, loadLimits, saveLimits } from './data/roster';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from './data/enemy_decks';
import { facingFlip, needsFlip } from './data/facing';
import { BattlePosition, POSITION_DATA, resolveRelativeDistance, isBeamVulnerable, isDamageVulnerable, anchorFor, applyMoveAxis, positionLabel, type MoveAxis } from './data/positions';
import { BATTLE_PORTRAITS } from './data/battlePortraits';
import { UNLOCK_KEY, STARTER_DAMAGE_DECK, STARTER_BEAM_DECK, STARTER_CHARACTERS, cardsForLevel, pickRewards, VS_UNLOCKS, isFormUnlocked, FORM_UNLOCK_LEVELS } from './data/unlocks';
import { CARDS, CARD_COLORS, CARD_COLORS_ON_LIGHT, CARD_TYPE_NAMES, CardDef, CardType, DECK_SIZE, MAX_COPIES, getCard, CardEffect } from './data/cards';
import { tipBlock, tipCard, TipPart } from './data/tooltips';
import {
  createBattleDeck, drawOne, playJoint, discardOne, needsDiscard,
  registerCardResolver, JointDeckState, HAND_MAX_TRANSITORY,
} from './battle/state';
import { resolveHitBlockAvoid, attackDamage } from './battle/combat';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from './data/cardVisuals';
import { cardIconUrl, MINI_PORTRAITS, MENU_PORTRAITS, TYPE_ICONS } from './data/icons';
import { FitArt } from './components/FitArt';
import { CardArtHole } from './components/CardArtHole';
import { overworldUrl } from './data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrl } from './data/battleOverworld';
import { panelsForChapter, type StoryPanel, characterName } from './data/storyPanels';
import { storyPortraitUrl } from './data/storyPortraits';
import { spriteManifestUrl, spriteFrameUrl, spriteDirFor } from './data/spriteManifest';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND, type BattleViewMode } from './data/scenarios';
import { GBC_NATIVE_FPS, type QteState } from './data/actionFidelity';
import { stageWindowsTicks, GAMEPLAY_CONFIG } from './config/gameplay.config';
import { stageInputPose, stageInputFieldPose, stageInputLunges } from './battle/stageInputMap';
import { nextStageSequence } from './battle/stageSequences';
import { nextTransformedForm } from './battle/transforms';
import { BattleTimeline, type CinematicEvent, type CinematicProfile } from './battle/timeline';
import { profileFor, type CinematicKind } from './battle/profiles';
import { actionSemanticsForCard } from './battle/actionProfiles';
import { resolveCombatPose, type BattleSpritePose } from './battle/spriteConfig';
import { isDebugCinematics, bindDebugControls, renderDebugOverlay, type CinematicDebugInfo, type CinematicDebugController } from './battle/debugCinematics';
import { isDebugState, bindQteDebugControls, renderStateOverlay, type StateDebugSnapshot } from './battle/debugState';
import { isPixiField } from './renderer/pixi/flag';
import { applyCinematicEvent } from './renderer/pixi/presentation/CinematicAdapter';
import type { PixiBattlePresentation } from './renderer/pixi/presentation/PixiBattlePresentation';
// Code-split: pixi.js (~790KB) solo se descarga cuando ?pixiField=1 está activo.
const BattlePixiStage = lazy(() => import('./battle/BattlePixiStage').then((m) => ({ default: m.BattlePixiStage })));
import { initAudio, Sfx, setSfxEnabled, setVolume as setVolumeSfx } from './audio/sfx';
import { playMusic, playMusicOnce, stopMusic, musicForScreen, setMusicVolume, setMusicEnabled } from './audio/music';
import { LanguageProvider } from './i18n/LanguageProvider';
import { useLang } from './i18n/useLang';
import { LANGUAGES, LangCode, TKey } from './i18n';
import { ArrowLeft, X, Lock, ChevronRight, Languages, Sword, Shield, BookOpen, Swords, Library, Users, Settings, Sparkles, Volume2, Zap, Gauge, Monitor, Keyboard, Music, type LucideIcon } from 'lucide-react';
// El Dev Studio SOLO existe en development/preview: en release (--mode release)
// esta rama muerta se elimina del bundle (import.meta.env.MODE es constante).
import type { DevStudioProps } from './devtools/DevStudioTypes';
const DevStudioLazy = lazy(() => import('./devtools/DevStudio').then(m => ({ default: m.DevStudio })));
const DevStudio: React.ComponentType<DevStudioProps> | null = import.meta.env.MODE === 'release' ? null : DevStudioLazy;
import { isDevRoute } from './devtools/route';

// ═══════════════════════════════════════════════════════════
// DBZ LSW Fangame — Estilo Magazine GBC Auténtico
// Sprites reales, mecánicas fieles, pixel art nítido, 10 idiomas
// ═══════════════════════════════════════════════════════════

type Screen = 'main' | 'story' | 'battle' | 'storyScene' | 'versus' | 'deck' | 'characters' | 'cards' | 'settings';

// Aplicar el tema HUD guardado al arrancar (el HUD Studio lo persiste).
try { applyHudTheme(loadHudTheme()); } catch { /* SSR / sin DOM */ }
// Contrato visual canónico (baseline V1): geometría estructural del HUD
// en :root — juego, preview del dev y Combat Lab consumen las mismas vars.
try { applyHudLayout(); } catch { /* SSR / sin DOM */ }

type BattlePhase = 'position' | 'command' | 'basic' | 'limitSelect' | 'cardSelect' | 'stageInput' | 'enemyTurn' | 'defend' | 'discard' | 'win' | 'lose';

type CommandType = 'LIMIT' | 'J' | 'B' | 'C';

// Tooltip canónico de BACK (mismo formato estructurado en todos los paneles)
const TIP_BACK: TipPart[] = [['desc', 'Volver al menú anterior']];

interface CharManifest {
  [pose: string]: { frames: { file: string; w: number; h: number }[]; fps: number; loop: boolean };
}

const SPRITE_MANIFEST_CACHE = new Map<string, CharManifest>();
const SPRITE_MANIFEST_PROMISES = new Map<string, Promise<CharManifest | null>>();

// Los frames del zip FIXED están recortados a su bounding box (w/h variables
// por frame), lo que hace "respirar" al sprite si se pintan a su tamaño real.
// Para una animación estable anclamos cada frame abajo-centrado dentro de un
// canvas fijo = max W/H de TODOS los poses de la forma (ground line estable).
const SPRITE_BOUNDS_CACHE = new Map<string, { maxW: number; maxH: number }>();

function manifestBounds(manifest: CharManifest): { maxW: number; maxH: number } {
  let maxW = 0, maxH = 0;
  for (const pose of Object.values(manifest)) {
    for (const f of pose.frames) {
      if (f.w > maxW) maxW = f.w;
      if (f.h > maxH) maxH = f.h;
    }
  }
  return { maxW, maxH };
}

// Contador monotónico para keys React (evita la colisión de Date.now() al
// generar varios ids en el mismo milisegundo — p.ej. varios damage numbers).
let __reactUid = 0;
const nextUid = () => ++__reactUid;

const OFFENSIVE_SUPPORT_EFFECTS = new Set<CardEffect>([
  'life_drain', 'knockdown_dmg', 'knockdown_min', 'gamebomb', 'candy',
  'naughty_book', 'ohko_lowacc', 'android_kill', 'damage',
]);

const DEFENSIVE_EFFECTS = new Set<CardEffect>([
  'avoid_beam', 'avoid_damage', 'avoid_damage_taiyoken', 'reduce_damage',
  'absorb_beam', 'beam_shield', 'damage_shield', 'command_cancel',
]);

function resolveManifestPose(manifest: CharManifest, pose: BattleSpritePose | string): string | null {
  return resolveCombatPose(pose, p => manifest[p]?.frames?.length > 0);
}

function cardBattlePose(card: CardDef, context: 'field' | 'fx' = 'field'): BattleSpritePose {
  if (card.type === 'beam') return context === 'fx' ? 'beam_fire' : 'beam_charge';
  if (card.type === 'damage' || card.type === 'command') return 'attack_fwd';
  if (card.type === 'defense' || DEFENSIVE_EFFECTS.has(card.effect)) return 'guard';
  if (OFFENSIVE_SUPPORT_EFFECTS.has(card.effect)) return 'attack_fwd';
  return 'gather_power';
}

function cardProjectileClass(card: CardDef): string {
  const visual = actionSemanticsForCard(card).visual;
  return `visual-${visual}`;
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

// Retratos de menú con fondo recortado (transparente) para integrarse en la
// tarjeta CONTINUAR del menú principal (2026-08-12: el fondo gris original del
// asset LSW 40×56 se veía como un recuadro separado; el recorte lo funde con
// el tema oscuro de la tarjeta). Generados por scripts desde menu/ → menu_cut/.
const MENU_PORTRAITS_CUT: Record<string, string> = {
  goku: '/assets/portraits/menu_cut/cell_00_00.png',
  vegeta: '/assets/portraits/menu_cut/cell_00_01.png',
  gohan: '/assets/portraits/menu_cut/cell_00_02.png',
  piccolo: '/assets/portraits/menu_cut/cell_00_03.png',
  krillin: '/assets/portraits/menu_cut/cell_00_04.png',
  trunks: '/assets/portraits/menu_cut/cell_00_05.png',
  goten: '/assets/portraits/menu_cut/cell_00_06.png',
  gotenks: '/assets/portraits/menu_cut/cell_00_07.png',
  frieza: '/assets/portraits/menu_cut/cell_01_00.png',
  cell: '/assets/portraits/menu_cut/cell_01_01.png',
  buu: '/assets/portraits/menu_cut/cell_01_02.png',
  nappa: '/assets/portraits/menu_cut/cell_01_03.png',
  ginyu: '/assets/portraits/menu_cut/cell_01_04.png',
  recoome: '/assets/portraits/menu_cut/cell_01_05.png',
  guldo: '/assets/portraits/menu_cut/cell_01_06.png',
  jeice: '/assets/portraits/menu_cut/cell_01_07.png',
  burter: '/assets/portraits/menu_cut/cell_01_08.png',
  android_16: '/assets/portraits/menu_cut/cell_02_00.png',
  android_17: '/assets/portraits/menu_cut/cell_02_01.png',
  android_18: '/assets/portraits/menu_cut/cell_03_00.png',
  android_19: '/assets/portraits/menu_cut/cell_03_01.png',
  android_20: '/assets/portraits/menu_cut/cell_03_02.png',
  cell_jr: '/assets/portraits/menu_cut/cell_03_03.png',
};

// ─── Retratos (Sprite Database) ────────────────────────────
const PORTRAITS: Record<string, string> = MENU_PORTRAITS;

// Alias de personajes separados → retrato del personaje base (GBC)
const CHAR_PORTRAIT_ALIAS: Record<string, string> = {
  gohan_kid: 'gohan', gohan_adult: 'gohan',
  trunks_kid: 'trunks', trunks_future: 'trunks',
};

function portraitFor(charId: string, formId?: string): string | undefined {
  // Prioridad: retrato de BATALLA pixel-perfect por formId (32×24 del GBC)
  if (formId && BATTLE_PORTRAITS[formId]) return BATTLE_PORTRAITS[formId];
  return PORTRAITS[CHAR_PORTRAIT_ALIAS[charId] ?? charId];
}

function miniPortraitFor(charId: string): string | undefined {
  return MINI_PORTRAITS[CHAR_PORTRAIT_ALIAS[charId] ?? charId];
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
function useSpriteAnim(formId: string, pose: string): { src: string; w: number; h: number; maxW: number; maxH: number } | null {
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
  let bounds = SPRITE_BOUNDS_CACHE.get(formId);
  if (!bounds) { bounds = manifestBounds(manifest); SPRITE_BOUNDS_CACHE.set(formId, bounds); }
  return { src: spriteFrameUrl(formId, f.file), w: f.w, h: f.h, maxW: bounds.maxW, maxH: bounds.maxH };
}

// ─── Precarga de sprites de combate ───────────────────────
// loadManifest: única fuente del fetch+dedup del manifest (comparte cache y
// promise con useSpriteAnim, así no hay doble fetch).
function loadManifest(formId: string): Promise<CharManifest | null> {
  const cached = SPRITE_MANIFEST_CACHE.get(formId);
  if (cached) return Promise.resolve(cached);
  const pending = SPRITE_MANIFEST_PROMISES.get(formId);
  if (pending) return pending;
  const url = spriteManifestUrl(formId);
  if (!url) return Promise.resolve(null);
  const promise = fetch(url)
    .then(r => (r.ok ? (r.json() as Promise<CharManifest>) : null))
    .then(m => { if (m) SPRITE_MANIFEST_CACHE.set(formId, m); SPRITE_MANIFEST_PROMISES.delete(formId); return m; })
    .catch(() => { SPRITE_MANIFEST_PROMISES.delete(formId); return null; });
  SPRITE_MANIFEST_PROMISES.set(formId, promise);
  return promise;
}

// Precarga TODOS los frames PNG de una forma (poses completas) para eliminar el
// pop-in del primer render de cada pose (idle/move/attack/beam/hurt...).
function preloadFormSprites(formId: string): Promise<void> {
  return loadManifest(formId).then(async manifest => {
    if (!manifest) return;
    const files = new Set<string>();
    for (const anim of Object.values(manifest)) {
      for (const f of anim.frames) files.add(spriteFrameUrl(formId, f.file));
    }
    await Promise.all([...files].map(src => new Promise<void>(res => {
      const im = new Image();
      im.onload = () => res();
      im.onerror = () => res();
      im.src = src;
    })));
  });
}

// ─── Sprite del luchador (animado si hay manifest; null si no) ───
// Memo: props estables (formId/pose/scale) → el componente NO se re-renderiza
// cuando BattleScreen cambia de estado (QTE 60fps, logs, HP) si sus props no
// cambiaron. Es el mayor win de rendimiento: los fighters no se re-renderizan
// por cada frame del reloj del Stage Attack.
const FighterSprite = memo(function FighterSprite({ formId, pose, side, scale = 8, flash = false }: {
  formId: string; pose: string; side?: 'left' | 'right'; scale?: number; flash?: boolean;
}) {
  const anim = useSpriteAnim(formId, pose);
  if (!anim) return null;
  const px = Math.round(anim.h * scale / 8);
  const pw = Math.round(anim.w * scale / 8);
  const cw = Math.round(anim.maxW * scale / 8);
  const ch = Math.round(anim.maxH * scale / 8);
  const baseFlip = side ? facingFlip(formId, side) : 1;
  const flip = pose === 'move_back' ? -baseFlip : baseFlip;
  return (
    <div className={`fighter-sprite ${flash ? 'flash' : ''}`}
      style={{ transform: `scaleX(${flip})`, width: cw, height: ch, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <img src={anim.src} alt={formId} style={{ imageRendering: 'pixelated', width: pw, height: px }} />
    </div>
  );
});

// ─── Sprite idle recortado de un sheet auténtico ─────────
// Battle Overworld con taxonomía canónica (docs/SPRITE_TAXONOMY.md):
// · pose 'idle' (o sin gather): muestra battle_overworld_idle (NO entra en power-up)
// · pose 'gather_power': secuencia animada determinista por reloj GBC:
//      fase B (breve)  → gather_power_pose (brazos arriba, sin aura)
//      fase C (resto)  → gather_power_pose + aura PARPADEANDO rápido
//                        (haz de luz emergiendo, on/off cada ~3 frames GBC)
//   El power-up NUNCA muestra idle: idle es el estado previo (sin power-up).
// · fallback: idleSrc (chibi *_ow.png) si no hay battle_overworld extraído
// Memo: el overworld no se re-renderiza por frames del QTE si sus props no
// cambiaron (mismo win que FighterSprite).
const BattleOverworldSprite = memo(function BattleOverworldSprite({ formId, pose, side, idleSrc }: {
  formId: string; pose: string; side?: 'left' | 'right'; idleSrc?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const flip = side ? facingFlip(formId, side) : 1;
  const isGather = pose === 'gather_power';
  const [gatherPhase, setGatherPhase] = useState<'pose' | 'aura'>('pose');
  const [auraOn, setAuraOn] = useState(false);

  // Secuencia Gather Power determinista por frames GBC (sin setInterval suelto):
  // B=brazos arriba (primeros 10f) → C=pose+aura parpadeando (el aura alterna
  // cada 3f para simular el haz emergiendo). Nunca hay fase idle en power-up.
  useEffect(() => {
    if (!isGather) {
      setGatherPhase('pose');
      setAuraOn(false);
      return;
    }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const delta = ((now - last) / 1000) * GBC_NATIVE_FPS;
      last = now;
      acc += delta;
      const f = Math.floor(acc);
      if (f < 10) { setGatherPhase('pose'); setAuraOn(false); }
      else {
        setGatherPhase('aura');
        setAuraOn(Math.floor((f - 10) / 3) % 2 === 0); // parpadeo rápido
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isGather]);

  const showPose = isGather;
  const showAura = isGather && gatherPhase === 'aura' && auraOn;
  const poseSrc = battleOverworldActorUrl(formId, showPose ? 'gather_power_pose' : 'idle');
  const auraSrc = battleOverworldAuraUrl(formId);

  // Si no hay battle_overworld extraído, usar el chibi *_ow.png estándar
  const src = poseSrc && failedSrc !== poseSrc ? poseSrc : idleSrc;
  if (!src) return null;

  return (
    <div className={`battle-overworld ${showAura ? 'gathering' : ''}`}
      style={{ transform: `scaleX(${flip})` }}>
      <img src={src} alt={formId} className="overworld-sprite" onError={() => setFailedSrc(src)} />
      {auraSrc && showAura && <img src={auraSrc} alt="" className="gather-power-aura" />}
    </div>
  );
});

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
function HPBar({ current, max, side, introFill = false }: { current: number; max: number; side: 'left' | 'right'; introFill?: boolean }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  // Umbrales VISUALES (derivados del HP existente, sin gameplay nuevo):
  // >50% verde · 25–50% verde/amarillo (mid) · 12–25% naranja (low) ·
  // <12% rojo crítico (critical, parpadeo steps)
  const level = pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
  return (
    <div className={`hp-bar ${side} ${level} ${introFill ? 'intro-fill' : ''}`}>
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
// Frames GBC por tipo de carta (paquete DBZ_LSW_COMBAT_UI_V2_MAPPED)
// Marcos GBC por tipo: los frame_card_*_color del paquete diferencian el
// tipo por el COLOR del marco (como el GBC real).
registerCardResolver(id => getCard(typeof id === 'number' ? id : Number(id)));

const CARD_TYPE_FRAME: Record<string, string> = CARD_FRAME_BY_TYPE;

function CardVisual({ card, selected, onClick, small, disabled }: {
  card: CardDef; selected?: boolean; onClick?: () => void; small?: boolean; disabled?: boolean;
}) {
  const color = CARD_COLORS[card.type];
  const iconUrl = cardIconUrl(card.id);
  const IconCmp = TYPE_ICONS[card.type];
  const stars = '★'.repeat(card.rarity) + '☆'.repeat(5 - card.rarity);
  const compat = card.compatible && card.compatible.length > 0
    ? `\nUsable por: ${card.compatible.map(id => characterName(id)).join(', ')}`
    : card.notCompatible && card.notCompatible.length > 0
      ? `\nNO usable por: ${card.notCompatible.map(id => characterName(id)).join(', ')}`
      : '';
  // Frame GBC por tipo (la carta SE VE como el GBC: marco + arte interior)
  const frameUrl = disabled ? CARD_FRAME_DISABLED : selected ? CARD_FRAME_SELECTED : (CARD_TYPE_FRAME[card.type] ?? undefined);
  // Tooltip ENRIQUECIDO y ESTRUCTURADO (HTML canónico tipCard): título con
  // tipo coloreado + stats + descripción + efecto + compatibilidad — con el
  // estilo del diálogo GBC (fuente pixel, fondo blanco, texto negro carbón).
  const richTip = tipCard(card.name, CARD_TYPE_NAMES[card.type], CARD_COLORS_ON_LIGHT[card.type], card.rarity, [
    ['stats', `CC ${card.cc} · ATK ${card.atk > 0 ? card.atk : '—'} · ACC ${card.acc}%`],
    card.description ? ['desc', card.description] : null,
    ['effect', `Efecto: ${cardEffectSummary(card.effect)}`],
    compat.trim() ? ['compat', compat.trim()] : null,
  ]);
  return (
    <button className={`card ${card.type} ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      onClick={onClick} disabled={disabled}
      style={{ '--card-color': color, '--card-frame': frameUrl ? `url('${frameUrl}')` : undefined } as React.CSSProperties}
      data-tip={richTip}>
      <div className="card-header">
        <span className="card-icon">
          {iconUrl ? <img className="card-icon-img" src={iconUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} /> : <IconCmp size={16} strokeWidth={2.2} />}
        </span>
        <span className="card-cc">{card.cc}CC</span>
      </div>
      <CardArtHole frameUrl={frameUrl} iconUrl={iconUrl} />
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

function canPlayInAttack(card: CardDef): boolean {
  return card.type === 'command' || card.type === 'damage' || card.type === 'beam' || card.type === 'support' || card.type === 'special';
}

function canPlayInDefense(card: CardDef): boolean {
  return card.type === 'defense' || card.type === 'support' || card.type === 'special';
}

// Compatibilidad de carta por personaje (campo `compatible` de la ROM):
// undefined/[] = todos los luchadores; si lista, solo esos personajes.
// `notCompatible` = lista EXCLUIDA (el resto puede usarla) — p.ej. Stop Device
// no lo pueden usar los androides (Users=43/48 de la tabla ROM).
function cardUsableBy(card: CardDef, charId: string): boolean {
  if (card.compatible && card.compatible.length > 0 && !card.compatible.includes(charId)) return false;
  if (card.notCompatible && card.notCompatible.includes(charId)) return false;
  return true;
}

function cardEffectSummary(effect: CardEffect): string {
  switch (effect) {
    case 'damage':
    case 'damage_pierce':
    case 'damage_special':
    case 'damage_special_team':
    case 'damage_special_lowacc':
    case 'damage_low_acc':
      return 'Physical strike sequence. Uses action sprites and impact timing.';
    case 'beam':
    case 'beam_team':
    case 'beam_suicide':
    case 'beam_varhp':
      return 'Energy attack. Opens cinematic action view and projectile travel.';
    case 'heal_25pct':
    case 'heal_strong':
    case 'heal_light':
      return 'Recovery support. Restores HP during the support phase.';
    case 'avoid_beam':
    case 'avoid_damage':
    case 'avoid_damage_taiyoken':
    case 'reduce_damage':
    case 'absorb_beam':
    case 'beam_shield':
    case 'damage_shield':
      return 'Defensive timing card. Reacts to incoming attacks or beams.';
    case 'command_cancel':
      return 'Interrupts or redirects the command sequence.';
    case 'special_card':
      return 'Rare special effect. Timing depends on the active battle state.';
    default:
      if (effect.startsWith('command_')) return 'Command chain card. Defines the action phase rhythm.';
      if (effect.startsWith('buff_')) return 'Power-up support. Improves fighter stats for the next exchange.';
      if (effect.startsWith('debuff_')) return 'Pressure support. Weakens the rival before the next exchange.';
      return 'Support effect. Applies during the card resolution phase.';
  }
}

function cardCompatibilityLabel(card: CardDef): string {
  if (card.compatible && card.compatible.length > 0) {
    return card.compatible.map(id => characterName(id)).join(', ');
  }
  if (card.notCompatible && card.notCompatible.length > 0) {
    return `All except ${card.notCompatible.map(id => characterName(id)).join(', ')}`;
  }
  return 'All fighters';
}

// ═══════════════════════════════════════════════════════════
// TOOLTIP GLOBAL (portal) — nunca se corta por overflow/z-index
// Cualquier elemento con `data-tip` muestra su texto al hover,
// posicionado en el body con position:fixed (se adapta arriba/abajo).
// ═══════════════════════════════════════════════════════════
function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; dir: 'top' | 'bottom' } | null>(null);

  useEffect(() => {
    let cur: HTMLElement | null = null;
    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (!t) { setTip(null); cur = null; return; }
      if (cur === t) return;
      cur = t;
      const text = t.getAttribute('data-tip') || '';
      if (!text) { setTip(null); return; }
      const r = t.getBoundingClientRect();
      const dir: 'top' | 'bottom' = r.top > 150 ? 'top' : 'bottom';
      setTip({ text, x: r.left + r.width / 2, y: dir === 'top' ? r.top : r.bottom, dir });
    };
    const onOut = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (!t) { setTip(null); cur = null; return; }
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (!related || !related.closest?.('[data-tip]') || related.closest('[data-tip]') !== t) {
        setTip(null); cur = null;
      }
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => { document.removeEventListener('mouseover', onOver); document.removeEventListener('mouseout', onOut); };
  }, []);

  if (!tip) return null;
  const MAX_W = 300;
  const half = MAX_W / 2;
  const left = Math.max(half + 8, Math.min(tip.x, window.innerWidth - half - 8));
  // El tooltip de las cartas lleva HTML estructurado (tt-title/stats/desc);
  // el resto de tooltips son texto plano (los nombres/HP del HUD, botones).
  const isHtml = tip.text.includes('tt-title');
  return createPortal(
    <div className={`global-tooltip dir-${tip.dir}`} style={{ left, top: tip.y }}
      dangerouslySetInnerHTML={isHtml ? { __html: tip.text } : undefined}>
      {isHtml ? null : tip.text}
    </div>,
    document.body
  );
}

// ─── Mano ─────────────────────────────────────────────────
function HandComponent({ cards, selectedIndex, onSelect, isPlayable }: {
  cards: CardDef[]; selectedIndex: number | null; onSelect: (i: number) => void; isPlayable?: (card: CardDef) => boolean;
}) {
  const { t } = useLang();
  const usable = cards.filter(c => isPlayable ? isPlayable(c) : true);
  return (
    <div className="hand-area">
      <div className="hand-label">— {t('battle.hand')} —</div>
      <div className="hand-cards">
        {cards.length === 0 && (
          <div className="hand-empty-slot" title="NO CARD">
            <img src="/assets/ui/hud_buttons/no_card_red.png" alt="NO CARD" className="hand-no-card" />
          </div>
        )}
        {cards.map((card, i) => (
          <CardVisual key={card.id + '-' + i} card={card}
            selected={i === selectedIndex} disabled={isPlayable ? !isPlayable(card) : false}
            onClick={() => onSelect(i)} />
        ))}
      </div>
      {cards.length > 0 && usable.length === 0 && (
        <div className="hand-hint">{t('battle.insufficientCc')}</div>
      )}
    </div>
  );
}

// ─── Número de daño ───────────────────────────────────────
function DamageNumber({ value, type, x, y }: { value: number; type: 'damage' | 'heal' | 'miss' | 'guard'; x: number; y: number }) {
  const { t } = useLang();
  const text = type === 'miss' ? t('battle.miss') : type === 'guard' ? t('battle.guard') : `${value > 0 ? '-' : '+'}${Math.abs(value)}`;
  return <div className={`damage-number ${type}`} style={{ left: x, top: y }}>{text}</div>;
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

  // Transformación en combate (cartas Sup.Saiyan-2/3): el sprite cambia a la
  // forma siguiente del personaje (goku_base → goku_super_saiyan → ...).
  // La prop playerFormId NO se muta; este estado derivado solo vive durante
  // el combate y se descarta al salir (vuelta al form base en menús).
  const [playerTransformedForm, setPlayerTransformedForm] = useState<string | null>(null);
  const activePlayerFormId = playerTransformedForm ?? playerFormId;

  const [player, setPlayer] = useState<Fighter>(() => {
    const base: Fighter = {
      id: pf.character, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,
      level: prog.level, maxHp: pf.hp, hp: pf.hp,
      str: pf.str, ki: pf.ki, spd: pf.spd, maxCc: 99, cc: 0,
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
      str: af.str, ki: af.ki, spd: af.spd, maxCc: 99, cc: 0,
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
      maxCc: 99, cc: 0, battlePos: BattlePosition.DOWN_BACK, limits: [],
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
      maxCc: 99, cc: 0,
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

  // BSO de resultado: victoria/derrota al resolver el combate (jingle → BGM)
  useEffect(() => {
    if (phase === 'win') { playMusic('victory'); }
    else if (phase === 'lose') { playMusic('game_over'); }
  }, [phase]);

  // Tema de combate: jefes de saga (cap. ≥15, Android/Buu) suenan con Epic Battle
  useEffect(() => {
    if (storyChapter != null && storyChapter >= 15) playMusic('epic_battle');
  }, [storyChapter]);
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
  // ── ESTADO REAL DEL MAZO (spec GameFAQs) ──
  // El mazo Joint se baraja UNA vez al iniciar; drawPile (17) + hand (3).
  // Cada ATTACK PHASE roba 1 del drawPile; las Joint usadas van al
  // discardPile. Nunca se vuelve a sortear el deck original.
  // ⚠️ FIDELITY V10 — el mazo SIEMPRE son las 20 cartas configuradas (el
  // manual describe "exactly 20 Joint Cards"); la compatibilidad es de la
  // HABILIDAD/personaje, NO del mazo: se aplica al mostrar (carta gris/
  // no seleccionable). CHARA recalcula qué cartas de la misma mano son
  // usables al intercambiar. Filtrar el deck alteraba probabilidades.
  const [deckState, setDeckState] = useState<JointDeckState>(() =>
    createBattleDeck(loadDeck()));
  const { hand, drawPile, discardPile } = deckState;

  // ── MAZO REAL DEL ENEMIGO ──
  // El rival también baraja su mazo UNA vez y roba de su drawPile en cada
  // Attack Phase (como el jugador). En story usa el mazo REAL del jefe
  // (STORY_ENEMY_DECKS); en versus un deck genérico de 20. La IA analiza
  // SOLO su mano (nunca el pool global infinito) y las Joint usadas van a
  // su discardPile. Ref para que enemyAttack lea el estado fresco.
  const [eDeckState, setEDeckState] = useState<JointDeckState>(() => {
    const ids = storyChapter ? (STORY_ENEMY_DECKS[storyChapter] || []) : STARTER_DAMAGE_DECK;
    return createBattleDeck(ids);   // las 20 del jefe, sin filtrar
  });
  const eDeckRef = useRef(eDeckState);
  eDeckRef.current = eDeckState;
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([t('battle.start')]);
  // Cuadro de diálogo GBC: mensaje grande blanco/negro durante las acciones
  const [gbcMsg, setGbcMsg] = useState<string | null>(null);
  const gbcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showGbc = useCallback((msg: string, durMs = 2800) => {
    setGbcMsg(msg);
    if (gbcTimer.current) clearTimeout(gbcTimer.current);
    gbcTimer.current = setTimeout(() => setGbcMsg(null), durMs);
  }, []);
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
      overworldUrl(playerFormId), overworldUrl(enemyFormId),
      BATTLE_PORTRAITS[playerFormId], BATTLE_PORTRAITS[enemyFormId],
      scenario.overviewBackground, scenario.actionBackground,
    ].filter((u): u is string => !!u);
    // Formas a precargar (incluye aliado y 2º jefe en combates 2v2).
    const forms = [playerFormId, enemyFormId];
    if (teamBattle?.ally) forms.push(teamBattle.ally);
    if (teamBattle?.enemy2) forms.push(teamBattle.enemy2);
    const total = urls.length + forms.length;
    let done = 0; let fired = false;
    const finish = () => { if (!fired) { fired = true; setLoading(false); } };
    const to = setTimeout(finish, 1600); // tope de seguridad
    const mark = () => { done++; if (done >= total) { clearTimeout(to); finish(); } };
    urls.forEach(u => {
      const im = new Image();
      im.onload = im.onerror = mark;
      im.src = u;
    });
    // Precargar manifest + TODOS los frames de cada forma (cero pop-in).
    forms.forEach(fid => { preloadFormSprites(fid).then(mark).catch(mark); });
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Fade suave al alternar TACTICAL ↔ ACTION
  // ⚠️ FIDELITY V10 — el GBC alterna TACTICAL ↔ ACTION con CORTE DURO
  // (frame N → frame N+1, sin fade/zoom/blur — el propio CINEMATIC_GRAMMAR
  // lo exige). El view-fade queda desactivado hasta tener una captura del
  // original que demuestre un efecto específico.
  // (useEffect desactivado: setViewFade(v => v + 1), [viewMode]);
  const gbcMs = (frames: number) => Math.round((frames / GBC_NATIVE_FPS) * 1000);
  const showPhaseCue = (title: string, sub: string, next: () => void, frames = 38) => {
    setPhaseCue({ id: nextUid(), title, sub });
    window.setTimeout(() => {
      setPhaseCue(null);
      next();
    }, gbcMs(frames));
  };
  // Desplazamiento del lunge del QTE según la distancia real entre luchadores:
  // FAR/MID/CLOSE (resolveRelativeDistance). El lunge NUNCA debe invadir el
  // espacio del rival — en CLOSE (FRONT+FRONT) el avance es mínimo.
  const lungePx = (a: BattlePosition, b: BattlePosition): number => {
    const dist = resolveRelativeDistance(a, b);
    return dist === 'CLOSE' ? 16 : dist === 'MID' ? 30 : 44;
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
    setTimeout(() => setHitShake(null), gbcMs(19)); // 19 ticks ≈ 318ms (HYPOTHESIS)
  };
  // Stat stages reales: -3..+3 (cada stage = 8 unidades internas, como el GBC)
  const [pStages, setPStages] = useState({ str: 0, ki: 0, spd: 0, guard: 0 });
  // Buffs temporales del GBC: se desvanecen tras ~3 turnos ("fade over time")
  const [buffTurns, setBuffTurns] = useState(0);
  const [eBuffTurns, setEBuffTurns] = useState(0);
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
  type CardFxStep = 'attacker' | 'travel' | 'target' | 'return';
  const [cardFx, setCardFx] = useState<{ card: CardDef; side: 'player' | 'enemy'; step: CardFxStep; visual: string } | null>(null);
  const cinematicTimers = useRef<number[]>([]);
  // Precisión/evasión (Reading Ki / Afterimage / Lock On): flags temporales
  const [pLockOn, setPLockOn] = useState(false);
  const [pAcc, setPAcc] = useState(0);   // turnos de +30% precisión
  const [pEva, setPEva] = useState(0);   // turnos de +30% evasión
  // Guardia activa: defensa usada en el turno que mitiga el próximo ataque enemigo
  const [playerGuard, setPlayerGuard] = useState<null | { type: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel' }>(null);
  // Gather Power: PowerState real (FULL_POWER → HALF_POWER → NORMAL)
  const [powerState, setPowerState] = useState<'NORMAL' | 'HALF_POWER' | 'FULL_POWER'>('NORMAL');
  const [gatherTurns, setGatherTurns] = useState(0);
  const gatherStartedRoundRef = useRef<number | null>(null);
  // ── Stage Attack: QTE del GBC (manual USA §Stage Attack, docs/ACTION_FIDELITY.md) ──
  // Ventana GLOBAL para TODA la secuencia (no un timer por input), contada en
  // FRAMES GBC (GBC_NATIVE_FPS). El límite depende de la combinación Front/Back
  // de atacante y rival — 4 ventanas exactas del manual.
  type StageKey = 'A' | 'B' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  type StageDepthPair = 'BACK_BACK' | 'BACK_FRONT' | 'FRONT_BACK' | 'FRONT_FRONT';
  interface StageQteState {
    state: QteState;
    seq: StageKey[];
    idx: number;
    correct: number;
    card: CardDef | null;
    elapsedFrames: number;
    limitFrames: number;      // ventana GLOBAL de la secuencia (manual)
    counterFrames: number;    // frames transcurridos en la ventana de contraataque
    covering: boolean;        // el jugador se cubre (eligió A en el contraataque)
    result: 'FULL_SUCCESS' | 'SAFE_ABORT' | 'COUNTER_HIT' | null;
  }
  // ⚠️ Tabla VERIFICADA del manual GBC USA (2026-08-12): ventanas TOTALES del
  // Stage Attack según la posición relativa de atacante y rival:
  //   atacante REAR + rival REAR  = 1.2s  (~72f)
  //   atacante REAR + rival FRONT = 1.7s  (~102f)
  //   atacante FRONT + rival REAR = 2.4s  (~143f)
  //   atacante FRONT + rival FRONT = 2.9s (~173f)
  // Convertidas a frames GBC (×59.7275). El manual NUNCA da ventana por input:
  // el reloj es el tiempo para COMPLETAR LA SECUENCIA COMPLETA.
  const STAGE_SEQUENCE_WINDOW: Record<StageDepthPair, number> = stageWindowsTicks();
  // Ventana de contraataque (manual GBC §Stage Attack): tras fallar, el rival
  // contraataca y aparece ENTER COMMAND. Ventanas cortas por botón (guía de la
  // comunidad — HYPOTHESIS hasta captura ROM): A ≈ 0.4s · B ≈ 0.15s.
  const COUNTER_A_FRAMES = Math.round(0.4 * GBC_NATIVE_FPS);   // ~24f defenderte
  const COUNTER_B_FRAMES = Math.round(0.15 * GBC_NATIVE_FPS);  // ~9f reparar
  const [stageQte, setStageQte] = useState<StageQteState>({
    state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null,
    elapsedFrames: 0, limitFrames: 0, counterFrames: 0,
    result: null,
  });
  // IA real del GBC (battle.shtml): ataca regularmente → gather power →
  // 5 Stage Attack → Beam/Damage → repite. No usa energy cards sin gather.
  const aiRef = useRef({ mode: 0, attacks: 0, gathered: false, gatherStreak: 0 });
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [limits, setLimits] = useState<number[]>(() => {
    const assigned = loadLimits(playerFormId);
    return assigned.length > 0 ? assigned : LIMIT_DEFAULTS[getForm(playerFormId)?.character || ''] || [];
  });

  useEffect(() => {
    setBgId(BATTLE_BGS[Math.floor(Math.random() * BATTLE_BGS.length)].id);
  }, []);

  const addLog = useCallback((msg: string, opts?: { gbc?: boolean; durMs?: number }) => {
    setLog(prev => [...prev.slice(-6), msg]);
    if (opts?.gbc !== false) showGbc(msg, opts?.durMs);
  }, [showGbc]);
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
      case 'beam': return gbcMs(156);
      case 'damage': return gbcMs(136);
      case 'support': return gbcMs(118);
      case 'defense': return gbcMs(96);
      default: return gbcMs(124);
    }
  };

  // ── Robo de carta ANIMADO (manual GBC: +1 carta al entrar en Attack Phase) ──
  // La carta sale del mazo (lado izquierdo, fuera de pantalla) y se desliza
  // hasta la mano con un flip; al terminar la animación se añade a `hand`.
  const [drawFx, setDrawFx] = useState<{ card: CardDef; nonce: number } | null>(null);
  const drawFxTimer = useRef<number | null>(null);
  const drawJointForAttack = () => {
    // ATTACK PHASE → roba 1 carta REAL del drawPile (nunca re-sorteo del
    // deck original). Si el drawPile se agota, se rebaraja el descarte.
    // El GBC permite 6 cartas transitoriamente; 5 persistente.
    if (hand.length >= HAND_MAX_TRANSITORY) return;
    // Consumo VIRTUAL para la animación: mostramos la carta que saldrá
    // del mazo y aplicamos el robo real (drawOne) al aterrizar.
    const res = drawOne(deckState);
    if (!res.card) { setDeckState(res.state); return; }
    if (drawFxTimer.current) window.clearTimeout(drawFxTimer.current);
    setDrawFx({ card: res.card, nonce: nextUid() });
    Sfx.draw();
    drawFxTimer.current = window.setTimeout(() => {
      setDeckState(prev => drawOne(prev).state);
      setDrawFx(null);
    }, gbcMs(28)); // robo: 28 ticks ≈ 469ms (draw anim, INFERRED)
  };

  // HAND CHECK (manual GBC): si tras la acción quedan >5 cartas, el
  // jugador DEBE elegir cuál descartar. NUNCA se descarta con slice.
  const discardNextRef = useRef<(() => void) | null>(null);
  const settleAttackHand = (next?: () => void) => {
    if (needsDiscard(deckState)) {
      discardNextRef.current = next ?? (() => advanceExchange());
      setPhase('discard');
      return;
    }
    if (next) next();
    else advanceExchange();
  };

  // El jugador elige la carta a descartar (DISCARD_REQUIRED). La fase la
  // conduce discardNext (advanceExchange → startExchange); no fijamos fase
  // aquí para no pisar el phaseCue del siguiente atacante.
  const chooseDiscard = (idx: number) => {
    Sfx.select();
    setDeckState(prev => discardOne(prev, idx));
    const next = discardNextRef.current;
    discardNextRef.current = null;
    setTimeout(() => { if (next) next(); }, 300);
  };

  const limitsPowered = powerState !== 'NORMAL';

  const advanceGatherPowerRound = () => {
    setGatherTurns(prev => {
      if (prev <= 0) return 0;
      if (gatherStartedRoundRef.current === turn) return prev;
      const next = prev - 1;
      setPowerState(next >= 2 ? 'FULL_POWER' : next === 1 ? 'HALF_POWER' : 'NORMAL');
      if (next === 0) gatherStartedRoundRef.current = null;
      return next;
    });
  };

  // ═══ CINEMÁTICA DE ACCIÓN GBC — DIRECTOR CINEMATOGRÁFICO (timeline único) ═══
  // La lógica de batalla ya resolvió el RESULTADO (daño, guard, etc.) antes de
  // llamar a playCardCinematic; aquí SOLO se presenta. Un único BattleTimeline
  // emite eventos por tick (SHOT/ACTOR_POSE/HIT_FRAME/APPLY_DAMAGE/…); los
  // setTimeout NO son autoridad de gameplay (plan del usuario, punto 1-2).
  const cinematicRef = useRef<BattleTimeline | null>(null);
  // ─── Presentación Pixi (dev flag ?pixiField=1): instancia que recibe los
  //     eventos del timeline en paralelo al DOM (sin reemplazarlo). ───
  const pixiPresRef = useRef<PixiBattlePresentation | null>(null);
  const [pixiPresentationReady, setPixiPresentationReady] = useState(false);
  // ─── Depurador cinematográfico (?debugCinematics=1) ───
  const [debugCin, setDebugCin] = useState<CinematicDebugInfo | null>(null);
  const [debugPaused, setDebugPaused] = useState(false);
  const debugPausedRef = useRef(false);
  const debugCtxRef = useRef<{ action: string; profile: CinematicProfile; initialPose: string } | null>(null);
  const debugShotRef = useRef('');
  const debugActorPoseRef = useRef('');
  const debugTargetPoseRef = useRef('');
  const debugProjectileRef = useRef<{ x: number } | null>(null);
  // ─── Inspector de estado + debugger QTE (?debugState=1) ───
  // freeze/step del reloj del Stage Attack (frames GBC): cuando frozen, el
  // reloj real se ignora y stepFrames inyecta frames manuales en el próximo tick.
  const qteDebugRef = useRef({ frozen: false, stepFrames: 0 });
  const [qteDebugFrozen, setQteDebugFrozen] = useState(false);

  // Bind del teclado del debugger QTE (una sola vez, solo si ?debugState=1)
  useEffect(() => {
    if (!isDebugState()) return;
    return bindQteDebugControls({
      get frozen() { return qteDebugRef.current.frozen; },
      toggleFreeze() {
        qteDebugRef.current.frozen = !qteDebugRef.current.frozen;
        qteDebugRef.current.stepFrames = 0; // descarta steps stale entre QTEs
        setQteDebugFrozen(qteDebugRef.current.frozen);
      },
      step(frames) { qteDebugRef.current.stepFrames += frames; },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Recalcula la info del overlay a partir del timeline + refs actuales. */
  const refreshDebugInfo = (tick?: number) => {
    const tl = cinematicRef.current;
    const ctx = debugCtxRef.current;
    if (!tl || !ctx) return;
    const p = ctx.profile;
    const cur = tick ?? tl.tick;
    let next: { type: string; tick: number } | null = null;
    for (const t of p.tracks) {
      if (t.tick > cur && (!next || t.tick < next.tick)) next = { type: t.event.type, tick: t.tick };
    }
    const projectileSpawn = [...p.tracks].reverse().find(t => {
      if (t.tick > cur || t.event.type !== 'PROJECTILE') return false;
      return (t.event.payload as { action?: string })?.action === 'spawn';
    });
    const fieldReturn = p.tracks.find(t => t.event.type === 'FIELD_RETURN')?.tick ?? p.totalTicks;
    let projectile = debugProjectileRef.current;
    if (projectileSpawn && cur < fieldReturn) {
      const payload = projectileSpawn.event.payload as { spawnFrame?: number; contactFrame?: number };
      if (typeof payload.spawnFrame === 'number' && typeof payload.contactFrame === 'number') {
        const duration = Math.max(1, payload.contactFrame - payload.spawnFrame);
        projectile = { x: Math.round(Math.max(0, Math.min(1, (cur - payload.spawnFrame) / duration)) * 100) };
      }
    }
    setDebugCin({
      action: ctx.action,
      shot: debugShotRef.current || p.presentation,
      tick: cur,
      totalTicks: p.totalTicks,
      actor: debugActorPoseRef.current ? { animation: debugActorPoseRef.current, frame: '' } : null,
      defender: debugTargetPoseRef.current ? { animation: debugTargetPoseRef.current, frame: '' } : null,
      projectile,
      nextEvent: next,
    });
  };
  const clearCinematicTimers = () => {
    cinematicTimers.current.forEach(id => window.clearTimeout(id));
    cinematicTimers.current = [];
    cinematicRef.current?.cancel();
    cinematicRef.current = null;
  };
  useEffect(() => clearCinematicTimers, []);
  const playCardCinematic = (card: CardDef, side: 'player' | 'enemy', onDone: () => void, onEvent?: (e: CinematicEvent) => void) => {
    clearCinematicTimers();
    let cinematicFinished = false;
    const setActorPose = (pose: BattleSpritePose) => side === 'player' ? setPlayerPose(pose) : setEnemyPose(pose);
    const setTargetPose = (pose: BattleSpritePose) => side === 'player' ? setEnemyPose(pose) : setPlayerPose(pose);
    const resetActorPose = () => side === 'player' ? setPlayerPose('idle') : setEnemyPose('idle');
    const resetTargetPose = () => side === 'player' ? setEnemyPose('idle') : setPlayerPose('idle');
    const finishCinematic = () => {
      if (cinematicFinished) return;
      cinematicFinished = true;
      setCardFx({ card, side, step: 'return', visual: cardProjectileClass(card) });
      setViewMode('OVERVIEW');
      cinematicTimers.current.push(window.setTimeout(() => {
        setCardFx(null);
        resetActorPose();
        resetTargetPose();
        if (isDebugCinematics()) setDebugCin(null);
        onDone();
      }, gbcMs(12)));
    };

    // Kind de perfil: qué cinematografía declara esta carta
    const hasTargetCut = card.type === 'beam' || card.type === 'damage' || card.type === 'command' || OFFENSIVE_SUPPORT_EFFECTS.has(card.effect);
    const kind: CinematicKind = card.type === 'beam' ? 'beam'
      : card.type === 'damage' ? 'damage'
      : card.type === 'command' ? 'command'
      : OFFENSIVE_SUPPORT_EFFECTS.has(card.effect) ? 'support_offensive'
      : card.type === 'support' ? 'support' : 'support';
    const profile = profileFor(kind, card.name);

    // Pixi (dev flag ?pixiField=1): preparar la presentación para esta acción.
    // Se enruta en PARALELO al DOM (que sigue siendo la presentación por
    // defecto); si la presentación aún no está lista, el DOM cubre el caso.
    const pixiPres = pixiPresRef.current;
    if (pixiPres) {
      pixiPres.reset();
      pixiPres.setAttacker(side === 'player' ? 'left' : 'right');
    }

    // Depurador: registrar el contexto cinematográfico actual
    if (isDebugCinematics()) {
      debugCtxRef.current = { action: card.name, profile, initialPose: cardBattlePose(card, 'field') };
      debugShotRef.current = profile.presentation;
      debugActorPoseRef.current = cardBattlePose(card, 'field');
      debugTargetPoseRef.current = '';
      debugProjectileRef.current = null;
      refreshDebugInfo(0);
    }

    // El plano SOLO/DUEL/PROJECTILE se aplica desde el primer tick
    setViewMode('ACTION');
    setCardFx({ card, side, step: 'attacker', visual: cardProjectileClass(card) });
    setActorPose(cardBattlePose(card, 'field'));

    // Guard: si es beam/damage con target cut, el defensor espera en guard
    const resetCinematicReplay = () => {
      setViewMode('ACTION');
      setCardFx({ card, side, step: 'attacker', visual: cardProjectileClass(card) });
      setActorPose(cardBattlePose(card, 'field'));
      resetTargetPose();
      pixiPres?.reset();
      pixiPres?.setAttacker(side === 'player' ? 'left' : 'right');
      if (isDebugCinematics()) {
        debugShotRef.current = profile.presentation;
        debugActorPoseRef.current = cardBattlePose(card, 'field');
        debugTargetPoseRef.current = '';
        debugProjectileRef.current = null;
      }
    };

    const applyEvent = (e: CinematicEvent) => {
      // Hook externo (consumidor): sincronización de gameplay con el timeline
      // (p.ej. commit del daño en APPLY_DAMAGE — fase 3 de la auditoría).
      if (onEvent) onEvent(e);
      // Pixi: enrutar el evento a la presentación (además del DOM).
      if (pixiPres) applyCinematicEvent(pixiPres, e);
      // Depurador: actualizar refs + overlay en cada evento
      if (isDebugCinematics()) {
        switch (e.type) {
          case 'SHOT': {
            const s = (e.payload as { shot?: string })?.shot;
            if (s) debugShotRef.current = s;
            break;
          }
          case 'ACTOR_POSE': {
            const pose = (e.payload as { pose?: BattleSpritePose })?.pose;
            if (pose) debugActorPoseRef.current = pose;
            break;
          }
          case 'TARGET_POSE': {
            const pose = (e.payload as { pose?: BattleSpritePose })?.pose;
            if (pose) debugTargetPoseRef.current = pose;
            break;
          }
          case 'PROJECTILE': {
            const p = e.payload as { action?: string; progress?: number };
            const progress = p.progress ?? (p.action === 'impact' || p.action === 'explode' ? 1 : 0);
            debugProjectileRef.current = { x: Math.round(progress * 100) };
            break;
          }
          default: break;
        }
        refreshDebugInfo(e.tick);
      }
      switch (e.type) {
        case 'SHOT': {
          const shot = (e.payload as { shot?: string })?.shot;
          // IMPACT → pose target hurt + VFX impacto (ya lo hace HIT_FRAME)
          break;
        }
        case 'ACTOR_POSE': {
          const pose = (e.payload as { pose?: BattleSpritePose })?.pose;
          if (pose) setActorPose(pose);
          break;
        }
        case 'TARGET_POSE': {
          const pose = (e.payload as { pose?: BattleSpritePose })?.pose;
          if (pose) setTargetPose(pose);
          break;
        }
        case 'PROJECTILE': {
          const p = e.payload as { action?: string };
          if (p.action === 'spawn' || p.action === 'travel') {
            setCardFx(prev => prev && ({ ...prev, step: 'travel' }));
          }
          break;
        }
        case 'RUSH': {
          setCardFx(prev => prev && ({ ...prev, step: 'travel' }));
          break;
        }
        case 'HIT_FRAME': {
          // TODO sincroniza TODO (plan punto 7): el consumidor decide cuándo
          // aplicar el daño — la lógica ya está resuelta en onDone/applied.
          setCardFx(prev => prev && ({ ...prev, step: 'target' }));
          setTargetPose(card.type === 'beam' || card.type === 'damage' || card.type === 'command' ? 'hurt' : 'guard');
          break;
        }
        case 'CAMERA': {
          hitImpact(side === 'player' ? 'enemy' : 'player');
          break;
        }
        case 'APPLY_DAMAGE': {
          // La lógica aplica el resultado precalculado (aplicado en onDone por
          // el llamador; aquí solo sincronizamos el flash del defensor).
          if (side === 'player') setFlashEnemy(true); else setFlashPlayer(true);
          Sfx.hit();
          break;
        }
        case 'FIELD_RETURN': {
          finishCinematic();
          break;
        }
        default:
          break;
      }
    };

    if (!hasTargetCut) {
      // Support puro: sin target cut — el perfil SOLO se reproduce completo
      const tl = new BattleTimeline(profile, {
        onEvent: applyEvent,
        onComplete: finishCinematic,
        onReset: resetCinematicReplay,
        onTick: (tick) => { pixiPres?.sync(tick); if (isDebugCinematics()) refreshDebugInfo(tick); },
      });
      cinematicRef.current = tl;
      tl.start();
      return;
    }

    // Con target cut: el timeline emite HIT_FRAME en el tick de contacto; el
    // flash del defensor se dispara con APPLY_DAMAGE (antes era 3 setTimeout).
    const tl = new BattleTimeline(profile, {
      onEvent: applyEvent,
      onComplete: finishCinematic,
      onReset: resetCinematicReplay,
      onTick: (tick) => { pixiPres?.sync(tick); if (isDebugCinematics()) refreshDebugInfo(tick); },
    });
    cinematicRef.current = tl;
    tl.start();
  };

  // ─── Depurador cinematográfico: controles de teclado (Space/←/→/R) ───
  useEffect(() => {
    if (!isDebugCinematics()) return;
    const ctrl: CinematicDebugController = {
      get paused() { return debugPausedRef.current; },
      seekBy: (ticks) => {
        const tl = cinematicRef.current;
        if (!tl) return;
        tl.seek(Math.max(0, Math.min(tl.tick + ticks, tl.profile.totalTicks)));
        refreshDebugInfo();
      },
      togglePause: () => {
        const tl = cinematicRef.current;
        if (!tl) return;
        if (tl.paused) { tl.resume(); setDebugPaused(false); debugPausedRef.current = false; }
        else { tl.pause(); setDebugPaused(true); debugPausedRef.current = true; }
      },
      restart: () => {
        const tl = cinematicRef.current;
        if (!tl) return;
        tl.seek(0);
        if (tl.paused) { tl.resume(); setDebugPaused(false); debugPausedRef.current = false; }
        const ctx = debugCtxRef.current;
        if (ctx) {
          debugShotRef.current = ctx.profile.presentation;
          debugActorPoseRef.current = ctx.initialPose;
          debugTargetPoseRef.current = '';
          debugProjectileRef.current = null;
        }
        refreshDebugInfo();
      },
    };
    return bindDebugControls(ctrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardFxActorPose = (card: CardDef, step: CardFxStep): BattleSpritePose => {
    if (step === 'attacker') {
      if (card.type === 'beam') return 'beam_charge';
      // Golpe físico: aproximación en stance neutral (no 'gather_power', que cae
      // a beam_charge = manos juntas cargando ki, impropio de un puñetazo).
      if (card.type === 'damage' || card.type === 'command') return 'idle';
      if (OFFENSIVE_SUPPORT_EFFECTS.has(card.effect)) return 'gather_power';
    }
    if (step === 'travel') {
      if (card.type === 'beam') return 'beam_fire';
      if (card.type === 'damage' || card.type === 'command' || OFFENSIVE_SUPPORT_EFFECTS.has(card.effect)) return 'attack_fwd';
    }
    return cardBattlePose(card, 'fx');
  };

  const renderCardFxActor = (step: CardFxStep) => (
    cardFx ? <div className="fx-fighter fx-actor">
      {cardFx.side === 'player'
        ? (spriteManifestUrl(activePlayerFormId)
            ? <FighterSprite formId={activePlayerFormId} pose={cardFxActorPose(cardFx.card, step)} side="left" scale={14} />
            : <CharacterSprite formId={activePlayerFormId} className="fx-sprite" height={200} side="left" />)
        : (spriteManifestUrl(enemyFormId)
            ? <FighterSprite formId={enemyFormId} pose={cardFxActorPose(cardFx.card, step)} side="right" scale={14} />
            : <CharacterSprite formId={enemyFormId} className="fx-sprite" height={200} side="right" />)}
    </div> : null
  );

  // ═══ EXCHANGE: la unidad central del combate (spec §3-4) ═══
  // Cada exchange tiene un ATTACKER y un DEFENDER. El atacante recibe +3 CC
  // AL ENTRAR en su Attack Phase (no al turno global); el defensor elige su
  // defensa ANTES de que se resuelva la ofensiva (no es un QTE reactivo).
  // ⚠️ 2026-08-12 (manual GBC): el orden del ROUND es fijo — exchange1 = el de
  // mayor SPD, exchange2 = el otro (roles invertidos). NO se recalcula SPD
  // entre los dos exchanges del mismo round; solo al empezar el siguiente.
  const exchangeBusy = useRef(false);
  const startExchange = (attacker: 'player' | 'enemy') => {
    exchangeBusy.current = false; // liberar el guard al arrancar un exchange real
    if (attacker === 'player') {
      const actor = getForm(playerFormId)!.character.toUpperCase();
      // +3 CC por entrar como atacante (spec §4 — battle.shtml)
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`);
      // La posición PERSISTE entre fases (spec Move): el atacante no elige
      // posición, va directo a seleccionar su acción. Robo de Joint al entrar
      // en Attack Phase (máx 6 transitorio, 5 persistente).
      drawJointForAttack();
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
    // ⚠️ FIDELITY V10 — los STAT STAGES NO caducan por turnos (manual
    // GameFAQs + comunidad): los cambios de parámetros de las Support Cards
    // duran HASTA EL FINAL DE LA BATALLA (máx ±3 niveles, clampStage) y solo
    // una carta específica (powerup_dispel/support_dispel) los anula.
    // El GATHER POWER sí tiene duración, pero es un estado APARTE
    // (powerState FULL→HALF→NORMAL con gatherTurns), no pStages/eStages.
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
  // ⚠️ GUARD anti-pisada (2026-08-12): varios setTimeout pueden disparar esta
  // función (fin de cinemática, fin de resolución, QTE, CHARA...). Sin bloqueo,
  // dos llamadas seguidas saltaban exchanges/turnos duplicados y las fases se
  // pisaban. El guard se libera en startExchange (al arrancar el siguiente).
  const advanceExchange = () => {
    if (exchangeBusy.current) return;
    exchangeBusy.current = true;
    if (exchangeIndex === 0) {
      // Exchange 2: el otro luchador ataca (spec §1)
      setExchangeIndex(1);
      const second: 'player' | 'enemy' = turnOwnerRef.current === 'player' ? 'enemy' : 'player';
      startExchange(second);
    } else {
      // TURN_END → nuevo turno: recalcular SPD y orden
      advanceGatherPowerRound();
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
      // En fallo de QTE el GBC no vuelve a mostrar el panel inferior: el rival
      // resuelve el counter. Ignoramos inputs durante esa animación.
      if (st.state === 'COUNTER_WINDOW') {
        return;
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
    const tm = setTimeout(() => setIntro(false), 5200);
    // Cuadro de diálogo GBC al inicio: presentación antes del combate
    showGbc(`${player.name} ${t('battle.vs')} ${enemy.name} — ${t('battle.fight')}!`, 3400);
    const introGbc = setTimeout(() => setGbcMsg(null), 4600);
    return () => { clearTimeout(introGbc); };
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
    gatherStartedRoundRef.current = turn;
    // Gather Power (GBC): +4 STR +4 KI (COMMUNITY_TESTED; la fórmula exacta es UNKNOWN),
    // habilita Limit Deck y convierte el Basic 3 Stage → 4 Stage
    setPStages(s => ({ ...s, str: clampStage(s.str + 0.5), ki: clampStage(s.ki + 0.5) }));
    addLog(`${player.name} GATHER POWER! FULL POWER (+4 STR/KI, LIMIT DECK 2 turnos)`);
    setPlayerPose('gather_power');
    // Consume la acción de ataque completa
    setTimeout(() => {
      setPlayerPose('idle');
      setViewMode('OVERVIEW');
      // Termina el turno tras Gather (acción completa consumida)
      setSelectedCard(null);
      settleAttackHand(() => setTimeout(() => advanceExchange(), gbcMs(36)));
    }, gbcMs(58));
  };

  const selectCommand = (cmd: CommandType) => {
    Sfx.select();
    if (cmd === 'B') { setPhase('basic'); return; }
    if (cmd === 'LIMIT') {
      if (!limitsPowered || limitCards.length === 0) {
        addLog(t('battle.needGather'));
        Sfx.cancel();
        return;
      }
      setPhase('limitSelect');
      return;
    }
    if (cmd === 'C') {
      // CHARA: cambiar al compañero (Select Character del GBC). Consume la acción.
      if (!player2) { addLog(t('battle.noAlly')); Sfx.cancel(); return; }
      Sfx.confirm();
      const incoming = player2;
      setPlayer2(player);
      setPlayer(incoming);
      setPlayerPose('idle');
      addLog(`${incoming.name} entra al combate! (CHARA)`);
      settleAttackHand(() => setTimeout(() => advanceExchange(), gbcMs(36))); // 36 ticks ≈ 603ms (turn advance, INFERRED)
      return;
    }
    setPhase('cardSelect');
  };

  // ═══ Stage Attack: secuencia de inputs A/B a tiempo ═══
  // La ventana GLOBAL de la secuencia depende de la combinación Front/Back de
  // atacante y rival (manual GBC — 4 ventanas): REAR+REAR=1.2s · REAR+FRONT=1.7s
  // · FRONT+REAR=2.4s · FRONT+FRONT=2.9s. NO se recalcula entre inputs.
  const resolveStageWindow = (): number => {
    const aDepth = POSITION_DATA[player.battlePos].depth;
    const bDepth = POSITION_DATA[enemy.battlePos].depth;
    const pair: StageDepthPair = `${aDepth}_${bDepth}`;
    return STAGE_SEQUENCE_WINDOW[pair];
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
    let stages: 3 | 4 | 5 | 6 = 3;
    if (card.name.includes('4')) stages = 4;
    else if (card.name.includes('5')) stages = 5;
    else if (card.name.includes('6')) stages = 6;
    // Gather Power convierte Basic 3 Stage → 4 Stage (ya manejado en BASIC).
    // Secuencia CANÓNICA predeterminada (pool fijo por nivel, round-robin):
    // NO aleatoria — el GBC tiene patrones de inputs que se repiten y el
    // jugador los aprende; la rotación garantiza variación sin repetir hasta
    // agotar el pool (6 variantes por nivel). docs: stageSequences.ts
    const seq = nextStageSequence(stages);
    // ⚠️ pool de inputs y generación: HYPOTHESIS (spec §21) — el original puede
    // usar un generador propio; pendiente de verificar en ROM.
    // Ventana TOTAL de la secuencia según posición relativa (manual GBC):
    // REAR+REAR=1.2s · REAR+FRONT=1.7s · FRONT+REAR=2.4s · FRONT+FRONT=2.9s.
    // El reloj corre GLOBAL hasta completar todos los inputs; si se agota →
    // fallo → contraataque del rival (COUNTER_WINDOW).
    const sequenceWindow = resolveStageWindow();
    commitQte({
      state: 'INPUT_WINDOW', seq, idx: 0, correct: 0, covering: false, card,
      elapsedFrames: 0, limitFrames: sequenceWindow, counterFrames: 0,
      result: null,
    });
    setViewMode('ACTION');
    setPhase('stageInput');
    Sfx.cardPlay();
  };

  // ═══ Reloj del QTE: monotónico, en FRAMES GBC (manual GBC) ═══
  // Un único bucle rAF acumula tiempo real y lo convierte a frames GBC.
  // 2026-08-12 (manual USA): la ventana es GLOBAL para TODA la secuencia
  // (nunca se reinicia por input) y depende de la posición relativa:
  // REAR+REAR=1.2s … FRONT+FRONT=2.9s. Al fallar, el rival CONTRAATACA con su
  // propia ventana corta de ENTER COMMAND (A≈0.4s / B≈0.15s, HYPOTHESIS).
  useEffect(() => {
    if (phase !== 'stageInput') return;
    let raf = 0;
    let last = performance.now();
    qteDebugRef.current.stepFrames = 0; // limpia steps residuales de otro QTE
    let acc = 0; // acumulador de frames GBC (ventana GLOBAL de la secuencia)
    let counterAcc = 0; // acumulador propio de la ventana de contraataque
    const tick = (now: number) => {
      const st = stageQteRef.current;
      const realDelta = ((now - last) / 1000) * GBC_NATIVE_FPS;
      last = now;
      // Debugger QTE (?debugState=1): congelado ⇒ el reloj real se ignora y
      // stepFrames (inyectado por tecla) avanza frame a frame. Sin congelar,
      // el delta real manda (stepFrames queda a 0 por seguridad).
      const dbg = qteDebugRef.current;
      const delta = dbg.frozen ? dbg.stepFrames : realDelta;
      if (dbg.frozen) dbg.stepFrames = 0;
      acc += delta;
      if (st.state === 'INPUT_WINDOW') {
        const elapsed = Math.floor(acc);
        setStageQte(prev => ({ ...prev, elapsedFrames: Math.max(prev.elapsedFrames, elapsed) }));
        // Timeout de la secuencia → el rival contraataca (manual GBC)
        if (elapsed >= st.limitFrames) {
          enterStageFailure('TIMEOUT');
        }
      } else if (st.state === 'COUNTER_WINDOW') {
        // Contraataque: ventana de ENTER COMMAND con timing propio
        // (manual GBC: A y B requieren un input con timing).
        counterAcc += delta;
        const cf = Math.floor(counterAcc);
        setStageQte(prev => ({ ...prev, counterFrames: cf }));
        // Si no reaccionas a tiempo → el contraataque conecta (COUNTER_HIT)
        if (cf >= COUNTER_A_FRAMES) {
          addLog(`${enemy.name} ${t('battle.counterHit')}`);
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
        // Secuencia completa → COMPLETED → se ejecuta la ANIMACIÓN de la acción
        // (GBC: el QTE solo es la introducción; la acción se ve al completarlo).
        commitQte({ ...st, state: 'COMPLETED', idx: next, correct: newCorrect, result: 'FULL_SUCCESS' });
        addLog(`${player.name} completa el Stage Attack! (+${newCorrect} CC)`);
        resolveStageResult();
      } else {
        // Avanza el cursor; el reloj de la secuencia SIGUE corriendo (global)
        commitQte({ ...st, idx: next, correct: newCorrect });
      }
    } else {
      // Fallo: input equivocado → el RIVAL CONTRAATACA (manual GBC).
      // El luchador se congela en la pose del golpe fallido y aparece ENTER
      // COMMAND: A = defenderte del contraataque (conserva CC, evita su daño)
      // · B = reparar y continuar el Stage Attack.
      flashFeedback('wrong');
      Sfx.cancel();
      addLog(`${player.name} falla un input — ¡${enemy.name} contraataca!`);
      enterStageFailure('WRONG_INPUT');
    }
  };

  // ═══ Entrada en COUNTER_WINDOW (input malo o timeout) ═══
  // El rival obtiene una oportunidad de contraataque (manual GBC). El luchador
  // se queda QUIETO en la pose del golpe fallido mientras aparece ENTER COMMAND
  // (ventana corta de timing: A≈0.4s / B≈0.15s — HYPOTHESIS).
  const enterStageFailure = (reason: 'WRONG_INPUT' | 'TIMEOUT' | 'DEFENSE_CARD') => {
    const st = stageQteRef.current;
    if (st.state !== 'INPUT_WINDOW') return;
    commitQte({
      ...st,
      state: 'COUNTER_WINDOW',
      counterFrames: 0,
      result: 'COUNTER_HIT',
    });
  };

  // ═══ Contraataque: A = defenderte (banco) · B = reparar (manual GBC) ═══
  // A: conservas los CC de los comandos ya acertados y EVITAS el daño del
  //    contraataque (quedas defendiendo) — ventana ≈0.4s.
  // B: reparas la cadena y continúas el Stage Attack desde el input fallido —
  //    ventana ≈0.15s (más estricta; la comunidad la cuantifica así).
  // Si el timing no se cumple → el contraataque del rival conecta (COUNTER_HIT).
  const stageRecoverInput = (pressed: StageKey) => {
    const st = stageQteRef.current;
    if (st.state !== 'COUNTER_WINDOW') return;
    if (pressed === 'A' && st.counterFrames <= COUNTER_A_FRAMES) {
      // A = BANK/DEFEND: conserva CC, evita el daño del contraataque.
      // covering=true → el luchador ejecuta la animación de CUBRIRSE (guard).
      Sfx.cancel();
      setPlayerPose('guard');
      addLog(`${player.name} se defiende del contraataque (conserva +${st.correct} CC)`);
      commitQte({ ...st, state: 'SAFE_ABORT', covering: true, result: 'SAFE_ABORT' });
      resolveStageResult();
    } else if (pressed === 'B' && st.counterFrames <= COUNTER_B_FRAMES) {
      // B = RECOVER: repara y continúa el Stage Attack (el reloj de la
      // secuencia se reinicia para los inputs restantes — HYPOTHESIS)
      Sfx.confirm();
      addLog(`${player.name} repara el Stage Attack!`);
      commitQte({
        ...st, state: 'INPUT_WINDOW', counterFrames: 0,
        elapsedFrames: 0, // nueva ventana para los comandos restantes
      });
    } else {
      // Timing incorrecto (B tarde o tecla equivocada) → el counter conecta
      Sfx.cancel();
      addLog(`${enemy.name} ${t('battle.counterHit')}`);
      commitQte({ ...st, state: 'COUNTER_HIT', result: 'COUNTER_HIT' });
      resolveStageResult();
    }
  };

  // ═══ Resolución del Stage Attack (manual GBC: QTE ≠ combate) ═══
  // 2026-08-12 (manual USA):
  //   COMPLETED    → la ANIMACIÓN de la acción se ejecuta con daño completo.
  //   SAFE_ABORT   → el jugador pulsó A en la ventana del contraataque:
  //                  conserva CC, sin daño del counter, acción terminada.
  //   COUNTER_HIT  → no se defendió a tiempo: el contraataque del RIVAL
  //                  conecta sobre el JUGADOR (nunca daño parcial al rival).
  const resolveStageResult = () => {
    const st = stageQteRef.current;
    if (st.card == null) return;
    const card = st.card;
    const complete = st.result === 'FULL_SUCCESS';
    const safeAbort = st.result === 'SAFE_ABORT';
    const ccGained = st.correct;

    if (complete) {
      // ✅ Secuencia completa: ahora SÍ se ve la animación de la acción.
      // El QTE fue solo la introducción (GBC); la acción avanza con su
      // cinemática normal (attacker → travel → target → return).
      commitQte({ ...st, state: 'COMPLETED', result: 'FULL_SUCCESS' });
      setPhase('cardSelect'); // desmonta el overlay del QTE
      playCardCinematic(card, 'player', () => {
        // Daño completo al terminar la cinemática
        const ePos = enemy.battlePos;
        const vulnerable = (isBeamVulnerable(ePos) && card.type === 'beam') || (isDamageVulnerable(ePos) && card.type === 'damage');
        const posMult = (POSITION_DATA[ePos].depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
        const dmg = Math.floor((card.atk + player.str) * posMult);
        setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
        if (dmg > 0) setEnemyPose('hurt');
        setFlashEnemy(true);
        hitImpact('enemy');
        setDamageNums(prev => [...prev, { value: dmg, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
        addLog(`${player.name} → ${card.name} — ${dmg} ${t('battle.dmg')}`);
        Sfx.hit();
        setTimeout(() => setFlashEnemy(false), gbcMs(9)); // 9 ticks ≈ 151ms (hit flash, HYPOTHESIS)
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
        finishPlayerTurnStage(ccGained);
      });
      return;
    }

    // ❌ Fallo: el rival contraataca (manual GBC — ENTER COMMAND).
    //   SAFE_ABORT  → A a tiempo: conserva CC y el Stage termina. ⚠️ FIDELITY
    //                 V10 — A NO implica 0 daño: los comandos completados
    //                 cuentan con daño REDUCIDO/proporcional al progreso
    //                 (Q&A aceptada + veteranos). Fórmula HYPOTHESIS hasta
    //                 captura ROM; con 0 aciertos el parcial es 0 (caso
    //                 documentado "sin recuperación previa").
    //   COUNTER_HIT → no se defendió a tiempo: el counter del RIVAL conecta.
    if (safeAbort) {
      commitQte({ ...st, state: 'SAFE_ABORT', result: 'SAFE_ABORT' });
      setViewMode('OVERVIEW');
      // Daño parcial del Stage abortado: proporcional a los aciertos
      // (HYPOTHESIS — misma fórmula de daño que el stage completo × progreso).
      const totalSeq = st.seq.length || 1;
      const progress = Math.min(1, st.correct / totalSeq);
      let partialDmg = 0;
      if (progress > 0) {
        const ePos = enemy.battlePos;
        const vulnerable = (isBeamVulnerable(ePos) && card.type === 'beam') || (isDamageVulnerable(ePos) && card.type === 'damage');
        const posMult = (POSITION_DATA[ePos].depth === 'FRONT' && vulnerable) ? 0.8 : 0.5;
        partialDmg = Math.max(0, Math.floor((card.atk + player.str) * posMult * progress));
      }
      setTimeout(() => {
        setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, result: null });
        setPhase('cardSelect');
        if (partialDmg > 0) {
          setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - partialDmg) }));
          setEnemyPose('hurt');
          setFlashEnemy(true);
          hitImpact('enemy');
          setDamageNums(prev => [...prev, { value: partialDmg, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
          addLog(`${player.name} se defiende del contraataque — ${partialDmg} dmg parcial (${Math.round(progress * 100)}% del Stage) +${ccGained} CC`);
        } else {
          addLog(`${player.name} se defiende del contraataque (sin daño — 0 aciertos) +${ccGained} CC`);
        }
        finishPlayerTurnStage(ccGained);
      }, gbcMs(24)); // ~0.4s: ventana A del counter (pose defensiva breve)
      return;
    }
    // COUNTER_HIT: el contraataque del rival conecta sobre el jugador.
    // Fórmula HYPOTHESIS (hasta captura ROM): golpe del rival basado en su
    // STR/KI y la posición del jugador (misma estructura que el daño ofensivo).
    const pPos = player.battlePos;
    const pVuln = (isBeamVulnerable(pPos) && card.type === 'beam') || (isDamageVulnerable(pPos) && card.type === 'damage');
    const pPosMult = (POSITION_DATA[pPos].depth === 'FRONT' && pVuln) ? 0.8 : 0.5;
    const counterDmg = Math.max(1, Math.floor((enemy.str + enemy.ki) * pPosMult * 0.5));
    commitQte({ ...st, state: 'COUNTER_HIT', result: 'COUNTER_HIT' });
    setViewMode('OVERVIEW');
    setTimeout(() => {
      setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, result: null });
      setPhase('cardSelect');
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - counterDmg) }));
      setPlayerPose('hurt');
      setFlashPlayer(true);
      hitImpact('player');
      setDamageNums(prev => [...prev, { value: counterDmg, type: 'damage', ...dmgPos('player'), id: nextUid() }]);
      addLog(`${enemy.name} ${t('battle.counterHit')} — ${counterDmg} ${t('battle.dmg')} (conservas ${ccGained} CC)`);
      Sfx.hit();
      setTimeout(() => setFlashPlayer(false), gbcMs(9)); // 9 ticks (hit flash, HYPOTHESIS)
      if (player.hp - counterDmg <= 0) {
        setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); Sfx.defeat(); addLog(`${player.name} ${t('battle.defeated')}`); }, 500);
        return;
      }
      finishPlayerTurnStage(ccGained);
    }, gbcMs(24)); // ~0.4s: la ventana A del counter expira
  };

  // Variante de finishPlayerTurn para stage attacks (no usar carta de la mano)
  const finishPlayerTurnStage = (ccGained: number) => {
    setSelectedCard(null);
    setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, result: null });
    setViewMode('OVERVIEW');
    setEnemyPose('idle');
    setPlayerPose('idle');
    settleAttackHand(() => setTimeout(() => advanceExchange(), gbcMs(36))); // 36 ticks ≈ 603ms (turn advance, INFERRED)
  };

  const selectCard = (idx: number) => {
    const card = hand[idx];
    // Guard de compatibilidad con el personaje ACTIVO (el render lo pinta
    // gris; aquí se protege la lógica). CHARA recalcula solo.
    if (card && !cardUsableBy(card, getForm(activePlayerFormId)!.character)) {
      Sfx.cancel();
      return;
    }
    setSelectedCard(idx);

    if (!canPlayInAttack(card)) {
      addLog(`${card.name}: solo puede usarse en DEFENSE PHASE`);
      Sfx.cancel();
      setSelectedCard(null);
      return;
    }

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
    // Fase 3: el OUTCOME se calcula ANTES de la cinemática (un solo roll) y el
    // COMMIT ocurre en APPLY_DAMAGE (el impacto visual) — el daño/HP/número
    // salen EXACTAMENTE cuando golpea, no al final con setTimeout extra.
    planCardRef.current = card;
    const plan = computeActionOutcome(card);
    endTurnRef.current = () => {
      setPlayerPose('idle');
      setEnemyPose('idle');
      finishPlayerTurn(idx);
    };
    playCardCinematic(card, 'player', () => {
      if (!plan.committed) commitActionOutcome(plan);   // fallback (support puro)
      if (plan.ended) return;
      setPlayerPose('idle');
      setEnemyPose('idle');
      finishPlayerTurn(idx);
    }, (e) => {
      if (e.type === 'APPLY_DAMAGE') commitActionOutcome(plan);
    });
  };

  // Resolución de una carta JOINT o LIMITED (misma mecánica; solo cambia la mano)
  // ═══ RESOLUCIÓN DE ACCIÓN: cálculo PURO (plan) + commit sincronizado ═══
  // Fase 3 (auditoría): el daño ya NO se aplica al final de la cinemática
  // con setTimeout extra. El OUTCOME se calcula ANTES (un solo roll) y se
  // COMMITEA en el evento APPLY_DAMAGE del timeline (el impacto visual) —
  // HP/número/flash/hurt/SFX ocurren EXACTAMENTE cuando golpea. El fallback
  // en onDone cubre perfiles sin APPLY_DAMAGE (support puro).
  interface ActionPlan {
    committed: boolean;
    ended: boolean;                 // win/lose/enemy2Fall ya gestionado por el commit
    // soporte/efectos
    heal: number; drain: number; ccGain: number;
    guardType: 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel' | null;
    ohko: boolean;
    pStageDelta: { str: number; ki: number; spd: number; guard: number };
    resetPStages: boolean;
    pAcc: number; pEva: number;     // 0 = no tocar
    pLockOn: boolean; consumeLockOn: boolean;
    eStageDelta: { str: number; ki: number; spd: number; guard: number };
    resetEStages: boolean; endGather: boolean;
    transformFx: boolean; transformForm: string | null;
    bombDmg: number;                // gamebomb/candy/naughty/knockdown
    // ataque
    hitType: 'damage' | 'miss' | 'guard';
    damage: number;
    ePosMove: BattlePosition | null;
    suicideHp1: boolean;
    // flujo
    win: boolean; enemy2Fall: boolean;
    damageNum: { value: number; type: 'damage' | 'heal' | 'miss' | 'guard' } | null;
    logs: string[];
    sfx: string[];
    endDelayMs: number;
  }

  const zeroStages = () => ({ str: 0, ki: 0, spd: 0, guard: 0 });

  // ── COMPUTE: calcula el resultado completo SIN mutar estado (un solo roll) ──
  const computeActionOutcome = (card: CardDef): ActionPlan => {
    const plan: ActionPlan = {
      committed: false, ended: false,
      heal: 0, drain: 0, ccGain: 0, guardType: null, ohko: false,
      pStageDelta: zeroStages(), resetPStages: false,
      pAcc: 0, pEva: 0, pLockOn: false, consumeLockOn: false,
      eStageDelta: zeroStages(), resetEStages: false, endGather: false,
      transformFx: false, transformForm: null, bombDmg: 0,
      hitType: 'damage', damage: 0, ePosMove: null, suicideHp1: false,
      win: false, enemy2Fall: false, damageNum: null,
      logs: [], sfx: [], endDelayMs: 700,
    };
    const acc = card.acc / 100;
    const roll = Math.random();

    const supEffects = ['heal_25pct','heal_strong','heal_light','buff_kaio','buff_ki8','buff_str8','buff_speed8','buff_guard8','buff_str_ki8','debuff_str8','debuff_ki8','debuff_speed8','debuff_speed8_lowacc','debuff_guard8','attack_power_down','powerup_dispel','support_dispel','powerdown_cleanse','avoid_beam','avoid_damage','avoid_damage_taiyoken','reduce_damage','absorb_beam','command_cancel','accuracy_up','evasion_up','knockdown_dmg','knockdown_min','life_drain','cc_recovery','lock_on','sunglasses','beam_shield','damage_shield','ohko_lowacc','android_kill','special_card','gamebomb','candy','naughty_book'];
    if (card.type === 'support' || card.type === 'defense' || card.type === 'special' || supEffects.includes(card.effect)) {
      const eff = card.effect;
      let supportImpact = false;
      if (eff === 'heal_25pct' || eff === 'heal_strong' || eff === 'heal_light') {
        const pct = eff === 'heal_strong' ? (1 / 4 + 1 / 3) : eff === 'heal_light' ? 0.3 : 0.25;
        plan.heal = Math.floor(player.maxHp * pct);
        plan.damageNum = { value: plan.heal, type: 'heal' };
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — +${plan.heal} ${t('battle.hp')}!`);
        supportImpact = true;
      } else if (eff === 'medical_machine') {
        plan.heal = card.atk + Math.floor(player.spd / 2) * 4;
        plan.damageNum = { value: plan.heal, type: 'heal' };
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — +${plan.heal} ${t('battle.hp')}!`);
        supportImpact = true;
      } else if (eff === 'life_drain') {
        plan.drain = Math.floor((card.atk + player.str) * 0.5);
        supportImpact = plan.drain > 0;
        plan.damageNum = { value: plan.drain, type: 'damage' };
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — ${plan.drain} ${t('battle.dmg')} (+${plan.drain} HP)`);
        plan.endDelayMs = 500;
      } else if (eff === 'cc_recovery') {
        plan.ccGain = card.id === 97 ? 5 : 3;
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — +${plan.ccGain} CC!`);
        supportImpact = true;
      } else if (eff === 'avoid_beam' || eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'reduce_damage' || eff === 'absorb_beam' || eff === 'beam_shield' || eff === 'damage_shield' || eff === 'command_cancel') {
        plan.guardType =
          eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'damage_shield' ? 'avoid_damage'
          : eff === 'absorb_beam' || eff === 'beam_shield' ? 'absorb'
          : eff === 'reduce_damage' ? 'reduce'
          : eff === 'command_cancel' ? 'cancel'
          : 'avoid_beam';
        const label = plan.guardType === 'avoid_beam' ? 'BEAM GUARD' : plan.guardType === 'avoid_damage' ? 'DAMAGE GUARD' : plan.guardType === 'absorb' ? 'ABSORB' : 'ENDURANCE';
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — ${label}!`);
        supportImpact = true;
      } else if (eff === 'ohko_lowacc' || eff === 'android_kill') {
        if (Math.random() < card.acc / 100) {
          plan.ohko = true; plan.damage = 999; plan.win = true;
          plan.damageNum = { value: 999, type: 'damage' };
          plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — OHKO!`);
        } else {
          plan.logs.push(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
          supportImpact = true;
        }
      } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff === 'accuracy_up' || eff === 'evasion_up' || eff === 'lock_on' || eff === 'powerup_dispel' || eff === 'support_dispel' || eff === 'powerdown_cleanse' || eff === 'knockdown_dmg' || eff === 'knockdown_min' || eff === 'attack_power_down' || eff === 'sunglasses' || eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'special_card') {
        // (los buffs no caducan: persisten hasta el final de la batalla)
        if (card.id === 27 || card.id === 28) {
          plan.transformFx = true;
          plan.logs.push(`${player.name} ${t('battle.powerOn')}!`);
          const nextForm = nextTransformedForm(activePlayerFormId);
          if (nextForm && nextForm !== activePlayerFormId) {
            plan.transformForm = nextForm;
            plan.logs.push(`${player.name} → ${getForm(nextForm)?.form ?? nextForm}!`);
          }
        }
        if (eff === 'buff_ki8' || eff === 'buff_str_ki8') plan.pStageDelta.ki += 1;
        if (eff === 'buff_str8' || eff === 'buff_str_ki8') plan.pStageDelta.str += 1;
        if (eff === 'buff_speed8') plan.pStageDelta.spd += 1;
        if (eff === 'buff_guard8') plan.pStageDelta.guard += 1;
        if (eff === 'buff_kaio') { plan.pStageDelta.str += 2; plan.pStageDelta.ki += 2; }
        // (los debuffs no caducan: persisten hasta que una carta los anule)
        if (eff === 'debuff_str8') plan.eStageDelta.str -= 1;
        if (eff === 'debuff_ki8') plan.eStageDelta.ki -= 1;
        if (eff === 'debuff_speed8' || eff === 'debuff_speed8_lowacc') plan.eStageDelta.spd -= 1;
        if (eff === 'debuff_guard8') plan.eStageDelta.guard -= 1;
        if (eff === 'powerup_dispel') { plan.resetEStages = true; plan.logs.push(`${card.name}: mejoras del enemigo eliminadas!`); }
        if (card.id === 95) { plan.endGather = true; plan.logs.push(`${card.name}: el poder de ${enemy.name} se disipa!`); }
        if (eff === 'lock_on') plan.pLockOn = true;
        if (eff === 'accuracy_up') plan.pAcc = 2;
        if (eff === 'evasion_up') plan.pEva = 2;
        if (eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'knockdown_dmg' || eff === 'knockdown_min') {
          plan.bombDmg = Math.floor((card.atk || 20) + player.str);
          supportImpact = plan.bombDmg > 0;
          plan.damageNum = { value: plan.bombDmg, type: 'damage' };
          plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — ${plan.bombDmg} ${t('battle.dmg')}`);
        } else {
          plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — ${t('battle.buff')}`);
        }
        supportImpact = supportImpact || plan.bombDmg > 0;
      }
      plan.endDelayMs = supportImpact ? 500 : 350;
      return plan;
    }

    // ── Cartas de ATAQUE (damage/beam/command): la fórmula real del GBC ──
    const effAcc = pAcc > 0 ? Math.min(100, acc + 30) : acc;
    if (roll > effAcc && !pLockOn) {
      plan.hitType = 'miss';
      plan.logs.push(`${player.name} → ${card.name} — ${t('battle.miss')}!`);
    } else {
      if (pLockOn) { plan.consumeLockOn = true; plan.logs.push('LOCK ON!'); }
      const eResp = Math.random() < 0.55 ? 'defend' : 'move';
      if (eResp === 'move') {
        const axis: MoveAxis = Math.random() < 0.5 ? 'HORIZONTAL' : 'VERTICAL';
        plan.ePosMove = applyMoveAxis(enemy.battlePos, axis);
      }
      const power = card.type === 'beam' ? player.ki + pBuffs.ki : player.str + pBuffs.str;
      // Fórmula compartida (battle/combat.ts — única fuente): daño base + mult
      plan.damage = attackDamage(card.atk, power, plan.ePosMove ?? enemy.battlePos, card.type);
      const isPierce = card.effect === 'damage_pierce';
      const isTeamAtk = card.effect === 'damage_special_team' || card.effect === 'beam_team';
      const isBodyChange = card.effect === 'beam_varhp';
      if (isBodyChange) plan.damage = Math.floor(enemy.hp * 0.5);
      if (isTeamAtk && !player2) {
        plan.logs.push(`${card.name}: técnica de equipo — daño reducido sin compañero`);
        plan.damage = Math.floor(plan.damage * 0.6);
      }
      if (eResp === 'defend') {
        if (isPierce) {
          plan.damage = Math.floor(plan.damage * 0.5);
          plan.hitType = 'guard';
          plan.logs.push(`${enemy.name} BLOCK — ${plan.damage} ${t('battle.dmg')} (Tail atraviesa)`);
        } else {
          // Sistema HIT/BLOCK/AVOID compartido (battle/combat.ts — única fuente)
          const spdDef = enemy.spd + eStages.spd * 8;
          const outcome = resolveHitBlockAvoid(spdDef, card.acc);
          if (outcome === 'avoid') {
            plan.damage = 0; plan.hitType = 'guard';
            plan.logs.push(`${enemy.name} AVOID! (0 ${t('battle.dmg')})`);
          } else if (outcome === 'block') {
            plan.damage = Math.floor(plan.damage * 0.25);
            plan.hitType = 'guard';
            plan.logs.push(`${enemy.name} BLOCK — ${plan.damage} ${t('battle.dmg')}`);
          } else {
            plan.logs.push(`${enemy.name} ${t('battle.defends')} — ${plan.damage} ${t('battle.dmg')}`);
          }
        }
      } else {
        plan.logs.push(`${player.name} → ${card.name} — ${plan.damage} ${t('battle.dmg')}`);
      }
      if (card.effect === 'beam_suicide') {
        plan.suicideHp1 = true;
        plan.logs.push(`${player.name} ${t('battle.uses')} ${card.name} — ¡queda al borde!`);
      }
    }
    if (plan.damage > 0) plan.damageNum = { value: plan.damage, type: 'damage' };
    else if (plan.hitType === 'miss') plan.damageNum = { value: 0, type: 'miss' };
    if (card.type === 'beam') plan.sfx.push('beam');
    else if (plan.damage > 0) plan.sfx.push('hit');
    else if (plan.hitType === 'miss') plan.sfx.push('dodge');
    return plan;
  };

  // ── COMMIT: aplica el plan (SOLO en APPLY_DAMAGE o fallback onDone) ──
  const commitActionOutcome = (plan: ActionPlan) => {
    if (plan.committed) return;
    plan.committed = true;
    // Soporte/efectos
    if (plan.heal > 0) {
      setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + plan.heal) }));
      setDamageNums(prev => [...prev, { value: plan.heal, type: 'heal', ...dmgPos('player'), id: nextUid() }]);
    }
    if (plan.drain > 0) {
      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - plan.drain) }));
      setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + plan.drain) }));
      setEnemyPose('hurt');
      setDamageNums(prev => [...prev, { value: plan.drain, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
    }
    if (plan.ccGain > 0) setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + plan.ccGain) }));
    if (plan.guardType) setPlayerGuard({ type: plan.guardType });
    if (plan.pLockOn) setPLockOn(true);
    if (plan.pAcc > 0) setPAcc(plan.pAcc);
    if (plan.pEva > 0) setPEva(plan.pEva);

    if (plan.pStageDelta.str || plan.pStageDelta.ki || plan.pStageDelta.spd || plan.pStageDelta.guard) {
      setPStages(s => ({ str: clampStage(s.str + plan.pStageDelta.str), ki: clampStage(s.ki + plan.pStageDelta.ki), spd: clampStage(s.spd + plan.pStageDelta.spd), guard: clampStage(s.guard + plan.pStageDelta.guard) }));
    }
    if (plan.resetPStages) setPStages(zeroStages());

    if (plan.eStageDelta.str || plan.eStageDelta.ki || plan.eStageDelta.spd || plan.eStageDelta.guard) {
      setEStages(s => ({ str: clampStage(s.str + plan.eStageDelta.str), ki: clampStage(s.ki + plan.eStageDelta.ki), spd: clampStage(s.spd + plan.eStageDelta.spd), guard: clampStage(s.guard + plan.eStageDelta.guard) }));
    }
    if (plan.resetEStages) setEStages(zeroStages());
    if (plan.endGather) { aiRef.current.mode = 0; aiRef.current.gathered = false; }
    if (plan.transformFx) { Sfx.transform(); setBattleTransform(nextUid()); }
    if (plan.transformForm) setPlayerTransformedForm(plan.transformForm);
    if (plan.bombDmg > 0) {
      setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - plan.bombDmg) }));
      setEnemyPose('hurt');
      setDamageNums(prev => [...prev, { value: plan.bombDmg, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
    }
    // Ataque
    if (plan.ePosMove) setEnemy(prev => ({ ...prev, battlePos: plan.ePosMove! }));
    if (plan.consumeLockOn) setPLockOn(false);
    if (plan.suicideHp1) setPlayer(prev => ({ ...prev, hp: 1 }));
    if (plan.damage > 0) setEnemy(prev => ({ ...prev, hp: Math.max(0, prev.hp - plan.damage) }));
    if (plan.damage > 0 || plan.hitType !== 'damage') {
      setFlashEnemy(true);
      hitImpact('enemy');
      setTimeout(() => setFlashEnemy(false), gbcMs(9)); // 9 ticks ≈ 151ms (hit flash, HYPOTHESIS)
    }
    for (const s of plan.sfx) { if (s === 'beam') Sfx.beam(); else if (s === 'hit') Sfx.hit(); else if (s === 'dodge') Sfx.dodge(); }
    if (plan.damageNum && plan.damageNum.type !== 'heal') {
      if (plan.damageNum.value > 0) setEnemyPose('hurt');
      setDamageNums(prev => [...prev, { value: plan.damageNum!.value, type: plan.damageNum!.type, ...dmgPos('enemy'), id: nextUid() }]);
    }
    for (const l of plan.logs) addLog(l);

    // Coste real de la carta (JOINT)
    // (el coste se descuenta aquí, en el mismo commit del impacto)
    if (!plan.ohko) setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - cardOf(plan).cc) }));

    // 2v2 / win (misma mecánica que antes, ahora en el punto del impacto)
    if (plan.ohko || (enemy.hp - plan.damage <= 0)) {
      if (enemy2 && !plan.ohko) {
        const fallen = enemy.name;
        const next = enemy2;
        setEnemy(next); setEnemy2(null);
        setEnemyPose('idle'); setFlashEnemy(false);
        addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
        plan.ended = true;
        setTimeout(() => endTurnRef.current(), gbcMs(54)); // 54 ticks ≈ 904ms (2v2 swap, INFERRED)
      } else {
        const prog = loadProgress();
        const gained = 80 + enemy.level * 20;
        let newExp = prog.exp + gained;
        let newLevel = prog.level;
        while (newExp >= expToNext(newLevel)) { newExp -= expToNext(newLevel); newLevel++; }
        saveProgress({ level: newLevel, exp: newExp });
        plan.ended = true;
        setTimeout(() => {
          setEnemyPose('hurt'); setPhase('win'); Sfx.victory();
          addLog(`${enemy.name} ${t('battle.defeated')}`);
          if (newLevel > prog.level) addLog(`LEVEL UP! ${newLevel} (+HP/STR/KI/SPD)`);
        }, 500);
      }
    }
  };
  const endTurnRef = useRef<() => void>(() => {});
  // Referencia de la carta en curso para el coste (el commit no recibe la carta)
  const cardOf = (plan: ActionPlan): CardDef => planCardRef.current;
  const planCardRef = useRef<CardDef>(null as unknown as CardDef);


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
    if (!limitsPowered) {
      addLog(t('battle.needGather'));
      Sfx.cancel();
      return;
    }
    if (!canPlayInAttack(card)) {
      addLog(`${card.name}: no es legal en ATTACK PHASE`);
      Sfx.cancel();
      return;
    }
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
    // Mismo patrón fase 3: commit del outcome en el impacto (APPLY_DAMAGE)
    planCardRef.current = card;
    const plan = computeActionOutcome(card);
    endTurnRef.current = () => {
      setPlayerPose('idle');
      setEnemyPose('idle');
      settleAttackHand(() => setTimeout(() => advanceExchange(), gbcMs(36))); // 36 ticks ≈ 603ms (turn advance, INFERRED)
    };
    playCardCinematic(card, 'player', () => {
      if (!plan.committed) commitActionOutcome(plan);
      if (plan.ended) return;
      setPlayerPose('idle');
      setEnemyPose('idle');
      settleAttackHand(() => setTimeout(() => advanceExchange(), gbcMs(36))); // 36 ticks ≈ 603ms (turn advance, INFERRED)
    }, (e) => {
      if (e.type === 'APPLY_DAMAGE') commitActionOutcome(plan);
    });
  };

  const finishPlayerTurn = (idx: number) => {
    // La Joint usada sale de la mano → discardPile (consumible real).
    // HAND CHECK evaluado sobre el estado RESULTANTE (no el stale): tras
    // jugar una Joint de 6, quedan 5 → NO hay descarte (regla GBC).
    const next = playJoint(deckState, idx);
    setDeckState(next);
    setSelectedCard(null);
    if (needsDiscard(next)) {
      discardNextRef.current = () => setTimeout(() => advanceExchange(), gbcMs(36)); // 36 ticks (turn advance, INFERRED)
      setPhase('discard');
    } else {
      setTimeout(() => advanceExchange(), gbcMs(36)); // 36 ticks (turn advance, INFERRED)
    }
  };

  // ═══ ENEMY ATTACK: IA real del GBC (battle.shtml) ═══
  // Patrón: ataca regularmente → gather power → 5 Stage Attack → Beam/Damage → repite.
  // Rara vez usa energy cards sin haber gathered power.
  const incomingCard = useRef<CardDef | null>(null);

  const enemyAttack = () => {
    setPhase('enemyTurn');
    setEnemyPose('idle');
    const ai = aiRef.current;
    setTimeout(() => {
      // MAZO REAL del enemigo (battle/state): roba 1 del drawPile al entrar
      // en su Attack Phase (como el jugador) y decide SOLO con su mano.
      // Nunca vuelve a sortear el pool original — las Joint usadas van a su
      // discardPile y el drawPile se rebaraja al agotarse.
      const draw = drawOne(eDeckRef.current);
      setEDeckState(draw.state);
      const eHand = draw.state.hand;
      const enemyCharId = getForm(enemyFormId)!.character;
      const usableByEnemy = (c: CardDef) => cardUsableBy(c, enemyCharId);
      // Cartas de ataque que el ENEMIGO PUEDE usar: solo las de SU mano
      const attackCards = eHand.filter(c => (c.type === 'damage' || c.type === 'beam') && usableByEnemy(c));
      // IA a HP bajo: si tiene carta de curación en SU mano, se cura
      // (HYPOTHESIS — el algoritmo real de decisión es P0 ROM, pero el manual
      // confirma que la IA puede usar support cards; el deck determina qué puede hacer)
      if (enemy.hp < enemy.maxHp * 0.25) {
        const heals = eHand.filter(c => c.type === 'support' && c.effect.startsWith('heal_') && usableByEnemy(c));
        if (heals.length > 0) {
          const h = heals[0];
          const pct = h.effect === 'heal_strong' ? (1 / 4 + 1 / 3) : h.effect === 'heal_light' ? 0.3 : 0.25;
          const healed = Math.floor(enemy.maxHp * pct);
          setEnemy(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + healed) }));
          setEDeckState(prev => playJoint(prev, prev.hand.indexOf(h)));
          setEnemyPose('gather_power');
          addLog(`${enemy.name} ${t('battle.uses')} ${h.name} — +${healed} HP!`);
          setTimeout(() => { setEnemyPose('idle'); advanceExchange(); }, gbcMs(58));
          return;
        }
      }
      // Stage Attacks GRATIS: acción BASIC universal (no consumen mazo) — el
      // enemigo siempre puede hacerlos, como el jugador (GBC: BASIC menu).
      const freeStages = CARDS.filter(c => c.type === 'command' && c.cc === 0 && c.name.includes('Stage'));
      let card: CardDef;
      if (ai.mode === 1) {
        // Gather Power: no ataca, sube STR/KI (mecánica real)
        Sfx.powerUp();
        setEStages(s => ({ ...s, str: clampStage(s.str + 1), ki: clampStage(s.ki + 1) }));
        setEBuffTurns(3); // Gather del enemigo dura 2 turnos completos (GBC)
        setEnemyPose('gather_power');
        addLog(`${enemy.name} ${t('battle.gathers')}! (+8 STR/KI)`);
        ai.mode = 2;
        setTimeout(() => { setEnemyPose('idle'); advanceExchange(); }, gbcMs(58));
        return;
      }
      const affordable = attackCards.filter(c => c.cc <= enemy.cc);
      if (affordable.length === 0 && freeStages.length > 0) {
        // Sin CC: la IA hace un Stage Attack básico (gratis, +1 CC por input en el GBC)
        card = freeStages[Math.floor(Math.random() * freeStages.length)];
        // Los Stage Attacks básicos no consumen cartas del mazo (BASIC)
        incomingCard.current = card;
        addLog(`${enemy.name} ${t('battle.uses')} ${card.name}`);
        setTimeout(() => enterDefensePhase(card.name), gbcMs(22));
        return;
      }
      if (affordable.length === 0 && ai.mode !== 1) {
        // Sin cartas asequibles en SU mano: la IA reagrupa (gather) en vez de
        // inventar cartas del pool infinito. gatherStreak limita el bucle:
        // si tras 2 gathers sigue sin opciones, hace defensa pasiva (el CC
        // sigue subiendo +3/turno y podrá atacar más adelante).
        ai.mode = 1;
        ai.gatherStreak = (ai.gatherStreak ?? 0) + 1;
        if (ai.gatherStreak >= 2) {
          ai.gatherStreak = 0; ai.mode = 0;
          addLog(`${enemy.name} se prepara…`);
          setTimeout(() => advanceExchange(), gbcMs(30));
          return;
        }
        Sfx.powerUp();
        setEStages(s => ({ ...s, str: clampStage(s.str + 1), ki: clampStage(s.ki + 1) }));
        setEBuffTurns(3);
        setEnemyPose('gather_power');
        addLog(`${enemy.name} ${t('battle.gathers')}! (+8 STR/KI)`);
        setTimeout(() => { setEnemyPose('idle'); advanceExchange(); }, gbcMs(58));
        return;
      }
      if (ai.mode === 2) {
        // 5 Stage Attack tras gather (patrón real) — SOLO de su mano
        const fiveStage = eHand.filter(c => c.type === 'command' && /5/i.test(c.name) && c.cc <= enemy.cc);
        card = fiveStage.length > 0 ? fiveStage[Math.floor(Math.random() * fiveStage.length)]
          : affordable.find(c => c.type === 'beam') || affordable[0];
        ai.mode = 3;
      } else if (ai.mode === 3) {
        // Beam/Damage tras el 5-stage → vuelve al inicio del patrón
        const beams = affordable.filter(c => c.type === 'beam');
        card = beams.length > 0 ? beams[Math.floor(Math.random() * beams.length)]
          : affordable[Math.floor(Math.random() * affordable.length)] || affordable[0];
        ai.mode = 0; ai.attacks = 0;
      } else {
        // Modo 0: ataque regular (Damage preciso) — rara vez energy cards
        ai.attacks++;
        const accurate = affordable.filter(c => c.type === 'damage' && c.acc >= 85);
        card = accurate.length > 0 ? accurate[Math.floor(Math.random() * accurate.length)]
          : affordable[Math.floor(Math.random() * affordable.length)] || affordable[0];
        if (ai.attacks >= 2) ai.mode = 1;
      }
      if (!card) {
        // Mano vacía sin opciones (extremo): defensa pasiva y avanza
        ai.gatherStreak = 0;
        addLog(`${enemy.name} se prepara…`);
        setTimeout(() => advanceExchange(), gbcMs(30));
        return;
      }
      ai.gatherStreak = 0; // pudo atacar: el ciclo de gather se reinicia
      // La Joint usada sale de la mano real → discardPile
      setEDeckState(prev => playJoint(prev, prev.hand.indexOf(card)));
      setEnemy(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
      incomingCard.current = card;
      addLog(`${enemy.name} ${t('battle.uses')} ${card.name}`);
      // ⚠️ ORDEN GBC: el defensor elige SU defensa ANTES de que se ejecute
      // la animación del ataque. La cinemática del enemigo se dispara al
      // elegir (defendBasic/defendJoint/defendLimit), no aquí.
      enterDefensePhase(card.name);
    }, 450);
  };

  // ═══ DEFENSE PHASE (spec corregida): el defensor NO está limitado a
  // Guard/Move — BASIC (Defense | Move) + JOINT (solo Defense/Support) +
  // LIMIT (defensivas/Support si powered). Las ofensivas (Command/Damage/
  // Beam) quedan bloqueadas durante Defense.
  const [defendMenu, setDefendMenu] = useState<'basic' | 'joint' | 'limit' | 'move' | null>(null);
  // Movement con 2 ejes (manual GBC 2026-08-12): HORIZONTAL ↔ / VERTICAL ↕.
  // Preview CURRENT → RESULT al pasar el cursor (sin confirmar).
  const [moveAxisPreview, setMoveAxisPreview] = useState<MoveAxis | null>(null);

  const defendBasic = (choice: 'defense' | 'move', posOrAxis?: BattlePosition | MoveAxis) => {
    setPhase('enemyTurn'); // desmonta el menú YA (evita doble disparo)
    const card = incomingCard.current || CARDS[25];
    const runEnemyCinematic = (onDone: () => void) => {
      // La animación del ataque enemigo se ejecuta DESPUÉS de elegir defensa (orden GBC)
      playCardCinematic(card, 'enemy', onDone);
    };
    if (choice === 'move' && posOrAxis) {
      // BASIC → MOVE (manual GBC 2026-08-12): SOLO 2 ejes, cada uno modifica
      // UN único eje y conserva el otro. Nada de teletransporte diagonal
      // (Air/Back → Ground/Front es imposible en una sola acción).
      const axis = posOrAxis as MoveAxis;
      const target = applyMoveAxis(player.battlePos, axis);
      Sfx.position();
      // Dirección del dash (GBC): mover al FRENTE = mirar al rival (move_front),
      // retroceder al BACK = dar la espalda (move_back, espejo). El eje vertical
      // conserva la profundidad, así que la pose sigue al depth resultante.
      setPlayerPose(POSITION_DATA[target].depth === 'FRONT' ? 'move_front' : 'move_back');
      setPlayer(prev => ({ ...prev, battlePos: target }));
      const pd = POSITION_DATA[target];
      const axisLabel = axis === 'HORIZONTAL' ? '↔' : '↕';
      addLog(`${player.name} MOVE ${axisLabel} → ${pd.altitude}/${pd.depth} (${positionLabel(target)})`);
      // Manual GBC §9 (SOLO eje horizontal): si avanzas a FRONT y el rival
      // está en BACK, el rival pasa a FRONT (el frente empuja al frente).
      // Vertical jamás modifica Front/Back.
      if (axis === 'HORIZONTAL' && pd.depth === 'FRONT' && POSITION_DATA[enemy.battlePos].depth === 'BACK') {
        const pushed: BattlePosition = POSITION_DATA[enemy.battlePos].altitude === 'AIR' ? BattlePosition.UP_FRONT : BattlePosition.DOWN_FRONT;
        setEnemy(prev => ({ ...prev, battlePos: pushed }));
        addLog(`${enemy.name} retrocede a FRONT (empuje)`);
      }
      runEnemyCinematic(() => resolveEnemyAttack(true, target, card));
    } else {
      // BASIC → DEFENSE: quedarse y defender (reduce daño)
      setPlayerPose('guard');
      setPlayerGuard({ type: 'reduce' });
      addLog(`${player.name} ${t('battle.defends')} (−50% ${t('battle.dmg')})`);
      runEnemyCinematic(() => resolveEnemyAttack(true, player.battlePos, card));
    }
  };

  // Movement con 2 ejes: confirmar el eje (llamado desde el menú de 2 botones)
  const confirmMoveAxis = (axis: MoveAxis) => {
    setMoveAxisPreview(null);
    defendBasic('move', axis);
  };

  // JOINT durante Defense: solo cartas DEFENSE y SUPPORT (spec defensa)
  const defendJoint = (card: CardDef, handIdx: number) => {
    if (!canPlayInDefense(card)) {
      addLog(`${card.name}: no es legal en DEFENSE PHASE`);
      Sfx.cancel();
      return;
    }
    // Economía real: las cartas JOINT CUESTAN CC también en defensa
    if (player.cc < card.cc) {
      addLog(`${t('battle.insufficientCc')} (${card.name} ${card.cc} CC)`);
      Sfx.cancel();
      return;
    }
    setPhase('enemyTurn');
    setSelectedCard(null);
    setDeckState(prev => playJoint(prev, handIdx));
    setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    setDefendMenu(null);
    // Cinemática del ataque enemigo tras elegir la carta defensiva (orden GBC)
    const cardIncoming = incomingCard.current || CARDS[25];
    playCardCinematic(cardIncoming, 'enemy', () => resolveDefenseCard(card, handIdx));
  };

  // LIMIT durante Defense: solo Limits DEFENSE/SUPPORT y solo si powered
  const defendLimit = (card: CardDef) => {
    if (!limitsPowered || !canPlayInDefense(card)) {
      addLog(t('battle.needGather'));
      Sfx.cancel();
      return;
    }
    if (player.cc < card.cc) return;
    setPhase('enemyTurn');
    setDefendMenu(null);
    setPlayer(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    // Cinemática del ataque enemigo tras elegir el Limit defensivo (orden GBC)
    const cardIncoming = incomingCard.current || CARDS[25];
    playCardCinematic(cardIncoming, 'enemy', () => resolveDefenseCard(card, -1));
  };

  // Resolver una carta defensiva/support del JOINT contra el ataque enemigo
  const resolveDefenseCard = (card: CardDef, _handIdx: number) => {
    setPlayerPose(cardBattlePose(card, 'field'));
    const cardIncoming = incomingCard.current || CARDS[25];
    const eff = card.effect;
    let damage = 0;
    let heal = 0;
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
      heal = healed;
      setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + healed) }));
      setDamageNums(prev => [...prev, { value: healed, type: 'heal', ...dmgPos('player'), id: nextUid() }]);
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
      setDamageNums(prev => [...prev, { value: damage, type: 'damage', ...dmgPos('player'), id: nextUid() }]);
      if (cardIncoming.type === 'beam') Sfx.beam(); else Sfx.punch();
      setTimeout(() => setFlashPlayer(false), gbcMs(9)); // 9 ticks (hit flash, HYPOTHESIS)
    } else {
      setPlayer(prev => ({ ...prev, hp: Math.max(0, prev.hp - 0) }));
      if (hitType === 'guard') setDamageNums(prev => [...prev, { value: 0, type: 'guard', ...dmgPos('player'), id: nextUid() }]);
      else setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('player'), id: nextUid() }]);
    }
    setEnemy(prev => ({ ...prev, cc: Math.max(0, prev.cc - cardIncoming.cc) }));
    const projectedPlayerHp = Math.max(0, Math.min(player.maxHp, player.hp + heal) - damage);
    _finishDefenseResolution(projectedPlayerHp);
  };

  // Cierre común de la resolución defensiva (KO / cambio de fase)
  const _finishDefenseResolution = (projectedPlayerHp = player.hp) => {
    if (projectedPlayerHp <= 0 && player2) {
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
    if (projectedPlayerHp <= 0) {
      setTimeout(() => { setPlayerPose('hurt'); setPhase('lose'); Sfx.defeat(); addLog(`${player.name} ${t('battle.defeated')}`); }, 500);
      return;
    }
    setTimeout(() => {
      setPlayerPose('idle'); setEnemyPose('idle');
      setSelectedCard(null);
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
        // Sistema HIT/BLOCK/AVOID compartido (battle/combat.ts — la MISMA
        // rutina que usa el ataque del jugador: un solo cambio afecta a ambos)
        const spdDef = player.spd + pStages.spd * 8;
        const outcome = resolveHitBlockAvoid(spdDef, card.acc);
        if (outcome === 'avoid') {
          damage = 0; hitType = 'guard';
          addLog(`${player.name} AVOID! (0 ${t('battle.dmg')})`);
        } else if (outcome === 'block') {
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
    // CC al recibir daño (manual GBC §14):
    //   +1 base · +2 si pérdida sustancial (≥15% maxHP, HYPOTHESIS el umbral)
    //   +1 adicional si el ataque acierta la vulnerabilidad de posición
    //   (Beam contra AIR / Damage contra GROUND) — el manual lo enumera.
    if (damage > 0) {
      const substantial = damage >= player.maxHp * 0.15;
      const posBonus = (isBeamVulnerable(pos) && card.type === 'beam') || (isDamageVulnerable(pos) && card.type === 'damage') ? 1 : 0;
      const gain = (substantial ? 2 : 1) + posBonus;
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + gain) }));
      addLog(`${player.name} +${gain} CC (${t('battle.hp')} bajo${posBonus ? ' +posición' : ''})`);
    }
    // La carta del enemigo CUESTA CC (economía real)
    setEnemy(prev => ({ ...prev, cc: Math.max(0, prev.cc - card.cc) }));
    setFlashPlayer(true);
    hitImpact('player');
    if (card.type === 'beam') Sfx.beam();
    else if (damage > 0) Sfx.punch();
    else if (hitType === 'miss') Sfx.dodge();
    setTimeout(() => setFlashPlayer(false), gbcMs(9)); // 9 ticks (hit flash, HYPOTHESIS)
    if (damage > 0) { setPlayerPose('hurt'); setDamageNums(prev => [...prev, { value: damage, type: 'damage', ...dmgPos('player'), id: nextUid() }]); }
    else if (hitType === 'guard') setDamageNums(prev => [...prev, { value: 0, type: 'guard', ...dmgPos('player'), id: nextUid() }]);
    else if (hitType === 'miss') setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('player'), id: nextUid() }]);

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
  const suppressFieldActors = !!cardFx;
  const pixiPresentationActive = isPixiField() && pixiPresentationReady;
  const phaseShortLabel =
    phase === 'command' || phase === 'cardSelect' || phase === 'limitSelect' ? 'ATTACK' :
    phase === 'basic' ? 'BASIC' :
    phase === 'stageInput' ? 'STAGE' :
    phase === 'enemyTurn' ? 'ACTION' :
    phase === 'defend' ? 'DEFENSE' :
    phase === 'position' ? 'POSITION' : '';
  const activeAttackerSide: 'player' | 'enemy' = exchangeIndex === 0
    ? turnOwner
    : turnOwner === 'player' ? 'enemy' : 'player';
  const activeDefenderSide: 'player' | 'enemy' = activeAttackerSide === 'player' ? 'enemy' : 'player';
  const activeAttackerName = activeAttackerSide === 'player' ? player.name : enemy.name;
  const activeDefenderName = activeDefenderSide === 'player' ? player.name : enemy.name;
  // Estado del QTE para el luchador del CAMPO (el panel inferior solo lleva
  // la secuencia; el luchador ejecuta en el campo como en el GBC).
  const qteCurKey = phase === 'stageInput' && stageQte ? stageQte.seq[stageQte.idx] : null;
  const qteIsDir = qteCurKey === 'UP' || qteCurKey === 'DOWN' || qteCurKey === 'LEFT' || qteCurKey === 'RIGHT';
  const qteFrozen = phase === 'stageInput' && stageQte
    ? (stageQte.state === 'COUNTER_HIT' || stageQte.state === 'COUNTER_WINDOW')
    : false;
  const qteResolving = phase === 'stageInput' && stageQte.state !== 'INPUT_WINDOW';
  // Cada tecla del Stage Attack tiene SU pose (docs/FRAMES_ACTIONS_SPEC):
  // A=puño der, B=puño izq, UP=ascendente, DOWN=descendente, LEFT=avance, RIGHT=guardia.
  const qtePose: BattleSpritePose = phase === 'stageInput'
    ? (stageQte?.covering ? 'guard'
      : qteFrozen ? 'attack_fwd'
      : (stageInputPose(qteCurKey) as BattleSpritePose))
    : (playerPose as BattleSpritePose);
  const qteEnemyPose: BattleSpritePose = qteResolving ? 'attack_fwd' : 'idle';

  // ─── Inspector de estado (?debugState=1): snapshot para el overlay ───
  const fmtStage = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  const stateDebugSnapshot: StateDebugSnapshot | null = isDebugState() ? {
    phase: phase.toUpperCase(),
    round: turn,
    exchange: `${exchangeIndex + 1}/2`,
    owner: turnOwner,
    fighters: [
      { side: 'P', name: player.name, level: player.level, hp: player.hp, maxHp: player.maxHp, cc: player.cc, maxCc: player.maxCc, pos: positionLabel(player.battlePos), pose: playerPose },
      ...(player2 ? [{ side: 'P' as const, name: player2.name, level: player2.level, hp: player2.hp, maxHp: player2.maxHp, cc: player2.cc, maxCc: player2.maxCc, pos: positionLabel(player2.battlePos), pose: 'idle' }] : []),
      { side: 'E', name: enemy.name, level: enemy.level, hp: enemy.hp, maxHp: enemy.maxHp, cc: enemy.cc, maxCc: enemy.maxCc, pos: positionLabel(enemy.battlePos), pose: enemyPose },
      ...(enemy2 ? [{ side: 'E' as const, name: enemy2.name, level: enemy2.level, hp: enemy2.hp, maxHp: enemy2.maxHp, cc: enemy2.cc, maxCc: enemy2.maxCc, pos: positionLabel(enemy2.battlePos), pose: 'idle' }] : []),
    ],
    pStages: `STR ${fmtStage(pStages.str)} · KI ${fmtStage(pStages.ki)} · SPD ${fmtStage(pStages.spd)} · GRD ${fmtStage(pStages.guard)}`,
    eStages: `STR ${fmtStage(eStages.str)} · KI ${fmtStage(eStages.ki)} · SPD ${fmtStage(eStages.spd)} · GRD ${fmtStage(eStages.guard)}`,
    power: powerState,
    gather: gatherTurns,
    buff: buffTurns,
    lockOn: pLockOn,
    acc: pAcc,
    eva: pEva,
    handSize: hand.length,
    selected: selectedCard != null && hand[selectedCard] ? hand[selectedCard].name : null,
    qte: stageQte.state !== 'WAITING' ? `${stageQte.state} ${stageQte.idx}/${stageQte.seq.length} (+${stageQte.correct}CC) ${stageQte.elapsedFrames}/${stageQte.limitFrames}f [${stageQte.seq.join(' ')}]` : null,
  } : null;

  return (
    <div className={`battle-screen view-${viewMode.toLowerCase()} ${intro ? 'intro-active' : ''} ${cardFx ? 'is-cinematic' : ''} ${gbcMsg ? 'gbc-msg' : ''} ${pixiPresentationActive ? 'pixi-presentation-active' : ''} ${phase === 'stageInput' ? 'qte-active' : ''} ${qteResolving ? 'qte-resolving' : ''}`}>
      {/* ═══ Depurador cinematográfico (?debugCinematics=1) ═══ */}
      {isDebugCinematics() && debugCin && (
        <pre className="cinematic-debug-overlay">{renderDebugOverlay(debugCin, debugPaused)}</pre>
      )}
      {/* ═══ Inspector de estado (?debugState=1) ═══ */}
      {isDebugState() && stateDebugSnapshot && (
        <pre className="state-debug-overlay">{renderStateOverlay(stateDebugSnapshot, qteDebugFrozen)}</pre>
      )}
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

      {/* ═══ INTRO FULL-SCREEN: VS de presentación — personaje a cada lado,
          VS en el centro, READY → FIGHT. Cubre TODA la ventana (no un
          panel en medio de la pantalla de juego). La cierra el timeout
          de 5.2s (setIntro(false)) — sin fade-out propio. ═══ */}
      {intro && (
        <div className="battle-intro">
          <div className="intro-fighter intro-left">
            <div className="intro-portrait">
              <img src={portraitFor(player.id, activePlayerFormId) || ''} alt={player.name}
                onError={e => (e.currentTarget.style.display = 'none')} />
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
            <div className="intro-name">{enemy.name}</div>
            <div className="intro-sub">{enemy.form}</div>
          </div>
          <div className="intro-fight">{t('battle.fight')}</div>
          <div className="intro-flash" />
        </div>
      )}

      {/* ═══ CINEMÁTICA DE ACCIÓN GBC: atacante → habilidad → rival ═══ */}
      {cardFx && (
        <div className={`card-fx fx-${cardFx.card.type} ${cardFx.visual} ${cardFx.side} scene-${cardFx.step}`} key={`${cardFx.card.id}-${cardFx.side}-${cardFx.step}`}>
          <div className="fx-vignette" />
          {cardFx.step === 'attacker' && (
            <>
              <div className="fx-scene-label">ACTION</div>
              {renderCardFxActor('attacker')}
              <div className="fx-card">
                {cardIconUrl(cardFx.card.id) && <img src={cardIconUrl(cardFx.card.id)} alt="" className="fx-card-icon" />}
                <span className="fx-card-name">{cardFx.card.name}</span>
              </div>
              {(cardFx.card.type === 'damage' || cardFx.card.type === 'command') && <div className="fx-power-burst" />}
              {cardFx.card.type === 'support' && <div className="fx-aura" />}
              {cardFx.card.type === 'support' && cardFx.card.effect === 'evasion_up' && <div className="fx-afterimage"><span /><span /><span /><span /></div>}
            </>
          )}
          {cardFx.step === 'travel' && (
            <>
              <div className="fx-scene-label">SKILL</div>
              {renderCardFxActor('travel')}
              {/* El defensor se muestra DURANTE el travel (guard): la embestida
                  del atacante se dirige visiblemente hacia él — sincronía real
                  de pegar/recibir, no un golpe hacia el vacío. */}
              <div className="fx-fighter fx-target">
                {cardFx.side === 'player'
                  ? (spriteManifestUrl(enemyFormId)
                      ? <FighterSprite formId={enemyFormId} pose="guard" side="right" scale={14} />
                      : <CharacterSprite formId={enemyFormId} className="fx-sprite" height={200} side="right" />)
                  : (spriteManifestUrl(activePlayerFormId)
                      ? <FighterSprite formId={activePlayerFormId} pose="guard" side="left" scale={14} />
                      : <CharacterSprite formId={activePlayerFormId} className="fx-sprite" height={200} side="left" />)}
              </div>
              {cardFx.card.type === 'beam' ? <div className={`fx-beam-travel ${cardFx.visual}`} /> : <div className="fx-rush-trail" />}
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
                  : (spriteManifestUrl(activePlayerFormId)
                      ? <FighterSprite formId={activePlayerFormId} pose="hurt" side="left" scale={14} />
                      : <CharacterSprite formId={activePlayerFormId} className="fx-sprite" height={200} side="left" />)}
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
          <div className="hud-name" data-tip={tipBlock(`${player.name} — ${player.form} LV${player.level}`, [
            ['stats', `HP ${player.hp}/${player.maxHp}`],
            ['stats', `STR ${player.str} · KI ${player.ki} · SPD ${player.spd}`],
            ['desc', `POS: ${player.battlePos.replace('_', ' ')}`],
          ])}>
            <span className="hud-portrait">
              <img src={portraitFor(player.id, activePlayerFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!portraitFor(player.id) && <Sword size={14} />}
            </span>
            <strong>{player.name}</strong>
            <span className="hud-form">{player.form}</span>
            <span className="hud-level">LV{player.level}</span>
          </div>
          <HPBar current={player.hp} max={player.maxHp} side="left" introFill={intro} />
          <div className="hud-info-row">
            <div className="hud-stats">
              <span>STR{player.str + pBuffs.str}</span><span>KI{player.ki + pBuffs.ki}</span><span>SPD{player.spd + pStages.spd * 8}</span>
              <span className="cc-stat"><b>{player.cc}</b></span>
            </div>
            {/* Fase GBC: ATTACK/DEFEND ENTRE las stats y los badges (sin fila propia) */}
            <span className={`hud-phase ${activeAttackerSide === 'player' ? 'phase-atk' : 'phase-def'}`}>
              {activeAttackerSide === 'player' ? 'ATTACK' : 'DEFEND'}
            </span>
            <div className="hud-status">
              {pStages.str > 0 && <span className="status-chip buff">STR+</span>}
              {pStages.str < 0 && <span className="status-chip debuff">STR−</span>}
              {pStages.ki > 0 && <span className="status-chip buff">KI+</span>}
              {pStages.ki < 0 && <span className="status-chip debuff">KI−</span>}
              {pStages.spd > 0 && <span className="status-chip buff">SPD+</span>}
              {pStages.spd < 0 && <span className="status-chip debuff">SPD−</span>}
              {pStages.guard > 0 && <span className="status-chip buff">G+</span>}
              {pStages.guard < 0 && <span className="status-chip debuff">G−</span>}
              {playerGuard && <span className="status-chip guard">{playerGuard.type === 'avoid_beam' ? 'BEAM' : playerGuard.type === 'avoid_damage' ? 'DAMAGE' : playerGuard.type === 'absorb' ? 'ABSORB' : playerGuard.type === 'reduce' ? 'GUARD' : 'CANCEL'}</span>}
              {pAcc > 0 && <span className="status-chip acc">ACC+</span>}
              {pEva > 0 && <span className="status-chip acc">EVA+</span>}
              {pLockOn && <span className="status-chip acc">LOCK</span>}
              {gatherTurns > 0 && <span className="status-chip power">{powerState.replace('_', ' ')}</span>}
              {pStages.str === 0 && pStages.ki === 0 && pStages.spd === 0 && pStages.guard === 0 && !playerGuard && pAcc === 0 && pEva === 0 && !pLockOn && gatherTurns === 0 && <span className="status-chip none">—</span>}
            </div>
          </div>
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
          <div className="hud-name" data-tip={tipBlock(`${enemy.name} — ${enemy.form} LV${enemy.level}`, [
            ['stats', `HP ${enemy.hp}/${enemy.maxHp}`],
            ['stats', `STR ${enemy.str} · KI ${enemy.ki} · SPD ${enemy.spd}`],
            ['desc', `POS: ${enemy.battlePos.replace('_', ' ')}`],
          ])}>
            <span className="hud-portrait">
              <img src={portraitFor(enemy.id, enemyFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!portraitFor(enemy.id) && <Shield size={14} />}
            </span>
            <strong>{enemy.name}</strong>
            <span className="hud-form">{enemy.form}</span>
            <span className="hud-level">LV{enemy.level}</span>
          </div>
          <HPBar current={enemy.hp} max={enemy.maxHp} side="right" introFill={intro} />
          <div className="hud-info-row">
            <div className="hud-stats">
              <span className="cc-stat"><b>{enemy.cc}</b></span><span>STR{enemy.str + eBuffs.str}</span><span>KI{enemy.ki + eBuffs.ki}</span><span>SPD{enemy.spd + eStages.spd * 8}</span>
            </div>
            <span className={`hud-phase ${activeAttackerSide === 'enemy' ? 'phase-atk' : 'phase-def'}`}>
              {activeAttackerSide === 'enemy' ? 'ATTACK' : 'DEFEND'}
            </span>
            <div className="hud-status right">
              {eStages.str > 0 && <span className="status-chip buff">STR+</span>}
              {eStages.str < 0 && <span className="status-chip debuff">STR−</span>}
              {eStages.ki > 0 && <span className="status-chip buff">KI+</span>}
              {eStages.ki < 0 && <span className="status-chip debuff">KI−</span>}
              {eStages.spd > 0 && <span className="status-chip buff">SPD+</span>}
              {eStages.spd < 0 && <span className="status-chip debuff">SPD−</span>}
              {eStages.guard > 0 && <span className="status-chip buff">G+</span>}
              {eStages.guard < 0 && <span className="status-chip debuff">G−</span>}
              {eStages.str === 0 && eStages.ki === 0 && eStages.spd === 0 && eStages.guard === 0 && <span className="status-chip none">—</span>}
            </div>
          </div>
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
        {/* Insignia central: ATK (quién ataca) · VS · ROUND (debajo) */}
        <div className="hud-center-badge">
          <span className="hud-center-atk">ATK {activeAttackerName.toUpperCase()}</span>
          <span className="hud-center-vs">VS</span>
          <span className="hud-center-round">ROUND {turn}</span>
        </div>
      </div>

      {/* Campo de batalla */}
      <div className={`battlefield ${hitShake ? `shake-${hitShake}` : ''} ${viewMode !== 'OVERVIEW' ? 'field-action' : ''} ${isPixiField() ? 'pixi-field-active' : ''}`} ref={battlefieldRef}>
        {isPixiField() && (
          <Suspense fallback={null}>
            <BattlePixiStage
              scenario={scenario}
              playerFormId={activePlayerFormId}
              enemyFormId={enemyFormId}
              playerPos={player.battlePos}
              enemyPos={enemy.battlePos}
              presentationRef={pixiPresRef}
              onPresentationReady={setPixiPresentationReady}
            />
          </Suspense>
        )}
        <div className="battle-bg authentic" style={{ backgroundImage: `url(${battleBgUrl})` }} />
        {/* Los fighters quedan SIEMPRE en el DOM: la transición OVERVIEW ↔ ACTION
            se hace con fade/scale suave por CSS (clase .field-action), no desmontando
            los sprites de golpe (2026-08-12: antes suppressFieldActors los eliminaba
            al instante y el cambio de vista era brusco). */}
        <div className={`battlefield-fighters ${suppressFieldActors ? 'suppressed' : ''}`}>
          {/* Anchors por lado: LEFT (jugador) y RIGHT (enemigo) usan X
              reflejadas — BACK apunta al borde propio de cada lado (spec) */}
          <div ref={playerRef} className={`fighter-container player ${POSITION_DATA[player.battlePos].altitude.toLowerCase()} ${POSITION_DATA[player.battlePos].depth.toLowerCase()} ${phase === 'stageInput' ? (qteFrozen ? 'qte-frozen' : qteIsDir ? 'qte-lunge' : 'qte-idle') : ''}`}
            style={{ left: `${anchorFor(player.battlePos, 'LEFT').x}%`, top: `${anchorFor(player.battlePos, 'LEFT').y}%`, ['--lunge-px' as string]: `${lungePx(player.battlePos, enemy.battlePos)}px` }}>
            {qtePose === 'idle' && overworldUrl(activePlayerFormId) && phase !== 'stageInput'
              ? <BattleOverworldSprite
                  formId={activePlayerFormId}
                  pose={playerPose}
                  side="left"
                  idleSrc={overworldUrl(activePlayerFormId)!}
                />
              : (spriteManifestUrl(activePlayerFormId)
                  ? <FighterSprite formId={activePlayerFormId} pose={qtePose} side="left" scale={15} flash={phase === 'stageInput' ? (qteFrozen ? false : stageQte.idx > 0) : flashPlayer} />
                  : <CharacterSprite formId={activePlayerFormId} className="sheet-sprite" height={152} side="left" />)}
            <div className="fighter-position-tag hidden">{player.battlePos.replace('_', ' ')}</div>
          </div>
          <div ref={enemyRef} className={`fighter-container enemy ${POSITION_DATA[enemy.battlePos].altitude.toLowerCase()} ${POSITION_DATA[enemy.battlePos].depth.toLowerCase()}`}
            style={{ left: `${anchorFor(enemy.battlePos, 'RIGHT').x}%`, top: `${anchorFor(enemy.battlePos, 'RIGHT').y}%` }}>
            {phase === 'stageInput' && spriteManifestUrl(enemyFormId)
              ? <FighterSprite formId={enemyFormId} pose={qteEnemyPose} side="right" scale={15} flash={qteResolving ? true : false} />
              : (enemyPose === 'idle' && overworldUrl(enemyFormId)
                  ? <img src={overworldUrl(enemyFormId)!} alt="" className="overworld-sprite" style={{ transform: `scaleX(${facingFlip(enemyFormId, 'right')})` }} />
                  : (spriteManifestUrl(enemyFormId)
                      ? <FighterSprite formId={enemyFormId} pose={enemyPose} side="right" scale={15} flash={flashEnemy} />
                      : <CharacterSprite formId={enemyFormId} className="sheet-sprite" height={152} side="right" />))}
            <div className="fighter-position-tag hidden">{enemy.battlePos.replace('_', ' ')}</div>
          </div>
        </div>
        {damageNums.map(dn => <DamageNumber key={dn.id} value={dn.value} type={dn.type} x={dn.x} y={dn.y} />)}
      </div>

      {/* Barra de fase */}
      <div className="phase-bar">
        <div className="phase-info">
          <span className="turn-label">{t('battle.turn')} {turn}</span>
          <span className="speed-order-label">{speedOrderLabel}</span>
          <span className="role-label role-atk">ATK {activeAttackerName.toUpperCase()}</span>
          <span className="role-label role-def">DEF {activeDefenderName.toUpperCase()}</span>
          <span className="phase-label">
            {phaseShortLabel}
            {phase !== 'win' && phase !== 'lose' && phase !== 'position' ? ` ${exchangeIndex + 1}/2` : ''}
          </span>
        </div>
      </div>

      <div className="cc-dock" aria-label="Card Cost">
        <div className="cc-pocket player">
          <span className="cc-pocket-label">P</span>
          <CCDisplay cc={player.cc} maxCc={player.maxCc} />
        </div>
        <div className="cc-pocket enemy">
          <span className="cc-pocket-label">E</span>
          <CCDisplay cc={enemy.cc} maxCc={enemy.maxCc} />
        </div>
      </div>

      {/* Controles */}
      <div className="battle-controls">
        {/* Cuadro de diálogo GBC: DENTRO de la caja, con la MISMA altura que
            los botones (80px) — el fondo se visualiza igual en todo momento */}
        {gbcMsg && (() => {
          // Lado del hablante: si el actor del mensaje es el ENEMIGO, el
          // sprite se coloca a la derecha; si es el JUGADOR, a la izquierda.
          const actorRaw = gbcMsg.match(/^(.+?)\s+uses\s/i)?.[1]
            ?? gbcMsg.match(/^(.+?)\s+—\s/)?.[1]
            ?? null;
          const pName = player.name.toLowerCase();
          const eName = enemy.name.toLowerCase();
          const lower = gbcMsg.toLowerCase();
          const isEnemy = actorRaw !== null
            ? (actorRaw.toLowerCase() === eName
              || (actorRaw.toLowerCase() !== pName && lower.includes(eName) && !lower.includes(pName)))
            : (lower.includes(eName) && !lower.includes(pName));
          const side: 'left' | 'right' | null = actorRaw === null ? null : (isEnemy ? 'right' : 'left');
          // Sprite de STORY del personaje que habla (retrato de las viñetas GBC)
          const speakerChar = isEnemy
            ? getForm(enemyFormId)?.character ?? 'goku'
            : getForm(activePlayerFormId)?.character ?? 'goku';
          const speakerForm = isEnemy ? enemyFormId : activePlayerFormId;
          const spriteUrl = storyPortraitUrl(speakerChar, speakerForm)
            || miniPortraitFor(speakerChar)
            || MENU_PORTRAITS[CHAR_PORTRAIT_ALIAS[speakerChar] ?? speakerChar];
          return (
            <div className={`gbc-dialogue speaker-${side ?? 'none'}`} key={gbcMsg}>
              <GbcDialogueText msg={gbcMsg} side={side} spriteUrl={spriteUrl} />
            </div>
          );
        })()}
        {drawFx && (
          <div className="draw-fx" key={drawFx.nonce} aria-label="drawing card">
            <CardVisual card={drawFx.card} selected={false} disabled={false} onClick={() => {}} />
          </div>
        )}
        {cardFx ? (
          <div className={`action-caption ${cardFx.card.type}`}>
            <div className="action-caption-kicker">
              {cardFx.step === 'attacker' ? 'ACTION SETUP' : cardFx.step === 'travel' ? 'SKILL TRAVEL' : cardFx.step === 'target' ? 'HIT RESULT' : 'FIELD RETURN'}
            </div>
            <div className="action-caption-main">
              <span>{cardFx.side === 'player' ? player.name : enemy.name}</span>
              <strong>{cardFx.card.name}</strong>
            </div>
            <div className="action-caption-sub">{cardEffectSummary(cardFx.card.effect)}</div>
          </div>
        ) : (
          <>
        {phase === 'discard' && (
          <div className="command-select">
            <div className="limit-panel discard-panel">
              <div className="limit-title">HAND CHECK — {hand.length} JOINT</div>
              <div className="discard-help">Demasiadas cartas ({hand.length} &gt; 5). Elige cuál descartar:</div>
              <div className="discard-grid">
                {hand.map((c, i) => (
                  <button key={`${c.id}-${i}`} className="discard-card" onClick={() => chooseDiscard(i)}
                    data-tip={tipBlock(`${c.name} — ${CARD_TYPE_NAMES[c.type]} ★${c.rarity}`, [
                      ['stats', `CC ${c.cc} · ATK ${c.atk > 0 ? c.atk : '—'} · ACC ${c.acc}%`],
                      c.description ? ['desc', c.description] : null,
                      ['effect', `Efecto: ${cardEffectSummary(c.effect)}`],
                    ])}>
                    <img src={CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.command} alt="" className="discard-frame" />
                    {cardIconUrl(c.id) && <img src={cardIconUrl(c.id)!} alt={c.name} className="discard-art" />}
                    <span className="discard-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {phase === 'command' && (
          <div className="command-select">
            <div className="command-strip">
              <button onClick={() => selectCommand('LIMIT')} className="cmd-limit" disabled={!limitsPowered || limitCards.length === 0}
                data-tip={tipBlock('LIMITED', [
                  ['desc', 'Cartas exclusivas del personaje.'],
                  ['desc', 'Reutilizables mientras tengas CC.'],
                  ['effect', 'Requiere GATHER POWER activo.'],
                ])} />
              <button onClick={() => selectCommand('J')} className="cmd-j"
                data-tip={tipBlock('JOINT', [
                  ['desc', 'Cartas de tu mano.'],
                  ['desc', 'Cuestan CC y se descartan al usarlas.'],
                ])} />
              <button onClick={() => selectCommand('B')} className="cmd-b"
                data-tip={tipBlock('BASIC', [
                  ['desc', 'Acciones libres sin CC.'],
                  ['desc', 'STAGE ATTACK (secuencia A/B) o GATHER POWER.'],
                ])} />
              {/* CHARA solo aparece en combates de equipo (FAQ: en individuales no existe) */}
              {player2 && (
                <button onClick={() => selectCommand('C')} className="cmd-c has-ally"
                  data-tip={tipBlock('CHARA', [
                    ['desc', `Cambia a ${player2.name}.`],
                    ['effect', 'Cuesta la acción del turno.'],
                  ])} />
              )}
            </div>
          </div>
        )}
        {phase === 'basic' && (
          <div className="command-select">
            <div className="basic-menu">
              {(() => {
                // ═══ STAGE = LA CARTA REAL del catálogo (igual que en la mano):
                // la carta del stage de N inputs tiene id N-2 (3→1, 4→2, 5→3,
                // 6→4). Cuando el stage cambia (GATHER → 4), cambia LA CARTA.
                const stages = powerState !== 'NORMAL' ? 4 : 3;
                const stageCard = getCard(stages - 2);
                if (!stageCard) return null;
                return (
                  <button className="card basic-stage-card" onClick={() => basicAction('stage')}
                    style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command}')`, '--card-color': CARD_COLORS[stageCard.type] } as React.CSSProperties}
                    data-tip={tipBlock(`STAGE ATTACK — ${stages} STAGE`, [
                      ['desc', 'Secuencia de inputs A/B a tiempo.'],
                      ['effect', 'Cada acierto +1 CC (más si completas la cadena).'],
                    ])}>
                    <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[stageCard.type] ?? CARD_FRAME_BY_TYPE.command} iconUrl={cardIconUrl(stageCard.id)} />
                  </button>
                );
              })()}
              <button className="basic-btn basic-gather" onClick={() => basicAction('gather')} disabled={gatherTurns > 0}
                data-tip={tipBlock('GATHER POWER', [
                  ['stats', 'STR/KI +8'],
                  ['effect', 'Activa el mazo LIMIT durante 2 turnos.'],
                ])} />
              <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setPhase('command'); }} />
            </div>
            <div className="command-help">{t('battle.basicFree')}</div>
          </div>
        )}
        {phase === 'limitSelect' && (
          <div className="command-select">
            {limitCards.length === 0 && <div className="limit-empty">{t('battle.limitHelp')}</div>}
            {/* MISMO layout que la mano: cartas 96×80 con marco GBC + arte en
                UNA línea; nombre/CC van en el tooltip (como las JOINT). El
                EXIT va en la MISMA fila, al final (como BASIC) — nunca abajo. */}
            <div className="limit-cards-row">
              <div className="hand-cards">
                {limitCards.map((c, i) => (
                  <button key={i} className={`limit-card ${player.cc < c.cc ? 'locked' : ''}`}
                    disabled={player.cc < c.cc} onClick={() => playLimit(c)}
                    style={{ '--card-frame': `url('${CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special}')` } as React.CSSProperties}
                    data-tip={tipBlock(`${c.name} — ${CARD_TYPE_NAMES[c.type]} ★${c.rarity}`, [
                      ['stats', `CC ${c.cc} · ATK ${c.atk > 0 ? c.atk : '—'} · ACC ${c.acc}%`],
                      c.description ? ['desc', c.description] : null,
                      ['effect', 'Reutilizable mientras tengas CC (GATHER POWER activo).'],
                    ])}>
                    <CardArtHole frameUrl={CARD_FRAME_BY_TYPE[c.type] ?? CARD_FRAME_BY_TYPE.special} iconUrl={cardIconUrl(c.id)} />
                  </button>
                ))}
                {/* Huecos: cartas Limit del personaje (GBC) NO obtenidas */}
                {(LIMIT_DEFAULTS[getForm(activePlayerFormId)?.character || ''] || [])
                  .filter(id => !limits.includes(id))
                  .map(id => (
                    <div key={`slot-${id}`} className="limit-slot" data-tip={tipBlock('LIMIT — NO OBTENIDA', [
                      ['desc', 'Se desbloquea jugando la historia.'],
                      ['effect', 'Requiere GATHER POWER para usarse.'],
                    ])}>
                      <Lock size={16} />
                    </div>
                  ))}
              </div>
              <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setPhase('command'); }} />
            </div>
            <div className="command-help">{t('battle.limitedHelp')}</div>
          </div>
        )}
        {phase === 'cardSelect' && (
          <>
            <HandComponent cards={hand} selectedIndex={selectedCard} onSelect={selectCard} isPlayable={card => canPlayInAttack(card) && player.cc >= card.cc && cardUsableBy(card, getForm(activePlayerFormId)!.character)} />
            <button className="basic-btn basic-back" onClick={() => { Sfx.cancel(); setSelectedCard(null); setPhase('command'); }}
              data-tip={tipBlock('BACK', [['desc', 'Volver al menú de comandos (sin jugar carta)']])} />
          </>
        )}
        {phase === 'stageInput' && (() => {
          const q = stageQte;
          if (q.state !== 'INPUT_WINDOW') return null;
          const curKey = q.seq[q.idx];
          const isDirPrompt = curKey === 'UP' || curKey === 'DOWN' || curKey === 'LEFT' || curKey === 'RIGHT';
          // Tiempo GLOBAL de la secuencia en SEGUNDOS GBC (ventana total del manual).
          const elapsedSec = (q.elapsedFrames / GBC_NATIVE_FPS).toFixed(1);
          const limitSec = (q.limitFrames / GBC_NATIVE_FPS).toFixed(1);
          const inCounter = false;
          const failed = false;
          const frozen = false;
          // Ventana de contraataque: A≈0.4s · B≈0.15s (HYPOTHESIS).
          const counterAOpen = inCounter && q.counterFrames <= COUNTER_A_FRAMES;
          const counterBOpen = inCounter && q.counterFrames <= COUNTER_B_FRAMES;
          // Iconos del paquete ORGANIZADO (DBZ_LSW_UI_AUX_ASSETS_V1): teclas
          // reales del teclado para A/B (Q/E) y las direcciones (↑/↓ + flechas).
          const keyIcon = (k: StageKey) => k === 'UP' ? 'arrow_up' : k === 'DOWN' ? 'arrow_down' : k === 'LEFT' ? 'arrow_left' : k === 'RIGHT' ? 'arrow_right' : k === 'A' ? 'key_q' : 'key_e';
          const keyLabel = (k: StageKey) => k === 'UP' ? 'W / ↑' : k === 'DOWN' ? 'S / ↓' : k === 'LEFT' ? 'A / ←' : k === 'RIGHT' ? 'D / →' : k === 'A' ? 'A (Q)' : 'B (E)';
          return (
          /* MISMO formato EXACTO que el diálogo: caja GBC (mismo ancho),
             sprite del personaje FUERA a la izquierda y los inputs DENTRO
             del cuadro, todo en UNA sola fila — nada superpuesto ni fuera */
          <div className={`gbc-dialogue speaker-left ${frozen ? 'stage-frozen' : ''}`} key={`stage-${q.idx}`}>
            <div className="gbc-dialogue-speaker left">
              <img src={storyPortraitUrl(player.id, activePlayerFormId) || portraitFor(player.id, activePlayerFormId) || ''} alt={player.name} className="gbc-dialogue-speaker-img" draggable={false} />
            </div>
            <div className="gbc-dialogue-body">
              <div className="stage-inline">
                {!frozen && (
                  <div className="stage-sequence">
                    {q.seq.map((k, i) => (
                      <span key={i} className={`stage-seq-item ${i < q.idx ? 'done' : i === q.idx ? 'current' : 'future'}`}>
                        {i < q.idx ? <span className="seq-check">✓</span> : <img src={`/assets/ui/qte/${keyIcon(k)}.png`} alt={keyLabel(k)} className="qte-key-sm" />}
                      </span>
                    ))}
                  </div>
                )}
                {!frozen && q.state === 'INPUT_WINDOW' && (
                  <div key={q.idx} className={`stage-inline-prompt ${stageFeedback ?? ''} ${curKey}`}>
                    <img src={`/assets/ui/qte/${keyIcon(curKey)}.png`} alt={curKey} className="qte-key-big" />
                  </div>
                )}
                {/* Tiempo NUMÉRICO: contando hacia arriba / máximo — sin barra */}
                <span className="stage-inline-time"><strong>{elapsedSec}</strong> / {limitSec}s</span>
              </div>
            </div>
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
                  <button className="basic-btn src-limit" onClick={() => { Sfx.select(); setDefendMenu('limit'); }} disabled={powerState === 'NORMAL' || limitCards.length === 0}
                    data-tip={tipBlock('LIMITED', [
                      ['desc', 'Defensas exclusivas del personaje.'],
                      ['effect', 'Requiere GATHER POWER activo.'],
                    ])} />
                  <button className="basic-btn src-joint" onClick={() => { Sfx.select(); setDefendMenu('joint'); }}
                    data-tip={tipBlock('JOINT', [
                      ['desc', 'Cartas de defensa/soporte de tu mano.'],
                      ['desc', 'Cuestan CC y se descartan al usarlas.'],
                    ])} />
                  <button className="basic-btn src-basic" onClick={() => { Sfx.select(); setDefendMenu('basic'); }}
                    data-tip={tipBlock('BASIC DEFENSE', [
                      ['desc', 'Quedarte y bloquear (−50% dmg) o MOVE para cambiar de posición (persistente).'],
                      ['effect', 'Gratis, sin gastar CC.'],
                    ])} />
                </div>
                <div className="command-help">{t('battle.defenseHelp')}</div>
              </>
            )}
            {defendMenu === 'basic' && (
              <>
                <div className="control-label">{t('battle.basicDefense')}</div>
                <div className="basic-menu">
                  <button className="basic-btn act-guard" onClick={() => defendBasic('defense')}
                    data-tip={tipBlock('DEFEND', [
                      ['desc', 'Bloqueas el ataque.'],
                      ['effect', 'Daño reducido −50% (sin gastar CC).'],
                    ])} />
                  <button className="basic-btn act-move" onClick={() => { Sfx.select(); setDefendMenu('move'); }}
                    data-tip={tipBlock('MOVE', [
                      ['desc', 'Cambias de posición táctica.'],
                      ['effect', 'La posición persiste entre fases (spec Move).'],
                    ])} />
                  <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setDefendMenu(null); }} />
                </div>
              </>
            )}
            {defendMenu === 'move' && (
              <div className="move-axis-pad">
                {/* Movement real del GBC: solo 2 ejes, cada uno transforma UN
                    eje y conserva el otro (nada de diagonales imposibles).
                    Sin texto: el tooltip lleva la info (spec UI). */}
                <button
                  className={`move-axis-btn axis-h ${moveAxisPreview === 'HORIZONTAL' ? 'preview' : ''}`}
                  onClick={() => confirmMoveAxis('HORIZONTAL')}
                  onMouseEnter={() => setMoveAxisPreview('HORIZONTAL')}
                  onMouseLeave={() => setMoveAxisPreview(null)}
                  data-tip={tipBlock('HORIZONTAL ↔', [
                    ['desc', `${t('battle.axisHorizontal')} — movimiento frontal.`],
                    ['effect', `${positionLabel(player.battlePos)} → ${positionLabel(applyMoveAxis(player.battlePos, 'HORIZONTAL'))}`],
                  ])} />
                <button
                  className={`move-axis-btn axis-v ${moveAxisPreview === 'VERTICAL' ? 'preview' : ''}`}
                  onClick={() => confirmMoveAxis('VERTICAL')}
                  onMouseEnter={() => setMoveAxisPreview('VERTICAL')}
                  onMouseLeave={() => setMoveAxisPreview(null)}
                  data-tip={tipBlock('VERTICAL ↕', [
                    ['desc', `${t('battle.axisVertical')} — movimiento de altura.`],
                    ['effect', `${positionLabel(player.battlePos)} → ${positionLabel(applyMoveAxis(player.battlePos, 'VERTICAL'))}`],
                  ])} />
                <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setDefendMenu(null); }} />
              </div>
            )}
            {defendMenu === 'joint' && (
              <div className="command-select">
                <div className="limit-panel">
                  <div className="limit-title">JOINT — {t('battle.defenseOnly')}</div>
                  {(() => {
                    const defCards = hand.filter(c => canPlayInDefense(c) && cardUsableBy(c, getForm(activePlayerFormId)!.character));
                    if (defCards.length === 0) return <div className="limit-empty">{t('battle.noDefenseCards')}</div>;
                    return defCards.map((c, i) => {
                      const handIdx = hand.indexOf(c);
                      return (
                        <button key={i} className={`limit-row ${player.cc < c.cc ? 'locked' : ''}`} disabled={player.cc < c.cc} onClick={() => defendJoint(c, handIdx)}>
                          <span className="limit-name">{c.name}</span>
                          <span className="limit-cost">{c.cc} CC · {c.type.toUpperCase()}</span>
                          {player.cc < c.cc && <span className="limit-lock">{t('battle.insufficientCc')}</span>}
                        </button>
                      );
                    });
                  })()}
                  <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setDefendMenu(null); }} />
                </div>
              </div>
            )}
            {defendMenu === 'limit' && (
              <div className="command-select">
                <div className="limit-panel">
                  <div className="limit-title">LIMITED — {t('battle.defenseOnly')}</div>
                  {(() => {
                    const defLimits = limitCards.filter(canPlayInDefense);
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
                  <button className="basic-btn basic-back" data-tip={tipBlock('BACK', TIP_BACK)} onClick={() => { Sfx.cancel(); setDefendMenu(null); }} />
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
          </>
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
  // Retrato del héroe activo: el PORTRAIT de menú del GBC (40×56) recortado a
  // transparencia (fondo eliminado) por defecto — el chibi de overworld 13×16
  // escalado se veía borroso (bug reportado 2026-08-12). Fallbacks: retrato de
  // batalla (32×24) y por último el overworld.
  const heroForm = ch ? getForm(ch.player) : undefined;
  const heroCharId = heroForm?.character
    || (ch ? ch.player.replace(/_base|_young|_ssj.*|_kami|_ultimate|_future|_kid.*/g, '') : '');
  const heroUrl = ch
    ? (MENU_PORTRAITS_CUT[heroCharId] || MENU_PORTRAITS[heroCharId] || portraitFor(heroCharId, ch.player) || overworldUrl(ch.player))
    : undefined;
  const heroChar = heroCharId ? characterName(heroCharId) : '';
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
  const keyboardVisualMenuIndex = keyboardMenuActive && hoveredMenuIndex === null ? selectedMenuIndex : null;
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
        <img className="menu-logo-mark" src="/logo-128.png" alt="" />
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
              className={`menu-item ${tone ? `tone-${tone}` : ''} ${secondary ? 'menu-item-settings' : ''} ${index === hoveredMenuIndex ? 'selected' : ''} ${index === keyboardVisualMenuIndex ? 'keyboard-selected' : ''}`}
              onMouseEnter={() => { setHoveredMenuIndex(index); setKeyboardMenuActive(false); }}
              onMouseLeave={() => setHoveredMenuIndex(null)}
              onFocus={() => { setSelectedMenuIndex(index); setKeyboardMenuActive(true); }}
              onClick={() => { Sfx.select(); onNavigate(screen); }}
              aria-current={index === keyboardVisualMenuIndex ? 'true' : undefined}
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
  { id: 29, nameKey: 'story.ch29', descKey: 'story.d29', enemy: 'buu_gohan', player: 'gohan_adult_ultimate' },
  { id: 30, nameKey: 'story.ch30', descKey: 'story.d30', enemy: 'buu_gotenks', player: 'gohan_adult_ultimate' },
  { id: 31, nameKey: 'story.ch31', descKey: 'story.d31', enemy: 'buu_gohan', player: 'vegito_ssj' },
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
      if (u && Array.isArray(u.characters) && Array.isArray(u.cards)) {
        const characters = Array.from(new Set([...STARTER_CHARACTERS, ...u.characters]));
        return { ...u, characters };
      }
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
  const [chars, setChars] = useState(0);       // typewriter: caracteres visibles
  const [exiting, setExiting] = useState(false);
  const panel = panels[Math.min(idx, panels.length - 1)];
  const fullText = panel.dialogue?.text ?? '';
  const writing = chars < fullText.length;

  // Máquina de escribir: revela el texto carácter a carácter (fluido GBC)
  useEffect(() => {
    setChars(0);
    if (!fullText) return;
    const spd = Math.max(14, GAMEPLAY_CONFIG.storyTextSpeedMs);
    let i = 0;
    const tm = setInterval(() => {
      i += 1;
      setChars(i);
      if (i >= fullText.length) clearInterval(tm);
    }, spd);
    return () => clearInterval(tm);
  }, [idx, fullText]);

  // Cinemática: jingle de Story Card al entrar en una viñeta CON TÍTULO
  // (el Prologue de fondo se reanuda solo al terminar el jingle).
  useEffect(() => {
    if (panel.title) playMusicOnce('jingle_story_card', 'prologue');
  }, [idx, panel.id, panel.title]);

  const hasDialogue = !!panel.dialogue;

  // Cinemáticas AUTO: las viñetas sin diálogo (títulos, escenas, impactos)
  // avanzan solas con duración cinematográfica; solo las de diálogo esperan clic.
  useEffect(() => {
    if (hasDialogue || exiting) return;
    const dur = panel.layout === 'FULL' ? 3600 : panel.layout === 'IMPACT' ? 3000 : 2800;
    const tm = setTimeout(() => advance(), dur);
    return () => clearTimeout(tm);
  }, [idx, panel.id, hasDialogue, exiting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quién habla: el personaje cuyo nombre coincide con el speaker del diálogo
  const speakingIdx = useMemo(() => {
    if (!panel.dialogue) return -1;
    const sp = panel.dialogue.speaker.trim().toLowerCase();
    return (panel.characters ?? []).findIndex(c =>
      characterName(c.character).toLowerCase() === sp
      || c.character.toLowerCase().replace(/[^a-z0-9]/g, '') === sp.replace(/[^a-z0-9]/g, '')
      || sp.includes(c.character.toLowerCase().split('_')[0]));
  }, [panel]);

  const advance = () => {
    if (writing) { setChars(fullText.length); return; }  // click = completar texto
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
      <div key={panel.id} className={`story-panel story-panel-${panel.layout.toLowerCase()} ${fxClass}`}>
        {/* Fondo del escenario */}
        <div className="story-panel-bg" style={{ backgroundImage: `url(${panel.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="story-panel-dim" />

        {/* Título de escena (FULL / IMPACT) — entrada cinematográfica */}
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
              const url = storyPortraitUrl(c.character, c.form, c.emotion) || miniPortraitFor(c.character) || MENU_PORTRAITS[CHAR_PORTRAIT_ALIAS[c.character] ?? c.character];
              const nChars = panel.characters?.length ?? 0;
              const side = c.side ?? (nChars === 1 ? 'center' : i === 0 ? 'left' : 'right');
              const isSpeaker = hasDialogue && speakingIdx === i;
              return (
                <div key={i} className={`story-character ${side}${isSpeaker ? ' speaking' : hasDialogue ? ' muted' : ''}`}>
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
            <div className={`story-text ${!writing ? 'visible' : ''}`}>
              {fullText.slice(0, chars)}{writing && <span className="story-cursor">▌</span>}
            </div>
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
  const [selected, setSelected] = useState<string>('gohan_young');
  // Secuencia de transformación: flash + aura al cambiar de forma (como el GBC)
  const [transformFx, setTransformFx] = useState(0);

  const pickForm = (fid: string) => {
    if (fid === selected) return;
    Sfx.transform();
    setTransformFx(nextUid());
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
// ⚠️ SOLO cartas genéricas (Users=48): el mazo por defecto debe ser usable
// por cualquier luchador (Gohan/Piccolo de salida). Las cartas de personaje
// se desbloquean y añaden desde el constructor de mazos.
const DEFAULT_DECK = [1, 1, 2, 2, 4, 5, 5, 6, 11, 29, 7, 8, 20, 43, 124, 124, 88, 117, 125, 121];

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
  const deckCards = deck.map(id => getCard(id)).filter(Boolean) as CardDef[];
  const deckPower = deckCards.reduce((sum, card) => sum + card.atk, 0);
  const deckAvgCc = deckCards.length ? Math.round(deckCards.reduce((sum, card) => sum + card.cc, 0) / deckCards.length) : 0;
  const deckTypeCounts = (['command', 'damage', 'beam', 'support', 'defense', 'special'] as const)
    .map(type => ({ type, count: deckCards.filter(card => card.type === type).length }))
    .filter(item => item.count > 0);

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
          <div className="deck-summary">
            <div className="deck-summary-row"><span>CARDS</span><b>{deck.length}/{DECK_SIZE}</b></div>
            <div className="deck-summary-row"><span>POWER</span><b>{deckPower}</b></div>
            <div className="deck-summary-row"><span>AVG CC</span><b>{deckAvgCc}</b></div>
          </div>
          <div className="deck-type-strip">
            {deckTypeCounts.map(({ type, count }) => {
              const I = TYPE_ICONS[type];
              return <span key={type} className="deck-type-pill" style={{ '--type-color': CARD_COLORS[type] } as React.CSSProperties}><I size={11} /> {count}</span>;
            })}
          </div>
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
  const [selectedId, setSelectedId] = useState<number>(() => CARDS.find(c => ownedCards(loadUnlocks(), prog.level).has(c.id))?.id ?? CARDS[0].id);

  const filtered = CARDS.filter(c => filter === 'all' || c.type === filter);
  const selectedCard = filtered.find(c => c.id === selectedId) ?? filtered[0] ?? CARDS[0];
  const selectedOwned = owned.has(selectedCard.id);
  const selectedStars = '★'.repeat(selectedCard.rarity) + '☆'.repeat(5 - selectedCard.rarity);

  useEffect(() => {
    if (!filtered.some(c => c.id === selectedId) && filtered[0]) setSelectedId(filtered[0].id);
  }, [filter, selectedId, filtered]);

  return (
    <div className="page-screen cards-screen">
      <div className="page-header">
        <button className="btn-back" onClick={() => onNavigate('main')}><ArrowLeft size={14} /></button>
        <h1 className="page-title">{t('cards.title')}</h1>
        <div className="deck-count">{owned.size}/{CARDS.length}</div>
      </div>
      <div className="cards-layout">
        <div className="cards-collection-panel">
          <div className="deck-toolbar cards-toolbar">
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
              const isSelected = card.id === selectedCard.id;
              if (!isOwned) {
                return (
                  <button key={card.id} className={`card card-unknown ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedId(card.id)}>
                    <div className="card-unknown-label">{t('common.unknown')}</div>
                    <div className="card-unknown-sub">{t('common.notObtained')}</div>
                  </button>
                );
              }
              return <CardVisual key={card.id} card={card} selected={isSelected} onClick={() => setSelectedId(card.id)} small />;
            })}
          </div>
        </div>
        <aside className={`card-detail-panel ui-sidebar ${selectedOwned ? '' : 'locked'}`} style={{ '--card-color': CARD_COLORS[selectedCard.type] } as React.CSSProperties}>
          <div key={selectedCard.id} className="card-detail-inner">
            <div className="card-detail-kicker">CARD FILE #{String(selectedCard.id).padStart(3, '0')}</div>
            <div className="card-detail-preview">
              {selectedOwned ? <CardVisual card={selectedCard} selected /> : (
                <div className="card-detail-unknown">
                  <div className="card-unknown-label">?</div>
                  <div className="card-unknown-sub">{t('common.notObtained')}</div>
                </div>
              )}
            </div>
            <div className="card-detail-name">{selectedOwned ? selectedCard.name : 'UNKNOWN CARD'}</div>
            <div className="card-detail-type">{selectedOwned ? CARD_TYPE_NAMES[selectedCard.type] : 'LOCKED'} · {selectedStars}</div>
            <div className="card-detail-stats">
              <div><span>CC</span><b>{selectedOwned ? selectedCard.cc : '??'}</b></div>
              <div><span>ATK</span><b>{selectedOwned ? selectedCard.atk : '??'}</b></div>
              <div><span>ACC</span><b>{selectedOwned ? `${selectedCard.acc}%` : '??'}</b></div>
            </div>
            <div className="card-detail-block">
              <span>EFFECT</span>
              <p>{selectedOwned ? cardEffectSummary(selectedCard.effect) : 'Obtain this card to reveal its battle behavior.'}</p>
            </div>
            <div className="card-detail-block compact">
              <span>COMPATIBILITY</span>
              <p>{selectedOwned ? cardCompatibilityLabel(selectedCard) : 'Unknown'}</p>
            </div>
            <div className={`card-detail-status ${selectedOwned ? 'owned' : 'locked'}`}>{selectedOwned ? 'OWNED' : 'NOT OBTAINED'}</div>
          </div>
        </aside>
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
  const [music, setMusicState] = useState(() => { try { return localStorage.getItem('dbzlsw.music') !== 'off'; } catch { return true; } });
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [screenMode, setScreenMode] = useState<'windowed' | 'fullscreen'>('windowed');

  const setVolume = (v: number) => { setVolumeState(v); setVolumeSfx(v / 100); setMusicVolume(v / 100); };
  const setSfx = (v: boolean) => { setSfxState(v); setSfxEnabled(v); if (v) Sfx.confirm(); };
  const setMusic = (v: boolean) => { setMusicState(v); setMusicEnabled(v); try { localStorage.setItem('dbzlsw.music', v ? 'on' : 'off'); } catch {} if (v) playMusic(musicForScreen('settings')); };

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
          <span className="setting-label"><Music size={12} /> Música (BSO)</span>
          <button className={`toggle ${music ? 'on' : ''}`} onClick={() => setMusic(!music)}>
            {music ? t('settings.on') : t('settings.off')}
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
  const [selected, setSelected] = useState('piccolo_base');
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
            {deckValid ? <><Swords size={15} /> {t('common.fight').toUpperCase()}</> : `DECK ${deckSize}/${DECK_SIZE}`}
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
            <div className="starter-deck-icon"><Sword size={26} strokeWidth={2.2} /></div>
            <div className="starter-deck-desc">Cont.Punch, Sonic Kick, Tail, Solid Shot...</div>
            <div className="starter-deck-cards">{dmgCards.map(c => c.name.slice(0, 12)).join(' · ')}</div>
          </button>
          <button className={`starter-deck-card ${hover === 'beam' ? 'hover' : ''}`}
            onMouseEnter={() => setHover('beam')} onMouseLeave={() => setHover(null)}
            onClick={() => choose('beam')}>
            <div className="starter-deck-name">ENERGY / BEAM</div>
            <div className="starter-deck-icon"><Sparkles size={26} strokeWidth={2.2} /></div>
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
  const [playerForm, setPlayerForm] = useState('gohan_young');
  const [enemyForm, setEnemyForm] = useState('piccolo_base');
  const [storyChapter, setStoryChapter] = useState<number | null>(null);
  const [storyScene, setStoryScene] = useState<{ chapter: number; phase: 'intro' | 'outro' } | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const [inDev, setInDev] = useState(() => isDevRoute());

  // Entrar/salir del Dev Studio por hash (#dev) o query (?dev=1)
  useEffect(() => {
    const onHash = () => setInDev(isDevRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Inicializar audio con el primer gesto del usuario (autoplay) y arrancar la BSO
  // (nunca en el Dev Studio: allí la música la controla su página 'Música')
  useEffect(() => {
    const onFirst = () => {
      initAudio();
      if (!inDev) playMusic(musicForScreen(screen));
      window.removeEventListener('pointerdown', onFirst);
    };
    window.addEventListener('pointerdown', onFirst);
    return () => window.removeEventListener('pointerdown', onFirst);
  }, [screen, inDev]);

  // BSO por pantalla: la música sigue al contexto del juego.
  // ⛔ En el Dev Studio NO suena nada de fondo: el dev panel reproduce
  // pistas solo desde su página 'Música' (player propio, sin tocar el motor).
  useEffect(() => {
    if (inDev) {
      stopMusic();
      return;
    }
    if (screen !== 'battle' && screen !== 'versus') {
      playMusic(musicForScreen(screen));
    }
    return () => { if (screen === 'main') stopMusic(); };
  }, [screen, inDev]);

  const startBattle = (playerFormId?: string) => {
    if (playerFormId) setPlayerForm(playerFormId);
    setStoryChapter(null);
    setEnemyForm('piccolo_base');
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const startVersus = (enemyFormId: string) => {
    setPlayerForm('gohan_young');
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

  if (inDev && DevStudio) {
    return <DevStudio
      onExit={() => setInDev(false)}
      onLaunchBattle={(playerFormId, enemyFormId, chapter) => {
        if (loadUnlocks().starterDeck === null) {
          startWithDeck('damage');
          setNeedsStarter(false);
        }
        setPlayerForm(playerFormId);
        setEnemyForm(enemyFormId);
        setStoryChapter(chapter);
        setBattleKey(k => k + 1);
        setInDev(false);
        setScreen('battle');
        // Salir del Dev Studio por completo: limpiar hash Y query (?dev=1)
        // para que isDevRoute() deje de devolver true (bug: con ?dev=1 en
        // la URL el hashchange volvía a entrar en el Dev Studio). Conserva
        // flags de depuración del Battle Lab: debugState/debugCinematics/pixiField.
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('dev');
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        } catch { /* noop */ }
      }}
    />;
  }

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
      <GlobalTooltip />
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


// ── Texto del diálogo GBC estructurado: actor (etiqueta) + mensaje ──
function GbcDialogueText({ msg, side, spriteUrl }: {
  msg: string;
  side?: 'left' | 'right' | null;
  spriteUrl?: string | null;
}) {
  let actor: string | null = null;
  let text = msg;
  const mUses = msg.match(/^(.+?)\s+uses\s+(.+)$/i);
  const mDash = msg.match(/^(.+?)\s+—\s+(.+)$/);
  if (mUses) { actor = mUses[1]; text = mUses[2]; }
  else if (mDash) { actor = mDash[1]; text = mDash[2]; }
  return (
    <>
      {/* Sprite de STORY del que habla, FUERA de la caja, en su lado del campo
          (izquierda/derecha) — con máscara (overflow) y marco negro como el
          cuadro. La caja NO cambia de tamaño. */}
      {spriteUrl && (
        <div className={`gbc-dialogue-speaker ${side === 'right' ? 'right' : 'left'}`} aria-hidden>
          <img src={spriteUrl} alt={actor ?? ''} className="gbc-dialogue-speaker-img" draggable={false} />
        </div>
      )}
      <div className="gbc-dialogue-body">
        <div className="gbc-dialogue-content">
          {actor && <div className="gbc-dialogue-actor">{actor}</div>}
          <div className="gbc-dialogue-text">{text}<span className="gbc-dialogue-cursor">▼</span></div>
        </div>
      </div>
    </>
  );
}

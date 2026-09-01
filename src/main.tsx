/** @refresh reload */
import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense, memo, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import './styles.css';
import './game-pages.css';
import './game-shell.css';
import './components/setup/setup-polish.css';
import './devtools/dev-layout.css';
import { GameShellSurface } from './components/GameShellSurface';
import { GamePageHeader } from './components/GamePageHeader';
import { applyHudTheme, loadHudTheme } from './data/hudTheme';
import { applyHudLayout } from './data/hudLayout';
import { applyHudButtonVars } from './data/hudAssets';
import { FORMS, CHARACTERS, ROM_ORDERED_CHARACTERS, getCharacter, getForm, idleSpriteUrl, statAtLevel, LIMIT_DEFAULTS, loadLimits, saveLimits } from './data/roster';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from './data/enemy_decks';
import { facingFlip, needsFlip } from './data/facing';
import { BattlePosition, POSITION_DATA, resolveRelativeDistance, isBeamVulnerable, isDamageVulnerable, anchorFor, applyMoveAxis, positionLabel, type MoveAxis } from './data/positions';
import { UNLOCK_KEY, STARTER_DAMAGE_DECK, STARTER_BEAM_DECK, STARTER_CHARACTERS, cardsForLevel, pickRewards, VS_UNLOCKS, isFormUnlocked, FORM_UNLOCK_LEVELS } from './data/unlocks';
import { CARDS, CARD_COLORS, CARD_COLORS_ON_LIGHT, CARD_TYPE_NAMES, CardDef, CardType, DECK_SIZE, MAX_COPIES, getCard, CardEffect } from './data/cards';
import {
  MAX_SAVED_DECKS,
  activeSavedDeck,
  addSavedDeck,
  deleteSavedDeck,
  isSavedDeckReady,
  loadDeckLibrary,
  renameSavedDeck,
  saveDeckLibrary,
  selectSavedDeck,
  starterDeckLibrary,
  updateActiveDeckCards,
  type DeckLibraryState,
} from './data/deckLibrary';
import { tipBlock, tipCard, TipPart } from './data/tooltips';
import {
  createBattleDeck, drawOne, playJoint, discardOne, needsDiscard,
  registerCardResolver, JointDeckState, HAND_MAX_TRANSITORY,
} from './battle/state';
import { resolveHitBlockAvoid, attackDamage } from './battle/combat';
import { CARD_FRAME_BY_TYPE, CARD_FRAME_SELECTED, CARD_FRAME_DISABLED } from './data/cardVisuals';
import { cardIconUrl, MENU_PORTRAITS, TYPE_ICONS } from './data/icons';
import { FitArt } from './components/FitArt';
import { CardArtHole } from './components/CardArtHole';
import { StageHudPanel } from './components/StageHudPanel';
import { GameViewport } from './components/GameViewport';
import { TeamSetup } from './components/setup/TeamSetup';
import { FormSelector } from './components/setup/FormSelector';

import { useTeamSetupState } from './components/setup/useTeamSetupState';
import { useRivalSetupState } from './components/setup/useRivalSetupState';
import { baseFormIdOf } from './components/setup/setupLogic';
import type { TeamMember, TeamSetupResult } from './components/setup/teamSetupTypes';
import { overworldUrl } from './data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrl } from './data/battleOverworld';
import { panelsForChapter, type StoryPanel, characterName } from './data/storyPanels';
import { resolveBattlePortraitStrict, resolveStoryPortraitStrict } from './data/portraitResolvers';
import { spriteManifestUrl, spriteFrameUrl, spriteDirFor } from './data/spriteManifest';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND, type BattleViewMode } from './data/scenarios';
import { stageForChapter, BATTLE_STAGES } from './data/battleBackgrounds';
import { GBC_NATIVE_FPS, type QteState } from './data/actionFidelity';
import { stageWindowsTicks, GAMEPLAY_CONFIG } from './config/gameplay.config';
import { stageInputPose, stageInputFieldPose, stageInputLunges } from './battle/stageInputMap';
import { GbcClockAdapter } from './battle/GbcClockAdapter';
import { nextStageSequence } from './battle/stageSequences';
import { nextTransformedForm } from './battle/transforms';
import { BattleTimeline, type CinematicEvent, type CinematicProfile } from './battle/timeline';
import {
  BATTLE_INTRO_PRESENTATION_CONFIG,
  INITIAL_BATTLE_INTRO_PRESENTATION,
  buildBattleIntroPresentation,
  buildPhaseBannerPresentation,
  reduceBattleIntroPresentation,
  type BattleIntroPresentationSnapshot,
  type PhaseBannerKind,
} from './battle/presentation/battleStartPresentation';
import { profileFor, type CinematicKind } from './battle/profiles';
import { actionSemanticsForCard } from './battle/actionProfiles';
import { resolveCombatPose, type BattleSpritePose } from './battle/spriteConfig';
import { cardBattlePose, cardUsableBy, OFFENSIVE_SUPPORT_EFFECTS, DEFENSIVE_EFFECTS } from './battle/cardPoses';
import { isDebugCinematics, bindDebugControls, renderDebugOverlay, type CinematicDebugInfo, type CinematicDebugController } from './battle/debugCinematics';
import { isDebugState, bindQteDebugControls, renderStateOverlay, type StateDebugSnapshot } from './battle/debugState';
import { getControlBoundary } from './battle/engine/state';
import { applyDamage } from './battle/engine/commands/reducers/damageReducer';
import { romStageDamage } from './battle/engine/combat/resolution';
import { isPixiField } from './renderer/pixi/flag';
// M8 — BattleRuntime: frontera única del combate (Engine → EventLog → M7
// Timeline → Presenter). M8.C1 migra MOVE + GUARD: la UI despacha al
// Engine y la posición/guardia finales se PROYECTAN desde la snapshot
// (runtime.state) — nunca se computan en React.
import { BattleRuntime, useBattleRuntime, createCuePresenter, type BattlePresenter } from './battle/runtime';
import { createInitialBattleState } from './battle/engine/state/createInitialBattleState';
import { battleOutcome } from './battle/engine/state/battleStateSelectors';
import { decideEnemyCommand, createEnemySession } from './battle/enemy/enemyController';
import type { BattleState, BattleFighterState } from './battle/engine/state/BattleState';
import { CHARA_SWITCH_COMMIT_OFFSET, CHARA_SWITCH_COMPLETED_OFFSET } from './battle/engine/rom/romDescriptors';
import { applyCinematicEvent } from './renderer/pixi/presentation/CinematicAdapter';
import type { PixiBattlePresentation } from './renderer/pixi/presentation/PixiBattlePresentation';
import { ProductionRomPresentationAdapter } from './renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomPresentationPlayer } from './renderer/pixi/presentation/RomPresentationPlayer';
import { romPresentationTimelineForCard } from './battle/romPresentationForCard';
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
// Botones GBC: las URLs de los sprites viven SOLO en HUD_ASSET_REGISTRY
// (P1 #6) — el CSS usa var(--btn-*).
try { applyHudButtonVars(); } catch { /* SSR / sin DOM */ }

type BattlePhase = 'position' | 'command' | 'basic' | 'limitSelect' | 'cardSelect' | 'stageInput' | 'enemyTurn' | 'defend' | 'discard' | 'win' | 'lose';
type BattleControlProjection =
  | 'INTRO'
  | 'PHASE_CUE'
  | 'PLAYER_ATTACK_CHOICE'
  | 'PLAYER_ACTION_RESOLVING'
  | 'PLAYER_DEFENSE_CHOICE'
  | 'ENEMY_ACTION_RESOLVING'
  | 'ROUND_TRANSITION'
  | 'TERMINAL'
  | 'RESULTS';

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

function resolveManifestPose(manifest: CharManifest, pose: BattleSpritePose | string): string | null {
  return resolveCombatPose(pose, p => manifest[p]?.frames?.length > 0);
}

function cardProjectileClass(card: CardDef): string {
  const visual = actionSemanticsForCard(card).visual;
  return `visual-${visual}`;
}

interface Fighter {
  id: string;
  formId: string;
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

/** Proyecta un BattleFighterState (Engine, id=forma) a Fighter (React, id=personaje).
 *  El swap C1b es autoritativo en runtime.state; React solo proyecta. */
function fighterToReact(f: BattleFighterState): Fighter {
  return {
    id: getForm(f.id)?.character ?? f.id,
    formId: f.id,
    name: f.name, form: f.form, level: f.level,
    maxHp: f.maxHp, hp: f.hp, str: f.str, ki: f.ki, spd: f.spd,
    maxCc: f.maxCc, cc: f.cc, battlePos: f.battlePos,
    battleId: f.battleId, limits: f.limits ?? [],
  };
}

// ─── Retratos de batalla: dominio estricto por formId ─────
function battlePortraitFor(formId: string): string | undefined {
  return resolveBattlePortraitStrict(formId).url;
}

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
function HPBar({ current, max, side, introFill = false, displayCurrent }: { current: number; max: number; side: 'left' | 'right'; introFill?: boolean; displayCurrent?: number }) {
  const visibleCurrent = displayCurrent ?? current;
  const displayPct = Math.max(0, Math.min(100, (visibleCurrent / max) * 100));
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  // Umbrales VISUALES (derivados del HP existente, sin gameplay nuevo):
  // >50% verde · 25–50% verde/amarillo (mid) · 12–25% naranja (low) ·
  // <12% rojo crítico (critical, parpadeo steps)
  const level = pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : '';
  return (
    <div className={`hp-bar ${side} ${level} ${introFill ? 'intro-fill' : ''}`}
      data-tip={tipBlock('HP', [['stats', `${current} / ${max}`]])}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${displayPct}%` }} />
        <div className="hp-bar-current" style={{ width: `${displayPct}%` }} />
      </div>
    </div>
  );
}

// ─── CC ───────────────────────────────────────────────────
// (CCDisplay eliminado: el CC vive en el chip cc-panel del panel inferior)

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

// Compatibilidad de carta por personaje — CANON en ./battle/cardPoses.ts
// (cardUsableBy importado arriba): undefined/[] = todos los luchadores; si
// lista, solo esos personajes. `notCompatible` = lista EXCLUIDA (el resto
// puede usarla) — p.ej. Stop Device no lo pueden usar los androides.

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
  // Centrado REAL: se mide el ancho del tooltip renderizado y se ajusta
  // para centrarlo en el elemento sin salirse del viewport (el clamp fijo
  // de 300px descentraba tooltips pequeños como el del CC junto al borde).
  const isHtml = tip.text.includes('tt-title');
  return createPortal(
    <TooltipBox tip={tip} isHtml={isHtml} />,
    document.body
  );
}

function TooltipBox({ tip, isHtml }: { tip: { text: string; x: number; y: number; dir: 'top' | 'bottom' }; isHtml: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [left, setLeft] = useState(tip.x);
  useLayoutEffect(() => {
    const w = ref.current?.offsetWidth ?? 0;
    setLeft(Math.max(w / 2 + 8, Math.min(tip.x, window.innerWidth - w / 2 - 8)));
  }, [tip.x, tip.text]);
  return (
    <div ref={ref} className={`global-tooltip dir-${tip.dir}`} style={{ left, top: tip.y }}
      dangerouslySetInnerHTML={isHtml ? { __html: tip.text } : undefined}>
      {isHtml ? null : tip.text}
    </div>
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

function BattleScreen({ playerFormId, enemyFormId, storyChapter, playerDeck, rivalReserve, onExit, onRematch, onMainMenu }: {
  playerFormId: string; enemyFormId: string; storyChapter: number | null; onExit: (won: boolean) => void;
  playerDeck?: number[]; rivalReserve?: TeamMember | null;
  onRematch: () => void; onMainMenu: () => void;
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
  // C1c — Form del fighter activo. Se proyecta desde runtime.state.player.id tras
  // CHARACTER_ACTION (el Engine hace el swap; React solo refleja). Antes del runtime
  // (pre-battle), usa la prop del capítulo. La transformación SSJ tiene prioridad.
  const [charaSwitchFormId, setCharaSwitchFormId] = useState<string | null>(null);
  const activePlayerFormId = playerTransformedForm ?? charaSwitchFormId ?? playerFormId;

  const [player, setPlayer] = useState<Fighter>(() => {
    const base: Fighter = {
      id: pf.character, formId: playerFormId, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,
      level: prog.level, maxHp: pf.hp, hp: pf.hp,
      str: pf.str, ki: pf.ki, spd: pf.spd, maxCc: 99, cc: 10,
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
      id: af.character, formId: teamBattle.ally, name: getCharacter(af.character)?.name || af.character, form: af.form,
      level: prog.level, maxHp: af.hp, hp: af.hp,
      str: af.str, ki: af.ki, spd: af.spd, maxCc: 99, cc: 10,
      battlePos: BattlePosition.DOWN_BACK, limits: [],
    };
    return applyLevelUps(base, prog.level);
  });
  const [enemy2, setEnemy2] = useState<Fighter | null>(() => {
    // Story mode: 2v2 from chapter config
    if (teamBattle?.enemy2) {
      const ef2 = getForm(teamBattle.enemy2)!;
      const b2 = storyChapter ? STORY_AI_BOOSTS[storyChapter] : null;
      const base: Fighter = {
        id: ef2.character, formId: teamBattle.enemy2, name: getCharacter(ef2.character)?.name || ef2.character, form: ef2.form,
        level: aiLevel, maxHp: ef2.hp + (b2?.hp || 0), hp: ef2.hp + (b2?.hp || 0),
        str: ef2.str + (b2?.str || 0), ki: ef2.ki + (b2?.ki || 0), spd: ef2.spd + (b2?.spd || 0),
        maxCc: 99, cc: 10, battlePos: BattlePosition.DOWN_BACK, limits: [],
      };
      return base;
    }
    // Versus mode: 2v2 from rival reserve
    if (rivalReserve) {
      const rf = getForm(rivalReserve.formId);
      if (!rf) return null;
      const base: Fighter = {
        id: rf.character, formId: rivalReserve.formId, name: getCharacter(rf.character)?.name || rf.character, form: rf.form,
        level: aiLevel, maxHp: rf.hp, hp: rf.hp,
        str: rf.str, ki: rf.ki, spd: rf.spd,
        maxCc: 99, cc: 10, battlePos: BattlePosition.DOWN_BACK, limits: [],
      };
      return applyLevelUps(base, aiLevel);
    }
    return null;
  });
  const [enemy, setEnemy] = useState<Fighter>(() => {
    // Story mode: stats FIJOS del jefe + su AI boost real (spreadsheet oficial)
    const boost = storyChapter ? STORY_AI_BOOSTS[storyChapter] : null;
    const base: Fighter = {
      id: ef.character, formId: enemyFormId, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,
      level: aiLevel, maxHp: ef.hp + (boost?.hp || 0), hp: ef.hp + (boost?.hp || 0),
      str: ef.str + (boost?.str || 0), ki: ef.ki + (boost?.ki || 0), spd: ef.spd + (boost?.spd || 0),
      maxCc: 99, cc: 10,
      battlePos: BattlePosition.DOWN_BACK, battleId: ef.battleId,
      limits: [],
    };
    // En versus: la IA escala con aiLevel=(playerLevel-1)*2+1; en story, stats fijos
    return storyChapter ? base : applyLevelUps(base, aiLevel);
  });
  const [phase, setPhase] = useState<BattlePhase>('position');
  const [turn, setTurn] = useState(1);
  // Presentación de entrada de combate: bloquea input visible, pero no es
  // autoridad de gameplay. El HP real ya está inicializado; el fill usa solo
  // displayedLife calculado por ticks.
  const [battleIntroPresentation, setBattleIntroPresentation] =
    useState<BattleIntroPresentationSnapshot>(INITIAL_BATTLE_INTRO_PRESENTATION);
  const intro = !battleIntroPresentation.completed;

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
  // (speedOrderLabel eliminado: quién ataca ya se sabe por la fase ATTACK/
  // DEFEND del hud superior — el chip STRIKES FIRST era redundante)
  // (bgId/BATTLE_BGS eliminados: los fondos viven en SCENARIOS — el
  // escenario random fija world/action/special según la situación)
  // ═══ DOS REPRESENTACIONES (estructura real del GBC) ═══
  // TACTICAL (OVERVIEW): fondo world_overview + sprites pequeños — selección,
  // posición, estado normal. ACTION: fondo battle_action + sprites grandes —
  // solo durante una acción (QTE, animación de ataque/beam/support).
  // ESCENARIO: en MODO HISTORIA el del capítulo (clasificación por arco:
  // Saiyan → Namek → Androides/Cell → Trunks → Entrenamiento → Buu); en
  // VERSUS, aleatorio del catálogo completo (mismas imágenes 160×80).
  const [scenario] = useState(() => {
    if (storyChapter != null) {
      const st = stageForChapter(storyChapter);
      return { id: st.key, overviewBackground: st.overview, actionBackground: st.action };
    }
    return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  });
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
    createBattleDeck(playerDeck ?? loadDeck()));
  const { hand, drawPile, discardPile } = deckState;

  // ── MAZO REAL DEL ENEMIGO ──
  // El rival también baraja su mazo UNA vez y roba de su drawPile en cada
  // Attack Phase (como el jugador). En story usa el mazo REAL del jefe
  // (STORY_ENEMY_DECKS); en versus un deck genérico de 20. La IA analiza
  // SOLO su mano (nunca el pool global infinito) y las Joint usadas van a
  // su discardPile. Ref para que la preparación del intent enemigo lea el
  // estado fresco.
  const [eDeckState, setEDeckState] = useState<JointDeckState>(() => {
    const ids = storyChapter ? (STORY_ENEMY_DECKS[storyChapter] || []) : STARTER_DAMAGE_DECK;
    return createBattleDeck(ids);   // las 20 del jefe, sin filtrar
  });
  const eDeckRef = useRef(eDeckState);
  eDeckRef.current = eDeckState;
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [, setLog] = useState<string[]>([t('battle.start')]);

  // ═══ M8.C1 — BattleRuntime: frontera única (Engine → EventLog → Timeline → Presenter) ═══
  // La UI despacha MOVE/GUARD al Engine; la posición/guardia finales se
  // PROYECTAN desde runtime.state (snapshot autoritativa) — React NO
  // computa destinos (sin applyMoveAxis aquí) ni guardias. El resto de
  // slices (melee/beam/…) seguirán despachando por aquí en M8.C2+.
  const runtimeRef = useRef<BattleRuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = new BattleRuntime({
      state: createInitialBattleState({
        playerFormId, playerName: player.name, playerForm: player.form, playerLevel: player.level,
        playerMaxHp: player.maxHp, playerHp: player.hp, playerStr: player.str, playerKi: player.ki, playerSpd: player.spd,
        playerMaxCc: player.maxCc, playerCc: player.cc,
        enemyFormId, enemyName: enemy.name, enemyForm: enemy.form, enemyLevel: enemy.level,
        enemyMaxHp: enemy.maxHp, enemyHp: enemy.hp, enemyStr: enemy.str, enemyKi: enemy.ki, enemySpd: enemy.spd,
        enemyMaxCc: enemy.maxCc, enemyCc: enemy.cc,
        playerPos: player.battlePos, enemyPos: enemy.battlePos,
        playerDeck: { drawPile: deckState.drawPile, hand: deckState.hand, discardPile: deckState.discardPile },
        enemyDeck: { drawPile: eDeckState.drawPile, hand: eDeckState.hand, discardPile: eDeckState.discardPile },
        playerLimits: [], playerFighterLimits: player.limits ?? [],
        // C1b — reserves (team-mode) alimentan el BattleState; 1v1 conserva null.
        player2: player2 && teamBattle?.ally ? { ...player2, id: teamBattle.ally, powerWindowCounter: 0 } : null,
        enemy2: enemy2 && teamBattle?.enemy2 ? { ...enemy2, id: teamBattle.enemy2, powerWindowCounter: 0 } : null,
        firstAttacker: turnOwnerRef.current ?? 'player',
        seed: 4242,
      }),
      context: {
        playerFormId, enemyFormId,
        overviewBackground: scenario.overviewBackground,
        actionBackground: scenario.actionBackground,
        specialActionBackground: SPECIAL_ACTION_BACKGROUND,
      },
      // M9 — Replay: el runtime acumula TODOS los timelines (historia).
      keepHistory: true,
    });
  }
  // Presenter M8.C1: consume los cues de MOVE/GUARD (poses move_front/
  // move_back/guard y posiciones) — el Presenter NUNCA muta BattleState.
  // El timeline es ACUMULATIVO (todo el log) y el resto del gameplay sigue
  // legacy: solo se aplican los cues migrados del LOTE recién despachado
  // (sourceEvent POSITION_CHANGED / GUARD_STARTED y logicalTick del lote).
  const pendingLotStart = useRef(-1);
  const [engineTick, setEngineTick] = useState(0);
  const presenter = useMemo<BattlePresenter>(() => ({
    consume({ timeline }) {
      const lotStart = pendingLotStart.current;
      if (lotStart < 0) return;
      for (const en of timeline.entries) {
        if (en.logicalTick < lotStart) continue;
        if (en.sourceEvent !== 'POSITION_CHANGED' && en.sourceEvent !== 'GUARD_STARTED') continue;
        const cue = en.cue;
        if (cue.type === 'FIGHTER_POSE') {
          // La pose va SIEMPRE al fighter de cue.side (MOVE/GUARD afectan a
          // su propio luchador). role ACTOR/TARGET es relativo a la acción.
          if (cue.side === 'player') setPlayerPose(cue.pose); else setEnemyPose(cue.pose);
        }
      }
      setEngineTick(v => v + 1);
    },
  }), []);
  const rtApi = useBattleRuntime({ runtime: runtimeRef.current, presenter });
  const { can: engineCan } = rtApi;
  // Snapshots proyectadas (selectores sobre runtime.state — autoridad).
  const enginePlayerPos = rtApi.runtime.state.player.battlePos;
  const engineEnemyPos = rtApi.runtime.state.enemy.battlePos;
  const enginePlayerGuard = rtApi.runtime.state.playerGuard;
  void engineTick;

  /**
   * M8.C1 — despacha al Engine con la ventana del lote marcada para el
   * Presenter. PUENTE TEMPORAL de cutover: mientras las fases sigan en
   * legacy (main.tsx setPhase), el Engine necesita el contexto real para
   * canExecute — se copia la fase ACTUAL (no se decide aquí; es el estado
   * observado del combate). Cuando M8 migre las fases, este sync desaparece
   * (el Engine será la única fuente).
   */
  const engineAct = (cmd: Parameters<BattleRuntime['dispatch']>[0], opts?: Parameters<BattleRuntime['dispatch']>[1]) => {
    const rt = rtApi.runtime;
    // M8.C2a — la fase del Engine NO tiene 'enemyTurn' (fase ≠ lado
    // atacante): cuando el enemigo ataca, la fase observable del jugador es
    // DEFENSE. El legacy usa 'enemyTurn' como espera presentacional → se
    // mapea a 'defend' (la ventana ya está comprometida si el jugador
    // eligió; si no, sigue esperando elección — el contrato no cambia).
    const enginePhase: BattleState['phase'] = phase === 'enemyTurn' ? 'defend' : phase as BattleState['phase'];
    rt.state = { ...rt.state, phase: enginePhase };
    pendingLotStart.current = rt.state.tick;
    const res = rt.dispatch(cmd, opts);
    pendingLotStart.current = -1;
    // Refresh manual: el hook useBattleRuntime.devuelve void en dispatch;
    // aquí necesitamos el DispatchResult (ok/reason) para proyectar.
    setEngineTick(v => v + 1);
    return res;
  };
  const engineDispatch: (cmd: Parameters<BattleRuntime['dispatch']>[0], opts?: Parameters<BattleRuntime['dispatch']>[1]) => ReturnType<BattleRuntime['dispatch']> = engineAct;
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
  const [phaseCue, setPhaseCue] = useState<{ id: number; phase: PhaseBannerKind } | null>(null);
  const [presentationCueLog, setPresentationCueLog] = useState<string[]>(['BATTLE_SESSION_START']);
  const phaseCueTimelineRef = useRef<BattleTimeline | null>(null);
  // Precarga de assets clave (sprites + fondos) con skeleton mientras tanto
  useEffect(() => {
    const urls = [
      overworldUrl(playerFormId), overworldUrl(enemyFormId),
      resolveBattlePortraitStrict(playerFormId).url, resolveBattlePortraitStrict(enemyFormId).url,
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
  const showPhaseCue = (phaseKind: PhaseBannerKind) => {
    phaseCueTimelineRef.current?.cancel();
    const profile = buildPhaseBannerPresentation(phaseKind);
    setPhaseCue({ id: nextUid(), phase: phaseKind });
    setPresentationCueLog(prev => [...prev.slice(-16), `PHASE_BANNER:${phaseKind}`]);
    const tl = new BattleTimeline(profile, {
      onEvent: (e) => {
        if (e.type !== 'MESSAGE') return;
        const payload = e.payload as { cue?: string; phase?: PhaseBannerKind } | undefined;
        if (payload?.cue) {
          const cue = payload.cue;
          setPresentationCueLog(prev => [...prev.slice(-16), payload.phase ? `${cue}:${payload.phase}` : cue]);
        }
        if (payload?.cue === 'PHASE_BANNER') setPhaseCue({ id: nextUid(), phase: payload.phase ?? phaseKind });
        if (payload?.cue === 'PHASE_BANNER_CLEAR') setPhaseCue(null);
      },
      onComplete: () => {
        setPhaseCue(null);
        phaseCueTimelineRef.current = null;
      },
    });
    phaseCueTimelineRef.current = tl;
    tl.start();
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
  type StageKey = 'A' | 'B' | 'UP' | 'DOWN' | 'RIGHT';
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
    prepFrames: number;       // frames transcurridos de la PREPARACIÓN (idle→estira→encoge→idle)
    covering: boolean;        // el jugador se cubre (eligió A en el contraataque)
    result: 'FULL_SUCCESS' | 'SAFE_ABORT' | 'COUNTER_HIT' | null;
    /** HP del defensor antes del Stage (para proyectar el daño del engine). */
    cardHpBefore?: number;
    /** HP del jugador antes del counter (para proyectar el daño recibido). */
    playerHpBefore?: number;
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
  const COUNTER_A_FRAMES = 25;   // ROM §7: A antes de 25 ticks (< 0,419 s)
  const COUNTER_B_FRAMES = 10;   // ROM §7: B antes de 10 ticks (< 0,167 s)
  const COUNTER_WINDOW_FRAMES = 30; // ROM §7: ventana A/B total 30 ticks
  const [stageQte, setStageQte] = useState<StageQteState>({
    state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null,
    elapsedFrames: 0, limitFrames: 0, counterFrames: 0, prepFrames: 0,
    result: null,
  });
  // IA real del GBC (battle.shtml): ataca regularmente → gather power →
  // 5 Stage Attack → Beam/Damage → repite. No usa energy cards sin gather.
  const aiRef = useRef({ mode: 0, attacks: 0, gathered: false, gatherStreak: 0 });
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [limits, setLimits] = useState<number[]>(() => {
    // Los limits se guardan por characterId (contrato setup/ROM §47).
    const charId = getForm(playerFormId)?.character ?? playerFormId;
    const assigned = loadLimits(charId);
    return assigned.length > 0 ? assigned : LIMIT_DEFAULTS[charId] || [];
  });

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
  // C1.0 — Production ROM Bridge: adaptador (frontera única cue→Pixi) + player
  // + instrumentación provenance (ROM|LEGACY). El adaptador es el MISMO que (b)
  // reutilizará (BattleRuntime.timeline → Presenter → este adaptador → Pixi).
  const romAdapterRef = useRef<ProductionRomPresentationAdapter | null>(null);
  const romPlayerRef = useRef<RomPresentationPlayer | null>(null);
  const presentationSourceRef = useRef<'ROM' | 'LEGACY'>('LEGACY');

  // P0 ROM TICKS Browser Validation: expose actor state to window for diagnostic page
  useEffect(() => {
    const bridge = {
      getPresentation: () => pixiPresRef.current,
      getActors: () => pixiPresRef.current?.inspectActors() ?? { left: null, right: null },
      getRomAdapter: () => romAdapterRef.current,
      getRuntime: () => runtimeRef.current,
    };
    (window as any).__ROM_TICKS_BRIDGE__ = bridge;
    return () => { delete (window as any).__ROM_TICKS_BRIDGE__; };
  }, []);

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
    romPlayerRef.current?.cancel();
    romPlayerRef.current = null;
    romAdapterRef.current = null;
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
    // C1.0 — Production ROM Bridge: si la carta tiene ruta ROM madura
    // (BEAM_BASE $02 / STANDARD_DAMAGE $0A), Pixi se gobierna por cues ROM
    // (NO por profileFor/applyCinematicEvent). El DOM legacy sigue en paralelo
    // y es quien dispara onDone (se retirará en (b)).
    const actorFormId = side === 'player' ? activePlayerFormId : enemyFormId;
    const romRoute = pixiPres ? romPresentationTimelineForCard(card, side, actorFormId) : null;
    const useRomPixi = !!romRoute;
    presentationSourceRef.current = useRomPixi ? 'ROM' : 'LEGACY';
    if (pixiPres) {
      pixiPres.reset();
      pixiPres.setAttacker(side === 'player' ? 'left' : 'right');
    }
    if (useRomPixi && romRoute && pixiPres) {
      const adapter = new ProductionRomPresentationAdapter(pixiPres, pixiPres.romPresenter);
      adapter.reset('ROM');
      romAdapterRef.current = adapter;
      romPlayerRef.current?.cancel();
      const player = new RomPresentationPlayer(romRoute.timeline, adapter, {
        onComplete: () => { romPlayerRef.current = null; pixiPres.returnToField(); },
      });
      romPlayerRef.current = player;
      player.start();
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
      // C1.0 — exclusividad: con ruta ROM, Pixi se gobierna por cues ROM;
      // nunca aplicar el CinematicProfile legacy al MISMO renderer.
      if (pixiPres && !useRomPixi) applyCinematicEvent(pixiPres, e);
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
        onTick: (tick) => { if (!useRomPixi) pixiPres?.sync(tick); if (isDebugCinematics()) refreshDebugInfo(tick); },
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
      onTick: (tick) => { if (!useRomPixi) pixiPres?.sync(tick); if (isDebugCinematics()) refreshDebugInfo(tick); },
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
      addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`, { gbc: false });
      // La posición PERSISTE entre fases (spec Move): el atacante no elige
      // posición, va directo a seleccionar su acción. Robo de Joint al entrar
      // en Attack Phase (máx 6 transitorio, 5 persistente).
      drawJointForAttack();
      setPhase('command');
      showPhaseCue('ATTACK');
    } else {
      const actor = getForm(enemyFormId)!.character.toUpperCase();
      setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
      addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`, { gbc: false });
      prepareEnemyIncomingAttack();
    }
  };

  const enterDefensePhase = (incomingName: string) => {
    // M8.C2a — ventana defensiva NUEVA: el Engine abre la elección
    // (defenseChoice = null) ANTES de pedir input. Sin esto, la elección
    // comprometida en un exchange anterior bloquearía GUARD/MOVE/carta
    // (DEFENSE_ALREADY_COMMITTED) — el juego quedaría atascado en la
    // segunda defensa del combate.
    void incomingName;
    engineAct({ type: 'RESET_DEFENSE' }, { side: 'player' });
    setDefendMenu(null);
    setPhase('defend');
    showPhaseCue('DEFENSE');
  };

  // TURN_START: recalcular SPD → fijar firstAttacker → Exchange 1 (spec §1-2)
  const beginTurn = () => {
    // Cambio de turno: campanilla GBC al arrancar el round
    if (turn > 1) Sfx.turnChange();
    // Decay de precisión/evasión (Reading Ki/Afterimage: 2 turnos)
    setPAcc(prev => (prev > 0 ? prev - 1 : 0));
    setPEva(prev => (prev > 0 ? prev - 1 : 0));
    // ⚠️ FIDELITY V10 — los STAT STAGES NO caducan por turnos (manual
    // GameFAQs + comunidad): los cambios de parámetros de las Support Cards
    // duran HASTA EL FINAL DE LA BATALLA (máx ±3 niveles, clampStage) y solo
    // una carta específica (powerup_dispel/support_dispel) los anula.
    // El GATHER POWER sí tiene duración, pero es un estado APARTE
    // (powerState FULL→HALF→NORMAL con gatherTurns), no pStages/eStages.
    // M8.C2a-L — la INICIATIVA la recalcula el ENGINE en END_EXCHANGE
    // (speedOrder con SPD efectiva: base + stages × 8; empate → persiste la
    // iniciativa actual, determinista — el Engine es puro, sin Math.random).
    // React SOLO proyecta la snapshot: nunca decide el orden (AUTHORITY).
    const first: 'player' | 'enemy' = rtApi.runtime.state.activeSide;
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
  // M8.C2a-L — la transición es AUTORITATIVA en el Engine: END_EXCHANGE
  // (exchange 0→1 mismo turno · exchange 1→turn+1/exchange 0/initiativa
  // recalculada). React proyecta turn/exchange/turnOwner desde la snapshot.
  const advanceExchange = () => {
    if (exchangeBusy.current) return;
    exchangeBusy.current = true;
    engineAct({ type: 'END_EXCHANGE' }, { side: 'player' });
    const st = rtApi.runtime.state;
    setTurn(st.turn);
    setTurnOwner(st.activeSide); // ENGINE-SNAPSHOT (M8.C2a-L)
    if (exchangeIndex === 0) {
      // Exchange 2: el otro luchador ataca (spec §1)
      setExchangeIndex(1);
      const second: 'player' | 'enemy' = st.activeSide === 'player' ? 'enemy' : 'player';
      startExchange(second);
    } else {
      // TURN_END → nuevo turno: la iniciativa YA la recalculó el Engine
      // (END_EXCHANGE → speedOrder) y el turno ya está incrementado.
      advanceGatherPowerRound();
      setExchangeIndex(0);
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
      else if (k === 'd' || e.key === 'ArrowRight') key = 'RIGHT';
      // LEFT ($02) NO es comando Stage (máscara ROM $3D): 'a'/ArrowLeft no
      // consumen ningún input del QTE (P0.4S — sin avance de índice).
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

  // Arranque: presentación determinista por ticks. Al terminar el fill de
  // vida se entra en el exchange real, que aplica +3 CC/draw y muestra el
  // banner de fase derivado de la iniciativa.
  const startedRef = useRef(false);
  const introTimelineRef = useRef<BattleTimeline | null>(null);
  useEffect(() => {
    const profile = buildBattleIntroPresentation(rtApi.runtime.state);
    const tl = new BattleTimeline(profile, {
      onEvent: (e) => {
        if (e.type !== 'MESSAGE') return;
        const payload = e.payload as { cue?: string } | undefined;
        if (!payload?.cue) return;
        setPresentationCueLog(prev => [...prev.slice(-16), payload.cue!]);
      },
      onTick: (tick) => {
        setBattleIntroPresentation(prev => reduceBattleIntroPresentation(prev, tick));
      },
      onComplete: () => {
        setBattleIntroPresentation(prev => ({
          ...reduceBattleIntroPresentation(prev, BATTLE_INTRO_PRESENTATION_CONFIG.countersVisible.ticks + 1),
          completed: true,
          inputLocked: true,
          introOverlayVisible: false,
          cues: [...prev.cues, 'BATTLE_INTRO_COMPLETED'],
        }));
        if (!startedRef.current) {
          startedRef.current = true;
          beginTurn();
        }
      },
    });
    introTimelineRef.current = tl;
    tl.start();
    return () => {
      tl.cancel();
      if (introTimelineRef.current === tl) introTimelineRef.current = null;
      phaseCueTimelineRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gatherPower = () => {
    // M8.C2 — el ENGINE decide el gather (GATHER_POWER → powerState
    // FULL_POWER + gatherTurns 2, autoritativo). El legacy proyecta para
    // la UI (pStages +0.5 STR/KI es presentación de stat stages, que el
    // modelo del engine aún no cubre — pendiente del slice de stats).
    const res = engineDispatch({ type: 'GATHER_POWER' });
    void res;
    Sfx.powerUp();
    Sfx.star();
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
      // M8.C2a — frontera única: sin auto-start enemigo tras la animación
      // del jugador (el enemigo entra por DEFENSE con input real).
      settleAttackHand(afterPlayerAction);
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
      // C1b — CHARA: cambio de miembro AUTORITATIVO en el Engine (ROM §116-126).
      // React NO decide quién cambia: dispatch CHARACTER_ACTION, el Engine
      // programa el swap diferido y lo ejecuta en COMMITTED @ T+63; React solo
      // proyecta runtime.state.
      if (!player2) { addLog(t('battle.noAlly')); Sfx.cancel(); return; }
      Sfx.confirm();
      const res = engineDispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });
      if (!res.ok) { addLog(t('battle.noAlly')); Sfx.cancel(); return; }
      // COMMIT @ T+63: el Engine intercambia player ↔ player2 (entidad completa).
      rtApi.advance(CHARA_SWITCH_COMMIT_OFFSET);
      // Proyección autoritativa desde runtime.state.
      const rt = rtApi.runtime;
      setPlayer(fighterToReact(rt.state.player));
      setPlayer2(rt.state.player2 ? fighterToReact(rt.state.player2) : null);
      // C1c — El sprite del jugador cambia al nuevo miembro tras el swap.
      // runtime.state.player.id es el form ID autoritativo (gohan_young / goku_base).
      setCharaSwitchFormId(rt.state.player.id);
      // COMPLETED @ T+95: cleanup + maintenance (powerWindow 2 → 1).
      rtApi.advance(CHARA_SWITCH_COMPLETED_OFFSET - CHARA_SWITCH_COMMIT_OFFSET);
      setPlayerPose('idle');
      addLog(`${rt.state.player.name} entra al combate! (CHARA)`);
      settleAttackHand(afterPlayerAction);
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
  // ═══ PREPARACIÓN del Stage (M8, canon GBC) ═══
  // Al usar la carta: fade → plano ACTION → animación de preparación
  //   idle (12t) → gather_power / estira brazos (18t) → beam_charge /
  //   encoge brazos (18t) → idle (12t)  [60 ticks ≈ 1s]
  // En el ÚLTIMO idle aparecen los inputs y arranca el cronómetro.
  // Mientras tanto el panel inferior se ve VACÍO (caja GBC sin inputs).
  const STAGE_PREP_TICKS = 60;
  const PREP_PHASES: Array<{ until: number; pose: BattleSpritePose }> = [
    { until: 12, pose: 'idle' },
    { until: 30, pose: 'gather_power' },   // estira brazos
    { until: 48, pose: 'beam_charge' },    // encoge brazos (manos juntas)
    { until: STAGE_PREP_TICKS, pose: 'idle' }, // último idle → inputs
  ];
  const stagePrepPose = (pf: number): BattleSpritePose =>
    (PREP_PHASES.find(ph => pf < ph.until) ?? PREP_PHASES[PREP_PHASES.length - 1]).pose;

  const startStageAttack = (card: CardDef) => {
    // ── STAGE DEBUG: trace lifecycle ──
    console.log('[STAGE DEBUG] startStageAttack called', { card: card.name, phase, cc: player.cc });
    // M8.C2 — el QTE vive en el ENGINE (estado autoritativo). El legacy
    // genera la secuencia con la MISMA fuente (stageSequences.ts, pool por
    // nivel + ventana por profundidad) y la SINCRONIZA al engine: los
    // QTE_INPUT posteriores validan contra runtime.state.stageQte y las
    // mutaciones (CC/correct/COMPLETED) salen de ahí (shadow parity).
    // (El deck de la mano sigue legacy en este slice — PLAY_CARD del engine
    //  requiere mano sincronizada, pendiente del slice de cartas.)
    const stages: 3 | 4 | 5 | 6 = card.name.includes('6') ? 6
      : card.name.includes('5') ? 5
      : card.name.includes('4') ? 4 : 3;
    const seq = nextStageSequence(stages);
    const sequenceWindow = resolveStageWindow();
    const rt = rtApi.runtime;
    // Sincronizar CC del engine con el legacy (el coste se pagó en legacy;
    // el engine suma la ganancia del QTE sobre este valor).
    rt.state = {
      ...rt.state,
      phase: 'stageInput',
      player: { ...rt.state.player, cc: player.cc },
      stageQte: {
        state: 'PREPARING', seq, idx: 0, correct: 0, repaired: 0, card: null,
        startedTick: rt.state.tick, inputOpenTick: rt.state.tick + STAGE_PREP_TICKS,
        deadlineTick: rt.state.tick + STAGE_PREP_TICKS + sequenceWindow, windowTicks: sequenceWindow,
        counterStartTick: 0, counterDeadlineTick: 0, result: null,
      },
    };
    commitQte({
      state: 'PREPARING', seq, idx: 0, correct: 0, covering: false, card,
      elapsedFrames: 0, limitFrames: sequenceWindow, counterFrames: 0,
      prepFrames: 0, result: null,
      cardHpBefore: rt.state.enemy.hp,
      playerHpBefore: rt.state.player.hp,
    });
    setViewMode('ACTION');
    setPhase('stageInput');
    Sfx.cardPlay();
    addLog('Stage Attack — preparación…');
  };

  // ═══ Reloj del QTE: monotónico, en FRAMES GBC (manual GBC) ═══
  // Un único bucle rAF acumula tiempo real y lo convierte a frames GBC.
  // 2026-08-12 (manual USA): la ventana es GLOBAL para TODA la secuencia
  // (nunca se reinicia por input) y depende de la posición relativa:
  // REAR+REAR=1.2s … FRONT+FRONT=2.9s. Al fallar, el rival CONTRAATACA con su
  // propia ventana corta de ENTER COMMAND (A≈0.4s / B≈0.15s, HYPOTHESIS).
  useEffect(() => {
    if (phase !== 'stageInput') return;
    console.log('[STAGE DEBUG] rAF useEffect started', { phase, qteState: stageQteRef.current?.state });
    let raf = 0;
    let last = performance.now();
    qteDebugRef.current.stepFrames = 0; // limpia steps residuales de otro QTE
    // M6 — el reloj REAL alimenta el ENGINE (autoridad): rAF → GbcClockAdapter
    // → rtApi.advance(ticks). El engine transiciona PREPARING→INPUT_WINDOW
    // (QTE_STARTED), expira el deadline global y abre COUNTER_WINDOW. El
    // shadow de React SOLO proyecta el estado del engine (shadow parity).
    const clockAdapter = new GbcClockAdapter();
    let acc = 0; // acumulador de frames GBC (proyección visual únicamente)
    let counterAcc = 0; // acumulador propio de la ventana de contraataque (visual)
    const tick = (now: number) => {
      const realDeltaMs = now - last;
      last = now;
      // Debugger QTE (?debugState=1): congelado ⇒ el reloj real se ignora y
      // stepFrames (inyectado por tecla) avanza frame a frame.
      const dbg = qteDebugRef.current;
      const realDelta = (realDeltaMs / 1000) * GBC_NATIVE_FPS;
      const delta = dbg.frozen ? dbg.stepFrames : realDelta;
      if (dbg.frozen) dbg.stepFrames = 0;
      // 1) Alimentar el ENGINE con el tiempo real (única fuente de verdad).
      const ticks = clockAdapter.push(dbg.frozen ? delta * (1000 / GBC_NATIVE_FPS) : realDeltaMs);
      if (ticks > 0) {
        const rtBefore = rtApi.runtime.state.stageQte.state;
        rtApi.advance(ticks);
        const rtAfter = rtApi.runtime.state.stageQte;
        // QTE_STARTED / QTE_TIMEOUT / counter-resolved los emite el ENGINE;
        // el shadow proyecta.
        if (rtBefore !== rtAfter.state) {
          const q = rtApi.runtime.state.stageQte;
          if (q.state === 'INPUT_WINDOW') {
            console.log('[STAGE DEBUG] ENGINE: PREPARING → INPUT_WINDOW', { q });
            Sfx.confirm();
            addLog('Stage Attack — ¡inputs!');
          } else if (q.state === 'COUNTER_WINDOW') {
            console.log('[STAGE DEBUG] ENGINE: → COUNTER_WINDOW (timeout)');
            enterStageFailure('TIMEOUT');
          } else if (q.state === 'WAITING' && rtBefore === 'COUNTER_WINDOW') {
            // El clock resolvió el counter (TIMEOUT) → daño al jugador ya
            // aplicado por el engine; el shadow proyecta y cierra el Stage.
            console.log('[STAGE DEBUG] ENGINE: COUNTER_WINDOW → WAITING (counter resuelto)');
            const stNow = stageQteRef.current;
            if (stNow.state === 'COUNTER_WINDOW') {
              commitQte({ ...stNow, state: 'COUNTER_HIT', result: 'COUNTER_HIT' });
              resolveStageResult();
            }
          }
        }
      }
      const st = stageQteRef.current;
      acc += delta;
      // Proyección autoritativa: el shadow SIEMPRE sigue al engine (estado,
      // índice, correct, repaired). El engine decide las transiciones.
      const qe = rtApi.runtime.state.stageQte;
      if (qe.state !== st.state || qe.idx !== st.idx || qe.correct !== st.correct) {
        commitQte({ ...st, state: qe.state, idx: qe.idx, correct: qe.correct, result: qe.result ?? st.result });
      }
      if (st.state === 'PREPARING') {
        // Proyección visual de la preparación (el ENGINE decide cuándo abre
        // la ventana: inputOpenTick). El shadow solo refleja frames.
        const pf = Math.min(Math.floor(acc), STAGE_PREP_TICKS);
        setStageQte(prev => ({ ...prev, prepFrames: pf }));
      } else if (st.state === 'INPUT_WINDOW') {
        const elapsed = Math.floor(acc);
        setStageQte(prev => ({ ...prev, elapsedFrames: Math.max(prev.elapsedFrames, elapsed) }));
        // El timeout de la secuencia lo maneja el ENGINE (deadlineTick); el
        // shadow ya no corta por su cuenta.
      } else if (st.state === 'COUNTER_WINDOW') {
        counterAcc += delta;
        const cf = Math.floor(counterAcc);
        setStageQte(prev => ({ ...prev, counterFrames: cf }));
        // El fin de la ventana A/B lo resuelve el ENGINE (counterDeadlineTick).
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ═══ Input correcto/incorrecto (spec §7-8: NO aplica HP por input) ═══
  // M8.C2 — la decisión del input la toma el ENGINE (qteCorrectInput /
  // qteWrongInput): CC/correct/COMPLETED/COUNTER_WINDOW salen de
  // runtime.state — React solo proyecta (shadow parity: mismo resultado
  // observable, estado autoritativo en el Engine).
  const submitStageInput = (pressed: StageKey) => {
    const st = stageQteRef.current;
    if (st.state !== 'INPUT_WINDOW') return;
    const res = engineDispatch({ type: 'QTE_INPUT', input: pressed });
    if (!res.ok) return;
    const q = rtApi.runtime.state.stageQte;
    const newCorrect = q.correct;
    const completed = q.state === 'COMPLETED';
    const resolved = res.events.find(e => e.type === 'QTE_INPUT_RESOLVED');
    const success = resolved?.success ?? false;
    if (success) {
      // Acierto: +1 CC, avanza el cursor y la animación; NADA de daño aún.
      Sfx.qteCorrect();
      // CC proyectado del Engine (el reducer ya lo sumó).
      setPlayer(prev => ({ ...prev, cc: Math.min(prev.maxCc, rtApi.runtime.state.player.cc) }));
      flashFeedback('correct');
      if (completed) {
        // Secuencia completa → COMPLETED → se ejecuta la ANIMACIÓN de la acción
        // (GBC: el QTE solo es la introducción; la acción se ve al completarlo).
        commitQte({ ...st, state: 'COMPLETED', idx: q.idx, correct: newCorrect, result: 'FULL_SUCCESS' });
        addLog(`${player.name} completa el Stage Attack! (+${newCorrect + q.repaired} CC)`);
        resolveStageResult();
      } else {
        // Avanza el cursor; el reloj de la secuencia SIGUE corriendo (global)
        commitQte({ ...st, idx: q.idx, correct: newCorrect });
      }
    } else {
      // Fallo: input equivocado → el RIVAL CONTRAATACA (manual GBC).
      // El engine ya pasó a COUNTER_WINDOW (qteWrongInput) — el shadow
      // solo refleja el estado autoritativo.
      flashFeedback('wrong');
      Sfx.qteFail();
      addLog(`${player.name} falla un input — ¡${enemy.name} contraataca!`);
      enterStageFailure('WRONG_INPUT');
    }
  };

  // ═══ Entrada en COUNTER_WINDOW (input malo o timeout) ═══
  // El rival obtiene una oportunidad de contraataque (manual GBC). El luchador
  // se queda QUIETO en la pose del golpe fallido mientras aparece ENTER COMMAND
  // (ventana corta de timing: A≈0.4s / B≈0.15s — HYPOTHESIS).
  // M8.C2 — el engine ya pasó a COUNTER_WINDOW (qteWrongInput / timeout);
  // aquí solo se refleja en el estado de presentación legacy.
  const enterStageFailure = (reason: 'WRONG_INPUT' | 'TIMEOUT' | 'DEFENSE_CARD') => {
    const st = stageQteRef.current;
    if (st.state !== 'INPUT_WINDOW') return;
    // El engine ya está en COUNTER_WINDOW (despachado en submitStageInput o
    // por el timeout del reloj); el legacy solo refleja el estado para la UI.
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
  // M8.C2 — la decisión la toma el ENGINE (QTE_COUNTER_DEFEND / CONTINUE).
  const stageRecoverInput = (pressed: StageKey) => {
    const st = stageQteRef.current;
    if (st.state !== 'COUNTER_WINDOW') return;
    if (pressed === 'A' && st.counterFrames < COUNTER_A_FRAMES) {
      const res = engineDispatch({ type: 'QTE_COUNTER_DEFEND' });
      void res;
      // A = BANK/DEFEND (ROM §94: A<25t NO repara; finaliza con progreso
      // acumulado). El daño parcial ya lo aplicó el ENGINE (QTE_COUNTER_DEFEND
      // → resolvePartialStageDamage); el shadow solo proyecta.
      const q = rtApi.runtime.state.stageQte;
      Sfx.cancel();
      setPlayerPose('guard');
      addLog(`${player.name} se defiende del contraataque (conserva +${q.correct + q.repaired} CC)`);
      commitQte({ ...st, state: 'SAFE_ABORT', covering: true, result: 'SAFE_ABORT' });
      resolveStageResult();
    } else if (pressed === 'B' && st.counterFrames < COUNTER_B_FRAMES) {
      const res = engineDispatch({ type: 'QTE_COUNTER_CONTINUE' });
      void res;
      // B = REPAIR (ROM §7/§94): repara el comando fallado (cuenta como
      // resuelto, +1 CC) y continúa la secuencia con el TIMER GLOBAL
      // original — el reloj NO se reinicia (ROM §7).
      const q = rtApi.runtime.state.stageQte;
      Sfx.confirm();
      addLog(`${player.name} repara el Stage Attack!`);
      if (q.state === 'COMPLETED') {
        // La reparación completó la secuencia → el ENGINE resolvió la carta
        // (QTE_COMPLETED + ACTION_RESOLVED + daño). El shadow proyecta.
        commitQte({ ...st, state: 'COMPLETED', idx: q.idx, correct: q.correct, result: 'FULL_SUCCESS' });
        resolveStageResult();
      } else {
        // Continúa en INPUT_WINDOW con el deadline global original.
        commitQte({
          ...st, state: 'INPUT_WINDOW', counterFrames: 0,
          idx: q.idx, correct: q.correct,
        });
      }
    } else {
      // Timing incorrecto (B tarde o tecla equivocada) → el counter conecta.
      // El engine resolverá resolveCounterDamage en counterDeadlineTick
      // (clock) — el shadow refleja el estado y proyecta al expirar.
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
    // M8.C2 — el daño lo RESUELVE el ENGINE (resolveCardAction en el
    // dispatch QTE_INPUT completado · resolvePartialStageDamage en
    // QTE_COUNTER_DEFEND · resolveCounterDamage en el timeout del clock).
    // React SOLO proyecta el HP resultante (nunca vuelve a resolver).
    const rt = rtApi.runtime;
    const ccGained = rt.state.stageQte.correct + rt.state.stageQte.repaired;

    if (complete) {
      // ✅ Secuencia completa: la acción ya se RESOLVIÓ en el dispatch del
      // último QTE_INPUT (ATTACK_HIT + DAMAGE_APPLIED). El shadow ejecuta
      // la cinemática y proyecta el HP del engine.
      const hpBefore = st.cardHpBefore ?? rt.state.enemy.hp;
      const dmg = Math.max(0, hpBefore - rt.state.enemy.hp);
      commitQte({ ...st, state: 'COMPLETED', result: 'FULL_SUCCESS' });
      setPhase('cardSelect'); // desmonta el overlay del QTE
      playCardCinematic(card, 'player', () => {
        setEnemy(prev => ({ ...prev, hp: rt.state.enemy.hp }));
        if (dmg > 0) setEnemyPose('hurt');
        setFlashEnemy(true);
        hitImpact('enemy');
        setDamageNums(prev => [...prev, { value: dmg, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
        addLog(`${player.name} → ${card.name} — ${dmg} ${t('battle.dmg')}`);
        Sfx.hit();
        setTimeout(() => setFlashEnemy(false), gbcMs(9)); // 9 ticks ≈ 151ms (hit flash, HYPOTHESIS)
        if (rt.state.enemy.hp <= 0 && enemy2) {
          const fallen = enemy.name;
          const next = enemy2;
          setEnemy(next);
          setEnemy2(null);
          setEnemyPose('idle');
          addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
          finishPlayerTurnStage(ccGained);
          return;
        }
        if (rt.state.enemy.hp <= 0) {
          enterResults();
          return;
        }
        finishPlayerTurnStage(ccGained);
      });
      return;
    }

    // ❌ Fallo: el rival contraataca (manual GBC — ENTER COMMAND).
    //   SAFE_ABORT  → A a tiempo: conserva CC y el Stage termina. El daño
    //                 parcial (base + resolvedCommandCount) ya lo aplicó el
    //                 ENGINE en QTE_COUNTER_DEFEND (ROM §92/§94).
    //   COUNTER_HIT → no se defendió a tiempo: el counter del RIVAL conecta
    //                 sobre el jugador — resuelto por el ENGINE (clock).
    if (safeAbort) {
      const hpBefore = st.cardHpBefore ?? rt.state.enemy.hp;
      const partialDmg = Math.max(0, hpBefore - rt.state.enemy.hp);
      const resolved = st.correct;
      commitQte({ ...st, state: 'SAFE_ABORT', result: 'SAFE_ABORT' });
      setViewMode('OVERVIEW');
      setTimeout(() => {
        setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, prepFrames: 0, result: null });
        setPhase('cardSelect');
        setEnemy(prev => ({ ...prev, hp: rt.state.enemy.hp }));
        if (partialDmg > 0) {
          setEnemyPose('hurt');
          setFlashEnemy(true);
          hitImpact('enemy');
          setDamageNums(prev => [...prev, { value: partialDmg, type: 'damage', ...dmgPos('enemy'), id: nextUid() }]);
          addLog(`${player.name} se defiende del contraataque — ${partialDmg} dmg parcial (${resolved}/${st.seq.length} comandos) +${ccGained} CC`);
        } else {
          addLog(`${player.name} se defiende del contraataque (sin daño — 0 aciertos) +${ccGained} CC`);
        }
        finishPlayerTurnStage(ccGained);
      }, gbcMs(30)); // ~0.5s: ventana A/B ROM 30t (§7)
      return;
    }
    // COUNTER_HIT: el contraataque del rival conecta sobre el jugador.
    // El engine (clock) ya aplicó resolveCounterDamage en el timeout del
    // COUNTER_WINDOW — el shadow proyecta el daño recibido.
    const pPos = player.battlePos;
    const pVuln = (isBeamVulnerable(pPos) && card.type === 'beam') || (isDamageVulnerable(pPos) && card.type === 'damage');
    const pPosMult = (POSITION_DATA[pPos].depth === 'FRONT' && pVuln) ? 0.8 : 0.5;
    const counterDmg = Math.max(1, Math.floor((enemy.str + enemy.ki) * pPosMult * 0.5));
    commitQte({ ...st, state: 'COUNTER_HIT', result: 'COUNTER_HIT' });
    setViewMode('OVERVIEW');
    setTimeout(() => {
      // Proyección del HP ya mutado por el engine (counter del clock).
      const rt2 = rtApi.runtime;
      const dmg = Math.max(0, st.playerHpBefore ?? 0) - rt2.state.player.hp;
      setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, prepFrames: 0, result: null });
      setPhase('cardSelect');
      setPlayer(prev => ({ ...prev, hp: rt2.state.player.hp }));
      setPlayerPose('hurt');
      setFlashPlayer(true);
      hitImpact('player');
      setDamageNums(prev => [...prev, { value: Math.max(counterDmg, dmg), type: 'damage', ...dmgPos('player'), id: nextUid() }]);
      addLog(`${enemy.name} ${t('battle.counterHit')} — ${Math.max(counterDmg, dmg)} ${t('battle.dmg')} (conservas ${ccGained} CC)`);
      Sfx.hit();
      setTimeout(() => setFlashPlayer(false), gbcMs(9)); // 9 ticks (hit flash, HYPOTHESIS)
      if (rt2.state.player.hp <= 0) {
        enterResults();
        return;
      }
      finishPlayerTurnStage(ccGained);
    }, gbcMs(30)); // ~0.5s: ventana A/B ROM 30t expirada (§7)
  };

  // Variante de finishPlayerTurn para stage attacks (no usar carta de la mano)
  const finishPlayerTurnStage = (ccGained: number) => {
    setSelectedCard(null);
    setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, prepFrames: 0, result: null });
    setViewMode('OVERVIEW');
    setEnemyPose('idle');
    setPlayerPose('idle');
    // M8.C2a — frontera única: el contraataque enemigo espera DEFENSE real.
    settleAttackHand(afterPlayerAction);
  };

  /**
   * PA8 — entrada ÚNICA a RESULTS. El ganador se deriva de battleOutcome
   * (BattleState autoritativo), nunca de flags React ni reglas de
   * presentación. Cleanup visual obligatorio ANTES de mostrar Results:
   * QTE/selected/submenu/viewMode/poses/transients cerrados. La última
   * cinematografía (hurt/knockback/FX) ya terminó en el caller; aquí solo
   * se limpia y se proyecta el terminal.
   */
  const enterResults = () => {
    const outcome = battleOutcome(rtApi.runtime.state);
    if (outcome.status === 'ACTIVE') return; // no terminal → no Results
    setStageQte({ state: 'WAITING', seq: [], idx: 0, correct: 0, covering: false, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, prepFrames: 0, result: null });
    setSelectedCard(null);
    setDefendMenu(null);
    setViewMode('OVERVIEW');
    incomingCard.current = null;
    if (outcome.winner === 'player') {
      setEnemyPose('hurt');
      Sfx.victory();
      addLog(`${enemy.name} ${t('battle.defeated')}`);
    } else {
      setPlayerPose('hurt');
      Sfx.defeat();
      addLog(`${player.name} ${t('battle.defeated')}`);
    }
    setPhase(outcome.winner === 'player' ? 'win' : 'lose');
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
        endTurnRef.current();
      } else {
        const prog = loadProgress();
        const gained = 80 + enemy.level * 20;
        let newExp = prog.exp + gained;
        let newLevel = prog.level;
        while (newExp >= expToNext(newLevel)) { newExp -= expToNext(newLevel); newLevel++; }
        saveProgress({ level: newLevel, exp: newExp });
        plan.ended = true;
        enterResults();
          if (newLevel > prog.level) addLog(`LEVEL UP! ${newLevel} (+HP/STR/KI/SPD)`);
      }
    }
  };
  const endTurnRef = useRef<() => void>(() => {});
  // Referencia de la carta en curso para el coste (el commit no recibe la carta)
  const cardOf = (plan: ActionPlan): CardDef => planCardRef.current;
  const planCardRef = useRef<CardDef>(null as unknown as CardDef);


  // ─── BASIC: acciones gratuitas del GBC (no cuestan CC) ───
  // M8.C2a-L — GUARD NO pertenece al menú BASIC de ataque (contrato:
  // ATTACK = Stage/Gather · DEFENSE = Guard/Move/carta). El guard del
  // jugador solo existe en la fase defend (defendBasic → engineAct GUARD).
  const basicAction = (action: 'gather' | 'stage') => {
    if (action === 'gather') { gatherPower(); return; }
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
      // M8.C2a — frontera única: sin auto-start enemigo tras la carta.
      settleAttackHand(afterPlayerAction);
    };
    playCardCinematic(card, 'player', () => {
      if (!plan.committed) commitActionOutcome(plan);
      if (plan.ended) return;
      setPlayerPose('idle');
      setEnemyPose('idle');
      // M8.C2a — frontera única: el enemigo entra por DEFENSE (input real).
      settleAttackHand(afterPlayerAction);
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
      // M8.C2a — frontera única (el beat de 36t solo da respiro al OVERVIEW).
      discardNextRef.current = () => afterPlayerAction();
      setPhase('discard');
    } else {
      afterPlayerAction();
    }
  };

  // ═══ ENEMY INTENT (M8.C2a): la IA decide SU ataque — SIN presentarlo ═══
  // Carta entrante del enemigo (la consume la fase de defensa al resolver).
  const incomingCard = useRef<CardDef | null>(null);
  // PA11 — memoria privada de la IA (EnemySessionState: fuera del Engine,
  // sin autoridad de combate; el controller es puro y determinista).
  const enemySessionRef = useRef(createEnemySession());

  /** PA11/B1 — prepara el intent ofensivo enemigo, pero NO lo ejecuta.
   *  El controller puede elegir carta con la mano real del enemigo; esa carta
   *  queda en incomingCard y BattleScreen abre PLAYER_DEFENSE_CHOICE. La
   *  cinemática/resolución enemiga solo empieza tras DEFENSE_COMMITTED. */
  const prepareEnemyIncomingAttack = () => {
    setEnemyPose('idle');
    const drawn = drawOne(eDeckRef.current);
    if (drawn.card) {
      eDeckRef.current = drawn.state;
      setEDeckState(drawn.state);
      rtApi.runtime.state = { ...rtApi.runtime.state, eDeck: drawn.state };
    }
    const decision = decideEnemyCommand({ battle: rtApi.runtime.state, session: enemySessionRef.current });
    enemySessionRef.current = decision.nextSession;
    if (decision.diagnostic.intent === 'GATHER') {
      const res = engineAct(decision.command, { side: 'enemy' });
      if (!res.ok) { addLog(`${enemy.name} no puede Gather (${res.reason})`, { gbc: false }); advanceExchange(); return; }
      Sfx.powerUp();
      setEnemyPose('gather_power');
      addLog(`${enemy.name} ${t('battle.gathers')}! (+4 STR/KI — Engine)`, { gbc: false });
      setEnemyPose('idle'); advanceExchange();
      return;
    }
    if (decision.diagnostic.intent === 'HEAL') {
      // El Engine no permite support heal ofensiva (heal = defensiva) → el
      // controller no la elige; defensa ante el estado: avance directo.
      addLog(`${enemy.name} se reagrupa…`, { gbc: false });
      advanceExchange();
      return;
    }
    // ATTACK_CARD / BASIC / PASS → intent de ataque con la carta decidida (o
    // stage básico universal). El defensor elige SU defensa ANTES de la
    // cinemática (orden GBC).
    const card = decision.card ?? (getCard(1) as CardDef);
    incomingCard.current = card;
    addLog(`${enemy.name} ${t('battle.uses')} ${card.name}`, { gbc: false });
    enterDefensePhase(card.name);
  };

  /** M8.C2a — FRONTERA DEFENSIVA tras la acción del JUGADOR: el juego
   *  regresa a OVERVIEW y entra en DEFENSE esperando input REAL. El enemigo
   *  decide su intent (legal — la IA elige antes) pero su CINEMÁTICA espera
   *  a DEFENSE_COMMITTED. Contrato: terminar tu ataque NO inicia al enemigo. */
  const beginDefenseAfterPlayer = () => {
    // Exchange 1: el enemigo contraataca — +3 CC (spec) y decisión de intent.
    // M8.C2a-L FIX: el ENGINE también avanza a exchange 1 (END_EXCHANGE).
    // Sin esto, el Engine seguía en exchange 0 con iniciativa player → el
    // GUARD/MOVE/carta defensiva del jugador era REJECTED (NOT_DEFENDER) y
    // el flujo legacy continuaba resolviendo el ataque enemigo SOLO — "el
    // juego se pone a hacer cosas sin mi turno".
    engineAct({ type: 'END_EXCHANGE' }, { side: 'player' });
    setExchangeIndex(1);
    setTurnOwner(rtApi.runtime.state.activeSide); // ENGINE-SNAPSHOT (initiativa intacta)
    const actor = getForm(enemyFormId)!.character.toUpperCase();
    setEnemy(prev => ({ ...prev, cc: Math.min(prev.maxCc, prev.cc + 3) }));
    addLog(`${actor} ${t('battle.strikesFirst')} (+3 CC)`, { gbc: false });
    // DEFENSE real: espera input indefinidamente (sin timers que auto-lancen
    // la cinemática enemiga). El gate de presentación abre cuando el jugador
    // compromete Guard/Move/Support.
    prepareEnemyIncomingAttack();
  };

  /** M8.C2a — continuación tras la acción del JUGADOR (fin de su ataque/
   *  gather/chara): SIN auto-start enemigo. Si el enemigo contraataca
   *  (exchange 0 → 1), entra en DEFENSE esperando input real; si el turno
   *  termina (exchange 1), avanza al siguiente turno. NUNCA setTimeout que
   *  encadene la presentación enemiga tras la animación del jugador. */
  const afterPlayerAction = () => {
    if (exchangeIndex === 0) {
      beginDefenseAfterPlayer();
    } else {
      advanceExchange(); // exchange 1 → turn end → beginTurn
    }
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
      // M8.C1 — MOVE a través del Engine: el destino (y el empuje GBC §9)
      // los calcula movementReducer (applyMoveAxis). React NO computa
      // posiciones: proyecta la snapshot autoritativa runtime.state.
      const axis = posOrAxis as MoveAxis;
      const axisLabel = axis === 'HORIZONTAL' ? '↔' : '↕';
      const res = engineAct({ type: 'MOVE', axis }, { side: 'player' });
      if (!res.ok) { addLog(`${player.name} no puede moverse (${res.reason})`); setPhase('defend'); return; }
      // ── Proyección de la snapshot (posición final = autoridad Engine) ──
      const target = rtApi.runtime.state.player.battlePos;
      const pushed = rtApi.runtime.state.enemy.battlePos;
      const moved = target !== player.battlePos;
      const pushHappened = pushed !== enemy.battlePos;
      Sfx.move();
      if (moved) {
        // Pose de dash según la profundidad resultante (semántica del cue
        // POSITION_CHANGED → move_front/move_back — el Presenter ya la
        // aplicó vía timeline; aquí solo se refleja la snapshot).
        setPlayer(prev => ({ ...prev, battlePos: target })); // ENGINE-SNAPSHOT (M8.C1)
        const pd = POSITION_DATA[target];
        addLog(`${player.name} MOVE ${axisLabel} → ${pd.altitude}/${pd.depth} (${positionLabel(target)})`);
      }
      if (pushHappened) {
        // Empuje GBC §9 (el Engine lo emitió como POSITION_CHANGED enemigo)
        setEnemy(prev => ({ ...prev, battlePos: pushed })); // ENGINE-SNAPSHOT (M8.C1)
        addLog(`${enemy.name} retrocede a FRONT (empuje)`);
      }
      runEnemyCinematic(() => resolveEnemyAttackViaEngine());
    } else {
      // M8.C1 — GUARD a través del Engine: guardia = snapshot del runtime.
      // M8.C2a-L — si el Engine RECHAZA (p.ej. NOT_DEFENDER por desfase de
      // exchange), NO continuar con la cinemática enemiga: volver al menú
      // de defensa (el juego jamás "sigue solo" tras un rechazo).
      const res = engineAct({ type: 'GUARD' }, { side: 'player' });
      if (!res.ok) { addLog(`${player.name} no puede defender (${res.reason})`); setPhase('defend'); return; }
      const g = rtApi.runtime.state.playerGuard;
      if (g) setPlayerGuard({ type: g }); // ENGINE-SNAPSHOT (M8.C1)
      setPlayerPose('guard');
      addLog(`${player.name} ${t('battle.defends')} (−50% ${t('battle.dmg')})`);
      runEnemyCinematic(() => resolveEnemyAttackViaEngine());
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
    setDefendMenu(null);
    // PA11 — el commit de la carta defensiva pasa por el Engine (autoridad:
    // canPlayDefenseCard + CA83/slot8). React solo proyecta la snapshot.
    const res = engineAct({ type: 'PLAY_DEFENSE_CARD', handIndex: handIdx }, { side: 'player', characterId: getForm(playerFormId)!.character });
    if (!res.ok) {
      addLog(`${card.name}: no puede defenderse (${res.reason})`);
      setPhase('defend');
      return;
    }
    setPlayer(prev => ({ ...prev, cc: rtApi.runtime.state.player.cc })); // ENGINE-SNAPSHOT
    setDeckState(rtApi.runtime.state.deck);
    // Cinemática del ataque enemigo tras elegir la carta defensiva (orden GBC)
    const cardIncoming = incomingCard.current || CARDS[25];
    playCardCinematic(cardIncoming, 'enemy', () => resolveEnemyAttackViaEngine());
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
      enterResults();
      return;
    }
    setTimeout(() => {
      setPlayerPose('idle'); setEnemyPose('idle');
      setSelectedCard(null);
      advanceExchange();
    }, 400);
  };

  /** PA11 — la RESOLUCIÓN del ataque enemigo la hace el ENGINE
   *  (resolveCard → M5: precisión/evasión/defensa/daño/CC/KO). React solo
   *  proyecta los eventos (poses, números, flash, logs). La mutación legacy
   *  con Math.random queda ELIMINADA: el Engine es la única autoridad. */
  const projectEnemyResolution = (res: ReturnType<BattleRuntime['resolveCard']>) => {
    const cardIn = incomingCard.current ?? (getCard(1) as CardDef);
    for (const e of res.events) {
      if (e.type === 'ATTACK_MISSED' && e.target === 'player') {
        addLog(`${enemy.name} → ${cardIn.name} — ${t('battle.miss')}!`);
        Sfx.dodge();
        setDamageNums(prev => [...prev, { value: 0, type: 'miss', ...dmgPos('player'), id: nextUid() }]);
      } else if (e.type === 'ATTACK_HIT' && e.target === 'player' && (e as { outcome?: string }).outcome === 'block') {
        addLog(`${player.name} BLOCK — daño reducido (Engine)`);
      } else if (e.type === 'DAMAGE_APPLIED' && e.target === 'player') {
        const dmg = e.amount;
        if (dmg > 0) {
          Sfx.punch();
          setPlayerPose('hurt');
          setFlashPlayer(true);
          hitImpact('player');
          setDamageNums(prev => [...prev, { value: dmg, type: 'damage', ...dmgPos('player'), id: nextUid() }]);
        } else {
          setDamageNums(prev => [...prev, { value: 0, type: 'guard', ...dmgPos('player'), id: nextUid() }]);
        }
      } else if (e.type === 'CC_GAINED' && e.side === 'player') {
        addLog(`${player.name} +${e.amount} CC (${t('battle.hp')} bajo — Engine)`);
      } else if (e.type === 'FIGHTER_DEFEATED' && e.side === 'player') {
        addLog(`${player.name} K.O.!`);
      }
    }
    // ── proyección de snapshots autoritativas del Engine ──
    setPlayer(prev => ({ ...prev, hp: rtApi.runtime.state.player.hp, cc: rtApi.runtime.state.player.cc, battlePos: rtApi.runtime.state.player.battlePos }));
    setEnemy(prev => ({ ...prev, cc: rtApi.runtime.state.enemy.cc }));
    setDeckState(rtApi.runtime.state.deck);
    eDeckRef.current = rtApi.runtime.state.eDeck;
    setEDeckState(rtApi.runtime.state.eDeck);
    setFlashPlayer(true);
    setTimeout(() => setFlashPlayer(false), gbcMs(9)); // hit flash (presentación)
    if (cardIn.type === 'beam') Sfx.beam();
  };

  /** Resuelve el ataque enemigo pendiente (incomingCard) en el Engine. */
  const resolveEnemyAttackViaEngine = () => {
    const card = incomingCard.current ?? (getCard(1) as CardDef);
    const res = rtApi.runtime.resolveCard('enemy', card);
    projectEnemyResolution(res);
    // ── estado terminal / continuación (autoridad: state del Engine) ──
    if (rtApi.runtime.state.player.hp <= 0) {
      if (player2) {
        // 2v2: cae el jugador activo, entra el compañero con HP completo
        const fallen = player.name;
        const next = player2;
        setPlayer2(null);
        setPlayer(next);
        setPlayerPose('idle');
        setFlashPlayer(false);
        addLog(`${fallen} K.O.! ${next.name} entra al combate!`);
        setEnemyPose('idle');
        setSelectedCard(null);
        advanceExchange();
        return;
      }
      enterResults();
      return;
    }
    setEnemyPose('idle');
    setSelectedCard(null);
    advanceExchange();
  };

  useEffect(() => {
    if (damageNums.length > 0) {
      const timer = setTimeout(() => setDamageNums(prev => prev.slice(1)), 1200);
      return () => clearTimeout(timer);
    }
  }, [damageNums]);

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
  const observedRuntimeState = { ...rtApi.runtime.state, phase: (phase === 'enemyTurn' ? 'defend' : phase) as BattleState['phase'] };
  const runtimeControlBoundary = getControlBoundary(observedRuntimeState);
  const activeAttackerSide: 'player' | 'enemy' = exchangeIndex === 0
    ? turnOwner
    : turnOwner === 'player' ? 'enemy' : 'player';
  // Estado del QTE para el luchador del CAMPO (el panel inferior solo lleva
  // la secuencia; el luchador ejecuta en el campo como en el GBC).
  const qteCurKey = phase === 'stageInput' && stageQte ? stageQte.seq[stageQte.idx] : null;
  const qteIsDir = qteCurKey === 'UP' || qteCurKey === 'DOWN' || qteCurKey === 'RIGHT';
  const qteFrozen = phase === 'stageInput' && stageQte
    ? (stageQte.state === 'COUNTER_HIT' || stageQte.state === 'COUNTER_WINDOW')
    : false;
  const qteResolving = phase === 'stageInput'
    && stageQte.state !== 'INPUT_WINDOW' && stageQte.state !== 'PREPARING';
  const presentationInputLocked = intro || phaseCue !== null;
  const controlProjection: BattleControlProjection = intro ? 'INTRO'
    : phaseCue ? 'PHASE_CUE'
    : phase === 'win' || phase === 'lose' ? 'RESULTS'
    : runtimeControlBoundary === 'PLAYER_ATTACK_CHOICE' ? 'PLAYER_ATTACK_CHOICE'
    : runtimeControlBoundary === 'PLAYER_DEFENSE_CHOICE' ? 'PLAYER_DEFENSE_CHOICE'
    : phase === 'enemyTurn' ? 'ENEMY_ACTION_RESOLVING'
    : phase === 'stageInput' ? 'PLAYER_ACTION_RESOLVING'
    : phase === 'discard' ? 'ROUND_TRANSITION'
    : battleOutcome(rtApi.runtime.state).status !== 'ACTIVE' ? 'TERMINAL'
    : 'ROUND_TRANSITION';
  const displayedPlayerHp = intro ? Math.round(player.hp * battleIntroPresentation.lifeFillProgress) : player.hp;
  const displayedEnemyHp = intro ? Math.round(enemy.hp * battleIntroPresentation.lifeFillProgress) : enemy.hp;
  // Cada tecla del Stage Attack tiene SU pose (docs/FRAMES_ACTIONS_SPEC):
  // A=puño der, B=puño izq, UP=ascendente, DOWN=descendente, LEFT=avance, RIGHT=guardia.
  const qtePose: BattleSpritePose = phase === 'stageInput'
    ? (stageQte?.covering ? 'guard'
      : qteFrozen ? 'attack_fwd'
      : stageQte?.state === 'PREPARING' ? stagePrepPose(stageQte.prepFrames)
      : (stageInputPose(qteCurKey) as BattleSpritePose))
    : (playerPose as BattleSpritePose);
  const qteEnemyPose: BattleSpritePose = qteResolving ? 'attack_fwd' : 'idle';

  // ─── Inspector de estado (?debugState=1): snapshot para el overlay ───
  const fmtStage = (v: number) => (v > 0 ? `+${v}` : `${v}`);
  const stateDebugSnapshot: StateDebugSnapshot | null = isDebugState() ? (() => {
    // M8.C2a-L — el inspector muestra el LIFECYCLE real del Engine
    // (initiative/exchange/attacker/defender) + fase + defensa + reloj.
    // NUNCA 'enemyTurn': la fase es gameplay del jugador, el lado atacante
    // se deriva de (activeSide, exchange).
    const rt = rtApi.runtime.state;
    const attacker = rt.exchange === 0 ? rt.activeSide : (rt.activeSide === 'player' ? 'enemy' : 'player');
    // M8.C2a-L — el boundary se computa con la fase OBSERVADA (la misma que
    // engineAct sincroniza en el puente): el Engine solo la actualiza en
    // dispatch y el inspector debe reflejar el estado real del juego.
    return {
      phase: phase.toUpperCase(),
      round: turn,
      exchange: `${exchangeIndex + 1}/2`,
      owner: turnOwner,
      initiative: rt.activeSide.toUpperCase(),
      attacker: attacker.toUpperCase(),
      defender: (attacker === 'player' ? 'enemy' : 'player').toUpperCase(),
      defenseState: rt.defenseState,
      tick: rt.tick,
      rng: rt.rngState,
      control: runtimeControlBoundary,
      presentation: presentationInputLocked ? `LOCKED ${presentationCueLog.slice(-4).join(' > ')}` : controlProjection,
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
    };
  })() : null;

  return (
    <div className={`battle-screen view-${viewMode.toLowerCase()} ${presentationInputLocked ? 'presentation-locked' : ''} ${intro ? 'intro-active' : ''} ${cardFx ? 'is-cinematic' : ''} ${gbcMsg ? 'gbc-msg' : ''} ${pixiPresentationActive ? 'pixi-presentation-active' : ''} ${phase === 'stageInput' ? 'qte-active' : ''} ${qteResolving ? 'qte-resolving' : ''}`}>
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
          <div className="phase-cue-title">
            <span>{phaseCue.phase}</span>
            <span>PHASE</span>
          </div>
        </div>
      )}

      {/* ═══ INTRO FULL-SCREEN: VS de presentación — los 2 sprites entran
          desde FUERA hacia su posición (cinemática), VS en el centro, flash.
          SIN texto (nada de READY/FIGHT ni nombres). Cubre TODA la ventana.
          La desmonta BattleIntroPresentation por ticks. ═══ */}
      {battleIntroPresentation.introOverlayVisible && (
        <div className="battle-intro">
          <div className="intro-fighter intro-left">
            <div className="intro-portrait">
              <img src={battlePortraitFor(activePlayerFormId) || ''} alt={player.name}
                onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          </div>
          <div className="intro-vs">{t('battle.vs')}</div>
          <div className="intro-fighter intro-right">
            <div className="intro-portrait">
              <img src={battlePortraitFor(enemyFormId) || ''} alt={enemy.name}
                onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          </div>
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
              <img src={battlePortraitFor(activePlayerFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!battlePortraitFor(activePlayerFormId) && <Sword size={14} />}
            </span>
            <strong>{player.name}</strong>
            <span className="hud-form">{player.form}</span>
            <span className="hud-level">LV{player.level}</span>
            {player2 && (
              <span className="team-reserve left in-name" data-tip={tipBlock(`${player2.name}`, [['stats', `HP ${player2.hp}/${player2.maxHp}`]])}>
                <span className="team-reserve-portrait">
                  <img src={battlePortraitFor(player2.formId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                </span>
                <span className="team-reserve-name">{player2.name}</span>
                <span className="team-reserve-hp">{player2.hp}/{player2.maxHp}</span>
              </span>
            )}
          </div>
          <HPBar current={player.hp} max={player.maxHp} side="left" introFill={intro} displayCurrent={displayedPlayerHp} />
          <div className="hud-info-row">
            {/* Fase GBC: badges de estado HACIA AFUERA (borde), fase
                ATTACK/DEFEND HACIA DENTRO (junto al VS) — lado opuesto al
                anterior; la reserva del 2º miembro vive en la fila superior */}
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
            <span className={`hud-phase ${activeAttackerSide === 'player' ? 'phase-atk' : 'phase-def'}`}>
              {activeAttackerSide === 'player' ? 'ATTACK' : 'DEFEND'}
            </span>
          </div>
        </div>
        <div className="fighter-hud right">
          <div className="hud-name" data-tip={tipBlock(`${enemy.name} — ${enemy.form} LV${enemy.level}`, [
            ['stats', `HP ${enemy.hp}/${enemy.maxHp}`],
            ['stats', `STR ${enemy.str} · KI ${enemy.ki} · SPD ${enemy.spd}`],
            ['desc', `POS: ${enemy.battlePos.replace('_', ' ')}`],
          ])}>
            <span className="hud-portrait">
              <img src={battlePortraitFor(enemyFormId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
              {!battlePortraitFor(enemyFormId) && <Shield size={14} />}
            </span>
            <strong>{enemy.name}</strong>
            <span className="hud-form">{enemy.form}</span>
            <span className="hud-level">LV{enemy.level}</span>
            {enemy2 && (
              <span className="team-reserve right in-name" data-tip={tipBlock(`${enemy2.name}`, [['stats', `HP ${enemy2.hp}/${enemy2.maxHp}`]])}>
                <span className="team-reserve-portrait">
                  <img src={battlePortraitFor(enemy2.formId) || ''} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                </span>
                <span className="team-reserve-name">{enemy2.name}</span>
                <span className="team-reserve-hp">{enemy2.hp}/{enemy2.maxHp}</span>
              </span>
            )}
          </div>
          <HPBar current={enemy.hp} max={enemy.maxHp} side="right" introFill={intro} displayCurrent={displayedEnemyHp} />
          <div className="hud-info-row">
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
            <span className={`hud-phase ${activeAttackerSide === 'enemy' ? 'phase-atk' : 'phase-def'}`}>
              {activeAttackerSide === 'enemy' ? 'ATTACK' : 'DEFEND'}
            </span>
          </div>
        </div>
        {/* Insignia central: ATK (quién ataca) · VS · ROUND (debajo) */}
        <div className="hud-center-badge">
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
        <div className={`battle-bg authentic ${viewMode === 'SPECIAL_ACTION' ? 'special' : ''}`} style={{ backgroundImage: `url(${battleBgUrl})` }} />
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

      {/* Controles */}
      <div className="battle-controls">
        {presentationInputLocked && !cardFx && !gbcMsg ? null : (
          <>
        {/* Chips de fase estilo CC GBC: ESQUINA INFERIOR IZQUIERDA —
            fase/exchange (ATTACK 1/2), mismo lenguaje que el 06 de CC.
            Ocultos con diálogo activo (el cuadro GBC los reemplaza) */}
        {(phase === 'command' || phase === 'basic' || phase === 'limitSelect' || phase === 'cardSelect' || phase === 'defend') && !gbcMsg && (
          <div className="phase-chip-row">
            <span className="phase-chip" data-tip={tipBlock('FASE', [['desc', 'Exchange del turno (atacante/defensor)']])}>
              {phaseShortLabel} {exchangeIndex + 1}/2
            </span>
          </div>
        )}
        {/* CC estilo GBC: esquina inferior derecha del panel con cartas —
            fondo negro + número blanco pixel (VT323). Oculto con diálogo */}
        {(phase === 'command' || phase === 'basic' || phase === 'limitSelect' || phase === 'cardSelect' || phase === 'defend') && !gbcMsg && (
          <div className="cc-panel" data-tip={tipBlock('CC', [['stats', `${player.cc} / ${player.maxCc}`]])}>{player.cc}</div>
        )}
        {/* Cuadro de diálogo GBC: DENTRO de la caja, con la MISMA altura que
            los botones (80px) — el fondo se visualiza igual en todo momento */}
        {gbcMsg && (() => {
          // Lado del hablante: si el actor del mensaje es el ENEMIGO, el
          // sprite se coloca a la derecha; si es el JUGADOR, a la izquierda.
          // M8.C2a: el actor es SIEMPRE el PREFIJO del mensaje (formato
          // "ACTOR acción…" — usa / — / ataca primero / strikes first…).
          // Normaliza guiones bajos (GOHAN_KID ≡ Gohan Kid) y compara por
          // inclusión con el nombre real de cada luchador.
          const pName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const eName = enemy.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const lower = gbcMsg.toLowerCase();
          // 1) Actor explícito por prefijo conocido
          const actorRaw = gbcMsg.match(/^(.+?)\s+uses\s/i)?.[1]
            ?? gbcMsg.match(/^(.+?)\s+—\s/)?.[1]
            ?? null;
          // 2) Fallback robusto: normalizado — ¿el mensaje menciona al
          //    enemigo y NO al jugador? (strikes first / ataca primero /
          //    contraataca…). El retrato del ENEMIGO va a la DERECHA.
          const lowerNorm = norm(lower);
          const mentionsEnemy = lowerNorm.includes(eName);
          const mentionsPlayer = lowerNorm.includes(pName);
          const isEnemy = actorRaw !== null
            ? (norm(actorRaw) === eName
              || (norm(actorRaw) !== pName && mentionsEnemy && !mentionsPlayer))
            : (mentionsEnemy && !mentionsPlayer);
          // 3) Mensaje sin actor (genérico): retrato a la izquierda del jugador.
          const side: 'left' | 'right' | null = actorRaw === null
            ? (mentionsPlayer || mentionsEnemy ? (isEnemy ? 'right' : 'left') : null)
            : (isEnemy ? 'right' : 'left');
          // Sprite de STORY del personaje que habla (retrato de las viñetas GBC)
          const speakerChar = isEnemy
            ? getForm(enemyFormId)?.character ?? 'goku'
            : getForm(activePlayerFormId)?.character ?? 'goku';
          const speakerForm = isEnemy ? enemyFormId : activePlayerFormId;
          const spriteUrl = resolveStoryPortraitStrict(speakerChar, speakerForm).url;
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
          if (q.state !== 'INPUT_WINDOW' && q.state !== 'PREPARING') return null;
          const preparing = q.state === 'PREPARING';
          // Tiempo GLOBAL de la secuencia en SEGUNDOS GBC (ventana total del manual).
          const elapsedSec = q.elapsedFrames / GBC_NATIVE_FPS;
          const limitSec = q.limitFrames / GBC_NATIVE_FPS;
          return (
          /* M8.C2a — StageHudPanel CANÓNICO compartido con #dev/hud: mismo
             componente, misma geometría (portrait fijo · track centrado ·
             timer fijo). NUNCA volver a componer el QTE a mano en main.tsx. */
          <StageHudPanel
            portraitUrl={resolveBattlePortraitStrict(activePlayerFormId).url ?? ''}
            seq={q.seq}
            idx={q.idx}
            state={q.state}
            feedback={stageFeedback}
            elapsedSec={elapsedSec}
            limitSec={limitSec}
            side="left"
          />
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
            <div className="result-actions">
              {!storyChapter && <button className="btn-primary" onClick={onRematch}>{t('common.rematch')}</button>}
              <button className="btn-primary" onClick={() => onExit(true)}>{t('common.newBattle')}</button>
              <button className="btn-primary" onClick={onMainMenu}>{t('common.mainMenu')}</button>
            </div>
          </div>
        )}
        {phase === 'lose' && (
          <div className="result-screen">
            <div className="result-title defeat">{t('battle.defeat')}</div>
            <div className="result-info">
              <div>{t('battle.turn')} {turn}</div>
              <div>{t('battle.hp')} 0/{player.maxHp}</div>
            </div>
            <div className="result-actions">
              {!storyChapter && <button className="btn-primary" onClick={onRematch}>{t('common.rematch')}</button>}
              <button className="btn-primary" onClick={() => onExit(false)}>{t('common.retry')}</button>
              <button className="btn-primary" onClick={onMainMenu}>{t('common.mainMenu')}</button>
            </div>
          </div>
        )}
          </>
        )}
          </>
        )}
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
  const navRef = useRef<HTMLElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
  const progress = loadStoryProgress();
  const chapter = CHAPTERS.find(c => c.id === Math.min(progress, CHAPTERS.length)) ?? CHAPTERS[0];
  const prog = loadProgress();
  const es = lang === 'es';
  const items: Array<{ screen: Screen; label: string; desc: string; Icon: LucideIcon }> = [
    { screen: 'story', label: t('menu.story'), desc: es ? 'Tu próxima batalla empieza aquí' : 'Your next battle starts here', Icon: BookOpen },
    { screen: 'versus', label: t('menu.battle'), desc: es ? 'Prepara tu equipo y lucha' : 'Build your team. Take the fight.', Icon: Swords },
    { screen: 'deck', label: t('menu.deck'), desc: es ? '20 cartas. Tu estrategia.' : '20 cards. Your strategy.', Icon: Library },
    { screen: 'characters', label: t('menu.characters'), desc: es ? 'Guerreros, formas y poder' : 'Warriors, forms and power', Icon: Users },
    { screen: 'cards', label: t('menu.cards'), desc: es ? 'Explora tu colección' : 'Explore your collection', Icon: Sparkles },
    { screen: 'settings', label: t('menu.settings'), desc: es ? 'Audio · Idioma · Pantalla' : 'Audio · Language · Display', Icon: Settings },
  ];
  useEffect(() => {
    (reward ? rewardRef.current : navRef.current)?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [reward]);
  const navigate = (screen: Screen) => { Sfx.confirm(); onNavigate(screen); };
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(navRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const active = buttons.indexOf(document.activeElement as HTMLButtonElement);
    // The focus graph follows the drawn panels: hero | battle / characters | deck / cards | settings.
    const neighbors: Record<string, number[]> = {
      ArrowRight: [1, 3, 4, 0, 0, 0], ArrowLeft: [3, 0, 0, 1, 2, 0],
      ArrowDown: [5, 2, 5, 4, 5, 0], ArrowUp: [5, 5, 1, 5, 3, 2],
    };
    buttons[neighbors[event.key][Math.max(0, active)]]?.focus({ preventScroll: true });
    Sfx.select();
  };
  const claimReward = (cardId: number) => {
    const unlocks = loadUnlocks();
    unlocks.cards = [...new Set([...unlocks.cards, cardId])];
    unlocks.pendingReward = null;
    saveUnlocks(unlocks);
    setReward(null);
    Sfx.confirm();
  };
  return <main className="shell-menu">
    <header className="shell-masthead">
      <img src="/logo-dbz-title.png" className="shell-brand" alt="Dragon Ball Z" />
      <div className="shell-edition"><span>LEGENDARY SUPER WARRIORS</span><strong>{es ? 'ELIGE TU HISTORIA' : 'CHOOSE YOUR STORY'}</strong></div>
      <div className="shell-player"><span>{es ? 'GUERRERO' : 'WARRIOR'}</span><strong>LV. {prog.level.toString().padStart(2, '0')}</strong></div>
    </header>
    <nav className="shell-panels" ref={navRef} aria-label={es ? 'Menú principal' : 'Main menu'} onKeyDown={onMenuKeyDown}>
      {items.map(({ screen, label, desc, Icon }, index) => <button key={screen} type="button"
        className={`shell-panel shell-panel-${screen}`} data-screen={screen} onClick={() => navigate(screen)}>
        <span className="shell-panel-index">0{index + 1}</span>
        <Icon className="shell-panel-icon" aria-hidden="true" />
        <span className="shell-panel-copy"><strong>{label}</strong><span>{desc}</span></span>
        {screen === 'story' && <span className="shell-story-progress">
          <span>{es ? 'CAPÍTULO' : 'CHAPTER'} {String(chapter.id).padStart(2, '0')} / {CHAPTERS.length}</span>
          <strong>{t(chapter.nameKey)}</strong>
          <span className="shell-story-cta">{t('menu.continue')} <ChevronRight size={22} aria-hidden="true" /></span>
        </span>}
        {screen !== 'story' && <ChevronRight className="shell-panel-arrow" aria-hidden="true" />}
      </button>)}
    </nav>
    <footer className="shell-footer"><span>DBZ LSW Fangame · FAN GAME</span><span>↑ ↓ ← → {es ? 'NAVEGAR' : 'NAVIGATE'} <b>ENTER</b> {es ? 'ELEGIR' : 'SELECT'}</span></footer>
    {reward && reward.length > 0 && <div className="reward-overlay"><div className="reward-panel" ref={rewardRef} role="dialog" aria-modal="true" aria-labelledby="reward-title"
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(rewardRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const next = (buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault(); buttons[next]?.focus();
      }}>
      <h2 className="reward-title" id="reward-title">{es ? 'ELIGE TU RECOMPENSA' : 'CHOOSE YOUR REWARD'}</h2>
      <div className="reward-cards">{reward.map(id => { const card = getCard(id)!; return <button key={id} className="reward-card" onClick={() => claimReward(id)}>
        <img className="reward-card-img" src={cardIconUrl(id)} alt="" /><strong className="reward-card-name">{card.name}</strong><span className="reward-card-type">{CARD_TYPE_NAMES[card.type]}</span>
      </button>; })}</div>
    </div></div>}
  </main>;
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
  // La elección inicial crea la primera entrada de la biblioteca. El bridge
  // mantiene también la key legacy para las herramientas que aún la consumen.
  saveDeckLibrary(starterDeckLibrary(kind, deck));
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
      <GamePageHeader title={t('story.title')} onBack={() => onNavigate('main')}>
        <div className="story-progress">
          <span className="story-progress-num">{progress}/{total}</span>
          <span className="story-progress-bar"><span style={{ width: `${pct}%` }} /></span>
        </div>
      </GamePageHeader>

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
              <button type="button" key={ch.id} disabled={!unlocked} aria-pressed={isSel}
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
              </button>
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
    let fast = false;
    try { fast = localStorage.getItem('dbzlsw.textSpeed') === 'fast'; } catch { /* unavailable storage */ }
    const spd = Math.max(14, GAMEPLAY_CONFIG.storyTextSpeedMs / (fast ? 2 : 1));
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
              // — la emoción del DIÁLOGO (guion V2) manda sobre la del personaje
              const isSpeaker = hasDialogue && speakingIdx === i;
              const emo = isSpeaker && panel.dialogue?.emotion ? panel.dialogue.emotion : c.emotion;
              const url = resolveStoryPortraitStrict(c.character, c.form, emo).url;
              const nChars = panel.characters?.length ?? 0;
              const side = c.side ?? (nChars === 1 ? 'center' : i === 0 ? 'left' : 'right');
              return (
                <div key={i} className={`story-character ${side}${isSpeaker ? ' speaking' : hasDialogue ? ' muted' : ''}`}>
                  {url
                    ? <img src={url} alt={characterName(c.character)} className="story-portrait" />
                    : <div className="story-portrait story-portrait-none">{characterName(c.character).slice(0, 1)}</div>}
                  {/* SIN badge de nombre bajo el sprite: el nombre ya vive en
                      el cuadro de diálogo (story-speaker) — canon GBC */}
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

const CHARACTER_STAT_MAX = {
  hp: Math.max(...Object.values(FORMS).map(form => form.hp)),
  str: Math.max(...Object.values(FORMS).map(form => form.str)),
  ki: Math.max(...Object.values(FORMS).map(form => form.ki)),
  spd: Math.max(...Object.values(FORMS).map(form => form.spd)),
};

function statWidth(value: number, max: number): string {
  return `${Math.max(5, Math.min(100, Math.round((value / max) * 100)))}%`;
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
  const identityPortrait = resolveBattlePortraitStrict(selected);
  const owPortrait = overworldUrl(selected);

  return (
    <div className="page-screen characters-screen">
      <GamePageHeader title={t('characters.title')} onBack={() => onNavigate('main')} />
      <div className="characters-layout">
        {/* Grid de personajes: solo desbloqueados; bloqueados con candado */}
        <div className="char-grid">
          {ROM_ORDERED_CHARACTERS.map(c => {
            const baseForm = getForm(baseFormIdOf(c.id))!;
            const portrait = resolveBattlePortraitStrict(baseForm.id);
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
                <span className="char-thumb-frame">
                  {portrait.url ? <img className="char-thumb-story battle" src={portrait.url} alt="" draggable={false} /> : null}
                </span>
                <div className="char-name">{c.name}</div>
                <div className="char-forms">{c.forms.length} {t('characters.forms')}</div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="char-detail ui-sidebar">
          <div className="char-detail-scroll">
          <div className="char-detail-header">
            <div className={`char-detail-sprite-wrap ${transformFx ? 'transforming' : ''}`} key={transformFx}>
              {transformFx > 0 && <div className="transform-flash" />}
              <div className="char-identity-story">
                {identityPortrait.url ? <img className="battle" src={identityPortrait.url} alt={`${selChar.name} ${sel.form}`} draggable={false} /> : null}
                <span>BATTLE PORTRAIT</span>
              </div>
              <div className="char-identity-combat">
                <div className="transform-aura" />
                <CharacterSprite formId={selected} height={116} className="char-detail-sprite" />
                <span>COMBAT IDLE</span>
              </div>
            </div>
            <div className="char-detail-info">
              <div className="char-detail-name">{selChar.name}</div>
              <div className="char-detail-form">{t('characters.form')}: {sel.form}</div>
              <div className="char-detail-saga">{selChar.saga} {t('characters.saga')}</div>
              <div className="char-tier">{t('characters.tier')} {'★'.repeat(selChar.tier)}{'☆'.repeat(5 - selChar.tier)}</div>
            </div>
          </div>

          <div className="char-asset-rail" aria-label="Character sprite sources">
            {owPortrait ? (
              <div className="char-asset-chip ow">
                <img src={owPortrait} alt="" draggable={false} />
                <span><b>OW</b> FIELD SPRITE</span>
              </div>
            ) : null}
          </div>

          {/* Stats */}
          <div className="stat-block">
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.hp')}</span><div className="ui-stat-track"><div className="ui-stat-fill hp" style={{ width: statWidth(sel.hp, CHARACTER_STAT_MAX.hp) }} /></div><span className="ui-stat-val">{sel.hp}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.str')}</span><div className="ui-stat-track"><div className="ui-stat-fill str" style={{ width: statWidth(sel.str, CHARACTER_STAT_MAX.str) }} /></div><span className="ui-stat-val">{sel.str}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.ki')}</span><div className="ui-stat-track"><div className="ui-stat-fill ki" style={{ width: statWidth(sel.ki, CHARACTER_STAT_MAX.ki) }} /></div><span className="ui-stat-val">{sel.ki}</span></div>
            <div className="ui-statbar"><span className="ui-stat-label">{t('attr.spd')}</span><div className="ui-stat-track"><div className="ui-stat-fill spd" style={{ width: statWidth(sel.spd, CHARACTER_STAT_MAX.spd) }} /></div><span className="ui-stat-val">{sel.spd}</span></div>
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

// ⚠️ SOLO cartas genéricas (Users=48): el mazo por defecto debe ser usable
// por cualquier luchador (Gohan/Piccolo de salida). Las cartas de personaje
// se desbloquean y añaden desde el constructor de mazos.
const DEFAULT_DECK = [1, 1, 2, 2, 4, 5, 5, 6, 11, 29, 7, 8, 20, 43, 124, 124, 88, 117, 125, 121];

function loadDeck(): number[] {
  return activeSavedDeck(loadDeckLibrary(DEFAULT_DECK)).cards;
}

function DeckScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [library, setLibrary] = useState<DeckLibraryState>(() => loadDeckLibrary(DEFAULT_DECK));
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const [search, setSearch] = useState('');
  const owned = ownedCards(loadUnlocks(), loadProgress().level);
  const activeDeck = activeSavedDeck(library);
  const deck = activeDeck.cards;

  const commitLibrary = (update: (current: DeckLibraryState) => DeckLibraryState) => {
    setLibrary(current => saveDeckLibrary(update(current)));
  };
  const setDeck = (cards: number[]) => commitLibrary(current => updateActiveDeckCards(current, cards));

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
      <GamePageHeader title={t('deck.title')} onBack={() => onNavigate('main')}>
        <div className="deck-count">{library.decks.length} DECKS · {deck.length}/{DECK_SIZE}</div>
      </GamePageHeader>

      <div className="deck-layout">
        {/* Colección */}
        <div className="deck-collection">
          <div className="deck-toolbar">
            <input className="deck-search" aria-label={t('deck.search')} placeholder={t('deck.search')} value={search}
              onChange={e => setSearch(e.target.value)} />
            <div className="deck-filters">
              {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(tp => (
                <button key={tp} aria-pressed={filter === tp} className={`filter-chip ${filter === tp ? 'active' : ''}`}
                  onClick={() => setFilter(tp)}>{tp === 'all' ? t('deck.all') : CARD_TYPE_NAMES[tp]}</button>
              ))}
            </div>
          </div>
          <div className="card-collection-grid">
            {filtered.length === 0 && <p className="shell-empty-state">{search ? `No cards match “${search}”.` : 'No available cards in this category.'}</p>}
            {filtered.map(card => (
              <CardVisual key={card.id} card={card} onClick={() => addCard(card)} small />
            ))}
          </div>
        </div>

        {/* Deck actual */}
        <div className="deck-current">
          <div className="deck-current-title">{t('deck.yourDeck')}</div>
          <div className="deck-library" aria-label="Saved deck library">
            <div className="deck-library-tabs" role="list">
              {library.decks.map(saved => (
                <button
                  type="button"
                  role="listitem"
                  key={saved.id}
                  className={`deck-library-tab${saved.id === library.activeDeckId ? ' active' : ''}`}
                  aria-pressed={saved.id === library.activeDeckId}
                  onClick={() => commitLibrary(current => selectSavedDeck(current, saved.id))}
                >
                  <span>{saved.name}</span><small>{saved.cards.length}/{DECK_SIZE}</small>
                </button>
              ))}
            </div>
            <input
              className="deck-name-input"
              aria-label="Deck name"
              value={activeDeck.name}
              maxLength={24}
              onChange={event => commitLibrary(current => renameSavedDeck(current, current.activeDeckId, event.target.value))}
            />
            <div className="deck-library-actions">
              <button type="button" disabled={library.decks.length >= MAX_SAVED_DECKS}
                onClick={() => commitLibrary(current => addSavedDeck(current, false))}>+ NEW</button>
              <button type="button" disabled={library.decks.length >= MAX_SAVED_DECKS}
                onClick={() => commitLibrary(current => addSavedDeck(current, true))}>DUPLICATE</button>
              <button type="button" disabled={library.decks.length <= 1}
                onClick={() => commitLibrary(current => deleteSavedDeck(current, current.activeDeckId))}>DELETE</button>
            </div>
          </div>
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
                  <span className="deck-row-icon"><img src={cardIconUrl(card.id)} alt="" draggable={false} /></span>
                  <span className="deck-row-name" style={{ color: CARD_COLORS[card.type] }}>{card.name}</span>
                  <span className="deck-row-atk">{card.atk > 0 ? `ATK ${card.atk}` : ''}</span>
                  <button className="deck-row-remove" aria-label={`Remove ${card.name}`} onClick={() => removeCard(cardId)}><X size={10} /></button>
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
  const unlocks = loadUnlocks();
  const [owned] = useState<Set<number>>(() => ownedCards(unlocks, prog.level));
  const [filter, setFilter] = useState<CardType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<number>(() => CARDS.find(c => ownedCards(loadUnlocks(), prog.level).has(c.id))?.id ?? CARDS[0].id);
  const starterCards = (unlocks.starterDeck === 'beam' ? STARTER_BEAM_DECK : STARTER_DAMAGE_DECK)
    .map(getCard).filter(Boolean) as CardDef[];

  const filtered = CARDS.filter(c => filter === 'all' || c.type === filter);
  const selectedCard = filtered.find(c => c.id === selectedId) ?? filtered[0] ?? CARDS[0];
  const selectedOwned = owned.has(selectedCard.id);
  const selectedStars = '★'.repeat(selectedCard.rarity) + '☆'.repeat(5 - selectedCard.rarity);

  useEffect(() => {
    if (!filtered.some(c => c.id === selectedId) && filtered[0]) setSelectedId(filtered[0].id);
  }, [filter, selectedId, filtered]);

  return (
    <div className="page-screen cards-screen">
      <GamePageHeader title={t('cards.title')} onBack={() => onNavigate('main')}>
        <div className="deck-count">{owned.size}/{CARDS.length}</div>
      </GamePageHeader>
      <div className="cards-layout">
        <div className="cards-collection-panel">
          <div className={`starter-deck-record${unlocks.starterDeck ? '' : ' empty'}`}>
            <div className="starter-deck-record-copy">
              <span>STARTER DECK · PERMANENT RECORD</span>
              <strong>{unlocks.starterDeck === 'beam' ? 'ENERGY / BEAM' : unlocks.starterDeck === 'damage' ? 'PHYSICAL / DAMAGE' : 'NOT SELECTED'}</strong>
              <small>{unlocks.starterDeck ? `${starterCards.length} cards · original collection choice` : 'Choose a starter deck to begin your collection.'}</small>
            </div>
            {unlocks.starterDeck ? (
              <div className="starter-deck-record-icons" aria-label="Starter deck card icons">
                {starterCards.slice(0, 8).map((card, index) => (
                  <img key={`${card.id}-${index}`} src={cardIconUrl(card.id)} alt={card.name} title={card.name} draggable={false} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="deck-toolbar cards-toolbar">
            <div className="deck-filters">
              {(['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'] as const).map(tp => (
                <button key={tp} aria-pressed={filter === tp} className={`filter-chip ${filter === tp ? 'active' : ''}`}
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
  const [volume, setVolumeState] = useState(() => {
    try {
      const raw = Number(localStorage.getItem('dbzlsw.volume') ?? '70');
      return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 70;
    } catch { return 70; }
  });
  const [sfx, setSfxState] = useState(() => { try { return localStorage.getItem('dbzlsw.sfx') !== 'off'; } catch { return true; } });
  const [music, setMusicState] = useState(() => { try { return localStorage.getItem('dbzlsw.music') !== 'off'; } catch { return true; } });
  const [speed, setSpeedState] = useState<'normal' | 'fast'>(() => {
    try { return localStorage.getItem('dbzlsw.textSpeed') === 'fast' ? 'fast' : 'normal'; } catch { return 'normal'; }
  });
  const setSpeed = (value: 'normal' | 'fast') => {
    setSpeedState(value);
    try { localStorage.setItem('dbzlsw.textSpeed', value); } catch { /* unavailable storage */ }
  };
  useEffect(() => {
    const sync = () => setScreenModeState(document.fullscreenElement ? 'fullscreen' : 'windowed');
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const [screenMode, setScreenModeState] = useState<'windowed' | 'fullscreen'>(() => document.fullscreenElement ? 'fullscreen' : 'windowed');

  useEffect(() => {
    setVolumeSfx(volume);
    setMusicVolume(volume / 100);
    setSfxEnabled(sfx);
    setMusicEnabled(music);
    if (music) playMusic(musicForScreen('settings'));
  }, []);

  const setVolume = (v: number) => {
    setVolumeState(v);
    try { localStorage.setItem('dbzlsw.volume', String(v)); } catch { /* noop */ }
    setVolumeSfx(v);
    setMusicVolume(v / 100);
  };
  const setSfx = (v: boolean) => {
    setSfxState(v);
    setSfxEnabled(v);
    try { localStorage.setItem('dbzlsw.sfx', v ? 'on' : 'off'); } catch { /* noop */ }
    if (v) Sfx.confirm();
  };
  const setMusic = (v: boolean) => {
    setMusicState(v);
    setMusicEnabled(v);
    if (v) playMusic(musicForScreen('settings'));
  };
  const setScreenMode = async (mode: 'windowed' | 'fullscreen') => {
    try {
      if (mode === 'fullscreen') await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch { /* Keep the displayed state in sync if the browser denies fullscreen. */ }
    setScreenModeState(document.fullscreenElement ? 'fullscreen' : 'windowed');
  };

  return (
    <div className="page-screen settings-screen">
      <GamePageHeader title={t('settings.title')} onBack={() => onNavigate('main')} />
      <div className="settings-list">
        {/* ── IDIOMA / LANGUAGE ── */}
        <div className="setting-row language-row">
          <span className="setting-label"><Languages size={12} /> {t('settings.language')}</span>
          <div className="language-grid">
            {LANGUAGES.map(l => (
              <button key={l.code} aria-pressed={lang === l.code} className={`filter-chip lang-chip ${lang === l.code ? 'active' : ''}`}
                onClick={() => { setLang(l.code); Sfx.confirm(); }}>
                <span className="lang-tag">{l.tag}</span> {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <span className="setting-label"><Volume2 size={12} /> {t('settings.bgmVolume')}</span>
          <input type="range" aria-label={t('settings.bgmVolume')} min={0} max={100} value={volume}
            onChange={e => setVolume(Number(e.target.value))} />
          <span className="setting-value">{volume}%</span>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Zap size={12} /> {t('settings.soundFx')}</span>
          <button aria-pressed={sfx} className={`toggle ${sfx ? 'on' : ''}`} onClick={() => setSfx(!sfx)}>
            {sfx ? t('settings.on') : t('settings.off')}
          </button>
        </div>
        <div className="setting-row">
          <span className="setting-label"><Music size={12} /> {t('settings.music')}</span>
          <button aria-pressed={music} className={`toggle ${music ? 'on' : ''}`} onClick={() => setMusic(!music)}>
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
            <div>{t('settings.ctrlCard')}</div>
            <div>{t('settings.ctrlNav')}</div>
            <div>{t('settings.ctrlConfirm')}</div>
            <div>{t('settings.ctrlBack')}</div>
            <div>{t('settings.ctrlPower')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// VERSUS — Selección de batalla
// ═══════════════════════════════════════════════════════════

function TeamSetupScreen({ onNavigate, onStartVersus, initialFormId }: {
  onNavigate: (s: Screen) => void;
  onStartVersus: (rivalTeam: TeamMember[]) => void;
  initialFormId?: string;
}) {
  const { t } = useLang();
  // ── Rival team state (2 slots, mirror of player team) ──
  const rival = useRivalSetupState({ initialFormId: 'piccolo_base' });
  const rivalActive = rival.state.members[rival.state.activeMember];
  const rivalRollItems = useMemo(() =>
    ROM_ORDERED_CHARACTERS.map(c => {
      const baseFormId = baseFormIdOf(c.id);
      const f = getForm(baseFormId);
      return {
        characterId: c.id,
        name: c.name,
        formId: baseFormId,
        formLabel: f?.form,
        idleUrl: overworldUrl(baseFormId),
        powerUrl: battleOverworldActorUrl(baseFormId, 'gather_power_pose') ?? undefined,
        auraUrl: undefined,
      };
    }), []);

  // Override centre with active rival's selected form
  const rivalSelectedIdx = Math.max(0, ROM_ORDERED_CHARACTERS.findIndex(c => c.id === rival.state.selectedCharacter));
  const rivalActiveFormId = rivalActive?.formId ?? 'piccolo_base';
  const rivalRollItemsWithActiveForm = useMemo(() =>
    rivalRollItems.map((it, i) => {
      if (i !== rivalSelectedIdx) return it;
      const f = getForm(rivalActiveFormId);
      return {
        ...it,
        formId: rivalActiveFormId,
        formLabel: f?.form ?? it.formLabel,
        idleUrl: overworldUrl(rivalActiveFormId) ?? it.idleUrl,
        powerUrl: battleOverworldActorUrl(rivalActiveFormId, 'gather_power_pose') ?? it.powerUrl,
      };
    }), [rivalRollItems, rivalSelectedIdx, rivalActiveFormId]);

  const rivalActiveChar = rivalActive ? getCharacter(rivalActive.characterId) : undefined;
  const rivalActiveForm = rivalActive ? getForm(rivalActive.formId) : undefined;
  const rivalPortrait = rivalActive ? resolveBattlePortraitStrict(rivalActive.formId) : { url: undefined };

  const deckLibrary = loadDeckLibrary(DEFAULT_DECK);
  const savedActiveDeck = activeSavedDeck(deckLibrary);
  const battleDefaultPreset = (isSavedDeckReady(savedActiveDeck)
    ? savedActiveDeck
    : deckLibrary.decks.find(isSavedDeckReady));
  const battleDefaultDeck = battleDefaultPreset?.cards ?? [];
  const initialCharacterId = initialFormId ? getForm(initialFormId)?.character : undefined;

  // Rival slot rendering (mirrors player team slots)
  const rivalSlots = (
    <div className="setup-team-slots" data-testid="rival-team-slots">
      {rival.state.members.map((m, i) => {
        const char = getCharacter(m.characterId);
        const form = getForm(m.formId);
        const portrait = resolveBattlePortraitStrict(m.formId);
        return (
          <div key={i} className={`setup-team-slot setup-team-slot-rival${i === rival.state.activeMember ? ' active' : ''}`}>
            <button type="button" className="setup-team-slot-btn"
              onClick={() => rival.setActiveMember(i)}>
              {portrait.url ? <img className="setup-team-slot-portrait battle" src={portrait.url} alt="" draggable={false} /> : null}
              <span className="setup-team-slot-copy">
                <span className="setup-team-slot-num">SLOT {i + 1}</span>
                <span className="setup-team-slot-name">{char?.name ?? '—'}</span>
                <span className="setup-team-slot-form">{form?.form ?? ''}</span>
              </span>
            </button>
            {rival.state.members.length > 1 ? (
              <button type="button" className="setup-team-slot-remove" title="Remove member"
                onClick={() => rival.removeMember(i)}>✕</button>
            ) : null}
          </div>
        );
      })}
      {rival.state.members.length < 2 ? (
        <button type="button" className="setup-team-slot setup-team-slot-add setup-team-slot-add-rival"
          onClick={rival.addMember}>+ ADD RIVAL</button>
      ) : null}
    </div>
  );

  return (
    <div className="page-screen versus-screen setup-screen-wrap">
      <GamePageHeader title={t('versus.title')} onBack={() => onNavigate('main')} />
      <TeamSetup
        useSetup={useTeamSetupState}
        fallbackDeck={battleDefaultDeck}
        savedDecks={deckLibrary.decks}
        initialCharacterId={initialCharacterId}
        initialFormId={initialFormId}
        initialDeckId={battleDefaultPreset?.id}
        topControls={(
          <div className="setup-command-row" role="group" aria-label="Team selection">
            {/* ── Player team ── */}
            <div className="setup-command-team setup-command-team-player" role="group" aria-label="Your team">
              <span className="setup-command-team-label">YOUR TEAM</span>
              {/* Team slots rendered by TeamSetup */}
            </div>
            {/* ── Rival team ── */}
            <div className="setup-command-team setup-command-team-rival" role="group" aria-label="Rival team">
              <span className="setup-command-team-label setup-enemy-label">RIVAL TEAM</span>
              {rivalSlots}
            </div>
            {/* ── Rival character roll + form selector ── */}
            <FormSelector
              characterId={rivalActive?.characterId ?? 'piccolo'}
              selectedFormId={rivalActive?.formId ?? 'piccolo_base'}
              onSelect={rival.selectForm}
              isUnlocked={() => true} // Rival can use any form
            />
          </div>
        )}
        onConfirm={(result: TeamSetupResult) => onStartVersus(rival.state.members)}
        onEditDecks={() => onNavigate('deck')}
        onBack={() => onNavigate('main')}
        isFormUnlocked={fid => isFormUnlocked(fid, loadProgress().level)}
      />
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
  const [rivalReserve, setRivalReserve] = useState<TeamMember | null>(null);
  const [battleDeck, setBattleDeck] = useState<number[] | undefined>(undefined);
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

  // Dev Studio: bloqueo el scroll del WINDOW mientras el dev panel está
  // montado (body.dev-mode). TODO el scroll vive en .dev-main — si el
  // window scrolleara, el header sticky se desplazaría con la ventana.
  // (Refuerzo JS: no depende de :has() ni de recargas — aplica al momento.)
  useEffect(() => {
    document.body.classList.toggle('dev-mode', inDev);
    return () => document.body.classList.remove('dev-mode');
  }, [inDev]);

  // Inicializar audio con el primer gesto del usuario (autoplay) y arrancar la BSO
  // (nunca en el Dev Studio: allí la música la controla su página 'Música')
  useEffect(() => {
    const onFirst = () => {
      if (inDev) {
        window.removeEventListener('pointerdown', onFirst);
        return;
      }
      initAudio();
      if (localStorage.getItem('dbzlsw.music') !== 'off') playMusic(musicForScreen(screen));
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
    if (localStorage.getItem('dbzlsw.music') !== 'off') playMusic(musicForScreen(screen));
    return () => { if (screen === 'main') stopMusic(); };
  }, [screen, inDev]);

  const openBattleSetup = (playerFormId: string) => {
    setPlayerForm(playerFormId);
    setBattleDeck(undefined);
    setStoryChapter(null);
    setScreen('versus');
  };

  const startVersus = (rivalTeam: TeamMember[]) => {
    const member = rivalTeam[0];
    if (member) {
      setPlayerForm(playerForm); // Player form set by TeamSetup
    }
    // Rival team: primary enemy + reserve (2v2)
    setEnemyForm(member?.formId ?? 'piccolo_base');
    // Store rival reserve for BattleConfig.enemy2
    setRivalReserve(rivalTeam.length > 1 ? rivalTeam[1] : null);
    setStoryChapter(null);
    setBattleKey(k => k + 1);
    setScreen('battle');
  };

  const startChapter = (enemyFormId: string, chapterId: number) => {
    setBattleDeck(undefined);
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
    return <Suspense fallback={<div className="dev-loading" role="status">Loading Development Studio…</div>}><DevStudio
      onExit={() => setInDev(false)}
      onLaunchBattle={(playerFormId, enemyFormId, chapter) => {
        if (loadUnlocks().starterDeck === null) {
          startWithDeck('damage');
          setNeedsStarter(false);
        }
        setPlayerForm(playerFormId);
        setBattleDeck(undefined);
        setEnemyForm(enemyFormId);
        setStoryChapter(chapter);
        setBattleKey(k => k + 1);
        setInDev(false);
        setScreen('battle');
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('dev');
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        } catch { /* noop */ }
      }}
    /></Suspense>;
  }

  if (needsStarter) {
    return <GameViewport><GameShellSurface><StarterScreen onDone={() => setNeedsStarter(false)} /></GameShellSurface></GameViewport>;
  }

  const screenEl = (() => {
    switch (screen) {
      case 'story': return <StoryScreen onNavigate={setScreen} onStartChapter={startChapter} />;
      case 'versus': return <TeamSetupScreen onNavigate={setScreen} onStartVersus={startVersus} initialFormId={playerForm} />;
      case 'deck': return <DeckScreen onNavigate={setScreen} />;
      case 'characters': return <CharactersScreen onNavigate={setScreen} onSelectFighter={openBattleSetup} />;
      case 'cards': return <CardsScreen onNavigate={setScreen} />;
      case 'settings': return <SettingsScreen onNavigate={setScreen} />;
      case 'storyScene': return <StorySceneScreen key={`scene-${storyScene?.chapter}-${storyScene?.phase}`} chapter={storyScene?.chapter ?? 1} phase={storyScene?.phase ?? 'intro'} onFinish={finishStoryScene} onNavigate={setScreen} />;
      case 'battle': return <BattleScreen key={battleKey} playerFormId={playerForm} enemyFormId={enemyForm} storyChapter={storyChapter} playerDeck={battleDeck} rivalReserve={rivalReserve} onExit={exitBattle}
        onRematch={() => { setStoryScene(null); setBattleKey(k => k + 1); setScreen('battle'); }}
        onMainMenu={() => { setStoryScene(null); setScreen('main'); }} />;
      default: return <MainMenu onNavigate={setScreen} />;
    }
  })();
  // Transición de entrada por pantalla (fade + slide sutil, estilo GBC)
  return (
    <GameViewport>
      <div key={screen === 'battle' ? `battle-${battleKey}` : screen} className="screen-enter">
        {screen === 'battle' ? screenEl : <GameShellSurface onBack={screen === 'main' ? undefined : () => setScreen(screen === 'storyScene' ? 'story' : 'main')}>{screenEl}</GameShellSurface>}
      </div>
      <GlobalTooltip />
    </GameViewport>
  );
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
          cuadro. La caja NO cambia de tamaño. M8.C2a: side=null (mensaje
          genérico sin actor) → SIN retrato, caja centrada con margen
          simétrico (speaker-none). */}
      {spriteUrl && side !== null && (
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

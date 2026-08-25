// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — COMBAT TRACE (runtime-level, determinista)
// ═══════════════════════════════════════════════════════════════════════
// Ejecuta UNA acción real sobre el BattleRuntime (M8) y produce un trace
// observable correlacionado:
//   Engine (qué decidió) → ROM route (cues generados) → Production
//   (cues consumidos) → control boundary final.
//
// PURO: sin RAF, sin Pixi, sin DOM. Mismo fixture + comando → mismo trace
// (determinismo verificado por verify:combat-observability).
//
// Golden Actions: presets reproducibles para comprobar cada familia sin
// montar una partida distinta. No mutan gameplay para forzar el escenario:
// construyen fixtures/configs válidos (createInitialBattleState).
// ═══════════════════════════════════════════════════════════════════════

import { BattleRuntime } from './runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from './engine/state/createInitialBattleState';
import { getCard, type CardDef } from '../data/cards';
import { BattlePosition } from '../data/positions';
import type { BattleCommand } from './engine/commands/BattleCommand';
import type { BattleSide } from './engine/state/BattleState';
import {
  getControlBoundary,
  getActionExecution,
  activeAttacker,
  activeDefender,
  initiativeSide,
} from './engine/state/battleStateSelectors';
import { traceCardAction, type CardActionTrace, type TraceResult } from './combatObservability';
import { romPresentationProfileForCard } from './romPresentationProfiles';

export type GoldenActionId =
  | 'kamehameha' | 'standard_damage' | 'gather' | 'guard'
  | 'move_h' | 'move_v' | 'stage3' | 'defense_card' | 'support' | 'defense_limit' | 'ko'
  | 'goku_ssj_kamehameha' | 'piccolo_beam' | 'android16_beam';

export interface GoldenActionPreset {
  id: GoldenActionId;
  label: string;
  playerFormId: string;
  enemyFormId: string;
  /** CardId para presets de carta (resueltos vía BattleRuntime.resolveCard). */
  cardId: number | null;
  /** Comando para presets de gameplay (GATHER/GUARD/MOVE/LIMIT). */
  command: BattleCommand | null;
  enemyHp: number;
  seed: number;
  /** Familia ROM esperada (para el gate de coherencia del preset). */
  expectedFamily: string;
  /** Control boundary final esperado (verificado por el gate). */
  expectedControlBoundary: string;
  description: string;
}

export const GOLDEN_ACTIONS: GoldenActionPreset[] = [
  { id: 'kamehameha', label: 'Kamehameha', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 12, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'BEAM_BASE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Beam $02 → ROM bridge (BEAM_BASE), 14 cues' },
  { id: 'standard_damage', label: 'Standard Damage', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 5, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'STANDARD_DAMAGE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Damage $0A → ROM bridge (STANDARD_DAMAGE)' },
  { id: 'gather', label: 'Gather Power', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: null, command: { type: 'GATHER_POWER' }, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Gather: sin ruta ROM → LEGACY (power)' },
  { id: 'guard', label: 'Guard', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: null, command: { type: 'GUARD' }, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Guard: sin ruta ROM → LEGACY' },
  { id: 'move_h', label: 'Move Horizontal', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: null, command: { type: 'MOVE', axis: 'HORIZONTAL' }, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Move H: sin ruta ROM → LEGACY (POSITION_CHANGED)' },
  { id: 'move_v', label: 'Move Vertical', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: null, command: { type: 'MOVE', axis: 'VERTICAL' }, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Move V: sin ruta ROM → LEGACY (POSITION_CHANGED)' },
  { id: 'stage3', label: '3 Stage', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 1, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Stage Attack (command): determinista, sin ruta ROM' },
  { id: 'defense_card', label: 'Defense Card', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 19, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'DEFENSE_RULE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Defense $Taiyoken: DEFENSE_RULE → LEGACY (guard)' },
  { id: 'support', label: 'Support', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 16, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'SUPPORT_OR_FIELD_EFFECT', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Support heal: sin ruta ROM → LEGACY' },
  { id: 'defense_limit', label: 'Defense LIMIT', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: null, command: { type: 'DEFENSE_LIMIT' }, enemyHp: 1000, seed: 20260818, expectedFamily: 'NONE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Defense LIMIT: frontera defensiva' },
  { id: 'ko', label: 'KO', playerFormId: 'goku_base', enemyFormId: 'piccolo_base', cardId: 12, command: null, enemyHp: 1, seed: 20260818, expectedFamily: 'BEAM_BASE', expectedControlBoundary: 'NONE', description: 'Kamehameha con rival a 1 HP → FIGHTER_DEFEATED → NONE' },
  // ── Frente Golden piloto (P0.4): beams por forma piloto ──
  { id: 'goku_ssj_kamehameha', label: 'Goku SSJ Kamehameha', playerFormId: 'goku_ssj', enemyFormId: 'piccolo_base', cardId: 13, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'BEAM_BASE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'S.Kamehameha #13 (goku) → BEAM_BASE · forma piloto golden' },
  { id: 'piccolo_beam', label: 'Piccolo Beam', playerFormId: 'piccolo_base', enemyFormId: 'goku_base', cardId: 17, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'BEAM_BASE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'S.Beam Can. #17 (piccolo) → BEAM_BASE · forma piloto golden' },
  { id: 'android16_beam', label: 'Android 16 Beam', playerFormId: 'android_16', enemyFormId: 'goku_base', cardId: 70, command: null, enemyHp: 1000, seed: 20260818, expectedFamily: 'BEAM_BASE', expectedControlBoundary: 'PLAYER_ATTACK_CHOICE', description: 'Hell Flash #70 (android_16) → BEAM_BASE · forma piloto golden' },
];

export interface EngineEventTrace {
  sequence: number;
  tick: number;
  type: string;
  detail: string;
}

/** Cue FIGHTER_POSE del timeline legado (rol semántico → pose canónica). */
export interface PoseCueRef {
  tick: number;
  role: string;
  side: BattleSide;
  pose: string;
}

/** Cue SEMÁNTICO del timeline legado (stream completo para el tracer). */
export interface LegacyCueTrace {
  tick: number;
  logicalTick: number;
  sourceEvent: string;
  type: string;
  role: string | null;
  side: BattleSide | null;
  pose: string | null;
  detail: string;
  fidelity: string;
}

export interface RuntimeActionTrace {
  presetId: GoldenActionId;
  label: string;
  cardId: number | null;
  cardName: string | null;
  // ── Engine ──
  engineEvents: EngineEventTrace[];
  engineEventCount: number;
  /** Resultado del ataque observado (hit/block/guard/miss/none). */
  engineOutcome: 'hit' | 'block' | 'guard' | 'miss' | 'none';
  // ── ROM ──
  romBacked: boolean;
  romFamily: string | null;
  romCuesGenerated: number;
  romCuesConsumed: number;
  romCuesDropped: number;
  romCuesNoVisibleEffect: number;
  proceduralFx: boolean;
  cardTrace: CardActionTrace | null;
  // ── LEGACY (M7 timeline) ──
  legacyCueCount: number;
  legacySemanticCues: number;
  // ── Control / lifecycle ──
  controlBoundaryFinal: string;
  actionExecutionFinal: string;
  attacker: BattleSide;
  defender: BattleSide;
  initiative: BattleSide;
  tickFinal: number;
  hpFinal: { player: number; enemy: number };
  defeated: BattleSide | null;
  // ── Clasificación ──
  result: TraceResult;
  // ── Poses semánticas (timeline legado) para el Action Trace Inspector ──
  poseCues: PoseCueRef[];
  // ── Stream completo de cues semánticos (timeline legado) ──
  legacyCues: LegacyCueTrace[];
}

function baseConfig(preset: GoldenActionPreset): InitialBattleConfig {
  return {
    playerFormId: preset.playerFormId, playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: preset.enemyFormId, enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: preset.enemyHp, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: { drawPile: [], hand: [], discardPile: [] },
    enemyDeck: { drawPile: [], hand: [], discardPile: [] },
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player', seed: preset.seed,
  };
}

function cardOf(id: number | null): CardDef | null {
  return id == null ? null : (getCard(id) ?? null);
}

/**
 * Ejecuta UN preset golden sobre un BattleRuntime fresco (determinista) y
 * devuelve el trace correlacionado. No toca gameplay: fixtures válidos.
 */
export function runGoldenAction(id: GoldenActionId): RuntimeActionTrace {
  const preset = GOLDEN_ACTIONS.find(p => p.id === id) ?? GOLDEN_ACTIONS[0];
  const cfg = baseConfig(preset);
  const state = { ...createInitialBattleState(cfg), phase: 'command' as const };
  const runtime = new BattleRuntime({ state, keepHistory: true });

  const card = cardOf(preset.cardId);
  let result;
  if (card && preset.command == null) {
    result = runtime.resolveCard('player', card);
  } else {
    result = runtime.dispatch(preset.command ?? { type: 'GUARD' });
  }

  const finalState = runtime.state;
  const engineEvents: EngineEventTrace[] = runtime.log.entries.map(en => {
    const e = en.event;
    let detail = '';
    switch (e.type) {
      case 'ATTACK_HIT': detail = `${e.source}→${e.target} ${e.outcome}`; break;
      case 'ATTACK_MISSED': detail = `${e.source}→${e.target}`; break;
      case 'DAMAGE_APPLIED': detail = `${e.amount} (${e.hpBefore}→${e.hpAfter})`; break;
      case 'FIGHTER_DEFEATED': detail = e.side; break;
      case 'CARD_PLAYED': detail = `#${e.cardId}`; break;
      case 'POSITION_CHANGED': detail = `${e.from}→${e.to}`; break;
      case 'GUARD_STARTED': detail = e.guard; break;
      case 'CC_SPENT': detail = `${e.amount}`; break;
      case 'PHASE_CHANGED': detail = `${e.from}→${e.to}`; break;
      case 'POST_ACTION_MAINTENANCE': detail = e.decrementedPowerWindows.join(','); break;
      default: detail = '';
    }
    return { sequence: en.sequence, tick: en.tick, type: e.type, detail };
  });

  // Resultado del ataque observado (primer ATTACK_HIT/ATTACK_MISSED).
  let engineOutcome: RuntimeActionTrace['engineOutcome'] = 'none';
  let defeated: BattleSide | null = null;
  for (const en of runtime.log.entries) {
    if (en.event.type === 'ATTACK_HIT' && engineOutcome === 'none') {
      engineOutcome = en.event.outcome;
    } else if (en.event.type === 'ATTACK_MISSED' && engineOutcome === 'none') {
      engineOutcome = 'miss';
    }
    if (en.event.type === 'FIGHTER_DEFEATED') defeated = en.event.side;
  }

  // ROM route (C1.0 bridge) + card trace.
  const cardTrace = card ? traceCardAction(card) : null;
  const romProfile = card ? romPresentationProfileForCard(card) : null;

  // LEGACY timeline (M7 buildPresentationTimeline vía runtime.timeline).
  const legacyEntries = runtime.timeline.entries;
  const SEMANTIC = new Set(['SCENE', 'FIGHTER_POSE', 'PROJECTILE', 'IMPACT', 'CAMERA', 'AURA', 'FIGHTER_POSITION', 'FIGHTER_VISIBILITY']);
  const legacySemanticCues = legacyEntries.filter(en => SEMANTIC.has(en.cue.type)).length;

  // Poses semánticas del timeline legado (rol → pose canónica) para el inspector.
  const poseCues: PoseCueRef[] = legacyEntries
    .filter(en => en.cue.type === 'FIGHTER_POSE')
    .map(en => {
      const c = en.cue as { tick: number; role: string; side: BattleSide; pose: string };
      return { tick: c.tick, role: c.role, side: c.side, pose: c.pose };
    });

  // Stream completo de cues semánticos (para el ActionPresentationTrace).
  const legacyCues: LegacyCueTrace[] = legacyEntries.map(en => {
    const c = en.cue as unknown as Record<string, unknown>;
    const detail =
      c.pose != null ? String(c.pose)
      : c.resource != null ? `fx $${Number(c.resource).toString(16).padStart(2, '0')}`
      : c.outcome != null ? String(c.outcome)
      : c.mode != null ? String(c.mode)
      : c.kind != null ? String(c.kind)
      : c.effect != null ? String(c.effect)
      : c.action != null ? String(c.action)
      : '';
    return {
      tick: en.cue.tick,
      logicalTick: en.logicalTick,
      sourceEvent: en.sourceEvent,
      type: en.cue.type,
      role: (c.role as string | undefined) ?? null,
      side: (c.side as BattleSide | undefined) ?? null,
      pose: (c.pose as string | undefined) ?? null,
      detail,
      fidelity: en.fidelity,
    };
  });

  return {
    presetId: preset.id,
    label: preset.label,
    cardId: preset.cardId,
    cardName: card?.name ?? null,
    engineEvents,
    engineEventCount: engineEvents.length,
    engineOutcome,
    romBacked: cardTrace?.romBacked ?? false,
    romFamily: romProfile?.kind ?? null,
    romCuesGenerated: cardTrace?.cuesGenerated ?? 0,
    romCuesConsumed: cardTrace?.cuesConsumed ?? 0,
    romCuesDropped: cardTrace?.cuesDropped ?? 0,
    romCuesNoVisibleEffect: cardTrace?.cuesNoVisibleEffect ?? 0,
    proceduralFx: cardTrace?.proceduralGraphics ?? false,
    cardTrace,
    legacyCueCount: legacyEntries.length,
    legacySemanticCues,
    controlBoundaryFinal: getControlBoundary(finalState),
    actionExecutionFinal: getActionExecution(finalState),
    attacker: activeAttacker(finalState),
    defender: activeDefender(finalState),
    initiative: initiativeSide(finalState),
    tickFinal: finalState.tick,
    hpFinal: { player: finalState.player.hp, enemy: finalState.enemy.hp },
    defeated,
    poseCues,
    legacyCues,
    result: cardTrace?.traceResult ?? (engineEvents.some(e => e.type === 'ATTACK_HIT' || e.type === 'DAMAGE_APPLIED') ? 'LEGACY' : 'LEGACY'),
  };
}

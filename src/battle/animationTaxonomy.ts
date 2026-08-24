// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ANIMATION TAXONOMY CANON
// ═══════════════════════════════════════════════════════════════════════
// Matriz 125/125 que separa tres conceptos:
//   1. EXECUTION FAMILY — qué handler/rutina ejecuta la ROM (byte 5).
//   2. ACTOR ANIMATION — qué ActionProfile/AnimationResource mueve al actor.
//   3. VISUAL EFFECT — qué FXResource/paleta/visual se renderiza.
//
// Este módulo no usa trazas dinámicas. BASE_X/BASE_Y, slot binding y
// coordenadas absolutas siguen siendo dominio de TRACE DYNAMIC.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import { cardCinematic } from '../data/cardsCinematic';
import { normalizeCardName, romCardData } from '../data/romCardData';
import {
  actionSemanticsForCard,
  resolveActionProfile,
  type Fidelity,
} from './actionProfiles';
import { canonForAction, type CanonPose } from './animationCanon';
import { animationResourceById, animationResourceSummary } from './animationResources';
import type { ActionKind, ActionVisualKind } from './engine/events/BattleEvent';
import { STANDARD_ATTACK_HANDLERS, specialHandlerForCard } from './engine/rom/romDescriptors';

export type TaxonomyEvidence =
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_SEQUENCE_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'REMAKE_CANON'
  | 'PENDING_DYNAMIC_TRACE';

export type ExecutionFamily =
  | 'NO_ACTION_HANDLER'
  | 'BASE_BEAM_OR_SUPPORT'
  | 'BEAM_RELEASE_FRAME_5'
  | 'BURNING_ATTACK_RELEASE'
  | 'PROJECTILE_SCROLL'
  | 'PROJECTILE_ALT_SCROLL'
  | 'SPECIAL_PROJECTILE_PATH'
  | 'SPECIAL_SCRIPT'
  | 'DAMAGE_BASE'
  | 'SCRIPTED_SPECIAL_OR_SUMMON'
  | 'BUU_BALL'
  | 'MULTI_ACTOR_SCRIPT'
  | 'PURPLE_COMET_Z'
  | 'ENERGY_ABSORBER'
  | 'UNKNOWN_HANDLER';

export interface TaxonomyPhysicalFrame {
  sequenceIndex: number;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
}

export interface CardAnimationTaxonomyRow {
  card: Pick<CardDef, 'id' | 'name' | 'type' | 'effect' | 'atk' | 'acc' | 'cc' | 'rarity'>;
  execution: {
    handler: number;
    handlerHex: string;
    family: ExecutionFamily;
    workerAddress: string | null;
    variant: string | null;
    evidence: TaxonomyEvidence;
  };
  actorAnimation: {
    actionProfileId: string | null;
    actionProfileFidelity: Fidelity | 'INFERRED';
    animationResource: number | null;
    animationResourceHex: string | null;
    canonicalPose: CanonPose;
    actorSequence: string[];
    targetSequence: string[];
    sequenceCount: number;
    physicalFrameCount: number;
    physicalFrames: TaxonomyPhysicalFrame[];
    sourceTechnique: string | null;
    evidence: TaxonomyEvidence;
  };
  visualEffect: {
    visual: ActionVisualKind;
    fxResource: number | null;
    fxResourceHex: string | null;
    palette: number | null;
    paletteHex: string | null;
    aura: 'power' | 'support' | 'none';
    template: string | null;
    assetClass: string | null;
    evidence: TaxonomyEvidence;
  };
  runtimeMapping: {
    animationKind: 'stage' | 'melee' | 'beam' | 'support';
    scope: 'shared' | 'limited' | 'unique';
    canonicalUsers: string[];
    traceDynamicNeededFor: string[];
  };
}

const NONE = 0xff;

function resourceId(value: number | undefined): number | null {
  return value == null || value === NONE ? null : value;
}

function hex(value: number | null): string | null {
  return value == null ? null : `0x${value.toString(16).padStart(2, '0')}`;
}

function actionKindFor(animation: 'stage' | 'melee' | 'beam' | 'support'): ActionKind {
  if (animation === 'stage') return 'command';
  if (animation === 'melee') return 'damage';
  return animation;
}

function actorCanonVisual(animation: 'stage' | 'melee' | 'beam' | 'support', visual: ActionVisualKind): ActionVisualKind {
  if (animation === 'stage' || animation === 'melee') return 'rush';
  if (animation === 'support') return visual === 'item' ? 'item' : 'power';
  return visual;
}

function executionFamily(handler: number): ExecutionFamily {
  switch (handler) {
    case 0x00: return 'NO_ACTION_HANDLER';
    case 0x02: return 'BASE_BEAM_OR_SUPPORT';
    case 0x03: return 'BEAM_RELEASE_FRAME_5';
    case 0x04: return 'BURNING_ATTACK_RELEASE';
    case 0x05: return 'PROJECTILE_SCROLL';
    case 0x06: return 'PROJECTILE_ALT_SCROLL';
    case 0x07: return 'SPECIAL_PROJECTILE_PATH';
    case 0x08: return 'SPECIAL_SCRIPT';
    case 0x0a: return 'DAMAGE_BASE';
    case 0x0b: return 'SCRIPTED_SPECIAL_OR_SUMMON';
    case 0x0c: return 'BUU_BALL';
    case 0x0d: return 'MULTI_ACTOR_SCRIPT';
    case 0x0e: return 'PURPLE_COMET_Z';
    case 0x0f: return 'ENERGY_ABSORBER';
    default: return 'UNKNOWN_HANDLER';
  }
}

function workerAddress(handler: number): string | null {
  const addr = STANDARD_ATTACK_HANDLERS[handler];
  return addr == null ? null : `Bank03:0x${addr.toString(16).toUpperCase()}`;
}

function physicalFrames(animationResource: number | null): TaxonomyPhysicalFrame[] {
  const resource = animationResource == null ? null : animationResourceById(animationResource);
  if (!resource) return [];
  return resource.sequences.flatMap((seq, sequenceIndex) =>
    seq.frames.map((frame, frameIndex) => ({
      sequenceIndex,
      frameIndex,
      visualFrameId: frame.visualFrameId,
      durationTicks: frame.durationTicks,
      offsetX: frame.offsetX,
      offsetY: frame.offsetY,
    })),
  );
}

function traceNeeds(card: CardDef, hasPhysicalFrames: boolean): string[] {
  const needs = ['BASE_X/BASE_Y', 'slot binding', 'absolute coordinates'];
  if (!hasPhysicalFrames && resourceId(romCardData(card.name)?.actorAnim) != null) {
    needs.push('AnimationResource frame decode');
  }
  if (specialHandlerForCard(card)) needs.push('special handler FSM');
  return needs;
}

export function animationTaxonomyForCard(card: CardDef): CardAnimationTaxonomyRow {
  const rom = romCardData(card.name);
  if (!rom) throw new Error(`Missing ROM card data for ${card.id}:${card.name}`);

  const sem = actionSemanticsForCard(card);
  const profile = resolveActionProfile(card.name);
  const actionKind = actionKindFor(sem.animation);
  const canonVisual = actorCanonVisual(sem.animation, sem.visual);
  const canon = canonForAction({
    id: profile?.id ?? `generic_${sem.animation}`,
    label: card.name,
    kind: actionKind,
    visual: canonVisual,
    fidelity: profile?.fidelity ?? 'INFERRED',
  });

  const animationResource = resourceId(rom.actorAnim);
  const fxResource = resourceId(rom.fxGraphics);
  const palette = resourceId(rom.fxPalette);
  const resource = animationResource == null ? null : animationResourceById(animationResource);
  const frames = physicalFrames(animationResource);
  const legacy = cardCinematic(card.id);
  const special = specialHandlerForCard(card);
  const hasPhysicalFrames = frames.length > 0;

  return {
    card: {
      id: card.id,
      name: card.name,
      type: card.type,
      effect: card.effect,
      atk: card.atk,
      acc: card.acc,
      cc: card.cc,
      rarity: card.rarity,
    },
    execution: {
      handler: rom.exec,
      handlerHex: hex(rom.exec) ?? '0x00',
      family: special?.family === 'MULTI_ACTOR_SCRIPT' && special.variant === 'PURPLE_COMET_Z'
        ? 'PURPLE_COMET_Z'
        : executionFamily(rom.exec),
      workerAddress: special
        ? `Bank${special.worker.bank}:0x${special.worker.address.toString(16).toUpperCase()}`
        : workerAddress(rom.exec),
      variant: special?.variant ?? null,
      evidence: special ? 'ROM_HANDLER_VERIFIED' : 'ROM_STATIC_VERIFIED',
    },
    actorAnimation: {
      actionProfileId: profile?.id ?? null,
      actionProfileFidelity: profile?.fidelity ?? 'INFERRED',
      animationResource,
      animationResourceHex: hex(animationResource),
      canonicalPose: canon.actor[0]?.pose ?? 'idle',
      actorSequence: canon.actor.map(b => `${b.frame}:${b.pose}`),
      targetSequence: canon.target.map(b => `${b.frame}:${b.pose}`),
      sequenceCount: resource?.sequenceCount ?? 0,
      physicalFrameCount: frames.length,
      physicalFrames: frames,
      sourceTechnique: resource?.sourceTechnique ?? null,
      evidence: hasPhysicalFrames
        ? 'ROM_SEQUENCE_VERIFIED'
        : animationResource == null
          ? 'REMAKE_CANON'
          : 'ROM_STATIC_VERIFIED',
    },
    visualEffect: {
      visual: sem.visual,
      fxResource,
      fxResourceHex: hex(fxResource),
      palette,
      paletteHex: hex(palette),
      aura: canon.aura,
      template: legacy?.template ?? null,
      assetClass: legacy?.asset ?? null,
      evidence: fxResource == null && palette == null ? 'REMAKE_CANON' : 'ROM_STATIC_VERIFIED',
    },
    runtimeMapping: {
      animationKind: sem.animation,
      scope: sem.scope,
      canonicalUsers: sem.canonicalUsers,
      traceDynamicNeededFor: traceNeeds(card, hasPhysicalFrames),
    },
  };
}

export const CARD_ANIMATION_TAXONOMY: CardAnimationTaxonomyRow[] =
  CARDS.map(animationTaxonomyForCard);

export function listAnimationTaxonomy(): CardAnimationTaxonomyRow[] {
  return CARD_ANIMATION_TAXONOMY;
}

export function animationTaxonomySummary() {
  const byExecutionFamily: Record<string, number> = {};
  const byVisual: Record<string, number> = {};
  let withAnimationResource = 0;
  let withFxResource = 0;
  let withPhysicalFrames = 0;
  for (const row of CARD_ANIMATION_TAXONOMY) {
    byExecutionFamily[row.execution.family] = (byExecutionFamily[row.execution.family] ?? 0) + 1;
    byVisual[row.visualEffect.visual] = (byVisual[row.visualEffect.visual] ?? 0) + 1;
    if (row.actorAnimation.animationResource != null) withAnimationResource++;
    if (row.visualEffect.fxResource != null) withFxResource++;
    if (row.actorAnimation.physicalFrameCount > 0) withPhysicalFrames++;
  }
  return {
    cards: CARD_ANIMATION_TAXONOMY.length,
    byExecutionFamily,
    byVisual,
    withAnimationResource,
    withFxResource,
    withPhysicalFrames,
    romSequenceResources: animationResourceSummary().decoded,
  };
}

export function animationTaxonomyByCardId(id: number): CardAnimationTaxonomyRow | undefined {
  return CARD_ANIMATION_TAXONOMY.find(row => row.card.id === id);
}

export function animationTaxonomyByName(name: string): CardAnimationTaxonomyRow | undefined {
  const key = normalizeCardName(name);
  return CARD_ANIMATION_TAXONOMY.find(row => normalizeCardName(row.card.name) === key);
}

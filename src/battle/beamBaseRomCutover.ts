// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — BEAM_BASE runtime cutover
// ═══════════════════════════════════════════════════════════════════════
// Gate runtime presentation for handler $02 / BEAM_BASE only. This module
// consumes the already-emitted BattleEventLog and never rolls accuracy,
// computes damage, mutates BattleState, invents anchors or chooses FX by
// visible card name.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import type { BattleActionDescriptor } from './engine/events/BattleEvent';
import type { BattleEventEnvelope } from './engine/events/EventLog';
import type { BattleSide } from './engine/state/BattleState';
import type { BattleTimeline, TimelineEntry } from './engine/presentation/PresentationCue';
import { compileRomPresentationProfile } from './romPresentationCompiler';
import { romActionExecutionDescriptorForCard } from './romActionExecutionDescriptors';
import {
  ROM_PRESENTATION_PROFILES,
  romPresentationProfileForCard,
  type RomPresentationProfile,
} from './romPresentationProfiles';
import { resolveRomSequenceSelector } from './romSequenceSelectors';
import { cardForBattleAction } from './standardDamageRomCutover';
import { withStaticDefenderEntrance } from './staticActionVisibility';
import { actionObjectBindingInstructions } from './romActionObject';

export const BEAM_BASE_ROM_HANDLER = 0x02;

/** Handlers que comparten el motor Beam $5776 (§218-224): $02-$07. */
export const BEAM_ROM_HANDLERS: ReadonlySet<number> = new Set([0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

export function isBeamRomHandler(handler: number): boolean {
  return BEAM_ROM_HANDLERS.has(handler);
}

export type BeamBaseRuntimeBranch =
  | 'HIT'
  | 'MISS'
  | 'HIGH_POWER_HIT'
  | 'HIGH_POWER_MISS'
  | 'SPECIAL_DEFENSE';

export interface BeamBaseRuntimeOutcome {
  family: BeamBaseRuntimeBranch | null;
  sourceEvent: string | null;
}

export interface BeamBaseRuntimeCutover {
  card: CardDef;
  profile: RomPresentationProfile;
  outcome: BeamBaseRuntimeOutcome;
  timeline: BattleTimeline;
}

export interface BeamBaseRuntimeCutoverSummary {
  beamBaseProfiles: number;
  handlerShared: number;
  romBacked: number;
  nonBeamBaseBacked: number;
  beamVariantsBacked: number;
  branchFamilies: BeamBaseRuntimeBranch[];
}

export function beamBaseProfileForAction(action: BattleActionDescriptor): { card: CardDef; profile: RomPresentationProfile } | null {
  const card = cardForBattleAction(action);
  if (!card) return null;
  const descriptor = romActionExecutionDescriptorForCard(card);
  if (descriptor.execution.handler !== BEAM_BASE_ROM_HANDLER) return null;
  const profile = romPresentationProfileForCard(card);
  return profile.kind === 'BEAM_BASE' ? { card, profile } : null;
}

/** Perfil de un miembro de la FAMILIA Beam ($02-$07) — nunca cards support. */
export function beamFamilyProfileForAction(action: BattleActionDescriptor): { card: CardDef; profile: RomPresentationProfile } | null {
  const card = cardForBattleAction(action);
  if (!card) return null;
  const descriptor = romActionExecutionDescriptorForCard(card);
  if (!isBeamRomHandler(descriptor.execution.handler)) return null;
  const profile = romPresentationProfileForCard(card);
  // GUARDRAIL §218/§447: support cards may SHARE $02/$03/$04 (buff/heal/shield)
  // but are NOT beams. Only beam-family kinds route through the beam bridge.
  return profile.kind === 'BEAM_BASE' || profile.kind === 'BEAM_VARIANT' || profile.kind === 'PROJECTILE_SCROLL'
    ? { card, profile }
    : null;
}

function branchExists(profile: RomPresentationProfile, family: BeamBaseRuntimeBranch): boolean {
  return profile.resultBranches.some(branch => branch.family === family);
}

function hitFamilyFor(profile: RomPresentationProfile): BeamBaseRuntimeBranch {
  return branchExists(profile, 'HIGH_POWER_HIT') && !branchExists(profile, 'HIT') ? 'HIGH_POWER_HIT' : 'HIT';
}

function missFamilyFor(profile: RomPresentationProfile): BeamBaseRuntimeBranch {
  return branchExists(profile, 'HIGH_POWER_MISS') && !branchExists(profile, 'MISS') ? 'HIGH_POWER_MISS' : 'MISS';
}

export function beamBaseOutcomeFromEvents(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  actorSide: BattleSide,
  profile: RomPresentationProfile,
): BeamBaseRuntimeOutcome {
  for (let index = actionStartedIndex + 1; index < events.length; index++) {
    const event = events[index].event;
    if (event.type === 'ACTION_STARTED') break;
    if (event.type === 'ACTION_RESOLVED' && event.side === actorSide) break;

    if (event.type === 'ATTACK_MISSED' && event.source === actorSide) {
      return { family: missFamilyFor(profile), sourceEvent: event.type };
    }

    if (event.type === 'ATTACK_HIT' && event.source === actorSide) {
      return {
        family: event.outcome === 'hit' ? hitFamilyFor(profile) : 'SPECIAL_DEFENSE',
        sourceEvent: event.type,
      };
    }
  }

  return { family: null, sourceEvent: null };
}

export function compileBeamBaseRuntimeCutover(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  env: BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } },
  actorFormId?: string | null,
): BeamBaseRuntimeCutover | null {
  const resolved = beamBaseProfileForAction(env.event.action);
  if (!resolved) return null;

  const outcome = beamBaseOutcomeFromEvents(events, actionStartedIndex, env.event.side, resolved.profile);
  const selector = resolveRomSequenceSelector({
    cardId: resolved.card.id,
    formId: actorFormId ?? null,
    animationResource: resolved.profile.dependencies.animationResource,
  });
  const compiled = compileRomPresentationProfile(resolved.profile, {
    startTick: env.tick,
    logicalTick: env.tick,
    actorSide: env.event.side,
    actorFormId: actorFormId ?? null,
    sequenceSelector: selector.sequence,
    sourceEvent: env.event.type,
    selectedResultFamily: outcome.family,
    selectedResultSourceEvent: outcome.sourceEvent,
  });
  const withEntrance = withStaticDefenderEntrance(compiled.timeline, env.event.action, env.event.side);
  // P0.4D/B7B4: ROM draw order (ROM_STATIC_VERIFIED) — el objeto del slot0 se
  // pinta antes que el del slot1 SIEMPRE. La rama $CA39 (bank_001:$4769)
  // conserva slot0-primero cuando el índice físico alterna.
  // B7B1 — binding FÍSICO (binder ROM £6708, OFFENSE): slot0 = ATTACKER, slot1 = DEFENDER.
  const bindCues: TimelineEntry[] = withEntrance.entries[0]
    ? actionObjectBindingInstructions('OFFENSE', {
        attacker: env.event.side,
        defender: env.event.side === 'player' ? 'enemy' : 'player',
      }).map((b) => ({
        ...withEntrance.entries[0],
        cue: {
          type: 'ACTION_OBJECT_BIND' as const,
          tick: env.tick,
          slot: b.slot,
          role: b.role,
          fighterSide: b.fighterSide,
          context: 'OFFENSE' as const,
          semantic: b.semantic,
        },
      }))
    : [];
  const drawOrderCue: TimelineEntry = {
    ...withEntrance.entries[0],
    cue: { type: 'ACTION_OBJECT_DRAW_ORDER' as const, tick: env.tick, order: 'SLOT_0_THEN_1' as const },
  };
  // P0.4: ROM $08 STOP_HIDE_OBJECT — both ActionObject slots must be hidden
  // at the end of the beam film. Same cleanup that standardDamageResultSplice applies.
  const endTick = withEntrance.endTick;
  const base = withEntrance.entries[0];
  const cleanup = base
    ? [
        { ...base, cue: { type: 'ACTION_OBJECT_STOP' as const, tick: endTick, slot: 0 as const } },
        { ...base, cue: { type: 'ACTION_OBJECT_STOP' as const, tick: endTick, slot: 1 as const } },
      ]
    : [];
  const timeline: BattleTimeline = {
    ...withEntrance,
    entries: [drawOrderCue, ...bindCues, ...withEntrance.entries, ...cleanup].sort((a, b) => a.cue.tick - b.cue.tick),
  };

  return {
    card: resolved.card,
    profile: resolved.profile,
    outcome,
    timeline,
  };
}

/**
 * Cutover generalizado para TODA la familia Beam ($02-$07): enruta a través
 * del mismo compilador ROM. Los handlers $03/$04 (BEAM_VARIANT) y $05/$06/$07
 * (PROJECTILE_SCROLL) comparten el motor $5776 — su gramática de lanzamiento
 * es concreta (BeamLaunchProfile); el resultado (HIT/MISS) puede quedar
 * HANDLER_UNPROVEN y se representa con ROM_PENDING honesto, no con Graphics
 * procedurales del renderer LEGACY.
 */
export function compileBeamFamilyRuntimeCutover(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  env: BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } },
  actorFormId?: string | null,
): BeamBaseRuntimeCutover | null {
  const resolved = beamFamilyProfileForAction(env.event.action);
  if (!resolved) return null;

  const outcome = beamBaseOutcomeFromEvents(events, actionStartedIndex, env.event.side, resolved.profile);
  const selector = resolveRomSequenceSelector({
    cardId: resolved.card.id,
    formId: actorFormId ?? null,
    animationResource: resolved.profile.dependencies.animationResource,
  });
  const compiled = compileRomPresentationProfile(resolved.profile, {
    startTick: env.tick,
    logicalTick: env.tick,
    actorSide: env.event.side,
    actorFormId: actorFormId ?? null,
    sequenceSelector: selector.sequence,
    sourceEvent: env.event.type,
    selectedResultFamily: outcome.family,
    selectedResultSourceEvent: outcome.sourceEvent,
  });
  const withEntrance = withStaticDefenderEntrance(compiled.timeline, env.event.action, env.event.side);
  // P0.4D/B7B4: ROM draw order (ROM_STATIC_VERIFIED) — el objeto del slot0 se
  // pinta antes que el del slot1 SIEMPRE. La rama $CA39 (bank_001:$4769)
  // conserva slot0-primero cuando el índice físico alterna.
  // B7B1 — binding FÍSICO (binder ROM £6708, OFFENSE): slot0 = ATTACKER, slot1 = DEFENDER.
  const bindCues: TimelineEntry[] = withEntrance.entries[0]
    ? actionObjectBindingInstructions('OFFENSE', {
        attacker: env.event.side,
        defender: env.event.side === 'player' ? 'enemy' : 'player',
      }).map((b) => ({
        ...withEntrance.entries[0],
        cue: {
          type: 'ACTION_OBJECT_BIND' as const,
          tick: env.tick,
          slot: b.slot,
          role: b.role,
          fighterSide: b.fighterSide,
          context: 'OFFENSE' as const,
          semantic: b.semantic,
        },
      }))
    : [];
  const drawOrderCue: TimelineEntry = {
    ...withEntrance.entries[0],
    cue: { type: 'ACTION_OBJECT_DRAW_ORDER' as const, tick: env.tick, order: 'SLOT_0_THEN_1' as const },
  };
  // P0.4: ROM $08 STOP_HIDE_OBJECT — both ActionObject slots must be hidden
  // at the end of the beam film. Same cleanup that standardDamageResultSplice applies.
  const endTick = withEntrance.endTick;
  const base = withEntrance.entries[0];
  const cleanup = base
    ? [
        { ...base, cue: { type: 'ACTION_OBJECT_STOP' as const, tick: endTick, slot: 0 as const } },
        { ...base, cue: { type: 'ACTION_OBJECT_STOP' as const, tick: endTick, slot: 1 as const } },
      ]
    : [];
  const timeline: BattleTimeline = {
    ...withEntrance,
    entries: [drawOrderCue, ...bindCues, ...withEntrance.entries, ...cleanup].sort((a, b) => a.cue.tick - b.cue.tick),
  };

  return {
    card: resolved.card,
    profile: resolved.profile,
    outcome,
    timeline,
  };
}

export function beamBaseRuntimeCutoverSummary(): BeamBaseRuntimeCutoverSummary {
  const beamBaseProfiles = ROM_PRESENTATION_PROFILES.filter(profile => profile.kind === 'BEAM_BASE').length;
  // handlerShared: cards sharing ROM handler $02 (incl. support cards that REUSE
  // $02 for buff/heal/shield presentation — they are NOT beams).
  const handlerShared = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === BEAM_BASE_ROM_HANDLER).length;
  // romBacked: genuinely BEAM_BASE-profile backed (beam cards only). Support
  // cards sharing $02 are excluded — they fall to SUPPORT_OR_FIELD_EFFECT.
  const romBacked = beamBaseProfiles;
  const nonBeamBaseBacked = CARDS.filter(card => {
    const descriptor = romActionExecutionDescriptorForCard(card);
    return descriptor.execution.handler !== BEAM_BASE_ROM_HANDLER
      && ROM_PRESENTATION_PROFILES.some(profile => profile.cardId === card.id && profile.kind === 'BEAM_BASE');
  }).length;
  const beamVariantsBacked = CARDS.filter(card => {
    const profile = ROM_PRESENTATION_PROFILES.find(item => item.cardId === card.id);
    return profile?.kind === 'BEAM_VARIANT' && romActionExecutionDescriptorForCard(card).execution.handler === BEAM_BASE_ROM_HANDLER;
  }).length;

  return {
    beamBaseProfiles,
    handlerShared,
    romBacked,
    nonBeamBaseBacked,
    beamVariantsBacked,
    branchFamilies: ['HIT', 'MISS', 'HIGH_POWER_HIT', 'HIGH_POWER_MISS', 'SPECIAL_DEFENSE'],
  };
}

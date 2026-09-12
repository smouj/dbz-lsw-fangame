// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — STANDARD_DAMAGE runtime cutover
// ═══════════════════════════════════════════════════════════════════════
// Gate runtime presentation for handler $0A only. This module never rolls
// accuracy, never computes damage and never mutates BattleState; it only
// translates the already-emitted BattleEventLog through the ROM presentation
// profile/compiler path.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import type { BattleActionDescriptor } from './engine/events/BattleEvent';
import type { BattleEventEnvelope } from './engine/events/EventLog';
import type { BattleSide } from './engine/state/BattleState';
import type { BattleTimeline } from './engine/presentation/PresentationCue';
import { compileRomPresentationProfile } from './romPresentationCompiler';
import { romActionExecutionDescriptorForCard } from './romActionExecutionDescriptors';
import {
  ROM_PRESENTATION_PROFILES,
  romPresentationProfileForCard,
  type RomPresentationProfile,
} from './romPresentationProfiles';
import { withStaticDefenderEntrance } from './staticActionVisibility';
import { spliceStandardDamageResult } from './standardDamageResultSplice';

export const STANDARD_DAMAGE_ROM_HANDLER = 0x0a;

export type StandardDamageRuntimeBranch = 'HIT' | 'MISS' | 'SPECIAL_DEFENSE';

export interface StandardDamageRuntimeOutcome {
  family: StandardDamageRuntimeBranch | null;
  sourceEvent: string | null;
}

export interface StandardDamageRuntimeCutover {
  actionId: string;
  actionSequence: number;
  card: CardDef;
  profile: RomPresentationProfile;
  outcome: StandardDamageRuntimeOutcome;
  timeline: BattleTimeline;
}

export interface StandardDamageRuntimeCutoverSummary {
  standardDamageProfiles: number;
  romBacked: number;
  nonStandardDamageBacked: number;
  branchFamilies: StandardDamageRuntimeBranch[];
}

export function cardForBattleAction(action: BattleActionDescriptor): CardDef | null {
  return CARDS.find(card => card.name === action.label) ?? null;
}

export function standardDamageProfileForAction(action: BattleActionDescriptor): { card: CardDef; profile: RomPresentationProfile } | null {
  const card = cardForBattleAction(action);
  if (!card) return null;
  const descriptor = romActionExecutionDescriptorForCard(card);
  if (descriptor.execution.handler !== STANDARD_DAMAGE_ROM_HANDLER) return null;
  const profile = romPresentationProfileForCard(card);
  return profile.kind === 'STANDARD_DAMAGE' ? { card, profile } : null;
}

export function standardDamageOutcomeFromEvents(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  actorSide: BattleSide,
): StandardDamageRuntimeOutcome {
  for (let index = actionStartedIndex + 1; index < events.length; index++) {
    const event = events[index].event;
    if (event.type === 'ACTION_STARTED') break;
    if (event.type === 'ACTION_RESOLVED' && event.side === actorSide) break;

    if (event.type === 'ATTACK_MISSED' && event.source === actorSide) {
      return { family: 'MISS', sourceEvent: event.type };
    }

    if (event.type === 'ATTACK_HIT' && event.source === actorSide) {
      return {
        family: event.outcome === 'hit' ? 'HIT' : 'SPECIAL_DEFENSE',
        sourceEvent: event.type,
      };
    }
  }

  return { family: null, sourceEvent: null };
}

export function compileStandardDamageRuntimeCutover(
  events: BattleEventEnvelope[],
  actionStartedIndex: number,
  env: BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } },
  actorFormId?: string | null,
  targetFormId?: string | null,
): StandardDamageRuntimeCutover | null {
  const resolved = standardDamageProfileForAction(env.event.action);
  if (!resolved) return null;

  const outcome = standardDamageOutcomeFromEvents(events, actionStartedIndex, env.event.side);
  const compiled = compileRomPresentationProfile(resolved.profile, {
    startTick: env.tick,
    logicalTick: env.tick,
    actorSide: env.event.side,
    actorFormId: actorFormId ?? null,
    sequenceSelector: null,
    sourceEvent: env.event.type,
    selectedResultFamily: outcome.family,
    selectedResultSourceEvent: outcome.sourceEvent,
  });
  // P0 ROM PRESENTATION: con la familia resuelta (HIT/MISS/SPECIAL_DEFENSE),
  // la pelicula consume los macros $2F/$30/$31 (actor seq1 + target Bank61)
  // en vez de la cola generica sin rama. El target se resuelve con el form del
  // DEFENSOR (targetFormId) — jamas con el form del actor.
  const animResource = resolved.profile.dependencies.animationResource;
  const spliced = outcome.family && animResource != null
    ? spliceStandardDamageResult({
        timeline: compiled.timeline,
        actorAnimationResource: animResource,
        branch: outcome.family as 'HIT' | 'MISS' | 'SPECIAL_DEFENSE',
        actorFormId: actorFormId ?? null,
        targetFormId: targetFormId ?? null,
        // B7B1 — el atacante es el autor del film; el defensor es el otro lado.
        attackerSide: env.event.side,
        defenderSide: env.event.side === 'player' ? 'enemy' : 'player',
      })
    : compiled.timeline;
  const timeline = withStaticDefenderEntrance(spliced, env.event.action, env.event.side);

  return {
    actionId: `${env.sequence}:${env.event.side}:${resolved.card.id}`,
    actionSequence: env.sequence,
    card: resolved.card,
    profile: resolved.profile,
    outcome,
    timeline,
  };
}

/** Compile only the latest resolved STANDARD_DAMAGE film from the Runtime log. */
export function latestStandardDamageRuntimeCutover(
  events: BattleEventEnvelope[],
  actorSide: BattleSide,
  card: CardDef,
  actorFormId?: string | null,
  targetFormId?: string | null,
): StandardDamageRuntimeCutover | null {
  for (let index = events.length - 1; index >= 0; index--) {
    const env = events[index];
    if (env.event.type !== 'ACTION_STARTED') continue;
    if (env.event.side !== actorSide || env.event.action.label !== card.name) continue;
    return compileStandardDamageRuntimeCutover(
      events,
      index,
      env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } },
      actorFormId,
      targetFormId,
    );
  }
  return null;
}

export function isStandardDamageRomCard(card: CardDef): boolean {
  return romActionExecutionDescriptorForCard(card).execution.handler === STANDARD_DAMAGE_ROM_HANDLER
    && romPresentationProfileForCard(card).kind === 'STANDARD_DAMAGE';
}

export function standardDamageRuntimeCutoverSummary(): StandardDamageRuntimeCutoverSummary {
  const standardDamageProfiles = ROM_PRESENTATION_PROFILES.filter(profile => profile.kind === 'STANDARD_DAMAGE').length;
  const romBacked = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === STANDARD_DAMAGE_ROM_HANDLER).length;
  const nonStandardDamageBacked = CARDS.filter(card => {
    const descriptor = romActionExecutionDescriptorForCard(card);
    return descriptor.execution.handler !== STANDARD_DAMAGE_ROM_HANDLER
      && ROM_PRESENTATION_PROFILES.some(profile => profile.cardId === card.id && profile.kind === 'STANDARD_DAMAGE');
  }).length;

  return {
    standardDamageProfiles,
    romBacked,
    nonStandardDamageBacked,
    branchFamilies: ['HIT', 'MISS', 'SPECIAL_DEFENSE'],
  };
}

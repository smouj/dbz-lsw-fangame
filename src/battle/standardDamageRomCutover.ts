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

export const STANDARD_DAMAGE_ROM_HANDLER = 0x0a;

export type StandardDamageRuntimeBranch = 'HIT' | 'MISS' | 'SPECIAL_DEFENSE';

export interface StandardDamageRuntimeOutcome {
  family: StandardDamageRuntimeBranch | null;
  sourceEvent: string | null;
}

export interface StandardDamageRuntimeCutover {
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
): StandardDamageRuntimeCutover | null {
  const resolved = standardDamageProfileForAction(env.event.action);
  if (!resolved) return null;

  const outcome = standardDamageOutcomeFromEvents(events, actionStartedIndex, env.event.side);
  const compiled = compileRomPresentationProfile(resolved.profile, {
    startTick: env.tick,
    logicalTick: env.tick,
    actorSide: env.event.side,
    sourceEvent: env.event.type,
    selectedResultFamily: outcome.family,
    selectedResultSourceEvent: outcome.sourceEvent,
  });

  return {
    card: resolved.card,
    profile: resolved.profile,
    outcome,
    timeline: compiled.timeline,
  };
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

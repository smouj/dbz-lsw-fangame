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
import type { BattleTimeline } from './engine/presentation/PresentationCue';
import { compileRomPresentationProfile } from './romPresentationCompiler';
import { romActionExecutionDescriptorForCard } from './romActionExecutionDescriptors';
import {
  ROM_PRESENTATION_PROFILES,
  romPresentationProfileForCard,
  type RomPresentationProfile,
} from './romPresentationProfiles';
import { cardForBattleAction } from './standardDamageRomCutover';

export const BEAM_BASE_ROM_HANDLER = 0x02;

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
): BeamBaseRuntimeCutover | null {
  const resolved = beamBaseProfileForAction(env.event.action);
  if (!resolved) return null;

  const outcome = beamBaseOutcomeFromEvents(events, actionStartedIndex, env.event.side, resolved.profile);
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

export function beamBaseRuntimeCutoverSummary(): BeamBaseRuntimeCutoverSummary {
  const beamBaseProfiles = ROM_PRESENTATION_PROFILES.filter(profile => profile.kind === 'BEAM_BASE').length;
  const romBacked = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === BEAM_BASE_ROM_HANDLER).length;
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
    romBacked,
    nonBeamBaseBacked,
    beamVariantsBacked,
    branchFamilies: ['HIT', 'MISS', 'HIGH_POWER_HIT', 'HIGH_POWER_MISS', 'SPECIAL_DEFENSE'],
  };
}

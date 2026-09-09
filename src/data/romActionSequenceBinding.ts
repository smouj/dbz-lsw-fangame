// ═══════════════════════════════════════════════════════════════════════
// romActionSequenceBinding.ts — SSOT: card -> handler -> track -> resource -> sequences.
// Physical data comes from the full 66-slot RomSequenceRegistry. Runtime
// selector semantics remain explicit and are never inferred from appearance.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from './cards';
import { romCardData, type RomCardData } from './romCardData';
import { ROM_BEAM_SEQUENCE_SELECTORS } from './generated/romBeamSequenceSelectors.generated';
import { romSpecialHandlerBinding } from './generated/romSpecialHandlerSequenceBindings.generated';
import {
  getRomSequenceRegistry,
  type PhysicalLinkageStatus,
  type RomSequenceEntry,
} from './romSequenceRegistry';

export type RomSequenceSelectorKind =
  | 'FIXED'
  | 'ACTOR_PROFILE'
  | 'HANDLER_SELECTED'
  | 'RESULT_BRANCH'
  | 'NON_SEQUENCE_DISPLAY'
  | 'DYNAMIC_PENDING';

export type RomTrackPhysicalStatus = PhysicalLinkageStatus | 'NO_ANIMATION_RESOURCE';

export interface RomActionAnimationTrack {
  trackId: string;
  label: string;
  slot: number | null;
  resourceId: number | null;
  selector: {
    kind: RomSequenceSelectorKind;
    value: number | null;
    evidence: string;
  };
  sequences: number[];
  totalFrames: number;
  totalTicks: number;
  physicalStatus: RomTrackPhysicalStatus;
  evidence: string[];
}

export interface RomActionSequenceBinding {
  actionId: string;
  card: { id: number; name: string; category: string; type: string };
  execution: { handler: number; handlerHex: string; family: string; worker: string | null };
  tracks: RomActionAnimationTrack[];
  hasFxTrack: boolean;
  fxResourceId: number | null;
  fxPaletteId: number | null;
  resultBranches: string[];
  evidence: string[];
}

const HANDLER_FAMILIES: Record<number, { family: string; label: string }> = {
  0x00: { family: 'STAGE_OR_RULE', label: 'Stage/Rule' },
  0x02: { family: 'BEAM', label: 'Beam' },
  0x03: { family: 'BEAM_SPECIAL', label: 'Beam (Special)' },
  0x04: { family: 'BEAM_BURNING', label: 'Beam (Burning)' },
  0x05: { family: 'BEAM_CHARGE', label: 'Beam (Charge)' },
  0x06: { family: 'BEAM_POTBELLY', label: 'Beam (Potbelly)' },
  0x07: { family: 'CONTROLLED', label: 'Controlled Projectile' },
  0x08: { family: 'SUICIDE', label: 'Suicide' },
  0x0a: { family: 'STANDARD_DAMAGE', label: 'Standard Damage' },
  0x0b: { family: 'PHYSICAL_SPECIAL', label: 'Physical Special' },
  0x0c: { family: 'VBALL_CRASH', label: 'V-Ball Crash' },
  0x0d: { family: 'SUPPORT_SPECIAL', label: 'Support/Special' },
  0x0e: { family: 'COMET_COMBO', label: 'Comet Combo' },
  0x0f: { family: 'ABSORB', label: 'Energy Absorb' },
};

const NONE = 0xff;
function hex(value: number | null): string {
  return value == null ? '—' : `$${value.toString(16).padStart(2, '0')}`;
}
function registryForResource(resourceId: number): RomSequenceEntry | null {
  return getRomSequenceRegistry().find((entry) => entry.resourceId === resourceId) ?? null;
}
function techniqueForResource(resourceId: number): string | null {
  return registryForResource(resourceId)?.technique ?? null;
}
function sequencesForResource(resourceId: number) {
  const resource = registryForResource(resourceId);
  if (!resource) return { sequences: [] as number[], totalFrames: 0, totalTicks: 0 };
  return {
    sequences: resource.sequences.map((_, index) => index),
    totalFrames: resource.totalFrameInstances,
    totalTicks: resource.totalTicks,
  };
}
function physicalStatusForResource(resourceId: number): RomTrackPhysicalStatus {
  return registryForResource(resourceId)?.status ?? 'NO_ANIMATION_RESOURCE';
}

function resultBranchSelectorForResource(resourceId: number): RomActionAnimationTrack['selector'] | null {
  if (resourceId >= 0x2c && resourceId <= 0x3e) {
    return {
      kind: 'RESULT_BRANCH',
      value: null,
      evidence: 'STANDARD_DAMAGE resource seq0+seq1 are statically reachable; seq1 is consumed by result macros $2F/$30/$31 on AnimationSlot 6.',
    };
  }
  if (resourceId === 0x3f) {
    return {
      kind: 'RESULT_BRANCH',
      value: null,
      evidence: 'Tail resource $3F seq0+seq1 are statically reachable; Bank03:$62BB executes macro $36 (AnimationSlot 6, sequence 1, flags $80).',
    };
  }
  if (resourceId === 0x41) {
    return {
      kind: 'RESULT_BRANCH',
      value: null,
      evidence: 'V-ball resource $41 seq0..seq3 are statically reachable; initial selector table chooses seq0 and macros $3B/$3C/$3D select seq1/seq2/seq3.',
    };
  }
  return null;
}

function selectorFor(card: CardDef, rom: RomCardData, resource: RomSequenceEntry | null): RomActionAnimationTrack['selector'] {
  if (!resource) {
    return { kind: 'FIXED', value: null, evidence: 'No actor AnimationResource in the ROM card record.' };
  }
  if (resource.status === 'EMPTY_RESOURCE_SLOT') {
    return {
      kind: 'FIXED',
      value: null,
      evidence: `ROM catalog slot ${resource.resourceHex} has length=0; handler owns the visible behavior and no actor sequence may be fabricated.`,
    };
  }

  if ([0x02, 0x03, 0x04, 0x05, 0x06].includes(rom.exec)) {
    const selectors = ROM_BEAM_SEQUENCE_SELECTORS.filter(
      (selector) => selector.animationResource === resource.resourceId && selector.cardId === card.id,
    );
    return {
      kind: 'ACTOR_PROFILE',
      value: resource.sequences.length === 1 ? 0 : null,
      evidence: selectors.length > 0
        ? `BEAM actor selector table: ${selectors.length} profile->sequence mappings.`
        : resource.sequences.length === 1
          ? 'Single physical sequence; selector resolves to sequence 0.'
          : 'Multiple physical sequences are closed; actor-profile selector rows remain the semantic authority.',
    };
  }

  if (rom.exec === 0x0a) {
    const resultBranch = resultBranchSelectorForResource(resource.resourceId);
    if (resultBranch) return resultBranch;
    return {
      kind: 'HANDLER_SELECTED',
      value: resource.sequences.length === 1 ? 0 : null,
      evidence: 'STANDARD_DAMAGE handler selects card-specific slot 6; generic reaction track is slot 7.',
    };
  }

  if (resource.sequences.length === 1) {
    return { kind: 'FIXED', value: 0, evidence: 'Physical resource contains exactly one sequence.' };
  }

  if (rom.exec === 0x0b || rom.exec === 0x0c || rom.exec === 0x0d || rom.exec === 0x0e) {
    const resultBranch = resultBranchSelectorForResource(resource.resourceId);
    if (resultBranch) return resultBranch;
    return {
      kind: 'HANDLER_SELECTED',
      value: null,
      evidence: `Handler ${hex(rom.exec)} selects among ${resource.sequences.length} byte-exact physical sequences; ordering is known, runtime branch semantics remain separate.`,
    };
  }

  return {
    kind: 'DYNAMIC_PENDING',
    value: null,
    evidence: `${resource.sequences.length} physical sequences are closed; handler ${hex(rom.exec)} selection semantics are not promoted here without direct evidence.`,
  };
}

function buildActorTrack(card: CardDef, rom: RomCardData): RomActionAnimationTrack {
  const resourceId = rom.actorAnim === NONE ? null : rom.actorAnim;
  if (resourceId == null) {
    return {
      trackId: 'actor', label: 'Actor Animation', slot: rom.exec === 0x0a ? 6 : 0,
      resourceId: null,
      selector: { kind: 'FIXED', value: null, evidence: 'ROM card byte[6] = $FF: no actor AnimationResource.' },
      sequences: [], totalFrames: 0, totalTicks: 0,
      physicalStatus: 'NO_ANIMATION_RESOURCE',
      evidence: ['ROM card byte[6] = $FF', `handler ${hex(rom.exec)}`],
    };
  }

  const resource = registryForResource(resourceId);
  const sequenceData = sequencesForResource(resourceId);
  const physicalStatus = physicalStatusForResource(resourceId);
  return {
    trackId: 'actor',
    label: 'Actor Animation',
    slot: rom.exec === 0x0a ? 6 : 0,
    resourceId,
    selector: selectorFor(card, rom, resource),
    sequences: sequenceData.sequences,
    totalFrames: sequenceData.totalFrames,
    totalTicks: sequenceData.totalTicks,
    physicalStatus,
    evidence: [
      `ROM card byte[6] = ${hex(resourceId)}`,
      `handler ${hex(rom.exec)}`,
      `physical status = ${physicalStatus}`,
      resource ? `resource ${resource.resourceHex}: ${resource.sequences.length} sequences / ${resource.totalFrameInstances} frame records` : 'resource missing',
    ],
  };
}

function buildSpecialHandlerTracks(rom: RomCardData): RomActionAnimationTrack[] | null {
  const binding = romSpecialHandlerBinding(rom.exec);
  if (!binding || rom.actorAnim !== binding.actorResource) return null;
  const resource = registryForResource(binding.actorResource);
  if (!resource) return null;
  const physicalStatus = physicalStatusForResource(binding.actorResource);

  return binding.phases.map((phase, index) => {
    const sequence = resource.sequences[phase.sequence];
    const phaseLabel = phase.macroId != null
      ? `macro ${hex(phase.macroId)}`
      : phase.state != null
        ? `state ${hex(phase.state)}`
        : 'handler phase';
    const trackId = index === 0
      ? 'actor'
      : phase.role === 'ACTOR_SUPPORT'
        ? 'actor-support'
        : `actor-phase-${index}`;
    return {
      trackId,
      label: `${phase.role === 'ACTOR_SUPPORT' ? 'Actor Support' : 'Actor Animation'} · ${phaseLabel}`,
      slot: phase.slot,
      resourceId: binding.actorResource,
      selector: {
        kind: 'FIXED' as const,
        value: phase.sequence,
        evidence: phase.evidence,
      },
      sequences: [phase.sequence],
      totalFrames: sequence?.frames.length ?? phase.frameCount ?? 0,
      totalTicks: sequence?.totalTicks ?? phase.totalTicks ?? 0,
      physicalStatus,
      evidence: [
        phase.evidence,
        `special handler ${hex(binding.handler)} worker Bank${binding.worker.bank}:$${binding.worker.address.toString(16).toUpperCase()}`,
        `resource ${hex(binding.actorResource)} sequence ${phase.sequence}`,
        ...binding.evidenceHashes,
      ],
    };
  });
}

function buildFxTrack(rom: RomCardData): RomActionAnimationTrack | null {
  if (rom.fxGraphics === NONE) return null;
  const fxPalette = rom.fxPalette === NONE ? null : rom.fxPalette;
  return {
    trackId: 'fx', label: 'FX / BG Effect', slot: 1, resourceId: rom.fxGraphics,
    selector: { kind: 'NON_SEQUENCE_DISPLAY', value: null, evidence: `FX resource ${hex(rom.fxGraphics)} belongs to the separate FX/display grammar, not to an AnimationResource sequence selector.` },
    sequences: [], totalFrames: 0, totalTicks: 0,
    physicalStatus: 'NO_ANIMATION_RESOURCE',
    evidence: [`fx=${hex(rom.fxGraphics)}`, `palette=${hex(fxPalette)}`, 'Not an AnimationResource $62-$64 track.'],
  };
}

function buildGenericTrack(rom: RomCardData): RomActionAnimationTrack | null {
  if (rom.exec !== 0x0a) return null;
  return {
    trackId: 'generic', label: 'Generic Standard-Damage Track (Bank61:$5E20)', slot: 7, resourceId: null,
    selector: { kind: 'HANDLER_SELECTED', value: null, evidence: 'STANDARD_DAMAGE slot 7 is the generic Bank61:$5E20 animation pool.' },
    sequences: [], totalFrames: 0, totalTicks: 0,
    physicalStatus: 'NO_ANIMATION_RESOURCE',
    evidence: ['Bank61:$5E20 generic track; outside the $62-$64 AnimationResource catalog.'],
  };
}

function resultBranches(rom: RomCardData): string[] {
  if (rom.exec === 0x0a) return ['HIT', 'MISS', 'HIGH_POWER_HIT', 'HIGH_POWER_MISS'];
  if ([0x02, 0x03, 0x04, 0x05, 0x06, 0x07].includes(rom.exec)) return ['HIT', 'MISS'];
  if (rom.exec === 0x0b) return ['HIT'];
  return [];
}

export function buildRomActionSequenceBindings(): RomActionSequenceBinding[] {
  return CARDS.flatMap((card) => {
    const rom = romCardData(card.name);
    if (!rom) return [];
    const specialTracks = buildSpecialHandlerTracks(rom);
    const actorTracks = specialTracks ?? [buildActorTrack(card, rom)];
    const fxTrack = buildFxTrack(rom);
    const genericTrack = buildGenericTrack(rom);
    const family = HANDLER_FAMILIES[rom.exec]?.family ?? 'UNKNOWN';
    const special = romSpecialHandlerBinding(rom.exec);
    return [{
      actionId: `card-${card.id}`,
      card: { id: card.id, name: card.name, category: card.type, type: card.type },
      execution: {
        handler: rom.exec,
        handlerHex: hex(rom.exec),
        family,
        worker: special ? `Bank${special.worker.bank}:$${special.worker.address.toString(16).toUpperCase()}` : null,
      },
      tracks: [...actorTracks, ...(fxTrack ? [fxTrack] : []), ...(genericTrack ? [genericTrack] : [])],
      hasFxTrack: rom.fxGraphics !== NONE,
      fxResourceId: rom.fxGraphics === NONE ? null : rom.fxGraphics,
      fxPaletteId: rom.fxPalette === NONE ? null : rom.fxPalette,
      resultBranches: resultBranches(rom),
      evidence: [
        `ROM card: handler=${hex(rom.exec)}`,
        `actorAnim=${hex(rom.actorAnim)}`,
        `fxGraphics=${hex(rom.fxGraphics)}`,
        `fxPalette=${hex(rom.fxPalette)}`,
        ...(special ? special.evidenceHashes : []),
      ],
    }];
  });
}

let bindingsCache: RomActionSequenceBinding[] | null = null;
export function getRomActionSequenceBindings(): RomActionSequenceBinding[] {
  return bindingsCache ?? (bindingsCache = buildRomActionSequenceBindings());
}
export function getBindingForCard(cardId: number): RomActionSequenceBinding | undefined {
  return getRomActionSequenceBindings().find((binding) => binding.card.id === cardId);
}
export function getBindingsForResource(resourceId: number): RomActionSequenceBinding[] {
  return getRomActionSequenceBindings().filter((binding) => binding.tracks.some((track) => track.resourceId === resourceId));
}
export function getBindingsForHandler(handler: number): RomActionSequenceBinding[] {
  return getRomActionSequenceBindings().filter((binding) => binding.execution.handler === handler);
}

export interface ResourceConsumer {
  cardId: number;
  cardName: string;
  trackId: string;
  trackLabel: string;
  slot: number | null;
  selectorKind: RomSequenceSelectorKind;
}
export function getConsumersForResource(resourceId: number): ResourceConsumer[] {
  return getRomActionSequenceBindings().flatMap((binding) => binding.tracks
    .filter((track) => track.resourceId === resourceId)
    .map((track) => ({
      cardId: binding.card.id,
      cardName: binding.card.name,
      trackId: track.trackId,
      trackLabel: track.label,
      slot: track.slot,
      selectorKind: track.selector.kind,
    })));
}

export interface RomActionSequenceBindingSummary {
  totalBindings: number;
  withActorResource: number;
  withFxResource: number;
  withGenericTrack: number;
  byHandlerFamily: Record<string, number>;
  byPhysicalStatus: Record<RomTrackPhysicalStatus, number>;
  bySelectorKind: Record<RomSequenceSelectorKind, number>;
  fullyClosedResources: string[];
  frameStreamOnlyResources: string[];
}

export function getBindingSummary(): RomActionSequenceBindingSummary {
  const bindings = getRomActionSequenceBindings();
  const byHandlerFamily: Record<string, number> = {};
  const byPhysicalStatus: Record<RomTrackPhysicalStatus, number> = {
    PHYSICAL_RESOURCE_FULLY_CLOSED: 0,
    EMPTY_RESOURCE_SLOT: 0,
    FRAME_STREAM_CLOSED: 0,
    METASPRITE_LINK_PENDING: 0,
    NO_ANIMATION_RESOURCE: 0,
  };
  const bySelectorKind: Record<RomSequenceSelectorKind, number> = {
    FIXED: 0, ACTOR_PROFILE: 0, HANDLER_SELECTED: 0, RESULT_BRANCH: 0, NON_SEQUENCE_DISPLAY: 0, DYNAMIC_PENDING: 0,
  };
  const fullyClosed = new Set<string>();
  const frameStreamOnly = new Set<string>();
  let withActorResource = 0;
  let withFxResource = 0;
  let withGenericTrack = 0;

  for (const binding of bindings) {
    byHandlerFamily[binding.execution.family] = (byHandlerFamily[binding.execution.family] ?? 0) + 1;
    const actorTracks = binding.tracks.filter((track) => track.trackId.startsWith('actor') && track.resourceId != null);
    if (actorTracks.length > 0) withActorResource++;
    if (binding.tracks.some((track) => track.trackId === 'fx')) withFxResource++;
    if (binding.tracks.some((track) => track.trackId === 'generic')) withGenericTrack++;

    for (const track of binding.tracks) {
      byPhysicalStatus[track.physicalStatus]++;
      bySelectorKind[track.selector.kind]++;
      if (track.trackId.startsWith('actor') && track.resourceId != null) {
        const name = techniqueForResource(track.resourceId);
        if (name && track.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED') fullyClosed.add(name);
        if (name && track.physicalStatus === 'FRAME_STREAM_CLOSED') frameStreamOnly.add(name);
      }
    }
  }

  return {
    totalBindings: bindings.length,
    withActorResource,
    withFxResource,
    withGenericTrack,
    byHandlerFamily,
    byPhysicalStatus,
    bySelectorKind,
    fullyClosedResources: [...fullyClosed],
    frameStreamOnlyResources: [...frameStreamOnly],
  };
}

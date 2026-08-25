// ═══════════════════════════════════════════════════════════════════════
// romActionSequenceBinding.ts — SSOT: card → handler → track → resource → sequence
//
// For each concrete action (card), this answers:
//   "What resource/sequence(s) does the ROM actually order to execute?"
//
// This is NOT a frame-visual registry. It is an EXECUTION BINDING:
// which AnimationResource, which track, which selector, which sequences.
//
// Physical frame data lives in RomSequenceRegistry. This module binds
// that physical data to the cards and forms that consume it.
//
// 8 PHYSICAL_RESOURCE_FULLY_CLOSED resources have full metasprite linkage.
// 6 FRAME_STREAM_CLOSED resources have frame streams but no metasprite linkage.
// Both appear in this binding — incomplete resources show honest PENDING status.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from './cards';
import { romCardData, type RomCardData } from './romCardData';
import { ROM_TECHNIQUES } from './romAnimationData';
import { ROM_BEAM_SEQUENCE_SELECTORS } from './generated/romBeamSequenceSelectors.generated';
import { getRomSequenceRegistry, type PhysicalLinkageStatus } from './romSequenceRegistry';

// ── Types ──

/** How a sequence is selected for a given form. */
export type RomSequenceSelectorKind =
  | 'FIXED'                // Single sequence, no form-dependent selection
  | 'ACTOR_PROFILE'        // Sequence selected by actorVisualProfileKey (BEAM handler $02)
  | 'HANDLER_SELECTED'     // Handler picks sequence at runtime (STANDARD_DAMAGE slot 6/7)
  | 'RESULT_BRANCH'        // Sequence depends on hit/miss outcome
  | 'DYNAMIC_PENDING';    // Selection mechanism not yet decoded

/** Physical closure status for a track's sequence data. */
export type RomTrackPhysicalStatus = PhysicalLinkageStatus | 'NO_ANIMATION_RESOURCE';

/** A single animation track within an action. */
export interface RomActionAnimationTrack {
  /** Unique track ID within this binding: 'actor' | 'fx' | 'generic' | 'result-HIT' | 'result-MISS' | ... */
  trackId: string;
  /** Human-readable label for the track. */
  label: string;
  /** Track slot number (0=primary actor, 1=secondary, 6=card-specific STD, 7=generic STD). */
  slot: number | null;
  /** AnimationResource ID for this track (0xFF = none). */
  resourceId: number | null;
  /** How the sequence is selected for this track. */
  selector: {
    kind: RomSequenceSelectorKind;
    value: number | null;       // e.g., fixed sequence index, or null if dynamic
    evidence: string;
  };
  /** Sequence indices available in this track. */
  sequences: number[];
  /** Total frames across all sequences. */
  totalFrames: number;
  /** Total ticks across all sequences. */
  totalTicks: number;
  /** Physical linkage status of this track's resource. */
  physicalStatus: RomTrackPhysicalStatus;
  /** Evidence trail. */
  evidence: string[];
}

/** Complete binding: what this card executes, track by track. */
export interface RomActionSequenceBinding {
  /** Unique binding ID: card-{id} */
  actionId: string;
  /** Card this binding belongs to. */
  card: {
    id: number;
    name: string;
    category: string;
    type: string;
  };
  /** Execution handler from ROM card record byte[5]. */
  execution: {
    handler: number;
    handlerHex: string;
    family: string;
    worker: string | null;
  };
  /** Animation tracks for this action. */
  tracks: RomActionAnimationTrack[];
  /** Whether this action has FX (beam/ball/visual effect) separate from actor. */
  hasFxTrack: boolean;
  /** FX resource ID (from card record byte[7]). */
  fxResourceId: number | null;
  /** FX palette ID (from card record byte[8]). */
  fxPaletteId: number | null;
  /** Result branches (HIT/MISS/etc.), if known. */
  resultBranches: string[];
  /** Full evidence trail. */
  evidence: string[];
}

// ── Handler families ──

const HANDLER_FAMILIES: Record<number, { family: string; label: string }> = {
  0x00: { family: 'STAGE', label: 'Stage/Support' },
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

// ── Build bindings ──

const NONE = 0xff;

function hex(v: number | null): string {
  return v == null ? '—' : `$0x${v.toString(16).padStart(2, '0')}`;
}

function techniqueForResource(resId: number): string | null {
  for (const [name, tech] of Object.entries(ROM_TECHNIQUES)) {
    if (tech.animationResource === resId) return name;
  }
  return null;
}

function registryForResource(resId: number) {
  return getRomSequenceRegistry().find(e => e.resourceId === resId) ?? null;
}

function sequencesForResource(resId: number): { sequences: number[]; totalFrames: number; totalTicks: number } {
  const reg = registryForResource(resId);
  if (reg) {
    return {
      sequences: reg.sequences.map((_, i) => i),
      totalFrames: reg.totalFrameInstances,
      totalTicks: reg.totalTicks,
    };
  }
  // Fallback: check ROM_TECHNIQUES for frame data
  const tech = techniqueForResource(resId);
  if (tech && ROM_TECHNIQUES[tech]) {
    const t = ROM_TECHNIQUES[tech];
    return {
      sequences: t.sequences.map((_, i) => i),
      totalFrames: t.sequences.reduce((s, seq) => s + seq.frames.length, 0),
      totalTicks: t.sequences.reduce((s, seq) => s + seq.totalTicks, 0),
    };
  }
  return { sequences: [], totalFrames: 0, totalTicks: 0 };
}

function physicalStatusForResource(resId: number): RomTrackPhysicalStatus {
  const reg = registryForResource(resId);
  if (reg) return reg.status;
  if (techniqueForResource(resId)) return 'FRAME_STREAM_CLOSED';
  return 'NO_ANIMATION_RESOURCE';
}

function buildActorTrack(
  card: CardDef,
  rom: RomCardData,
): RomActionAnimationTrack {
  const resId = rom.actorAnim === NONE ? null : rom.actorAnim;
  const seqData = resId != null ? sequencesForResource(resId) : { sequences: [], totalFrames: 0, totalTicks: 0 };
  const physStatus = resId != null ? physicalStatusForResource(resId) : 'NO_ANIMATION_RESOURCE';

  // Determine selector kind
  let selectorKind: RomSequenceSelectorKind = 'FIXED';
  let selectorValue: number | null = null;
  let selectorEvidence: string;

  if (rom.exec === 0x02 || rom.exec === 0x03 || rom.exec === 0x04 || rom.exec === 0x05 || rom.exec === 0x06) {
    // BEAM family: sequence selected by actorVisualProfileKey
    selectorKind = 'ACTOR_PROFILE';
    // Check if we have selector rows for this card+resource
    if (resId != null) {
      const selectors = ROM_BEAM_SEQUENCE_SELECTORS.filter(
        s => s.animationResource === resId && s.cardId === card.id
      );
      if (selectors.length > 0) {
        selectorValue = null; // varies by profile
        selectorEvidence = `BEAM_ACTOR_SELECTOR_TABLE_V4: ${selectors.length} profile→seq mappings`;
      } else {
        selectorEvidence = 'ACTOR_PROFILE: selector rows not yet decoded for this resource';
      }
    } else {
      selectorEvidence = 'ACTOR_PROFILE: no actor AnimationResource';
    }
  } else if (rom.exec === 0x0a) {
    // STANDARD_DAMAGE: handler picks slot 6 (card-specific) and slot 7 (generic)
    selectorKind = 'HANDLER_SELECTED';
    selectorEvidence = 'STANDARD_DAMAGE: slot 6 = card-specific actor, slot 7 = Bank61:$5E20 generic';
  } else if (rom.exec === 0x0b) {
    // Physical Special (Tail, etc.)
    selectorKind = 'FIXED';
    if (seqData.sequences.length === 1) {
      selectorValue = 0;
      selectorEvidence = 'FIXED: single sequence';
    } else if (seqData.sequences.length > 1) {
      selectorEvidence = `FIXED: ${seqData.sequences.length} sequences, selection pending`;
    } else {
      selectorEvidence = 'FIXED: resource not yet decoded';
    }
  } else if (rom.exec === 0x07) {
    // Controlled projectile
    selectorKind = 'ACTOR_PROFILE';
    selectorEvidence = 'CONTROLLED: actor profile likely selects sequence';
  } else if (resId == null) {
    selectorKind = 'FIXED';
    selectorEvidence = 'No actor AnimationResource (stage/support card)';
  } else {
    selectorKind = 'DYNAMIC_PENDING';
    selectorEvidence = `Handler $${rom.exec.toString(16).padStart(2, '0')}: sequence selection not yet decoded`;
  }

  return {
    trackId: 'actor',
    label: 'Actor Animation',
    slot: rom.exec === 0x0a ? 6 : 0,
    resourceId: resId,
    selector: {
      kind: selectorKind,
      value: selectorValue,
      evidence: selectorEvidence,
    },
    sequences: seqData.sequences,
    totalFrames: seqData.totalFrames,
    totalTicks: seqData.totalTicks,
    physicalStatus: physStatus,
    evidence: [
      resId != null ? `resource ${hex(resId)}` : 'no actor resource',
      `handler $${rom.exec.toString(16).padStart(2, '0')}`,
      `status: ${physStatus}`,
    ],
  };
}

function buildFxTrack(rom: RomCardData): RomActionAnimationTrack | null {
  const fxRes = rom.fxGraphics === NONE ? null : rom.fxGraphics;
  const fxPal = rom.fxPalette === NONE ? null : rom.fxPalette;

  if (fxRes == null) return null;

  return {
    trackId: 'fx',
    label: 'Beam/FX Effect',
    slot: 1,
    resourceId: fxRes,
    selector: {
      kind: 'DYNAMIC_PENDING',
      value: null,
      evidence: `FX resource ${hex(fxRes)}: presentation sequence selected by handler at runtime`,
    },
    sequences: [],  // FX resources are not in ROM_TECHNIQUES yet
    totalFrames: 0,
    totalTicks: 0,
    physicalStatus: 'NO_ANIMATION_RESOURCE',
    evidence: [
      `fx ${hex(fxRes)}`,
      `palette ${hex(fxPal)}`,
      'FX sequence data not yet decoded (separate resource family)',
    ],
  };
}

function buildGenericTrack(card: CardDef, rom: RomCardData): RomActionAnimationTrack | null {
  // STANDARD_DAMAGE has a generic track from Bank61:$5E20
  if (rom.exec !== 0x0a) return null;

  return {
    trackId: 'generic',
    label: 'Generic Animation (Bank61)',
    slot: 7,
    resourceId: null,  // Bank61 generic sequences — not an AnimationResource from bank $62-64
    selector: {
      kind: 'HANDLER_SELECTED',
      value: null,
      evidence: 'STANDARD_DAMAGE slot 7: Bank61:$5E20 generic punch/kick sequences',
    },
    sequences: [],
    totalFrames: 0,
    totalTicks: 0,
    physicalStatus: 'NO_ANIMATION_RESOURCE',
    evidence: [
      'Bank61:$5E20 generic sequence pool',
      'Not an AnimationResource from bank $62-$64',
    ],
  };
}

function buildResultBranches(rom: RomCardData): string[] {
  const h = rom.exec;
  if (h === 0x0a) return ['HIT', 'MISS', 'HIGH_POWER_HIT', 'HIGH_POWER_MISS'];
  if (h === 0x02 || h === 0x03 || h === 0x04 || h === 0x05 || h === 0x06) return ['HIT', 'MISS'];
  if (h === 0x07) return ['HIT', 'MISS'];
  if (h === 0x0b) return ['HIT'];
  return [];
}

export function buildRomActionSequenceBindings(): RomActionSequenceBinding[] {
  const bindings: RomActionSequenceBinding[] = [];

  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom) continue;

    const handlerFamily = HANDLER_FAMILIES[rom.exec] ?? { family: 'UNKNOWN', label: 'Unknown' };
    const actorTrack = buildActorTrack(card, rom);
    const fxTrack = buildFxTrack(rom);
    const genericTrack = buildGenericTrack(card, rom);

    const tracks: RomActionAnimationTrack[] = [actorTrack];
    if (fxTrack) tracks.push(fxTrack);
    if (genericTrack) tracks.push(genericTrack);

    bindings.push({
      actionId: `card-${card.id}`,
      card: {
        id: card.id,
        name: card.name,
        category: card.type,
        type: card.type,
      },
      execution: {
        handler: rom.exec,
        handlerHex: `$${rom.exec.toString(16).padStart(2, '0')}`,
        family: handlerFamily.family,
        worker: null,  // Worker address available in romActionExecutionDescriptors if needed
      },
      tracks,
      hasFxTrack: rom.fxGraphics !== NONE,
      fxResourceId: rom.fxGraphics === NONE ? null : rom.fxGraphics,
      fxPaletteId: rom.fxPalette === NONE ? null : rom.fxPalette,
      resultBranches: buildResultBranches(rom),
      evidence: [
        `romCardData: handler $${rom.exec.toString(16).padStart(2, '0')}`,
        `actorAnim ${hex(rom.actorAnim)}`,
        `fxGraphics ${hex(rom.fxGraphics)}`,
        `fxPalette ${hex(rom.fxPalette)}`,
      ],
    });
  }

  return bindings;
}

// ── Lazy singleton ──

let _bindings: RomActionSequenceBinding[] | null = null;

export function getRomActionSequenceBindings(): RomActionSequenceBinding[] {
  if (!_bindings) {
    _bindings = buildRomActionSequenceBindings();
  }
  return _bindings;
}

export function getBindingForCard(cardId: number): RomActionSequenceBinding | undefined {
  return getRomActionSequenceBindings().find(b => b.card.id === cardId);
}

export function getBindingsForResource(resourceId: number): RomActionSequenceBinding[] {
  return getRomActionSequenceBindings().filter(b =>
    b.tracks.some(t => t.resourceId === resourceId)
  );
}

export function getBindingsForHandler(handler: number): RomActionSequenceBinding[] {
  return getRomActionSequenceBindings().filter(b => b.execution.handler === handler);
}

// ── Consumers ──

/** For a given resource, which cards use it and in which track. */
export interface ResourceConsumer {
  cardId: number;
  cardName: string;
  trackId: string;
  trackLabel: string;
  slot: number | null;
  selectorKind: RomSequenceSelectorKind;
}

export function getConsumersForResource(resourceId: number): ResourceConsumer[] {
  const consumers: ResourceConsumer[] = [];
  for (const binding of getRomActionSequenceBindings()) {
    for (const track of binding.tracks) {
      if (track.resourceId === resourceId) {
        consumers.push({
          cardId: binding.card.id,
          cardName: binding.card.name,
          trackId: track.trackId,
          trackLabel: track.label,
          slot: track.slot,
          selectorKind: track.selector.kind,
        });
      }
    }
  }
  return consumers;
}

// ── Summary ──

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
    FRAME_STREAM_CLOSED: 0,
    METASPRITE_LINK_PENDING: 0,
    NO_ANIMATION_RESOURCE: 0,
  };
  const bySelectorKind: Record<RomSequenceSelectorKind, number> = {
    FIXED: 0,
    ACTOR_PROFILE: 0,
    HANDLER_SELECTED: 0,
    RESULT_BRANCH: 0,
    DYNAMIC_PENDING: 0,
  };

  let withActorResource = 0;
  let withFxResource = 0;
  let withGenericTrack = 0;
  const fullyClosed: string[] = [];
  const frameStreamOnly: string[] = [];

  for (const b of bindings) {
    byHandlerFamily[b.execution.family] = (byHandlerFamily[b.execution.family] ?? 0) + 1;
    for (const t of b.tracks) {
      byPhysicalStatus[t.physicalStatus] = (byPhysicalStatus[t.physicalStatus] ?? 0) + 1;
      bySelectorKind[t.selector.kind] = (bySelectorKind[t.selector.kind] ?? 0) + 1;
      if (t.trackId === 'actor' && t.resourceId != null) withActorResource++;
      if (t.trackId === 'fx') withFxResource++;
      if (t.trackId === 'generic') withGenericTrack++;
      if (t.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED' && t.trackId === 'actor' && t.resourceId != null) {
        const techName = techniqueForResource(t.resourceId);
        if (techName && !fullyClosed.includes(techName)) fullyClosed.push(techName);
      }
      if (t.physicalStatus === 'FRAME_STREAM_CLOSED' && t.trackId === 'actor' && t.resourceId != null) {
        const techName = techniqueForResource(t.resourceId);
        if (techName && !frameStreamOnly.includes(techName)) frameStreamOnly.push(techName);
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
    fullyClosedResources: fullyClosed,
    frameStreamOnlyResources: frameStreamOnly,
  };
}
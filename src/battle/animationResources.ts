// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ANIMATION RESOURCE CATALOG
// ═══════════════════════════════════════════════════════════════════════
// Physical catalog authority: RomSequenceRegistry, which now covers all
// 66 catalog slots ($00-$41) directly from ROM bytes.
//
// IMPORTANT: physical resource closure != runtime semantic closure.
// Handler FSM, actor/target binding and result branches remain in their
// respective descriptors/traces. This file only describes physical data.
// ═══════════════════════════════════════════════════════════════════════

import { type CardDef, CARDS } from '../data/cards';
import { romCardData } from '../data/romCardData';
import { getRomSequenceRegistry, type RomSequenceEntry } from '../data/romSequenceRegistry';

export type AnimationResourceStatus = 'DECODED' | 'EMPTY' | 'PARTIAL' | 'SPECIAL' | 'UNKNOWN';
export type AnimationResourceFormat = 'KNOWN_FORMAT' | 'EMPTY_SLOT' | 'SPECIAL' | 'UNKNOWN';
export type AnimationResourceEvidence =
  | 'ROM_CATALOG_VERIFIED'
  | 'ROM_EMPTY_SLOT_VERIFIED'
  | 'ROM_SEQUENCE_VERIFIED'
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'PENDING_ROM_TRACE';

export type AnimationResourceCompletionCause =
  | 'NONE'
  | 'EMPTY_RESOURCE_SLOT'
  | 'POINTER_TABLE_UNRESOLVED'
  | 'SEQUENCE_BOUNDARY_UNRESOLVED'
  | 'SEQUENCE_COUNT_UNRESOLVED'
  | 'FRAME_STREAM_PARTIAL'
  | 'METASPRITE_LINK_PENDING'
  | 'MULTI_SEQUENCE_AMBIGUOUS'
  | 'HANDLER_SELECTED_SEQUENCE'
  | 'STATIC_LIMIT_REACHED'
  | 'UNREFERENCED_RESOURCE';

export type AnimationResourceCompletionDisposition =
  | 'STATICALLY_CLOSED'
  | 'STATICALLY_CLOSABLE'
  | 'STATIC_LIMIT_REACHED'
  | 'NEEDS_DYNAMIC_TRACE';

export interface AnimationResourceCardRef {
  id: number;
  name: string;
  handler: number;
  handlerHex: string;
  type: string;
}

export interface AnimationResourceDecodedFrame {
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  raw: readonly [number, number, number, number];
}

export interface AnimationResourceDecodedSequence {
  addr: number;
  totalTicks: number;
  frames: AnimationResourceDecodedFrame[];
}

export interface AnimationResourceCompletion {
  cause: AnimationResourceCompletionCause;
  disposition: AnimationResourceCompletionDisposition;
  detail: string;
  dynamicDependencies: string[];
}

export interface AnimationResourceCatalogEntry {
  resourceId: number;
  resourceHex: string;
  bank: number;
  bankHex: string;
  localId: number;
  status: AnimationResourceStatus;
  format: AnimationResourceFormat;
  evidence: AnimationResourceEvidence;
  cards: AnimationResourceCardRef[];
  handlers: number[];
  sourceTechnique: string | null;
  sequenceCount: number;
  sequenceFrameInstances: number;
  physicalFrameCount: number;
  totalTicks: number;
  sequences: AnimationResourceDecodedSequence[];
  completion: AnimationResourceCompletion;
  notes: string[];
}

const BANK_LAYOUT = [
  { bank: 0x62, first: 0x00, count: 25 },
  { bank: 0x63, first: 0x19, count: 25 },
  { bank: 0x64, first: 0x32, count: 16 },
] as const;

export function animationResourceBank(resourceId: number): { bank: number; localId: number } | null {
  for (const layout of BANK_LAYOUT) {
    if (resourceId >= layout.first && resourceId < layout.first + layout.count) {
      return { bank: layout.bank, localId: resourceId - layout.first };
    }
  }
  return null;
}

function hex(value: number): string {
  return `0x${value.toString(16).padStart(2, '0')}`;
}

function cardsForResource(resourceId: number): AnimationResourceCardRef[] {
  const refs: AnimationResourceCardRef[] = [];
  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom || rom.actorAnim !== resourceId) continue;
    refs.push({
      id: card.id,
      name: card.name,
      handler: rom.exec,
      handlerHex: hex(rom.exec),
      type: card.type,
    });
  }
  return refs;
}

function decodedSequences(resource: RomSequenceEntry): AnimationResourceDecodedSequence[] {
  return resource.sequences.map((sequence) => ({
    addr: sequence.address,
    totalTicks: sequence.totalTicks,
    frames: sequence.frames.map((frame) => ({
      visualFrameId: frame.visualFrameId,
      durationTicks: frame.durationTicks,
      offsetX: frame.offsetX,
      offsetY: frame.offsetY,
      raw: frame.raw,
    })),
  }));
}

function completionFor(resource: RomSequenceEntry, cards: AnimationResourceCardRef[]): AnimationResourceCompletion {
  if (resource.status === 'EMPTY_RESOURCE_SLOT') {
    return {
      cause: 'EMPTY_RESOURCE_SLOT',
      disposition: 'STATICALLY_CLOSED',
      detail: cards.length > 0
        ? `ROM catalog length is zero for a referenced slot (${cards.map((card) => card.name).join(', ')}). This is a handler/preload token, not an undecoded actor frame stream.`
        : 'ROM catalog length is zero. The empty slot is physically verified and contains no actor frame stream.',
      dynamicDependencies: [],
    };
  }

  return {
    cause: 'NONE',
    disposition: 'STATICALLY_CLOSED',
    detail: 'Sequence boundaries, every frame record, signed offsets, metasprite linkage and graphics-block counts are closed from the physical ROM resource catalog.',
    dynamicDependencies: [],
  };
}

function catalogEntry(resource: RomSequenceEntry): AnimationResourceCatalogEntry {
  const cards = cardsForResource(resource.resourceId);
  const handlers = [...new Set(cards.map((card) => card.handler))].sort((a, b) => a - b);
  const sequences = decodedSequences(resource);
  const empty = resource.status === 'EMPTY_RESOURCE_SLOT';
  return {
    resourceId: resource.resourceId,
    resourceHex: hex(resource.resourceId),
    bank: resource.bank,
    bankHex: hex(resource.bank),
    localId: resource.localId,
    status: empty ? 'EMPTY' : 'DECODED',
    format: empty ? 'EMPTY_SLOT' : 'KNOWN_FORMAT',
    evidence: empty ? 'ROM_EMPTY_SLOT_VERIFIED' : 'ROM_CATALOG_VERIFIED',
    cards,
    handlers,
    sourceTechnique: cards[0]?.name ?? null,
    sequenceCount: sequences.length,
    sequenceFrameInstances: resource.totalFrameInstances,
    physicalFrameCount: resource.physicalFrameCount,
    totalTicks: resource.totalTicks,
    sequences,
    completion: completionFor(resource, cards),
    notes: empty
      ? ['Physical ROM catalog slot has length=0; do not fabricate actor frames for this resource id.']
      : ['Full physical AnimationResource extracted directly from ROM catalog; semantic handler selection is tracked separately.'],
  };
}

export function listAnimationResources(): AnimationResourceCatalogEntry[] {
  return getRomSequenceRegistry().map(catalogEntry).sort((a, b) => a.resourceId - b.resourceId);
}

export const ANIMATION_RESOURCE_CATALOG: AnimationResourceCatalogEntry[] = listAnimationResources();

export function animationResourceSummary() {
  const entries = ANIMATION_RESOURCE_CATALOG;
  const referenced = entries.filter((entry) => entry.cards.length > 0);
  const byStatus: Record<AnimationResourceStatus, number> = {
    DECODED: 0,
    EMPTY: 0,
    PARTIAL: 0,
    SPECIAL: 0,
    UNKNOWN: 0,
  };
  const byCompletionCause = {} as Record<AnimationResourceCompletionCause, number>;
  const byCompletionDisposition = {} as Record<AnimationResourceCompletionDisposition, number>;

  for (const entry of entries) {
    byStatus[entry.status]++;
    byCompletionCause[entry.completion.cause] = (byCompletionCause[entry.completion.cause] ?? 0) + 1;
    byCompletionDisposition[entry.completion.disposition] = (byCompletionDisposition[entry.completion.disposition] ?? 0) + 1;
  }

  return {
    resources: entries.length,
    referenced: referenced.length,
    decoded: byStatus.DECODED,
    empty: byStatus.EMPTY,
    partial: byStatus.PARTIAL,
    special: byStatus.SPECIAL,
    unknown: byStatus.UNKNOWN,
    byStatus,
    byCompletionCause,
    byCompletionDisposition,
    staticallyClosed: byCompletionDisposition.STATICALLY_CLOSED ?? 0,
    staticallyClosable: byCompletionDisposition.STATICALLY_CLOSABLE ?? 0,
    staticLimitReached: byCompletionDisposition.STATIC_LIMIT_REACHED ?? 0,
    needsDynamicTrace: byCompletionDisposition.NEEDS_DYNAMIC_TRACE ?? 0,
    cardsCoveredByDecodedResources: referenced
      .filter((entry) => entry.status === 'DECODED')
      .reduce((sum, entry) => sum + entry.cards.length, 0),
    cardsReferencingEmptySlots: referenced
      .filter((entry) => entry.status === 'EMPTY')
      .reduce((sum, entry) => sum + entry.cards.length, 0),
    sequenceFrameInstances: entries.reduce((sum, entry) => sum + entry.sequenceFrameInstances, 0),
    physicalFrameDefinitions: entries.reduce((sum, entry) => sum + entry.physicalFrameCount, 0),
  };
}

export function animationResourceById(resourceId: number): AnimationResourceCatalogEntry | undefined {
  return ANIMATION_RESOURCE_CATALOG.find((entry) => entry.resourceId === resourceId);
}

export function cardsUsingAnimationResource(resourceId: number): Pick<CardDef, 'id' | 'name' | 'type'>[] {
  return CARDS.filter((card) => romCardData(card.name)?.actorAnim === resourceId)
    .map(({ id, name, type }) => ({ id, name, type }));
}

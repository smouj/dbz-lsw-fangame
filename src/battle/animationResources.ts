// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ANIMATION RESOURCE DECODING
// ═══════════════════════════════════════════════════════════════════════
// Inventario por AnimationResource, no por carta.
// No elige secuencias por nombre de pose/duración/parecido visual: la ROM
// usa selector físico (Bank00:$3966 + Bank30:$6900) y escribe C3C7/C2D0/C2D1.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS } from '../data/cards';
import { romCardData } from '../data/romCardData';
import { ROM_TECHNIQUES, type RomAnimationSequence, type RomTechniqueProfile } from '../data/romAnimationData';
import { specialHandlerForCard } from './engine/rom/romDescriptors';

export type AnimationResourceStatus = 'DECODED' | 'PARTIAL' | 'SPECIAL' | 'UNKNOWN';
export type AnimationResourceFormat = 'KNOWN_FORMAT' | 'SPECIAL' | 'UNKNOWN';
export type AnimationResourceEvidence =
  | 'ROM_SEQUENCE_VERIFIED'
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'PENDING_ROM_TRACE';
export type AnimationResourceCompletionCause =
  | 'NONE'
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
  physicalFrameCount: number;
  totalTicks: number;
  sequences: AnimationResourceDecodedSequence[];
  completion: AnimationResourceCompletion;
  notes: string[];
}

export const ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE = {
  evidence: 'ROM_STATIC_VERIFIED',
  resourceCount: 66,
  uniqueSelectorTables: 43,
  multiSequenceResources: [
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x07, 0x09,
    0x0c, 0x0d, 0x0f, 0x10, 0x12, 0x15, 0x16, 0x18,
    0x21, 0x23, 0x24, 0x26, 0x27, 0x28,
  ],
  selectorRoutine: 'Bank00:$3966',
  selectorTable: 'Bank30:$6900',
  rowFormat: ['actorVisualProfileKey', 'sequenceSelector', 'param0', 'param1'],
  writes: {
    sequenceSelector: 0xc3c7,
    param0: 0xc2d0,
    param1: 0xc2d1,
  },
  rule: 'Select sequences from ROM selector rows; never by semantic pose name, duration, or visual similarity.',
} as const;

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

function toRawByte(value: number): number {
  return value < 0 ? value + 256 : value;
}

function rawFrameRecord(frame: RomAnimationSequence['frames'][number]): readonly [number, number, number, number] {
  return frame.raw ?? [frame.meta, frame.ticks, toRawByte(frame.dy), toRawByte(frame.dx)];
}

function decodedSequence(seq: RomAnimationSequence): AnimationResourceDecodedSequence {
  return {
    addr: seq.addr,
    totalTicks: seq.totalTicks,
    frames: seq.frames.map(frame => ({
      visualFrameId: frame.meta,
      durationTicks: frame.ticks,
      offsetX: frame.dx,
      offsetY: frame.dy,
      raw: rawFrameRecord(frame),
    })),
  };
}

const TECHNIQUE_BY_RESOURCE = new Map<number, [string, RomTechniqueProfile]>();
for (const [name, technique] of Object.entries(ROM_TECHNIQUES)) {
  if (!TECHNIQUE_BY_RESOURCE.has(technique.animationResource)) {
    TECHNIQUE_BY_RESOURCE.set(technique.animationResource, [name, technique]);
  }
}

function cardRefsByResource(): Map<number, AnimationResourceCardRef[]> {
  const byResource = new Map<number, AnimationResourceCardRef[]>();
  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom || rom.actorAnim === 0xff) continue;
    const refs = byResource.get(rom.actorAnim) ?? [];
    refs.push({
      id: card.id,
      name: card.name,
      handler: rom.exec,
      handlerHex: hex(rom.exec),
      type: card.type,
    });
    byResource.set(rom.actorAnim, refs);
  }
  return byResource;
}

function isSpecialResource(cards: AnimationResourceCardRef[]): boolean {
  return cards.some(ref => {
    const card = CARDS.find(c => c.id === ref.id);
    if (!card) return false;
    return !!specialHandlerForCard(card) || [0x08, 0x0b, 0x0c, 0x0d, 0x0e].includes(ref.handler);
  });
}

function staticCompletion(
  cards: AnimationResourceCardRef[],
  decoded: [string, RomTechniqueProfile] | undefined,
  status: AnimationResourceStatus,
): AnimationResourceCompletion {
  if (decoded) {
    return {
      cause: 'NONE',
      disposition: 'STATICALLY_CLOSED',
      detail: 'Frame stream, sequence boundaries, timings, offsets and raw bytes are decoded from the static ROM extraction.',
      dynamicDependencies: [],
    };
  }

  if (cards.length === 0) {
    return {
      cause: 'UNREFERENCED_RESOURCE',
      disposition: 'STATIC_LIMIT_REACHED',
      detail: 'Bank slot is inventoried but no card in the 125-card ROM table references it; there is no card consumer to close against.',
      dynamicDependencies: [],
    };
  }

  const handlers = [...new Set(cards.map(card => card.handler))].sort((a, b) => a - b);
  const types = new Set(cards.map(card => card.type));

  if (status === 'SPECIAL') {
    const multiActor = handlers.some(handler => handler === 0x0b || handler === 0x0d || handler === 0x0e);
    return {
      cause: 'HANDLER_SELECTED_SEQUENCE',
      disposition: 'NEEDS_DYNAMIC_TRACE',
      detail: multiActor
        ? 'Special/multi-actor handler owns sequence and slot selection at runtime; static card fields preserve the resource id but cannot close actor binding alone.'
        : 'Special handler owns the sequence branch at runtime; static card fields preserve the resource id but do not prove the selected sequence.',
      dynamicDependencies: multiActor
        ? ['handler FSM', 'slot binding', 'runtime actor selection']
        : ['handler FSM', 'runtime branch selection'],
    };
  }

  if (handlers.length > 1) {
    return {
      cause: 'MULTI_SEQUENCE_AMBIGUOUS',
      disposition: 'STATICALLY_CLOSABLE',
      detail: 'Multiple execution handlers reference this resource; the next static pass must isolate the handler-specific pointer/sequence selection before decoding frames.',
      dynamicDependencies: [],
    };
  }

  const handler = handlers[0] ?? 0x00;
  if (handler === 0x0a) {
    return {
      cause: 'FRAME_STREAM_PARTIAL',
      disposition: 'STATICALLY_CLOSABLE',
      detail: 'Standard damage handler resources are referenced by the card table, but their frame stream has not been extracted into the static ROM sequence catalog yet.',
      dynamicDependencies: [],
    };
  }

  if (handler === 0x02) {
    return {
      cause: 'POINTER_TABLE_UNRESOLVED',
      disposition: 'STATICALLY_CLOSABLE',
      detail: 'Base beam/support handler uses the known resource id, but the resource pointer table entry has not been resolved to complete sequences yet.',
      dynamicDependencies: [],
    };
  }

  if ([0x03, 0x04, 0x05, 0x06, 0x07].includes(handler)) {
    return {
      cause: 'HANDLER_SELECTED_SEQUENCE',
      disposition: 'STATICALLY_CLOSABLE',
      detail: 'Projectile/beam variant handler selects a resource sequence path; the handler-specific static selector must be mapped before frame extraction can be called complete.',
      dynamicDependencies: [],
    };
  }

  if (handler === 0x00 && (types.has('support') || types.has('defense'))) {
    return {
      cause: 'SEQUENCE_COUNT_UNRESOLVED',
      disposition: 'STATICALLY_CLOSABLE',
      detail: 'Support/defense card references an actor resource without a standard attack handler; the static pass must resolve sequence count/boundaries from the resource table.',
      dynamicDependencies: [],
    };
  }

  if (handler >= 0x08) {
    return {
      cause: 'HANDLER_SELECTED_SEQUENCE',
      disposition: 'NEEDS_DYNAMIC_TRACE',
      detail: 'High handler family can branch on runtime interaction/result state; static fields are preserved but selected actor sequence needs trace evidence before closure.',
      dynamicDependencies: ['runtime branch selection'],
    };
  }

  return {
    cause: 'SEQUENCE_BOUNDARY_UNRESOLVED',
    disposition: 'STATICALLY_CLOSABLE',
    detail: 'Resource is referenced and in a known bank layout, but sequence boundaries are not yet resolved in the static extraction.',
    dynamicDependencies: [],
  };
}

function resourceStatus(cards: AnimationResourceCardRef[], decoded: [string, RomTechniqueProfile] | undefined): {
  status: AnimationResourceStatus;
  format: AnimationResourceFormat;
  evidence: AnimationResourceEvidence;
  completion: AnimationResourceCompletion;
  notes: string[];
} {
  const notes: string[] = [];
  if (decoded) {
    const completion = staticCompletion(cards, decoded, 'DECODED');
    notes.push('Frame records decoded from rom-anim-sequences.json.');
    return { status: 'DECODED', format: 'KNOWN_FORMAT', evidence: 'ROM_SEQUENCE_VERIFIED', completion, notes };
  }
  if (cards.length === 0) {
    const completion = staticCompletion(cards, decoded, 'UNKNOWN');
    notes.push('Resource id exists in bank layout but is not referenced by any of the 125 cards.');
    return { status: 'UNKNOWN', format: 'UNKNOWN', evidence: 'PENDING_ROM_TRACE', completion, notes };
  }
  if (isSpecialResource(cards)) {
    const completion = staticCompletion(cards, decoded, 'SPECIAL');
    notes.push('Special/multi-actor handler: keep static resource id, defer FSM/slot closure to dynamic traces.');
    return { status: 'SPECIAL', format: 'SPECIAL', evidence: 'ROM_HANDLER_VERIFIED', completion, notes };
  }
  const completion = staticCompletion(cards, decoded, 'PARTIAL');
  notes.push('Resource is referenced by ROM card data but its physical sequence section is not decoded yet.');
  return { status: 'PARTIAL', format: 'KNOWN_FORMAT', evidence: 'ROM_STATIC_VERIFIED', completion, notes };
}

export function listAnimationResources(): AnimationResourceCatalogEntry[] {
  const refs = cardRefsByResource();
  const entries: AnimationResourceCatalogEntry[] = [];
  for (const layout of BANK_LAYOUT) {
    for (let local = 0; local < layout.count; local++) {
      const resourceId = layout.first + local;
      const cards = refs.get(resourceId) ?? [];
      const decoded = TECHNIQUE_BY_RESOURCE.get(resourceId);
      const state = resourceStatus(cards, decoded);
      const sequences = decoded?.[1].sequences.map(decodedSequence) ?? [];
      entries.push({
        resourceId,
        resourceHex: hex(resourceId),
        bank: layout.bank,
        bankHex: hex(layout.bank),
        localId: local,
        status: state.status,
        format: state.format,
        evidence: state.evidence,
        cards,
        handlers: [...new Set(cards.map(card => card.handler))].sort((a, b) => a - b),
        sourceTechnique: decoded?.[0] ?? null,
        sequenceCount: sequences.length,
        physicalFrameCount: sequences.reduce((sum, seq) => sum + seq.frames.length, 0),
        totalTicks: sequences.reduce((sum, seq) => sum + seq.totalTicks, 0),
        sequences,
        completion: state.completion,
        notes: state.notes,
      });
    }
  }
  return entries;
}

export const ANIMATION_RESOURCE_CATALOG: AnimationResourceCatalogEntry[] = listAnimationResources();

export function animationResourceSummary() {
  const entries = ANIMATION_RESOURCE_CATALOG;
  const referenced = entries.filter(entry => entry.cards.length > 0);
  const byStatus: Record<AnimationResourceStatus, number> = {
    DECODED: 0,
    PARTIAL: 0,
    SPECIAL: 0,
    UNKNOWN: 0,
  };
  const byCompletionCause = {} as Record<AnimationResourceCompletionCause, number>;
  const byCompletionDisposition = {} as Record<AnimationResourceCompletionDisposition, number>;
  for (const entry of entries) byStatus[entry.status]++;
  for (const entry of entries) {
    byCompletionCause[entry.completion.cause] = (byCompletionCause[entry.completion.cause] ?? 0) + 1;
    byCompletionDisposition[entry.completion.disposition] = (byCompletionDisposition[entry.completion.disposition] ?? 0) + 1;
  }
  return {
    resources: entries.length,
    referenced: referenced.length,
    decoded: byStatus.DECODED,
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
      .filter(entry => entry.status === 'DECODED')
      .reduce((sum, entry) => sum + entry.cards.length, 0),
  };
}

export function animationResourceById(resourceId: number): AnimationResourceCatalogEntry | undefined {
  return ANIMATION_RESOURCE_CATALOG.find(entry => entry.resourceId === resourceId);
}

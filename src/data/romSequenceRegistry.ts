// ═══════════════════════════════════════════════════════════════════════
// romSequenceRegistry.ts — SSOT for physical AnimationResource structure.
//
// Authority chain:
//   ROM catalog slot -> resource header -> sequence table -> frame record
//   -> metasprite table -> graphics table.
//
// All 66 catalog slots ($00-$41) are represented. 62 contain complete
// physical resources; four are byte-exact empty slots ($28/$29/$2A/$40).
// Semantic actor/target binding still belongs to handlers/traces, not here.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS } from './cards';
import { romCardData } from './romCardData';
import {
  ROM_FULL_ANIMATION_EMPTY_SLOTS,
  ROM_FULL_ANIMATION_RESOURCES,
  type RomFullAnimationResourceRecord,
} from './generated/romFullAnimationResources.generated';

export type PhysicalLinkageStatus =
  | 'PHYSICAL_RESOURCE_FULLY_CLOSED'
  | 'EMPTY_RESOURCE_SLOT'
  // Kept for compatibility with old snapshots; the full catalog no longer emits them.
  | 'FRAME_STREAM_CLOSED'
  | 'METASPRITE_LINK_PENDING';

export type RomEvidence =
  | 'ROM_BYTE_EXACT'
  | 'ROM_CATALOG_ENTRY_VERIFIED'
  | 'ROM_EMPTY_SLOT_VERIFIED'
  | 'ROM_BASE_CROSS_VALIDATED'
  | 'ROM_SEQUENCE_ANCHORED';

export interface PhysicalFrame {
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetY: number;
  offsetX: number;
  raw: readonly [number, number, number, number];
  metaspritePieceCount: number;
  graphicsBlockCount: number;
  linkageResolved: boolean;
  provenance: PhysicalLinkageStatus;
}

export interface RomSequence {
  address: number;
  totalTicks: number;
  frames: PhysicalFrame[];
}

export interface RomActionConsumer {
  cardId: number;
  cardName: string;
  handler: number;
  handlerHex: string;
  slot: number;
  evidence: string;
}

export interface RomSequenceEntry {
  technique: string;
  resourceId: number;
  resourceHex: string;
  bank: number;
  localId: number;
  resourceBase: number;
  resourceLength: number;
  physicalFrameCount: number;
  handler: number;
  status: PhysicalLinkageStatus;
  evidence: RomEvidence;
  sequences: RomSequence[];
  vfidRange: number[];
  totalFrameInstances: number;
  totalTicks: number;
  consumers: RomActionConsumer[];
}

const BANK_LAYOUT = [
  { bank: 0x62, first: 0x00, count: 25 },
  { bank: 0x63, first: 0x19, count: 25 },
  { bank: 0x64, first: 0x32, count: 16 },
] as const;

function hex(value: number): string {
  return `$${value.toString(16).padStart(2, '0')}`;
}

function layoutForResource(resourceId: number): { bank: number; localId: number } {
  for (const layout of BANK_LAYOUT) {
    if (resourceId >= layout.first && resourceId < layout.first + layout.count) {
      return { bank: layout.bank, localId: resourceId - layout.first };
    }
  }
  throw new Error(`AnimationResource out of catalog range: ${resourceId}`);
}

function consumersForResource(resourceId: number): RomActionConsumer[] {
  const consumers: RomActionConsumer[] = [];
  for (const card of CARDS) {
    const rom = romCardData(card.name);
    if (!rom || rom.actorAnim !== resourceId) continue;
    consumers.push({
      cardId: card.id,
      cardName: card.name,
      handler: rom.exec,
      handlerHex: hex(rom.exec),
      slot: rom.exec === 0x0a ? 6 : 0,
      evidence: `ROM card byte[6] = ${hex(resourceId)}`,
    });
  }
  return consumers;
}

function identityForResource(resourceId: number, consumers: RomActionConsumer[]): { technique: string; handler: number } {
  const handlers = [...new Set(consumers.map((consumer) => consumer.handler))];
  return {
    technique: consumers[0]?.cardName ?? `AnimationResource ${hex(resourceId)}`,
    handler: handlers.length === 1 ? handlers[0] : -1,
  };
}

function entryFromGenerated(resource: RomFullAnimationResourceRecord): RomSequenceEntry {
  const consumers = consumersForResource(resource.resourceId);
  const identity = identityForResource(resource.resourceId, consumers);
  const vfids = new Set<number>();
  let totalFrameInstances = 0;

  const sequences: RomSequence[] = resource.sequences.map((sequence) => ({
    address: sequence.address,
    totalTicks: sequence.totalTicks,
    frames: sequence.frames.map((frame, frameIndex) => {
      totalFrameInstances++;
      vfids.add(frame.physicalFrameIndex);
      const pieceCount = resource.physicalPartCounts[frame.physicalFrameIndex] ?? 0;
      return {
        frameIndex,
        visualFrameId: frame.physicalFrameIndex,
        durationTicks: frame.durationTicks,
        offsetY: frame.offsetY,
        offsetX: frame.offsetX,
        raw: frame.raw,
        metaspritePieceCount: pieceCount,
        graphicsBlockCount: pieceCount,
        linkageResolved: pieceCount > 0,
        provenance: 'PHYSICAL_RESOURCE_FULLY_CLOSED',
      };
    }),
  }));

  return {
    technique: identity.technique,
    resourceId: resource.resourceId,
    resourceHex: hex(resource.resourceId),
    bank: resource.bank,
    localId: resource.localId,
    resourceBase: resource.resourceBaseLocal,
    resourceLength: resource.resourceLength,
    physicalFrameCount: resource.physicalFrameCount,
    handler: identity.handler,
    status: 'PHYSICAL_RESOURCE_FULLY_CLOSED',
    evidence: 'ROM_CATALOG_ENTRY_VERIFIED',
    sequences,
    vfidRange: [...vfids].sort((a, b) => a - b),
    totalFrameInstances,
    totalTicks: sequences.reduce((sum, sequence) => sum + sequence.totalTicks, 0),
    consumers,
  };
}

function emptyEntry(resourceId: number, bank: number, localId: number, resourceBase: number): RomSequenceEntry {
  const consumers = consumersForResource(resourceId);
  const identity = identityForResource(resourceId, consumers);
  return {
    technique: identity.technique,
    resourceId,
    resourceHex: hex(resourceId),
    bank,
    localId,
    resourceBase,
    resourceLength: 0,
    physicalFrameCount: 0,
    handler: identity.handler,
    status: 'EMPTY_RESOURCE_SLOT',
    evidence: 'ROM_EMPTY_SLOT_VERIFIED',
    sequences: [],
    vfidRange: [],
    totalFrameInstances: 0,
    totalTicks: 0,
    consumers,
  };
}

function buildRegistryFromGenerated(): RomSequenceEntry[] {
  const entries: RomSequenceEntry[] = ROM_FULL_ANIMATION_RESOURCES.map(entryFromGenerated);
  for (const slot of ROM_FULL_ANIMATION_EMPTY_SLOTS) {
    entries.push(emptyEntry(slot.resourceId, slot.bank, slot.localId, slot.resourceBaseLocal));
  }
  return entries.sort((a, b) => a.resourceId - b.resourceId);
}

function readU16(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readS8(value: number): number {
  return value >= 0x80 ? value - 0x100 : value;
}

function bankOffset(bank: number): number {
  return bank * 0x4000;
}

function selfPointer(rom: Buffer, bank: number, entryLocal: number): number {
  return entryLocal + readU16(rom, bankOffset(bank) + entryLocal);
}

/**
 * Parse all 66 catalog slots directly from ROM bytes. This is deliberately
 * independent from the generated browser snapshot and is used by verifiers.
 */
export function buildRomSequenceRegistry(rom: Buffer): RomSequenceEntry[] {
  const registry: RomSequenceEntry[] = [];

  for (let resourceId = 0; resourceId < 66; resourceId++) {
    const { bank, localId } = layoutForResource(resourceId);
    const baseOffset = bankOffset(bank);
    const catalogEntry = baseOffset + 8 + localId * 4;
    const resourceBase = readU16(rom, catalogEntry) * 4;
    const resourceLength = readU16(rom, catalogEntry + 2) * 4;

    if (resourceLength === 0) {
      registry.push(emptyEntry(resourceId, bank, localId, resourceBase));
      continue;
    }

    const sequenceTable = resourceBase + readU16(rom, baseOffset + resourceBase);
    const sequenceCount = rom[baseOffset + sequenceTable];

    const metaspriteField = resourceBase + 2;
    const metaspriteTable = metaspriteField + readU16(rom, baseOffset + metaspriteField);
    const graphicsField = resourceBase + 4;
    const graphicsTable = graphicsField + readU16(rom, baseOffset + graphicsField);
    const physicalFrameCount = readU16(rom, baseOffset + metaspriteTable) >> 1;
    const graphicsFrameCount = readU16(rom, baseOffset + graphicsTable) >> 1;
    if (physicalFrameCount !== graphicsFrameCount) {
      throw new Error(`AnimationResource ${hex(resourceId)} physical table mismatch ${physicalFrameCount} != ${graphicsFrameCount}`);
    }

    const partCounts: number[] = [];
    for (let physicalFrameIndex = 0; physicalFrameIndex < physicalFrameCount; physicalFrameIndex++) {
      const metaEntry = metaspriteTable + physicalFrameIndex * 2;
      const metaRecord = selfPointer(rom, bank, metaEntry);
      const graphicsEntry = graphicsTable + physicalFrameIndex * 2;
      const graphicsRecord = selfPointer(rom, bank, graphicsEntry);
      const partCount = rom[baseOffset + metaRecord];
      const graphicsCount = rom[baseOffset + graphicsRecord];
      if (partCount !== graphicsCount) {
        throw new Error(`AnimationResource ${hex(resourceId)} frame ${physicalFrameIndex}: metasprite/graphics ${partCount} != ${graphicsCount}`);
      }
      partCounts.push(partCount);
    }

    const consumers = consumersForResource(resourceId);
    const identity = identityForResource(resourceId, consumers);
    const sequences: RomSequence[] = [];
    const vfids = new Set<number>();
    let totalFrameInstances = 0;

    for (let selector = 0; selector < sequenceCount; selector++) {
      const pointerEntry = sequenceTable + 1 + selector * 2;
      const sequenceAddress = selfPointer(rom, bank, pointerEntry);
      const frameCount = rom[baseOffset + sequenceAddress];
      const frames: PhysicalFrame[] = [];
      let totalTicks = 0;

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const address = baseOffset + sequenceAddress + 1 + frameIndex * 4;
        const physicalFrameIndex = rom[address];
        const durationTicks = rom[address + 1];
        const rawY = rom[address + 2];
        const rawX = rom[address + 3];
        if (physicalFrameIndex >= physicalFrameCount) {
          throw new Error(`AnimationResource ${hex(resourceId)} seq ${selector} references physical frame ${physicalFrameIndex}/${physicalFrameCount}`);
        }
        const pieceCount = partCounts[physicalFrameIndex] ?? 0;
        totalFrameInstances++;
        totalTicks += durationTicks;
        vfids.add(physicalFrameIndex);
        frames.push({
          frameIndex,
          visualFrameId: physicalFrameIndex,
          durationTicks,
          offsetY: readS8(rawY),
          offsetX: readS8(rawX),
          raw: [physicalFrameIndex, durationTicks, rawY, rawX],
          metaspritePieceCount: pieceCount,
          graphicsBlockCount: pieceCount,
          linkageResolved: pieceCount > 0,
          provenance: 'PHYSICAL_RESOURCE_FULLY_CLOSED',
        });
      }

      sequences.push({ address: sequenceAddress, totalTicks, frames });
    }

    registry.push({
      technique: identity.technique,
      resourceId,
      resourceHex: hex(resourceId),
      bank,
      localId,
      resourceBase,
      resourceLength,
      physicalFrameCount,
      handler: identity.handler,
      status: 'PHYSICAL_RESOURCE_FULLY_CLOSED',
      evidence: 'ROM_BYTE_EXACT',
      sequences,
      vfidRange: [...vfids].sort((a, b) => a - b),
      totalFrameInstances,
      totalTicks: sequences.reduce((sum, sequence) => sum + sequence.totalTicks, 0),
      consumers,
    });
  }

  return registry;
}

let registryOverride: RomSequenceEntry[] | null = null;
const GENERATED_REGISTRY = buildRegistryFromGenerated();

export function getRomSequenceRegistry(): RomSequenceEntry[] {
  return registryOverride ?? GENERATED_REGISTRY;
}

export function setRomSequenceRegistryOverride(registry: RomSequenceEntry[]): void {
  registryOverride = registry;
}

export function clearRomSequenceRegistryOverride(): void {
  registryOverride = null;
}

export function getRomSequenceByName(technique: string): RomSequenceEntry | undefined {
  return getRomSequenceRegistry().find((entry) => entry.technique === technique);
}

export function getRomSequenceByResourceId(resourceId: number): RomSequenceEntry | undefined {
  return getRomSequenceRegistry().find((entry) => entry.resourceId === resourceId);
}

export function romSequenceRegistrySummary() {
  const registry = getRomSequenceRegistry();
  const closed = registry.filter((entry) => entry.status === 'PHYSICAL_RESOURCE_FULLY_CLOSED');
  const empty = registry.filter((entry) => entry.status === 'EMPTY_RESOURCE_SLOT');
  return {
    total: registry.length,
    physicalResourceFullyClosed: closed.length,
    emptyResourceSlots: empty.length,
    frameStreamClosed: registry.filter((entry) => entry.status === 'FRAME_STREAM_CLOSED').length,
    totalFrameInstances: registry.reduce((sum, entry) => sum + entry.totalFrameInstances, 0),
    totalPhysicalFrameDefinitions: registry.reduce((sum, entry) => sum + entry.physicalFrameCount, 0),
    totalTicks: registry.reduce((sum, entry) => sum + entry.totalTicks, 0),
    totalVfids: new Set(closed.flatMap((entry) => entry.vfidRange)).size,
    emptyResourceIds: empty.map((entry) => entry.resourceId),
    techniques: registry.map((entry) => ({
      technique: entry.technique,
      resourceId: entry.resourceId,
      status: entry.status,
      sequences: entry.sequences.length,
      frames: entry.totalFrameInstances,
      physicalFrames: entry.physicalFrameCount,
    })),
  };
}

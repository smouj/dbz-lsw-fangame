// ═══════════════════════════════════════════════════════════════════════
// GENERATED — full physical AnimationResource catalog from canonical ROM.
// Source: dbz_lsw_full_animation_resource_extract.py / ROM bytes.
// Packed frame tuple: [physicalFrameIndex, durationTicks, offsetY:u8, offsetX:u8].
// Physical ROM data only: no semantic pose or actor-role inference.
// ═══════════════════════════════════════════════════════════════════════

import c0 from './romFullAnimationResources.catalog.0';
import c1 from './romFullAnimationResources.catalog.1';
import c2 from './romFullAnimationResources.catalog.2';
import c3 from './romFullAnimationResources.catalog.3';

export interface RomFullAnimationFrameRecord {
  physicalFrameIndex: number;
  durationTicks: number;
  offsetY: number;
  offsetX: number;
  raw: readonly [number, number, number, number];
}

export interface RomFullAnimationSequenceRecord {
  selector: number;
  address: number;
  totalTicks: number;
  frames: readonly RomFullAnimationFrameRecord[];
}

export interface RomFullAnimationResourceRecord {
  resourceId: number;
  localId: number;
  bank: number;
  resourceBaseLocal: number;
  resourceBaseCpu: number;
  resourceLength: number;
  sequenceCount: number;
  physicalFrameCount: number;
  physicalPartCounts: readonly number[];
  sequences: readonly RomFullAnimationSequenceRecord[];
}

export interface RomAnimationEmptySlotRecord {
  resourceId: number;
  bank: number;
  localId: number;
  resourceBaseLocal: number;
}

const CATALOG_B64 = c0 + c1 + c2 + c3;

function decodeBase64(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  // Node verifiers bundle this module too. Avoid a static Buffer type dependency.
  const nodeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(input: string, encoding: string): Uint8Array };
  }).Buffer;
  if (nodeBuffer) return Uint8Array.from(nodeBuffer.from(base64, 'base64'));
  throw new Error('No base64 decoder available for ROM animation catalog');
}

function u16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function s8(value: number): number {
  return value >= 0x80 ? value - 0x100 : value;
}

function decodeCatalog(base64: string): RomFullAnimationResourceRecord[] {
  const data = decodeBase64(base64);
  let cursor = 0;
  const count = data[cursor++];
  const out: RomFullAnimationResourceRecord[] = [];

  for (let item = 0; item < count; item++) {
    const recordLength = u16(data, cursor);
    cursor += 2;
    const end = cursor + recordLength;

    const resourceId = data[cursor++];
    const localId = data[cursor++];
    const bank = data[cursor++];
    const resourceBaseLocal = u16(data, cursor); cursor += 2;
    const resourceLength = u16(data, cursor); cursor += 2;
    const physicalFrameCount = u16(data, cursor); cursor += 2;
    const sequenceCount = data[cursor++];
    const physicalPartCounts = Array.from(data.slice(cursor, cursor + physicalFrameCount));
    cursor += physicalFrameCount;

    const sequences: RomFullAnimationSequenceRecord[] = [];
    for (let sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex++) {
      const selector = data[cursor++];
      const address = u16(data, cursor); cursor += 2;
      const totalTicks = u16(data, cursor); cursor += 2;
      const frameCount = data[cursor++];
      const frames: RomFullAnimationFrameRecord[] = [];

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const physicalFrameIndex = data[cursor++];
        const durationTicks = data[cursor++];
        const rawY = data[cursor++];
        const rawX = data[cursor++];
        frames.push({
          physicalFrameIndex,
          durationTicks,
          offsetY: s8(rawY),
          offsetX: s8(rawX),
          raw: [physicalFrameIndex, durationTicks, rawY, rawX],
        });
      }

      sequences.push({ selector, address, totalTicks, frames });
    }

    if (cursor !== end) {
      throw new Error(`ROM animation packed record length mismatch for $${resourceId.toString(16)}: ${cursor} != ${end}`);
    }

    out.push({
      resourceId,
      localId,
      bank,
      resourceBaseLocal,
      resourceBaseCpu: resourceBaseLocal + 0x4000,
      resourceLength,
      sequenceCount,
      physicalFrameCount,
      physicalPartCounts,
      sequences,
    });
  }

  return out;
}

export const ROM_FULL_ANIMATION_RESOURCES: readonly RomFullAnimationResourceRecord[] =
  decodeCatalog(CATALOG_B64);

export const ROM_FULL_ANIMATION_EMPTY_SLOTS: readonly RomAnimationEmptySlotRecord[] = [
  { resourceId: 0x28, bank: 0x63, localId: 15, resourceBaseLocal: 10252 },
  { resourceId: 0x29, bank: 0x63, localId: 16, resourceBaseLocal: 10252 },
  { resourceId: 0x2a, bank: 0x63, localId: 17, resourceBaseLocal: 10252 },
  { resourceId: 0x40, bank: 0x64, localId: 14, resourceBaseLocal: 14740 },
] as const;

export const ROM_FULL_ANIMATION_SUMMARY = {
  catalogSlots: 66,
  catalogResourcesNonEmpty: 62,
  catalogEmptySlots: 4,
  catalogSequences: 119,
  catalogFrameRecordInstances: 2458,
  catalogPhysicalFrameDefinitions: 445,
  allDomainsNonEmptyResources: 69,
  allDomainsSequences: 224,
  allDomainsFrameRecordInstances: 3928,
  allDomainsPhysicalFrameDefinitions: 544,
  allDomainsMetaspriteParts: 6272,
} as const;

export const ROM_FULL_ANIMATION_SOURCE = {
  canonicalRomSha256: 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804',
  usaStructuralMatchSha256: '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee',
  reskinStructuralMatchSha256: 'a326ea031567c300791e1edb10e2e4dfba58d7d9867fc7eaf193ff742038e0d3',
  frameRecord: '[physicalFrameIndex:u8,durationTicks:u8,offsetY:s8,offsetX:s8]',
  metaspritePart: '[dy:s8,dx:s8,tileOffset:u8,oamAttr:u8]',
  graphicsRecord: 'tileCount:u8 + tileCount*u16(sourceTileAddress)',
  resourceHeader: '+0 seqTableRel16, +2 metaspriteTableRel16, +4 graphicsTableRel16',
} as const;

export function romFullAnimationResourceById(resourceId: number): RomFullAnimationResourceRecord | undefined {
  return ROM_FULL_ANIMATION_RESOURCES.find((resource) => resource.resourceId === resourceId);
}

export function romFullAnimationEmptySlotById(resourceId: number): RomAnimationEmptySlotRecord | undefined {
  return ROM_FULL_ANIMATION_EMPTY_SLOTS.find((slot) => slot.resourceId === resourceId);
}

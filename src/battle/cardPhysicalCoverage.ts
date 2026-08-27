// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CARD PHYSICAL ANIMATION COVERAGE
// ═══════════════════════════════════════════════════════════════════════
// Cobertura 125/125 a nivel carta, derivada de:
// CARD -> ROM card record -> AnimationResource -> physical reconciliation.
// No usa V9, comparacion visual ni trazas dinamicas.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef, type CardType } from '../data/cards';
import { romCardData } from '../data/romCardData';
import { animationResourceById, type AnimationResourceCatalogEntry } from './animationResources';
import {
  physicalResourceById,
  staticGapCauseForResourceId,
  type PhysicalMappingSummary,
  type StaticResourceGapCause,
} from './physicalFrameReconciliation';

export type CardPhysicalCoverageStatus =
  | 'NO_ROM_ANIMATION'
  | 'ROM_RESOURCE_MISSING'
  | 'RESOURCE_DECODED_COMPLETE'
  | 'RESOURCE_DECODED_ROM_PHYSICAL'
  | 'RESOURCE_DECODED_PARTIAL'
  | 'RESOURCE_DECODED_UNRESOLVED'
  | 'RESOURCE_PARTIAL'
  | 'RESOURCE_SPECIAL'
  | 'RESOURCE_UNKNOWN';

export interface CardPhysicalCoverageRow {
  card: Pick<CardDef, 'id' | 'name' | 'type' | 'effect'>;
  animationResource: number | null;
  animationResourceHex: string | null;
  resourceStatus: AnimationResourceCatalogEntry['status'] | 'MISSING' | null;
  physicalStatus: CardPhysicalCoverageStatus;
  gapCause: StaticResourceGapCause | 'NO_ROM_ANIMATION';
  romFrames: number;
  exact: number;
  shared: number;
  composite: number;
  romPhysical: number;
  unresolved: number;
  mappedFrames: number;
  mappingSummary: PhysicalMappingSummary | null;
}

export interface CardPhysicalCoverageSummary {
  cards: number;
  withAnimationResource: number;
  decodedResourceCards: number;
  complete: number;
  partial: number;
  unresolvedDecoded: number;
  pendingStatic: number;
  noRomAnimation: number;
  missingResource: number;
  romFrames: number;
  mappedFrames: number;
  romPhysicalFrames: number;
  unresolvedFrames: number;
  byStatus: Record<CardPhysicalCoverageStatus, number>;
}

const NONE = 0xff;

function hex(value: number | null): string | null {
  return value == null ? null : `0x${value.toString(16).padStart(2, '0')}`;
}

function emptySummary(): PhysicalMappingSummary {
  return {
    resources: 0,
    romFrames: 0,
    exact: 0,
    shared: 0,
    composite: 0,
    romPhysical: 0,
    unresolved: 0,
    byStatus: { EXACT: 0, SHARED: 0, COMPOSITE: 0, ROM_PHYSICAL: 0, UNRESOLVED: 0 },
  };
}

function statusFor(
  resource: AnimationResourceCatalogEntry | undefined,
  summary: PhysicalMappingSummary | null,
): CardPhysicalCoverageStatus {
  if (!resource) return 'ROM_RESOURCE_MISSING';
  if (resource.status === 'PARTIAL') return 'RESOURCE_PARTIAL';
  if (resource.status === 'SPECIAL') return 'RESOURCE_SPECIAL';
  if (resource.status === 'UNKNOWN') return 'RESOURCE_UNKNOWN';
  if (!summary || summary.romFrames === 0 || summary.unresolved === summary.romFrames) return 'RESOURCE_DECODED_UNRESOLVED';
  if (summary.romPhysical === summary.romFrames) return 'RESOURCE_DECODED_ROM_PHYSICAL';
  if (summary.unresolved === 0 && summary.romPhysical === 0) return 'RESOURCE_DECODED_COMPLETE';
  return 'RESOURCE_DECODED_PARTIAL';
}

export function cardPhysicalCoverageForCard(card: CardDef): CardPhysicalCoverageRow {
  const rom = romCardData(card.name);
  const animationResource = rom && rom.actorAnim !== NONE ? rom.actorAnim : null;
  if (animationResource == null) {
    return {
      card: { id: card.id, name: card.name, type: card.type, effect: card.effect },
      animationResource: null,
      animationResourceHex: null,
      resourceStatus: null,
      physicalStatus: 'NO_ROM_ANIMATION',
      gapCause: 'NO_ROM_ANIMATION',
      romFrames: 0,
      exact: 0,
      shared: 0,
      composite: 0,
      romPhysical: 0,
      unresolved: 0,
      mappedFrames: 0,
      mappingSummary: emptySummary(),
    };
  }

  const resource = animationResourceById(animationResource);
  const physical = physicalResourceById(animationResource);
  const summary = physical?.summary ?? null;
  const physicalStatus = statusFor(resource, summary);
  const exact = summary?.exact ?? 0;
  const shared = summary?.shared ?? 0;
  const composite = summary?.composite ?? 0;
  const romPhysical = summary?.romPhysical ?? 0;

  return {
    card: { id: card.id, name: card.name, type: card.type, effect: card.effect },
    animationResource,
    animationResourceHex: hex(animationResource),
    resourceStatus: resource?.status ?? 'MISSING',
    physicalStatus,
    gapCause: resource ? staticGapCauseForResourceId(animationResource) : 'OTHER_STATIC_PENDING',
    romFrames: summary?.romFrames ?? 0,
    exact,
    shared,
    composite,
    romPhysical,
    unresolved: summary?.unresolved ?? 0,
    mappedFrames: exact + shared,
    mappingSummary: summary,
  };
}

export const CARD_PHYSICAL_ANIMATION_COVERAGE: CardPhysicalCoverageRow[] =
  CARDS.map(cardPhysicalCoverageForCard);

export function listCardPhysicalCoverage(): CardPhysicalCoverageRow[] {
  return CARD_PHYSICAL_ANIMATION_COVERAGE;
}

export function cardPhysicalCoverageByCardId(id: number): CardPhysicalCoverageRow | undefined {
  return CARD_PHYSICAL_ANIMATION_COVERAGE.find(row => row.card.id === id);
}

export function cardPhysicalCoverageSummary(): CardPhysicalCoverageSummary {
  const byStatus: Record<CardPhysicalCoverageStatus, number> = {
    NO_ROM_ANIMATION: 0,
    ROM_RESOURCE_MISSING: 0,
    RESOURCE_DECODED_COMPLETE: 0,
    RESOURCE_DECODED_ROM_PHYSICAL: 0,
    RESOURCE_DECODED_PARTIAL: 0,
    RESOURCE_DECODED_UNRESOLVED: 0,
    RESOURCE_PARTIAL: 0,
    RESOURCE_SPECIAL: 0,
    RESOURCE_UNKNOWN: 0,
  };

  let withAnimationResource = 0;
  let decodedResourceCards = 0;
  let romFrames = 0;
  let mappedFrames = 0;
  let romPhysicalFrames = 0;
  let unresolvedFrames = 0;

  for (const row of CARD_PHYSICAL_ANIMATION_COVERAGE) {
    byStatus[row.physicalStatus]++;
    if (row.animationResource != null) withAnimationResource++;
    if (row.resourceStatus === 'DECODED') decodedResourceCards++;
    romFrames += row.romFrames;
    mappedFrames += row.mappedFrames;
    romPhysicalFrames += row.romPhysical;
    unresolvedFrames += row.unresolved;
  }

  return {
    cards: CARD_PHYSICAL_ANIMATION_COVERAGE.length,
    withAnimationResource,
    decodedResourceCards,
    complete: byStatus.RESOURCE_DECODED_COMPLETE,
    partial: byStatus.RESOURCE_DECODED_PARTIAL,
    unresolvedDecoded: byStatus.RESOURCE_DECODED_UNRESOLVED,
    pendingStatic: byStatus.RESOURCE_PARTIAL + byStatus.RESOURCE_SPECIAL + byStatus.RESOURCE_UNKNOWN,
    noRomAnimation: byStatus.NO_ROM_ANIMATION,
    missingResource: byStatus.ROM_RESOURCE_MISSING,
    romFrames,
    mappedFrames,
    romPhysicalFrames,
    unresolvedFrames,
    byStatus,
  };
}

export function cardPhysicalCoverageByType(): Record<CardType, CardPhysicalCoverageSummary> {
  const out = {} as Record<CardType, CardPhysicalCoverageSummary>;
  for (const type of ['command', 'damage', 'beam', 'support', 'defense', 'special'] as CardType[]) {
    const rows = CARD_PHYSICAL_ANIMATION_COVERAGE.filter(row => row.card.type === type);
    const byStatus = {
      NO_ROM_ANIMATION: 0,
      ROM_RESOURCE_MISSING: 0,
      RESOURCE_DECODED_COMPLETE: 0,
      RESOURCE_DECODED_ROM_PHYSICAL: 0,
      RESOURCE_DECODED_PARTIAL: 0,
      RESOURCE_DECODED_UNRESOLVED: 0,
      RESOURCE_PARTIAL: 0,
      RESOURCE_SPECIAL: 0,
      RESOURCE_UNKNOWN: 0,
    };
    for (const row of rows) byStatus[row.physicalStatus]++;
    out[type] = {
      cards: rows.length,
      withAnimationResource: rows.filter(row => row.animationResource != null).length,
      decodedResourceCards: rows.filter(row => row.resourceStatus === 'DECODED').length,
      complete: byStatus.RESOURCE_DECODED_COMPLETE,
      partial: byStatus.RESOURCE_DECODED_PARTIAL,
      unresolvedDecoded: byStatus.RESOURCE_DECODED_UNRESOLVED,
      pendingStatic: byStatus.RESOURCE_PARTIAL + byStatus.RESOURCE_SPECIAL + byStatus.RESOURCE_UNKNOWN,
      noRomAnimation: byStatus.NO_ROM_ANIMATION,
      missingResource: byStatus.ROM_RESOURCE_MISSING,
      romFrames: rows.reduce((sum, row) => sum + row.romFrames, 0),
      mappedFrames: rows.reduce((sum, row) => sum + row.mappedFrames, 0),
      romPhysicalFrames: rows.reduce((sum, row) => sum + row.romPhysical, 0),
      unresolvedFrames: rows.reduce((sum, row) => sum + row.unresolved, 0),
      byStatus,
    };
  }
  return out;
}

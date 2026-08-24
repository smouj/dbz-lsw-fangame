// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — PHYSICAL FRAME RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════
// Enlaza frames ROM decodificados con los manifests actuales del proyecto.
// No usa comparación visual ni trazas dinámicas. durationTicks/offsets/raw
// siguen perteneciendo exclusivamente a la ROM.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import { MANIFEST_FRAME_INDEX, manifestFileUsage, manifestFrame, manifestForms, type ManifestFrameRecord } from '../data/generated/manifestFrameIndex.generated';
import { FORMS } from '../data/roster';
import { romCardData } from '../data/romCardData';
import { spriteDirFor } from '../data/spriteManifest';
import { ANIMATION_RESOURCE_CATALOG, animationResourceById, type AnimationResourceCatalogEntry, type AnimationResourceDecodedFrame } from './animationResources';

export type PhysicalFrameMappingStatus = 'EXACT' | 'SHARED' | 'COMPOSITE' | 'UNRESOLVED';

export type StaticResourceGapCause =
  | 'NONE'
  | 'SEQUENCE_BOUNDARY_PENDING'
  | 'FRAME_TABLE_PARTIAL'
  | 'METASPRITE_MAPPING_PENDING'
  | 'MULTI_SEQUENCE_AMBIGUOUS'
  | 'HANDLER_DEPENDENT'
  | 'OTHER_STATIC_PENDING';

export interface RomPhysicalFrameRef {
  metasprite: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  raw: readonly [number, number, number, number];
}

export interface PhysicalAssetMapping {
  physicalFrame: string | null;
  manifestPose: string | null;
  manifestIndex: number | null;
  formsTotal: number;
  formsMapped: number;
  sampleFiles: string[];
  missingForms: string[];
  status: PhysicalFrameMappingStatus;
  reason: string;
}

export interface PhysicalFrameReconciliationEntry {
  resourceId: number;
  resourceHex: string;
  sourceTechnique: string | null;
  sequenceIndex: number;
  frameIndex: number;
  rom: RomPhysicalFrameRef;
  assetMapping: PhysicalAssetMapping;
}

export interface PhysicalResourceReconciliation {
  resourceId: number;
  resourceHex: string;
  sourceTechnique: string | null;
  status: AnimationResourceCatalogEntry['status'];
  gapCause: StaticResourceGapCause;
  compatibleForms: string[];
  frames: PhysicalFrameReconciliationEntry[];
  summary: PhysicalMappingSummary;
}

export interface PhysicalMappingSummary {
  resources: number;
  romFrames: number;
  exact: number;
  shared: number;
  composite: number;
  unresolved: number;
  byStatus: Record<PhysicalFrameMappingStatus, number>;
}

interface Candidate {
  pose: string;
  index: number;
  reason: string;
}

function hex(value: number): string {
  return `0x${value.toString(16).padStart(2, '0')}`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function cardById(id: number): CardDef | undefined {
  return CARDS.find(card => card.id === id);
}

function compatibleFormsForCard(card: CardDef): string[] {
  const forms = Object.values(FORMS);
  if (card.compatible?.length) {
    return forms.filter(form => card.compatible?.includes(form.character)).map(form => form.id);
  }
  if (card.notCompatible?.length) {
    return forms.filter(form => !card.notCompatible?.includes(form.character)).map(form => form.id);
  }
  return forms.map(form => form.id);
}

function manifestFormId(formId: string): string | null {
  const dir = spriteDirFor(formId);
  if (!dir) return null;
  return manifestForms().includes(dir) ? dir : null;
}

function compatibleFormsForResource(resource: AnimationResourceCatalogEntry): string[] {
  const forms = resource.cards.flatMap(ref => {
    const card = cardById(ref.id);
    return card ? compatibleFormsForCard(card) : [];
  }).map(manifestFormId).filter((form): form is string => !!form);
  return uniqueSorted(forms);
}

function decodedFrameRom(frame: AnimationResourceDecodedFrame): RomPhysicalFrameRef {
  return {
    metasprite: frame.visualFrameId,
    durationTicks: frame.durationTicks,
    offsetX: frame.offsetX,
    offsetY: frame.offsetY,
    raw: frame.raw,
  };
}

function isBeamResource(resource: AnimationResourceCatalogEntry): boolean {
  return resource.cards.some(ref => ref.type === 'beam') || resource.handlers.some(handler => [0x02, 0x03, 0x04, 0x05, 0x06, 0x07].includes(handler));
}

function isTailResource(resource: AnimationResourceCatalogEntry): boolean {
  return resource.resourceId === 0x3f || resource.handlers.includes(0x0b);
}

function frameCandidate(resource: AnimationResourceCatalogEntry, sequenceFrames: AnimationResourceDecodedFrame[], frameIndex: number): Candidate | null {
  if (isTailResource(resource)) {
    return null;
  }
  if (!isBeamResource(resource)) {
    return null;
  }
  const firstMeta = sequenceFrames[0]?.visualFrameId;
  const frame = sequenceFrames[frameIndex];
  const firstRelease = sequenceFrames.findIndex((candidate, index) => index > 0 && candidate.visualFrameId !== firstMeta);
  const releaseStart = firstRelease === -1 ? Math.ceil(sequenceFrames.length / 2) : firstRelease;
  if (frameIndex < releaseStart || frame.durationTicks >= 30) {
    return {
      pose: 'beam_charge',
      index: Math.min(frameIndex, 2),
      reason: 'Beam handler phase contract: charge/hold frames map to manifest beam_charge, not by visual similarity.',
    };
  }
  return {
    pose: 'beam_fire',
    index: 0,
    reason: 'Beam handler phase contract: release/recovery frames map to manifest beam_fire when the current manifest has it.',
  };
}

function statusForCandidate(candidate: Candidate | null, forms: string[], mapped: ManifestFrameRecord[], logicalUseCount: number): PhysicalFrameMappingStatus {
  if (!candidate || forms.length === 0 || mapped.length !== forms.length) return 'UNRESOLVED';
  if (mapped.some(frame => frame.pose.includes('composite') || frame.file.includes('composite'))) return 'COMPOSITE';
  if (logicalUseCount > 1) return 'SHARED';
  if (mapped.some(frame => manifestFileUsage(frame.formId, frame.file).length > 1)) return 'SHARED';
  return 'EXACT';
}

function gapCauseForResource(resource: AnimationResourceCatalogEntry, summary?: PhysicalMappingSummary): StaticResourceGapCause {
  if (resource.status === 'DECODED') {
    return summary && summary.unresolved === 0 ? 'NONE' : 'METASPRITE_MAPPING_PENDING';
  }
  if (resource.status === 'SPECIAL') return 'HANDLER_DEPENDENT';
  if (resource.status === 'UNKNOWN') return 'OTHER_STATIC_PENDING';
  if (resource.handlers.length > 1) return 'MULTI_SEQUENCE_AMBIGUOUS';
  if (resource.handlers.some(handler => handler === 0x0a)) return 'FRAME_TABLE_PARTIAL';
  if (resource.handlers.some(handler => handler === 0x00 || handler >= 0x08)) return 'HANDLER_DEPENDENT';
  return 'SEQUENCE_BOUNDARY_PENDING';
}

function summarizeFrames(frames: PhysicalFrameReconciliationEntry[]): PhysicalMappingSummary {
  const byStatus: Record<PhysicalFrameMappingStatus, number> = {
    EXACT: 0,
    SHARED: 0,
    COMPOSITE: 0,
    UNRESOLVED: 0,
  };
  for (const frame of frames) byStatus[frame.assetMapping.status]++;
  return {
    resources: uniqueSorted(frames.map(frame => frame.resourceHex)).length,
    romFrames: frames.length,
    exact: byStatus.EXACT,
    shared: byStatus.SHARED,
    composite: byStatus.COMPOSITE,
    unresolved: byStatus.UNRESOLVED,
    byStatus,
  };
}

function buildResourceReconciliation(resource: AnimationResourceCatalogEntry): PhysicalResourceReconciliation {
  const compatibleForms = compatibleFormsForResource(resource);
  const candidates: Array<{
    sequenceIndex: number;
    frameIndex: number;
    frame: AnimationResourceDecodedFrame;
    candidate: Candidate | null;
  }> = [];

  for (const [sequenceIndex, sequence] of resource.sequences.entries()) {
    for (const [frameIndex, frame] of sequence.frames.entries()) {
      candidates.push({
        sequenceIndex,
        frameIndex,
        frame,
        candidate: frameCandidate(resource, sequence.frames, frameIndex),
      });
    }
  }

  const logicalCounts = new Map<string, number>();
  for (const item of candidates) {
    const key = item.candidate ? `${item.candidate.pose}[${item.candidate.index}]` : 'UNRESOLVED';
    logicalCounts.set(key, (logicalCounts.get(key) ?? 0) + 1);
  }

  const frames = candidates.map(item => {
    const mapped = item.candidate
      ? compatibleForms.map(formId => manifestFrame(formId, item.candidate!.pose, item.candidate!.index)).filter((frame): frame is ManifestFrameRecord => !!frame)
      : [];
    const missingForms = item.candidate
      ? compatibleForms.filter(formId => !manifestFrame(formId, item.candidate!.pose, item.candidate!.index))
      : compatibleForms;
    const physicalFrame = item.candidate ? `${item.candidate.pose}[${item.candidate.index}]` : null;
    const status = statusForCandidate(item.candidate, compatibleForms, mapped, logicalCounts.get(physicalFrame ?? 'UNRESOLVED') ?? 0);
    return {
      resourceId: resource.resourceId,
      resourceHex: resource.resourceHex,
      sourceTechnique: resource.sourceTechnique,
      sequenceIndex: item.sequenceIndex,
      frameIndex: item.frameIndex,
      rom: decodedFrameRom(item.frame),
      assetMapping: {
        physicalFrame,
        manifestPose: item.candidate?.pose ?? null,
        manifestIndex: item.candidate?.index ?? null,
        formsTotal: compatibleForms.length,
        formsMapped: mapped.length,
        sampleFiles: mapped.slice(0, 6).map(frame => `${frame.formId}:${frame.file}`),
        missingForms,
        status,
        reason: item.candidate?.reason ?? 'No static manifest pose contract exists for this ROM metasprite yet.',
      },
    };
  });

  const summary = summarizeFrames(frames);
  return {
    resourceId: resource.resourceId,
    resourceHex: resource.resourceHex,
    sourceTechnique: resource.sourceTechnique,
    status: resource.status,
    gapCause: gapCauseForResource(resource, summary),
    compatibleForms,
    frames,
    summary,
  };
}

export function listPhysicalFrameReconciliation(): PhysicalResourceReconciliation[] {
  return ANIMATION_RESOURCE_CATALOG
    .filter(resource => resource.status === 'DECODED')
    .map(buildResourceReconciliation);
}

export const PHYSICAL_FRAME_RECONCILIATION: PhysicalResourceReconciliation[] = listPhysicalFrameReconciliation();

export function physicalFrameReconciliationSummary(): PhysicalMappingSummary {
  const frames = PHYSICAL_FRAME_RECONCILIATION.flatMap(resource => resource.frames);
  return summarizeFrames(frames);
}

export function physicalResourceById(resourceId: number): PhysicalResourceReconciliation | undefined {
  return PHYSICAL_FRAME_RECONCILIATION.find(resource => resource.resourceId === resourceId);
}

export function physicalMappingSummaryForCard(card: CardDef): PhysicalMappingSummary | null {
  const rom = romCardData(card.name);
  if (!rom || rom.actorAnim === 0xff) return null;
  const resource = physicalResourceById(rom.actorAnim);
  return resource?.summary ?? null;
}

export function staticGapCauseForResourceId(resourceId: number): StaticResourceGapCause {
  const physical = physicalResourceById(resourceId);
  if (physical) return physical.gapCause;
  const resource = animationResourceById(resourceId);
  return resource ? gapCauseForResource(resource) : 'OTHER_STATIC_PENDING';
}

export const _physicalFrameReconciliationInternals = {
  compatibleFormsForResource,
  frameCandidate,
  gapCauseForResource,
  statusForCandidate,
  manifestFrameCount: MANIFEST_FRAME_INDEX.length,
};

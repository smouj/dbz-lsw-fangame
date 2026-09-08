// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — ROM physical preview assets
//
// A semantic binding may carry a logical manifest filename for compatibility,
// but an inspector that claims ROM truth must render the promoted `rom-p...`
// asset.  This module is the only URL bridge used by those inspectors.
// Missing physical evidence deliberately returns null: callers show PENDING
// rather than silently loading a remake/legacy PNG.
// ═══════════════════════════════════════════════════════════════════════

import type { CharacterFrameBinding, ResolvedVisualSequence } from '../battle/characterFrameMap';
import { resolveStageProductionFrame } from '../battle/productionFrameResolver';
import { ROM_BANK61_ANIMATION_CORE } from '../data/generated/romAnimationCore.generated';
import { physicalFrameForId } from '../data/romPhysicalFrameIndex';
import { spriteDirFor } from '../data/spriteManifest';

export interface RomPhysicalPreviewFrame {
  formId: string;
  physicalId: string;
  file: string;
  url: string;
  durationTicks: number | null;
  semanticRole: string;
  provenance: 'ROM_EXACT' | 'ROM_PHASE' | 'ROM_NEUTRAL_STATIC';
}

/** URL only when it resolves into the promoted physical ROM corpus. */
export function romPhysicalAssetUrl(
  formId: string,
  file?: string | null,
  physicalId?: string | null,
): string | null {
  const directory = spriteDirFor(formId);
  if (!directory) return null;
  // ROM presentation cues carry their corpus-relative file directly.
  if (file?.startsWith('physical/')) return `/assets/sprites/${directory}/${file}`;
  const physical = physicalId ? physicalFrameForId(physicalId) : null;
  return physical ? `/assets/sprites/${directory}/${physical.file}` : null;
}

/** Promote a reconciled semantic binding to its physical ROM asset, if any. */
export function romPhysicalPreviewFrame(
  formId: string,
  binding: CharacterFrameBinding,
): RomPhysicalPreviewFrame | null {
  const exactId = binding.romPhysicalId;
  // A ROM phase is a real source-set rather than an authored approximation.
  // Its first promoted source is the deterministic preview representative.
  const phaseId = binding.romPhysicalSourceIds[0];
  const physicalId = exactId ?? phaseId;
  const physical = physicalId ? physicalFrameForId(physicalId) : null;
  const url = romPhysicalAssetUrl(formId, physical?.file, physicalId);
  if (!physicalId || !physical || !url) return null;
  return {
    formId,
    physicalId,
    file: physical.file,
    url,
    durationTicks: binding.rom?.durationTicks ?? null,
    semanticRole: binding.semanticRole,
    provenance: exactId ? 'ROM_EXACT' : 'ROM_PHASE',
  };
}

export function romPhysicalPreviewSequence(sequence: ResolvedVisualSequence): RomPhysicalPreviewFrame[] {
  return sequence.bindings
    .map(binding => romPhysicalPreviewFrame(sequence.formId, binding))
    .filter((frame): frame is RomPhysicalPreviewFrame => frame != null);
}

/**
 * Bank $61 / resource 0 / selector 0 is the ROM's static neutral candidate:
 * one full-body frame, 3 ticks, with zero offsets.  It is intentionally
 * labelled static until a live ActionObject trace promotes it to dynamic
 * verification; it never falls back to `idle_00.png`.
 */
export function romPhysicalNeutralPreview(formId: string): RomPhysicalPreviewFrame | null {
  const resource = ROM_BANK61_ANIMATION_CORE[0];
  const sequence = resource?.sequences[0];
  const frame = sequence?.frames[0];
  if (!resource || !sequence || !frame) return null;

  const resolved = resolveStageProductionFrame({
    formId,
    resourceIndex: 0,
    animationBank: 0x61,
    resourceBase: resource.resourceBase,
    sequenceSelector: 0,
    frameIndex: frame.frameIndex,
    visualFrameId: frame.visualFrameId,
    durationTicks: frame.durationTicks,
    offsetX: frame.offsetX,
    offsetY: frame.offsetY,
  });
  if (resolved.source !== 'ROM_PHYSICAL' || !resolved.physicalId || !resolved.file) return null;
  const url = romPhysicalAssetUrl(formId, resolved.file, resolved.physicalId);
  if (!url) return null;
  return {
    formId,
    physicalId: resolved.physicalId,
    file: resolved.file,
    url,
    durationTicks: resolved.durationTicks,
    semanticRole: 'idle',
    provenance: 'ROM_NEUTRAL_STATIC',
  };
}

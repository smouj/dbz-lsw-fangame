// ROM Sprite Atlas — deterministic view model for the ROM physical fighter corpus.
//
// This module deliberately does not know about the legacy sprite manifests or
// manually authored PNG lists.  Every frame starts at ROM_PHYSICAL_CORPUS_SUMMARY
// and is joined to the ROM animation catalog by (resource, visualFrameId).
// The browser may then enrich a selected form with rom-physical.manifest.json /
// provenance.json for the exact crop, metasprite and palette inspector fields.

import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../../data/generated/romPhysicalCorpus.generated';
import { ROM_FIGHTER_FORM_IDENTITY } from '../../data/generated/romFighterFormIdentity.generated';
import { animationResourceById } from '../../battle/animationResources';

export type AtlasSourceStatus = 'ROM_PHYSICAL' | 'GENERATED_ASSET_MISSING' | 'UNRESOLVED';
export type AtlasPaletteMode = 'rom' | 'raw' | 'grayscale';

export interface RomSpriteAtlasUse {
  resourceId: number;
  sequence: number;
  frameIndex: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
}

export interface RomSpriteAtlasFrame {
  physicalId: string;
  file: string;
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  resourceId: number | null;
  visualFrameId: number;
  metaspriteHash: string;
  graphicsHash: string;
  sourceProvenanceHash: string;
  trimmedPixelHash: string;
  /** Raw 2bpp materialization from the same ROM provenance record, when present. */
  rawImageFile: string | null;
  /** Geometry supplied by provenance.json when the browser has loaded it. */
  width: number | null;
  height: number | null;
  originX: number | null;
  originY: number | null;
  anchorX: number | null;
  anchorY: number | null;
  paletteId: number | null;
  usageCount: number;
  uses: RomSpriteAtlasUse[];
  source: AtlasSourceStatus;
}

export interface RomSpriteAtlasForm {
  formId: string;
  characterId: string;
  runtimeFormLabel: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  paletteIndex: number;
  paletteCpuAddressHex: string;
  frames: RomSpriteAtlasFrame[];
  uniquePhysicalFrames: number;
  mappedUsages: number;
  duplicateAliases: number;
  unresolvedFrames: number;
}

type CorpusFrame = {
  physicalId: string;
  file: string;
  resourceId: number | null;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  metaspriteHash?: string;
  graphicsHash?: string;
  sourceProvenanceHash?: string;
  trimmedPixelHash?: string;
  rawImageFile?: string;
};

type ProvenanceFrame = Partial<Pick<RomSpriteAtlasFrame,
  'width' | 'height' | 'originX' | 'originY' | 'anchorX' | 'anchorY' | 'paletteId'>> & {
  physicalId: string;
  rawImageFile?: string;
  width?: number;
  height?: number;
  originX?: number;
  originY?: number;
  originInTrimX?: number;
  originInTrimY?: number;
  palette?: { cpuAddress?: number; cpuAddressHex?: string; paletteIndex?: number };
  rawBounds?: { originX?: number; originY?: number };
  metasprite?: { provenance?: { anchorX?: number; anchorY?: number } };
};

const FORM_IDENTITY = new Map<string, (typeof ROM_FIGHTER_FORM_IDENTITY)[number]>(ROM_FIGHTER_FORM_IDENTITY.map(row => [row.formId, row]));

function usagesFor(resourceId: number | null, visualFrameId: number): RomSpriteAtlasUse[] {
  if (resourceId == null) return [];
  const resource = animationResourceById(resourceId);
  if (!resource) return [];
  const uses: RomSpriteAtlasUse[] = [];
  resource.sequences.forEach((sequence, sequenceIndex) => {
    sequence.frames.forEach((frame, frameIndex) => {
      if (frame.visualFrameId !== visualFrameId) return;
      uses.push({
        resourceId,
        sequence: sequenceIndex,
        frameIndex,
        durationTicks: frame.durationTicks,
        offsetX: frame.offsetX,
        offsetY: frame.offsetY,
      });
    });
  });
  return uses;
}

function baseForm(formId: string): RomSpriteAtlasForm | null {
  const identity = FORM_IDENTITY.get(formId);
  const corpus = ROM_PHYSICAL_CORPUS_SUMMARY.forms.find(row => row.formId === formId);
  if (!identity || !corpus) return null;
  const refs = (corpus.physicalFrameIndex ?? []) as ReadonlyArray<CorpusFrame>;
  const seen = new Set<string>();
  const frames = refs.map(ref => {
    const duplicate = seen.has(ref.physicalId);
    seen.add(ref.physicalId);
    const uses = usagesFor(ref.resourceId, ref.visualFrameId);
    return {
      physicalId: ref.physicalId,
      file: ref.file,
      formId,
      actorVisualProfileKey: ref.actorVisualProfileKey,
      graphicsBank: ref.graphicsBank,
      resourceId: ref.resourceId,
      visualFrameId: ref.visualFrameId,
      metaspriteHash: ref.metaspriteHash ?? '—',
      graphicsHash: ref.graphicsHash ?? '—',
      sourceProvenanceHash: ref.sourceProvenanceHash ?? '—',
      trimmedPixelHash: ref.trimmedPixelHash ?? '—',
      rawImageFile: null,
      width: null,
      height: null,
      originX: null,
      originY: null,
      anchorX: null,
      anchorY: null,
      paletteId: identity.paletteIndex,
      usageCount: uses.length,
      uses,
      source: duplicate ? 'UNRESOLVED' : 'ROM_PHYSICAL',
    } satisfies RomSpriteAtlasFrame;
  });
  const duplicateAliases = refs.length - seen.size;
  const unresolvedFrames = frames.filter(frame => frame.source === 'UNRESOLVED').length;
  return {
    formId,
    characterId: identity.characterId,
    runtimeFormLabel: identity.runtimeFormLabel,
    actorVisualProfileKey: identity.actorVisualProfileKey,
    graphicsBank: identity.graphicsBank,
    paletteIndex: identity.paletteIndex,
    paletteCpuAddressHex: identity.paletteCpuAddressHex,
    frames,
    uniquePhysicalFrames: seen.size,
    mappedUsages: frames.reduce((total, frame) => total + frame.usageCount, 0),
    duplicateAliases,
    unresolvedFrames,
  };
}

/** ROM ordered forms and their physical, deduplicated frame catalog. */
export const ROM_SPRITE_ATLAS_FORMS: RomSpriteAtlasForm[] = ROM_FIGHTER_FORM_IDENTITY
  .map(row => baseForm(row.formId))
  .filter((row): row is RomSpriteAtlasForm => row !== null);

export function romSpriteAtlasForForm(formId: string): RomSpriteAtlasForm | null {
  return ROM_SPRITE_ATLAS_FORMS.find(form => form.formId === formId) ?? null;
}

/** Merge the exact geometry/palette provenance loaded for one form. */
export function enrichRomSpriteAtlasForm(
  form: RomSpriteAtlasForm,
  provenanceFrames: ReadonlyArray<ProvenanceFrame>,
): RomSpriteAtlasForm {
  const byId = new Map(provenanceFrames.map(frame => [frame.physicalId, frame]));
  const frames = form.frames.map(frame => {
    const source = byId.get(frame.physicalId);
    if (!source) return frame;
    return {
      ...frame,
      width: source.width ?? frame.width,
      height: source.height ?? frame.height,
      originX: source.originX ?? source.rawBounds?.originX ?? frame.originX,
      originY: source.originY ?? source.rawBounds?.originY ?? frame.originY,
      anchorX: source.anchorX ?? source.metasprite?.provenance?.anchorX ?? source.originInTrimX ?? frame.anchorX,
      anchorY: source.anchorY ?? source.metasprite?.provenance?.anchorY ?? source.originInTrimY ?? frame.anchorY,
      paletteId: source.paletteId ?? source.palette?.paletteIndex ?? frame.paletteId,
      rawImageFile: source.rawImageFile ?? frame.rawImageFile,
    };
  });
  return { ...form, frames };
}

export interface RomSpriteAtlasMetrics {
  forms: number;
  physicalFrames: number;
  uniqueRenderedFrames: number;
  duplicateAliases: number;
  mappedUsages: number;
  palettes: number;
  brokenFrames: number;
  unresolved: number;
}

export function romSpriteAtlasMetrics(forms: ReadonlyArray<RomSpriteAtlasForm> = ROM_SPRITE_ATLAS_FORMS): RomSpriteAtlasMetrics {
  const all = forms.flatMap(form => form.frames);
  return {
    forms: forms.length,
    physicalFrames: all.length,
    uniqueRenderedFrames: new Set(all.map(frame => `${frame.physicalId}|p${frame.paletteId ?? 'unresolved'}`)).size,
    // The same physical identity can be referenced by more than one form
    // profile.  Count those cross-form aliases once, while keeping each
    // form's own `frames` list duplicate-free.
    duplicateAliases: all.length - new Set(all.map(frame => frame.physicalId)).size,
    mappedUsages: forms.reduce((sum, form) => sum + form.mappedUsages, 0),
    palettes: new Set(forms.map(form => form.paletteIndex)).size,
    brokenFrames: all.filter(frame => !frame.physicalId || !frame.file || frame.width === 0 || frame.height === 0).length,
    unresolved: all.filter(frame => frame.source !== 'ROM_PHYSICAL').length,
  };
}

export function romSpriteAtlasExport(form: RomSpriteAtlasForm): object {
  return {
    schemaVersion: 1,
    source: 'ROM_PHYSICAL_FIGHTERS',
    form: form.formId,
    actorVisualProfileKey: form.actorVisualProfileKey,
    graphicsBank: form.graphicsBank,
    paletteIndex: form.paletteIndex,
    frames: form.frames.map(frame => ({
      physicalId: frame.physicalId,
      visualFrameIds: [frame.visualFrameId],
      file: frame.file,
      x: frame.originX,
      y: frame.originY,
      w: frame.width,
      h: frame.height,
      originX: frame.originX,
      originY: frame.originY,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      uses: frame.uses,
      provenance: {
        metaspriteHash: frame.metaspriteHash,
        graphicsHash: frame.graphicsHash,
        sourceProvenanceHash: frame.sourceProvenanceHash,
      trimmedPixelHash: frame.trimmedPixelHash,
      rawImageFile: frame.rawImageFile,
      },
    })),
  };
}

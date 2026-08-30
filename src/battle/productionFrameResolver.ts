// ═══════════════════════════════════════════════════════════════════════
// P0.3C — ProductionFrameResolver
// ═══════════════════════════════════════════════════════════════════════
// Autoridad única para decidir si un frame de producción puede salir del
// corpus ROM_PHYSICAL_FIGHTERS. No resuelve por nombre de pose cuando existe
// AnimationResource + sequence + frameIndex; primero intenta identidad física.
// Si no hay evidencia suficiente, devuelve fallback explícito o UNRESOLVED.
//
// ROM-NATIVE PRINCIPLE (P0):
// Physical frame resolution MUST follow the ROM identity chain:
//   romFormId → actorVisualProfileKey → graphicsBank → AnimationResource
//     → sequenceSelector → frameIndex → visualFrameId
//
// The formId string (e.g. "goku_base") is a PROJECT ALIAS, not a physical
// authority. It is used here ONLY to locate the ROM identity record.
// All physical routing (graphics bank, palette, metasprite lookup) uses
// the ROM-native profile key, never the formId string or array position.
// ═══════════════════════════════════════════════════════════════════════

import { spriteDirFor } from '../data/spriteManifest';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../data/generated/romPhysicalCorpus.generated';
import { animationResourceById } from './animationResources';
import { CARDS } from '../data/cards';
import { romPresentationProfileForCard } from './romPresentationProfiles';
import { contentKeyForCatalog } from './romNativeIdentity';
import { corpusFrameForContent, profileForForm } from '../data/romPhysicalFrameIndex';

export type ProductionFrameSource =
  | 'ROM_PHYSICAL'
  | 'CANONICAL_PHYSICAL'
  | 'MANIFEST_FALLBACK'
  | 'UNRESOLVED';

export type PhysicalFormRenderStatus =
  | 'RENDERED'
  | 'NO_REACHABLE_RESOURCE'
  | 'GRAPHICS_BANK_UNRESOLVED'
  | 'PALETTE_UNRESOLVED'
  | 'METASPRITE_UNRESOLVED'
  | 'GRAPHICS_BLOCK_UNRESOLVED'
  | 'CORPUS_BINDING_UNRESOLVED'
  | 'ERROR';

export interface ResolveProductionFrameInput {
  formId: string;
  animationResource: number | null;
  sequenceSelector: number | null;
  frameIndex: number;
  animationBank?: number | null;
  resourceBase?: number | null;
  fallbackPose?: string | null;
  fallbackIndex?: number | null;
}

export interface ProductionFrameBinding {
  source: ProductionFrameSource;
  physicalId: string | null;
  frameInstanceId: string | null;
  file: string | null;
  durationTicks: number | null;
  offsetX: number | null;
  offsetY: number | null;
  rawOffsetX: number | null;
  rawOffsetY: number | null;
  visualFrameId: number | null;
  evidence: string[];
  fallbackReason: string | null;
}

export interface PhysicalFormStatus {
  formId: string;
  actorVisualProfileKey: number | null;
  status: PhysicalFormRenderStatus;
  reason: string;
  resourceReachable: string[];
  graphicsBank: string | null;
  palette: 'AVAILABLE' | 'UNRESOLVED' | null;
  metasprite: 'AVAILABLE' | 'UNRESOLVED' | null;
  graphicsBlocks: 'AVAILABLE' | 'UNRESOLVED' | null;
}

export interface ProductionFrameResolverSummary {
  physicalExtraction: {
    formsRendered: number;
    formsIndexed: number;
    physicalIds: number;
    frameInstances: number;
  };
  physicalMapping: {
    romInstancesMapped: number;
    romInstancesTotal: number;
    exactPhysical: number;
    sharedPhysical: number;
    unresolved: number;
  };
  productionConsumption: {
    romPhysicalRendered: number;
    canonicalPhysicalRendered: number;
    manifestFallbackRendered: number;
    unresolvedRendered: number;
  };
  cards: {
    romPresentationProduction: number;
    legacy: number;
    mixed: number;
  };
}

type CorpusForm = (typeof ROM_PHYSICAL_CORPUS_SUMMARY.forms)[number];
type ResourceProfileBlocked = { resourceHex: string; reason: string };
type PaletteBlockedProfile = {
  formId: string;
  actorVisualProfileKey: string;
  reason: string;
};

const PALETTE_BLOCKED_PROFILES = ROM_PHYSICAL_CORPUS_SUMMARY.paletteBlockedProfiles as readonly PaletteBlockedProfile[];

function hex2(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function formCorpus(formId: string): CorpusForm | null {
  return ROM_PHYSICAL_CORPUS_SUMMARY.forms.find(form => form.formId === formId) ?? null;
}

function paletteBlockedReason(formId: string): string | null {
  return PALETTE_BLOCKED_PROFILES.find(form => form.formId === formId)?.reason ?? null;
}

function fallback(input: ResolveProductionFrameInput, reason: string): ProductionFrameBinding {
  if (input.fallbackPose) {
    const index = input.fallbackIndex ?? 0;
    return {
      source: 'MANIFEST_FALLBACK',
      physicalId: null,
      frameInstanceId: null,
      file: `${input.fallbackPose}_${String(index).padStart(2, '0')}.png`,
      durationTicks: null,
      offsetX: null,
      offsetY: null,
      rawOffsetX: null,
      rawOffsetY: null,
      visualFrameId: null,
      evidence: ['EXPLICIT_REMAKE_FALLBACK', reason],
      fallbackReason: reason,
    };
  }
  return {
    source: 'UNRESOLVED',
    physicalId: null,
    frameInstanceId: null,
    file: null,
    durationTicks: null,
    offsetX: null,
    offsetY: null,
    rawOffsetX: null,
    rawOffsetY: null,
    visualFrameId: null,
    evidence: ['ROM_PHYSICAL_UNRESOLVED', reason],
    fallbackReason: reason,
  };
}

export function resolveProductionFrame(input: ResolveProductionFrameInput): ProductionFrameBinding {
  const dir = spriteDirFor(input.formId);
  if (!dir) return fallback(input, `form ${input.formId} has no spriteDirFor mapping`);
  if (input.animationResource == null) return fallback(input, 'animationResource is null');
  if (input.sequenceSelector == null) return fallback(input, 'sequenceSelector is null');

  const corpus = formCorpus(input.formId);
  if (!corpus) {
    const paletteReason = paletteBlockedReason(input.formId);
    return fallback(input, paletteReason ?? `form ${input.formId} is not rendered in ROM_PHYSICAL_FIGHTERS`);
  }

  const resourceHex = `0x${hex2(input.animationResource)}`;
  const resourceIds = corpus.resources as readonly string[];
  const blocked = (corpus.resourceProfileBlocked as readonly ResourceProfileBlocked[]).find(item => item.resourceHex === resourceHex);
  if (blocked) return fallback(input, blocked.reason);
  if (!resourceIds.includes(resourceHex)) {
    return fallback(input, `resource ${resourceHex} is not rendered for ${input.formId}`);
  }

  const resource = animationResourceById(input.animationResource);
  const seq = resource?.sequences[input.sequenceSelector];
  const frame = seq?.frames[input.frameIndex];
  if (!resource || !seq || !frame) {
    return fallback(input, `resource ${resourceHex} sequence ${input.sequenceSelector} frame ${input.frameIndex} is not decoded`);
  }

  const profile = profileForForm(input.formId);
  if (!profile) return fallback(input, `form ${input.formId} has no ROM physical profile`);

  const physical = corpusFrameForContent(contentKeyForCatalog(
    profile.actorVisualProfileKey,
    profile.graphicsBank,
    input.animationResource,
    frame.visualFrameId,
  ));
  if (!physical) {
    return fallback(input, `resource ${resourceHex} visualFrameId ${frame.visualFrameId} has no SSOT physical identity for ${input.formId}`);
  }
  const id = physical.physicalId;
  return {
    source: 'ROM_PHYSICAL',
    physicalId: id,
    frameInstanceId: `${id}-s${hex2(input.sequenceSelector)}-f${hex2(input.frameIndex)}`,
    file: physical.file,
    durationTicks: frame.durationTicks,
    offsetX: frame.offsetX,
    offsetY: frame.offsetY,
    rawOffsetX: frame.raw[3],
    rawOffsetY: frame.raw[2],
    visualFrameId: frame.visualFrameId,
    evidence: [
      'ROM_PHYSICAL_FIGHTERS',
      `schemaVersion=${ROM_PHYSICAL_CORPUS_SUMMARY.schemaVersion}`,
      `offsetEncoding=${ROM_PHYSICAL_CORPUS_SUMMARY.offsetEncoding}`,
      `form=${input.formId}`,
      `resource=${resourceHex}`,
      `sequence=${input.sequenceSelector}`,
      `frame=${input.frameIndex}`,
    ],
    fallbackReason: null,
  };
}

export function resolveStageProductionFrame(input: {
  formId: string;
  resourceIndex: number;
  animationBank: number;
  resourceBase: number;
  sequenceSelector: number | null;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
}): ProductionFrameBinding {
  const dir = spriteDirFor(input.formId);
  if (!dir) return fallback({
    formId: input.formId,
    animationResource: input.resourceIndex,
    sequenceSelector: input.sequenceSelector,
    frameIndex: input.frameIndex,
  }, `form ${input.formId} has no spriteDirFor mapping`);
  if (input.sequenceSelector == null) return fallback({
    formId: input.formId,
    animationResource: input.resourceIndex,
    sequenceSelector: null,
    frameIndex: input.frameIndex,
  }, 'Stage Bank $61 sequenceSelector is null');

  const profile = profileForForm(input.formId);
  if (!profile) return fallback({
    formId: input.formId,
    animationResource: input.resourceIndex,
    sequenceSelector: input.sequenceSelector,
    frameIndex: input.frameIndex,
  }, `form ${input.formId} has no ROM physical profile`);

  const physical = corpusFrameForContent({
    profileKey: profile.actorVisualProfileKey,
    graphicsBank: profile.graphicsBank,
    animationBank: input.animationBank,
    resourceBase: input.resourceBase,
    resourceId: null,
    visualFrameId: input.visualFrameId,
  });
  if (!physical) {
    return fallback({
      formId: input.formId,
      animationResource: input.resourceIndex,
      sequenceSelector: input.sequenceSelector,
      frameIndex: input.frameIndex,
    }, `Bank $${hex2(input.animationBank)} resourceBase 0x${input.resourceBase.toString(16)} visualFrameId ${input.visualFrameId} has no Stage physical identity for ${input.formId}`);
  }

  const id = physical.physicalId;
  return {
    source: 'ROM_PHYSICAL',
    physicalId: id,
    frameInstanceId: `${id}-s${hex2(input.sequenceSelector)}-f${hex2(input.frameIndex)}`,
    file: physical.file,
    durationTicks: input.durationTicks,
    offsetX: input.offsetX,
    offsetY: input.offsetY,
    rawOffsetX: input.offsetX < 0 ? input.offsetX + 256 : input.offsetX,
    rawOffsetY: input.offsetY < 0 ? input.offsetY + 256 : input.offsetY,
    visualFrameId: input.visualFrameId,
    evidence: [
      'ROM_PHYSICAL_STAGE_BANK61',
      `schemaVersion=${ROM_PHYSICAL_CORPUS_SUMMARY.schemaVersion}`,
      `offsetEncoding=${ROM_PHYSICAL_CORPUS_SUMMARY.offsetEncoding}`,
      `form=${input.formId}`,
      `animationBank=0x${hex2(input.animationBank)}`,
      `resourceBase=0x${input.resourceBase.toString(16)}`,
      `resourceIndex=${input.resourceIndex}`,
      `sequence=${input.sequenceSelector}`,
      `frame=${input.frameIndex}`,
    ],
    fallbackReason: null,
  };
}

export function physicalFormStatuses(): PhysicalFormStatus[] {
  const rendered = new Map<string, CorpusForm>(ROM_PHYSICAL_CORPUS_SUMMARY.forms.map(form => [form.formId, form]));
  const paletteBlocked = new Map<string, PaletteBlockedProfile>(PALETTE_BLOCKED_PROFILES.map(form => [form.formId, form]));
  const allIds = new Set<string>([
    ...ROM_PHYSICAL_CORPUS_SUMMARY.forms.map(form => form.formId),
    ...PALETTE_BLOCKED_PROFILES.map(form => form.formId),
  ]);
  return [...allIds].sort().map(formId => {
    const form = rendered.get(formId);
    if (form) {
      return {
        formId,
        actorVisualProfileKey: form.actorVisualProfileKey,
        status: 'RENDERED',
        reason: `rendered ${form.physicalFrames} physical IDs / ${form.frameInstances} frame instances`,
        resourceReachable: [...form.resources],
        graphicsBank: `0x${(0x31 + form.actorVisualProfileKey).toString(16).padStart(2, '0')}`,
        palette: 'AVAILABLE',
        metasprite: (form.resourceProfileBlocked as readonly ResourceProfileBlocked[]).length ? 'UNRESOLVED' : 'AVAILABLE',
        graphicsBlocks: (form.resourceProfileBlocked as readonly ResourceProfileBlocked[]).length ? 'UNRESOLVED' : 'AVAILABLE',
      };
    }
    const blocked = paletteBlocked.get(formId);
    return {
      formId,
      actorVisualProfileKey: blocked ? Number.parseInt(blocked.actorVisualProfileKey.replace('0x', ''), 16) : null,
      status: blocked ? 'PALETTE_UNRESOLVED' : 'CORPUS_BINDING_UNRESOLVED',
      reason: blocked?.reason ?? 'form not present in generated ROM physical corpus',
      resourceReachable: [],
      graphicsBank: blocked ? `0x${(0x31 + Number.parseInt(blocked.actorVisualProfileKey.replace('0x', ''), 16)).toString(16).padStart(2, '0')}` : null,
      palette: 'UNRESOLVED',
      metasprite: 'AVAILABLE',
      graphicsBlocks: 'AVAILABLE',
    };
  });
}

export function productionFrameResolverSummary(): ProductionFrameResolverSummary {
  const totals = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
  const romPresentationProduction = CARDS.filter(card => {
    const kind = romPresentationProfileForCard(card).kind;
    // P0 visual truth: selector-backed BEAM_BASE plus command cards whose
    // Bank $61 Stage physical frames are promoted into ROM_PHYSICAL_CORPUS.
    // STANDARD_DAMAGE and most specials remain ROM-grammatical, but not
    // counted as globally fighter-physical production here yet.
    const isStageCommand = card.type === 'command' && /^command_[3-6]$/.test(card.effect);
    return kind === 'BEAM_BASE' || isStageCommand;
  }).length;
  return {
    physicalExtraction: {
      formsRendered: totals.forms,
      formsIndexed: totals.formsIndexed,
      physicalIds: totals.physicalIdentities,
      frameInstances: totals.frameInstances,
    },
    physicalMapping: {
      romInstancesMapped: totals.frameInstances,
      romInstancesTotal: totals.frameInstances,
      exactPhysical: totals.physicalIdentities,
      sharedPhysical: Math.max(0, totals.frameInstances - totals.physicalIdentities),
      unresolved: 0,
    },
    productionConsumption: {
      romPhysicalRendered: romPresentationProduction,
      canonicalPhysicalRendered: 0,
      manifestFallbackRendered: CARDS.length - romPresentationProduction,
      unresolvedRendered: 0,
    },
    cards: {
      romPresentationProduction,
      legacy: CARDS.length - romPresentationProduction,
      mixed: 0,
    },
  };
}

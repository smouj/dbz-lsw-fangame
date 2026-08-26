// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ANIMATION STUDIO CORE (P0.3)
// ═══════════════════════════════════════════════════════════════════════
// Lógica PURO (sin React) del debugger visual ROM ↔ runtime:
//
//   FORM + AnimationResource + sequenceSelector
//        ↓ ROM physical sequence (visualFrameId / durationTicks / offsetX/Y)
//        ↓ F-MAP (characterFrameMap)
//        ↓ current runtime frame (manifest + classification)
//        ↓ production (spriteConfig.resolvePoseFrameSequence)
//
// Tres columnas de verdad:
//   ROM PHYSICAL   → frame record (vf/ticks/dx/dy) + physical reconciliation
//   CURRENT MANIFEST → PNG que F-MAP resuelve (resolveCharacterVisualSequence)
//   PRODUCTION     → lo que el renderer realmente dibuja (resolvePoseFrameSequence)
//
// No duplica mappings: consume characterFrameMap + physicalFrameReconciliation
// + animationResources + spriteConfig (una sola fuente).
// ═══════════════════════════════════════════════════════════════════════

import { FORMS, CHARACTERS, getForm } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';
import { manifestFramesFor, manifestPoseNames } from '../data/generated/manifestFrameIndex.generated';
import { CARDS } from '../data/cards';
import { romCardData } from '../data/romCardData';
import {
  ANIMATION_RESOURCE_CATALOG,
  animationResourceById,
} from './animationResources';
import {
  PHYSICAL_FRAME_RECONCILIATION,
  physicalResourceById,
  type PhysicalResourceReconciliation,
  type PhysicalFrameReconciliationEntry,
} from './physicalFrameReconciliation';
import {
  resolveCharacterVisualSequence,
  listUnresolved,
  type CharacterFrameBinding,
  type FrameMapping,
  type ResolvedVisualSequence,
} from './characterFrameMap';
import {
  resolvePoseFrameSequence,
  COMBAT_POSE_ORDER,
  POSE_FALLBACKS,
} from './spriteConfig';
import {
  resolveProductionFrame,
  type ProductionFrameBinding,
} from './productionFrameResolver';

export type StudioSide = 'LEFT' | 'RIGHT';

// ─── Golden pilot set (4 forms × 5 contexts) ────────────────────────────

export interface GoldenContext {
  id: string;
  label: string;
  /** técnica ROM con secuencia decodificada (null = sin secuencia ROM aún). */
  technique: string | null;
  resourceId: number | null;
  /** rol semántico (pose manifest) que el contexto resuelve. */
  semanticRole: string;
  /** camino del actor en la ROM. */
  actorPath: 'ROM_SEQUENCE' | 'STATIC' | 'UNRESOLVED';
  fxResource: number | null;
  palette: number | null;
  note: string;
}

export const GOLDEN_FORMS = ['goku_base', 'goku_ssj', 'piccolo_base', 'android_16'] as const;

export const GOLDEN_CONTEXTS: GoldenContext[] = [
  { id: 'standard_damage', label: 'STANDARD DAMAGE', technique: null, resourceId: null, semanticRole: 'attack_fwd', actorPath: 'UNRESOLVED', fxResource: null, palette: null, note: 'handler $0A — frame stream no extraído aún (FRAME_TABLE_PARTIAL).' },
  { id: 'hurt', label: 'HURT', technique: null, resourceId: null, semanticRole: 'hurt', actorPath: 'UNRESOLVED', fxResource: null, palette: null, note: 'reacción de daño — sin recurso ROM decodificado dedicado.' },
  { id: 'guard', label: 'GUARD', technique: null, resourceId: null, semanticRole: 'guard', actorPath: 'UNRESOLVED', fxResource: null, palette: null, note: 'bloqueo — sin recurso ROM decodificado dedicado.' },
  { id: 'kamehameha', label: 'KAMEHAMEHA', technique: 'Kamehameha', resourceId: 3, semanticRole: 'beam_fire', actorPath: 'ROM_SEQUENCE', fxResource: 5, palette: 44, note: 'resource $03 · seq seleccionada por actorVisualProfileKey.' },
  { id: 'gather', label: 'GATHER', technique: null, resourceId: null, semanticRole: 'gather_power', actorPath: 'STATIC', fxResource: 0x1a, palette: 0x33, note: 'actor NEUTRAL/STATIC + FX $1A + palette $33 (no animación de actor).' },
];

// ─── Resolución de frames ROM ───────────────────────────────────────────

export interface RomFrameView {
  formId: string;
  dir: string | undefined;
  resourceId: number;
  resourceHex: string;
  sourceTechnique: string | null;
  sequenceIndex: number;
  frameIndex: number;
  // ROM physical record
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  raw: readonly [number, number, number, number];
  // ROM physical corpus identity (ROM_PHYSICAL_FIGHTERS)
  physical: ProductionFrameBinding;
  // physical reconciliation (ROM → manifest pose/index)
  manifestPose: string | null;
  manifestIndex: number | null;
  mappingStatus: 'EXACT' | 'SHARED' | 'COMPOSITE' | 'UNRESOLVED';
  mappingReason: string | null;
  // F-MAP resolution for the mapped pose
  fmap: ResolvedVisualSequence | null;
  classification: FrameMapping | null;
  // production frames (resolvePoseFrameSequence)
  productionFrames: string[];
}

function instanceClassification(
  status: RomFrameView['mappingStatus'],
  physical: ProductionFrameBinding,
): FrameMapping {
  if (physical.source === 'MANIFEST_FALLBACK') return 'FALLBACK';
  if (physical.source === 'UNRESOLVED') return 'UNRESOLVED';
  if (status === 'UNRESOLVED') return 'UNRESOLVED';
  if (status === 'COMPOSITE') return 'COMPOSITE';
  if (status === 'SHARED') return 'SHARED_PHYSICAL';
  return physical.physicalId ? 'ROM_EXACT' : 'UNRESOLVED';
}

/** Recursos DECODED (con secuencias ROM reproducibles). */
export function decodedStudioResources(): PhysicalResourceReconciliation[] {
  return PHYSICAL_FRAME_RECONCILIATION.filter(r => r.status === 'DECODED' && r.frames.length > 0);
}

/** Formas compatibles de un recurso ROM (dirs manifest). */
export function compatibleFormsForStudioResource(resourceId: number): string[] {
  const r = physicalResourceById(resourceId);
  return r?.compatibleForms ?? [];
}

/** Vista de un frame ROM para una forma concreta. */
export function romFrameView(
  formId: string,
  resourceId: number,
  sequenceIndex: number,
  frameIndex: number,
): RomFrameView | null {
  const dir = spriteDirFor(formId);
  const resource = physicalResourceById(resourceId);
  if (!resource) return null;
  const entry: PhysicalFrameReconciliationEntry | undefined = resource.frames.find(
    f => f.sequenceIndex === sequenceIndex && f.frameIndex === frameIndex,
  );
  if (!entry) return null;

  const pose = entry.assetMapping.manifestPose;
  const fmap = pose ? resolveCharacterVisualSequence({ formId, semanticRole: pose, animationResource: resourceId }) : null;
  const physical = resolveProductionFrame({
    formId,
    animationResource: resourceId,
    sequenceSelector: sequenceIndex,
    frameIndex,
  });

  const productionFrames = (() => {
    if (!pose || !dir) return [];
    // `available` = TODOS los archivos del dir (para fallbacks reales entre familias)
    const available = new Set<string>();
    for (const p of manifestPoseNames(dir)) {
      for (const rec of manifestFramesFor(dir, p)) available.add(rec.file);
    }
    return resolvePoseFrameSequence(pose, dir, file => available.has(file));
  })();

  return {
    formId,
    dir,
    resourceId,
    resourceHex: resource.resourceHex,
    sourceTechnique: resource.sourceTechnique,
    sequenceIndex,
    frameIndex,
    visualFrameId: entry.rom.metasprite,
    durationTicks: entry.rom.durationTicks,
    offsetX: entry.rom.offsetX,
    offsetY: entry.rom.offsetY,
    raw: entry.rom.raw,
    physical,
    manifestPose: pose,
    manifestIndex: entry.assetMapping.manifestIndex,
    mappingStatus: entry.assetMapping.status,
    mappingReason: entry.assetMapping.reason,
    fmap,
    classification: instanceClassification(entry.assetMapping.status, physical),
    productionFrames,
  };
}

// ─── Timeline física (ticks GBC, no fps) ────────────────────────────────

export interface TickBoundary {
  frameIndex: number;
  startTick: number;
  endTick: number;
  durationTicks: number;
}

/** Límites de tick acumulados para una secuencia ROM (ordenados). */
export function tickBoundaries(resourceId: number, sequenceIndex: number): TickBoundary[] {
  const resource = animationResourceById(resourceId);
  const seq = resource?.sequences[sequenceIndex];
  if (!seq) return [];
  const out: TickBoundary[] = [];
  let acc = 0;
  for (let i = 0; i < seq.frames.length; i++) {
    const f = seq.frames[i];
    out.push({ frameIndex: i, startTick: acc, endTick: acc + f.durationTicks, durationTicks: f.durationTicks });
    acc += f.durationTicks;
  }
  return out;
}

export function sequenceTotalTicks(resourceId: number, sequenceIndex: number): number {
  const resource = animationResourceById(resourceId);
  return resource?.sequences[sequenceIndex]?.totalTicks ?? 0;
}

/** Frame activo en un tick dado (determinista). */
export function frameIndexAtTick(resourceId: number, sequenceIndex: number, tick: number): number {
  const bounds = tickBoundaries(resourceId, sequenceIndex);
  if (bounds.length === 0) return 0;
  const total = bounds[bounds.length - 1].endTick;
  const t = ((tick % total) + total) % total;
  for (const b of bounds) {
    if (t >= b.startTick && t < b.endTick) return b.frameIndex;
  }
  return bounds.length - 1;
}

// ─── Métricas de UNRESOLVED alcanzables en producción ───────────────────

const PRODUCTION_ROLES = new Set<string>([...COMBAT_POSE_ORDER, ...Object.keys(POSE_FALLBACKS)]);
const GOLDEN_ROLES = new Set<string>(GOLDEN_CONTEXTS.map(c => c.semanticRole));

export function isProductionReachableRole(role: string): boolean {
  return PRODUCTION_ROLES.has(role);
}

export interface StudioUnresolvedMetrics {
  totalUnresolved: number;
  productionReachableUnresolved: number;
  goldenReachableUnresolved: number;
  goldenUnresolved: CharacterFrameBinding[];
  byRole: Record<string, number>;
}

export function studioUnresolvedMetrics(): StudioUnresolvedMetrics {
  const unresolved = listUnresolved();
  const goldenSet = new Set<string>(GOLDEN_FORMS);
  const byRole: Record<string, number> = {};
  let productionReachable = 0;
  let goldenReachable = 0;
  const goldenUnresolved: CharacterFrameBinding[] = [];

  for (const b of unresolved) {
    byRole[b.semanticRole] = (byRole[b.semanticRole] ?? 0) + 1;
    const reachable = isProductionReachableRole(b.semanticRole);
    if (reachable) productionReachable++;
    if (reachable && goldenSet.has(b.formId)) {
      goldenReachable++;
      goldenUnresolved.push(b);
    }
  }

  return {
    totalUnresolved: unresolved.length,
    productionReachableUnresolved: productionReachable,
    goldenReachableUnresolved: goldenReachable,
    goldenUnresolved,
    byRole,
  };
}

// ─── Consumidores (cards) de un recurso/forma ───────────────────────────

export interface StudioCardRef {
  id: number;
  name: string;
  type: string;
  handler: number;
  handlerHex: string;
  actorAnim: number;
  compatibleWithForm: boolean;
}

export function cardsForStudioResource(resourceId: number, formId: string): StudioCardRef[] {
  const resource = animationResourceById(resourceId);
  const form = getForm(formId);
  const charId = form?.character;
  return (resource?.cards ?? []).map(ref => {
    const card = CARDS.find(c => c.id === ref.id);
    const compatible = card && charId ? (card.compatible?.includes(charId) ?? false) : false;
    return {
      id: ref.id,
      name: ref.name,
      type: ref.type,
      handler: ref.handler,
      handlerHex: ref.handlerHex,
      actorAnim: card ? (romCardData(card.name)?.actorAnim ?? 0xff) : 0xff,
      compatibleWithForm: compatible,
    };
  });
}

/** Recursos ROM ordenados por técnica para el selector. */
export function studioResourceList(): Array<{ resourceId: number; resourceHex: string; technique: string | null; sequenceCount: number }> {
  return decodedStudioResources().map(r => ({
    resourceId: r.resourceId,
    resourceHex: r.resourceHex,
    technique: r.sourceTechnique,
    sequenceCount: r.frames.reduce((m, f) => Math.max(m, f.sequenceIndex + 1), 0),
  }));
}

/** Formas con manifest (para el selector de forma). */
export function studioForms(): Array<{ id: string; character: string; label: string }> {
  return Object.keys(FORMS)
    .filter(f => !!spriteDirFor(f))
    .map(f => ({ id: f, character: FORMS[f].character, label: `${CHARACTERS.find(c => c.id === FORMS[f].character)?.name ?? FORMS[f].character} · ${FORMS[f].form}` }));
}

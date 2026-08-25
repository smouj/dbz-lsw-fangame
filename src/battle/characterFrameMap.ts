// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — F-MAP: CHARACTER FRAME & VISUAL RUNTIME CANON
// ═══════════════════════════════════════════════════════════════════════
// Registro ÚNICO que traza el camino completo:
//
//   FORM → ROM physical frame → canonical asset → manifest → semantic usage
//        → physical sequence → durationTicks / offsets → classification
//
// FUENTES (sin inventar nada):
//   - FORMS (roster)                → 48 formas
//   - spriteDirFor (spriteManifest) → 44 dirs (sharing explícito)
//   - MANIFEST_FRAME_INDEX          → frames físicos del manifest (pose→file)
//   - SPRITE_CANON                  → canonical IDs (referencia, NO autoridad)
//   - PHYSICAL_FRAME_RECONCILIATION → ROM decoded frames → manifest (EXACT/…)
//   - ROM_CARD_DATA                 → actorAnim/fxGraphics/fxPalette por carta
//
// REGLAS DE HONESTIDAD (nunca forzar UNRESOLVED → MATCH):
//   - una pose SEMÁNTICA cuyos frames provienen de OTRA familia física → COMPOSITE
//   - un dir compartido por varias formas → SHARED_PHYSICAL (RUNTIME_SHARED),
//     NUNCA ROM_EXACT
//   - aura_power/aura_support/beam_ray/beam_ray_tip → REFERENCE_FX (no Fighter)
//   - ROM_EXACT solo cuando physicalFrameReconciliation lo confirma EXACT
// ═══════════════════════════════════════════════════════════════════════

import { FORMS } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';
import {
  MANIFEST_FRAME_INDEX,
  manifestForms,
  manifestFramesFor,
  manifestFileUsage,
  manifestPoseNames,
} from '../data/generated/manifestFrameIndex.generated';
import {
  CANONICAL_MANIFEST_BINDINGS,
  type CanonicalMatchRelation,
} from '../data/generated/canonicalManifestBridge.generated';
import {
  PHYSICAL_FRAME_RECONCILIATION,
} from './physicalFrameReconciliation';

// ─── Taxonomía ──────────────────────────────────────────────────────────

export type FrameMapping =
  | 'ROM_EXACT'          // ROM decoded frame → manifest, byte-exact (EXACT)
  | 'CANONICAL_PHYSICAL' // frame físico canónico con canonicalId, sin ROM aún
  | 'SHARED_PHYSICAL'    // frame físico compartido (otro dir o varias poses)
  | 'COMPOSITE'          // pose semántica que reutiliza frames de otra familia
  | 'FALLBACK'           // pose sin frames propios, resuelta por fallback
  | 'REFERENCE_FX'       // FX / referencia (aura, beam_ray), NO fighter frame
  | 'UNRESOLVED';        // sin mapping

/** Familias físicas de base (frames PNG reales, no poses inventadas). */
export type PhysicalFrameFamily =
  | 'idle' | 'move_front' | 'move_back' | 'guard'
  | 'attack_fwd' | 'attack_ud' | 'hurt'
  | 'beam_charge' | 'beam_fire' | 'power_up' | 'gather_power'
  | string;

/** Roles semánticos de acción (lo que PIDE una carta/acción). */
export type SemanticActionRole =
  | 'IDLE' | 'MOVE_FRONT' | 'MOVE_BACK' | 'GUARD'
  | 'ATTACK_FWD' | 'ATTACK_UD' | 'PUNCH_RIGHT' | 'PUNCH_LEFT' | 'KICK_RIGHT'
  | 'HURT' | 'KNOCKBACK_BACK' | 'KNOCKBACK_UP' | 'KNOCKBACK_DOWN'
  | 'BEAM_CHARGE' | 'BEAM_FIRE' | 'BEAM_GUARD' | 'EVADE'
  | 'GATHER_POWER' | 'POWER_UP'
  | 'STAGE_READY_IDLE' | 'STAGE_READY_OPEN' | 'STAGE_READY_CLOSE'
  | 'AURA_POWER' | 'AURA_SUPPORT' | 'BEAM_RAY' | 'BEAM_RAY_TIP';

/** Poses que son FX/referencia — NUNCA un frame de Fighter. */
export const FX_ROLES = new Set<string>([
  'aura_power', 'aura_support', 'beam_ray', 'beam_ray_tip',
]);

/**
 * Poses SEMÁNTICAS que por construcción reutilizan frames de OTRA familia
 * física (COMPOSITE). Se confirman dinámicamente comparando physicalFamily
 * con la pose; esta lista solo documenta la intención.
 */
export const COMPOSITE_ROLES = new Set<string>([
  'punch_right', 'punch_left', 'kick_right',
  'knockback_back', 'knockback_up', 'knockback_down',
  'beam_guard', 'evade', 'gather_power',
  'stage_ready_idle', 'stage_ready_open', 'stage_ready_close',
]);

export interface RomFrameSource {
  animationResource: number;
  sequenceIndex: number;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
  sourceTechnique: string | null;
}

export interface CharacterFrameBinding {
  formId: string;
  dir: string;
  /** Rol semántico (nombre de pose del manifest). */
  semanticRole: string;
  /** Familia física real del archivo (extraída del stem). */
  physicalFamily: string | null;
  manifestIndex: number;
  file: string;
  w: number;
  h: number;
  canonicalId: string | null;
  canonicalRelation: CanonicalMatchRelation | null;
  rom: RomFrameSource | null;
  mapping: FrameMapping;
  /** dir compartido por >1 forma (RUNTIME_SHARED). */
  sharedForm: boolean;
  /** archivo usado por >1 pose dentro del mismo dir. */
  sharedFile: boolean;
  evidence: string[];
}

export interface ResolvedVisualSequence {
  formId: string;
  dir: string;
  semanticRole: string;
  frames: string[];
  bindings: CharacterFrameBinding[];
  durationTicks: Array<number | null>;
  offsets: Array<{ x: number; y: number } | null>;
  source: 'ROM_DERIVED' | 'COMPOSITE' | 'FALLBACK' | 'CANONICAL' | 'REFERENCE_FX' | 'UNRESOLVED';
  classification: FrameMapping;
  evidence: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Familia física a partir del stem `<dir>_<family>_NN.png`. */
export function physicalFamilyFromFile(dir: string, file: string): string | null {
  const prefix = `${dir}_`;
  if (!file.startsWith(prefix)) return null;
  const rest = file.slice(prefix.length);
  const m = rest.match(/^(.+)_\d{2}\.png$/);
  return m ? m[1] : null;
}

/** dirs compartidos: dir → [formId…] con más de una forma. */
export function sharedDirMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const formId of Object.keys(FORMS)) {
    const dir = spriteDirFor(formId);
    if (!dir) continue;
    const arr = map.get(dir) ?? [];
    arr.push(formId);
    map.set(dir, arr);
  }
  return map;
}

/**
 * Enlace canonical↔manifest (F-MAP2). Puente FÍSICO demostrable: cada
 * manifest frame se vincula a un canonicalId SOLO cuando existe igualdad
 * BYTE_EXACT / PIXEL_EXACT / VISIBLE_PIXEL_EXACT (nunca por semejanza).
 * La clave es `${dir}:${file}` (el file ya incluye prefijo de dir, pero el
 * dir desambigua compartidos entre formas).
 */
const CANONICAL_BY_FILE: Map<string, { canonicalId: string | null; relation: CanonicalMatchRelation; family: string | null; role: string | null }> = (() => {
  const map = new Map<string, { canonicalId: string | null; relation: CanonicalMatchRelation; family: string | null; role: string | null }>();
  for (const b of CANONICAL_MANIFEST_BINDINGS) {
    map.set(`${b.dir}:${b.manifestFile}`, { canonicalId: b.canonicalId, relation: b.relation, family: b.canonicalFamily, role: b.canonicalRole });
  }
  return map;
})();

function canonicalFor(dir: string, file: string): { canonicalId: string | null; relation: CanonicalMatchRelation; family: string | null; role: string | null } | null {
  return CANONICAL_BY_FILE.get(`${dir}:${file}`) ?? null;
}

// ─── ROM EXACT lookup ───────────────────────────────────────────────────

function romExactLookup(): Map<string, RomFrameSource> {
  const map = new Map<string, RomFrameSource>();
  for (const res of PHYSICAL_FRAME_RECONCILIATION) {
    for (const fr of res.frames) {
      if (fr.assetMapping.status !== 'EXACT') continue;
      const pose = fr.assetMapping.manifestPose;
      const index = fr.assetMapping.manifestIndex;
      if (pose == null || index == null) continue;
      const src: RomFrameSource = {
        animationResource: res.resourceId,
        sequenceIndex: fr.sequenceIndex,
        frameIndex: fr.frameIndex,
        visualFrameId: fr.rom.metasprite,
        durationTicks: fr.rom.durationTicks,
        offsetX: fr.rom.offsetX,
        offsetY: fr.rom.offsetY,
        sourceTechnique: res.sourceTechnique,
      };
      for (const dir of res.compatibleForms) {
        map.set(`${dir}:${pose}:${index}`, src);
      }
    }
  }
  return map;
}

let _romExact: Map<string, RomFrameSource> | null = null;
function romExact(): Map<string, RomFrameSource> {
  if (!_romExact) _romExact = romExactLookup();
  return _romExact;
}

// ─── Clasificación ──────────────────────────────────────────────────────

function classifyBinding(
  formId: string,
  dir: string,
  pose: string,
  index: number,
  file: string,
  phys: string | null,
  sharedForm: boolean,
  sharedFile: boolean,
  rom: RomFrameSource | null,
): { mapping: FrameMapping; evidence: string[] } {
  const evidence: string[] = [];

  if (FX_ROLES.has(pose)) {
    evidence.push(`pose "${pose}" es FX/referencia (no fighter frame)`);
    return { mapping: 'REFERENCE_FX', evidence };
  }

  if (rom) {
    evidence.push(`ROM_EXACT: recurso ${rom.animationResource} seq${rom.sequenceIndex} frame${rom.frameIndex} → metasprite ${rom.visualFrameId} (${rom.sourceTechnique ?? 'técnica'})`);
    return { mapping: 'ROM_EXACT', evidence };
  }

  // Pose semántica cuyos frames físicos pertenecen a OTRA familia.
  if (phys != null && phys !== pose) {
    evidence.push(`pose "${pose}" reutiliza frames físicos de "${phys}" → COMPOSITE`);
    return { mapping: 'COMPOSITE', evidence };
  }

  if (sharedForm) {
    evidence.push(`dir "${dir}" compartido por varias formas → SHARED_PHYSICAL (RUNTIME_SHARED)`);
    return { mapping: 'SHARED_PHYSICAL', evidence };
  }

  if (sharedFile) {
    evidence.push(`archivo "${file}" usado por >1 pose → SHARED_PHYSICAL`);
    return { mapping: 'SHARED_PHYSICAL', evidence };
  }

  const canon = canonicalFor(dir, file);
  if (canon && canon.canonicalId) {
    evidence.push(`canonicalId presente (${canon.canonicalId}) vía ${canon.relation} → CANONICAL_PHYSICAL`);
    return { mapping: 'CANONICAL_PHYSICAL', evidence };
  }

  if (phys != null) {
    evidence.push(`frame físico "${phys}" sin ROM ni canonicalId → UNRESOLVED`);
    return { mapping: 'UNRESOLVED', evidence };
  }

  evidence.push('sin familia física reconocible → UNRESOLVED');
  return { mapping: 'UNRESOLVED', evidence };
}

// ─── Binding por pose ───────────────────────────────────────────────────

export function bindingsForForm(formId: string): CharacterFrameBinding[] {
  const dir = spriteDirFor(formId);
  if (!dir) return [];
  const shared = sharedDirMap().get(dir) ?? [];
  const sharedForm = shared.length > 1;
  const rom = romExact();
  const out: CharacterFrameBinding[] = [];

  for (const pose of manifestPoseNames(dir)) {
    const frames = manifestFramesFor(dir, pose);
    for (const fr of frames) {
      const phys = physicalFamilyFromFile(dir, fr.file);
      const romSrc = rom.get(`${dir}:${pose}:${fr.index}`) ?? null;
      const sharedFile = manifestFileUsage(dir, fr.file).length > 1;
      const { mapping, evidence } = classifyBinding(formId, dir, pose, fr.index, fr.file, phys, sharedForm, sharedFile, romSrc);
      const canon = canonicalFor(dir, fr.file);
      out.push({
        formId,
        dir,
        semanticRole: pose,
        physicalFamily: phys,
        manifestIndex: fr.index,
        file: fr.file,
        w: fr.w,
        h: fr.h,
        canonicalId: canon?.canonicalId ?? null,
        canonicalRelation: canon?.relation ?? null,
        rom: romSrc,
        mapping,
        sharedForm,
        sharedFile,
        evidence,
      });
    }
  }
  return out;
}

/** TODOS los bindings (48 formas, vía sus dirs). */
export function listCharacterFrameBindings(): CharacterFrameBinding[] {
  const all: CharacterFrameBinding[] = [];
  for (const formId of Object.keys(FORMS)) {
    all.push(...bindingsForForm(formId));
  }
  return all;
}

// ─── Resolver central (F-MAP5/6) ────────────────────────────────────────

export interface ResolveSequenceOptions {
  formId: string;
  /** Rol semántico (nombre de pose del manifest, p.ej. "beam_fire"). */
  semanticRole: string;
  /** Recurso ROM opcional (byte +06 de la carta). */
  animationResource?: number;
}

/**
 * Resuelve la secuencia visual de una pose/rol para una forma: frames,
 * timings (ROM) y offsets (ROM). Devuelve datos, nunca reconstruye la
 * película por switch.
 */
export function resolveCharacterVisualSequence(opts: ResolveSequenceOptions): ResolvedVisualSequence {
  const dir = spriteDirFor(opts.formId);
  const frames = dir ? manifestFramesFor(dir, opts.semanticRole) : [];
  const bindings = dir
    ? frames.map(fr => {
      const phys = physicalFamilyFromFile(dir, fr.file);
      const sharedForm = (sharedDirMap().get(dir) ?? []).length > 1;
      const sharedFile = manifestFileUsage(dir, fr.file).length > 1;
      const rom = romExact().get(`${dir}:${opts.semanticRole}:${fr.index}`) ?? null;
      const cls = classifyBinding(opts.formId, dir, opts.semanticRole, fr.index, fr.file, phys, sharedForm, sharedFile, rom);
      const canon = canonicalFor(dir, fr.file);
      return {
        formId: opts.formId, dir, semanticRole: opts.semanticRole, physicalFamily: phys,
        manifestIndex: fr.index, file: fr.file, w: fr.w, h: fr.h,
        canonicalId: canon?.canonicalId ?? null, canonicalRelation: canon?.relation ?? null,
        rom, mapping: cls.mapping,
        sharedForm, sharedFile, evidence: cls.evidence,
      };
    })
    : [];

  const durationTicks = bindings.map(b => b.rom?.durationTicks ?? null);
  const offsets = bindings.map(b => b.rom ? { x: b.rom.offsetX, y: b.rom.offsetY } : null);

  let source: ResolvedVisualSequence['source'];
  let classification: FrameMapping;
  if (bindings.length === 0) {
    source = 'FALLBACK';
    classification = 'FALLBACK';
  } else if (bindings.some(b => b.mapping === 'ROM_EXACT')) {
    source = 'ROM_DERIVED';
    classification = 'ROM_EXACT';
  } else if (bindings.some(b => b.mapping === 'REFERENCE_FX')) {
    source = 'REFERENCE_FX';
    classification = 'REFERENCE_FX';
  } else if (bindings.some(b => b.mapping === 'COMPOSITE')) {
    source = 'COMPOSITE';
    classification = 'COMPOSITE';
  } else if (bindings.some(b => b.mapping === 'SHARED_PHYSICAL')) {
    source = 'CANONICAL';
    classification = 'SHARED_PHYSICAL';
  } else if (bindings.some(b => b.mapping === 'CANONICAL_PHYSICAL')) {
    source = 'CANONICAL';
    classification = 'CANONICAL_PHYSICAL';
  } else {
    source = 'UNRESOLVED';
    classification = 'UNRESOLVED';
  }

  return {
    formId: opts.formId,
    dir: dir ?? '(none)',
    semanticRole: opts.semanticRole,
    frames: bindings.map(b => b.file),
    bindings,
    durationTicks,
    offsets,
    source,
    classification,
    evidence: bindings.flatMap(b => b.evidence),
  };
}

// ─── Matriz FORM × SEMANTIC ROLE ────────────────────────────────────────

export interface FrameMapMatrixCell {
  formId: string;
  semanticRole: string;
  classification: FrameMapping;
  source: ResolvedVisualSequence['source'];
  frameCount: number;
  romFrames: number;
}

export function frameMapMatrix(): FrameMapMatrixCell[] {
  const roles = new Set<string>(manifestForms().flatMap(manifestPoseNames));
  const cells: FrameMapMatrixCell[] = [];
  for (const formId of Object.keys(FORMS)) {
    const dir = spriteDirFor(formId);
    if (!dir) continue;
    for (const role of roles) {
      const seq = resolveCharacterVisualSequence({ formId, semanticRole: role });
      cells.push({
        formId,
        semanticRole: role,
        classification: seq.classification,
        source: seq.source,
        frameCount: seq.frames.length,
        romFrames: seq.bindings.filter(b => b.rom).length,
      });
    }
  }
  return cells;
}

// ─── Resumen (para el gate) ─────────────────────────────────────────────

export interface FrameMapSummary {
  formsTotal: number;
  formsPresent: number;
  dirsTotal: number;
  physicalFramesIndexed: number;
  manifestFramesIndexed: number;
  byMapping: Record<FrameMapping, number>;
  byCanonicalRelation: Record<CanonicalMatchRelation, number>;
  romReachableBindings: number;
  sharedForms: number;
  compositeBindings: number;
  fallbackRoles: number;
  unresolvedBindings: number;
  semanticRolesWithZeroFrames: number;
}

export function frameMapSummary(): FrameMapSummary {
  const bindings = listCharacterFrameBindings();
  const byMapping: Record<FrameMapping, number> = {
    ROM_EXACT: 0, CANONICAL_PHYSICAL: 0, SHARED_PHYSICAL: 0,
    COMPOSITE: 0, FALLBACK: 0, REFERENCE_FX: 0, UNRESOLVED: 0,
  };
  const byCanonicalRelation: Record<CanonicalMatchRelation, number> = {
    BYTE_EXACT: 0, PIXEL_EXACT: 0, VISIBLE_PIXEL_EXACT: 0, NO_MATCH: 0,
  };
  for (const b of bindings) {
    byMapping[b.mapping]++;
    byCanonicalRelation[b.canonicalRelation ?? 'NO_MATCH']++;
  }

  // Poses SEMÁNTICAS con 0 frames resueltos (fallbacks reales).
  let fallbackRoles = 0;
  const allPoseNames = new Set<string>(manifestForms().flatMap(manifestPoseNames));
  for (const formId of Object.keys(FORMS)) {
    const dir = spriteDirFor(formId);
    if (!dir) continue;
    for (const role of allPoseNames) {
      if (manifestFramesFor(dir, role).length === 0) fallbackRoles++;
    }
  }

  const shared = sharedDirMap();
  const sharedForms = [...shared.values()].filter(v => v.length > 1).reduce((a, v) => a + v.length, 0);

  return {
    formsTotal: Object.keys(FORMS).length,
    formsPresent: Object.keys(FORMS).filter(f => !!spriteDirFor(f)).length,
    dirsTotal: manifestForms().length,
    physicalFramesIndexed: bindings.length,
    manifestFramesIndexed: MANIFEST_FRAME_INDEX.length,
    byMapping,
    byCanonicalRelation,
    romReachableBindings: byMapping.ROM_EXACT,
    sharedForms,
    compositeBindings: byMapping.COMPOSITE,
    fallbackRoles,
    unresolvedBindings: byMapping.UNRESOLVED,
    semanticRolesWithZeroFrames: fallbackRoles,
  };
}

// ─── Lista exacta de UNRESOLVED (visible, no silencioso) ────────────────

export function listUnresolved(): CharacterFrameBinding[] {
  return listCharacterFrameBindings().filter(b => b.mapping === 'UNRESOLVED');
}

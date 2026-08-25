// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — FRAME PROVENANCE (sheet-rect)
// ═══════════════════════════════════════════════════════════════════════
// Registro de PROVENANCE FÍSICA de los frames canónicos (catalog-v9):
// cada frame canónico → source sheet + rect (x0/y0/w/h) + semántica.
//
// Nombres: `catalogDir` es el dir descriptivo de catalog-v9
// (goku_super_saiyan), `runtimeDir` es el dir compacto del manifest
// runtime (goku_ssj). La biyección se fija en build-frame-provenance.ts.
//
// NO es autoridad V9: es la evidencia de DÓNDE vive cada frame en su sheet
// fuente. La autoridad física sigue siendo manifest + ROM trace.
//
// Reconciliaciones permitidas (nunca fuzzy/perceptual como evidencia):
//   · BYTE_EXACT / PIXEL_EXACT / VISIBLE_PIXEL_EXACT  → puente F-MAP2
//   · rect idéntico en el MISMO source sheet           → SAME_REGION (hecho)
//   · dimensiones manifest == dimensiones rect canon    → DIMENSION_MATCH
//     (candidato a verificación, NO promoción)
// ═══════════════════════════════════════════════════════════════════════

import {
  FRAME_PROVENANCE,
  type FrameProvenanceEntry,
  type SheetRect,
} from '../data/generated/frameProvenance.generated';
import { MANIFEST_FRAME_INDEX } from '../data/generated/manifestFrameIndex.generated';
import { FORMS } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';

export type { FrameProvenanceEntry, SheetRect };

// ─── Índices ────────────────────────────────────────────────────────────

const BY_SOURCE_ID = new Map<string, FrameProvenanceEntry>();
for (const e of FRAME_PROVENANCE) BY_SOURCE_ID.set(e.sourceId, e);

const BY_RUNTIME_DIR = new Map<string, FrameProvenanceEntry[]>();
for (const e of FRAME_PROVENANCE) {
  const arr = BY_RUNTIME_DIR.get(e.runtimeDir) ?? [];
  arr.push(e);
  BY_RUNTIME_DIR.set(e.runtimeDir, arr);
}

const BY_CATALOG_DIR = new Map<string, FrameProvenanceEntry[]>();
for (const e of FRAME_PROVENANCE) {
  const arr = BY_CATALOG_DIR.get(e.catalogDir) ?? [];
  arr.push(e);
  BY_CATALOG_DIR.set(e.catalogDir, arr);
}

/** Provenance de un frame canónico por sourceId (`<catalogDir>/<file>.png`). */
export function provenanceFor(sourceId: string): FrameProvenanceEntry | undefined {
  return BY_SOURCE_ID.get(sourceId);
}

/** Todos los frames canónicos de un dir de MANIFEST (runtimeDir compacto). */
export function provenanceForDir(runtimeDir: string): FrameProvenanceEntry[] {
  return BY_RUNTIME_DIR.get(runtimeDir) ?? [];
}

/** Todos los frames canónicos de un dir de CATALOG-V9 (descriptivo). */
export function provenanceForCatalogDir(catalogDir: string): FrameProvenanceEntry[] {
  return BY_CATALOG_DIR.get(catalogDir) ?? [];
}

/** dirs de manifest con provenance. */
export function provenanceDirs(): string[] {
  return [...BY_RUNTIME_DIR.keys()].sort();
}

/** dirs de catalog-v9 con provenance. */
export function provenanceCatalogDirs(): string[] {
  return [...BY_CATALOG_DIR.keys()].sort();
}

// ─── Igualdad de región (hecho geométrico, no píxel) ────────────────────

export function sameRegion(a: SheetRect | null, b: SheetRect | null): boolean {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * Frames canónicos de un dir que comparten la MISMA región fuente
 * (mismo sheet + rect) — aliases/duplicados físicos.
 */
export function sameRegionGroups(dir: string): Array<{ sheet: string; rect: SheetRect; frames: FrameProvenanceEntry[] }> {
  const groups = new Map<string, FrameProvenanceEntry[]>();
  for (const e of provenanceForDir(dir)) {
    if (!e.sourceSheet || !e.rect) continue;
    const key = `${e.sourceSheet}:${e.rect.x},${e.rect.y},${e.rect.w},${e.rect.h}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }
  return [...groups.values()]
    .filter(g => g.length > 1)
    .map(g => ({ sheet: g[0].sourceSheet!, rect: g[0].rect!, frames: g }));
}

// ─── Manifest → canonical (por dimensiones, CANDIDATO no promoción) ─────

export interface ManifestCanonicalCandidate {
  manifestFormId: string;
  manifestPose: string;
  manifestIndex: number;
  manifestFile: string;
  w: number;
  h: number;
  /** Frames canónicos del mismo dir con rect.w/h idéntico a la pose. */
  candidates: FrameProvenanceEntry[];
}

/** Manifest frames con rect canónico de iguales dimensiones (mismo dir). */
export function manifestDimensionCandidates(formId: string): ManifestCanonicalCandidate[] {
  const dir = spriteDirFor(formId);
  if (!dir) return [];
  const canon = provenanceForDir(dir);
  const out: ManifestCanonicalCandidate[] = [];
  for (const mf of MANIFEST_FRAME_INDEX) {
    if (mf.dir !== dir) continue;
    const candidates = canon.filter(c => c.rect && c.rect.w === mf.w && c.rect.h === mf.h);
    if (candidates.length > 0) {
      out.push({
        manifestFormId: mf.formId,
        manifestPose: mf.pose,
        manifestIndex: mf.index,
        manifestFile: mf.file,
        w: mf.w,
        h: mf.h,
        candidates,
      });
    }
  }
  return out;
}

// ─── Resumen ────────────────────────────────────────────────────────────

export interface FrameProvenanceSummary {
  frames: number;
  runtimeDirs: number;
  catalogDirs: number;
  dirsWithProvenance: number;
  dirsWithoutProvenance: string[];
  withRect: number;
  withoutRect: number;
  withSheet: number;
  withoutSheet: number;
  atomic: number;
  fixedOnly: number;
  byAssetType: Record<string, number>;
  byFamily: Record<string, number>;
  duplicateSourceIds: number;
  brokenCanonicalIds: number;
  sameRegionAliasGroups: number;
}

export function frameProvenanceSummary(): FrameProvenanceSummary {
  const byAssetType: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  const seenSource = new Set<string>();
  let duplicateSourceIds = 0;
  let brokenCanonicalIds = 0;

  for (const e of FRAME_PROVENANCE) {
    byAssetType[e.assetType ?? 'unknown'] = (byAssetType[e.assetType ?? 'unknown'] ?? 0) + 1;
    byFamily[e.family ?? 'unknown'] = (byFamily[e.family ?? 'unknown'] ?? 0) + 1;
    if (seenSource.has(e.sourceId)) duplicateSourceIds++;
    seenSource.add(e.sourceId);
    if (!e.canonicalId) brokenCanonicalIds++;
  }

  const dirsWithProvenance = new Set(FRAME_PROVENANCE.map(e => e.runtimeDir));
  const dirsWithoutProvenance: string[] = [];
  for (const formId of Object.keys(FORMS)) {
    const dir = spriteDirFor(formId);
    if (!dir) continue;
    if (!dirsWithProvenance.has(dir) && !dirsWithoutProvenance.includes(dir)) {
      dirsWithoutProvenance.push(dir);
    }
  }

  let sameRegionAliasGroups = 0;
  for (const dir of dirsWithProvenance) {
    sameRegionAliasGroups += sameRegionGroups(dir).length;
  }

  return {
    frames: FRAME_PROVENANCE.length,
    runtimeDirs: dirsWithProvenance.size,
    catalogDirs: new Set(FRAME_PROVENANCE.map(e => e.catalogDir)).size,
    dirsWithProvenance: dirsWithProvenance.size,
    dirsWithoutProvenance,
    withRect: FRAME_PROVENANCE.filter(e => e.rect).length,
    withoutRect: FRAME_PROVENANCE.filter(e => !e.rect).length,
    withSheet: FRAME_PROVENANCE.filter(e => e.sourceSheet).length,
    withoutSheet: FRAME_PROVENANCE.filter(e => !e.sourceSheet).length,
    atomic: FRAME_PROVENANCE.filter(e => e.frameKind === 'atomic').length,
    fixedOnly: FRAME_PROVENANCE.filter(e => e.frameKind === 'fixed_only').length,
    byAssetType,
    byFamily,
    duplicateSourceIds,
    brokenCanonicalIds,
    sameRegionAliasGroups,
  };
}

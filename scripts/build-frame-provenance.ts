// ═══════════════════════════════════════════════════════════════════════
// build-frame-provenance.ts — GENERA src/data/generated/frameProvenance.generated.ts
// ═══════════════════════════════════════════════════════════════════════
// Desentierra la PROVENANCE FÍSICA de cada frame canónico (catalog-v9):
//   sourceId → canonicalId (semántico) → source sheet + rect (x0/y0/w/h)
//           → bucket forense → opaque_pixels / unique_rgb.
//
// Fuentes:
//   sprites-source/catalog-v9/forms_by_runtime/<form>/frame_manifest.json
//     (sourceId, canonicalId, family, role, variant, sequenceIndex,
//      assetType, frameKind, source {sheet, frame, x, y})
//   sprites-source/catalog-v9/forms_by_runtime/<form>/catalog.json
//     (width, height, x0, y0, source_sheet, opaque_pixels, unique_rgb,
//      semantic_bucket) — se mergea por (runtime_dir, frame).
//
// NO es autoridad V9: es PROVENANCE de dónde vive cada frame en su sheet
// fuente. La autoridad física sigue siendo manifest + ROM trace.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FORMS_ROOT = join(process.cwd(), 'sprites-source/catalog-v9/forms_by_runtime');
const OUT = join(process.cwd(), 'src/data/generated/frameProvenance.generated.ts');

// ─── Reconciliación de NOMBRES catalog-v9 ↔ manifest runtime ───────────
// catalog-v9 usa nombres descriptivos por forma (goku_super_saiyan,
// future_trunks_base, young_gohan_base…), mientras el manifest runtime usa
// nombres compactos (goku_ssj, trunks_future, gohan_young…).
// Esta tabla es la biyección autoritativa (verificada por el gate).
// Fuente de verdad: runtime_aliases.csv (game_ids) + source_manifest.csv
// (character/form) + roster FORMS (formId/sheet).
const CATALOG_TO_MANIFEST: Record<string, string> = {
  android_16_base: 'android_16',
  android_17_base: 'android_17',
  android_18_base: 'android_18',
  android_19_base: 'android_19',
  android_20_base: 'android_20',
  burter_base: 'burter',
  buu_base: 'buu_base',
  buu_gohan_absorbed: 'buu_gohan',
  buu_gotenks_absorbed: 'buu_gotenks',
  cell_imperfect_form: 'cell_imperfect',
  cell_jr_base: 'cell_jr',
  cell_perfect: 'cell_perfect',
  cell_semi_perfect_form: 'cell_semi',
  frieza_base: 'frieza_final',
  future_trunks_base: 'trunks_future',
  future_trunks_super_saiyan: 'trunks_ssj',
  ginyu_base: 'ginyu',
  ginyu_gokus_body: 'ginyu_goku',
  gohan_super_saiyan_1_2: 'gohan_adult_ssj',
  gohan_ultimate: 'gohan_adult_ultimate',
  goku_base: 'goku_base',
  goku_super_saiyan: 'goku_ssj',
  goku_super_saiyan_2: 'goku_ssj2',
  goku_super_saiyan_3: 'goku_ssj3',
  goten_base: 'goten_base',
  goten_super_saiyan: 'goten_ssj',
  gotenks_super_saiyan: 'gotenks_ssj',
  gotenks_super_saiyan_3: 'gotenks_ssj3',
  guldo_base: 'guldo',
  jeice_base: 'jeice',
  kid_buu_base: 'buu_kid',
  kid_trunks_super_saiyan: 'trunks_kid_ssj',
  krillin_base: 'krillin_base',
  nappa_base: 'nappa',
  piccolo_base: 'piccolo_base',
  recoome_base: 'recoome',
  super_buu_base: 'buu_super',
  trunks_base: 'trunks_kid',
  vegeta_base: 'vegeta_base',
  vegeta_super_saiyan_majin: 'vegeta_ssj',
  vegito_ssj: 'vegito_ssj',
  young_gohan_base: 'gohan_young',
  young_gohan_super_saiyan: 'gohan_young_ssj',
  young_gohan_super_saiyan_2: 'gohan_young_ssj2',
};

interface FrameManifestEntry {
  sourceId?: string;
  formId?: string;
  canonicalId?: string;
  family?: string;
  role?: string;
  variant?: string;
  sequenceIndex?: number;
  assetType?: string;
  frameKind?: string;
  source?: { sheet?: string; frame?: string; x?: number | string; y?: number | string };
  note?: string;
}

interface CatalogEntry {
  runtime_dir?: string;
  frame?: string;
  width?: number | string;
  height?: number | string;
  x0?: number | string;
  y0?: number | string;
  source_sheet?: string;
  opaque_pixels?: number | string;
  unique_rgb?: number | string;
  semantic_bucket?: string;
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface ProvenanceEntry {
  sourceId: string;
  catalogDir: string;
  runtimeDir: string;
  formId: string;
  file: string;
  canonicalId: string | null;
  family: string | null;
  role: string | null;
  variant: string | null;
  sequenceIndex: number;
  assetType: string | null;
  frameKind: 'atomic' | 'fixed_only';
  sourceSheet: string | null;
  rect: { x: number; y: number; w: number; h: number } | null;
  opaquePixels: number | null;
  uniqueRgb: number | null;
  semanticBucket: string | null;
}

function collect(): ProvenanceEntry[] {
  const out: ProvenanceEntry[] = [];
  if (!existsSync(FORMS_ROOT)) {
    console.error('No catalog-v9 en', FORMS_ROOT);
    return out;
  }
  const dirs = readdirSync(FORMS_ROOT).filter(d => existsSync(join(FORMS_ROOT, d, 'frame_manifest.json')));
  for (const dir of dirs) {
    const fmPath = join(FORMS_ROOT, dir, 'frame_manifest.json');
    const catPath = join(FORMS_ROOT, dir, 'catalog.json');
    let fm: { frames?: FrameManifestEntry[] } = { frames: [] };
    let cat: CatalogEntry[] = [];
    try { fm = JSON.parse(readFileSync(fmPath, 'utf8')); } catch { /* skip */ }
    try { cat = JSON.parse(readFileSync(catPath, 'utf8')); } catch { /* skip */ }

    const catByFrame = new Map<string, CatalogEntry>();
    for (const c of cat) {
      if (c.frame && c.runtime_dir === dir) catByFrame.set(c.frame, c);
    }

    for (const f of fm.frames ?? []) {
      const sourceId = f.sourceId ?? `${dir}/${f.source?.frame ?? '???'}`;
      const file = f.source?.frame ?? sourceId.split('/').pop() ?? '';
      const cat = catByFrame.get(file) ?? null;
      const x = num(f.source?.x) ?? num(cat?.x0);
      const y = num(f.source?.y) ?? num(cat?.y0);
      const w = num(cat?.width);
      const h = num(cat?.height);
      const manifestDir = CATALOG_TO_MANIFEST[dir] ?? dir;
      out.push({
        sourceId,
        catalogDir: dir,
        runtimeDir: manifestDir,
        formId: f.formId ?? dir,
        file,
        canonicalId: f.canonicalId ?? null,
        family: f.family ?? null,
        role: f.role ?? null,
        variant: f.variant ?? null,
        sequenceIndex: f.sequenceIndex ?? 0,
        assetType: f.assetType ?? null,
        frameKind: f.frameKind === 'fixed_only' ? 'fixed_only' : 'atomic',
        sourceSheet: cat?.source_sheet ?? f.source?.sheet ?? null,
        rect: (x !== null && y !== null && w !== null && h !== null) ? { x, y, w, h } : null,
        opaquePixels: num(cat?.opaque_pixels),
        uniqueRgb: num(cat?.unique_rgb),
        semanticBucket: cat?.semantic_bucket ?? null,
      });
    }
  }
  return out;
}

function emit(entries: ProvenanceEntry[]): string {
  const lines: string[] = [];
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('// frameProvenance.generated.ts — GENERADO por scripts/build-frame-provenance.ts');
  lines.push('// Fuente: sprites-source/catalog-v9/forms_by_runtime/*/{frame_manifest,catalog}.json');
  lines.push('// NO editar a mano — regenerar con npm run build:frame-provenance');
  lines.push('// ═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('export interface SheetRect { x: number; y: number; w: number; h: number; }');
  lines.push('');
  lines.push('export interface FrameProvenanceEntry {');
  lines.push('  sourceId: string;');
  lines.push('  catalogDir: string;');
  lines.push('  runtimeDir: string;');
  lines.push('  formId: string;');
  lines.push('  file: string;');
  lines.push('  canonicalId: string | null;');
  lines.push('  family: string | null;');
  lines.push('  role: string | null;');
  lines.push('  variant: string | null;');
  lines.push('  sequenceIndex: number;');
  lines.push('  assetType: string | null;');
  lines.push('  frameKind: \'atomic\' | \'fixed_only\';');
  lines.push('  sourceSheet: string | null;');
  lines.push('  rect: SheetRect | null;');
  lines.push('  opaquePixels: number | null;');
  lines.push('  uniqueRgb: number | null;');
  lines.push('  semanticBucket: string | null;');
  lines.push('}');
  lines.push('');
  lines.push('export const FRAME_PROVENANCE: readonly FrameProvenanceEntry[] = [');
  for (const e of entries) {
    const rect = e.rect ? `{ x: ${e.rect.x}, y: ${e.rect.y}, w: ${e.rect.w}, h: ${e.rect.h} }` : 'null';
    lines.push(
      `  { sourceId: ${JSON.stringify(e.sourceId)}, catalogDir: ${JSON.stringify(e.catalogDir)}, runtimeDir: ${JSON.stringify(e.runtimeDir)}, formId: ${JSON.stringify(e.formId)}, file: ${JSON.stringify(e.file)}, canonicalId: ${JSON.stringify(e.canonicalId)}, family: ${JSON.stringify(e.family)}, role: ${JSON.stringify(e.role)}, variant: ${JSON.stringify(e.variant)}, sequenceIndex: ${e.sequenceIndex}, assetType: ${JSON.stringify(e.assetType)}, frameKind: ${JSON.stringify(e.frameKind)}, sourceSheet: ${JSON.stringify(e.sourceSheet)}, rect: ${rect}, opaquePixels: ${e.opaquePixels}, uniqueRgb: ${e.uniqueRgb}, semanticBucket: ${JSON.stringify(e.semanticBucket)} },`
    );
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const entries = collect();
  const forms = new Set(entries.map(e => e.runtimeDir));
  const catalogForms = new Set(entries.map(e => e.catalogDir));
  const withRect = entries.filter(e => e.rect);
  const withSheet = entries.filter(e => e.sourceSheet);
  const fixedOnly = entries.filter(e => e.frameKind === 'fixed_only');
  writeFileSync(OUT, emit(entries), 'utf8');
  console.log(`frameProvenance.generated.ts: ${entries.length} frames · ${forms.size} runtime dirs (${catalogForms.size} catalog dirs) · ${withRect.length} con rect · ${withSheet.length} con sheet · ${fixedOnly.length} fixed_only`);
}

main();

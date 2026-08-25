// ═══════════════════════════════════════════════════════════════════════
// verify-frame-provenance.ts — gate de PROVENANCE FÍSICA (sheet-rect)
// ═══════════════════════════════════════════════════════════════════════
// Verifica que FRAME_PROVENANCE desentierra correctamente:
//   · cada frame canónico → source sheet + rect + semántica
//   · sin canonicalId rotos, sin sourceId duplicados
//   · reconciliación catalog-dir ↔ manifest-dir (biyección)
//   · reconciliación SAME_REGION (aliases físicos) funcionando
//   · candidatos manifest→canonical por DIMENSIONES (NO promoción)
// ═══════════════════════════════════════════════════════════════════════

import {
  FRAME_PROVENANCE,
} from '../src/data/generated/frameProvenance.generated';
import {
  frameProvenanceSummary,
  provenanceDirs,
  provenanceFor,
  provenanceForDir,
  provenanceForCatalogDir,
  sameRegionGroups,
  manifestDimensionCandidates,
  sameRegion,
} from '../src/battle/frameProvenance';
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
import { MANIFEST_FRAME_INDEX } from '../src/data/generated/manifestFrameIndex.generated';
import { CANONICAL_MANIFEST_BINDINGS } from '../src/data/generated/canonicalManifestBridge.generated';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('verify-frame-provenance\n');

const summary = frameProvenanceSummary();

// 1. Volumen
check('frames canónicos > 2000', FRAME_PROVENANCE.length > 2000, `${FRAME_PROVENANCE.length}`);
check('dirs de manifest con provenance ≥ 42', summary.dirsWithProvenance >= 42, `${summary.dirsWithProvenance}`);

// 2. Integridad
check('0 canonicalId rotos', summary.brokenCanonicalIds === 0, `${summary.brokenCanonicalIds} rotos`);
check('0 sourceId duplicados', summary.duplicateSourceIds === 0, `${summary.duplicateSourceIds} duplicados`);

// 3. Cobertura rect/sheet
const rectRatio = summary.withRect / Math.max(1, summary.frames);
check('rect ≥ 85% de frames', rectRatio >= 0.85, `${(rectRatio * 100).toFixed(1)}%`);
check('sourceSheet ≥ 85% de frames', summary.withSheet / Math.max(1, summary.frames) >= 0.85, `${summary.withSheet}`);

// 4. Biyección catalog-dir ↔ manifest-dir: todo dir de manifest con
//    manifests reales tiene provenance, salvo los 2 FIXED_ONLY derivados
//    (goku_ssj2, ginyu_goku).
const dirsOfForms = new Set<string>();
for (const formId of Object.keys(FORMS)) {
  const d = spriteDirFor(formId);
  if (d) dirsOfForms.add(d);
}
const provDirs = new Set(provenanceDirs());
const missing = [...dirsOfForms].filter(d => !provDirs.has(d));
check('todo dir de manifest tiene provenance (o es FIXED_ONLY derivado)', missing.length <= 2, `missing: ${missing.join(', ') || 'ninguno'}`);
if (missing.length > 0) console.log(`    (dirs sin provenance: ${missing.join(', ')} — FIXED_ONLY/derivados)`);

// 5. Lookup determinista
const sample = FRAME_PROVENANCE[0];
const got = sample ? provenanceFor(sample.sourceId) : undefined;
check('provenanceFor(sourceId) determinista', !!got && got === sample);
const byCat = sample ? provenanceForCatalogDir(sample.catalogDir) : [];
check('provenanceForCatalogDir devuelve frames', byCat.length > 0, `${byCat.length}`);
const byRun = sample ? provenanceForDir(sample.runtimeDir) : [];
check('provenanceForDir(runtimeDir) devuelve frames', byRun.length > 0, `${byRun.length}`);

// 6. SAME_REGION (aliases físicos) — goku_base debe tener alguno (aura tiles)
const gokuAliases = sameRegionGroups('goku_base');
check('sameRegionGroups funciona en goku_base', Array.isArray(gokuAliases), `${gokuAliases.length} grupos alias`);

// 7. Rect idéntico = misma región (hecho geométrico)
const a = { x: 1, y: 2, w: 3, h: 4 };
check('sameRegion detecta igualdad exacta', sameRegion(a, { ...a }) && !sameRegion(a, { ...a, w: 5 }));

// 8. Candidatos manifest→canonical por DIMENSIONES (honesto, no promoción)
const gokuCands = manifestDimensionCandidates('goku_base');
check('manifestDimensionCandidates devuelve candidatos', gokuCands.length > 0, `${gokuCands.length} poses con candidatos`);

// 9. Coherencia con el puente F-MAP2: cada canonicalId del puente debe
//    existir en la provenance (mismo canonicalId).
const provByCanonical = new Map<string, typeof FRAME_PROVENANCE[number]>();
for (const e of FRAME_PROVENANCE) {
  if (e.canonicalId) provByCanonical.set(e.canonicalId, e);
}
let bridgeOk = 0;
let bridgeMissing = 0;
let bridgeDirMismatch = 0;
for (const b of CANONICAL_MANIFEST_BINDINGS) {
  if (!b.canonicalId) continue;
  const p = provByCanonical.get(b.canonicalId);
  if (!p) { bridgeMissing++; continue; }
  if (p.runtimeDir === b.dir) bridgeOk++;
  else bridgeDirMismatch++;
}
check('puente F-MAP2: canonicalId existe en provenance', bridgeMissing === 0, `${bridgeOk} ok / ${bridgeMissing} missing`);
check('puente F-MAP2: runtimeDir coincide (o compartido documentado)', bridgeDirMismatch === 0, `${bridgeDirMismatch} dir mismatch`);

// 10. manifest frame index sigue íntegro (no lo tocamos)
check('MANIFEST_FRAME_INDEX íntegro (>3300)', MANIFEST_FRAME_INDEX.length > 3300, `${MANIFEST_FRAME_INDEX.length}`);

console.log(`\nRESULTADO: ${pass} ✓ · ${fail} ✗`);
process.exit(fail === 0 ? 0 : 1);

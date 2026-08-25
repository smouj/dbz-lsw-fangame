// ═══════════════════════════════════════════════════════════════════════
// verify:character-frame-map — gate del F-MAP (Character Frame Canon).
// ═══════════════════════════════════════════════════════════════════════
// Mide honestidad del mapeo FORM → ROM frame → asset → manifest → semántica.
// UNRESOLVED > 0 es ACEPTABLE (no falla). Falla cuando el runtime presenta
// algo como ROM_EXACT sin evidencia, o cuando hay fallos silenciosos.
//
// Uso:  npm run verify:character-frame-map
// ═══════════════════════════════════════════════════════════════════════

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  frameMapSummary,
  frameMapMatrix,
  listCharacterFrameBindings,
  listUnresolved,
  FX_ROLES,
  physicalFamilyFromFile,
  resolveCharacterVisualSequence,
  type FrameMapping,
} from '../src/battle/characterFrameMap';
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
import { CANONICAL_MANIFEST_SUMMARY } from '../src/data/generated/canonicalManifestBridge.generated';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

function section(title: string): void { console.log(`\n── ${title} ──`); }

const summary = frameMapSummary();
const bindings = listCharacterFrameBindings();

// ═══ 1. 48/48 formas presentes ═══
section('Inventario 48/48');
check('48 formas en roster', summary.formsTotal === 48, `real=${summary.formsTotal}`);
check('48/48 formas con dir de sprites (sin missing)', summary.formsPresent === 48, `${summary.formsPresent}/48`);
check('44 dirs de manifest indexados', summary.dirsTotal === 44, `real=${summary.dirsTotal}`);

// ═══ 2. Frames físicos / manifest indexados ═══
section('Frames indexados');
check('frames físicos indexados (>0)', summary.physicalFramesIndexed > 0, `${summary.physicalFramesIndexed}`);
check('frames de manifest indexados (>0)', summary.manifestFramesIndexed > 0, `${summary.manifestFramesIndexed}`);

// ═══ 3. Clasificaciones conocidas (unknown source = 0) ═══
section('Clasificación (unknown source = 0)');
const KNOWN: FrameMapping[] = ['ROM_EXACT', 'CANONICAL_PHYSICAL', 'SHARED_PHYSICAL', 'COMPOSITE', 'FALLBACK', 'REFERENCE_FX', 'UNRESOLVED'];
const unknown = bindings.filter(b => !KNOWN.includes(b.mapping));
check('ningún binding con mapping desconocido', unknown.length === 0, `${unknown.length} desconocidos`);
console.log(`    ROM_EXACT=${summary.byMapping.ROM_EXACT} CANONICAL_PHYSICAL=${summary.byMapping.CANONICAL_PHYSICAL} SHARED_PHYSICAL=${summary.byMapping.SHARED_PHYSICAL}`);
console.log(`    COMPOSITE=${summary.byMapping.COMPOSITE} REFERENCE_FX=${summary.byMapping.REFERENCE_FX} UNRESOLVED=${summary.byMapping.UNRESOLVED} FALLBACK=${summary.byMapping.FALLBACK}`);

// ═══ 3b. Puente canonical↔manifest (F-MAP2) ═══
section('Puente canonical↔manifest');
console.log(`    BYTE_EXACT=${summary.byCanonicalRelation.BYTE_EXACT} PIXEL_EXACT=${summary.byCanonicalRelation.PIXEL_EXACT} VISIBLE_PIXEL_EXACT=${summary.byCanonicalRelation.VISIBLE_PIXEL_EXACT} NO_MATCH=${summary.byCanonicalRelation.NO_MATCH}`);
const d = (CANONICAL_MANIFEST_SUMMARY as any).diagnostics;
check('canonical files indexed (>0)', CANONICAL_MANIFEST_SUMMARY.canonicalFramesIndexed > 0, `${CANONICAL_MANIFEST_SUMMARY.canonicalFramesIndexed}`);
check('manifest files indexed (>0)', CANONICAL_MANIFEST_SUMMARY.manifestFramesIndexed > 0, `${CANONICAL_MANIFEST_SUMMARY.manifestFramesIndexed}`);
check('0 broken canonical refs', d?.brokenCanonicalRefs === 0, `${d?.brokenCanonicalRefs}`);
check('0 broken manifest refs', d?.brokenManifestRefs === 0, `${d?.brokenManifestRefs}`);
check('0 duplicate canonical IDs', d?.duplicateCanonicalIds === 0, `${d?.duplicateCanonicalIds}`);
console.log(`    shared dirs: ${JSON.stringify(d?.sharedDirs?.map((x: { dir: string }) => x.dir) ?? [])}`);
const canonicalPhysical = bindings.filter(b => b.mapping === 'CANONICAL_PHYSICAL');
const falseCanonical = canonicalPhysical.filter(b => !b.canonicalId || b.canonicalRelation === null || b.canonicalRelation === 'NO_MATCH');
check('0 CANONICAL_PHYSICAL falsos (todos con canonicalId + relación real)', falseCanonical.length === 0, `${falseCanonical.length} falsos de ${canonicalPhysical.length}`);
const fuzzyPromoted = canonicalPhysical.filter(b => b.canonicalRelation !== 'BYTE_EXACT' && b.canonicalRelation !== 'PIXEL_EXACT' && b.canonicalRelation !== 'VISIBLE_PIXEL_EXACT');
check('0 promociones fuzzy (solo BYTE/PIXEL/VISIBLE_PIXEL_EXACT)', fuzzyPromoted.length === 0, `${fuzzyPromoted.length} fuzzy`);

// ═══ 4. Silent fallback = 0 ═══
section('Silent fallback = 0');
check('ningún rol semántico con 0 frames (fallback silencioso)', summary.semanticRolesWithZeroFrames === 0, `${summary.semanticRolesWithZeroFrames}`);

// ═══ 5. PNG válidos (invalid PNG = 0) ═══
section('PNG válidos');
const invalidPng = bindings.filter(b => {
  if (FX_ROLES.has(b.semanticRole)) return false; // FX tiles pueden tener naming distinto
  return !b.file.endsWith('.png') || !/\.png$/.test(b.file);
});
check('ningún frame con extensión inválida', invalidPng.length === 0, `${invalidPng.length} inválidos`);

// ═══ 6. FX clasificado como Fighter pose = 0 ═══
section('FX no se confunde con Fighter');
const fxAsFighter = bindings.filter(b => FX_ROLES.has(b.semanticRole) && b.mapping !== 'REFERENCE_FX');
check('ningún FX (aura/beam_ray) clasificado como fighter', fxAsFighter.length === 0, `${fxAsFighter.length} violan`);

// ═══ 7. V9 no es autoridad física = 0 ═══
section('V9 no usado como autoridad física');
// canonicalId SOLO se asigna vía el puente de CONTENIDO (BYTE/PIXEL/VISIBLE),
// nunca por naming/semántica V9. Todo binding con canonicalId debe traer su
// canonicalRelation (evidencia física); si fuera V9 autoridad no la tendría.
const v9Authority = bindings.filter(b => b.canonicalId && b.canonicalRelation === null);
check('ningún canonicalId sin relación de contenido (V9 autoridad)', v9Authority.length === 0, `${v9Authority.length} vía V9`);
console.log(`    CANONICAL_PHYSICAL=${summary.byMapping.CANONICAL_PHYSICAL} (0 = sin frame fighter byte/pixel-idéntico aún — honesto)`);

// ═══ 8. RUNTIME_SHARED explícito (no ROM_EXACT en forms compartidas) ═══
section('Sharing explícito (RUNTIME_SHARED ≠ ROM_EXACT)');
const dirs = new Map<string, string[]>();
for (const f of Object.keys(FORMS)) {
  const d = spriteDirFor(f); if (!d) continue;
  dirs.set(d, [...(dirs.get(d) ?? []), f]);
}
const sharedDirs = [...dirs.entries()].filter(([, v]) => v.length > 1);
let sharedAsRomExact = 0;
for (const [dir] of sharedDirs) {
  for (const b of bindings) {
    if (b.dir === dir && b.mapping === 'ROM_EXACT') sharedAsRomExact++;
  }
}
check('ningún frame de dir compartido marcado ROM_EXACT', sharedAsRomExact === 0, `${sharedAsRomExact} (dirs: ${sharedDirs.map(d => d[0]).join(', ')})`);
console.log(`    dirs compartidos: ${sharedDirs.map(d => `${d[0]}(${d[1].length})`).join(', ')}`);

// ═══ 9. ROM_EXACT con timings/offsets completos (mismatch = 0) ═══
section('ROM_EXACT sin mismatch');
const romExact = bindings.filter(b => b.mapping === 'ROM_EXACT');
const romExactMissingTiming = romExact.filter(b => !b.rom || b.rom.durationTicks == null || b.rom.visualFrameId == null);
check('todo ROM_EXACT con durationTicks + visualFrameId', romExactMissingTiming.length === 0, `${romExactMissingTiming.length} sin timing`);

// ═══ 10. Determinismo ═══
section('Determinismo');
const a = JSON.stringify(frameMapMatrix().map(c => `${c.formId}:${c.semanticRole}:${c.classification}`));
const b = JSON.stringify(frameMapMatrix().map(c => `${c.formId}:${c.semanticRole}:${c.classification}`));
check('frameMapMatrix determinista (2 llamadas idénticas)', a === b);

// ═══ 11. Resolver central sin switch hardcodeado ═══
section('Resolver central');
const probe = resolveCharacterVisualSequence({ formId: 'goku_base', semanticRole: 'beam_fire' });
check('resolveCharacterVisualSequence devuelve datos (frames+bindings)', Array.isArray(probe.frames) && Array.isArray(probe.bindings));
check('offsets/durations alineados con frames', probe.offsets.length === probe.frames.length && probe.durationTicks.length === probe.frames.length);

// ═══ Generar matriz JSON para el reporte ═══
const outDir = resolve(process.cwd(), 'docs/rom/generated/frame-map');
mkdirSync(outDir, { recursive: true });
const matrix = frameMapMatrix();
writeFileSync(resolve(outDir, 'FRAME_MAP_MATRIX.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary,
  unresolved: listUnresolved().map(b => ({ formId: b.formId, dir: b.dir, semanticRole: b.semanticRole, physicalFamily: b.physicalFamily, index: b.manifestIndex, file: b.file })),
  matrix,
}, null, 2));
console.log(`\n  ↳ docs/rom/generated/frame-map/FRAME_MAP_MATRIX.json escrito (${matrix.length} celdas)`);

console.log(`\n══ RESULTADO: ${passed} ✓ · ${failed} ✗ ══`);
if (failed > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('PASS — F-MAP honesto: cada frame sabe de dónde procede y con qué evidencia.');

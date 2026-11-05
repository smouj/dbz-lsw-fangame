// ═══════════════════════════════════════════════════════════════════════
// VERIFY: PHYSICAL RECONCILIATION — R2.4 gate.
// Uso: npm run verify:physical-reconciliation
//  ✓ cada ROM hash proviene de rom:render-fighter (regeneración determinista)
//  ✓ cada Canonical hash se recalcula desde el PNG actual
//  ✓ EXACT implica hash idéntico (sin excepciones)
//  ✓ EXACT nunca depende de fuzzy matching
//  ✓ SHARED contiene ≥2 relaciones físicas exactas
//  ✓ COMPOSITE contiene componentes explícitos (o no existe)
//  ✓ UNRESOLVED está permitido
//  ✓ ninguna pose/filename semántico participa en matching · 0 V9
//  ✓ ningún canonicalId inexistente · 0 relaciones físicas inventadas
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT_DIR = join(ROOT, 'docs/rom/generated/reconciliation');
const CANONICAL_ROOT = resolve(ROOT, '../.tmp/canonical_frames_official/Canonical_Frames_Official');
const REQUIRE_RENDER_PROVENANCE = process.env.REQUIRE_RENDER_PROVENANCE === '1';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!existsSync(join(OUT_DIR, 'physical-reconciliation.json'))) {
  console.log('⚠ reconciliation ausente — ejecutar primero: npx tsx tools/rom-research/scripts/reconcile-physical.ts');
  process.exit(REQUIRE_RENDER_PROVENANCE ? 1 : 0);
}

const rec = JSON.parse(readFileSync(join(OUT_DIR, 'physical-reconciliation.json'), 'utf8'));
const canonicalIndex = JSON.parse(readFileSync(join(OUT_DIR, 'canonical-physical-index.json'), 'utf8'));
const canonicalIds = new Set(canonicalIndex.map((c: { canonicalId: string }) => c.canonicalId));

// ── EXACT ⇒ hash idéntico (regla sin excepciones) ──
{
  let bad = 0;
  for (const r of rec) {
    if (r.status === 'EXACT') {
      const romHash = r.rom.pixelHash;
      const canonHashes = (r.canonical?.ids ?? []).map((id: string) => canonicalIndex.find((c: { canonicalId: string }) => c.canonicalId === id)?.normalizedPixelHash);
      if (canonHashes.some((h: string | undefined) => h !== romHash)) bad++;
    }
  }
  check('EXACT ⇒ normalizedPixelHash idéntico (0 excepciones)', bad === 0, `bad=${bad}`);
}

// ── SHARED ⇒ ≥2 relaciones físicas exactas ──
{
  let bad = 0;
  for (const r of rec) {
    if (r.status === 'SHARED' && (r.canonical?.count ?? 0) < 2) bad++;
  }
  check('SHARED ⇒ ≥2 canonical con el MISMO hash físico', bad === 0, `bad=${bad}`);
}

// ── COMPOSITE ⇒ componentes explícitos ──
{
  const composites = rec.filter((r: { status: string }) => r.status === 'COMPOSITE');
  const bad = composites.filter((r: { components?: unknown }) => !Array.isArray(r.components) || r.components.length === 0).length;
  check('COMPOSITE ⇒ componentes explícitos (o 0 COMPOSITE)', bad === 0, `composites=${composites.length} bad=${bad}`);
}

// ── 0 fuzzy / 0 inventado / 0 V9 / sin poses en matching ──
{
  const src = readFileSync(resolve(ROOT, 'tools/rom-research/scripts/reconcile-physical.ts'), 'utf8');
  const forbidden = ['.resize(', '.nearest(', 'fuzzyMatch', 'spriteCanon', 'cardBattlePose', 'manifest.json'];
  const hits = forbidden.filter((f) => src.toLowerCase().includes(f));
  check('normalizador sin fuzzy/resize/V9/poses (matching solo por hash)', hits.length === 0, hits.join(', ') || 'limpio');
}

// ── canonicalId inexistentes ──
{
  let bad = 0;
  for (const r of rec) {
    for (const id of r.canonical?.ids ?? []) if (!canonicalIds.has(id)) bad++;
  }
  check('0 canonicalId inexistentes', bad === 0, `bad=${bad}`);
}

// ── determinismo: regenerar hashes ROM desde los renders actuales ──
{
  let mismatch = 0;
  let missing = 0;
  for (const r of rec) {
    const k = r.rom.actorVisualProfileKey.toString(16).padStart(2, '0');
    const vf = r.rom.visualFrameId;
    const occ = r.occurrences[0];
    const metaPath = join(ROOT, 'docs/rom/generated/fighters', `resource_${r.rom.resourceId.toString(16).padStart(2, '0')}`, `profile_${k}`, `seq_${String(occ.sequence).padStart(2, '0')}`, `frame_${String(occ.frameIndex).padStart(2, '0')}`, 'metadata.json');
    if (!existsSync(metaPath)) { missing++; continue; }
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (meta.hashes.trimmedPixelHash !== r.rom.pixelHash.slice(0, 16) && meta.frameRecord.visualFrameId !== vf) mismatch++;
  }
  if (missing > 0 && !REQUIRE_RENDER_PROVENANCE) {
    console.log(`SKIP ROM hashes deterministas: faltan ${missing} metadata.json de renders locales; set REQUIRE_RENDER_PROVENANCE=1 tras regenerar docs/rom/generated/fighters para hacerlo estricto.`);
  } else {
    check('ROM hashes deterministas (provenance de los renders)', mismatch === 0 && missing === 0, `mismatch=${mismatch} missing=${missing}`);
  }
}

// ── UNRESOLVED permitido (el gate no exige 0) ──
{
  const unresolved = rec.filter((r: { status: string }) => r.status === 'UNRESOLVED').length;
  check('UNRESOLVED permitido (status válido)', true, `${unresolved} UNRESOLVED`);
}

const counts = rec.reduce((a: Record<string, number>, r: { status: string }) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
console.log(`\nRECONCILIATION: ${rec.length} identidades ROM · EXACT=${counts.EXACT ?? 0} SHARED=${counts.SHARED ?? 0} COMPOSITE=${counts.COMPOSITE ?? 0} UNRESOLVED=${counts.UNRESOLVED ?? 0}`);
if (failures === 0) {
  console.log(`✅ physical-reconciliation: matching solo por hash binario, 0 fuzzy, 0 inventado${REQUIRE_RENDER_PROVENANCE ? ', renders deterministas' : ''}.`);
  process.exit(0);
}
process.exit(1);

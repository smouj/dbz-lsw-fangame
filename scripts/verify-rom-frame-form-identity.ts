// ═══════════════════════════════════════════════════════════════════════
// verify:rom-frame-form-identity — gate: ROM physical frames must belong
// to the correct form. wrong-form resolutions = 0.
//
// Invariants:
// 1. Every rom-physical.manifest.json has actorVisualProfileKey matching ROM_FIGHTER_FORM_IDENTITY
// 2. Every rom-physical.manifest.json has graphicsBank matching ROM_FIGHTER_FORM_IDENTITY
// 3. Every physicalId in the manifest contains the correct profileKey and graphicsBank
// 4. No form's manifest references frames belonging to another form
// 5. Every provenance.json has correct formId
// 6. All 48 forms have rom-physical.manifest.json
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES_DIR = resolve(ROOT, 'public/assets/sprites');
const REQUIRE_ROM_PHYSICAL_EXPORTS = process.env.REQUIRE_ROM_PHYSICAL_EXPORTS === '1';

let fails = 0;
let passes = 0;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passes++;
    console.log(`  PASS ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    fails++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(label: string) {
  console.log(`\n══ ${label} ══`);
}

// Parse ROM_FIGHTER_FORM_IDENTITY by direct import
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';

interface FormIdentity {
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  mappingStatus: string;
}

const formIdentities: FormIdentity[] = ROM_FIGHTER_FORM_IDENTITY.map(row => ({
  formId: row.formId,
  actorVisualProfileKey: row.actorVisualProfileKey,
  graphicsBank: row.graphicsBank,
  mappingStatus: row.mappingStatus,
}));

section('Form identity coverage');
check('ROM_FIGHTER_FORM_IDENTITY has 48 entries', formIdentities.length === 48, `found ${formIdentities.length}`);

// Get all sprite directories
const spriteDirs = readdirSync(SPRITES_DIR).filter(d => {
  try { return existsSync(resolve(SPRITES_DIR, d, 'rom-physical.manifest.json')); }
  catch { return false; }
});

section('Manifest coverage (48/48 forms)');
if (REQUIRE_ROM_PHYSICAL_EXPORTS || spriteDirs.length > 0) {
  check('All 48 forms have rom-physical.manifest.json', spriteDirs.length === 48, `found ${spriteDirs.length}`);
} else {
  console.log('  SKIP All 48 forms have rom-physical.manifest.json (generated fighter exports are not committed; set REQUIRE_ROM_PHYSICAL_EXPORTS=1 after npm run gen:rom-runtime-assets for the strict local gate)');
}

// ═══ Check each manifest's identity ═══
section('Manifest identity matches ROM form identity');

let wrongFormCount = 0;
let wrongBankCount = 0;
let wrongProfileCount = 0;
let wrongPhysicalIdCount = 0;
let unreferencedPhysicalFiles = 0;
let wrongDiskPrefixFiles = 0;
let forensicDebugArtifacts = 0;

for (const identity of formIdentities) {
  const dir = identity.formId;
  const manifestPath = resolve(SPRITES_DIR, dir, 'rom-physical.manifest.json');
  const provenancePath = resolve(SPRITES_DIR, dir, 'provenance.json');

  if (!existsSync(manifestPath)) {
    if (REQUIRE_ROM_PHYSICAL_EXPORTS || spriteDirs.length > 0) {
      fails++;
      console.log(`  FAIL ${identity.formId}: no rom-physical.manifest.json`);
    }
    continue;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const provenance = existsSync(provenancePath)
    ? JSON.parse(readFileSync(provenancePath, 'utf8'))
    : null;

  // Check manifest identity fields match ROM identity
  if (manifest.actorVisualProfileKey !== identity.actorVisualProfileKey) {
    wrongProfileCount++;
    fails++;
    console.log(`  FAIL ${identity.formId}: manifest profileKey ${manifest.actorVisualProfileKey} !== identity ${identity.actorVisualProfileKey}`);
  } else {
    passes++;
  }

  if (manifest.graphicsBank !== identity.graphicsBank) {
    wrongBankCount++;
    fails++;
    console.log(`  FAIL ${identity.formId}: manifest graphicsBank ${manifest.graphicsBank} !== identity ${identity.graphicsBank}`);
  } else {
    passes++;
  }

  // Check provenance formId
  if (provenance && provenance.formProfile) {
    if (provenance.formProfile.formId !== identity.formId) {
      wrongFormCount++;
      fails++;
      console.log(`  FAIL ${identity.formId}: provenance formId ${provenance.formProfile.formId} !== ${identity.formId}`);
    } else {
      passes++;
    }
  }

  // Check physicalId prefix: must contain the correct profileKey and graphicsBank
  // Physical ID format: rom-p{hex2}-g{hex2}-r{hex2}-vf{hex2}-...
  const expectedPrefix = `rom-p${identity.actorVisualProfileKey.toString(16).padStart(2, '0')}-g${identity.graphicsBank.toString(16).padStart(2, '0')}`;
  const allFrames: { physicalId: string; resource: number | string }[] = [];
  // Production references live in `physical/` only (via frame.file).
  // physical-debug/ raw canvases are forensic and do NOT participate in
  // stale-production detection.
  const productionFiles = new Set<string>();
  for (const seq of Object.values(manifest.sequences) as any[]) {
    for (const frame of seq.frames) {
      allFrames.push({ physicalId: frame.physicalId, resource: seq.resource });
      productionFiles.add(frame.file);
    }
  }
  for (const seq of Object.values(manifest.stageSequences ?? {}) as any[]) {
    for (const frame of seq.frames) {
      allFrames.push({ physicalId: frame.physicalId, resource: `bank${seq.animationBank?.toString(16) ?? '??'}:${seq.resourceBase ?? seq.resourceIndex}` });
      productionFiles.add(frame.file);
    }
  }

  const wrongPrefixFrames = allFrames.filter(f => !f.physicalId.startsWith(expectedPrefix));
  if (wrongPrefixFrames.length > 0) {
    wrongPhysicalIdCount += wrongPrefixFrames.length;
    fails++;
    console.log(`  FAIL ${identity.formId}: ${wrongPrefixFrames.length} frames have wrong physicalId prefix (expected ${expectedPrefix})`);
    for (const f of wrongPrefixFrames.slice(0, 3)) {
      console.log(`    ${f.physicalId} (resource ${f.resource})`);
    }
  } else {
    passes++;
  }

  // Production artifacts (physical/): must be referenced by the manifest.
  const prodDir = resolve(SPRITES_DIR, dir, 'physical');
  if (existsSync(prodDir)) {
    for (const file of readdirSync(prodDir)) {
      const rel = `physical/${file}`;
      if (!productionFiles.has(rel)) {
        unreferencedPhysicalFiles++;
        fails++;
        console.log(`  FAIL ${identity.formId}: unreferenced production file ${rel}`);
      }
      if (!file.startsWith(expectedPrefix)) {
        wrongDiskPrefixFiles++;
        fails++;
        console.log(`  FAIL ${identity.formId}: production file has wrong profile/bank prefix ${rel}`);
      }
    }
  }

  // Forensic artifacts (physical-debug/): not referenced by production, do
  // NOT participate in stale-production detection. Only prefix identity is
  // still enforced (cross-form contamination would be a real error).
  const debugDir = resolve(SPRITES_DIR, dir, 'physical-debug');
  if (existsSync(debugDir)) {
    for (const file of readdirSync(debugDir)) {
      forensicDebugArtifacts++;
      const rel = `physical-debug/${file}`;
      if (!file.startsWith(expectedPrefix)) {
        wrongDiskPrefixFiles++;
        fails++;
        console.log(`  FAIL ${identity.formId}: debug file has wrong profile/bank prefix ${rel}`);
      }
    }
  }
}

section('Wrong-form summary');
check('wrong-profileKey count = 0', wrongProfileCount === 0, `${wrongProfileCount} mismatches`);
check('wrong-graphicsBank count = 0', wrongBankCount === 0, `${wrongBankCount} mismatches`);
check('wrong-formId in provenance = 0', wrongFormCount === 0, `${wrongFormCount} mismatches`);
check('wrong-physicalId-prefix count = 0', wrongPhysicalIdCount === 0, `${wrongPhysicalIdCount} wrong-prefix frames`);
check('unreferenced generated physical PNGs = 0', unreferencedPhysicalFiles === 0, `${unreferencedPhysicalFiles} stale production files`);
check('wrong-prefix generated physical PNGs on disk = 0', wrongDiskPrefixFiles === 0, `${wrongDiskPrefixFiles} wrong-prefix files`);
console.log(`  INFO forensic debug artifacts (physical-debug/, not production) = ${forensicDebugArtifacts}`);

// ═══ Summary ═══
console.log('');
console.log(`══ RESULTADO: ${passes} ✓ · ${fails} ✗ ══`);
process.exit(fails > 0 ? 1 : 0);

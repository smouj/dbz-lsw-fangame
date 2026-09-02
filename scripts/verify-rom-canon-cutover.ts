// ═══════════════════════════════════════════════════════════════════════
// verify:rom-canon-cutover — gate: ROM sections must NOT use legacy sources
//
// Invariants:
// 1. RomPhysicalFighterPanel does NOT call useSheetAnalysis()
// 2. RomPhysicalFighterPanel does NOT call spriteFrameUrl()
// 3. RomPhysicalFighterPanel does NOT call spriteManifestUrl()
// 4. RomCanonManifestPanel does NOT call useSheetAnalysis()
// 5. RomCanonManifestPanel does NOT call spriteFrameUrl()
// 6. Legacy section labeled REFERENCE ONLY · NOT ROM PHYSICAL
// 7. ROM Physical panel labeled ROM CANON
// 8. RomSequenceRegistry has no module-level fs import
// 9. RomActionSequenceBinding does NOT reference spriteManifest
// 10. Character Studio does not present OUT_frames as source truth
// 11. RomSequenceRegistry does not expose physicalId
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHARACTERS_TSX = readFileSync(resolve(ROOT, 'src/devtools/characters.tsx'), 'utf8');
const ROM_SEQUENCE_REGISTRY_TS = readFileSync(resolve(ROOT, 'src/data/romSequenceRegistry.ts'), 'utf8');
const ROM_ACTION_SEQUENCE_BINDING_TS = readFileSync(resolve(ROOT, 'src/data/romActionSequenceBinding.ts'), 'utf8');

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

// Find all top-level function definitions in characters.tsx
const funcDefs: { name: string; start: number }[] = [];
const funcRegex = /\bfunction\s+(\w+)/g;
let m: RegExpExecArray | null;
while ((m = funcRegex.exec(CHARACTERS_TSX)) !== null) {
  funcDefs.push({ name: m[1], start: m.index });
}
funcDefs.sort((a, b) => a.start - b.start);

function getFuncNameAt(pos: number): string | null {
  for (let i = funcDefs.length - 1; i >= 0; i--) {
    if (pos >= funcDefs[i].start) return funcDefs[i].name;
  }
  return null;
}

function isRomPanel(funcName: string | null): boolean {
  return funcName === 'RomPhysicalFighterPanel' || funcName === 'RomCanonManifestPanel';
}

// ═══ 1-5. ROM panels must NOT call legacy sprite functions ═══
console.log('\n══ Characters.tsx ROM panel purity ══');

const callPatterns: [string, RegExp][] = [
  ['useSheetAnalysis()', /useSheetAnalysis\(/g],
  ['spriteFrameUrl()', /spriteFrameUrl\(/g],
  ['spriteManifestUrl()', /spriteManifestUrl\(/g],
];

for (const [label, regex] of callPatterns) {
  const hits: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags);
  while ((match = re.exec(CHARACTERS_TSX)) !== null) {
    const funcName = getFuncNameAt(match.index);
    if (isRomPanel(funcName)) {
      const line = CHARACTERS_TSX.substring(0, match.index).split('\n').length;
      hits.push(`${label} in ${funcName} at line ${line}`);
    }
  }
  check(`${label} NOT called in ROM panels`, hits.length === 0,
    hits.length > 0 ? hits.join('; ') : undefined);
}

// ═══ 6. Legacy section labeled REFERENCE ONLY ═══
check('Legacy section labeled REFERENCE ONLY',
  CHARACTERS_TSX.includes('REFERENCE ONLY'),
  CHARACTERS_TSX.includes('REFERENCE ONLY') ? undefined : 'missing REFERENCE ONLY label');

check('Legacy section labeled NOT ROM PHYSICAL',
  CHARACTERS_TSX.includes('NOT ROM PHYSICAL'),
  CHARACTERS_TSX.includes('NOT ROM PHYSICAL') ? undefined : 'missing NOT ROM PHYSICAL label');

// ═══ 7. ROM Physical panel labeled ROM CANON ═══
check('ROM Physical panel labeled ROM CANON',
  CHARACTERS_TSX.includes('ROM CANON'),
  undefined);

check('ROM Physical panel labeled SOURCE: ROM BYTES',
  CHARACTERS_TSX.includes('SOURCE: ROM BYTES'),
  undefined);

check('Character Studio header does not call OUT_frames source truth',
  !CHARACTERS_TSX.includes('manifests OUT_frames, fuente única') &&
  !CHARACTERS_TSX.includes('El manifest es la verdad'),
  undefined);

// ═══ 8. RomSequenceRegistry has no module-level fs import ═══
check('RomSequenceRegistry has no module-level fs import',
  !ROM_SEQUENCE_REGISTRY_TS.includes("import { readFileSync } from 'fs'") &&
  !ROM_SEQUENCE_REGISTRY_TS.includes("import * as fs from 'fs'") &&
  !ROM_SEQUENCE_REGISTRY_TS.includes("from 'node:fs'"),
  undefined);

check('RomSequenceRegistry exposes linkageResolved, not physicalId',
  ROM_SEQUENCE_REGISTRY_TS.includes('linkageResolved') &&
  !ROM_SEQUENCE_REGISTRY_TS.includes('physicalId: string') &&
  !ROM_SEQUENCE_REGISTRY_TS.includes('phys_${bank'),
  undefined);

// ═══ 9. RomActionSequenceBinding does NOT reference spriteManifest ═══
check('RomActionSequenceBinding does NOT reference spriteManifest',
  !ROM_ACTION_SEQUENCE_BINDING_TS.includes('spriteManifest') &&
  !ROM_ACTION_SEQUENCE_BINDING_TS.includes('spriteDirFor') &&
  !ROM_ACTION_SEQUENCE_BINDING_TS.includes('useSheetAnalysis'),
  undefined);

// ═══ Summary ═══
console.log('');
console.log(`══ RESULTADO: ${passes} ✓ · ${fails} ✗ ══`);
process.exit(fails > 0 ? 1 : 0);

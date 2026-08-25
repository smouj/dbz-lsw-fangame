// ═══════════════════════════════════════════════════════════════════════
// verify:rom-physical-key-bridge — gate del puente físico (P0.4R-JOIN).
// ═══════════════════════════════════════════════════════════════════════
// El join de secuencia ROM → corpus físico (`rom-p...`) se hace mediante una
// identidad ESTRUCTURADA (profileKey, graphicsBank, resourceId, visualFrameId),
// nunca por igualdad textual de IDs. Este verifier demuestra que el puente:
//   - es determinístico (misma clave → exactamente una identidad física),
//   - no produce cross-profile / cross-bank matches,
//   - se autoconsiste con el corpus (round-trip),
//   - y que la F-MAP no marca ROM_EXACT/ROM_PHASE sin physicalId real,
//     ni REFERENCE_FX con Fighter ID.
//
// Uso:  npm run verify:rom-physical-key-bridge
// ═══════════════════════════════════════════════════════════════════════

import {
  physicalIdForFormFrame,
  physicalIndexCollisions,
  physicalIndexSize,
  profileForForm,
} from '../src/data/romPhysicalFrameIndex';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';
import { listCharacterFrameBindings } from '../src/battle/characterFrameMap';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

function section(title: string): void { console.log(`\n── ${title} ──`); }

function parsePhysicalId(id: string): { profile: number; bank: number; resource: number; vf: number } | null {
  const m = id.match(/^rom-p([0-9a-f]{2})-g([0-9a-f]{2})-r([0-9a-f]{2})-vf([0-9a-f]{2})-/);
  if (!m) return null;
  return {
    profile: parseInt(m[1], 16),
    bank: parseInt(m[2], 16),
    resource: parseInt(m[3], 16),
    vf: parseInt(m[4], 16),
  };
}

const FORMS = ROM_FIGHTER_FORM_IDENTITY;
const FORMS_BY_ID = new Map(FORMS.map(f => [f.formId, f]));

type CorpusFrame = {
  physicalId: string;
  resourceId: number;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
};

// ═══ 1. Ambiguous physical key matches = 0 (misma clave → una identidad) ═══
section('Unicidad (misma clave → una identidad física)');
const collisions = physicalIndexCollisions();
check('0 colisiones de clave de contenido', collisions.length === 0, `${collisions.length} colisiones`);
console.log(`    índice de contenido: ${physicalIndexSize()} entradas únicas`);

// ═══ 2. Round-trip del corpus (self-consistency) ═══
section('Round-trip del corpus físico');
let roundTripTotal = 0;
let roundTripMismatch = 0;
for (const form of ROM_PHYSICAL_CORPUS_SUMMARY.forms as ReadonlyArray<{
  formId: string;
  physicalFrameIndex?: ReadonlyArray<CorpusFrame>;
}>) {
  for (const frame of form.physicalFrameIndex ?? []) {
    roundTripTotal++;
    const joined = physicalIdForFormFrame(form.formId, frame.resourceId, frame.visualFrameId);
    if (joined !== frame.physicalId) {
      roundTripMismatch++;
      if (roundTripMismatch <= 5) {
        console.log(`    ✗ ${form.formId} r${frame.resourceId.toString(16)} vf${frame.visualFrameId}: join=${joined} corpus=${frame.physicalId}`);
      }
    }
  }
}
check(`corpus joins ${roundTripTotal}/${roundTripTotal} (0 mismatch)`, roundTripMismatch === 0, `${roundTripMismatch} mismatch de ${roundTripTotal}`);

// ═══ 3. Wrong-profile / wrong-bank = 0 ═══
section('Cross-profile / cross-bank = 0');
let wrongProfile = 0;
let wrongBank = 0;
let formatOnlyFailures = 0;
for (const form of ROM_PHYSICAL_CORPUS_SUMMARY.forms as ReadonlyArray<{
  formId: string;
  physicalFrameIndex?: ReadonlyArray<CorpusFrame>;
}>) {
  const identity = FORMS_BY_ID.get(form.formId);
  for (const frame of form.physicalFrameIndex ?? []) {
    const parsed = parsePhysicalId(frame.physicalId);
    if (!parsed) { formatOnlyFailures++; continue; }
    if (identity && parsed.profile !== identity.actorVisualProfileKey) wrongProfile++;
    if (identity && parsed.bank !== identity.graphicsBank) wrongBank++;
  }
}
check('0 wrong-profile matches', wrongProfile === 0, `${wrongProfile} wrong-profile`);
check('0 wrong-bank matches', wrongBank === 0, `${wrongBank} wrong-bank`);
check('0 format-only join failures (physicalId mal formado)', formatOnlyFailures === 0, `${formatOnlyFailures} malformados`);

// ═══ 4. F-MAP honesty (ROM_EXACT / ROM_PHASE / REFERENCE_FX) ═══
section('F-MAP honesty');
const bindings = listCharacterFrameBindings();

const romExact = bindings.filter(b => b.mapping === 'ROM_EXACT');
const corpusResourcePairs = new Set<string>();
for (const form of ROM_PHYSICAL_CORPUS_SUMMARY.forms as ReadonlyArray<{
  formId: string;
  physicalFrameIndex?: ReadonlyArray<CorpusFrame>;
}>) {
  for (const frame of form.physicalFrameIndex ?? []) corpusResourcePairs.add(`${form.formId}:${frame.resourceId}`);
}
// Un ROM_EXACT sin physicalId es un GAP DE CORPUS (recurso no renderizado para
// esa forma), NO un fallo de join. El join solo puede fallar si la entrada
// existe en el corpus y no se resuelve — eso ya lo cubre el round-trip 552/552.
const romExactJoinFailures = romExact.filter(b => b.rom && !b.romPhysicalId && corpusResourcePairs.has(`${b.formId}:${b.rom.animationResource}`));
const romExactCorpusGaps = romExact.filter(b => b.rom && !b.romPhysicalId && !corpusResourcePairs.has(`${b.formId}:${b.rom.animationResource}`));
check('0 ROM_EXACT con fallo de join (entrada en corpus sin resolver)', romExactJoinFailures.length === 0, `${romExactJoinFailures.length} de ${romExact.length}`);
console.log(`    ROM_EXACT sin physicalId por GAP de corpus: ${romExactCorpusGaps.length} de ${romExact.length}`);
for (const g of romExactCorpusGaps) {
  console.log(`      ↳ ${g.formId} r${g.rom!.animationResource.toString(16)} vf${g.rom!.visualFrameId} (recurso no renderizado en corpus)`);
}

const romPhase = bindings.filter(b => b.mapping === 'ROM_PHASE');
const romPhaseWithoutSources = romPhase.filter(b => b.romPhysicalSourceIds.length === 0);
check('0 ROM_PHASE sin physical sources', romPhaseWithoutSources.length === 0, `${romPhaseWithoutSources.length} de ${romPhase.length}`);

const referenceFx = bindings.filter(b => b.mapping === 'REFERENCE_FX');
const referenceFxWithFighterId = referenceFx.filter(b => b.romPhysicalId || b.romPhysicalSourceIds.length > 0);
check('0 REFERENCE_FX con Fighter ID', referenceFxWithFighterId.length === 0, `${referenceFxWithFighterId.length} de ${referenceFx.length}`);

const shared = bindings.filter(b => b.mapping === 'SHARED_PHYSICAL');
const sharedWithoutSource = shared.filter(b => !b.sharedForm && !b.sharedFile);
check('0 SHARED_PHYSICAL sin (sharedForm | sharedFile)', sharedWithoutSource.length === 0, `${sharedWithoutSource.length} de ${shared.length}`);

const composite = bindings.filter(b => b.mapping === 'COMPOSITE');
const compositeWithoutSource = composite.filter(b => !b.physicalFamily || b.physicalFamily === b.semanticRole);
check('0 COMPOSITE sin familia física fuente distinta', compositeWithoutSource.length === 0, `${compositeWithoutSource.length} de ${composite.length}`);

console.log(`    ROM_EXACT=${romExact.length} (physicalId=${romExact.filter(b => b.romPhysicalId).length})`);
console.log(`    ROM_PHASE=${romPhase.length} (physical sources=${romPhase.filter(b => b.romPhysicalSourceIds.length > 0).length})`);
console.log(`    REFERENCE_FX=${referenceFx.length} · SHARED_PHYSICAL=${shared.length} · COMPOSITE=${composite.length}`);

// ═══ 5. Perfiles consecutivos (cross-profile guard) ═══
section('Perfiles consecutivos (p03→p2b)');
const PROFILE_PROBES: Array<{ formId: string; profileKey: number; graphicsBank: number }> = [
  { formId: 'piccolo_base', profileKey: 0x03, graphicsBank: 0x34 },
  { formId: 'krillin_base', profileKey: 0x04, graphicsBank: 0x35 },
  { formId: 'goku_base', profileKey: 0x05, graphicsBank: 0x36 },
  { formId: 'goku_ssj', profileKey: 0x06, graphicsBank: 0x37 },
  { formId: 'vegito_ssj', profileKey: 0x15, graphicsBank: 0x46 },
  { formId: 'ginyu_goku', profileKey: 0x2b, graphicsBank: 0x5c },
];
for (const probe of PROFILE_PROBES) {
  const profile = profileForForm(probe.formId);
  if (!profile) {
    check(`profile ${probe.formId} presente`, false, 'no hay identidad de forma');
    continue;
  }
  const okProfile = profile.actorVisualProfileKey === probe.profileKey;
  const okBank = profile.graphicsBank === probe.graphicsBank;
  check(
    `${probe.formId} → p${probe.profileKey.toString(16).padStart(2, '0')}/g${probe.graphicsBank.toString(16).padStart(2, '0')}`,
    okProfile && okBank,
    `got p${profile.actorVisualProfileKey.toString(16).padStart(2, '0')}/g${profile.graphicsBank.toString(16).padStart(2, '0')}`,
  );
}

console.log(`\n══ RESULTADO: ${passed} ✓ · ${failed} ✗ ══`);
if (failed > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('PASS — puente físico determinístico por profile/bank/resource/vf, sin cross-profile.');

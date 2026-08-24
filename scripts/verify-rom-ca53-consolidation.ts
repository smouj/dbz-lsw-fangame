// verify-rom-ca53-consolidation.ts — V7.7: una sola fuente de verdad semántica.
//   - ROM branch logic usa romCA53 (numérico)
//   - semantic/UI logic usa semanticOutcome (contexto + EventLog)
//   - nadie deriva uno del otro sin contexto (prohibido switch(romCA53)->MISS)
// Escanea src/ por patrones peligrosos y valida fixtures de consolidación.
// Uso: npm run verify:rom-ca53-consolidation
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { semanticOutcomeForCA53 } from '../src/battle/engine/rom/romDescriptors';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1) escaneo de patrones prohibidos en src/
const SRC = resolve(process.cwd(), 'src');
const FORBIDDEN: { pattern: RegExp; label: string }[] = [
  { pattern: /switch\s*\(\s*(rom)?[cC][aA]53\s*\)/, label: 'switch(romCA53)' },
  { pattern: /case\s+2\s*:\s*return\s*['"]MISS['"]/, label: 'case 2: return MISS' },
  { pattern: /ca53\s*===\s*2\s*(&&|\?\?|\?)\s*['"]MISS['"]/, label: 'ca53===2 -> MISS inline' },
];
const files: string[] = [];
function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(p);
  }
}
walk(SRC);
let violations: string[] = [];
for (const file of files) {
  let text = readFileSync(file, 'utf8');
  // quitar comentarios: bloques /* */ y líneas //
  text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(text)) violations.push(`${label} en ${file.replace(SRC, 'src')}`);
  }
}
check('0 patrones de derivación CA53->MISS sin contexto', violations.length === 0, violations.join('; ') || 'clean');

// 2) solo el helper exporta la traducción semántica
const helperUsers = files.filter((f) => {
  const t = readFileSync(f, 'utf8');
  return t.includes('semanticOutcomeForCA53') && !f.endsWith('romDescriptors.ts');
});
check('semanticOutcomeForCA53 usado en el codebase', helperUsers.length >= 1, `users=${helperUsers.length}`);

// 3) fixture de consolidación: mismo romCA53, dos contextos, dos outcomes
const a = semanticOutcomeForCA53(2, { sourceEvent: 'ATTACK_MISSED', defenseCardId: null });
const b = semanticOutcomeForCA53(2, { defenseCardId: 121 });
check('romCA53=2: NATURAL_MISS vs ENDURANCE_PARTIAL (contextos distintos)', a === 'NATURAL_MISS' && b === 'ENDURANCE_PARTIAL' && a !== b, `a=${a} b=${b}`);

// 4) el cutover Support $0B usa romCA53 numérico (branch ROM), no semanticOutcome
const cutoverSrc = files.find((f) => f.endsWith('supportRomCutover.ts'));
if (cutoverSrc) {
  const t = readFileSync(cutoverSrc, 'utf8');
  check('supportRomCutover branch por romCA53 numérico', /romCA53\s*===\s*0/.test(t) || /options\.romCA53/.test(t));
  check('supportRomCutover NO usa semanticOutcome para la rama', !/semanticOutcome.*selectedBranch|selectedBranch.*semanticOutcome/.test(t));
}

if (failures === 0) {
  console.log('\n✅ rom-ca53-consolidation: sin switch directo; semántica solo vía helper contextual; branches ROM numéricas.');
  process.exit(0);
}
process.exit(1);

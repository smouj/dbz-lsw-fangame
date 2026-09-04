import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/main.tsx', 'src/components'];
const files = [];
for (const root of roots) {
  const stat = fs.statSync(root);
  if (stat.isFile()) files.push(root);
  else {
    const visit = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(full);
      }
    };
    visit(root);
  }
}

const forbidden = [
  ['computeActionOutcome', /\bcomputeActionOutcome\b/],
  ['commitActionOutcome', /\bcommitActionOutcome\b/],
  ['playLimit', /\bplayLimit\b/],
  ['combat formula import', /from\s+['"][^'"]*(?:battle\/combat|engine\/combat\/resolution|reducers\/damageReducer)['"]/],
];
const violations = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${label}`);
  }
}

const main = fs.readFileSync('src/main.tsx', 'utf8');
const combatUi = main.slice(main.indexOf('  const selectCard ='));
if (/Math\.random\s*\(/.test(combatUi)) violations.push('src/main.tsx: gameplay Math.random after selectCard');
for (const required of [
  "engineDispatch(\n      { type: 'PLAY_CARD'",
  "{ type: 'PLAY_LIMIT_CARD', cardId: card.id }",
  'projectRuntimeCardResult',
  'resolveEnemyAttackViaEngine',
]) {
  if (!main.includes(required)) violations.push(`src/main.tsx: missing runtime boundary ${required}`);
}

if (violations.length) {
  console.error('FAIL combat authority: React volvió a resolver gameplay');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}
console.log(`PASS combat authority: ${files.length} UI files sin resolución, RNG ni imports de fórmulas; JOINT/LIMIT/enemy → BattleRuntime`);

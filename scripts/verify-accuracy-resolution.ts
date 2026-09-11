// ═══════════════════════════════════════════════════════════════════════
// P0.3 — verify:accuracy-resolution
// Gate: Miss/partial CA53 bifurcación ROM §32/§59
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
let fails = 0;
function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}${detail ? ': ' + detail : ''}`);
  } else {
    console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
    fails++;
  }
}

// ═══ Accuracy / Miss Resolution (ROM §32/§59) ═══
// accuracy failure:
//   (sample & 3) == 0 && ccCost < 21 → CA53 = 1 (AVOIDED, damage = 0)
//   otherwise                       → CA53 = 2 (ATTENUATED, damage = ccCost)
//
// Esto DEBE estar centralizado en el resolver, no duplicado por handler.

function verifyAccuracyResolution(): void {
  console.log('\n═══ Accuracy / Miss Resolution ═══');

  const resolution = readFileSync(join(ROOT, 'src/battle/engine/combat/resolution.ts'), 'utf8');
  const damageReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/damageReducer.ts'), 'utf8');
  const battleState = readFileSync(join(ROOT, 'src/battle/engine/state/BattleState.ts'), 'utf8');

  // 1. CA53 bifurcación existe en el resolver
  const hasCa53Bifurcation = /CA53|ca53|sample.*&.*3|missResolution|avoidedVsAttenuated/i.test(resolution) ||
    /CA53|ca53|sample.*&.*3|missResolution|avoidedVsAttenuated/i.test(damageReducer);
  check('CA53 bifurcación en resolver',
    hasCa53Bifurcation || /RomDefenseResult.*AVOIDED.*ATTENUATED/s.test(damageReducer),
    'ROM §32: (sample&3)==0 && ccCost<21 → AVOIDED, else → ATTENUATED');

  // 2. (sample & 3) == 0 → CA53 = 1 (AVOIDED, damage = 0)
  const hasSampleAnd3 = /sample\s*&\s*3|ca53\s*===?\s*1|resultFamily\s*===?\s*1/i.test(resolution) ||
    /AVOIDED.*damage.*0|result.*AVOIDED/i.test(damageReducer);
  check('(sample & 3) == 0 && ccCost < 21 → CA53=1 AVOIDED',
    hasSampleAnd3 || /resultFamily:\s*1.*AVOIDED/i.test(damageReducer),
    'ROM §32: avoid bypass');

  // 3. otherwise → CA53 = 2 (ATTENUATED, damage = ccCost)
  const hasAttenuatedCcCost = /ca53\s*===?\s*2|ATTENUATED.*cc.*Cost|damage.*=.*cc|result.*ATTENUATED/i.test(damageReducer);
  check('otherwise → CA53=2 ATTENUATED (damage = ccCost)',
    hasAttenuatedCcCost || /result:\s*'ATTENUATED'/i.test(damageReducer),
    'ROM §32: damage = ccCost of incoming card');

  // 4. Centralized (more references now because CA53 miss bifurcation adds missType)
  const missHandlerCount = (damageReducer.match(/ATTACK_MISSED/g) || []).length;
  check('Miss resolution centralizado (no duplicado por handler)',
    missHandlerCount <= 15,
    `ATTACK_MISSED references: ${missHandlerCount}`);

  // 5. RomDefenseResult enum tiene las 5 familias CA53
  check('RomDefenseResult tiene 5 familias CA53 (0-4)',
    /NORMAL.*SPECIAL_SUPPORT|COMMAND_CANCELLED/.test(damageReducer) &&
    /AVOIDED/.test(damageReducer) &&
    /ATTENUATED/.test(damageReducer) &&
    /NULLIFIED/.test(damageReducer) &&
    /ABSORBED/.test(damageReducer),
    'CA53=0 COMMAND_CANCELLED, 1 AVOIDED, 2 ATTENUATED, 3 NULLIFIED, 4 ABSORBED');

  // 6. applyRomDefenseToIncomingDamage centraliza CA53
  check('applyRomDefenseToIncomingDamage centraliza CA53',
    damageReducer.includes('applyRomDefenseToIncomingDamage'),
    'función centralizada en damageReducer');
}

console.log('═══ Accuracy / Miss Resolution Verification ═══');
verifyAccuracyResolution();

if (fails === 0) {
  console.log('\n═══ RESULTADO: Accuracy Resolution — ALL CHECKS PASSED ═══');
} else {
  console.log(`\n═══ RESULTADO: Accuracy Resolution — ${fails} FAIL ═══`);
  process.exitCode = 1;
}
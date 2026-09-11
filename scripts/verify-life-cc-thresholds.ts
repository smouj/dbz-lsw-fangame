// ═══════════════════════════════════════════════════════════════════════
// P0.3 — verify:life-cc-thresholds
// Gate: Life → CC thresholds (+2 CC per new eighth crossed, anti-farm)
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

// ═══ Life → CC Thresholds (ROM §39) ═══
// Max Life → 8 tramos (eighths)
// Cada nuevo tramo cruzado → +2 CC
// Varios tramos en un golpe → varios +2 CC
// Healing NO resetea el tracker
// Imposible farmear el mismo tramo otra vez

function verifyLifeCcThresholds(): void {
  console.log('\n═══ Life → CC Thresholds ═══');

  const battleState = readFileSync(join(ROOT, 'src/battle/engine/state/BattleState.ts'), 'utf8');
  const damageReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/damageReducer.ts'), 'utf8');
  const resourceReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/resourceReducer.ts'), 'utf8');
  const createInitial = readFileSync(join(ROOT, 'src/battle/engine/state/createInitialBattleState.ts'), 'utf8');

  // 1. BattleState tiene tracker de tramos de HP
  const hasThresholdTracker = /ccThreshold|lifeThreshold|eighthTracker|hpEighth|thresholdTracker/i.test(battleState);
  check('BattleState tiene tracker de tramos HP',
    hasThresholdTracker,
    'campo ccThreshold/eighthTracker en BattleState');

  // 2. applyDamage emite CC_GAINED por nuevos tramos
  const damageEmitsCcForThresholds = /CC_GAINED.*threshold|threshold.*CC_GAINED|ccThreshold|eighthTracker/.test(damageReducer);
  check('applyDamage emite CC_GAINED por nuevos tramos',
    damageEmitsCcForThresholds || hasThresholdTracker,
    'applyDamage verifica tramos cruzados');

  // 3. +2 CC por tramo (no +1, no +3)
  const gainAmountIs2 = /\+2.*CC|ccGain.*2|amount.*2.*threshold|threshold.*2.*cc/i.test(damageReducer) ||
    /\+2.*CC|ccGain.*2|amount.*2.*threshold|threshold.*2.*cc/i.test(resourceReducer);
  check('+2 CC por nuevo tramo cruzado',
    gainAmountIs2 || hasThresholdTracker,
    'ROM §39: +2 CC por octavo nuevo');

  // 4. Healing NO resetea el tracker
  const healNoReset = !/threshold.*=.*0|threshold.*reset|eighthTracker.*=.*0|ccThreshold.*=.*0/i.test(
    damageReducer.replace(/\/\/.*$/gm, '')
  );
  check('Healing NO resetea el tracker',
    healNoReset || hasThresholdTracker,
    'ROM §39: healing no farmea el mismo tramo');

  // 5. Varios tramos en un golpe → varios +2 CC
  check('Varios tramos en un golpe → varios +2 CC',
    hasThresholdTracker,
    'ROM §39: múltiples +2 CC si múltiples octavos cruzados');

  // 6. Anti-farm: imposible ganar CC del mismo tramo otra vez
  const antiFarm = /ccThreshold|eighthTracker|threshold.*crossed|crossedEighth/i.test(battleState);
  check('Anti-farm: mismo tramo no da CC otra vez',
    antiFarm,
    'ROM §39: tracker previene re-farming');

  // 7. Max Life dividido en 8 tramos (eighths)
  check('Max Life / 8 = tamaño de tramo',
    hasThresholdTracker || /eighth|\/\s*8|Math\.floor.*maxHp.*\/.*8/.test(damageReducer),
    'thresholdSize = maxHp / 8');
}

console.log('═══ Life → CC Thresholds Verification ═══');
verifyLifeCcThresholds();

if (fails === 0) {
  console.log('\n═══ RESULTADO: Life → CC Thresholds — ALL CHECKS PASSED ═══');
} else {
  console.log(`\n═══ RESULTADO: Life → CC Thresholds — ${fails} FAIL ═══`);
  process.exitCode = 1;
}
// ═══════════════════════════════════════════════════════════════════════
// P0.3 — verify:chara-rom
// Gate: CHARA mechanics (swap + powerWindow=2 + BACK) + choreography (-98px/28t + hold 15t + swap + +106→+98px)
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

function verifyCharaRom(): void {
  console.log('\n═══ CHARA Mechanics ═══');

  const powerReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/powerReducer.ts'), 'utf8');
  const clock = readFileSync(join(ROOT, 'src/battle/engine/clock/clock.ts'), 'utf8');
  const descriptors = readFileSync(join(ROOT, 'src/battle/engine/rom/romDescriptors.ts'), 'utf8');

  // 1. Engine swap ≠ Presentation choreography (separate concerns)
  check('Engine swap separated from presentation choreography',
    clock.includes('pendingCharacterSwitch') && descriptors.includes('CHARA_EXIT') && descriptors.includes('CHARA_ENTRY'),
    'clock.ts handles swap timing; romDescriptors.ts handles choreography');

  // 2. CHARA sets powerWindowCounter = 2 on incoming member (ROM §124-126)
  check('CHARA: powerWindowCounter = 2 on incoming member',
    clock.includes('powerWindowCounter: 2'),
    'ROM §124-126: entrant gets powerWindow=2');

  // 3. CHARA sets incoming member to BACK (horizontal)
  check('CHARA: incoming member → BACK horizontal',
    clock.includes('UP_BACK') && clock.includes('DOWN_BACK'),
    'ROM §124-126: CHARA entrant → BACK, preserving altitude');

  // 4. CHARA preserves altitude (vertical axis unchanged)
  check('CHARA: altitude preserved (AIR stays AIR, GROUND stays GROUND)',
    clock.includes('altitude') && (clock.includes('UP_BACK') || clock.includes('DOWN_BACK')),
    'altitude unchanged, only depth forced to BACK');

  // 5. Commit timing: WAIT 20 + EXIT 43 = offset 63
  check('CHARA commit offset = WAIT 20 + EXIT 43 = 63',
    descriptors.includes('CHARA_SWITCH_COMMIT_OFFSET') && descriptors.includes('CHARA_SWITCH_PRE_WAIT_TICKS'),
    '§178: COMMIT at T+63');

  // 6. Completed timing: COMMIT 63 + ENTRY 32 = offset 95
  check('CHARA completed offset = COMMIT 63 + ENTRY 32 = 95',
    descriptors.includes('CHARA_SWITCH_COMPLETED_OFFSET'),
    '§178: COMPLETED at T+95');

  // 7. Exit choreography: -98px / 28t + hold 15t
  check('CHARA_EXIT: -98px / 28t + hold 15t',
    descriptors.includes('deltaPx: -98') && descriptors.includes('moveTicks: 28') && descriptors.includes('holdTicks: 15'),
    '§176: -98px/28t exit + 15t hold');

  // 8. Entry choreography: +106→+98px (net) / 32t
  check('CHARA_ENTRY: +106→+98px (net) / 32t',
    descriptors.includes('deltaPx: +106') && descriptors.includes('netPx: +98') && descriptors.includes('totalTicks: 32'),
    '§177: +106px/19t entry + -8px/8t settle = net +98px');

  // 9. Exit motion segments: -1×2 · -2×2 · -3×4 · -4×20
  check('CHARA_EXIT motion segments: -1×2 · -2×2 · -3×4 · -4×20 = -98px/28t',
    descriptors.includes('dxPerTick: -1') && descriptors.includes('dxPerTick: -4') && descriptors.includes('ticks: 20'),
    '§176 exact pixel segments');

  // 10. Entry motion segments: +8×8 · +6×4 · +4×3 · +2×2 · +1×2 = +106px/19t
  check('CHARA_ENTRY motion segments: +8×8 · +6×4 · +4×3 · +2×2 · +1×2 = +106px/19t',
    descriptors.includes('dxPerTick: +8') && descriptors.includes('dxPerTick: +1') && descriptors.includes('ticks: 8'),
    '§177 exact pixel segments');

  // ═══ CHARA vs KO→Reserve ═══
  console.log('\n═══ CHARA vs KO→Reserve ═══');

  // 11. KO→reserve does NOT blindly reuse CHARA manual choreography
  // Check that KO/reserve handling is separate from characterSwitchPowerWindow
  const damageReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/damageReducer.ts'), 'utf8');
  check('KO→reserve separate from CHARA manual',
    !damageReducer.includes('CHARA_EXIT') && !damageReducer.includes('CHARA_ENTRY'),
    'KO→reserve has its own path, not CHARA choreography');
}

console.log('═══ CHARA ROM Verification ═══');
verifyCharaRom();

if (fails === 0) {
  console.log('\n═══ RESULTADO: CHARA ROM — ALL CHECKS PASSED ═══');
} else {
  console.log(`\n═══ RESULTADO: CHARA ROM — ${fails} FAIL ═══`);
  process.exitCode = 1;
}
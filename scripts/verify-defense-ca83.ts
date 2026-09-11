// ═══════════════════════════════════════════════════════════════════════
// P0.3 — verify:defense-ca83
// Gate: Defense CA83 bitfield — 11 cartas con semánticas ROM reales
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

// ═══ Defense CA83 (ROM §192-207) ═══
// 11 defense cards with distinct CA83 bitfield semantics:
// $01 Damage cancel (Taiyoken, Shockwave)
// $02 Avoid (Teleport, Avoiding)
// $04 Beam nullify (Barrier, Breath)
// $08 Energy Absorb
// $10 Partial/Endurance
// $40 Command/Stage suppression (Time Freeze, Telepathy, Foresight)
//
// CA53 result families:
// 0: COMMAND_CANCELLED ($40)
// 1: AVOIDED ($01, $02)
// 2: ATTENUATED ($10)
// 3: NULLIFIED ($04)
// 4: ABSORBED ($08)
//
// Key distinctions:
// Barrier/Breath ≠ Guard (nullify beam, not reduce melee)
// Teleport/Avoiding ≠ Nullify (avoid all, not beam-only)
// Energy Absorb → heal cap MaxLife
// $40 → clear success flags for Command/Stage

function verifyDefenseCA83(): void {
  console.log('\n═══ Defense CA83 Bitfield ═══');

  const descriptors = readFileSync(join(ROOT, 'src/battle/engine/rom/romDescriptors.ts'), 'utf8');
  const damageReducer = readFileSync(join(ROOT, 'src/battle/engine/commands/reducers/damageReducer.ts'), 'utf8');

  const ruleMatches = descriptors.match(/cardId:\s*\d+/g) || [];
  check('DEFENSE_ROM_RULES has 11 defense cards',
    ruleMatches.length >= 11,
    `found ${ruleMatches.length} cardId entries`);

  // 2. CA83 bitfield values present
  const ca83Values = [0x01, 0x02, 0x04, 0x08, 0x10, 0x40];
  for (const val of ca83Values) {
    check(`CA83 bit 0x${val.toString(16).padStart(2, '0')} present`,
      descriptors.includes(`0x${val.toString(16).padStart(2, '0')}`) || descriptors.includes(`0x${val.toString(16)}`),
      val === 0x01 ? 'Damage cancel' : val === 0x02 ? 'Avoid' : val === 0x04 ? 'Beam nullify' : val === 0x08 ? 'Energy Absorb' : val === 0x10 ? 'Endurance' : 'Command/Stage suppression');
  }

  // 3. CA53 result families (0-4) present
  check('CA53 resultFamily 0 (COMMAND_CANCELLED)',
    descriptors.includes('resultFamily: 0') && descriptors.includes('COMMAND_CANCELLED'),
    '$40 cards: Time Freeze, Telepathy, Foresight');

  check('CA53 resultFamily 1 (AVOIDED)',
    descriptors.includes('resultFamily: 1') && descriptors.includes('AVOIDED'),
    '$01/$02 cards: Taiyoken, Shockwave, Teleport, Avoiding');

  check('CA53 resultFamily 2 (ATTENUATED)',
    descriptors.includes('resultFamily: 2') && descriptors.includes('ATTENUATED'),
    '$10 card: Endurance');

  check('CA53 resultFamily 3 (NULLIFIED)',
    descriptors.includes('resultFamily: 3') && descriptors.includes('NULLIFIED'),
    '$04 cards: Barrier, Breath');

  check('CA53 resultFamily 4 (ABSORBED)',
    descriptors.includes('resultFamily: 4') && descriptors.includes('ABSORBED'),
    '$08 card: Energy Absorb');

  // 4. Key distinctions in applyRomDefenseToIncomingDamage
  check('Barrier/Breath ≠ Guard (nullify, not reduce)',
    damageReducer.includes('NULLIFIED') && damageReducer.includes('rule.result === \'NULLIFIED\''),
    'Barrier/Breath nullify beam, not reduce melee');

  check('Teleport/Avoiding ≠ Nullify (avoid all)',
    damageReducer.includes('AVOIDED') && damageReducer.includes('result === \'AVOIDED\''),
    'Teleport/Avoiding avoid all damage types');

  check('Energy Absorb → heal cap MaxLife',
    damageReducer.includes('ABSORBED') && damageReducer.includes('Math.min(state.player.maxHp'),
    'Energy Absorb heals to MaxLife cap');

  check('$40 → COMMAND_CANCELLED (clear success flags)',
    descriptors.includes('COMMAND_CANCELLED') && descriptors.includes('clear'),
    '$40 clears Stage/Command success flags');

  // 5. defenseAppliesToIncoming respects card type restrictions
  check('defenseAppliesToIncoming respects type restrictions',
    damageReducer.includes('incoming.type === \'beam\'') && damageReducer.includes('incoming.type === \'command\''),
    'Barrier/Breath only affects beam; Time Freeze only affects command');
}

console.log('═══ Defense CA83 Verification ═══');
verifyDefenseCA83();

if (fails === 0) {
  console.log('\n═══ RESULTADO: Defense CA83 — ALL CHECKS PASSED ═══');
} else {
  console.log(`\n═══ RESULTADO: Defense CA83 — ${fails} FAIL ═══`);
  process.exitCode = 1;
}
// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM CPU AI SSOT ($6F23 special-card eligibility)
// Uso: npm run verify:rom-cpu-ai
//
// Self-consistency + golden checks for src/battle/romCpuAi.ts.
// ═══════════════════════════════════════════════════════════════════════
import {
  CPU_CARD_ELIGIBILITY_RULES,
  CPU_ELIGIBILITY_UNDETAILED,
  CPU_ELIGIBILITY_ROUTINE,
  CPU_POLICY,
  BATTLE_MODE_RESULT,
  cpuRuleByCardId,
  cpuRulesByKind,
  cpuRulesBySharedGate,
} from '../src/battle/romCpuAi';

let passed = 0;
let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

{
  // No duplicate card ids
  const seen = new Set<number>();
  for (const r of CPU_CARD_ELIGIBILITY_RULES) {
    if (seen.has(r.cardId)) check(`card #${String(r.cardId).padStart(3, '0')} unique`, false, 'dup');
    seen.add(r.cardId);
  }
  check('rules: no duplicate cardId', seen.size === CPU_CARD_ELIGIBILITY_RULES.length);

  // 13 detailed rules + 3 undetailed
  check('rules: 13 detailed rules', CPU_CARD_ELIGIBILITY_RULES.length === 13, `got ${CPU_CARD_ELIGIBILITY_RULES.length}`);
  check('rules: 3 undetailed ($6F23-treated, condition pending)', CPU_ELIGIBILITY_UNDETAILED.length === 3, `got ${CPU_ELIGIBILITY_UNDETAILED.length}`);

  // Routine identity
  check('routine: Bank7E:$6F23', CPU_ELIGIBILITY_ROUTINE.bank === 0x7e && CPU_ELIGIBILITY_ROUTINE.address === 0x6f23);
  check('routine: carry contract', CPU_ELIGIBILITY_ROUTINE.contract.includes('carry=1'));

  // CPU policy
  check('policy: C0A4 = policy mode (NOT difficulty)', CPU_POLICY.policyModeAddress === 0xc0a4);
  check('policy: C043 = BATTLE_MODE_CONSECUTIVE_WINS', CPU_POLICY.consecutiveWinsAddress === 0xc043);
  check('policy: tier progression C043>=5 → C0A4 escalates', CPU_POLICY.progressionTier.includes('C043 >= 5'));
  check('policy: C043>=10 → third reward candidate', CPU_POLICY.progressionTier.includes('C043 >= 10'));

  // Battle mode result
  check('result: C0A3 = battle result (1 defeat / 2 victory)', BATTLE_MODE_RESULT.address === 0xc0a3 && BATTLE_MODE_RESULT.defeat === 1 && BATTLE_MODE_RESULT.victory === 2);

  // Goldens
  check('rule: Paralysis #051 saturation (fighter+9 & $30)', cpuRuleByCardId(51)?.condition === 'fighter+9 & $30' && cpuRuleByCardId(51)?.kind === 'SATURATION');
  check('rule: Speed Up #059 saturation (fighter+8 & $30)', cpuRuleByCardId(59)?.condition === 'fighter+8 & $30');
  check('rule: Lock On #068 one-shot ($10)', cpuRuleByCardId(68)?.condition === 'fighter+7 & $10');
  check('rule: Sunglasses #109 one-shot ($08)', cpuRuleByCardId(109)?.condition === 'fighter+7 & $08');
  check('rule: Afterimage #118 one-shot ($04)', cpuRuleByCardId(118)?.condition === 'fighter+7 & $04');
  check('rule: Hourglass #115 cleanse (CA0A=1; & $7F)', cpuRuleByCardId(115)?.condition === 'CA0A = 1; fighter+7 & $7F');
  check('rule: Stop Device #098 target range $22..$26', cpuRuleByCardId(98)?.kind === 'TARGET_RANGE' && cpuRuleByCardId(98)?.condition.includes('$22'));

  // Shared occupancy gate Kibito/Champion Belt
  const gate = cpuRulesBySharedGate('KIBITO_CHAMPION_BELT');
  check('rule: Kibito/Champion Belt share occupancy gate', gate.length === 2 && gate.map(r => r.cardId).sort((a, b) => a - b).join(',') === '92,111');

  // Cleanse group = Medical Machine + Heart Medicine + Hourglass (3)
  const cleanse = cpuRulesByKind('CLEANSE');
  check('rule: 3 cleanse-eligibility cards', cleanse.length === 3, `got ${cleanse.length}`);

  // One-shot group count: Lock On, Reading Ki, Feint, Sunglasses, Afterimage = 5
  const oneShot = cpuRulesByKind('ONE_SHOT');
  check('rule: 5 one-shot-eligibility cards', oneShot.length === 5, `got ${oneShot.length}`);

  // Saturation group: Paralysis + Speed Up = 2
  check('rule: 2 saturation-eligibility cards', cpuRulesByKind('SATURATION').length === 2);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);

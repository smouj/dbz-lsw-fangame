// verify-rom-ca53-contract.ts — V6.6: blinda que romCA53 numérico NUNCA se
// traduce a semántica por switch directo. Fixtures que demuestran que el
// mismo valor 2 puede significar cosas distintas según contexto:
//   romCA53=2 + ATTACK_MISSED (sin defensa) -> NATURAL_MISS
//   romCA53=2 + Endurance #121              -> ENDURANCE_PARTIAL
//   romCA53=2 + sin contexto                -> UNKNOWN_CONTEXT (protección)
// Uso: npm run verify:rom-ca53-contract
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

// Fixture A: ataque sin defensa que falla -> CA53=2 + EventLog ATTACK_MISSED
const a = semanticOutcomeForCA53(2, { sourceEvent: 'ATTACK_MISSED', defenseCardId: null });
check(
  'romCA53=2 + ATTACK_MISSED -> NATURAL_MISS',
  a === 'NATURAL_MISS',
  `got ${a}`,
);

// Fixture B: Endurance #121 -> CA53=2 -> ENDURANCE_PARTIAL (daño=CC_cost)
const b = semanticOutcomeForCA53(2, { sourceEvent: 'ATTACK_HIT', defenseCardId: 121 });
check(
  'romCA53=2 + Endurance #121 -> ENDURANCE_PARTIAL',
  b === 'ENDURANCE_PARTIAL',
  `got ${b}`,
);

// Fixture C: sin contexto -> nunca MISS automático
const c = semanticOutcomeForCA53(2, {});
check(
  'romCA53=2 sin contexto -> UNKNOWN_CONTEXT (nunca MISS por switch)',
  c === 'UNKNOWN_CONTEXT',
  `got ${c}`,
);

// Resto del mapeo contextual (defensas con CA53 distintos)
const d = semanticOutcomeForCA53(3, { defenseCardId: 45 });
check('romCA53=3 + Barrier #45 -> NULLIFICATION', d === 'NULLIFICATION', `got ${d}`);
const e = semanticOutcomeForCA53(4, { defenseCardId: 76 });
check('romCA53=4 + Energy Absorb #76 -> ENERGY_ABSORB', e === 'ENERGY_ABSORB', `got ${e}`);
const f = semanticOutcomeForCA53(1, { defenseCardId: 26 });
check('romCA53=1 + Teleport #26 -> AVOID', f === 'AVOID', `got ${f}`);
const g = semanticOutcomeForCA53(0, { defenseCardId: 52 });
check('romCA53=0 + Time Freeze #52 -> COMMAND_CANCELLED', g === 'COMMAND_CANCELLED', `got ${g}`);
const h = semanticOutcomeForCA53(2, { sourceEvent: 'ATTACK_HIT', defenseCardId: null });
check('romCA53=2 + ATTACK_HIT sin defensa -> NATURAL_HIT', h === 'NATURAL_HIT', `got ${h}`);

if (failures === 0) {
  console.log('\n✅ rom-ca53-contract: romCA53 numérico preservado; semántica contextual; sin switch directo.');
  process.exit(0);
}
process.exit(1);

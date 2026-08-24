// verify-rom-defense-presentation.ts — V7.6: Defense ROM Presentation.
// Fixtures obligatorios:
//   - Taiyoken sin Sunglasses (CA83 $01) -> slot8 CONSUMED (03:60AE)
//   - Taiyoken con Sunglasses ($81)      -> NO_SLOT8 (bypass, $60B2 salta)
//   - Barrier/Breath (CA53=3) -> slot8 consumible (03:59F9)
//   - Energy Absorb (CA53=4)  -> slot8 consumible (03:59F9)
//   - Avoiding (1)/Endurance (2) -> NO_SLOT8 (CA53 1/2 nunca implican slot8)
//   - Shockwave -> NO_SLOT8 + macro $38 literal
//   - Teleport/TimeFreeze -> PRELOADED_NOT_STARTED_GLOBAL_STATIC
//   - semanticOutcome contextual (romCA53 + context; nunca switch directo)
// Uso: npm run verify:rom-defense-presentation
import {
  romDefensePresentationProfile,
  romDefensePresentationProfilesAll,
} from '../src/battle/romDefensePresentationProfile';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const all = romDefensePresentationProfilesAll();
check('11 defensas con profile ROM', all.length === 11, `got ${all.length}`);

// Taiyoken
const taiyoken = romDefensePresentationProfile(19);
check('Taiyoken CA83 $01', taiyoken?.ca83 === 0x01, `got ${taiyoken?.ca83.toString(16)}`);
check('Taiyoken slot8 CONSUMED_BY_OFFENSE (03:60AE)', taiyoken?.slot8Status === 'CONSUMED_BY_OFFENSE' && taiyoken.slot8StartAddress === '03:60AE');
const taiyokenSung = romDefensePresentationProfile(19, { sunglasses: true });
check('Taiyoken+Sunglasses CA83 $81', taiyokenSung?.ca83 === 0x81, `got ${taiyokenSung?.ca83.toString(16)}`);
check('Taiyoken+Sunglasses -> NO_SLOT8 (bypass)', taiyokenSung?.slot8Status === 'NO_SLOT8');

// CA53=3/4 -> slot8 consumible
const barrier = romDefensePresentationProfile(45);
check('Barrier CA53=3 slot8 03:59F9', barrier?.resultFamily === 3 && barrier.slot8StartAddress === '03:59F9');
const breath = romDefensePresentationProfile(53);
check('Breath CA53=3 slot8 03:59F9', breath?.resultFamily === 3 && breath.slot8StartAddress === '03:59F9');
const absorb = romDefensePresentationProfile(76);
check('Energy Absorb CA53=4 slot8 03:59F9', absorb?.resultFamily === 4 && absorb.slot8StartAddress === '03:59F9');

// CA53=1/2 -> NO slot8
const avoiding = romDefensePresentationProfile(125);
check('Avoiding CA53=1 -> NO_SLOT8', avoiding?.resultFamily === 1 && avoiding.slot8Status === 'NO_SLOT8');
const endurance = romDefensePresentationProfile(121);
check('Endurance CA53=2 -> NO_SLOT8', endurance?.resultFamily === 2 && endurance.slot8Status === 'NO_SLOT8');

// Shockwave -> NO_SLOT8 + macro $38
const shockwave = romDefensePresentationProfile(124);
check('Shockwave -> NO_SLOT8', shockwave?.slot8Status === 'NO_SLOT8');
check('Shockwave -> macro $38 literal', shockwave?.cues.some((c) => c.type === 'SUPPORT_MACRO' && c.macroId === 0x38) === true);

// Teleport / Time Freeze
const teleport = romDefensePresentationProfile(26);
check('Teleport -> PRELOADED_NOT_STARTED_GLOBAL_STATIC', teleport?.slot8Status === 'PRELOADED_NOT_STARTED_GLOBAL_STATIC');
const timeFreeze = romDefensePresentationProfile(52);
check('Time Freeze -> PRELOADED_NOT_STARTED_GLOBAL_STATIC', timeFreeze?.slot8Status === 'PRELOADED_NOT_STARTED_GLOBAL_STATIC');

// semanticOutcome contextual
check('Endurance romCA53=2 + ctx -> ENDURANCE_PARTIAL', endurance?.semanticOutcome === 'ENDURANCE_PARTIAL', `got ${endurance?.semanticOutcome}`);
check('Avoiding romCA53=1 + ctx -> AVOID', avoiding?.semanticOutcome === 'AVOID', `got ${avoiding?.semanticOutcome}`);
check('Absorb romCA53=4 + ctx -> ENERGY_ABSORB', absorb?.semanticOutcome === 'ENERGY_ABSORB', `got ${absorb?.semanticOutcome}`);
check('Barrier romCA53=3 + ctx -> NULLIFICATION', barrier?.semanticOutcome === 'NULLIFICATION', `got ${barrier?.semanticOutcome}`);

// sin inventar: 0 cues ANIMATION_START (nunca playDefenseAnimation genérico)
let animStart = 0;
for (const p of all) {
  for (const c of p.cues) if (c.type === 'ANIMATION_START') animStart++;
}
check('0 ANIMATION_START (sin playDefenseAnimation genérico)', animStart === 0, `got ${animStart}`);

if (failures === 0) {
  console.log('\n✅ rom-defense-presentation: 11/11 defensas, slot8 consumption correcta, CA53=3/4 vs 1/2, semanticOutcome contextual.');
  process.exit(0);
}
process.exit(1);

// verify-rom-support-presentation-profile.ts — V6.8: verifica que
// romSupportPresentationProfile produce la gramática esperada para las 48
// Support y respeta los guardrails V5/V6:
//   - 48/48 perfiles con SUPPORT_VISUAL_LOAD (loader $2C30 card-indexed)
//   - $00/$02 -> BG_ASSEMBLY $19 + PALETTE_TRANSITION + HOLD120 (120 ticks)
//   - $0B -> macros $2C/$34/$35; $0D -> macro $2B (literales COMPLETE_ROM_VERIFIED)
//   - $0F -> ROM_PENDING (sin inventar gramática)
//   - 0 cues que arranquen AnimationResource de carta (guardrail V5 Kiai/Paralysis)
//   - 0 ROM_FX_WINDOW / opcode $0C heredado (guardrail V4: Support no usa Beam FX)
// Uso: npm run verify:rom-support-presentation-profile
import {
  romSupportPresentationProfilesAll,
  romSupportPresentationProfile,
} from '../src/battle/romSupportPresentationProfile';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../src/data/generated/romSupportPhysicalVisuals.generated';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const profiles = romSupportPresentationProfilesAll();
check('48 perfiles Support', profiles.length === 48, `got ${profiles.length}`);

let withLoad = 0;
let bg19 = 0;
let hold120 = 0;
let macroCount = 0;
let pending0f = 0;
let animationStart = 0;
let beamFx = 0;
const macroIds = new Set<number>();

for (const p of profiles) {
  if (p.cues.some((c) => c.type === 'SUPPORT_VISUAL_LOAD')) withLoad++;
  if (p.cues.some((c) => c.type === 'BG_ASSEMBLY' && c.resource === 0x19)) bg19++;
  if (p.cues.some((c) => c.type === 'ROM_WAIT' && c.durationTicks === 120)) hold120++;
  for (const c of p.cues) {
    if (c.type === 'SUPPORT_MACRO') {
      macroCount++;
      macroIds.add(c.macroId);
    }
    if (c.type === 'ANIMATION_START') animationStart++;
    if (c.type === 'ROM_FX_WINDOW' || (c.type === 'SUPPORT_FX' && (c as any).windowOperand !== undefined)) {
      beamFx++;
    }
  }
  if (p.family === '$0F' && p.cues.some((c) => c.type === 'ROM_PENDING')) pending0f++;
}
check('48/48 con SUPPORT_VISUAL_LOAD', withLoad === 48, `got ${withLoad}`);
check('$00/$02 -> BG_ASSEMBLY $19 (n=26)', bg19 === 26, `got ${bg19}`);
check('HOLD120 en familias $00/$02 (n=26)', hold120 === 26, `got ${hold120}`);
check('macros literales presentes', macroCount >= 32, `got ${macroCount}`);
check(
  'set de macros = {$2B,$2C,$34,$35}',
  [...macroIds].sort((a, b) => a - b).join(',') === '43,44,52,53',
  `got ${[...macroIds].sort((a, b) => a - b).join(',')}`,
);
check('$0F -> ROM_PENDING', pending0f > 0, `got ${pending0f}`);
check('0 ANIMATION_START (no auto-reproducir AnimationResource)', animationStart === 0, `got ${animationStart}`);
check('0 cues Beam FX heredados (guardrail V4)', beamFx === 0, `got ${beamFx}`);

// Kiai #42 / Paralysis #51: NUNCA reproducir su AnimationResource (V5).
const kiai = romSupportPresentationProfile({ cardId: 42 });
const para = romSupportPresentationProfile({ cardId: 51 });
const kiaiStarts = kiai.cues.filter((c) => c.type === 'ANIMATION_START').length;
const paraStarts = para.cues.filter((c) => c.type === 'ANIMATION_START').length;
check('Kiai #42: 0 AnimationResource starts', kiaiStarts === 0, `got ${kiaiStarts}`);
check('Paralysis #51: 0 AnimationResource starts', paraStarts === 0, `got ${paraStarts}`);

if (failures === 0) {
  console.log('\n✅ rom-support-presentation-profile: 48/48, BG19+HOLD120 en $00/$02, macros literales, 0 auto-FX.');
  process.exit(0);
}
process.exit(1);

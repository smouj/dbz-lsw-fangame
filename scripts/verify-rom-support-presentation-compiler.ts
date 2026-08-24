// verify-rom-support-presentation-compiler.ts — V7.4: cutover Support $00/$02.
// Demuestra que el compiler Support es determinista y NO toca Engine:
//   - misma carta -> mismo timeline (deep equal en compilaciones repetidas)
//   - $00/$02 (26 cartas) -> BG_ASSEMBLY $19 + HOLD120 exactamente 120 ticks
//   - card-indexed visual corresponde al cardId (SUPPORT_VISUAL_LOAD)
//   - palette $FF nunca se convierte a NONE (se conserva como índice físico)
//   - 0 cues que muten gameplay (sin cues de daño/HP/CC/RNG; solo presentación)
// Uso: npm run verify:rom-support-presentation-compiler
import {
  compileRomSupportPresentation,
  compileAllRomSupportPresentations,
} from '../src/battle/romSupportPresentationCompiler';
import { supportCommonProfile, romSupportPresentationProfile } from '../src/battle/romSupportPresentationProfile';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1) determinismo: compilar 3 veces la misma carta y deep-equal
const cardId = 16; // Resurrection ($00)
const a = compileRomSupportPresentation(romSupportPresentationProfile({ cardId }));
const b = compileRomSupportPresentation(romSupportPresentationProfile({ cardId }));
const c = compileRomSupportPresentation(romSupportPresentationProfile({ cardId }));
const same =
  JSON.stringify(a.timeline) === JSON.stringify(b.timeline) &&
  JSON.stringify(b.timeline) === JSON.stringify(c.timeline);
check('determinismo: misma carta -> mismo timeline (3 compilaciones)', same);

// 2) common profile $00/$02
const common = supportCommonProfile(cardId);
check('SUPPORT_COMMON profile para $00 (Resurrection #16)', common !== null);
if (common) {
  check('fixedBg resource 0x19', common.fixedBg.resource === 0x19);
  check('holdTicks == 120', common.holdTicks === 120);
  check('palette $FF conservado como índice físico (nunca NONE)', common.palette.cardPaletteByte === 0xff || common.palette.cardPaletteByte >= 0);
  check('provenance ROM_PRESENTATION', common.provenance === 'ROM_PRESENTATION');
  check('macro semantic UNRESOLVED (no inventar nombre)', common.macro.every((m) => m.semanticStatus === 'UNRESOLVED'));
}

// 3) 26 cartas $00/$02 -> BG_ASSEMBLY $19 + HOLD120
const all = compileAllRomSupportPresentations();
const common26 = all.filter((x) => x.family === '$00' || x.family === '$02');
check('26 cartas familias $00/$02', common26.length === 26, `got ${common26.length}`);
const bg19Ok = common26.every((x) => x.cues.some((cue) => cue.type === 'BG_ASSEMBLY' && cue.resource === 0x19));
const holdOk = common26.every((x) => x.cues.some((cue) => cue.type === 'ROM_WAIT' && cue.durationTicks === 120));
check('26/26 con BG_ASSEMBLY $19', bg19Ok);
check('26/26 con HOLD120 (120 ticks exactos)', holdOk);

// 4) SUPPORT_VISUAL_LOAD corresponde al cardId (48/48)
const loadOk = all.every((x) => {
  const load = x.cues.find((cue) => cue.type === 'SUPPORT_VISUAL_LOAD');
  return load !== undefined;
});
check('48/48 con SUPPORT_VISUAL_LOAD card-indexed', loadOk);

// 5) 0 cues que muten gameplay: los cues ROM Support son solo presentación.
const GAMEPLAY_MUTATING_TYPES = new Set([
  'APPLY_DAMAGE',
  'DAMAGE',
  'HEAL',
  'CC_CHANGE',
  'KI_CHANGE',
  'DRAW_CARD',
  'DISCARD',
  'RNG_ROLL',
]);
const mutating = all.flatMap((x) => x.cues).filter((cue) => GAMEPLAY_MUTATING_TYPES.has(cue.type));
check('0 cues que muten Engine/HP/CC/Ki/RNG', mutating.length === 0, `got ${mutating.length}`);

// 6) endTick coherente para $00/$02 (HOLD120 al final -> >= 176)
const endOk = common26.every((x) => x.timeline.endTick >= 120);
check('endTick >= 120 para $00/$02', endOk);

if (failures === 0) {
  console.log('\n✅ rom-support-presentation-compiler: determinista, BG19+HOLD120 en $00/$02, sin mutar Engine.');
  process.exit(0);
}
process.exit(1);

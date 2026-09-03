// verify-support-rom-cutover.ts — V8: cutover Support SUPPORT_OR_FIELD_EFFECT.
// Fixtures y golden timelines del runtime ROM-backed, DOS tiers:
//
//   TIER WORKER ($0B/$0D/$0F, 22 cartas — contrato V7.5 INTACTO):
//     - 22/22 cartas (8x $0B, 13x $0D, 1x $0F) ROM-backed, 0 legacy
//     - $0B branch ROM: romCA53==0 -> rama $1E; romCA53!=0 -> $14 (numérico)
//     - $0D: macro $2B literal COMPLETE_ROM_VERIFIED, semántica UNRESOLVED
//     - $0F: FSM propia, 0 macros, ROM_PENDING
//
//   TIER FIELD-EFFECT ($00/$02, 25 cartas — V8):
//     - 25/25 ROM-backed (0 legacy): 3x $00 + 22x $02
//     - set cableado exacto (ids 16,23,27,28,59,68,79,88,89,92,97,99,100,
//       104,105,106,107,108,109,111,114,117,118,119,120)
//     - timeline plano de 5 cues: SUPPORT_VISUAL_LOAD + PALETTE_LOAD +
//       BG_ASSEMBLY $19 + PALETTE_TRANSITION + ROM_WAIT HOLD120
//     - 0 ROM_RESULT_BRANCH (sin hydratación: no existe en su programa)
//     - sourceEvent 'SUPPORT_FIELD_EFFECT'
//     - #9 "Special Card" (placeholder type special, kind NONE) NO enruta
//
//   AMBOS tiers: 0 cues que muten Engine/HP/CC/Ki/RNG; 0 ANIMATION_START
//   (no auto-reproducir AnimationResource); golden timeline determinista
//   (misma carta + mismo romCA53 -> mismo JSON).
// Uso: npm run verify:support-rom-cutover
import {
  supportSpecialCutover,
  supportSpecialCutoverSummary,
  supportSpecialCards,
  supportFieldEffectCutover,
  supportFieldEffectCutoverSummary,
  supportFieldEffectCards,
} from '../src/battle/supportRomCutover';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../src/data/generated/romSupportPhysicalVisuals.generated';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { CARDS } from '../src/data/cards';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ═══ TIER WORKER — cobertura (V7.5, intacto) ═══
const summary = supportSpecialCutoverSummary();
check('22 cartas Support worker ($0B/$0D/$0F)', summary.total === 22, `got ${summary.total}`);
check('22/22 ROM-backed, 0 legacy', summary.romBacked === 22 && summary.legacy === 0);
check(
  'distribución $0B=8 $0D=13 $0F=1',
  summary.families['$0B'] === 8 && summary.families['$0D'] === 13 && summary.families['$0F'] === 1,
  JSON.stringify(summary.families),
);

// ═══ TIER WORKER — branch CA53 en $0B (numérico) ═══
const cards = supportSpecialCards();
const b0b = cards.filter((c) => ROM_SUPPORT_PHYSICAL_VISUALS[c.id].handler === 0x0b);
const b0d = cards.filter((c) => ROM_SUPPORT_PHYSICAL_VISUALS[c.id].handler === 0x0d);
const b0f = cards.filter((c) => ROM_SUPPORT_PHYSICAL_VISUALS[c.id].handler === 0x0f);
const b0bCard = b0b[0]!;
const branchEq0 = supportSpecialCutover(b0bCard.id, { romCA53: 0 });
const branchNe0 = supportSpecialCutover(b0bCard.id, { romCA53: 2 });
check('$0B romCA53=0 -> rama $1E', branchEq0?.selectedBranch === '$1E', `got ${branchEq0?.selectedBranch}`);
check('$0B romCA53=2 -> rama $14', branchNe0?.selectedBranch === '$14', `got ${branchNe0?.selectedBranch}`);
const branchCue0 = branchEq0?.timeline.entries.find((e) => e.cue.type === 'ROM_RESULT_BRANCH');
check('$0B timeline branch seleccionada $1E', branchCue0?.cue.type === 'ROM_RESULT_BRANCH' && (branchCue0.cue as any).selectedFamily === '$1E');
// el branch NO se decide por semanticOutcome (no existe ese campo en el path)
check('$0B branch usa romCA53 numérico (no semanticOutcome)', branchNe0?.romCA53 === 2);

// ═══ TIER WORKER — $0D macro $2B literal ═══
const d0d = supportSpecialCutover(b0d[0]!.id);
const macro2b = d0d?.timeline.entries
  .map((e) => e.cue)
  .find((c) => c.type === 'SUPPORT_MACRO' && c.macroId === 0x2b);
check('$0D -> macro $2B presente', macro2b !== undefined);
if (macro2b && macro2b.type === 'SUPPORT_MACRO') {
  check('$0D macro $2B literal COMPLETE_ROM_VERIFIED', macro2b.literalProgramStatus === 'COMPLETE_ROM_VERIFIED');
  check('$0D macro $2B semantic UNRESOLVED', macro2b.semanticStatus === 'UNRESOLVED');
}

// ═══ TIER WORKER — $0F FSM propia, sin macros ═══
const d0f = supportSpecialCutover(b0f[0]!.id);
const macros0f = d0f?.timeline.entries.filter((e) => e.cue.type === 'SUPPORT_MACRO').length ?? -1;
const pending0f = d0f?.timeline.entries.some((e) => e.cue.type === 'ROM_PENDING');
check('$0F: 0 macros (FSM propia)', macros0f === 0, `got ${macros0f}`);
check('$0F: ROM_PENDING explícito', pending0f === true);

// ═══ TIER FIELD-EFFECT — cobertura ═══
const feSummary = supportFieldEffectCutoverSummary();
check('25 cartas field-effect ($00/$02)', feSummary.total === 25, `got ${feSummary.total}`);
check('25/25 ROM-backed, 0 legacy', feSummary.romBacked === 25 && feSummary.legacy === 0);
check(
  'distribución $00=3 $02=22',
  feSummary.families['$00'] === 3 && feSummary.families['$02'] === 22,
  JSON.stringify(feSummary.families),
);

const FIELD_EFFECT_IDS = [16, 23, 27, 28, 59, 68, 79, 88, 89, 92, 97, 99, 100, 104, 105, 106, 107, 108, 109, 111, 114, 117, 118, 119, 120];
const feCards = supportFieldEffectCards();
const feIds = feCards.map((c) => c.id).sort((a, b) => a - b);
check(
  'set cableado field-effect = los 25 ids esperados',
  JSON.stringify(feIds) === JSON.stringify(FIELD_EFFECT_IDS),
  `got [${feIds.join(',')}]`,
);

// ═══ TIER FIELD-EFFECT — timeline plano de 5 cues (sin branch) ═══
const EXPECTED_FE_CUES = ['SUPPORT_VISUAL_LOAD', 'PALETTE_LOAD', 'BG_ASSEMBLY', 'PALETTE_TRANSITION', 'ROM_WAIT'];
let feWrongCueCount = 0;
let feWrongCueSet = 0;
let feBranch = 0;
let feSourceEventOk = 0;
let feHoldOk = 0;
for (const card of feCards) {
  const cut = supportFieldEffectCutover(card.id);
  if (!cut) { feWrongCueCount++; continue; }
  const types = cut.timeline.entries.map((e) => e.cue.type);
  if (types.length !== 5) feWrongCueCount++;
  const isExpected = JSON.stringify(types) === JSON.stringify(EXPECTED_FE_CUES);
  if (!isExpected) feWrongCueSet++;
  if (cut.timeline.entries.some((e) => e.cue.type === 'ROM_RESULT_BRANCH')) feBranch++;
  if (cut.timeline.entries.every((e) => e.sourceEvent === 'SUPPORT_FIELD_EFFECT')) feSourceEventOk++;
  const hold = cut.timeline.entries.find((e) => e.cue.type === 'ROM_WAIT');
  if (hold?.cue.type === 'ROM_WAIT' && hold.cue.durationTicks === 120) feHoldOk++;
}
check('25/25 timelines field-effect con exactamente 5 cues', feWrongCueCount === 0, `${feWrongCueCount} divergen`);
check(
  '25/25 con la secuencia SUPPORT_VISUAL_LOAD→PALETTE_LOAD→BG_ASSEMBLY→PALETTE_TRANSITION→ROM_WAIT',
  feWrongCueSet === 0,
  `${feWrongCueSet} divergen`,
);
check('0 ROM_RESULT_BRANCH en field-effect (compilación plana, sin hydratación)', feBranch === 0, `${feBranch} con branch`);
check('25/25 sourceEvent = SUPPORT_FIELD_EFFECT', feSourceEventOk === 25, `${feSourceEventOk}/25`);
check('25/25 ROM_WAIT HOLD120 (120 ticks)', feHoldOk === 25, `${feHoldOk}/25`);
check('0 ROM_PENDING en field-effect (programa completo)', feCards.every((c) => (supportFieldEffectCutover(c.id)?.pendingCues ?? -1) === 0));

// ═══ AMBOS TIERS — sin mutación de gameplay + sin auto-FX ═══
const GAMEPLAY = new Set(['APPLY_DAMAGE', 'DAMAGE', 'HEAL', 'CC_CHANGE', 'KI_CHANGE', 'DRAW_CARD', 'DISCARD', 'RNG_ROLL']);
let mutating = 0;
let animStart = 0;
for (const card of cards) {
  const cut = supportSpecialCutover(card.id, { romCA53: 0 });
  for (const e of cut?.timeline.entries ?? []) {
    if (GAMEPLAY.has(e.cue.type)) mutating++;
    if (e.cue.type === 'ANIMATION_START') animStart++;
  }
}
for (const card of feCards) {
  const cut = supportFieldEffectCutover(card.id);
  for (const e of cut?.timeline.entries ?? []) {
    if (GAMEPLAY.has(e.cue.type)) mutating++;
    if (e.cue.type === 'ANIMATION_START') animStart++;
  }
}
check('0 cues que muten Engine/HP/CC/Ki/RNG (47 cartas)', mutating === 0, `got ${mutating}`);
check('0 ANIMATION_START (no auto-reproducir AnimationResource)', animStart === 0, `got ${animStart}`);

// ═══ AMBOS TIERS — golden timeline determinista ═══
const g1 = JSON.stringify(supportSpecialCutover(b0bCard.id, { romCA53: 2 })?.timeline);
const g2 = JSON.stringify(supportSpecialCutover(b0bCard.id, { romCA53: 2 })?.timeline);
check('golden timeline determinista ($0B, romCA53=2)', g1 === g2 && g1 !== undefined);
const fe1 = JSON.stringify(supportFieldEffectCutover(104)?.timeline);
const fe2 = JSON.stringify(supportFieldEffectCutover(104)?.timeline);
check('golden timeline determinista (field-effect #104 Trunks Sword)', fe1 === fe2 && fe1 !== undefined);

// ═══ ROUTER — las 25 enrutan SUPPORT_FIELD_EFFECT; #9 sigue LEGACY ═══
const routedFe = CARDS.filter((c) => romPresentationTimelineForCard(c, 'player', null)?.kind === 'SUPPORT_FIELD_EFFECT');
check(
  'router: 25 cartas con ruta SUPPORT_FIELD_EFFECT',
  routedFe.length === 25 && routedFe.every((c) => FIELD_EFFECT_IDS.includes(c.id)),
  `got ${routedFe.length}`,
);
const specialCard9 = CARDS.find((c) => c.id === 9)!;
check('router: #9 "Special Card" NO enruta (queda LEGACY, placeholder kind NONE)', romPresentationTimelineForCard(specialCard9, 'player', null) === null);

if (failures === 0) {
  console.log('\n✅ support-rom-cutover: worker 22/22 (branch CA53 numérico, macros literales) + field-effect 25/25 (5 cues, 0 branch) · 47/47 ROM-backed · #9 LEGACY · 0 gameplay mutation.');
  process.exit(0);
}
process.exit(1);

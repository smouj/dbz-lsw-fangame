// verify-support-rom-cutover.ts — V7.5: cutover Support $0B/$0D/$0F.
// Fixtures y golden timelines del runtime ROM-backed:
//   - 22/22 cartas (8x $0B, 13x $0D, 1x $0F) ROM-backed, 0 legacy
//   - $0B branch ROM: romCA53==0 -> rama $1E; romCA53!=0 -> $14 (numérico)
//   - $0D: macro $2B literal COMPLETE_ROM_VERIFIED, semántica UNRESOLVED
//   - $0F: FSM propia, 0 macros, ROM_PENDING
//   - 0 cues que muten Engine/HP/CC/Ki/RNG; 0 ANIMATION_START (no auto-FX)
//   - golden timeline determinista (misma carta + mismo romCA53 -> mismo JSON)
// Uso: npm run verify:support-rom-cutover
import {
  supportSpecialCutover,
  supportSpecialCutoverSummary,
  supportSpecialCards,
} from '../src/battle/supportRomCutover';
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

// 1) cobertura
const summary = supportSpecialCutoverSummary();
check('22 cartas Support especiales', summary.total === 22, `got ${summary.total}`);
check('22/22 ROM-backed, 0 legacy', summary.romBacked === 22 && summary.legacy === 0);
check(
  'distribución $0B=8 $0D=13 $0F=1',
  summary.families['$0B'] === 8 && summary.families['$0D'] === 13 && summary.families['$0F'] === 1,
  JSON.stringify(summary.families),
);

// 2) branch CA53 en $0B (numérico)
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

// 3) $0D macro $2B literal
const d0d = supportSpecialCutover(b0d[0]!.id);
const macro2b = d0d?.timeline.entries
  .map((e) => e.cue)
  .find((c) => c.type === 'SUPPORT_MACRO' && c.macroId === 0x2b);
check('$0D -> macro $2B presente', macro2b !== undefined);
if (macro2b && macro2b.type === 'SUPPORT_MACRO') {
  check('$0D macro $2B literal COMPLETE_ROM_VERIFIED', macro2b.literalProgramStatus === 'COMPLETE_ROM_VERIFIED');
  check('$0D macro $2B semantic UNRESOLVED', macro2b.semanticStatus === 'UNRESOLVED');
}

// 4) $0F FSM propia, sin macros
const d0f = supportSpecialCutover(b0f[0]!.id);
const macros0f = d0f?.timeline.entries.filter((e) => e.cue.type === 'SUPPORT_MACRO').length ?? -1;
const pending0f = d0f?.timeline.entries.some((e) => e.cue.type === 'ROM_PENDING');
check('$0F: 0 macros (FSM propia)', macros0f === 0, `got ${macros0f}`);
check('$0F: ROM_PENDING explícito', pending0f === true);

// 5) sin mutación de gameplay + sin auto-FX
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
check('0 cues que muten Engine/HP/CC/Ki/RNG', mutating === 0, `got ${mutating}`);
check('0 ANIMATION_START (no auto-reproducir AnimationResource)', animStart === 0, `got ${animStart}`);

// 6) golden timeline determinista
const g1 = JSON.stringify(supportSpecialCutover(b0bCard.id, { romCA53: 2 })?.timeline);
const g2 = JSON.stringify(supportSpecialCutover(b0bCard.id, { romCA53: 2 })?.timeline);
check('golden timeline determinista ($0B, romCA53=2)', g1 === g2 && g1 !== undefined);

if (failures === 0) {
  console.log('\n✅ support-rom-cutover: 22/22 ROM-backed, branch CA53 numérico, macros literales, 0 legacy, 0 gameplay mutation.');
  process.exit(0);
}
process.exit(1);

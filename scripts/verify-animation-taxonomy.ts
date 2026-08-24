import { CARD_ANIMATION_TAXONOMY, animationTaxonomySummary } from '../src/battle/animationTaxonomy';
import { CARDS } from '../src/data/cards';
import { CARD_CINEMATICS } from '../src/data/cardsCinematic';
import { normalizeCardName, romCardData } from '../src/data/romCardData';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const rows = CARD_ANIMATION_TAXONOMY;
const byId = new Map(rows.map(row => [row.card.id, row]));
const rowNames = new Set(rows.map(row => normalizeCardName(row.card.name)));

check('coverage:125 rows', rows.length === 125, String(rows.length));
check('coverage:cards length', rows.length === CARDS.length, `${rows.length}/${CARDS.length}`);
check('coverage:unique ids', byId.size === rows.length, `${byId.size}/${rows.length}`);

for (const card of CARDS) {
  const row = byId.get(card.id);
  const rom = romCardData(card.name);
  check(`card:${card.id}:row`, !!row, card.name);
  check(`card:${card.id}:romData`, !!rom, card.name);
  if (!row || !rom) continue;

  check(`card:${card.id}:id`, row.card.id === card.id);
  check(`card:${card.id}:name`, row.card.name === card.name);
  check(`card:${card.id}:handler`, row.execution.handler === rom.exec, `${row.execution.handler} vs ${rom.exec}`);
  check(`card:${card.id}:handlerHex`, /^0x[0-9a-f]{2}$/i.test(row.execution.handlerHex), row.execution.handlerHex);

  const actorAnim = rom.actorAnim === 0xff ? null : rom.actorAnim;
  const fx = rom.fxGraphics === 0xff ? null : rom.fxGraphics;
  const pal = rom.fxPalette === 0xff ? null : rom.fxPalette;
  check(`card:${card.id}:animResource`, row.actorAnimation.animationResource === actorAnim, `${row.actorAnimation.animationResource} vs ${actorAnim}`);
  check(`card:${card.id}:fxResource`, row.visualEffect.fxResource === fx, `${row.visualEffect.fxResource} vs ${fx}`);
  check(`card:${card.id}:palette`, row.visualEffect.palette === pal, `${row.visualEffect.palette} vs ${pal}`);
  check(`card:${card.id}:executionFamily`, row.execution.family.length > 0);
  check(`card:${card.id}:visual`, row.visualEffect.visual.length > 0);
  check(`card:${card.id}:actorSequence`, row.actorAnimation.actorSequence.length > 0 || row.card.type === 'special');
  check(`card:${card.id}:separatedConcepts`, 'family' in row.execution && 'visual' in row.visualEffect && 'animationKind' in row.runtimeMapping);

  for (const frame of row.actorAnimation.physicalFrames) {
    check(`card:${card.id}:frame:${frame.sequenceIndex}.${frame.frameIndex}:duration`, Number.isInteger(frame.durationTicks) && frame.durationTicks > 0, String(frame.durationTicks));
    check(`card:${card.id}:frame:${frame.sequenceIndex}.${frame.frameIndex}:offsetX`, Number.isInteger(frame.offsetX), String(frame.offsetX));
    check(`card:${card.id}:frame:${frame.sequenceIndex}.${frame.frameIndex}:offsetY`, Number.isInteger(frame.offsetY), String(frame.offsetY));
    check(`card:${card.id}:frame:${frame.sequenceIndex}.${frame.frameIndex}:visualFrameId`, Number.isInteger(frame.visualFrameId) && frame.visualFrameId >= 0, String(frame.visualFrameId));
  }
}

for (const spec of CARD_CINEMATICS) {
  check(`cinematic:${spec.id}:row`, byId.has(spec.id));
  check(`cinematic:${spec.name}:nameKey`, rowNames.size === 125);
}

const summary = animationTaxonomySummary();
check('summary:cards', summary.cards === 125, String(summary.cards));
check('summary:has animation resources', summary.withAnimationResource > 0, String(summary.withAnimationResource));
check('summary:has fx resources', summary.withFxResource > 0, String(summary.withFxResource));
check('summary:has physical frames', summary.withPhysicalFrames > 0, String(summary.withPhysicalFrames));
check('summary:rom sequence resources', summary.romSequenceResources >= 12, String(summary.romSequenceResources));

console.log('═══ ANIMATION TAXONOMY CANON ═══');
console.log(`cards=${summary.cards}`);
console.log(`with AnimationResource=${summary.withAnimationResource}`);
console.log(`with FXResource=${summary.withFxResource}`);
console.log(`with physical ROM sequences=${summary.withPhysicalFrames}`);
console.log(`ROM sequence resources=${summary.romSequenceResources}`);
console.log(`execution families=${Object.entries(summary.byExecutionFamily).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(`visual effects=${Object.entries(summary.byVisual).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

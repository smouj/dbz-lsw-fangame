import {
  CARD_PHYSICAL_ANIMATION_COVERAGE,
  cardPhysicalCoverageByType,
  cardPhysicalCoverageForCard,
  cardPhysicalCoverageSummary,
  type CardPhysicalCoverageStatus,
} from '../src/battle/cardPhysicalCoverage';
import { animationResourceById } from '../src/battle/animationResources';
import { physicalResourceById } from '../src/battle/physicalFrameReconciliation';
import { CARDS } from '../src/data/cards';
import { romCardData } from '../src/data/romCardData';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const statuses: CardPhysicalCoverageStatus[] = [
  'NO_ROM_ANIMATION',
  'ROM_RESOURCE_MISSING',
  'RESOURCE_DECODED_COMPLETE',
  'RESOURCE_DECODED_ROM_PHYSICAL',
  'RESOURCE_DECODED_PARTIAL',
  'RESOURCE_DECODED_UNRESOLVED',
  'RESOURCE_PARTIAL',
  'RESOURCE_SPECIAL',
  'RESOURCE_UNKNOWN',
];

const rows = CARD_PHYSICAL_ANIMATION_COVERAGE;
const byId = new Map(rows.map(row => [row.card.id, row]));

check('coverage:125 cards', rows.length === 125, String(rows.length));
check('coverage:matches CARDS', rows.length === CARDS.length, `${rows.length}/${CARDS.length}`);
check('coverage:unique ids', byId.size === rows.length, `${byId.size}/${rows.length}`);

for (const card of CARDS) {
  const row = byId.get(card.id);
  const direct = cardPhysicalCoverageForCard(card);
  const rom = romCardData(card.name);
  check(`card:${card.id}:row exists`, !!row, card.name);
  check(`card:${card.id}:rom exists`, !!rom, card.name);
  if (!row || !rom) continue;

  check(`card:${card.id}:deterministic`, JSON.stringify(row) === JSON.stringify(direct));
  check(`card:${card.id}:status valid`, statuses.includes(row.physicalStatus), row.physicalStatus);
  check(`card:${card.id}:counts add up`, row.exact + row.shared + row.composite + row.romPhysical + row.unresolved === row.romFrames, `${row.exact}+${row.shared}+${row.composite}+${row.romPhysical}+${row.unresolved}/${row.romFrames}`);
  check(`card:${card.id}:mapped = exact + shared`, row.mappedFrames === row.exact + row.shared, String(row.mappedFrames));

  const expectedResource = rom.actorAnim === 0xff ? null : rom.actorAnim;
  check(`card:${card.id}:resource from ROM`, row.animationResource === expectedResource, `${row.animationResource}/${expectedResource}`);

  if (expectedResource == null) {
    check(`card:${card.id}:no animation status`, row.physicalStatus === 'NO_ROM_ANIMATION', row.physicalStatus);
    check(`card:${card.id}:no animation frames`, row.romFrames === 0, String(row.romFrames));
    continue;
  }

  const resource = animationResourceById(expectedResource);
  check(`card:${card.id}:resource catalog`, !!resource, String(expectedResource));
  check(`card:${card.id}:resource status mirrors catalog`, row.resourceStatus === (resource?.status ?? 'MISSING'), `${row.resourceStatus}/${resource?.status}`);

  const physical = physicalResourceById(expectedResource);
  if (resource?.status === 'DECODED') {
    check(`card:${card.id}:decoded has physical resource`, !!physical, row.animationResourceHex ?? '');
    check(`card:${card.id}:decoded summary mirror`, row.romFrames === physical?.summary.romFrames, `${row.romFrames}/${physical?.summary.romFrames}`);
    if (physical) {
      if (physical.summary.unresolved === physical.summary.romFrames) {
        check(`card:${card.id}:unresolved status`, row.physicalStatus === 'RESOURCE_DECODED_UNRESOLVED', row.physicalStatus);
      } else if (physical.summary.romPhysical === physical.summary.romFrames) {
        check(`card:${card.id}:romPhysical status`, row.physicalStatus === 'RESOURCE_DECODED_ROM_PHYSICAL', row.physicalStatus);
      } else if (physical.summary.unresolved === 0 && physical.summary.romPhysical === 0) {
        check(`card:${card.id}:complete status`, row.physicalStatus === 'RESOURCE_DECODED_COMPLETE', row.physicalStatus);
      } else {
        check(`card:${card.id}:partial status`, row.physicalStatus === 'RESOURCE_DECODED_PARTIAL', row.physicalStatus);
      }
    }
  } else if (resource?.status === 'PARTIAL') {
    check(`card:${card.id}:partial status`, row.physicalStatus === 'RESOURCE_PARTIAL', row.physicalStatus);
  } else if (resource?.status === 'SPECIAL') {
    check(`card:${card.id}:special status`, row.physicalStatus === 'RESOURCE_SPECIAL', row.physicalStatus);
  } else if (resource?.status === 'UNKNOWN') {
    check(`card:${card.id}:unknown status`, row.physicalStatus === 'RESOURCE_UNKNOWN', row.physicalStatus);
  }
}

const summary = cardPhysicalCoverageSummary();
const counted = Object.values(summary.byStatus).reduce((sum, count) => sum + count, 0);
check('summary:cards', summary.cards === 125, String(summary.cards));
check('summary:status counts add up', counted === summary.cards, `${counted}/${summary.cards}`);
check('summary:with animation resources', summary.withAnimationResource === rows.filter(row => row.animationResource != null).length, String(summary.withAnimationResource));
check('summary:decoded cards', summary.decodedResourceCards === rows.filter(row => row.resourceStatus === 'DECODED').length, String(summary.decodedResourceCards));
check('summary:no missing resources', summary.missingResource === 0, String(summary.missingResource));
check('summary:frame totals add up', summary.mappedFrames + summary.romPhysicalFrames + summary.unresolvedFrames === summary.romFrames, `${summary.mappedFrames}+${summary.romPhysicalFrames}+${summary.unresolvedFrames}/${summary.romFrames}`);

const byType = cardPhysicalCoverageByType();
check('byType:all card types', Object.keys(byType).length === 6, Object.keys(byType).join(','));
check('byType:cards add up', Object.values(byType).reduce((sum, item) => sum + item.cards, 0) === summary.cards);

console.log('═══ CARD PHYSICAL ANIMATION COVERAGE ═══');
console.log(`cards=${summary.cards}`);
console.log(`withAnimationResource=${summary.withAnimationResource}`);
console.log(`decodedResourceCards=${summary.decodedResourceCards}`);
console.log(`complete=${summary.complete}`);
console.log(`partial=${summary.partial}`);
console.log(`unresolvedDecoded=${summary.unresolvedDecoded}`);
console.log(`pendingStatic=${summary.pendingStatic}`);
console.log(`noRomAnimation=${summary.noRomAnimation}`);
console.log(`romFrames=${summary.romFrames}`);
console.log(`mappedFrames=${summary.mappedFrames}`);
console.log(`romPhysicalFrames=${summary.romPhysicalFrames}`);
console.log(`unresolvedFrames=${summary.unresolvedFrames}`);
console.log(`statuses=${Object.entries(summary.byStatus).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

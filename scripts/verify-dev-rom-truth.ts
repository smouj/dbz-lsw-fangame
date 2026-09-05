import { readFileSync } from 'node:fs';
import { romSequenceRegistrySummary } from '../src/data/romSequenceRegistry';
import { getBindingSummary, getRomActionSequenceBindings } from '../src/data/romActionSequenceBinding';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = ''): void {
  if (condition) { passed++; console.log(`  ✓ ${label}`); return; }
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

const registry = romSequenceRegistrySummary();
const bindings = getBindingSummary();
const corpus = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
const animationCore = readFileSync('src/battle/animationStudio.ts', 'utf8');
const animationUi = readFileSync('src/devtools/animationStudio.tsx', 'utf8');
const cardsUi = readFileSync('src/devtools/cards.tsx', 'utf8');
const charactersUi = readFileSync('src/devtools/characters.tsx', 'utf8');
const summaryUi = readFileSync('src/devtools/PhysicalReconciliationSummary.tsx', 'utf8');

check('registry keeps all 66 catalog slots', registry.total === 66);
check('registry closes 62 physical resources', registry.physicalResourceFullyClosed === 62);
check('only four ROM slots are empty', registry.emptyResourceSlots === 4
  && registry.emptyResourceIds.join(',') === '40,41,42,64', registry.emptyResourceIds.join(','));
check('all 125 cards have a ROM action binding', bindings.totalBindings === 125);
check('every binding has an explicit actor track', getRomActionSequenceBindings().every(binding =>
  binding.tracks.some(track => track.trackId === 'actor')));
check('physical corpus indexes 48 forms without blockers', corpus.formsIndexed === 48
  && corpus.formsPaletteBlocked === 0 && corpus.formsResourceBlocked === 0);
check('Animation Studio reads current registry authority', animationCore.includes('getRomSequenceRegistry'));
check('Standard Damage golden context uses actor resource $2C', animationCore.includes('resourceId: 0x2c'));
check('Animation Studio names Bank $61 handler tracks', animationCore.includes('ROM_HANDLER_TRACK') && animationUi.includes('Bank $61'));
check('stale decode claims removed from golden contexts', !animationCore.includes('frame stream no extraído aún')
  && !animationCore.includes('sin recurso ROM decodificado dedicado'));
check('Cards exposes one coherent ROM Truth Card', cardsUi.includes('ROM Truth Card')
  && cardsUi.includes('NONE — ROM byte[6] = $FF') && cardsUi.includes('ROM_STANDARD_DAMAGE_RESULT_PHYSICAL'));
check('Characters keeps $FF actor actions visible', charactersUi.includes('return cardBindings;')
  && charactersUi.includes('NO ACTOR (ROM)'));
check('current summary has no historical OPEN milestones', !summaryUi.includes('V7 OPEN')
  && !summaryUi.includes('runtime cutover pending') && !summaryUi.includes('Legacy Tail'));

console.log(`\nDEV ROM TRUTH: ${passed} passed · ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'));
  process.exit(1);
}

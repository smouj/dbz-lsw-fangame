import {
  ANIMATION_RESOURCE_CATALOG,
  ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE,
  animationResourceBank,
  animationResourceById,
  animationResourceSummary,
  listAnimationResources,
} from '../src/battle/animationResources';
import { CARDS } from '../src/data/cards';
import { ROM_TECHNIQUES } from '../src/data/romAnimationData';
import { romCardData } from '../src/data/romCardData';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function signed(byte: number): number {
  return byte > 127 ? byte - 256 : byte;
}

function actorAnimFor(cardName: string): number | null {
  const rom = romCardData(cardName);
  if (!rom || rom.actorAnim === 0xff) return null;
  return rom.actorAnim;
}

const entries = ANIMATION_RESOURCE_CATALOG;
const entriesAgain = listAnimationResources();
const byId = new Map(entries.map(entry => [entry.resourceId, entry]));
const referencedResources = new Set<number>();

check('catalog:bank layout count', entries.length === 66, String(entries.length));
check('catalog:unique resource ids', byId.size === entries.length, `${byId.size}/${entries.length}`);
check('catalog:deterministic const/list', JSON.stringify(entries) === JSON.stringify(entriesAgain));
check('catalog:lookup identity', entries.every(entry => animationResourceById(entry.resourceId) === entry));
check('selector: 66 resources explained', ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.resourceCount === 66);
check('selector: 43 unique selector tables', ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.uniqueSelectorTables === 43);
check('selector: 22 multi-sequence resources', ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.multiSequenceResources.length === 22);
check('selector: row format profile/selector/param0/param1', ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.rowFormat.join(',') === 'actorVisualProfileKey,sequenceSelector,param0,param1');
check('selector: writes C3C7/C2D0/C2D1', ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.writes.sequenceSelector === 0xc3c7 && ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.writes.param0 === 0xc2d0 && ANIMATION_RESOURCE_SELECTOR_ARCHITECTURE.writes.param1 === 0xc2d1);

for (const card of CARDS) {
  const rom = romCardData(card.name);
  check(`card:${card.id}:rom data`, !!rom, card.name);
  const resourceId = actorAnimFor(card.name);
  if (resourceId == null) continue;
  referencedResources.add(resourceId);
  const bank = animationResourceBank(resourceId);
  const entry = animationResourceById(resourceId);
  check(`card:${card.id}:resource bank`, !!bank, `resource=${resourceId}`);
  check(`card:${card.id}:resource inventoried`, !!entry, `resource=${resourceId}`);
  check(`card:${card.id}:resource has card ref`, !!entry?.cards.some(ref => ref.id === card.id), card.name);
}

for (const entry of entries) {
  const bank = animationResourceBank(entry.resourceId);
  check(`resource:${entry.resourceHex}:bank`, !!bank, entry.bankHex);
  check(`resource:${entry.resourceHex}:bank matches`, bank?.bank === entry.bank && bank?.localId === entry.localId);
  check(`resource:${entry.resourceHex}:hex`, entry.resourceHex === `0x${entry.resourceId.toString(16).padStart(2, '0')}`);
  check(`resource:${entry.resourceHex}:bankHex`, entry.bankHex === `0x${entry.bank.toString(16).padStart(2, '0')}`);
  check(`resource:${entry.resourceHex}:handler set`, entry.handlers.every(handler => entry.cards.some(card => card.handler === handler)));

  if (entry.cards.length > 0) {
    check(`resource:${entry.resourceHex}:referenced status`, entry.status !== 'UNKNOWN');
    check(`resource:${entry.resourceHex}:cards match refs`, entry.cards.every(ref => actorAnimFor(ref.name) === entry.resourceId));
  }

  if (entry.status === 'DECODED') {
    check(`resource:${entry.resourceHex}:decoded format`, entry.format === 'KNOWN_FORMAT', entry.format);
    check(`resource:${entry.resourceHex}:decoded evidence`, entry.evidence === 'ROM_SEQUENCE_VERIFIED', entry.evidence);
    check(`resource:${entry.resourceHex}:decoded technique`, !!entry.sourceTechnique && !!ROM_TECHNIQUES[entry.sourceTechnique]);
    check(`resource:${entry.resourceHex}:sequences`, entry.sequenceCount > 0, String(entry.sequenceCount));
    check(`resource:${entry.resourceHex}:physical frames`, entry.physicalFrameCount > 0, String(entry.physicalFrameCount));
  }

  if (entry.status === 'SPECIAL') {
    check(`resource:${entry.resourceHex}:special format`, entry.format === 'SPECIAL', entry.format);
    check(`resource:${entry.resourceHex}:special evidence`, entry.evidence === 'ROM_HANDLER_VERIFIED', entry.evidence);
  }

  if (entry.status === 'PARTIAL') {
    check(`resource:${entry.resourceHex}:partial format`, entry.format === 'KNOWN_FORMAT', entry.format);
    check(`resource:${entry.resourceHex}:partial evidence`, entry.evidence === 'ROM_STATIC_VERIFIED', entry.evidence);
  }

  if (entry.status === 'UNKNOWN') {
    check(`resource:${entry.resourceHex}:unknown unreferenced`, entry.cards.length === 0, `${entry.cards.length} refs`);
    check(`resource:${entry.resourceHex}:unknown evidence`, entry.evidence === 'PENDING_ROM_TRACE', entry.evidence);
  }

  let previousAddr = -1;
  for (const [sequenceIndex, sequence] of entry.sequences.entries()) {
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:addr`, Number.isInteger(sequence.addr) && sequence.addr > 0, String(sequence.addr));
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:order`, sequence.addr > previousAddr, `${previousAddr} -> ${sequence.addr}`);
    previousAddr = sequence.addr;
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:frames`, sequence.frames.length > 0, String(sequence.frames.length));

    let sumTicks = 0;
    for (const [frameIndex, frame] of sequence.frames.entries()) {
      sumTicks += frame.durationTicks;
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:duration`, Number.isInteger(frame.durationTicks) && frame.durationTicks > 0, String(frame.durationTicks));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:visualFrameId`, Number.isInteger(frame.visualFrameId) && frame.visualFrameId >= 0 && frame.visualFrameId <= 255, String(frame.visualFrameId));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:offsetX signed`, Number.isInteger(frame.offsetX) && frame.offsetX >= -128 && frame.offsetX <= 127, String(frame.offsetX));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:offsetY signed`, Number.isInteger(frame.offsetY) && frame.offsetY >= -128 && frame.offsetY <= 127, String(frame.offsetY));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw tuple`, frame.raw.length === 4, String(frame.raw.length));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw bytes`, frame.raw.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255), String(frame.raw));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw meta`, frame.raw[0] === frame.visualFrameId, `${frame.raw[0]} vs ${frame.visualFrameId}`);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw duration`, frame.raw[1] === frame.durationTicks, `${frame.raw[1]} vs ${frame.durationTicks}`);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw offsetY`, signed(frame.raw[2]) === frame.offsetY, `${signed(frame.raw[2])} vs ${frame.offsetY}`);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw offsetX`, signed(frame.raw[3]) === frame.offsetX, `${signed(frame.raw[3])} vs ${frame.offsetX}`);
    }
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:totalTicks`, sequence.totalTicks === sumTicks, `${sequence.totalTicks} vs ${sumTicks}`);
  }

  const notes = entry.notes.join(' ');
  check(
    `resource:${entry.resourceHex}:notes do not invent card semantics`,
    !entry.cards.some(card => notes.includes(card.name)),
  );
}

for (const [techniqueName, technique] of Object.entries(ROM_TECHNIQUES)) {
  const entry = animationResourceById(technique.animationResource);
  check(`technique:${techniqueName}:resource entry`, !!entry, String(technique.animationResource));
  check(`technique:${techniqueName}:decoded status`, entry?.status === 'DECODED', entry?.status);
  check(`technique:${techniqueName}:sequence order preserved`, JSON.stringify(entry?.sequences.map(seq => seq.addr)) === JSON.stringify(technique.sequences.map(seq => seq.addr)));
}

const summary = animationResourceSummary();
check('summary:resources', summary.resources === 66, String(summary.resources));
check('summary:referenced', summary.referenced === referencedResources.size, `${summary.referenced}/${referencedResources.size}`);
check('summary:decoded', summary.decoded === 14, String(summary.decoded));
check('summary:cards covered decoded', summary.cardsCoveredByDecodedResources === 18, String(summary.cardsCoveredByDecodedResources));

console.log('═══ ANIMATION RESOURCE DECODING ═══');
console.log(`resources=${summary.resources}`);
console.log(`referenced=${summary.referenced}`);
console.log(`decoded=${summary.decoded}`);
console.log(`partial=${summary.partial}`);
console.log(`special=${summary.special}`);
console.log(`unknown=${summary.unknown}`);
console.log(`cardsCoveredByDecodedResources=${summary.cardsCoveredByDecodedResources}`);
console.log(`statuses=${Object.entries(summary.byStatus).map(([k, v]) => `${k}:${v}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

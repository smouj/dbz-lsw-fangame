import {
  ANIMATION_RESOURCE_CATALOG,
  animationResourceBank,
  animationResourceById,
  animationResourceSummary,
  listAnimationResources,
} from '../src/battle/animationResources';
import { CARDS } from '../src/data/cards';
import { romCardData } from '../src/data/romCardData';
import {
  ROM_FULL_ANIMATION_EMPTY_SLOTS,
  ROM_FULL_ANIMATION_RESOURCES,
  ROM_FULL_ANIMATION_SUMMARY,
} from '../src/data/generated/romFullAnimationResources.generated';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function signed(byte: number): number { return byte > 127 ? byte - 256 : byte; }

const entries = ANIMATION_RESOURCE_CATALOG;
const byId = new Map(entries.map((entry) => [entry.resourceId, entry]));
const referenced = new Set<number>();

check('catalog:66 slots', entries.length === 66, String(entries.length));
check('catalog:unique ids', byId.size === 66, String(byId.size));
check('catalog:deterministic', JSON.stringify(entries) === JSON.stringify(listAnimationResources()));
check('physical:62 non-empty resources', ROM_FULL_ANIMATION_RESOURCES.length === 62, String(ROM_FULL_ANIMATION_RESOURCES.length));
check('physical:4 empty slots', ROM_FULL_ANIMATION_EMPTY_SLOTS.length === 4, String(ROM_FULL_ANIMATION_EMPTY_SLOTS.length));
check('physical:summary catalog sequences', ROM_FULL_ANIMATION_SUMMARY.catalogSequences === 119, String(ROM_FULL_ANIMATION_SUMMARY.catalogSequences));
check('physical:summary catalog frame instances', ROM_FULL_ANIMATION_SUMMARY.catalogFrameRecordInstances === 2458, String(ROM_FULL_ANIMATION_SUMMARY.catalogFrameRecordInstances));
check('physical:summary catalog physical definitions', ROM_FULL_ANIMATION_SUMMARY.catalogPhysicalFrameDefinitions === 445, String(ROM_FULL_ANIMATION_SUMMARY.catalogPhysicalFrameDefinitions));

for (const card of CARDS) {
  const rom = romCardData(card.name);
  check(`card:${card.id}:rom data`, !!rom, card.name);
  if (!rom || rom.actorAnim === 0xff) continue;
  referenced.add(rom.actorAnim);
  const entry = animationResourceById(rom.actorAnim);
  check(`card:${card.id}:resource inventoried`, !!entry, `resource=${rom.actorAnim}`);
  check(`card:${card.id}:resource card ref`, !!entry?.cards.some((ref) => ref.id === card.id), card.name);
}

for (const entry of entries) {
  const bank = animationResourceBank(entry.resourceId);
  check(`resource:${entry.resourceHex}:bank`, !!bank, entry.bankHex);
  check(`resource:${entry.resourceHex}:bank matches`, bank?.bank === entry.bank && bank.localId === entry.localId);
  check(`resource:${entry.resourceHex}:lookup identity`, animationResourceById(entry.resourceId) === entry);
  check(`resource:${entry.resourceHex}:handlers`, entry.handlers.every((handler) => entry.cards.some((card) => card.handler === handler)));

  if (entry.status === 'EMPTY') {
    check(`resource:${entry.resourceHex}:empty format`, entry.format === 'EMPTY_SLOT', entry.format);
    check(`resource:${entry.resourceHex}:empty evidence`, entry.evidence === 'ROM_EMPTY_SLOT_VERIFIED', entry.evidence);
    check(`resource:${entry.resourceHex}:empty sequences`, entry.sequenceCount === 0 && entry.sequences.length === 0, String(entry.sequenceCount));
    check(`resource:${entry.resourceHex}:empty physical frames`, entry.physicalFrameCount === 0, String(entry.physicalFrameCount));
    continue;
  }

  check(`resource:${entry.resourceHex}:decoded`, entry.status === 'DECODED', entry.status);
  check(`resource:${entry.resourceHex}:known format`, entry.format === 'KNOWN_FORMAT', entry.format);
  check(`resource:${entry.resourceHex}:catalog evidence`, entry.evidence === 'ROM_CATALOG_VERIFIED', entry.evidence);
  check(`resource:${entry.resourceHex}:sequences`, entry.sequenceCount > 0, String(entry.sequenceCount));
  check(`resource:${entry.resourceHex}:frame instances`, entry.sequenceFrameInstances > 0, String(entry.sequenceFrameInstances));

  for (const [sequenceIndex, sequence] of entry.sequences.entries()) {
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:address`, Number.isInteger(sequence.addr) && sequence.addr > 0, String(sequence.addr));
    let ticks = 0;
    for (const [frameIndex, frame] of sequence.frames.entries()) {
      ticks += frame.durationTicks;
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:duration`, frame.durationTicks > 0, String(frame.durationTicks));
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:physical index`, frame.visualFrameId >= 0 && frame.visualFrameId < entry.physicalFrameCount, `${frame.visualFrameId}/${entry.physicalFrameCount}`);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw meta`, frame.raw[0] === frame.visualFrameId);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw duration`, frame.raw[1] === frame.durationTicks);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw offsetY`, signed(frame.raw[2]) === frame.offsetY);
      check(`resource:${entry.resourceHex}:seq:${sequenceIndex}.${frameIndex}:raw offsetX`, signed(frame.raw[3]) === frame.offsetX);
    }
    check(`resource:${entry.resourceHex}:seq:${sequenceIndex}:ticks`, ticks === sequence.totalTicks, `${ticks}/${sequence.totalTicks}`);
  }
}

const summary = animationResourceSummary();
check('summary:resources', summary.resources === 66, String(summary.resources));
check('summary:referenced resources', summary.referenced === referenced.size, `${summary.referenced}/${referenced.size}`);
check('summary:decoded', summary.decoded === 62, String(summary.decoded));
check('summary:empty', summary.empty === 4, String(summary.empty));
check('summary:no partial', summary.partial === 0, String(summary.partial));
check('summary:no special physical resources', summary.special === 0, String(summary.special));
check('summary:no unknown physical resources', summary.unknown === 0, String(summary.unknown));
check('summary:decoded actor cards', summary.cardsCoveredByDecodedResources === 66, String(summary.cardsCoveredByDecodedResources));
check('summary:empty-slot actor cards', summary.cardsReferencingEmptySlots === 4, String(summary.cardsReferencingEmptySlots));

console.log('═══ FULL ANIMATION RESOURCE PHYSICAL CATALOG ═══');
console.log(`resources=${summary.resources} decoded=${summary.decoded} empty=${summary.empty}`);
console.log(`referenced=${summary.referenced} decodedActorCards=${summary.cardsCoveredByDecodedResources} emptySlotCards=${summary.cardsReferencingEmptySlots}`);
console.log(`catalogFrames=${ROM_FULL_ANIMATION_SUMMARY.catalogFrameRecordInstances} physicalDefinitions=${ROM_FULL_ANIMATION_SUMMARY.catalogPhysicalFrameDefinitions}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

import { CARDS } from '../src/data/cards';
import { romCardData } from '../src/data/romCardData';
import {
  buildRomSequenceRegistry,
  getRomSequenceRegistry,
  setRomSequenceRegistryOverride,
} from '../src/data/romSequenceRegistry';
import {
  getRomActionSequenceBindings,
  getBindingSummary,
  getConsumersForResource,
  getBindingForCard,
} from '../src/data/romActionSequenceBinding';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROM_PATH = process.env.ROM_PATH ?? resolve(process.cwd(), '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const romBuffer = readFileSync(ROM_PATH);
setRomSequenceRegistryOverride(buildRomSequenceRegistry(romBuffer));

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const bindings = getRomActionSequenceBindings();
const registry = getRomSequenceRegistry();
const summary = getBindingSummary();
const byCard = new Map(bindings.map((binding) => [binding.card.id, binding]));

check('bindings:125 cards', bindings.length === 125, String(bindings.length));
check('bindings:unique cards', byCard.size === CARDS.length, `${byCard.size}/${CARDS.length}`);
check('registry:66 catalog slots', registry.length === 66, String(registry.length));
check('registry:62 physical resources', registry.filter((entry) => entry.status === 'PHYSICAL_RESOURCE_FULLY_CLOSED').length === 62);
check('registry:4 empty resource slots', registry.filter((entry) => entry.status === 'EMPTY_RESOURCE_SLOT').length === 4);

for (const card of CARDS) {
  const binding = byCard.get(card.id);
  const rom = romCardData(card.name);
  check(`card:${card.id}:binding`, !!binding, card.name);
  check(`card:${card.id}:rom`, !!rom, card.name);
  if (!binding || !rom) continue;

  const actorTrack = binding.tracks.find((track) => track.trackId === 'actor');
  const expectedResource = rom.actorAnim === 0xff ? null : rom.actorAnim;
  check(`card:${card.id}:actor resource`, actorTrack?.resourceId === expectedResource, `${actorTrack?.resourceId}/${expectedResource}`);

  if (expectedResource == null) {
    check(`card:${card.id}:no actor sequence`, actorTrack?.sequences.length === 0, String(actorTrack?.sequences.length));
    continue;
  }

  const resource = registry.find((entry) => entry.resourceId === expectedResource);
  check(`card:${card.id}:registry resource`, !!resource, String(expectedResource));
  if (!resource || !actorTrack) continue;

  if (resource.status === 'EMPTY_RESOURCE_SLOT') {
    check(`card:${card.id}:empty slot has no sequences`, actorTrack.sequences.length === 0, actorTrack.sequences.join(','));
    check(`card:${card.id}:empty slot status`, actorTrack.physicalStatus === 'EMPTY_RESOURCE_SLOT', actorTrack.physicalStatus);
  } else {
    check(`card:${card.id}:all ROM sequences exposed`, actorTrack.sequences.length === resource.sequences.length, `${actorTrack.sequences.length}/${resource.sequences.length}`);
    check(`card:${card.id}:physical status closed`, actorTrack.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED', actorTrack.physicalStatus);
    check(`card:${card.id}:frame count`, actorTrack.totalFrames === resource.totalFrameInstances, `${actorTrack.totalFrames}/${resource.totalFrameInstances}`);
    check(`card:${card.id}:tick count`, actorTrack.totalTicks === resource.totalTicks, `${actorTrack.totalTicks}/${resource.totalTicks}`);
  }
}

for (const resource of registry) {
  const consumers = getConsumersForResource(resource.resourceId);
  for (const consumer of consumers) {
    const binding = getBindingForCard(consumer.cardId);
    check(`resource:${resource.resourceHex}:consumer:${consumer.cardId}`, !!binding, consumer.cardName);
    check(
      `resource:${resource.resourceHex}:consumer:${consumer.cardId}:track`,
      !!binding?.tracks.some((track) => track.resourceId === resource.resourceId),
      consumer.cardName,
    );
  }

  if (resource.status === 'EMPTY_RESOURCE_SLOT') {
    check(`resource:${resource.resourceHex}:empty`, resource.sequences.length === 0 && resource.totalFrameInstances === 0 && resource.physicalFrameCount === 0);
    continue;
  }

  check(`resource:${resource.resourceHex}:has sequences`, resource.sequences.length > 0, String(resource.sequences.length));
  for (const [sequenceIndex, sequence] of resource.sequences.entries()) {
    for (const frame of sequence.frames) {
      check(`resource:${resource.resourceHex}:seq:${sequenceIndex}:linkage`, frame.linkageResolved);
      check(`resource:${resource.resourceHex}:seq:${sequenceIndex}:piece count`, frame.metaspritePieceCount > 0, String(frame.metaspritePieceCount));
      check(`resource:${resource.resourceHex}:seq:${sequenceIndex}:graphics count`, frame.graphicsBlockCount === frame.metaspritePieceCount, `${frame.graphicsBlockCount}/${frame.metaspritePieceCount}`);
    }
  }
}

check('summary:with actor resource', summary.withActorResource === 70, String(summary.withActorResource));
check('summary:no resource-level unknown physical status', (summary.byPhysicalStatus.FRAME_STREAM_CLOSED ?? 0) === 0 && (summary.byPhysicalStatus.METASPRITE_LINK_PENDING ?? 0) === 0);
check('summary:empty actor tracks', (summary.byPhysicalStatus.EMPTY_RESOURCE_SLOT ?? 0) === 4, String(summary.byPhysicalStatus.EMPTY_RESOURCE_SLOT ?? 0));

console.log('═══ ROM ACTION SEQUENCE BINDINGS — FULL PHYSICAL CATALOG ═══');
console.log(`bindings=${bindings.length} withActorResource=${summary.withActorResource}`);
console.log(`registry=66 physical=62 empty=4`);
console.log(`selectorKinds=${Object.entries(summary.bySelectorKind).map(([key, value]) => `${key}:${value}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

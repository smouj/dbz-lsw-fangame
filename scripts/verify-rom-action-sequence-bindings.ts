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
import {
  ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS,
  romSpecialHandlerBinding,
} from '../src/data/generated/romSpecialHandlerSequenceBindings.generated';
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

const SPECIAL_HANDLERS = new Set([0x0b, 0x0c, 0x0d, 0x0e]);

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

  const expectedResource = rom.actorAnim === 0xff ? null : rom.actorAnim;
  const actorTracks = binding.tracks.filter((track) => track.resourceId === expectedResource && track.trackId.startsWith('actor'));
  const actorTrack = actorTracks.find((track) => track.trackId === 'actor');
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
    continue;
  }

  check(`card:${card.id}:physical status closed`, actorTrack.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED', actorTrack.physicalStatus);

  if (SPECIAL_HANDLERS.has(rom.exec)) {
    // Special handlers now expose fixed phase tracks from the SSOT (literal
    // $C3C7/$C3C6 selector writes), not a single RESULT_BRANCH actor track.
    // Only the "signature" card (actorAnim === SSOT actorResource) receives
    // phase tracks; other cards sharing the handler fall through to the
    // generic single-track path below.
    const ssot = romSpecialHandlerBinding(rom.exec);
    const isSignature = !!ssot && rom.actorAnim === ssot.actorResource;
    if (isSignature && ssot) {
      check(`card:${card.id}:special phase count`, actorTracks.length === ssot.phases.length, `${actorTracks.length}/${ssot.phases.length}`);
      const exposed = actorTracks.map((track) => track.sequences[0]);
      const expected = ssot.phases.map((phase) => phase.sequence);
      check(`card:${card.id}:special sequences`, JSON.stringify(exposed) === JSON.stringify(expected), `${exposed.join(',')} vs ${expected.join(',')}`);
      for (let i = 0; i < ssot.phases.length; i++) {
        const phase = ssot.phases[i];
        const track = actorTracks[i];
        const label = `card:${card.id}:special:${ssot.cardName}:phase${i}`;
        if (!track) {
          check(`${label}:exists`, false, 'missing');
          continue;
        }
        check(`${label}:fixed selector`, track.selector.kind === 'FIXED' && track.selector.value === phase.sequence, `${track.selector.kind}/${track.selector.value}`);
        check(`${label}:slot`, track.slot === phase.slot, `${track.slot}/${phase.slot}`);
        check(`${label}:frame count`, track.totalFrames === phase.frameCount, `${track.totalFrames}/${phase.frameCount}`);
        check(`${label}:tick count`, track.totalTicks === phase.totalTicks, `${track.totalTicks}/${phase.totalTicks}`);
      }
      continue;
    }
  }

  check(`card:${card.id}:all ROM sequences exposed`, actorTrack.sequences.length === resource.sequences.length, `${actorTrack.sequences.length}/${resource.sequences.length}`);
  check(`card:${card.id}:frame count`, actorTrack.totalFrames === resource.totalFrameInstances, `${actorTrack.totalFrames}/${resource.totalFrameInstances}`);
  check(`card:${card.id}:tick count`, actorTrack.totalTicks === resource.totalTicks, `${actorTrack.totalTicks}/${resource.totalTicks}`);
}

// Resource-level coverage: every physical resource used as an actor resource must
// have ALL its sequences reachable through actor tracks. This accounts for shared
// resources (e.g. $1C split across Purple Comet and P.Comet Z).
for (const resource of registry) {
  if (resource.status === 'EMPTY_RESOURCE_SLOT') continue;
  const covered = new Set<number>();
  for (const binding of bindings) {
    for (const track of binding.tracks) {
      if (track.resourceId === resource.resourceId && track.trackId.startsWith('actor')) {
        for (const seq of track.sequences) covered.add(seq);
      }
    }
  }
  if (covered.size === 0) continue;
  check(
    `resource:${resource.resourceHex}:all sequences covered by actor consumers`,
    covered.size === resource.sequences.length && resource.sequences.every((_, index) => covered.has(index)),
    `covered=${[...covered].sort((a, b) => a - b).join(',')} total=${resource.sequences.length}`,
  );
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

const fxTracks = bindings.flatMap((binding) => binding.tracks.filter((track) => track.trackId === 'fx'));
const dynamicTracks = bindings.flatMap((binding) => binding.tracks.filter((track) => track.selector.kind === 'DYNAMIC_PENDING'));
check('fx display:all tracks are non-sequence resources', fxTracks.every((track) => track.selector.kind === 'NON_SEQUENCE_DISPLAY'), `${fxTracks.filter((track) => track.selector.kind !== 'NON_SEQUENCE_DISPLAY').length} invalid`);
check('fx display:no false dynamic sequence selectors', fxTracks.every((track) => track.selector.kind !== 'DYNAMIC_PENDING'));
check('dynamic selectors:actor tracks only', dynamicTracks.every((track) => track.trackId.startsWith('actor')), `${dynamicTracks.filter((track) => !track.trackId.startsWith('actor')).length} non-actor`);
const handler07Bindings = bindings.filter((binding) => binding.execution.handler === 0x07);
check('handler $07:all actor selectors use the ROM profile table', handler07Bindings.every((binding) => binding.tracks.find((track) => track.trackId === 'actor')?.selector.kind === 'ACTOR_PROFILE'), `${handler07Bindings.filter((binding) => binding.tracks.find((track) => track.trackId === 'actor')?.selector.kind !== 'ACTOR_PROFILE').length} invalid`);
check('handler $07:no dynamic actor selector remains', handler07Bindings.every((binding) => binding.tracks.every((track) => track.selector.kind !== 'DYNAMIC_PENDING')));

const barrierTrack = byCard.get(45)?.tracks.find((track) => track.trackId === 'actor');
const breathTrack = byCard.get(53)?.tracks.find((track) => track.trackId === 'actor');
const taiyokenTrack = byCard.get(19)?.tracks.find((track) => track.trackId === 'actor');
check('AnimationSlot8:Barrier selector is ROM profile table', barrierTrack?.selector.kind === 'DEFENSE_SLOT8_PROFILE', barrierTrack?.selector.kind);
check('AnimationSlot8:Breath selector is ROM profile table', breathTrack?.selector.kind === 'DEFENSE_SLOT8_PROFILE', breathTrack?.selector.kind);
check('AnimationSlot8:Taiyoken remains pending for profile $1B', taiyokenTrack?.selector.kind === 'DYNAMIC_PENDING' && taiyokenTrack.selector.evidence.includes('ginyu/$1b'), taiyokenTrack?.selector.evidence);
check('AnimationSlot8:exactly one actor selector remains', dynamicTracks.length === 1 && dynamicTracks[0] === taiyokenTrack, `${dynamicTracks.length}`);

const standardDamageCardIds = CARDS
  .filter((card) => romCardData(card.name)?.exec === 0x0a)
  .map((card) => card.id);
check('standard-damage:19 cards', standardDamageCardIds.length === 19, String(standardDamageCardIds.length));
for (const cardId of standardDamageCardIds) {
  const track = byCard.get(cardId)?.tracks.find((item) => item.trackId === 'actor');
  check(`standard-damage:${cardId}:result branch selector`, track?.selector.kind === 'RESULT_BRANCH', track?.selector.kind);
  check(`standard-damage:${cardId}:seq0+seq1 exposed`, track?.sequences.length === 2, String(track?.sequences.length));
}

// Special-handler phase model validation (supersedes the older RESULT_BRANCH checks).
for (const ssot of ROM_SPECIAL_HANDLER_SEQUENCE_BINDINGS) {
  const signatureCards = CARDS.filter((card) => {
    const rom = romCardData(card.name);
    return rom?.exec === ssot.handler && rom.actorAnim === ssot.actorResource;
  });
  check(`special:${ssot.cardName}:signature card`, signatureCards.length === 1, `cards=${signatureCards.map((card) => card.id).join(',')}`);
  const card = signatureCards[0];
  if (!card) continue;
  const binding = byCard.get(card.id);
  const tracks = binding?.tracks.filter((track) => track.resourceId === ssot.actorResource && track.trackId.startsWith('actor')) ?? [];
  check(`special:${ssot.cardName}:phase count`, tracks.length === ssot.phases.length, `${tracks.length}/${ssot.phases.length}`);
  check(`special:${ssot.cardName}:no unresolved sequences`, ssot.unresolvedActorSequences.length === 0, ssot.unresolvedActorSequences.join(','));
  check(
    `special:${ssot.cardName}:worker retained`,
    binding?.execution.worker === `Bank${ssot.worker.bank}:$${ssot.worker.address.toString(16).toUpperCase()}`,
    String(binding?.execution.worker),
  );
  for (let i = 0; i < ssot.phases.length; i++) {
    const phase = ssot.phases[i];
    const track = tracks[i];
    const label = `special:${ssot.cardName}:phase${i}`;
    if (!track) {
      check(`${label}:exists`, false, 'missing');
      continue;
    }
    check(`${label}:sequence`, track.sequences.join(',') === String(phase.sequence), `${track.sequences.join(',')}/${phase.sequence}`);
    check(`${label}:slot`, track.slot === phase.slot, `${track.slot}/${phase.slot}`);
    check(`${label}:fixed selector`, track.selector.kind === 'FIXED' && track.selector.value === phase.sequence, `${track.selector.kind}/${track.selector.value}`);
  }
}

console.log('═══ ROM ACTION SEQUENCE BINDINGS — FULL PHYSICAL CATALOG ═══');
console.log(`bindings=${bindings.length} withActorResource=${summary.withActorResource}`);
console.log(`registry=66 physical=62 empty=4`);
console.log(`selectorKinds=${Object.entries(summary.bySelectorKind).map(([key, value]) => `${key}:${value}`).join(' · ')}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { CARDS } from '../src/data/cards';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';
import { getBindingForCard } from '../src/data/romActionSequenceBinding';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';

const ROOT = process.cwd();
const ROM_SHA256 = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

type Completion = (typeof ROM_PHYSICAL_CORPUS_SUMMARY.resourcePhysicalCompletion)[number];
const completions = ROM_PHYSICAL_CORPUS_SUMMARY.resourcePhysicalCompletion as readonly Completion[];
const renderable = new Map(completions
  .filter(row => row.status === 'RENDERABLE' && row.consumerCount > 0)
  .map(row => [row.resourceId, row]));

check(ROM_PHYSICAL_CORPUS_SUMMARY.schemaVersion === 2, 'corpus schemaVersion must be 2');
check(ROM_PHYSICAL_CORPUS_SUMMARY.offsetEncoding === 's8', 'offset encoding must be signed s8');
check(ROM_PHYSICAL_CORPUS_SUMMARY.romSha256 === ROM_SHA256, 'corpus ROM hash mismatch');
check(ROM_PHYSICAL_CORPUS_SUMMARY.paletteBlockedProfiles.length === 0, 'palette blocked profiles remain');
check(ROM_PHYSICAL_CORPUS_SUMMARY.resourceBlockedProfiles.length === 0, 'resource blocked profiles remain');

for (const row of renderable.values()) {
  check(row.physicalLinkage === 'FULL', `${row.resourceHex}: physical linkage is not FULL`);
  check(row.sequences > 0 && row.frames > 0 && row.frameInstances > 0, `${row.resourceHex}: empty sequence/frame corpus`);
  check(row.profilesRendered > 0 && row.physicalIds > 0, `${row.resourceHex}: no rendered profiles/physical IDs`);
  check(row.consumers.length === row.consumerCount, `${row.resourceHex}: consumer count mismatch`);
  check(row.consumers.every(consumer => CARDS.some(card => card.id === consumer.cardId && card.name === consumer.name)), `${row.resourceHex}: invalid card consumer`);
}

let verifiedConsumers = 0;
let selectorPendingConsumers = 0;
let nonCinematicConsumers = 0;
let verifiedPngs = 0;
let verifiedOccurrences = 0;
const globalPhysicalIds = new Map<string, string>();

// Physical PNG exports are generated and never committed (.gitignore keeps
// public/assets/sprites/*/physical/ out of the repo), so CI cannot run the
// byte-level PNG checks. Mirror verify:rom-physical-corpus: strict PNG checks
// run locally (exports present) or on demand via REQUIRE_ROM_PHYSICAL_EXPORTS=1
// after `npm run gen:rom-runtime-assets`; provenance/consumer/route checks on
// committed data below still run everywhere.
const REQUIRE_ROM_PHYSICAL_EXPORTS = process.env.REQUIRE_ROM_PHYSICAL_EXPORTS === '1';
const physicalExportsPresent = ROM_FIGHTER_FORM_IDENTITY.some(identity =>
  existsSync(join(ROOT, 'public', 'assets', 'sprites', identity.formId, 'rom-physical.manifest.json')));
const strictPhysicalExports = physicalExportsPresent || REQUIRE_ROM_PHYSICAL_EXPORTS;
if (!strictPhysicalExports) {
  console.log('SKIP ROM physical export PNG checks: generated fighter PNGs are not committed; set REQUIRE_ROM_PHYSICAL_EXPORTS=1 after npm run gen:rom-runtime-assets for the strict local gate.');
}

for (const identity of ROM_FIGHTER_FORM_IDENTITY) {
  const provenancePath = join(ROOT, 'public', 'assets', 'sprites', identity.formId, 'provenance.json');
  check(existsSync(provenancePath), `${identity.formId}: missing provenance.json`);
  if (!existsSync(provenancePath)) continue;
  const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as {
    schemaVersion: number;
    offsetEncoding: string;
    source: string;
    rom: { sha256: string };
    formProfile: { formId: string; actorVisualProfileKey: number };
    resourceProfileBlocked: unknown[];
    transparentFrameRecords: Array<{ physicalRender: string }>;
    frames: Array<{
      physicalId: string;
      file: string;
      resourceId: number;
      visualFrameId: number;
      actorVisualProfileKey: number;
      width: number;
      height: number;
      hashes: { trimmedPixelHash: string; sourceProvenanceHash: string };
      sourceProvenance: { metaspriteHash: string; graphicsHash: string; sourceProvenanceHash: string };
      occurrences: Array<{ sequence: number; frameIndex: number; durationTicks: number; rawOffsetX: number; rawOffsetY: number; offsetX: number; offsetY: number; raw: number[]; frameAddress: number }>;
    }>;
  };
  check(provenance.schemaVersion === 2 && provenance.offsetEncoding === 's8', `${identity.formId}: invalid provenance schema/offset encoding`);
  check(provenance.source === 'ROM_PHYSICAL_FIGHTERS' && provenance.rom.sha256 === ROM_SHA256, `${identity.formId}: invalid ROM provenance`);
  check(provenance.formProfile.formId === identity.formId && provenance.formProfile.actorVisualProfileKey === identity.actorVisualProfileKey, `${identity.formId}: profile identity mismatch`);
  check(provenance.resourceProfileBlocked.length === 0, `${identity.formId}: blocked resource/profile records remain`);
  check(
    provenance.transparentFrameRecords.every(record => record.physicalRender === 'EMPTY_NOT_PROMOTED'),
    `${identity.formId}: transparent frame was promoted or has an unknown disposition`,
  );

  for (const frame of provenance.frames.filter(frame => renderable.has(frame.resourceId))) {
    if (!strictPhysicalExports) continue; // PNG byte checks need the uncommitted export corpus
    const pngPath = join(ROOT, 'public', 'assets', 'sprites', identity.formId, frame.file);
    check(existsSync(pngPath), `${identity.formId}/${frame.file}: PNG missing`);
    if (!existsSync(pngPath)) continue;
    const bytes = readFileSync(pngPath);
    const png = PNG.sync.read(bytes);
    let opaquePixels = 0;
    for (let index = 3; index < png.data.length; index += 4) if (png.data[index]! > 0) opaquePixels++;
    check(png.width === frame.width && png.height === frame.height, `${identity.formId}/${frame.file}: PNG dimensions mismatch`);
    check(opaquePixels > 0, `${identity.formId}/${frame.file}: fully transparent PNG`);
    check(frame.hashes.trimmedPixelHash.length >= 16 && frame.hashes.sourceProvenanceHash.length >= 16, `${identity.formId}/${frame.file}: incomplete hashes`);
    check(frame.sourceProvenance.metaspriteHash.length >= 16 && frame.sourceProvenance.graphicsHash.length >= 16, `${identity.formId}/${frame.file}: incomplete source provenance`);
    const fileSha = createHash('sha256').update(bytes).digest('hex');
    const prior = globalPhysicalIds.get(frame.physicalId);
    check(prior == null || prior === fileSha, `${frame.physicalId}: suspicious duplicate maps to different PNG bytes`);
    globalPhysicalIds.set(frame.physicalId, fileSha);
    verifiedPngs++;

    const occurrenceKeys = new Set<string>();
    for (const occurrence of frame.occurrences) {
      const key = `${occurrence.sequence}:${occurrence.frameIndex}`;
      check(!occurrenceKeys.has(key), `${identity.formId}/${frame.physicalId}: duplicate occurrence ${key}`);
      occurrenceKeys.add(key);
      check(Number.isInteger(occurrence.sequence) && occurrence.sequence >= 0 && Number.isInteger(occurrence.frameIndex) && occurrence.frameIndex >= 0, `${identity.formId}/${frame.physicalId}: invalid sequence/frame index`);
      check(Number.isInteger(occurrence.durationTicks) && occurrence.durationTicks > 0, `${identity.formId}/${frame.physicalId}: invalid ticks`);
      check(occurrence.offsetX === (occurrence.rawOffsetX >= 0x80 ? occurrence.rawOffsetX - 0x100 : occurrence.rawOffsetX), `${identity.formId}/${frame.physicalId}: offsetX is not signed s8`);
      check(occurrence.offsetY === (occurrence.rawOffsetY >= 0x80 ? occurrence.rawOffsetY - 0x100 : occurrence.rawOffsetY), `${identity.formId}/${frame.physicalId}: offsetY is not signed s8`);
      check(occurrence.raw.length === 4 && occurrence.raw[1] === occurrence.durationTicks, `${identity.formId}/${frame.physicalId}: raw frame/ticks mismatch`);
      check(Number.isInteger(occurrence.frameAddress) && occurrence.frameAddress > 0, `${identity.formId}/${frame.physicalId}: missing ROM frame address`);
      verifiedOccurrences++;
    }
  }

  for (const consumer of identity.compatibleCardConsumers.filter(card => renderable.has(card.actorAnim))) {
    const card = CARDS.find(candidate => candidate.id === consumer.cardId);
    check(!!card, `${identity.formId}: card ${consumer.cardId} missing from runtime catalog`);
    if (!card) continue;
    const route = romPresentationTimelineForCard(card, 'player', identity.formId);
    check(route != null, `${identity.formId}/${card.name}: ROM physical consumer has no runtime route`);
    if (!route) continue;
    // The profile completion contract is the promotion boundary. Dynamic special
    // handlers remain explicitly inventoried as PENDING_ROM_TRACE and are not
    // certified here until that status changes at the SSOT.
    if (route.profile.completion.static !== 'COMPLETE' || route.profile.completion.dynamic !== 'NOT_REQUIRED') continue;
    const pending = route.timeline.entries.filter(entry => entry.cue.type === 'ROM_PENDING');
    const physical = route.timeline.entries.filter(entry => entry.cue.type === 'ROM_PHYSICAL_FRAME');
    if (route.kind === 'DEFENSE_RULE' || route.kind === 'SUPPORT_SPECIAL' || route.kind === 'SUPPORT_FIELD_EFFECT') {
      check(physical.length === 0, `${identity.formId}/${card.name}: non-cinematic rule route must not start a fighter ActionObject`);
      nonCinematicConsumers++;
      continue;
    }
    const actorTrack = getBindingForCard(card.id)?.tracks.find(track => track.trackId === 'actor');
    if (actorTrack?.selector.kind === 'DYNAMIC_PENDING') {
      check(physical.length === 0, `${identity.formId}/${card.name}: dynamic selector must fail closed instead of choosing a physical sequence`);
      check(actorTrack.sequences.length > 1 && actorTrack.totalFrames > 0 && actorTrack.totalTicks > 0, `${identity.formId}/${card.name}: dynamic selector has no closed physical sequence corpus`);
      selectorPendingConsumers++;
      continue;
    }
    check(pending.length === 0 && route.pendingCues === 0, `${identity.formId}/${card.name}: pending ROM cues remain`);
    check(physical.length > 0, `${identity.formId}/${card.name}: promoted consumer emits no physical frames`);
    check(physical.every(entry => (entry.cue as { source?: string }).source === 'ROM_PHYSICAL'), `${identity.formId}/${card.name}: unresolved/fallback physical frame`);
    check(physical.every(entry => {
      const cue = entry.cue as { slot?: number; sequence?: number; frameIndex?: number; durationTicks?: number | null; physicalId?: string | null; file?: string | null; evidence?: string[] };
      return (cue.slot === 0 || cue.slot === 1) && Number.isInteger(cue.sequence) && Number.isInteger(cue.frameIndex) && (cue.durationTicks ?? 0) > 0 && !!cue.physicalId && !!cue.file && (cue.evidence?.length ?? 0) >= 4;
    }), `${identity.formId}/${card.name}: invalid slot/index/ticks/provenance/consumer binding`);
    verifiedConsumers++;
  }
}

console.log(`ROM physical combat: resources=${renderable.size} consumers=${verifiedConsumers} selectorPending=${selectorPendingConsumers} nonCinematic=${nonCinematicConsumers} pngs=${verifiedPngs} occurrences=${verifiedOccurrences} checks=${checks}`);
if (failures.length > 0) {
  console.error(`FAIL (${failures.length})`);
  for (const failure of failures.slice(0, 100)) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('PASS — every promoted ROM physical combat consumer either has a complete zero-pending runtime route or a closed physical corpus with an explicit fail-closed dynamic selector.');

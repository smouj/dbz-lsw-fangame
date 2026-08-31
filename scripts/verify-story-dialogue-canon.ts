import { strict as assert } from 'node:assert';
import {
  CANONICAL_STORY_ORDER,
  STORY_SEQUENCE_CANON,
  storyIdentityForSequence,
} from '../src/data/storyCanonical';
import {
  STORY_CUTSCENE_ASSETS,
  STORY_CUTSCENE_SEQUENCE_BINDINGS,
  STORY_CUTSCENE_CANON,
} from '../src/data/storyCutsceneCanon';
import { canonicalStoryNarrative } from '../src/data/storyNarrativeCanon';
import { storyPortraitUrl } from '../src/data/storyPortraits';
import { panelsForChapter } from '../src/data/storyPanels';
import { ROM_STORY_DIALOGUE_GENERATION } from '../src/data/generated/storyDialogueRom.generated';

function verifyStoryIdentity(): void {
  assert.equal(CANONICAL_STORY_ORDER.length, 32);
  assert.equal(CANONICAL_STORY_ORDER.filter((x) => x.kind === 'MAIN').length, 30);
  assert.equal(CANONICAL_STORY_ORDER.filter((x) => x.kind === 'EXTRA').length, 2);

  for (let sequenceIndex = 1; sequenceIndex <= 32; sequenceIndex++) {
    assert.equal(storyIdentityForSequence(sequenceIndex).sequenceIndex, sequenceIndex);
  }

  assert.equal(storyIdentityForSequence(20).id, 'STORY_20');
  assert.equal(storyIdentityForSequence(21).id, 'EX_STORY_01');
  assert.equal(storyIdentityForSequence(21).romStoryId, 33);
  assert.equal(storyIdentityForSequence(22).id, 'EX_STORY_02');
  assert.equal(storyIdentityForSequence(22).romStoryId, 34);
  assert.equal(storyIdentityForSequence(23).id, 'STORY_21');
  assert.equal(storyIdentityForSequence(32).id, 'STORY_30');
  assert.equal(STORY_SEQUENCE_CANON.mapRuntimeIncluded, false);
}

function verifyCutscenes(): void {
  assert.equal(STORY_CUTSCENE_ASSETS.length, 71);
  assert.equal(STORY_CUTSCENE_CANON.physicalAssetCount, 71);
  assert.equal(STORY_CUTSCENE_CANON.transitionAssetId, 71);
  assert.equal(STORY_CUTSCENE_CANON.mapRuntimeIncluded, false);

  for (let id = 1; id <= 71; id++) {
    const asset = STORY_CUTSCENE_ASSETS[id - 1];
    assert.equal(asset.id, id);
    assert.match(asset.file, new RegExp(`^${String(id).padStart(3, '0')}_`));
    assert.equal(asset.assetEvidence, 'ROM_EXTRACTED_PHYSICAL');
  }

  for (let sequenceIndex = 1; sequenceIndex <= 32; sequenceIndex++) {
    const ids = STORY_CUTSCENE_SEQUENCE_BINDINGS[sequenceIndex];
    assert.ok(ids?.length, `sequence ${sequenceIndex} must bind at least one cutscene`);
    for (const id of ids) assert.ok(id >= 5 && id <= 70, `invalid narrative cutscene #${id}`);
  }

  assert.deepEqual(STORY_CUTSCENE_SEQUENCE_BINDINGS[21], [49]);
  assert.deepEqual(STORY_CUTSCENE_SEQUENCE_BINDINGS[22], [50]);
  for (let sequenceIndex = 1; sequenceIndex <= 32; sequenceIndex++) {
    if (sequenceIndex !== 21) assert.ok(!STORY_CUTSCENE_SEQUENCE_BINDINGS[sequenceIndex].includes(49));
    if (sequenceIndex !== 22) assert.ok(!STORY_CUTSCENE_SEQUENCE_BINDINGS[sequenceIndex].includes(50));
  }
}

function verifyNarrativeProjection(): void {
  for (let sequenceIndex = 1; sequenceIndex <= 32; sequenceIndex++) {
    const identity = storyIdentityForSequence(sequenceIndex);
    const narrative = canonicalStoryNarrative(sequenceIndex);
    const panels = panelsForChapter(sequenceIndex);

    assert.equal(narrative.identity.id, identity.id);
    assert.equal(narrative.mapRuntimeIncluded, false);
    assert.ok(narrative.lines.length > 0, `${identity.id} needs at least one narrative line`);
    assert.equal(panels.canonicalStoryId, identity.id);
    assert.equal(panels.romStoryId, identity.romStoryId);
    assert.ok(panels.intro.length >= narrative.lines.length + 2);

    for (const panel of panels.intro) {
      assert.ok(panel.background.startsWith('/assets/cutscenes/'), `${panel.id}: non-cutscene background`);
      assert.notEqual(panel.provenance?.mapRuntimeIncluded, true, `${panel.id}: map runtime leaked into dialogue flow`);
      assert.ok(!panel.background.includes('/backgrounds/'), `${panel.id}: legacy world background leaked`);
    }
  }

  // The historical bug: EX entries must never consume Buu Story 21/22 text.
  // Evidence class per StoryTextEvidence union: EX entries are editorial
  // reconstructions (never ROM_LITERAL_TEXT) — see storyNarrativeCanon.ts.
  assert.equal(canonicalStoryNarrative(21).identity.id, 'EX_STORY_01');
  assert.equal(canonicalStoryNarrative(21).textEvidence, 'EDITORIAL_RECONSTRUCTION');
  assert.equal(canonicalStoryNarrative(22).identity.id, 'EX_STORY_02');
  assert.equal(canonicalStoryNarrative(22).textEvidence, 'EDITORIAL_RECONSTRUCTION');
  assert.equal(canonicalStoryNarrative(23).identity.id, 'STORY_21');
}

function verifyPortraitIdentity(): void {
  assert.match(storyPortraitUrl('vegeta', 'majin', 'angry') ?? '', /majin_vegeta_02\.png$/);
  assert.match(storyPortraitUrl('vegeta', 'majin', 'normal') ?? '', /majin_vegeta_01\.png$/);
  assert.match(storyPortraitUrl('gohan_adult', 'ssj', 'normal') ?? '', /gohan_adult_ssj\.png$/);
  assert.match(storyPortraitUrl('gohan_adult', undefined, 'normal') ?? '', /gohan_adult_01\.png$/);
  assert.match(storyPortraitUrl('trunks_kid', undefined, 'surprised') ?? '', /trunks_kid_02\.png$/);
  assert.match(storyPortraitUrl('trunks_future', 'ssj', 'normal') ?? '', /trunks_future_01\.png$/);
}

function verifyLiteralTextHonesty(): void {
  assert.equal(ROM_STORY_DIALOGUE_GENERATION.mapRuntimeIncluded, false);
  assert.equal(ROM_STORY_DIALOGUE_GENERATION.status, 'PENDING_LITERAL_CORPUS');
  for (let sequenceIndex = 1; sequenceIndex <= 32; sequenceIndex++) {
    const narrative = canonicalStoryNarrative(sequenceIndex);
    assert.ok(
      ['ROM_LITERAL_TEXT', 'EDITORIAL_RECONSTRUCTION', 'REFERENCE_SUMMARY'].includes(narrative.textEvidence),
      `${narrative.identity.id}: invalid text evidence`,
    );
  }
}

verifyStoryIdentity();
verifyCutscenes();
verifyNarrativeProjection();
verifyPortraitIdentity();
verifyLiteralTextHonesty();

console.log('verify-story-dialogue-canon: PASS');
console.log('  30 MAIN + 2 EX identities: OK');
console.log('  71 physical Story cutscenes: OK');
console.log('  EX1/EX2 placement and future-city isolation: OK');
console.log('  dialogue-only / no Story Map runtime: OK');
console.log('  Majin Vegeta, adult Gohan, kid/future Trunks portraits: OK');
console.log('  text provenance cannot masquerade as ROM literal: OK');

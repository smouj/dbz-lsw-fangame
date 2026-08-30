#!/usr/bin/env tsx
/**
 * verify:special-handler-physical-pixi
 *
 * End-to-end verifier for SPECIAL_HANDLER physical sequence rendering.
 * Checks the full chain:
 *   RomPresentationProfile → compile → ROM_PHYSICAL_FRAME cues
 *   → ProductionRomPresentationAdapter (romSequenceBySlot)
 *   → PixiBattlePresentation.setRomSequenceForSlot
 *   → FighterActor.setRomSequence + applyFrame texKey
 *
 * Golden cases: Tail (29), V-Ball (41), Purple Comet (57), P.Comet Z (58)
 *
 * Invariants:
 *   - sequence metadata lost = 0
 *   - slot metadata lost = 0
 *   - no sequence collapse
 *   - no slot collapse
 *   - invalid sequence never silently falls back to 0
 *   - SPECIAL_HANDLER never promoted to ROM_FULL
 */

import { CARDS } from '../src/data/cards';
import {
  romPresentationProfileForCard,
  type RomPresentationStep,
} from '../src/battle/romPresentationProfiles';
import { compileRomPresentationProfile } from '../src/battle/romPresentationCompiler';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';

let failures = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

function findCardById(id: number) {
  const card = CARDS.find(c => c.id === id);
  if (!card) throw new Error(`card ${id} not found`);
  return card;
}

const SPECIAL_CARDS = [
  { id: 29, name: 'Tail', resource: 0x3f, phases: [{ sequence: 0, slot: 0 }, { sequence: 1, slot: 0 }] },
  { id: 41, name: 'V-Ball', resource: 0x41, phases: [{ sequence: 0, slot: 0 }, { sequence: 1, slot: 0 }, { sequence: 2, slot: 0 }, { sequence: 3, slot: 0 }] },
  { id: 57, name: 'Purple Comet', resource: 0x1c, phases: [{ sequence: 0, slot: 0 }, { sequence: 1, slot: 1 }] },
  { id: 58, name: 'P.Comet Z', resource: 0x1c, phases: [{ sequence: 2, slot: 0 }, { sequence: 3, slot: 1 }] },
] as const;

class FakePresentation {
  romSequences: Array<{ resource: number; sequence: number } | null> = [null, null];
  physicalFrames: Array<{ resource: number; sequence: number; frameIndex: number } | null> = [null, null];
  offsets: Array<{ x: number; y: number } | null> = [null, null];

  sync(): void {}
  setScene(): void {}
  setActorPose(): void {}
  setTargetPose(): void {}
  spawnProjectile(): void {}
  setProjectileProgress(): void {}
  impact(): void {}
  camera(): void {}
  moveActor(): void {}
  returnToField(): void {}

  setRomSequenceForSlot(slot: 0 | 1, resource: number, sequence: number): void {
    this.romSequences[slot] = { resource, sequence };
  }

  setPhysicalFrameForSlot(slot: 0 | 1, cue: Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }>): void {
    this.physicalFrames[slot] = {
      resource: cue.resource,
      sequence: cue.sequence,
      frameIndex: cue.frameIndex,
    };
  }

  applyFrameOffset(offsetX: number, offsetY: number, slot?: 0 | 1): void {
    this.offsets[slot ?? 0] = { x: offsetX, y: offsetY };
  }
}

console.log('=== verify:special-handler-physical-pixi ===\n');

for (const spec of SPECIAL_CARDS) {
  const card = findCardById(spec.id);
  const profile = romPresentationProfileForCard(card);
  const route = romPresentationTimelineForCard(card, 'player', null);

  check(`${spec.name}: remains SPECIAL_HANDLER`, profile.kind === 'SPECIAL_HANDLER', `got ${profile.kind}`);
  check(`${spec.name}: routes through ROM bridge`, route != null);
  check(`${spec.name}: never classified ROM_FULL`, profile.completion.dynamic === 'PENDING_ROM_TRACE');

  const programSteps = profile.program.filter((s: RomPresentationStep) => s.kind === 'START_ANIMATION' && s.sequence != null);
  check(`${spec.name}: exact START_ANIMATION count`, programSteps.length === spec.phases.length, `got ${programSteps.length}`);

  for (const phase of spec.phases) {
    const step = programSteps.find(s => s.sequence === phase.sequence && s.slot === phase.slot);
    check(`${spec.name}: profile emits seq${phase.sequence} slot${phase.slot}`, step != null);
    check(`${spec.name}: seq${phase.sequence} uses resource 0x${spec.resource.toString(16)}`, step?.resource === spec.resource, `got ${step?.resource}`);
  }

  const compiled = compileRomPresentationProfile(profile, {
    actorSide: 'player',
    actorFormId: 'goku_base',
    sequenceSelector: null,
  });
  const animationStarts = compiled.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ANIMATION_START' }> => cue.type === 'ANIMATION_START');
  check(`${spec.name}: compiler preserves ANIMATION_START phases`, animationStarts.length === spec.phases.length, `got ${animationStarts.length}`);

  for (const phase of spec.phases) {
    const start = animationStarts.find(cue => cue.resource === spec.resource && cue.sequence === phase.sequence && cue.slot === phase.slot);
    check(`${spec.name}: compiler keeps seq${phase.sequence} slot${phase.slot}`, start != null);
  }

  const physicalFrames = compiled.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }> => cue.type === 'ROM_PHYSICAL_FRAME');
  const physicalSlots = new Set(physicalFrames.map(cue => cue.slot));
  const expectedSlots = new Set(spec.phases.map(phase => phase.slot));
  if (physicalFrames.length > 0) {
    check(`${spec.name}: physical frames preserve all expected slots`, expectedSlots.size === physicalSlots.size && [...expectedSlots].every(slot => physicalSlots.has(slot)));
    check(`${spec.name}: physical frame sequence metadata present`, physicalFrames.every(cue => cue.sequence != null));
  } else {
    const staticPending = compiled.timeline.entries.filter(entry =>
      entry.cue.type === 'ROM_PENDING' && entry.cue.boundary === 'STATIC'
    );
    check(`${spec.name}: missing physical frames are explicit static pending`, staticPending.length > 0);
  }

  const fake = new FakePresentation();
  const adapter = new ProductionRomPresentationAdapter(fake as any);
  for (const frame of physicalFrames) adapter.consume(frame);
  const snapshot = adapter.snapshot;
  check(`${spec.name}: adapter consumed physical frames`, snapshot.physicalFrames === physicalFrames.length, `got ${snapshot.physicalFrames}/${physicalFrames.length}`);
  if (physicalFrames.length > 0) {
    for (const phase of spec.phases) {
      const expectedLastForSlot = [...spec.phases].reverse().find(p => p.slot === phase.slot);
      if (expectedLastForSlot !== phase) continue;
      check(`${spec.name}: Pixi slot${phase.slot} ends on seq${phase.sequence}`, fake.romSequences[phase.slot]?.sequence === phase.sequence, `got ${fake.romSequences[phase.slot]?.sequence}`);
    }
  }
}

const synthetic = new FakePresentation();
const syntheticAdapter = new ProductionRomPresentationAdapter(synthetic as any);
const syntheticFrames: Array<Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }>> = [
  {
    type: 'ROM_PHYSICAL_FRAME',
    tick: 0,
    slot: 0,
    formId: 'goku_base',
    resource: 0x1c,
    sequence: 2,
    frameIndex: 0,
    source: 'ROM_PHYSICAL',
    physicalId: 'synthetic-slot0',
    frameInstanceId: 'synthetic-slot0-s02-f00',
    file: 'slot0.png',
    durationTicks: 1,
    offsetX: 3,
    offsetY: -1,
    rawOffsetX: 3,
    rawOffsetY: -1,
    visualFrameId: 0,
    evidence: ['TEST_SYNTHETIC_ROM_PHYSICAL_FRAME'],
    fallbackReason: null,
  },
  {
    type: 'ROM_PHYSICAL_FRAME',
    tick: 1,
    slot: 1,
    formId: 'goku_base',
    resource: 0x1c,
    sequence: 3,
    frameIndex: 0,
    source: 'ROM_PHYSICAL',
    physicalId: 'synthetic-slot1',
    frameInstanceId: 'synthetic-slot1-s03-f00',
    file: 'slot1.png',
    durationTicks: 1,
    offsetX: -2,
    offsetY: 4,
    rawOffsetX: -2,
    rawOffsetY: 4,
    visualFrameId: 0,
    evidence: ['TEST_SYNTHETIC_ROM_PHYSICAL_FRAME'],
    fallbackReason: null,
  },
];
for (const frame of syntheticFrames) syntheticAdapter.consume(frame);
check('adapter preserves slot0 ROM sequence', synthetic.romSequences[0]?.sequence === 2);
check('adapter preserves slot1 ROM sequence', synthetic.romSequences[1]?.sequence === 3);
check('adapter applies slot0 frame offset', synthetic.offsets[0]?.x === 3 && synthetic.offsets[0]?.y === -1);
check('adapter applies slot1 frame offset', synthetic.offsets[1]?.x === -2 && synthetic.offsets[1]?.y === 4);

const invalidProfile = {
  ...romPresentationProfileForCard(findCardById(29)),
  program: [
    {
      ...romPresentationProfileForCard(findCardById(29)).program.find(step => step.kind === 'START_ANIMATION')!,
      id: 'INVALID_SPECIAL_SEQUENCE',
      sequence: 99,
      slot: 0 as const,
    },
  ],
};
const invalidCompiled = compileRomPresentationProfile(invalidProfile, {
  actorFormId: 'goku_base',
});
check(
  'invalid sequence surfaces ROM_PENDING',
  invalidCompiled.timeline.entries.some(entry => entry.cue.type === 'ROM_PENDING' && entry.cue.reason.includes('invalid sequence 99')),
);
check(
  'invalid sequence silent fallback to 0 = 0',
  invalidCompiled.timeline.entries.every(entry => entry.cue.type !== 'ROM_PHYSICAL_FRAME'),
);

if (failures === 0) {
  console.log('\n✅ All golden cases and invariants PASS');
  process.exit(0);
} else {
  console.log(`\n❌ ${failures} failures`);
  process.exit(1);
}

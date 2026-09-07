#!/usr/bin/env tsx
/**
 * verify:stage-production-route
 *
 * Production gate for command cards (#1..#4):
 *   card → romPresentationTimelineForCard → Bank $61 Stage program
 *   → ANIMATION_START / ROM_PHYSICAL_FRAME
 *   → ProductionRomPresentationAdapter
 *
 * The gate is intentionally strict about identity: Stage must route through
 * Bank $61 physical corpus entries, preserve selector/frame/slot/tick/offset,
 * and never manufacture fallback physical IDs.
 */

import { CARDS } from '../src/data/cards';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import {
  ROM_STAGE_PHYSICAL_COMMANDS,
  type RomStageCommand,
} from '../src/data/generated/romStage.generated';
import { romStageSequenceFor, type StageLevel } from '../src/battle/stageSequences';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

class FakePresentation implements BattlePresentation {
  scenes: BattleScene[] = [];
  romSequences: Array<{ resource: number; sequence: number } | null> = [null, null];
  physicalFrames: Array<Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }> | null> = [null, null];
  offsets: Array<{ x: number; y: number } | null> = [null, null];

  sync(): void {}
  setScene(scene: BattleScene): void { this.scenes.push(scene); }
  setFighterVisibility(): void {}
  setFighterPosition(): void {}
  setActionObjectPosition(): void {}
  moveActionObject(): void {}
  setActorPose(): void {}
  setTargetPose(): void {}
  spawnProjectile(): void {}
  setProjectileProgress(): void {}
  impact(): void {}
  camera(): void {}
  flashWhite(): void {}
  moveActor(): void {}
  returnToField(): void {}
  moveActorByRomMotion(): void {}
  moveTargetByRomMotion(): void {}
  applyScreenMotion(): void {}
  applyScreenRestore(): void {}
  applyScreenPath(): void {}

  setRomSequenceForSlot(slot: 0 | 1, resource: number, sequence: number): void {
    this.romSequences[slot] = { resource, sequence };
  }

  setPhysicalFrameForSlot(slot: 0 | 1, cue: Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }>): void {
    this.physicalFrames[slot] = cue;
  }

  applyFrameOffset(x: number, y: number, slot?: 0 | 1): void {
    this.offsets[slot ?? 0] = { x, y };
  }
}

const STAGE_CARDS: Array<{ id: number; level: StageLevel }> = [
  { id: 1, level: 3 },
  { id: 2, level: 4 },
  { id: 3, level: 5 },
  { id: 4, level: 6 },
];

console.log('=== verify:stage-production-route ===\n');

for (const spec of STAGE_CARDS) {
  const card = CARDS.find(item => item.id === spec.id);
  if (!card) throw new Error(`card ${spec.id} not found`);
  const route = romPresentationTimelineForCard(card, 'player', 'goku_base');
  check(`${card.name}: routes as STAGE_COMMAND`, route?.kind === 'STAGE_COMMAND', `got ${route?.kind ?? 'null'}`);
  if (!route) continue;

  const expectedCommands = romStageSequenceFor(spec.level, 0) as RomStageCommand[];
  const starts = route.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ANIMATION_START' }> => cue.type === 'ANIMATION_START');
  const frames = route.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ROM_PHYSICAL_FRAME' }> => cue.type === 'ROM_PHYSICAL_FRAME');
  const pending = route.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ROM_PENDING' }> => cue.type === 'ROM_PENDING');
  const waits = route.timeline.entries
    .map(entry => entry.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'WAIT_ANIMATION_FRAME' }> => cue.type === 'WAIT_ANIMATION_FRAME');

  check(`${card.name}: variant 0 command count`, expectedCommands.length === spec.level, `${expectedCommands.length}/${spec.level}`);
  check(`${card.name}: actor starts per command`, starts.filter(cue => cue.slot === 0).length === expectedCommands.length);
  check(`${card.name}: target starts per command`, starts.filter(cue => cue.slot === 1).length >= expectedCommands.length);
  check(`${card.name}: WAIT_FRAME per command`, waits.length === expectedCommands.length, `got ${waits.length}`);
  check(`${card.name}: Bank $61 frames emitted`, frames.length > 0, `got ${frames.length}`);
  check(`${card.name}: Bank $61 frame evidence preserved`, frames.every(cue => cue.evidence.some(item => item === 'ROM_STAGE_BANK61_STATIC')));
  check(`${card.name}: Bank $61 textures resolve from corpus`, frames.every(cue => cue.source === 'ROM_PHYSICAL' && cue.physicalId != null && cue.file != null));
  check(`${card.name}: no Stage texture pending remains`, pending.length === 0, `got ${pending.length}`);
  check(`${card.name}: physical ids are Bank $61 identities`, frames.every(cue => /^rom-p[0-9a-f]{2}-g[0-9a-f]{2}-ab61-b[0-9a-f]{4}-vf[0-9a-f]{2}-ms[0-9a-f]{8}-gfx[0-9a-f]{8}$/.test(cue.physicalId ?? '')));
  check(`${card.name}: visualFrameId values preserved`, frames.every(cue =>
    Number.isInteger(cue.visualFrameId) &&
    cue.physicalId?.includes(`-vf${cue.visualFrameId.toString(16).padStart(2, '0')}-`)
  ));

  for (const command of new Set(expectedCommands)) {
    const actorSpec = ROM_STAGE_PHYSICAL_COMMANDS.actor[command];
    const sequence = typeof actorSpec.sequence === 'number' ? actorSpec.sequence : 5; // goku_base profile key.
    check(
      `${card.name}: ${command} actor resource/sequence reachable`,
      starts.some(cue => cue.slot === 0 && cue.resource === actorSpec.resourceIndex && cue.sequence === sequence),
      `resource=${actorSpec.resourceIndex} sequence=${sequence}`,
    );
    check(
      `${card.name}: ${command} target reaction sequence reachable`,
      starts.some(cue => cue.slot === 1 && cue.resource === ROM_STAGE_PHYSICAL_COMMANDS.target.resourceIndex),
    );
  }

  const fake = new FakePresentation();
  const adapter = new ProductionRomPresentationAdapter(fake);
  adapter.reset('ROM');
  for (const entry of route.timeline.entries) adapter.consume(entry.cue);
  const stats = adapter.snapshot;
  check(`${card.name}: adapter consumes cues`, stats.cuesConsumed === route.timeline.entries.length, `${stats.cuesConsumed}/${route.timeline.entries.length}`);
  check(`${card.name}: scene enters ACTION_SOLO`, fake.scenes.includes('ACTION_SOLO'));
  check(`${card.name}: adapter records physical frames`, stats.physicalFrames === frames.length, `${stats.physicalFrames}/${frames.length}`);
  check(`${card.name}: adapter preserves slot tracks`, stats.romSequenceBySlot[0] != null && stats.romSequenceBySlot[1] != null);
  check(`${card.name}: ROM_PHYSICAL source counted`, stats.physicalFrameSources.ROM_PHYSICAL === frames.length, `${stats.physicalFrameSources.ROM_PHYSICAL}/${frames.length}`);
  check(`${card.name}: no adapter pending for Stage texture path`, stats.pendingCues === pending.length && pending.length === 0, `${stats.pendingCues}/${pending.length}`);
}

console.log('');
if (failures === 0) {
  console.log('ALL CHECKS PASSED ✅');
  process.exit(0);
}

console.error(`${failures} CHECK(S) FAILED ❌`);
process.exit(1);

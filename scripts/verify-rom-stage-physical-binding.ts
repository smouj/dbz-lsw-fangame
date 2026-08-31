import {
  ROM_STAGE_PHYSICAL_BINDINGS,
  ROM_STAGE_TARGET_REACTIONS,
  stageRomPhysicalBinding,
  stageRomTargetReaction,
} from '../src/battle/stageRomPhysical';

let checks = 0;
function ok(condition: unknown, message: string): void {
  checks++;
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const expected = [
  ['A', 0, false, 0x00, 1, 0x4970, 0x05, 4, 13],
  ['A', 1, false, 0x05, 0, 0x4030, 0x0a, 6, 13],
  ['B', 0, false, 0x01, 2, 0x4c08, 0x08, 6, 32],
  ['B', 1, false, 0x06, 0, 0x4030, 0x0b, 8, 27],
  ['RIGHT', 0, false, 0x02, 3, 0x5174, 0x0b, 7, 41],
  ['RIGHT', 1, false, 0x07, 0, 0x4030, 0x0d, 15, 23],
  ['UP', 0, false, 0x03, 4, 0x5804, 0x06, 7, 41],
  ['UP', 1, false, 0x08, 0, 0x4030, 0x0f, 8, 15],
  ['DOWN', 0, false, 0x04, 4, 0x5804, 0x09, 9, 53],
  ['DOWN', 1, false, 0x09, 0, 0x4030, 0x10, 5, 9],
  ['B', 1, true, 0x39, 0, 0x4030, 0x17, 11, 54],
] as const;

ok(ROM_STAGE_PHYSICAL_BINDINGS.length === expected.length, '11 distinct Stage physical bindings');

for (const [command, memberSlot, finalOnly, animationId, resourceIndex, resourceBase, sequence, frameCount, totalTicks] of expected) {
  const binding = stageRomPhysicalBinding(command, memberSlot, finalOnly);
  const tag = `${command}/m${memberSlot}${finalOnly ? '/FINAL' : ''}`;
  ok(binding.animationBank === 0x61, `${tag}: Bank $61`);
  ok(binding.animationId === animationId, `${tag}: animationId`);
  ok(binding.resourceIndex === resourceIndex, `${tag}: resourceIndex`);
  ok(binding.resourceBase === resourceBase, `${tag}: resourceBase`);
  ok(binding.sequence === sequence, `${tag}: sequence`);
  ok(binding.poseSelector === sequence, `${tag}: $C3C7 selector == sequence`);
  ok(binding.frameCount === frameCount, `${tag}: frameCount`);
  ok(binding.frames.length === frameCount, `${tag}: frames materialized`);
  ok(binding.totalTicks === totalTicks, `${tag}: totalTicks`);
  ok(binding.frames.every(frame => frame.durationTicks > 0), `${tag}: all durations positive`);
}

const normalB = stageRomPhysicalBinding('B', 1, false);
const finalB = stageRomPhysicalBinding('B', 1, true);
ok(normalB.animationId === 0x06 && normalB.sequence === 0x0b, 'member1 normal B = $06 / seq $0B');
ok(finalB.animationId === 0x39 && finalB.sequence === 0x17, 'member1 final B = $39 / seq $17');
ok(finalB.totalTicks === 54 && normalB.totalTicks === 27, 'final B is distinct 54t finisher, not normal 27t B');
ok(finalB.frames[10]?.durationTicks === 30, 'final B holds its terminal physical frame for 30 ticks');

const targetExpected = [
  ['A', false, 2, 0x0a, 6, 13, 0],
  ['B', false, 3, 0x0b, 8, 27, 0],
  ['RIGHT', false, 4, 0x0d, 15, 23, 0],
  ['UP', false, 4, 0x0f, 8, 15, 0],
  ['DOWN', false, 5, 0x10, 5, 9, 0],
  ['B', true, 3, 0x17, 11, 54, 1],
] as const;

ok(ROM_STAGE_TARGET_REACTIONS.length === targetExpected.length, '6 Stage target reaction contracts');
for (const [command, finalOnly, waitActorFrame, sequence, frameCount, totalTicks, preWait] of targetExpected) {
  const reaction = stageRomTargetReaction(command, finalOnly);
  const tag = `target/${command}${finalOnly ? '/FINAL' : ''}`;
  ok(reaction.animationBank === 0x61 && reaction.resourceIndex === 0 && reaction.resourceBase === 0x4030, `${tag}: Bank61 resource0`);
  ok(reaction.waitActorFrame === waitActorFrame, `${tag}: WAIT_FRAME actor boundary`);
  ok(reaction.preTargetWaitTicks === preWait, `${tag}: pre-target WAIT`);
  ok(reaction.sequence === sequence, `${tag}: target sequence`);
  ok(reaction.frameCount === frameCount && reaction.frames.length === frameCount, `${tag}: physical frames`);
  ok(reaction.totalTicks === totalTicks, `${tag}: totalTicks`);
  ok(reaction.waitTargetComplete, `${tag}: WAIT_COMPLETE`);
  ok(reaction.restoreSequence === 0, `${tag}: restore seq0`);
}

const finalTargetB = stageRomTargetReaction('B', true);
ok(finalTargetB.preTargetWaitTicks === 1, 'final target B adds exact 1 tick wait');
ok(finalTargetB.applyFrameDeltaAfterComplete, 'final target B applies ROM frame delta after completion');
ok(!stageRomTargetReaction('B', false).applyFrameDeltaAfterComplete, 'ordinary target B does not inherit final-only frame delta');

console.log(`ROM Stage physical binding: ${checks}/${checks} checks OK · 11 actor bindings · 6 target reactions · final B $39 = 11f/54t`);

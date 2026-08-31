// ═══════════════════════════════════════════════════════════════════════
// P0.4S — Stage Attack ROM physical binding (Bank $61)
// ═══════════════════════════════════════════════════════════════════════
// Portable SSOT joining Stage VM command semantics to the decoded Bank $61
// animation core. No semantic pose aliases and no generic timeout choreography.
//
// Verified chain:
//   command → Animation ID → VM opcode $04 → $C3C7 selector
//   → $CA0D descriptor slot → Bank $61 resource → sequence → frame records.
//
// Stage also synchronizes the defender from the ATTACKER'S physical frame:
//   A frame2 → target seq $0A · B frame3 → $0B · RIGHT frame4 → $0D
//   UP frame4 → $0F · DOWN frame5 → $10.
// The final memberSlot1 B uses Animation ID $39 and target seq $17 with a
// one-tick delay, WAIT_COMPLETE, APPLY_FRAME_DELTA and restore to seq0.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROM_BANK61_ANIMATION_CORE,
  type RomAnimationCoreFrame,
} from '../data/generated/romAnimationCore.generated';

export type RomStagePhysicalKey = 'A' | 'B' | 'RIGHT' | 'UP' | 'DOWN';
export type RomStageMemberSlot = 0 | 1;

export interface RomStagePhysicalBinding {
  command: RomStagePhysicalKey;
  memberSlot: RomStageMemberSlot;
  finalCommandOnly: boolean;
  animationId: number;
  animationBank: 0x61;
  descriptorSlot: number;
  resourceIndex: number;
  resourceBase: number;
  poseSelector: number;
  sequence: number;
  frameCount: number;
  totalTicks: number;
  frames: readonly RomAnimationCoreFrame[];
  evidence: readonly string[];
}

/** ROM-exact defender reaction synchronized to an attacker frame boundary. */
export interface RomStageTargetReaction {
  command: RomStagePhysicalKey;
  finalCommandOnly: boolean;
  waitActorFrame: number;
  preTargetWaitTicks: number;
  animationBank: 0x61;
  resourceIndex: 0;
  resourceBase: number;
  sequence: number;
  frameCount: number;
  totalTicks: number;
  frames: readonly RomAnimationCoreFrame[];
  waitTargetComplete: boolean;
  applyFrameDeltaAfterComplete: boolean;
  restoreSequence: number;
  evidence: readonly string[];
}

interface BindingSpec {
  animationId: number;
  resourceIndex: number;
  sequence: number;
}

interface TargetReactionSpec {
  waitActorFrame: number;
  sequence: number;
}

const MEMBER0: Record<RomStagePhysicalKey, BindingSpec> = {
  A:     { animationId: 0x00, resourceIndex: 1, sequence: 0x05 },
  B:     { animationId: 0x01, resourceIndex: 2, sequence: 0x08 },
  RIGHT: { animationId: 0x02, resourceIndex: 3, sequence: 0x0b },
  UP:    { animationId: 0x03, resourceIndex: 4, sequence: 0x06 },
  DOWN:  { animationId: 0x04, resourceIndex: 4, sequence: 0x09 },
};

const MEMBER1: Record<RomStagePhysicalKey, BindingSpec> = {
  A:     { animationId: 0x05, resourceIndex: 0, sequence: 0x0a },
  B:     { animationId: 0x06, resourceIndex: 0, sequence: 0x0b },
  RIGHT: { animationId: 0x07, resourceIndex: 0, sequence: 0x0d },
  UP:    { animationId: 0x08, resourceIndex: 0, sequence: 0x0f },
  DOWN:  { animationId: 0x09, resourceIndex: 0, sequence: 0x10 },
};

/** Defender reaction starts only after the attacker reaches this ROM frame. */
const TARGET_REACTIONS: Record<RomStagePhysicalKey, TargetReactionSpec> = {
  A:     { waitActorFrame: 2, sequence: 0x0a },
  B:     { waitActorFrame: 3, sequence: 0x0b },
  RIGHT: { waitActorFrame: 4, sequence: 0x0d },
  UP:    { waitActorFrame: 4, sequence: 0x0f },
  DOWN:  { waitActorFrame: 5, sequence: 0x10 },
};

/** Bank00:$391E — B on memberSlot1 as the final Stage command. */
const MEMBER1_FINAL_B: BindingSpec = {
  animationId: 0x39,
  resourceIndex: 0,
  sequence: 0x17,
};

function materialize(
  command: RomStagePhysicalKey,
  memberSlot: RomStageMemberSlot,
  spec: BindingSpec,
  finalCommandOnly: boolean,
): RomStagePhysicalBinding {
  const resource = ROM_BANK61_ANIMATION_CORE[spec.resourceIndex];
  if (!resource) throw new Error(`Stage ROM resource index ${spec.resourceIndex} missing from Bank $61 core`);
  const sequence = resource.sequences[spec.sequence];
  if (!sequence || sequence.selector !== spec.sequence) {
    throw new Error(`Stage ROM sequence $${spec.sequence.toString(16)} missing in Bank $61 resource ${spec.resourceIndex}`);
  }
  return {
    command,
    memberSlot,
    finalCommandOnly,
    animationId: spec.animationId,
    animationBank: 0x61,
    descriptorSlot: spec.resourceIndex,
    resourceIndex: spec.resourceIndex,
    resourceBase: resource.resourceBase,
    poseSelector: spec.sequence,
    sequence: spec.sequence,
    frameCount: sequence.frameCount,
    totalTicks: sequence.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
    frames: sequence.frames,
    evidence: [
      'ROM_STATIC_VERIFIED: Bank00 Call_000_3833 command dispatch',
      'ROM_STATIC_VERIFIED: Bank30:$5D00 animation program table',
      'ROM_STATIC_VERIFIED: VM opcode $04 -> Call_000_3501 -> $C3C7',
      'ROM_STATIC_VERIFIED: $CA0D descriptor -> Bank $61 resource',
      finalCommandOnly
        ? 'ROM_STATIC_VERIFIED: Bank00:$391E final memberSlot1 B -> Animation ID $39 -> selector $17'
        : 'ROM_STATIC_VERIFIED: normal Stage command animation ID/selector',
      'ROM_CROSS_VERSION_VERIFIED: Spain/USA/RESKIN byte-identical Stage binding chain',
    ],
  };
}

function materializeTargetReaction(
  command: RomStagePhysicalKey,
  finalCommandOnly: boolean,
): RomStageTargetReaction {
  const resource = ROM_BANK61_ANIMATION_CORE[0];
  if (!resource) throw new Error('Stage target reaction resource 0 missing from Bank $61 core');
  const ordinary = TARGET_REACTIONS[command];
  const sequenceId = finalCommandOnly && command === 'B' ? 0x17 : ordinary.sequence;
  const sequence = resource.sequences[sequenceId];
  if (!sequence || sequence.selector !== sequenceId) {
    throw new Error(`Stage target reaction sequence $${sequenceId.toString(16)} missing`);
  }
  const isFinalB = finalCommandOnly && command === 'B';
  return {
    command,
    finalCommandOnly: isFinalB,
    waitActorFrame: ordinary.waitActorFrame,
    preTargetWaitTicks: isFinalB ? 1 : 0,
    animationBank: 0x61,
    resourceIndex: 0,
    resourceBase: resource.resourceBase,
    sequence: sequenceId,
    frameCount: sequence.frameCount,
    totalTicks: sequence.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
    frames: sequence.frames,
    waitTargetComplete: true,
    applyFrameDeltaAfterComplete: isFinalB,
    restoreSequence: 0,
    evidence: [
      `ROM_STATIC_VERIFIED: Stage WAIT_FRAME actor=${ordinary.waitActorFrame} before target reaction`,
      `ROM_STATIC_VERIFIED: target Bank $61 resource0 sequence $${sequenceId.toString(16).padStart(2, '0')}`,
      isFinalB
        ? 'ROM_STATIC_VERIFIED: final B -> WAIT 1 -> seq $17 -> SFX -> WAIT_COMPLETE -> APPLY_FRAME_DELTA -> seq0'
        : 'ROM_STATIC_VERIFIED: ordinary Stage target reaction -> WAIT_COMPLETE -> restore seq0',
      'ROM_CROSS_VERSION_VERIFIED: Spain/USA/RESKIN Stage reaction chain',
    ],
  };
}

/** Resolve the exact ROM sequence for a Stage input animation. */
export function stageRomPhysicalBinding(
  command: RomStagePhysicalKey,
  memberSlot: RomStageMemberSlot,
  isFinalCommand = false,
): RomStagePhysicalBinding {
  const spec = memberSlot === 0
    ? MEMBER0[command]
    : (command === 'B' && isFinalCommand ? MEMBER1_FINAL_B : MEMBER1[command]);
  return materialize(command, memberSlot, spec, memberSlot === 1 && command === 'B' && isFinalCommand);
}

/** Resolve the defender's exact ROM reaction and synchronization boundary. */
export function stageRomTargetReaction(
  command: RomStagePhysicalKey,
  isFinalCommand = false,
): RomStageTargetReaction {
  return materializeTargetReaction(command, isFinalCommand && command === 'B');
}

/** All ordinary command×member bindings plus the distinct final-B finisher. */
export const ROM_STAGE_PHYSICAL_BINDINGS: readonly RomStagePhysicalBinding[] = [
  ...(['A', 'B', 'RIGHT', 'UP', 'DOWN'] as const).flatMap(command => [
    stageRomPhysicalBinding(command, 0, false),
    stageRomPhysicalBinding(command, 1, false),
  ]),
  stageRomPhysicalBinding('B', 1, true),
];

/** Five ordinary defender reactions plus the distinct final-B reaction. */
export const ROM_STAGE_TARGET_REACTIONS: readonly RomStageTargetReaction[] = [
  ...(['A', 'B', 'RIGHT', 'UP', 'DOWN'] as const).map(command => stageRomTargetReaction(command, false)),
  stageRomTargetReaction('B', true),
];

/** Compact diagnostic table; useful for Dev Studio and verification. */
export function stageRomPhysicalSummary(): Array<{
  command: RomStagePhysicalKey;
  memberSlot: RomStageMemberSlot;
  finalCommandOnly: boolean;
  animationId: number;
  resourceIndex: number;
  resourceBase: number;
  sequence: number;
  frameCount: number;
  totalTicks: number;
}> {
  return ROM_STAGE_PHYSICAL_BINDINGS.map(binding => ({
    command: binding.command,
    memberSlot: binding.memberSlot,
    finalCommandOnly: binding.finalCommandOnly,
    animationId: binding.animationId,
    resourceIndex: binding.resourceIndex,
    resourceBase: binding.resourceBase,
    sequence: binding.sequence,
    frameCount: binding.frameCount,
    totalTicks: binding.totalTicks,
  }));
}

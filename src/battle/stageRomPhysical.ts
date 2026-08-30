// ═══════════════════════════════════════════════════════════════════════
// P0.4S — Stage Attack ROM physical binding (Bank $61)
// ═══════════════════════════════════════════════════════════════════════
// Portable SSOT that joins the already-extracted Stage VM command semantics
// to the already-decoded Bank $61 animation core. No semantic pose aliases.
//
// Verified against Spain / USA / RESKIN ROMs (byte-identical for this chain):
//   command → Animation ID → VM opcode $04 → $C3C7 selector
//   → $CA0D descriptor slot → Bank $61 resource → sequence → frame records.
//
// Critical exception:
//   memberSlot1 B as the FINAL Stage command uses Animation ID $39, not $06.
//   $39 selects resource 0 / sequence $17 (23), 11 frames / 54 ticks.
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

interface BindingSpec {
  animationId: number;
  resourceIndex: number;
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
  if (!resource) {
    throw new Error(`Stage ROM resource index ${spec.resourceIndex} missing from Bank $61 core`);
  }
  const sequence = resource.sequences[spec.sequence];
  if (!sequence || sequence.selector !== spec.sequence) {
    throw new Error(
      `Stage ROM sequence $${spec.sequence.toString(16)} missing in Bank $61 resource ${spec.resourceIndex}`,
    );
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

/**
 * Resolve the exact ROM sequence for a Stage input animation.
 * `isFinalCommand` matters only for memberSlot1 + B ($39 finisher).
 */
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

/** All ordinary command×member bindings plus the distinct final-B finisher. */
export const ROM_STAGE_PHYSICAL_BINDINGS: readonly RomStagePhysicalBinding[] = [
  ...(['A', 'B', 'RIGHT', 'UP', 'DOWN'] as const).flatMap(command => [
    stageRomPhysicalBinding(command, 0, false),
    stageRomPhysicalBinding(command, 1, false),
  ]),
  stageRomPhysicalBinding('B', 1, true),
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

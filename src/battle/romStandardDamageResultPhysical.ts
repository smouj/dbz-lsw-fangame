// ═══════════════════════════════════════════════════════════════════════
// STANDARD_DAMAGE result physical choreography — Bank30 macros $2F/$30/$31
// ═══════════════════════════════════════════════════════════════════════
// Static ROM closure of the generic physical result branches used by handler
// $0A. Important: opcode $04 is not an abstract animation state. Bank00:$3501
// maps its C operand to a concrete $C3C7 sequence and descriptor slot.
//
// $2F HIT:
//   slot0 card actor resource (descriptor slot6) seq1 → WAIT_FRAME 2
//   slot1 fixed Bank61:$4030 seq $0D → ... → fixed seq $19
// $30 MISS:
//   slot0 card actor resource slot6 seq1 → WAIT_FRAME 2
//   slot1 fixed Bank61:$5E20 descriptor slot7 seq $13
// $31 SPECIAL_DEFENSE:
//   slot0 card actor resource slot6 seq1 → WAIT_FRAME 2
//   slot1 fixed Bank61:$5E20 descriptor slot7 seq $14
// ═══════════════════════════════════════════════════════════════════════

import { ROM_BANK61_ANIMATION_CORE, type RomAnimationCoreFrame } from '../data/generated/romAnimationCore.generated';

export type RomStandardDamagePhysicalBranch = 'HIT' | 'MISS' | 'SPECIAL_DEFENSE';

export interface RomFixedResultSequence {
  descriptorSlot: number;
  animationBank: 0x61;
  resourceBase: number;
  sequence: number;
  frameCount: number;
  totalTicks: number;
  frames: readonly RomAnimationCoreFrame[];
}

export interface RomStandardDamageResultPhysical {
  branch: RomStandardDamagePhysicalBranch;
  macroId: 0x2f | 0x30 | 0x31;
  macroAddress: number;
  actor: {
    descriptorSlot: 6;
    sequence: 1;
    waitFrame: 2;
    resource: 'CARD_ACTOR_ANIMATION_RESOURCE';
  };
  target: readonly RomFixedResultSequence[];
  evidence: readonly string[];
}

function fixed(resourceIndex: 0 | 6, descriptorSlot: 0 | 7, sequenceId: number): RomFixedResultSequence {
  const resource = ROM_BANK61_ANIMATION_CORE[resourceIndex];
  if (!resource) throw new Error(`Bank61 core resource index ${resourceIndex} missing`);
  const sequence = resource.sequences[sequenceId];
  if (!sequence || sequence.selector !== sequenceId) {
    throw new Error(`Bank61:$${resource.resourceBase.toString(16)} seq $${sequenceId.toString(16)} missing`);
  }
  return {
    descriptorSlot,
    animationBank: 0x61,
    resourceBase: resource.resourceBase,
    sequence: sequenceId,
    frameCount: sequence.frameCount,
    totalTicks: sequence.frames.reduce((sum, frame) => sum + frame.durationTicks, 0),
    frames: sequence.frames,
  };
}

const HIT_TARGET_1 = fixed(0, 0, 0x0d);
const HIT_TARGET_2 = fixed(0, 0, 0x19);
const MISS_TARGET = fixed(6, 7, 0x13);
const SPECIAL_DEFENSE_TARGET = fixed(6, 7, 0x14);

export const ROM_STANDARD_DAMAGE_RESULT_PHYSICAL: Readonly<Record<RomStandardDamagePhysicalBranch, RomStandardDamageResultPhysical>> = {
  HIT: {
    branch: 'HIT',
    macroId: 0x2f,
    macroAddress: 0x6129,
    actor: { descriptorSlot: 6, sequence: 1, waitFrame: 2, resource: 'CARD_ACTOR_ANIMATION_RESOURCE' },
    target: [HIT_TARGET_1, HIT_TARGET_2],
    evidence: [
      'ROM_STATIC_VERIFIED: Bank30:$6129 macro $2F (13 fixed 5-byte commands)',
      'ROM_STATIC_VERIFIED: opcode $01 slot0 descriptor6 seq1',
      'ROM_STATIC_VERIFIED: opcode $06 WAIT_FRAME slot0 frame2',
      'ROM_STATIC_VERIFIED: Bank00:$3501 opcode $04 C=$0D -> descriptor0 / $C3C7=$0D',
      'ROM_STATIC_VERIFIED: Bank00:$3501 opcode $04 C=$19 -> descriptor0 / $C3C7=$19',
    ],
  },
  MISS: {
    branch: 'MISS',
    macroId: 0x30,
    macroAddress: 0x616b,
    actor: { descriptorSlot: 6, sequence: 1, waitFrame: 2, resource: 'CARD_ACTOR_ANIMATION_RESOURCE' },
    target: [MISS_TARGET],
    evidence: [
      'ROM_STATIC_VERIFIED: Bank30:$616B macro $30 (9 fixed 5-byte commands)',
      'ROM_STATIC_VERIFIED: opcode $01 slot0 descriptor6 seq1',
      'ROM_STATIC_VERIFIED: opcode $06 WAIT_FRAME slot0 frame2',
      'ROM_STATIC_VERIFIED: opcode $01 slot1 descriptor7 seq $13 -> Bank61:$5E20',
    ],
  },
  SPECIAL_DEFENSE: {
    branch: 'SPECIAL_DEFENSE',
    macroId: 0x31,
    macroAddress: 0x6199,
    actor: { descriptorSlot: 6, sequence: 1, waitFrame: 2, resource: 'CARD_ACTOR_ANIMATION_RESOURCE' },
    target: [SPECIAL_DEFENSE_TARGET],
    evidence: [
      'ROM_STATIC_VERIFIED: Bank30:$6199 macro $31 (9 fixed 5-byte commands)',
      'ROM_STATIC_VERIFIED: opcode $01 slot0 descriptor6 seq1',
      'ROM_STATIC_VERIFIED: opcode $06 WAIT_FRAME slot0 frame2',
      'ROM_STATIC_VERIFIED: opcode $01 slot1 descriptor7 seq $14 -> Bank61:$5E20',
    ],
  },
};

export function standardDamageResultPhysical(branch: RomStandardDamagePhysicalBranch): RomStandardDamageResultPhysical {
  return ROM_STANDARD_DAMAGE_RESULT_PHYSICAL[branch];
}

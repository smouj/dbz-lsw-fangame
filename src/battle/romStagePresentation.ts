// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — Stage command ROM presentation bridge
// ═══════════════════════════════════════════════════════════════════════
// Compiles command cards (#1..#4) from the verified Bank $61 Stage contract
// into production PresentationCue timelines. This is deliberately ROM-level:
// no hand-authored poses, no round-robin pool, no invented scoring branch.
// Bank $61 physical textures resolve through ROM_PHYSICAL_CORPUS when the
// actor form is known. If a form/resource is missing, frame cues stay
// UNRESOLVED with exact ROM ticks, selectors, visualFrameIds and offsets.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../data/cards';
import {
  ROM_BANK61_ANIMATION_CORE,
  ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES,
  type RomAnimationCoreSequence,
} from '../data/generated/romAnimationCore.generated';
import {
  ROM_STAGE_PHYSICAL_COMMANDS,
  type RomStageCommand,
} from '../data/generated/romStage.generated';
import type { BattleTimeline, PresentationCue, TimelineEntry } from './engine/presentation/PresentationCue';
import type { BattleSide } from './engine/state/BattleState';
import { profileForForm } from '../data/romPhysicalFrameIndex';
import { resolveStageProductionFrame } from './productionFrameResolver';
import { romStageSequenceFor, stageVariantFromTick, type StageLevel } from './stageSequences';

const STAGE_LEVEL_BY_EFFECT: Record<string, StageLevel> = {
  command_3: 3,
  command_4: 4,
  command_5: 5,
  command_6: 6,
};

export interface RomStagePresentationRoute {
  cardId: number;
  cardName: string;
  stageLevel: StageLevel;
  variant: number;
  commands: RomStageCommand[];
  timeline: BattleTimeline;
  pendingCues: number;
}

function stageLevelForCard(card: CardDef): StageLevel | null {
  return STAGE_LEVEL_BY_EFFECT[card.effect] ?? null;
}

function entry(cue: PresentationCue, card: CardDef, logicalTick: number): TimelineEntry {
  return {
    cue,
    logicalTick,
    sourceEvent: 'STAGE_COMMAND_ROM_PRESENTATION',
    profileId: `rom-stage-card-${card.id}`,
    fidelity: 'ROM_STATIC_PARTIAL',
    romSource: {
      kind: 'ROM_PRESENTATION',
      cardId: card.id,
      handler: 0x00,
      profileFamily: 'STAGE_COMMAND',
      staticCompletion: 'PARTIAL',
      dynamicPending: false,
      pendingCues: cue.type === 'ROM_PENDING' ? 1 : 0,
    },
  };
}

function bank61Sequence(resourceIndex: number, sequence: number): RomAnimationCoreSequence | null {
  const resource = ROM_BANK61_ANIMATION_CORE.find(item => item.resourceIndex === resourceIndex);
  return resource?.sequences.find(item => item.selector === sequence) ?? null;
}

function frameStartTick(sequence: RomAnimationCoreSequence, frameCounter: number): number {
  return sequence.frames
    .slice(0, Math.max(0, frameCounter))
    .reduce((sum, frame) => sum + Math.max(1, frame.durationTicks), 0);
}

function pushBank61Frames(input: {
  out: TimelineEntry[];
  card: CardDef;
  logicalTick: number;
  startTick: number;
  slot: 0 | 1;
  actorFormId: string | null;
  resourceIndex: number;
  sequence: number | null;
  label: string;
}): number {
  const {
    out,
    card,
    logicalTick,
    startTick,
    slot,
    actorFormId,
    resourceIndex,
    sequence,
    label,
  } = input;

  out.push(entry({
    type: 'ANIMATION_START',
    tick: startTick,
    slot,
    resource: resourceIndex,
    sequence,
  }, card, logicalTick));

  if (sequence == null) {
    out.push(entry({
      type: 'ROM_PENDING',
      tick: startTick,
      reason: `${label}: Stage Bank $61 sequence selector is not proven without actorFormId/profile key`,
      boundary: 'STATIC',
    }, card, logicalTick));
    return 0;
  }

  const sequenceRecord = bank61Sequence(resourceIndex, sequence);
  const resourceBase = ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES[resourceIndex];
  if (!sequenceRecord || resourceBase == null) {
    out.push(entry({
      type: 'ROM_PENDING',
      tick: startTick,
      reason: `${label}: Bank $61 resource ${resourceIndex} sequence ${sequence} is not decoded`,
      boundary: 'STATIC',
    }, card, logicalTick));
    return 0;
  }

  let tick = startTick;
  for (const frame of sequenceRecord.frames) {
    const binding = actorFormId
      ? resolveStageProductionFrame({
          formId: actorFormId,
          resourceIndex,
          animationBank: 0x61,
          resourceBase,
          sequenceSelector: sequence,
          frameIndex: frame.frameIndex,
          visualFrameId: frame.visualFrameId,
          durationTicks: frame.durationTicks,
          offsetX: frame.offsetX,
          offsetY: frame.offsetY,
        })
      : null;
    out.push(entry({
      type: 'ROM_PHYSICAL_FRAME',
      tick,
      slot,
      formId: actorFormId ?? 'ROM_STAGE_FORM_PENDING',
      resource: resourceIndex,
      sequence,
      frameIndex: frame.frameIndex,
      source: binding?.source ?? 'UNRESOLVED',
      physicalId: binding?.physicalId ?? null,
      frameInstanceId: binding?.frameInstanceId ?? `bank61-r${resourceIndex}-s${sequence}-f${frame.frameIndex}`,
      file: binding?.file ?? null,
      durationTicks: binding?.durationTicks ?? frame.durationTicks,
      offsetX: binding?.offsetX ?? frame.offsetX,
      offsetY: binding?.offsetY ?? frame.offsetY,
      rawOffsetX: frame.offsetX < 0 ? frame.offsetX + 256 : frame.offsetX,
      rawOffsetY: frame.offsetY < 0 ? frame.offsetY + 256 : frame.offsetY,
      visualFrameId: frame.visualFrameId,
      evidence: [
        'ROM_STAGE_BANK61_STATIC',
        `bank=0x61`,
        `resourceIndex=${resourceIndex}`,
        `resourceBase=0x${resourceBase.toString(16)}`,
        `sequence=${sequence}`,
        `frame=${frame.frameIndex}`,
        ...(binding?.evidence ?? []),
      ],
      fallbackReason: binding?.fallbackReason ?? null,
    }, card, logicalTick));
    tick += Math.max(1, frame.durationTicks);
  }
  if (sequenceRecord.frames.some(frame => {
    if (!actorFormId) return true;
    const binding = resolveStageProductionFrame({
      formId: actorFormId,
      resourceIndex,
      animationBank: 0x61,
      resourceBase,
      sequenceSelector: sequence,
      frameIndex: frame.frameIndex,
      visualFrameId: frame.visualFrameId,
      durationTicks: frame.durationTicks,
      offsetX: frame.offsetX,
      offsetY: frame.offsetY,
    });
    return binding.source !== 'ROM_PHYSICAL';
  })) {
    out.push(entry({
      type: 'ROM_PENDING',
      tick: startTick,
      reason: `${label}: Bank $61 Stage physical texture binding is not fully in ROM_PHYSICAL_CORPUS yet`,
      boundary: 'STATIC',
    }, card, logicalTick));
  }
  return sequenceRecord.frames.reduce((sum, frame) => sum + Math.max(1, frame.durationTicks), 0);
}

export function romStagePresentationForCard(input: {
  card: CardDef;
  side: BattleSide;
  actorFormId?: string | null;
  startTick?: number;
  stageVariant?: number | null;
}): RomStagePresentationRoute | null {
  const stageLevel = stageLevelForCard(input.card);
  if (input.card.type !== 'command' || stageLevel == null) return null;

  const startTick = input.startTick ?? 0;
  const logicalTick = startTick;
  const variant = input.stageVariant ?? stageVariantFromTick(startTick);
  const commands = romStageSequenceFor(stageLevel, variant) as RomStageCommand[];
  const actorProfileKey = input.actorFormId ? profileForForm(input.actorFormId)?.actorVisualProfileKey ?? null : null;
  const out: TimelineEntry[] = [
    entry({ type: 'SCENE_LOAD', tick: startTick, vramLoad: '$8E00', mode: 'TACTICAL_TO_ACTION' }, input.card, logicalTick),
    // P0.4R-B5 — la ruta Stage declara su entrada a ACTION explícitamente.
    // NO se inventa palette transition: la secuencia física de Stage es propia
    // y no hay evidencia ROM de paleta en este camino.
    entry({ type: 'SCENE_LOAD', tick: startTick, vramLoad: '$8E00', mode: 'ACTION_READY' }, input.card, logicalTick),
  ];

  let cursor = startTick;
  commands.forEach((command, commandIndex) => {
    const actorSpec = ROM_STAGE_PHYSICAL_COMMANDS.actor[command];
    const targetSpec = ROM_STAGE_PHYSICAL_COMMANDS.target[command];
    const isLastCommandB = command === 'B' && commandIndex === commands.length - 1;
    const targetSequence = isLastCommandB
      ? ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.targetSequence
      : targetSpec.sequence;
    const actorSequence = typeof actorSpec.sequence === 'number' ? actorSpec.sequence : actorProfileKey;
    const label = `Stage ${commandIndex + 1}/${commands.length} ${command}`;

    const actorSequenceRecord = actorSequence == null ? null : bank61Sequence(actorSpec.resourceIndex, actorSequence);
    pushBank61Frames({
      out,
      card: input.card,
      logicalTick,
      startTick: cursor,
      slot: 0,
      actorFormId: input.actorFormId ?? null,
      resourceIndex: actorSpec.resourceIndex,
      sequence: actorSequence,
      label: `${label} actor`,
    });

    out.push(entry({
      type: 'WAIT_ANIMATION_FRAME',
      tick: cursor,
      slot: 0,
      frame: isLastCommandB
        ? ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.waitActorFrame
        : targetSpec.waitActorFrame,
    }, input.card, logicalTick));

    const targetStart = cursor + (actorSequenceRecord
      ? frameStartTick(actorSequenceRecord, isLastCommandB
        ? ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.waitActorFrame
        : targetSpec.waitActorFrame)
      : 0);
    const targetDuration = pushBank61Frames({
      out,
      card: input.card,
      logicalTick,
      startTick: targetStart + (isLastCommandB ? ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.waitTicksBeforeTarget : 0),
      slot: 1,
      actorFormId: input.actorFormId ?? null,
      resourceIndex: ROM_STAGE_PHYSICAL_COMMANDS.target.resourceIndex,
      sequence: targetSequence,
      label: `${label} target`,
    });

    if (isLastCommandB && ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.applyFrameDelta) {
      out.push(entry({ type: 'APPLY_FRAME_DELTA', tick: targetStart, slot: 1 }, input.card, logicalTick));
      out.push(entry({
        type: 'ANIMATION_START',
        tick: targetStart + ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.totalTicks,
        slot: 1,
        resource: ROM_STAGE_PHYSICAL_COMMANDS.target.resourceIndex,
        sequence: ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.restoreTargetSequence,
      }, input.card, logicalTick));
    }

    cursor += Math.max(actorSpec.totalTicks, isLastCommandB ? ROM_STAGE_PHYSICAL_COMMANDS.lastCommandB.totalTicks : targetDuration);
  });

  const pendingCues = out.filter(item => item.cue.type === 'ROM_PENDING').length;
  const timelineEntries = [...out].sort((a, b) => a.cue.tick - b.cue.tick);
  return {
    cardId: input.card.id,
    cardName: input.card.name,
    stageLevel,
    variant,
    commands,
    timeline: {
      startTick,
      endTick: Math.max(startTick, ...timelineEntries.map(item => item.cue.tick + ('durationTicks' in item.cue ? (item.cue.durationTicks ?? 0) : 0))),
      entries: timelineEntries,
    },
    pendingCues,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM PRESENTATION COMPILER
// ═══════════════════════════════════════════════════════════════════════
// Pure compiler from RomPresentationProfile to ROM-level PresentationCue
// timeline. This layer preserves waits, macros, resources, discrete motion
// and pending boundaries. It does not invent semantic poses, anchors,
// coordinates, slot binding or Pixi-specific presentation.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleSide } from './engine/state/BattleState';
import type {
  BattleTimeline as PresentationTimeline,
  PresentationCue,
  TimelineEntry,
} from './engine/presentation/PresentationCue';
import {
  ROM_PRESENTATION_PROFILES,
  type RomPresentationProfile,
  type RomPresentationStep,
} from './romPresentationProfiles';
import { PALETTE_TRANSITION_STANDARD_PROGRAM } from './romDisplay/romPaletteTransitionProgram';
import { resolveProductionFrame } from './productionFrameResolver';
import { animationResourceById } from './animationResources';
import { romFxWindowFor, type RomFxWindowPhase } from './romFxWindow';
import { SCREEN_PATH_TABLE } from './romScreenPath';

export type RomCompiledPresentationCompleteness = 'COMPLETE' | 'PARTIAL';

export interface RomPresentationCompilerOptions {
  startTick?: number;
  logicalTick?: number;
  actorSide?: BattleSide;
  actorFormId?: string | null;
  sequenceSelector?: number | null;
  sourceEvent?: string;
  selectedResultFamily?: string | null;
  selectedResultSourceEvent?: string | null;
}

export interface CompiledRomPresentationProfile {
  cardId: number;
  cardName: string;
  kind: RomPresentationProfile['kind'];
  profileId: string;
  completion: {
    static: RomPresentationProfile['completion']['static'];
    dynamic: RomPresentationProfile['completion']['dynamic'];
    compiled: RomCompiledPresentationCompleteness;
    pending: string[];
  };
  dependencies: RomPresentationProfile['dependencies'];
  timeline: PresentationTimeline;
  provenance: {
    source: 'romPresentationProfiles.ts';
    compiler: 'compileRomPresentationProfile';
    preservesRomLevelCues: true;
    semanticResolution: 'NOT_PERFORMED';
  };
}

export interface RomPresentationCompilerSummary {
  cards: number;
  compilable: number;
  complete: number;
  partial: number;
  dynamicPending: number;
  totalCues: number;
  timelinesWithMotion: number;
  timelinesWithBranches: number;
  pendingCues: number;
  semanticCueLeaks: number;
}

function totalDelta(segments: { dxPerTick: number; ticks: number }[]): number {
  return segments.reduce((sum, segment) => sum + segment.dxPerTick * segment.ticks, 0);
}

function motionSegmentsForSide(
  step: RomPresentationStep,
  actorSide: BattleSide,
): { dxPerTick: number; dyPerTick: number; ticks: number }[] {
  const segments = step.motion?.motion.segments ?? [];
  const mirror = step.motion?.motion.mirrorBySide === true && actorSide === 'enemy';
  return segments.map(segment => ({
    ...segment,
    dxPerTick: mirror ? -segment.dxPerTick : segment.dxPerTick,
  }));
}

function motionDuration(step: RomPresentationStep): number {
  return step.motion?.motion.segments.reduce((sum, segment) => sum + segment.ticks, 0)
    ?? step.durationTicks
    ?? 0;
}

function firstHex(label: string): number | null {
  const match = /0x([0-9a-f]+)/i.exec(label);
  return match ? Number.parseInt(match[1], 16) : null;
}

function fxWindowCue(
  profile: RomPresentationProfile,
  cursor: number,
  actorSide: BattleSide,
  phase: RomFxWindowPhase,
  holdTicks: number | null = null,
): PresentationCue | null {
  if (!['BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL'].includes(profile.kind)) return null;
  const window = romFxWindowFor({
    fxResource: profile.dependencies.fxResource,
    palette: profile.dependencies.palette,
    handler: profile.execution.handler,
    category: profile.kind,
    worker: profile.execution.worker?.label ?? null,
    actorSide,
    tick: cursor,
    phase,
    holdTicks,
  });
  if (!window) return null;
  return {
    type: 'ROM_FX_WINDOW',
    tick: cursor,
    durationTicks: window.timing.holdTicks ?? 1,
    status: window.status,
    physicalId: window.physicalId,
    resource: window.fxResource,
    palette: window.palette,
    handler: window.context.handler,
    category: window.context.category,
    side: window.side,
    sideSelection: window.sideSelection,
    phase: window.phase,
    sourceMap: window.sourceMap,
    sourceImage: window.sourceImage,
    viewport: window.viewport,
    screen: window.screen,
    scroll: {
      initialScx: window.scroll.initialScx,
      initialScy: window.scroll.initialScy,
      status: window.scroll.status,
    },
    timing: window.timing,
    filmContract: window.filmContract,
    evidence: window.evidence.map(item => `${item.status}: ${item.source} — ${item.detail}`),
  };
}

function entry(
  cue: PresentationCue,
  profile: RomPresentationProfile,
  sourceEvent: string,
  logicalTick: number,
): TimelineEntry {
  return {
    cue,
    logicalTick,
    sourceEvent,
    profileId: `rom-card-${profile.cardId}`,
    fidelity: profile.completion.static === 'COMPLETE' ? 'ROM_STATIC_COMPLETE' : 'ROM_STATIC_PARTIAL',
    romSource: {
      kind: 'ROM_PRESENTATION',
      cardId: profile.cardId,
      handler: profile.execution.handler,
      profileFamily: profile.kind,
      staticCompletion: profile.completion.static,
      dynamicPending: profile.completion.dynamic === 'PENDING_ROM_TRACE',
      pendingCues: profile.completion.pending.length,
    },
  };
}

interface CompileAnimationState {
  resource: number;
  sequence: number;
  startTick: number;
}

interface CompileState {
  animations: Map<0 | 1, CompileAnimationState>;
}

function compileStep(
  step: RomPresentationStep,
  profile: RomPresentationProfile,
  cursor: number,
  actorSide: BattleSide,
  actorFormId: string | null,
  sequenceSelector: number | null,
  selectedResultFamily: string | null,
  selectedResultSourceEvent: string | null,
  state: CompileState,
): { cues: PresentationCue[]; advanceTicks: number } {
  switch (step.kind) {
    case 'NONE':
      return { cues: [], advanceTicks: 0 };

    case 'SCENE_LOAD':
      return {
        cues: [{ type: 'SCENE_LOAD', tick: cursor, vramLoad: '$8E00', mode: 'TACTICAL_TO_ACTION' }],
        advanceTicks: 0,
      };

    case 'PRESENTATION_MACRO':
      return step.macroId == null
        ? {
            cues: [{ type: 'ROM_PENDING', tick: cursor, reason: `${step.id}: macro id unresolved`, boundary: 'STATIC' }],
            advanceTicks: 0,
          }
        : { cues: [{ type: 'ROM_MACRO', tick: cursor, macroId: step.macroId }], advanceTicks: 0 };

    case 'ROM_MOTION': {
      const segments = motionSegmentsForSide(step, actorSide);
      const durationTicks = motionDuration(step);
      const kind = step.motion?.kind === 'BEAM_SETUP' ? 'BEAM_SETUP' : 'RUSH';
      return {
        cues: [{
          type: 'FIGHTER_MOTION',
          tick: cursor,
          durationTicks,
          side: actorSide,
          kind,
          deltaPx: totalDelta(segments),
          holdTicks: 0,
          segments,
        }],
        advanceTicks: durationTicks,
      };
    }

    case 'START_ANIMATION': {
      // step.sequence (selector físico de ESTA instancia) gana sobre el
      // sequenceSelector global. step.slot es el AnimationSlot físico.
      const slot = step.slot ?? 0;
      const sequence = step.sequence ?? sequenceSelector;
      if (step.resource != null && sequence != null) {
        state.animations.set(slot, { resource: step.resource, sequence, startTick: cursor });
      }
      const cues: PresentationCue[] = [{ type: 'ANIMATION_START', tick: cursor, slot, resource: step.resource, sequence }];
      if (step.resource != null && actorFormId && sequence != null) {
        const resource = step.resource;
        const resourceEntry = animationResourceById(resource);
        const sequenceCount = resourceEntry?.sequenceCount ?? 0;
        if (sequence < 0 || sequence >= sequenceCount) {
          // Guardrail: un selector canónico fuera de rango debe aflorar, nunca
          // caer silenciosamente a seq0.
          cues.push({
            type: 'ROM_PENDING',
            tick: cursor,
            reason: `invalid sequence ${sequence} out of range for resource 0x${resource.toString(16).padStart(2, '0')} (sequenceCount=${sequenceCount})`,
            boundary: 'STATIC',
          });
          return { cues, advanceTicks: 0 };
        }
        const frames = resourceEntry?.sequences[sequence]?.frames ?? [];
        let tick = cursor;
        for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
          const binding = resolveProductionFrame({
            formId: actorFormId,
            animationResource: resource,
            sequenceSelector: sequence,
            frameIndex,
          });
          cues.push({
            type: 'ROM_PHYSICAL_FRAME',
            tick,
            slot,
            formId: actorFormId,
            resource,
            sequence,
            frameIndex,
            source: binding.source,
            physicalId: binding.physicalId,
            frameInstanceId: binding.frameInstanceId,
            file: binding.file,
            durationTicks: binding.durationTicks,
            offsetX: binding.offsetX,
            offsetY: binding.offsetY,
            rawOffsetX: binding.rawOffsetX,
            rawOffsetY: binding.rawOffsetY,
            visualFrameId: binding.visualFrameId,
            evidence: binding.evidence,
            fallbackReason: binding.fallbackReason,
          });
          tick += Math.max(1, binding.durationTicks ?? 1);
        }
        if (frames.length === 0) {
          cues.push({
            type: 'ROM_PENDING',
            tick: cursor,
            reason: `${step.id}: sequence ${sequence} is not decoded for resource 0x${resource.toString(16).padStart(2, '0')}`,
            boundary: 'STATIC',
          });
        }
      } else if (step.resource != null) {
        cues.push({
          type: 'ROM_PENDING',
          tick: cursor,
          reason: `${step.id}: ProductionFrameResolver blocked because actorFormId/sequenceSelector is not proven`,
          boundary: 'STATIC',
        });
      }
      return { cues, advanceTicks: 0 };
    }

    case 'WAIT_ANIMATION': {
      const slot = step.slot ?? 0;
      const sequence = step.sequence ?? sequenceSelector;
      const frames = step.resource != null && sequence != null
        ? animationResourceById(step.resource)?.sequences[sequence]?.frames ?? []
        : [];
      const totalTicks = frames.reduce((sum, frame) => sum + Math.max(1, frame.durationTicks), 0);
      if (step.resource == null || sequence == null || totalTicks <= 0) {
        return {
          cues: [{ type: 'ROM_PENDING', tick: cursor, reason: `${step.id}: animation wait has no decoded resource/sequence`, boundary: 'STATIC' }],
          advanceTicks: 0,
        };
      }
      const animation = state.animations.get(slot);
      const animationEndTick = animation?.resource === step.resource && animation.sequence === sequence
        ? animation.startTick + totalTicks
        : cursor + totalTicks;
      const durationTicks = Math.max(0, animationEndTick - cursor);
      return {
        cues: [{ type: 'WAIT_ANIMATION', tick: cursor, durationTicks, slot }],
        advanceTicks: durationTicks,
      };
    }

    case 'WAIT':
      return {
        cues: [{
          type: 'ROM_WAIT',
          tick: cursor,
          durationTicks: step.durationTicks ?? 1,
          reason: step.label,
        }],
        advanceTicks: step.durationTicks ?? 1,
      };

    case 'WAIT_ANIMATION_FRAME': {
      const slot = step.slot ?? 0;
      const animation = state.animations.get(slot);
      let advanceTicks = 0;
      if (animation) {
        const frames = animationResourceById(animation.resource)?.sequences[animation.sequence]?.frames ?? [];
        const targetTicks = frames
          .slice(0, Math.max(0, step.frame ?? 0))
          .reduce((sum, frame) => sum + Math.max(1, frame.durationTicks), 0);
        advanceTicks = Math.max(0, animation.startTick + targetTicks - cursor);
      }
      return {
        cues: [{
          type: 'WAIT_ANIMATION_FRAME',
          tick: cursor,
          slot,
          frame: step.frame ?? 0,
        }],
        advanceTicks,
      };
    }

    case 'SPAWN_FX':
    {
      const cues: PresentationCue[] = [{
        type: 'FX_LOAD',
        tick: cursor,
        durationTicks: 1,
        resource: step.fxResource,
        palette: step.palette,
      }];
      const windowCue = fxWindowCue(profile, cursor, actorSide, 'PREFIX');
      if (windowCue) cues.push(windowCue);
      return {
        cues,
        advanceTicks: 0,
      };
    }

    case 'AUDIO_SCRIPT':
      return {
        cues: [{ type: 'ROM_AUDIO_SCRIPT', tick: cursor, scriptId: firstHex(step.label) }],
        advanceTicks: 0,
      };

    case 'SCREEN_MOTION':
      return {
        cues: [{
          type: 'SCREEN_MOTION',
          tick: cursor,
          durationTicks: step.durationTicks ?? 1,
          dxPerTick: Number(step.label.match(/dx\/tick=(-?\d+)/)?.[1] ?? -6),
          restore: step.label.includes('restore=true'),
        }],
        advanceTicks: step.durationTicks ?? 1,
      };

    case 'SCREEN_PATH':
      return {
        cues: [
          {
            type: 'SCREEN_PATH',
            tick: cursor,
            durationTicks: SCREEN_PATH_TABLE.stepCount,
          },
        ],
        advanceTicks: SCREEN_PATH_TABLE.stepCount,
      };

    case 'SCREEN_RESTORE':
      return { cues: [{ type: 'SCREEN_RESTORE', tick: cursor }], advanceTicks: 0 };

    case 'APPLY_FRAME_DELTA':
      return { cues: [{ type: 'APPLY_FRAME_DELTA', tick: cursor, slot: step.slot ?? 0 }], advanceTicks: 0 };

    case 'STOP_ANIMATION':
      return { cues: [{ type: 'ACTION_OBJECT_STOP', tick: cursor, slot: step.slot ?? 0 }], advanceTicks: 0 };

    case 'SCENE_RESTORE':
      return {
        cues: [{ type: 'SCENE_LOAD', tick: cursor, vramLoad: '$8E00', mode: 'RESTORE_TACTICAL' }],
        advanceTicks: 0,
      };

    case 'BRANCH_RESULT': {
      const selectedBranch = selectedResultFamily
        ? profile.resultBranches.find(branch => branch.family === selectedResultFamily)
        : null;
      const cues: PresentationCue[] = [{
        type: 'ROM_RESULT_BRANCH',
        tick: cursor,
        family: step.branchFamily ?? 'RESULT',
        selectedFamily: selectedBranch?.family ?? selectedResultFamily,
        selectedSourceEvent: selectedResultSourceEvent,
        selectedMacroId: selectedBranch?.macroId ?? null,
        selectedMacroHex: selectedBranch?.macroHex ?? null,
        branches: profile.resultBranches.map(branch => ({
          family: branch.family,
          condition: branch.condition,
          macroId: branch.macroId,
          macroHex: branch.macroHex,
        })),
      }];
      // A RESULT window exists only when the ROM profile has an actual
      // CA53/result-macro branch. Projectile handlers also expose a semantic
      // result boundary, but reuse their single launched FX window; creating a
      // second one there duplicates the physical effect and leaves an orphan.
      const windowCue = profile.resultBranches.length > 0
        ? fxWindowCue(profile, cursor, actorSide, 'RESULT')
        : null;
      if (windowCue) cues.push(windowCue);
      return {
        cues,
        advanceTicks: 0,
      };
    }

    case 'PENDING_STATIC_DECODE':
    case 'PENDING_ROM_TRACE':
      return {
        cues: [{
          type: 'ROM_PENDING',
          tick: cursor,
          reason: step.label,
          boundary: step.kind === 'PENDING_ROM_TRACE' ? 'DYNAMIC' : 'STATIC',
        }],
        advanceTicks: 0,
      };

    default:
      return {
        cues: [{
          type: 'ROM_PENDING',
          tick: cursor,
          reason: `${step.id}: unsupported ROM presentation step ${step.kind}`,
          boundary: 'STATIC',
        }],
        advanceTicks: 0,
      };
  }
}

export function compileRomPresentationProfile(
  profile: RomPresentationProfile,
  options: RomPresentationCompilerOptions = {},
): CompiledRomPresentationProfile {
  const startTick = options.startTick ?? 0;
  const logicalTick = options.logicalTick ?? startTick;
  const actorSide = options.actorSide ?? 'player';
  const actorFormId = options.actorFormId ?? null;
  const sequenceSelector = options.sequenceSelector ?? null;
  const sourceEvent = options.sourceEvent ?? 'ROM_PRESENTATION_PROFILE';
  const selectedResultFamily = options.selectedResultFamily ?? null;
  const selectedResultSourceEvent = options.selectedResultSourceEvent ?? null;
  const entries: TimelineEntry[] = [];
  const state: CompileState = { animations: new Map() };
  let cursor = startTick;

  // P0.4R-B5 — boundary físico TACTICAL→ACTION (ROM §182/§205):
  //   prepare (SCENE_LOAD VRAM $8E00 + macros $19/$1A) → palette transition
  //   estándar (mode1 $0308 $10 step2 — §1823) → SCENE_LOAD ACTION_READY.
  // La escena ACTION NO se entra en TACTICAL_TO_ACTION. La autoridad del
  // boundary es resolveActionEntryBoundary() (actionBoundary.ts).
  let actionPreparePending = false;
  const flushActionReady = (): void => {
    const program = PALETTE_TRANSITION_STANDARD_PROGRAM;
    entries.push(entry({
      type: 'PALETTE_TRANSITION',
      tick: cursor,
      durationTicks: program.totalTicks,
      sourcePalette: 0,
      targetPalette: 0,
      mode: program.mode,
      paletteMask16: program.paletteMask16,
      maxCounter: program.maxCounter,
      channelStep: program.channelStep,
    }, profile, sourceEvent, logicalTick));
    cursor += program.totalTicks;
    entries.push(entry({ type: 'SCENE_LOAD', tick: cursor, vramLoad: '$8E00', mode: 'ACTION_READY' }, profile, sourceEvent, logicalTick));
  };

  for (const programStep of profile.program) {
    if (actionPreparePending && programStep.kind !== 'SCENE_LOAD' && programStep.kind !== 'PRESENTATION_MACRO') {
      flushActionReady();
      actionPreparePending = false;
    }
    const compiled = compileStep(programStep, profile, cursor, actorSide, actorFormId, sequenceSelector, selectedResultFamily, selectedResultSourceEvent, state);
    for (const cue of compiled.cues) entries.push(entry(cue, profile, sourceEvent, logicalTick));
    if (compiled.cues.some(c => c.type === 'SCENE_LOAD' && c.mode === 'TACTICAL_TO_ACTION')) {
      actionPreparePending = true;
    }
    cursor += compiled.advanceTicks;
  }
  if (actionPreparePending) flushActionReady();

  const endTick = Math.max(startTick, cursor, ...entries.map(item => item.cue.tick + ('durationTicks' in item.cue ? (item.cue.durationTicks ?? 0) : 0)));
  const pendingFromCues = entries
    .map(item => item.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ROM_PENDING' }> => cue.type === 'ROM_PENDING')
    .map(cue => cue.reason);
  const pending = [...new Set([...profile.completion.pending, ...pendingFromCues])];

  return {
    cardId: profile.cardId,
    cardName: profile.cardName,
    kind: profile.kind,
    profileId: `rom-card-${profile.cardId}`,
    completion: {
      static: profile.completion.static,
      dynamic: profile.completion.dynamic,
      compiled: pending.length === 0 ? 'COMPLETE' : 'PARTIAL',
      pending,
    },
    dependencies: profile.dependencies,
    timeline: {
      startTick,
      endTick,
      entries,
    },
    provenance: {
      source: 'romPresentationProfiles.ts',
      compiler: 'compileRomPresentationProfile',
      preservesRomLevelCues: true,
      semanticResolution: 'NOT_PERFORMED',
    },
  };
}

export function compileAllRomPresentationProfiles(
  options: RomPresentationCompilerOptions = {},
): CompiledRomPresentationProfile[] {
  return ROM_PRESENTATION_PROFILES.map(profile => compileRomPresentationProfile(profile, options));
}

export function romPresentationCompilerSummary(): RomPresentationCompilerSummary {
  const compiled = compileAllRomPresentationProfiles();
  const allEntries = compiled.flatMap(item => item.timeline.entries);
  const semanticCueTypes = new Set(['FIGHTER_POSE', 'PROJECTILE', 'IMPACT', 'AURA', 'FIGHTER_POSITION']);
  return {
    cards: compiled.length,
    compilable: compiled.filter(item => item.timeline.entries.length > 0 || item.kind === 'NONE').length,
    complete: compiled.filter(item => item.completion.compiled === 'COMPLETE').length,
    partial: compiled.filter(item => item.completion.compiled === 'PARTIAL').length,
    dynamicPending: compiled.filter(item => item.completion.dynamic === 'PENDING_ROM_TRACE').length,
    totalCues: allEntries.length,
    timelinesWithMotion: compiled.filter(item => item.timeline.entries.some(entry => entry.cue.type === 'FIGHTER_MOTION' || entry.cue.type === 'SCREEN_MOTION')).length,
    timelinesWithBranches: compiled.filter(item => item.timeline.entries.some(entry => entry.cue.type === 'ROM_RESULT_BRANCH')).length,
    pendingCues: allEntries.filter(entry => entry.cue.type === 'ROM_PENDING').length,
    semanticCueLeaks: allEntries.filter(entry => semanticCueTypes.has(entry.cue.type)).length,
  };
}

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
import { resolveProductionFrame } from './productionFrameResolver';
import { animationResourceById } from './animationResources';
import { romFxWindowFor, type RomFxWindowPhase } from './romFxWindow';

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

function compileStep(
  step: RomPresentationStep,
  profile: RomPresentationProfile,
  cursor: number,
  actorSide: BattleSide,
  actorFormId: string | null,
  sequenceSelector: number | null,
  selectedResultFamily: string | null,
  selectedResultSourceEvent: string | null,
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
      const cues: PresentationCue[] = [{ type: 'ANIMATION_START', tick: cursor, slot: 0, resource: step.resource }];
      // sequence from step wins (physical selector for THIS START_ANIMATION instance)
      const effectiveSequence = step.sequence ?? sequenceSelector;
      if (step.resource != null && actorFormId && effectiveSequence != null) {
        const resource = step.resource;
        // Guardrail: declared sequence must be valid; no silent fallback to 0
        const seqCount = animationResourceById(resource)?.sequences.length ?? 0;
        if (step.sequence != null && (step.sequence < 0 || step.sequence >= seqCount)) {
          cues.push({
            type: 'ROM_PENDING',
            tick: cursor,
            reason: `${step.id}: invalid sequence ${step.sequence} for resource 0x${resource.toString(16).padStart(2, '0')} (count=${seqCount})`,
            boundary: 'STATIC',
          });
        }
        const sequence = animationResourceById(resource)?.sequences[effectiveSequence];
        let tick = cursor;
        for (let frameIndex = 0; frameIndex < (sequence?.frames.length ?? 0); frameIndex++) {
          const binding = resolveProductionFrame({
            formId: actorFormId,
            animationResource: resource,
            sequenceSelector: effectiveSequence,
            frameIndex,
          });
          cues.push({
            type: 'ROM_PHYSICAL_FRAME',
            tick,
            slot: 0,
            formId: actorFormId,
            resource,
            sequence: effectiveSequence,
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
        if (!sequence) {
          cues.push({
            type: 'ROM_PENDING',
            tick: cursor,
            reason: `${step.id}: sequence ${sequenceSelector} is not decoded for resource 0x${resource.toString(16).padStart(2, '0')}`,
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

    case 'WAIT_ANIMATION_FRAME':
      return {
        cues: [{
          type: 'WAIT_ANIMATION_FRAME',
          tick: cursor,
          slot: 0,
          frame: step.frame ?? 0,
        }],
        advanceTicks: 0,
      };

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
      const windowCue = fxWindowCue(profile, cursor, actorSide, 'RESULT');
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
  let cursor = startTick;

  for (const programStep of profile.program) {
    const compiled = compileStep(programStep, profile, cursor, actorSide, actorFormId, sequenceSelector, selectedResultFamily, selectedResultSourceEvent);
    for (const cue of compiled.cues) entries.push(entry(cue, profile, sourceEvent, logicalTick));
    cursor += compiled.advanceTicks;
  }

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

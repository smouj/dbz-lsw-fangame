// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ACTION preview ↔ runtime parity (P0)
// ═══════════════════════════════════════════════════════════════════════
// The Dev HUD must never curate an alternate movie.  This module presents
// the physical frames already emitted by the real deterministic runtime
// trace, preserving their tick boundaries and provenance for the preview.
// ═══════════════════════════════════════════════════════════════════════

import { traceActionPresentation } from './actionPresentationTrace';
import type { GoldenActionId } from './combatTrace';

export type ActionPreviewKind = 'BEAM' | 'DAMAGE';

const GOLDEN_ACTION_FOR_PREVIEW: Record<ActionPreviewKind, GoldenActionId> = {
  BEAM: 'kamehameha',
  DAMAGE: 'standard_damage',
};

export interface RuntimeActionPreviewBeat {
  /** Runtime tick at which this physical frame becomes visible. */
  tick: number;
  /** Duration until the following runtime frame, measured in the same ticks. */
  durationTicks: number;
  scene: string;
  formId: string;
  file: string;
  resource: number;
  sequence: number;
  frameIndex: number;
  visualFrameId: number;
  physicalStatus: string;
  fx: string[];
}

export interface RuntimeActionPreview {
  kind: ActionPreviewKind;
  goldenActionId: GoldenActionId;
  source: 'ROM';
  actorFormId: string;
  targetFormId: string;
  beats: RuntimeActionPreviewBeat[];
}

function sampleAt<T extends { tick: number }>(items: readonly T[], tick: number): T | undefined {
  let current: T | undefined;
  for (const item of items) {
    if (item.tick > tick) break;
    current = item;
  }
  return current;
}

/**
 * Returns the exact physical actor track for the golden runtime action.
 * No sequence, duration or file is authored here: all fields come from the
 * production timeline through traceActionPresentation().
 */
export function runtimeActionPreview(kind: ActionPreviewKind): RuntimeActionPreview {
  const goldenActionId = GOLDEN_ACTION_FOR_PREVIEW[kind];
  const trace = traceActionPresentation(goldenActionId);
  if (trace.presentation.source !== 'ROM') {
    throw new Error(`${kind}: expected ROM presentation, got ${trace.presentation.source}`);
  }
  if (trace.romFrames.length === 0) {
    throw new Error(`${kind}: production trace emitted no physical frames`);
  }

  const beats = trace.romFrames.map((frame, index) => {
    const next = trace.romFrames[index + 1];
    const sample = sampleAt(trace.samples, frame.absoluteTick);
    return {
      tick: frame.absoluteTick,
      durationTicks: Math.max(1, next ? next.absoluteTick - frame.absoluteTick : frame.durationTicks || 1),
      scene: sample?.scene ?? 'FIELD',
      formId: frame.actor.formId,
      file: frame.actor.file ?? '',
      resource: frame.resourceId,
      sequence: frame.sequenceIndex,
      frameIndex: frame.frameIndex,
      visualFrameId: frame.visualFrameId,
      physicalStatus: frame.actor.physicalStatus,
      fx: sample?.fx ?? [],
    };
  });

  if (beats.some(beat => !beat.file)) {
    throw new Error(`${kind}: production trace emitted a physical frame without a file`);
  }

  return {
    kind,
    goldenActionId,
    source: 'ROM',
    actorFormId: trace.gameplay.attacker,
    targetFormId: trace.gameplay.defender,
    beats,
  };
}

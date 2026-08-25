// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM SUPPORT PRESENTATION COMPILER (V7.3)
// Compila el RomSupportPresentationProfile (V6.8) en BattleTimeline.
// Ruta: RomSupportPhysicalVisual + profile + EventLog -> cues ROM -> timeline.
// No muta Engine/HP/CC/RNG: todos los cues son de presentación pura.
// No introduce nombres semánticos humanos no demostrados.
// ═══════════════════════════════════════════════════════════════════════
import type {
  BattleTimeline,
  PresentationCue,
  TimelineEntry,
} from './engine/presentation/PresentationCue';
import {
  romSupportPresentationProfile,
  romSupportPresentationProfilesAll,
  type RomSupportPresentationProfileResult,
} from './romSupportPresentationProfile';

export interface RomSupportCompilerOptions {
  startTick?: number;
  sourceEvent?: string;
}

export interface CompiledRomSupportPresentation {
  cardId: number;
  family: string | null;
  cues: PresentationCue[];
  timeline: BattleTimeline;
  completion: 'COMPLETE' | 'PARTIAL';
  pending: string[];
  provenance: {
    source: 'romSupportPresentationProfile.ts';
    compiler: 'compileRomSupportPresentation';
    preservesRomLevelCues: true;
    semanticResolution: 'NOT_PERFORMED';
  };
}

function entry(
  cue: PresentationCue,
  cardId: number,
  sourceEvent: string,
): TimelineEntry {
  return {
    cue,
    logicalTick: cue.tick,
    sourceEvent,
    profileId: `rom-support-${cardId}`,
    fidelity: 'ROM_STATIC_VERIFIED',
    romSource: {
      kind: 'ROM_PRESENTATION',
      cardId,
      handler: 0,
      profileFamily: 'SUPPORT',
      staticCompletion: 'COMPLETE',
      dynamicPending: false,
      pendingCues: 0,
    },
  };
}

/**
 * V7.3 — compila el perfil Support estático en una BattleTimeline.
 * Determinista: misma carta + mismas opciones -> mismo timeline.
 */
export function compileRomSupportPresentation(
  profile: RomSupportPresentationProfileResult,
  options: RomSupportCompilerOptions = {},
): CompiledRomSupportPresentation {
  const startTick = options.startTick ?? 0;
  const sourceEvent = options.sourceEvent ?? 'ROM_SUPPORT_PRESENTATION';
  const entries = profile.cues.map((cue) => {
    const shifted = { ...cue, tick: cue.tick + startTick } as PresentationCue;
    return entry(shifted, profile.cardId, sourceEvent);
  });
  const endTick = Math.max(
    startTick,
    ...entries.map((item) => item.cue.tick + ('durationTicks' in item.cue ? (item.cue.durationTicks ?? 0) : 0)),
  );
  const pending = entries
    .map((item) => item.cue)
    .filter((cue): cue is Extract<PresentationCue, { type: 'ROM_PENDING' }> => cue.type === 'ROM_PENDING')
    .map((cue) => cue.reason);
  return {
    cardId: profile.cardId,
    family: profile.family,
    cues: profile.cues,
    timeline: { startTick, endTick, entries },
    completion: pending.length === 0 ? 'COMPLETE' : 'PARTIAL',
    pending,
    provenance: {
      source: 'romSupportPresentationProfile.ts',
      compiler: 'compileRomSupportPresentation',
      preservesRomLevelCues: true,
      semanticResolution: 'NOT_PERFORMED',
    },
  };
}

export function compileAllRomSupportPresentations(
  options: RomSupportCompilerOptions = {},
): CompiledRomSupportPresentation[] {
  return romSupportPresentationProfilesAll().map((p) => compileRomSupportPresentation(p, options));
}

export interface RomSupportCompilerSummary {
  cards: number;
  compilable: number;
  complete: number;
  partial: number;
  totalCues: number;
  families: Record<string, number>;
}

export function romSupportCompilerSummary(): RomSupportCompilerSummary {
  const all = compileAllRomSupportPresentations();
  const families: Record<string, number> = {};
  for (const c of all) {
    const key = c.family ?? 'UNKNOWN';
    families[key] = (families[key] ?? 0) + 1;
  }
  return {
    cards: all.length,
    compilable: all.length,
    complete: all.filter((c) => c.completion === 'COMPLETE').length,
    partial: all.filter((c) => c.completion === 'PARTIAL').length,
    totalCues: all.reduce((n, c) => n + c.cues.length, 0),
    families,
  };
}

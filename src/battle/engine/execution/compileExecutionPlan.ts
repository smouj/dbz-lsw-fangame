// ═══════════════════════════════════════════════════════════════════════
// M8 — HANDLER EXECUTION COMPILER
// ═══════════════════════════════════════════════════════════════════════
// Compila un RomTechniqueProfile (datos ROM byte-exactos) en un
// ExecutionPlan: eventos por fase con ticks GBC absolutos y provenance.
//
// PRINCIPIO (del análisis de la ROM): el handler NO hardcodea técnicas.
// Reproduce la SECUENCIA que corresponde al contexto (facing/posición) y
// cambia de estado cuando corresponde. El hold de carga (60 ticks de
// Kamehameha) sale de `frame.durationTicks` — nunca de una constante.
//
// TRES CAPAS (nunca mezclar):
//   1. ROM raw       → frames [metasprite, durationTicks, ΔY, ΔX]
//   2. Handler       → máquina de estados ($02/$05/$07/$0A/…) — señales
//   3. Presentation  → pistas actorTrack/fxTrack sobre el mismo tick
//
// NOTA CRÍTICA: un AnimationResource contiene VARIAS secuencias = variantes
// de la misma ejecución (orientación/enemigo frente/atrás, P1/P2…). El
// handler elige UNA. El plan compila la SECUENCIA PRINCIPAL (index 0) como
// ejecución canónica; el resto quedan expuestas como `variants`.
//
// HALLAZGO ROM ($05 vs $02): los handlers $03-$07 son GUARDS que solo
// interceptan sub-tipos concretos de $CA06 (p.ej. $14 = carta #65); todo lo
// demás cae al dispatcher genérico $02 ($5776). Big Bang (sel=$05, anim=$0F)
// NO tiene rutina propia — usa el camino genérico. El contrato lo refleja
// sin forzar fases: el vocabulario es compartido, la secuencia NO es
// obligatoria.
// ═══════════════════════════════════════════════════════════════════════
import type { RomTechniqueProfile } from '../../../data/romAnimationData';
import {
  type ExecutionPlan, type ExecutionEvent, type ExecutionPhase, type MappedFrame,
  type TrackEvent, type ExecutionEventKind,
} from './contract';

/** Fases del contrato en orden (para validación). */
export const PHASE_ORDER: ExecutionPhase[] = [
  'ACTION_BEGIN', 'LOAD_RESOURCE', 'SETUP_ACTOR', 'CHARGE', 'RELEASE',
  'PROJECTILE_TRAVEL', 'APPROACH', 'IMPACT', 'TARGET_REACTION', 'RECOVERY',
  'RETURN_TO_TACTICAL',
];

const IS_BEAM_FAMILY = (h: number) => h === 0x02 || h === 0x05 || h === 0x07;
const IS_MELEE_FAMILY = (h: number) => h === 0x0A || h === 0x0B;

/**
 * Asigna fase de contrato a un frame según handler + datos del frame.
 * MONÓTONO por frame: el frame de hold máximo (carga, ej. 60t) es el punto
 * de corte — antes CHARGE, después RELEASE→RECOVERY.
 * melee: primera mitad → APPROACH, segunda → IMPACT/RECOVERY.
 */
export function phaseForFrame(
  handler: number, frameIdx: number, frameCount: number, ticks: number, dx: number,
  maxTicksIdx: number,
): ExecutionPhase {
  if (IS_MELEE_FAMILY(handler)) {
    const progress = frameIdx / Math.max(1, frameCount);
    if (progress < 0.5) return 'APPROACH';
    if (progress < 0.8) return 'IMPACT';
    return 'RECOVERY';
  }
  if (IS_BEAM_FAMILY(handler)) {
    if (frameIdx <= maxTicksIdx) return 'CHARGE';          // windup + hold
    const after = frameIdx - maxTicksIdx;
    const remaining = frameCount - maxTicksIdx - 1;
    if (remaining <= 1) return 'RECOVERY';
    return after <= Math.max(1, Math.floor(remaining * 0.5)) ? 'RELEASE' : 'RECOVERY';
  }
  return frameIdx === 0 ? 'CHARGE' : 'RECOVERY';
}

/** Señales de handler por familia (qué transiciones emite cada familia). */
const HANDLER_SIGNALS: Record<number, string[]> = {
  0x02: ['SETUP_COMPLETE', 'CHARGE_START', 'RELEASE_TRIGGER', 'FX_SPAWN', 'IMPACT_TRIGGER', 'RECOVERY_START'],
  0x05: ['SETUP_COMPLETE', 'CHARGE_START', 'RELEASE_TRIGGER', 'FX_SPAWN', 'IMPACT_TRIGGER', 'RECOVERY_START'],
  0x07: ['SETUP_COMPLETE', 'CHARGE_START', 'RELEASE_TRIGGER', 'PROJECTILE_SPAWN', 'PROJECTILE_UPDATE', 'IMPACT_TRIGGER', 'RECOVERY_START'],
  0x0A: ['SETUP_COMPLETE', 'APPROACH_START', 'IMPACT_TRIGGER', 'RECOVERY_START'],
  0x0B: ['SETUP_COMPLETE', 'CHARGE_START', 'RELEASE_TRIGGER', 'IMPACT_TRIGGER', 'RECOVERY_START'],
};

/** Señal de handler para una fase (HANDLER_INFERRED — el dispatch real
 *  se traza con z80dis; estas son las transiciones esperadas). */
function signalForPhase(handler: number, phase: ExecutionPhase): string | undefined {
  const signals = HANDLER_SIGNALS[handler] ?? HANDLER_SIGNALS[0x02];
  switch (phase) {
    case 'CHARGE': return signals[1];
    case 'RELEASE': return signals[2];
    case 'PROJECTILE_TRAVEL': return signals[3];
    case 'APPROACH': return signals[1];
    case 'IMPACT': return signals[3];
    case 'RECOVERY': return signals[signals.length - 1];
    default: return undefined;
  }
}

/** Añade evento con provenance; fusiona fases consecutivas en el mismo tick. */
function pushEvent(
  events: ExecutionEvent[], tick: number, phase: ExecutionPhase, kind: ExecutionEventKind,
  label: string, provenance: ExecutionEvent['provenance'], extra?: Partial<ExecutionEvent>,
): void {
  const last = events[events.length - 1];
  if (last && last.phase === phase && last.tick === tick && last.kind === kind) {
    last.detail = [last.detail, extra?.detail].filter(Boolean).join(' · ');
    return;
  }
  events.push({ tick, phase, kind, label, provenance, ...extra });
}

/**
 * Compila un profile ROM en un ExecutionPlan usando la secuencia principal.
 * Ticks 100% ROM_CONFIRMED (frames) · fases HANDLER_INFERRED ·
 * transiciones de presentación PRESENTATION_DERIVED.
 */
export function compileExecutionPlan(profile: RomTechniqueProfile, technique: string): ExecutionPlan {
  const events: ExecutionEvent[] = [];
  const frames: MappedFrame[] = [];
  const actorTrack: TrackEvent[] = [];
  const fxTrack: TrackEvent[] = [];
  const main = profile.sequences[0];
  let tick = 0;
  let lastPhase: ExecutionPhase | null = null;

  // punto de corte: índice del frame con MÁXIMA duración (el hold de carga)
  let maxTicksIdx = 0;
  main.frames.forEach((f, i) => { if (f.ticks > main.frames[maxTicksIdx].ticks) maxTicksIdx = i; });

  pushEvent(events, tick, 'ACTION_BEGIN', 'HANDLER_SIGNAL', `${technique} ACTION_BEGIN`, 'ROM_CONFIRMED',
    { signal: 'ACTION_BEGIN' });
  pushEvent(events, tick, 'LOAD_RESOURCE', 'HANDLER_SIGNAL',
    `handler $${profile.handler.toString(16).padStart(2, '0')} · anim $${profile.animationResource.toString(16).padStart(2, '0')} · fx $${profile.fxResource.toString(16).padStart(2, '0')} · pal $${profile.palette.toString(16).padStart(2, '0')}`,
    'ROM_CONFIRMED', { signal: 'LOAD_RESOURCE' });
  pushEvent(events, tick, 'SETUP_ACTOR', 'HANDLER_SIGNAL', 'setup actor', 'HANDLER_INFERRED',
    { signal: 'SETUP_COMPLETE' });

  // ── Reproducir la secuencia principal frame a frame (pista ACTOR) ──
  let fxSpawned = false;
  main.frames.forEach((f, fi) => {
    const phase = phaseForFrame(profile.handler, fi, main.frames.length, f.ticks, f.dx, maxTicksIdx);
    const start = tick;
    const end = tick + f.ticks;
    frames.push({
      index: fi, meta: f.meta, ticks: f.ticks, dy: f.dy, dx: f.dx,
      phase, startTick: start, endTick: end,
    });
    actorTrack.push({
      tick: start, kind: 'ACTOR_FRAME',
      label: `seq0.frame[${fi}] meta ${f.meta} ΔY${f.dy} ΔX${f.dx} (${f.ticks}t)`,
      provenance: 'ROM_CONFIRMED',
    });
    // transición de fase → señal del handler (HANDLER_INFERRED)
    if (lastPhase && phase !== lastPhase) {
      const sig = signalForPhase(profile.handler, phase);
      pushEvent(events, start, phase, 'HANDLER_SIGNAL', `handler → ${phase}`, 'HANDLER_INFERRED',
        { signal: sig, detail: `frame[${fi}] meta ${f.meta}` });
    }
    // frame del actor como evento ACTOR_FRAME (nunca mezclado con señales)
    pushEvent(events, start, phase, 'ACTOR_FRAME',
      `seq0.frame[${fi}] meta ${f.meta} ΔY${f.dy} ΔX${f.dx}`,
      'ROM_CONFIRMED', { metaspriteIndex: f.meta, durationTicks: f.ticks, detail: `${f.ticks}t` });
    // FX_SPAWN en el primer frame RELEASE (pista FX, orden cronológico)
    if (!fxSpawned && phase === 'RELEASE') {
      fxSpawned = true;
      fxTrack.push({ tick: start, kind: 'FX_SPAWN', label: 'fx spawn', provenance: 'HANDLER_INFERRED' });
      pushEvent(events, start, phase, 'HANDLER_SIGNAL', 'FX_SPAWN', 'HANDLER_INFERRED',
        { signal: 'FX_SPAWN', detail: `fx $${profile.fxResource.toString(16).padStart(2, '0')} pal $${profile.palette.toString(16).padStart(2, '0')}` });
    }
    lastPhase = phase;
    tick = end;
  });

  pushEvent(events, tick, 'RECOVERY', 'HANDLER_SIGNAL', 'actor-animation-complete', 'HANDLER_INFERRED',
    { signal: 'RECOVERY_START', detail: `${tick}t` });
  pushEvent(events, tick, 'RETURN_TO_TACTICAL', 'PRESENTATION', 'return to tactical', 'PRESENTATION_DERIVED');

  const durationMs = Math.round((tick / 59.7275) * 1000) / 1000;
  return {
    technique, handler: profile.handler, animationResource: profile.animationResource,
    fxResource: profile.fxResource, palette: profile.palette,
    totalTicks: tick, frames, events, actorTrack, fxTrack, durationMs,
    variants: profile.sequences.slice(1).map((s, i) => ({
      index: i + 1,
      totalTicks: s.frames.reduce((a, f) => a + f.ticks, 0),
      frameCount: s.frames.length,
    })),
  };
}

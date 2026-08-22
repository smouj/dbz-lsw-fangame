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
// NOTA CRÍTICA: un AnimationResource contiene VARIAS secuencias = variantes
// de la misma ejecución (orientación/enemigo frente/atrás, P1/P2…). El
// handler elige UNA. El plan compila la SECUENCIA PRINCIPAL (index 0) como
// ejecución canónica; el resto quedan expuestas como `variants`.
//
// Fase por frame (HANDLER_INFERRED hasta trazar las rutinas):
//   beams: ΔX ≥ 0 (avance) + hold largo → CHARGE · ΔX < 0 (retroceso) →
//          RELEASE→RECOVERY · transiciones marcadas por el handler
//   melee ($0A/$0B): APPROACH → IMPACT → TARGET_REACTION → RECOVERY
// ═══════════════════════════════════════════════════════════════════════
import type { RomTechniqueProfile } from '../../../data/romAnimationData';
import {
  type ExecutionPlan, type ExecutionEvent, type ExecutionPhase, type MappedFrame,
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
 * de corte — antes CHARGE, después RELEASE→RECOVERY. Así una secuencia
 * nunca vuelve a cargar tras liberar (fiel al patrón real: carga→release→recoil).
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
    if (frameIdx < maxTicksIdx) return 'CHARGE';          // windup + hold
    if (frameIdx === maxTicksIdx) return 'CHARGE';        // el hold mismo
    const after = frameIdx - maxTicksIdx;
    const remaining = frameCount - maxTicksIdx - 1;
    if (remaining <= 1) return 'RECOVERY';
    return after <= Math.max(1, Math.floor(remaining * 0.5)) ? 'RELEASE' : 'RECOVERY';
  }
  return frameIdx === 0 ? 'CHARGE' : 'RECOVERY';
}

/** Añade evento con provenance; fusiona fases consecutivas en el mismo tick. */
function pushEvent(
  events: ExecutionEvent[], tick: number, phase: ExecutionPhase, label: string,
  provenance: ExecutionEvent['provenance'], detail?: string,
): void {
  const last = events[events.length - 1];
  if (last && last.phase === phase && last.tick === tick) {
    last.detail = [last.detail, detail].filter(Boolean).join(' · ');
    return;
  }
  events.push({ tick, phase, label, provenance, detail });
}

/**
 * Compila un profile ROM en un ExecutionPlan usando la secuencia principal.
 * Ticks 100% ROM_CONFIRMED (frames) · fases HANDLER_INFERRED ·
 * transiciones de presentación PRESENTATION_DERIVED.
 */
export function compileExecutionPlan(profile: RomTechniqueProfile, technique: string): ExecutionPlan {
  const events: ExecutionEvent[] = [];
  const frames: MappedFrame[] = [];
  const main = profile.sequences[0];
  let tick = 0;

  pushEvent(events, tick, 'ACTION_BEGIN', `${technique} ACTION_BEGIN`, 'ROM_CONFIRMED');
  pushEvent(events, tick, 'LOAD_RESOURCE',
    `handler $${profile.handler.toString(16).padStart(2, '0')} · anim $${profile.animationResource.toString(16).padStart(2, '0')} · fx $${profile.fxResource.toString(16).padStart(2, '0')} · pal $${profile.palette.toString(16).padStart(2, '0')}`,
    'ROM_CONFIRMED');
  pushEvent(events, tick, 'SETUP_ACTOR', 'setup actor', 'HANDLER_INFERRED');

  // ── Reproducir la secuencia principal frame a frame ──
  let lastPhase: ExecutionPhase | null = null;
  // punto de corte: índice del frame con MÁXIMA duración (el hold de carga)
  let maxTicksIdx = 0;
  main.frames.forEach((f, i) => { if (f.ticks > main.frames[maxTicksIdx].ticks) maxTicksIdx = i; });
  main.frames.forEach((f, fi) => {
    const phase = phaseForFrame(profile.handler, fi, main.frames.length, f.ticks, f.dx, maxTicksIdx);
    const start = tick;
    const end = tick + f.ticks;
    frames.push({
      index: fi, meta: f.meta, ticks: f.ticks, dy: f.dy, dx: f.dx,
      phase, startTick: start, endTick: end,
    });
    // transición de fase (si cambia) → evento de handler
    if (lastPhase && phase !== lastPhase) {
      pushEvent(events, start, phase, `handler → ${phase}`, 'HANDLER_INFERRED',
        `frame[${fi}] meta ${f.meta}`);
    }
    pushEvent(events, start, phase,
      `seq0.frame[${fi}] meta ${f.meta} ΔY${f.dy} ΔX${f.dx}`,
      'ROM_CONFIRMED', `${f.ticks}t`);
    lastPhase = phase;
    tick = end;
  });

  pushEvent(events, tick, 'RECOVERY', 'actor-animation-complete', 'HANDLER_INFERRED', `${tick}t`);
  pushEvent(events, tick, 'RETURN_TO_TACTICAL', 'return to tactical', 'PRESENTATION_DERIVED');

  const durationMs = Math.round((tick / 59.7275) * 1000) / 1000;
  return {
    technique, handler: profile.handler, animationResource: profile.animationResource,
    fxResource: profile.fxResource, palette: profile.palette,
    totalTicks: tick, frames, events, durationMs,
    variants: profile.sequences.slice(1).map((s, i) => ({
      index: i + 1,
      totalTicks: s.frames.reduce((a, f) => a + f.ticks, 0),
      frameCount: s.frames.length,
    })),
  };
}

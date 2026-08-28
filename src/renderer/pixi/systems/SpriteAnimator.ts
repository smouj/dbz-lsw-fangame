// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — SpriteAnimator (sistema de reloj ÚNICO)
// ═══════════════════════════════════════════════════════════════════════
// El corazón del plan "un único reloj gobierna la presentación".
//
// A diferencia de useSpriteAnim (que usa setInterval independiente), aquí el
// frame actual es una FUNCIÓN PURA del tiempo transcurrido en FRAMES GBC:
//
//   frameIndex = f(elapsedGbcTicks)
//
// No hay setTimeout ni CSS animation-duration. El mismo reloj que dispara
// HIT_FRAME / APPLY_DAMAGE / CAMERA en el BattleTimeline es el que avanza la
// animación del sprite. Así pose, impacto, beam y frame van SIEMPRE en fase.
//
// DOS MODOS DE TIMING:
//
//   ROM_TICKS  — La ROM dice frame 0 = 3 ticks, frame 1 = 8 ticks, etc.
//                Cada frame se muestra exactamente durationTicks ticks.
//                tickAccumulator → advance cuando alcanza el límite.
//                NO se convierte ticks a fps. NO se usa animationSpeed.
//                Provenance: form + resource + sequence + frameIndex.
//
//   LEGACY_FPS — Assets sin timing ROM demostrado (dev sprites, tests).
//                Usa anim.fps uniforme → ticksPerFrame = round(GBC_FPS/fps).
//                Solo para assets donde NO existe AnimationResource.
//
// La procedencia timingSource indica QUÉ modo activo usa la animación.
// ═══════════════════════════════════════════════════════════════════════

import { GBC_FPS } from '../../../battle/timeline';
import type { PoseAnim, PoseFrame } from '../assets/AtlasLoader';
import type { TimingSource } from '../../../battle/romTimedFrameInstance';

export interface SpriteAnimState {
  frameIndex: number;
  frame: PoseFrame;
  /** true cuando una animación sin loop ya alcanzó su último frame. */
  finished: boolean;
}

const EMPTY_FRAME: PoseFrame = { file: '', w: 0, h: 0 };

/**
 * ¿Tiene esta animación durationTicks por frame (ROM-native)?
 * Cuando TODOS los frames tienen durationTicks > 0, usamos ROM_TICKS.
 * Si ALGUNO falta, no es ROM-native completo → LEGACY_FPS.
 */
export function detectTimingSource(anim: PoseAnim): TimingSource {
  if (anim.frames.length === 0) return 'LEGACY_FPS';
  return anim.frames.every(f => (f.durationTicks ?? 0) > 0)
    ? 'ROM_TICKS'
    : 'LEGACY_FPS';
}

/**
 * Encuentra el frame actual acumulando durationTicks ROM por frame.
 *
 * frame 0: ticks [0, duration[0])
 * frame 1: ticks [duration[0], duration[0]+duration[1])
 * frame N: ticks [sum(d[0..N-1]), sum(d[0..N]))
 *
 * En el boundary EXACTO (tick = sum), avanza al siguiente frame.
 * En tick = duration-1, sigue en el frame actual.
 */
function frameByRomDurations(anim: PoseAnim, elapsedTicks: number): { frameIndex: number; finished: boolean } {
  const n = anim.frames.length;
  let accumulated = 0;
  for (let i = 0; i < n; i++) {
    const dur = anim.frames[i].durationTicks!;
    if (elapsedTicks < accumulated + dur) {
      return { frameIndex: i, finished: false };
    }
    accumulated += dur;
  }
  // Past the end of all frames
  if (anim.loop) {
    const totalDuration = accumulated;
    if (totalDuration <= 0) return { frameIndex: 0, finished: false };
    const wrapped = elapsedTicks % totalDuration;
    // Recurse into the wrapped position
    let acc2 = 0;
    for (let i = 0; i < n; i++) {
      const dur = anim.frames[i].durationTicks!;
      if (wrapped < acc2 + dur) {
        return { frameIndex: i, finished: false };
      }
      acc2 += dur;
    }
    return { frameIndex: 0, finished: false };
  }
  // Non-loop: hold on last frame
  return { frameIndex: n - 1, finished: true };
}

/**
 * Frame actual de una animación dado el tiempo transcurrido en ticks GBC.
 * Determinista y reproducible (mismo elapsedTicks → mismo frame).
 *
 * ROM_TICKS: cada frame se muestra por su durationTicks ROM exacto.
 * LEGACY_FPS: fps uniforme → ticksPerFrame = round(GBC_FPS / fps).
 */
export function currentFrame(
  anim: PoseAnim,
  elapsedTicks: number,
  fps: number = GBC_FPS,
): SpriteAnimState {
  const n = anim.frames.length;
  if (n === 0) return { frameIndex: 0, frame: EMPTY_FRAME, finished: true };

  const timingSource = detectTimingSource(anim);

  if (timingSource === 'ROM_TICKS') {
    const { frameIndex, finished } = frameByRomDurations(anim, elapsedTicks);
    return { frameIndex, frame: anim.frames[frameIndex], finished };
  }

  // LEGACY_FPS: uniform fps per animation
  const ticksPerFrame = Math.max(1, Math.round(fps / anim.fps));
  const idx = Math.floor(Math.max(0, elapsedTicks) / ticksPerFrame);

  if (anim.loop || n === 1) {
    const wrapped = ((idx % n) + n) % n;
    return { frameIndex: wrapped, frame: anim.frames[wrapped], finished: false };
  }

  const clamped = Math.min(idx, n - 1);
  return { frameIndex: clamped, frame: anim.frames[clamped], finished: idx >= n - 1 };
}
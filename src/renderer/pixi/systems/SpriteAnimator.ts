// ═══════════════════════════════════════════════════════════
// DBZ LSW — SpriteAnimator (sistema de reloj ÚNICO)
// ═══════════════════════════════════════════════════════════
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

import { GBC_FPS } from '../../../battle/timeline';
import type { PoseAnim, PoseFrame } from '../assets/AtlasLoader';

export interface SpriteAnimState {
  frameIndex: number;
  frame: PoseFrame;
  /** true cuando una animación sin loop ya alcanzó su último frame. */
  finished: boolean;
}

const EMPTY_FRAME: PoseFrame = { file: '', w: 0, h: 0 };

/**
 * Frame actual de una animación dado el tiempo transcurrido en frames GBC.
 * Determinista y reproducible (mismo elapsedTicks → mismo frame).
 */
export function currentFrame(
  anim: PoseAnim,
  elapsedTicks: number,
  fps: number = GBC_FPS,
): SpriteAnimState {
  const n = anim.frames.length;
  if (n === 0) return { frameIndex: 0, frame: EMPTY_FRAME, finished: true };

  // fps del manifest está en "frames por segundo" (convención 60fps);
  // lo convertimos a duración por frame en ticks GBC.
  const ticksPerFrame = Math.max(1, Math.round(fps / anim.fps));
  const idx = Math.floor(Math.max(0, elapsedTicks) / ticksPerFrame);

  if (anim.loop || n === 1) {
    const wrapped = ((idx % n) + n) % n;
    return { frameIndex: wrapped, frame: anim.frames[wrapped], finished: false };
  }

  const clamped = Math.min(idx, n - 1);
  return { frameIndex: clamped, frame: anim.frames[clamped], finished: idx >= n - 1 };
}

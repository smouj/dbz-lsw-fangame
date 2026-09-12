// ═══════════════════════════════════════════════════════════════════════
// P0.4R — ROM PALETTE TRANSITION PROGRAM ($07F4 / $080C) — SSOT pura
// ═══════════════════════════════════════════════════════════════════════
// Algoritmo ROM-verificado (§179, RE pasada 2026-08-29):
//   · Rutinas Bank01:$4000 procesan buffers $C600/$C680 (128 bytes = 64
//     colores × 2 bytes BGR555).
//   · $07F4 instala y arranca el worker; $080C lo sondea.
//   · Firma: A=mode, BC=paletteMask16, E=maxCounter, D=channelStep.
//   · mode 1: por update, cada canal R/G/B = min(31, canal + channelStep).
//   · mode 0: working → base, sin overshoot.
//   · Worker: transform-first, luego counter++; termina cuando counter > maxCounter.
//     → ejecuciones = maxCounter + 1 (estándar $10 → 17).
//   · mask16: bits 0..7 = BG0..BG7, bits 8..15 = OBJ0..OBJ7.
//
// NO es un fade negro/blanco, ni alpha Pixi, ni CSS opacity: es interpolación
// entera BGR555 por canales sobre slots de paleta concretos.
//
// Puro y determinista: sin fs, sin Pixi, sin DOM.
// ═══════════════════════════════════════════════════════════════════════

export type RomPaletteTransitionMode = 0 | 1;

export interface RomPaletteTransitionProgram {
  mode: RomPaletteTransitionMode;
  /** bits 0..7 BG0..BG7 · bits 8..15 OBJ0..OBJ7 */
  paletteMask16: number;
  maxCounter: number;
  channelStep: number;
  /** Ejecuciones del worker = maxCounter + 1 (termina al superar maxCounter). */
  totalTicks: number;
  direction: 'TO_WHITE' | 'RESTORE_TO_BASE';
  /** Slots BG/OBJ afectados, derivados del mask (no inventados). */
  affectedBgSlots: number[];
  affectedObjSlots: number[];
  evidence: 'ROM_STATIC_VERIFIED';
}

/**
 * Construye el programa a partir de los parámetros ROM exactos.
 * `totalTicks` = maxCounter + 1 (counter arranca en 0 y el worker para al
 * superar maxCounter, tras transformar).
 */
export function paletteTransitionProgram(
  mode: RomPaletteTransitionMode,
  paletteMask16: number,
  maxCounter: number,
  channelStep: number,
): RomPaletteTransitionProgram {
  const affectedBgSlots: number[] = [];
  const affectedObjSlots: number[] = [];
  for (let slot = 0; slot < 8; slot++) {
    if ((paletteMask16 >> slot) & 1) affectedBgSlots.push(slot);
    if ((paletteMask16 >> (8 + slot)) & 1) affectedObjSlots.push(slot);
  }
  return {
    mode,
    paletteMask16,
    maxCounter,
    channelStep,
    totalTicks: maxCounter + 1,
    direction: mode === 1 ? 'TO_WHITE' : 'RESTORE_TO_BASE',
    affectedBgSlots,
    affectedObjSlots,
    evidence: 'ROM_STATIC_VERIFIED',
  };
}

/** Un paso del worker sobre un canal de 5 bits (0..31). Entero, sin easing. */
export function paletteTransitionChannelStep(channel: number, program: RomPaletteTransitionProgram, target: number): number {
  if (program.mode === 1) return Math.min(31, channel + program.channelStep);
  // mode 0: baja hacia el valor base, sin overshoot.
  return Math.max(target, channel - program.channelStep);
}

/**
 * Canal de 5 bits tras `step` ejecuciones del worker (0 = estado inicial).
 * `startChannel` = valor actual del working; `targetChannel` = base para mode 0
 * (o irrelevante en mode 1, que va a blanco).
 */
export function paletteTransitionChannelAt(
  startChannel: number,
  program: RomPaletteTransitionProgram,
  step: number,
  targetChannel = startChannel,
): number {
  const clampStep = Math.max(0, Math.min(program.totalTicks, step));
  let channel = startChannel;
  for (let i = 0; i < clampStep; i++) {
    channel = paletteTransitionChannelStep(channel, program, targetChannel);
  }
  return channel;
}

/** Aplica el paso a un color BGR555 (16 bits). `targetBgr555` = base para mode 0. */
export function paletteTransitionBgr555At(
  startBgr555: number,
  program: RomPaletteTransitionProgram,
  step: number,
  targetBgr555 = startBgr555,
): number {
  const r = startBgr555 & 31;
  const g = (startBgr555 >> 5) & 31;
  const b = (startBgr555 >> 10) & 31;
  const tr = targetBgr555 & 31;
  const tg = (targetBgr555 >> 5) & 31;
  const tb = (targetBgr555 >> 10) & 31;
  const r2 = paletteTransitionChannelAt(r, program, step, tr);
  const g2 = paletteTransitionChannelAt(g, program, step, tg);
  const b2 = paletteTransitionChannelAt(b, program, step, tb);
  return (r2 & 31) | ((g2 & 31) << 5) | ((b2 & 31) << 10);
}

/** Canal 5 bits → 8 bits, mismo redondeo que el resto del proyecto. */
function to8bit(channel5: number): number {
  return ((channel5 & 31) * 255 / 31) | 0;
}

/**
 * RGBA del color tras `step`, listo para el display. La transformación es la
 * del worker ROM (BGR555 entero), no un fade de alpha.
 */
export function paletteTransitionRgbaAt(
  startBgr555: number,
  program: RomPaletteTransitionProgram,
  step: number,
  alpha = 255,
  targetBgr555 = startBgr555,
): [number, number, number, number] {
  const value = paletteTransitionBgr555At(startBgr555, program, step, targetBgr555);
  return [to8bit(value & 31), to8bit((value >> 5) & 31), to8bit((value >> 10) & 31), alpha];
}

/** Paleta física estándar de escena (maxCounter $10, channelStep $02, mode 1). */
export const PALETTE_TRANSITION_STANDARD_PROGRAM = paletteTransitionProgram(1, 0x0308, 0x10, 0x02);

/** Perfiles ROM observados (máscaras) — no inventar otros. */
export const ROM_PALETTE_TRANSITION_MASKS = [0x0308, 0x0348, 0x0340, 0x0008, 0x0310, 0x0038, 0x0060, 0x0020, 0x008d, 0x00bf, 0x03bf] as const;

export interface RomPaletteTransitionStage {
  stage: 'T1_BEFORE_BG' | 'T2_AFTER_BG' | 'T3_AFTER_HOLD120';
  /** Dirección ROM del estado CA06 que la instala. */
  address: number;
  mode: RomPaletteTransitionMode;
  paletteMask16: number;
  maxCounter: number;
  channelStep: number;
}

/**
 * Secuencia ROM REAL del camino común Support ($00/$02).
 * V5 FSM, ROM_HANDLER_VERIFIED (03:$63FA..$64D7).
 *
 * Orden literal de la ROM — NO es el orden del código previo:
 *   $0A paleta T1 (A=1 BC=$0038 E=$20 D=1)  ← ANTES de ensamblar el BG
 *   $0B poll $080C · scene $3764 · macro $19
 *   $0C BG helper $66D1 → Bank68:$19 ; al completar → T2 (A=0 BC=$0360 E=$20 D=1)
 *   $0D delay $0821 DE=$28 (40t) · poll · CB77=0
 *   $0E CB77++ hasta $78 (120t) → T3 (A=1 BC=$0020 E=$10 D=2)
 *   $0F poll
 *
 * Máscaras: $0038 = BG3+BG4+BG5 · $0360 = BG5+BG6+OBJ0+OBJ1 · $0020 = BG5.
 * Las tres incluyen BG5 = slot de paleta del overlay BG $19.
 */
export const SUPPORT_COMMON_PALETTE_TRANSITION_SEQUENCE: readonly RomPaletteTransitionStage[] = [
  { stage: 'T1_BEFORE_BG', address: 0x642a, mode: 1, paletteMask16: 0x0038, maxCounter: 0x20, channelStep: 0x01 },
  { stage: 'T2_AFTER_BG', address: 0x6459, mode: 0, paletteMask16: 0x0360, maxCounter: 0x20, channelStep: 0x01 },
  { stage: 'T3_AFTER_HOLD120', address: 0x6487, mode: 1, paletteMask16: 0x0020, maxCounter: 0x10, channelStep: 0x02 },
] as const;

/** Slot de paleta del overlay BG $19/$1A (ROM: BG palette slot5). */
export const ROM_BG_OVERLAY_PALETTE_SLOT = 5;

/** ¿La máscara toca el slot de paleta del overlay BG? */
export function paletteMaskAffectsBgSlot(paletteMask16: number, slot: number): boolean {
  return ((paletteMask16 >> slot) & 1) === 1;
}

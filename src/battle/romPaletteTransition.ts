// ═══════════════════════════════════════════════════════════════════════
// P9 ROM RE — RomPaletteTransition SSOT (C4 — transición de paleta BGR555)
// ═══════════════════════════════════════════════════════════════════════
// Fuente: RE pasada (2026-08-29).
//
// $07F4 instala los parámetros y arranca un worker. $080C lo sondea.
//
// Parámetros ROM:
//   PALETTE_TRANSITION(mode, paletteMask16, maxCounter, channelStep)
//
// Firma exacta de llamada:
//   A=mode, BC=paletteMask16, E=maxCounter, D=channelStep
//
// mask16:
//   bits 0..7  = BG0..BG7
//   bits 8..15 = OBJ0..OBJ7
//
// mode=1: entero BGR555 hacia blanco (cada R/G/B += channelStep, saturado a 31).
// mode=0: entero BGR555 restaura desde working hacia base, sin overshoot.
//
// No hay lerp/easing/interpolación RGB flotante.
// ═══════════════════════════════════════════════════════════════════════

export type PaletteTransitionEvidence = 'ROM_STATIC_VERIFIED' | 'ROM_DERIVED';

/** Rutinas del worker de transición de paleta. */
export const PALETTE_TRANSITION_ROUTINES = {
  /** Instala parámetros y arranca el worker. */
  install: 0x07f4,
  /** Sondea el worker (avance por update). */
  poll: 0x080c,
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'RE pasada: $07F4 install / $080C poll',
} as const;

export const PALETTE_TRANSITION_CALL_SIGNATURE = {
  routine: 0x07f4,
  registers: {
    mode: 'A',
    paletteMask16: 'BC',
    maxCounter: 'E',
    channelStep: 'D',
  },
  immediateStorage: {
    mode: 0xc0f9,
    maskLo: 0xc0fa,
    maskHi: 0xc0fb,
    maxCounter: 0xc0fc,
    channelStep: 0xc0fd,
  },
  workerStorage: {
    mode: 0xc41d,
    maskLo: 0xc41e,
    maskHi: 0xc41f,
    maxCounter: 0xc420,
    channelStep: 0xc421,
    currentCounter: 0xc422,
  },
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

/** Buffers CGB de paleta usados por el worker. */
export const PALETTE_TRANSITION_BUFFERS = {
  baseBg: { start: 0xc600, end: 0xc63f },
  baseObj: { start: 0xc640, end: 0xc67f },
  workingBg: { start: 0xc680, end: 0xc6bf },
  workingObj: { start: 0xc6c0, end: 0xc6ff },
  groupLayout: '8 palettes × 4 colors × 2 bytes',
  format: 'BGR555',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

/** Parámetros reales instalados por $07F4. */
export const PALETTE_TRANSITION_PARAMETERS = {
  mode: '0 restore-to-base, 1 fade/flash-to-white',
  paletteMask16: 'bits 0..7 BG0..BG7, bits 8..15 OBJ0..OBJ7',
  maxCounter: 'worker applies transform, increments counter, stops when counter > maxCounter',
  channelStep: 'integer per-channel BGR555 step',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

export const PALETTE_TRANSITION_KNOWN_MASKS = [
  0x0308,
  0x0348,
  0x0340,
  0x0008,
  0x0310,
  0x0038,
  0x0060,
  0x0020,
  0x008d,
  0x00bf,
  0x03bf,
] as const;

export const PALETTE_TRANSITION_EXAMPLE_CALL = {
  mode: 1,
  paletteMask16: 0x0308,
  maxCounter: 0x10,
  channelStep: 0x02,
  meaning: 'fade/flash to white over BG3 + OBJ0 + OBJ1 using integer BGR555 step 2',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

/** Semántica de modos del worker. */
export const PALETTE_TRANSITION_MODES = {
  0: {
    name: 'RESTORE_FROM_WHITE_TO_BASE',
    operation: 'working channel moves down toward base channel, clamped with no overshoot',
  },
  1: {
    name: 'FADE_FLASH_TO_WHITE',
    operation: 'R/G/B = min(31, channel + channelStep)',
  },
} as const;

/** Duración estándar del camino de transición (maxCounter = $10). */
export const PALETTE_TRANSITION_STANDARD = {
  maxCounter: 0x10,
  /** Counter starts at 0 and worker terminates only after counter > maxCounter. */
  workerExecutions: 17,
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'Pass 9 static RE: counter starts 0; each poll transforms then increments; stop when counter > maxCounter.',
} as const;

/** Duraciónes adicionales observadas en callsites. */
export const PALETTE_TRANSITION_CALLSITE_DURATIONS = [0x1f, 0x20] as const;

/** Modelo de ejecución del worker (contador ROM, 1 incremento por update). */
export const PALETTE_TRANSITION_WORKER = {
  /** Contador mantenido por el worker; incrementa 1× por actualización. */
  counterIncrementPerUpdate: 1,
  /** Termina cuando el contador supera la duración suministrada. */
  termination: 'counter > suppliedDuration',
  transformOrder: 'transform first, then counter++',
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'RE pasada: worker counter, 1× por update, hasta superar duración',
} as const;

/** Estado de cierre de C4. */
export const PALETTE_TRANSITION_CLOSURE = {
  timingClosed: true,
  bgr555TransformClosed: true,
  bgr555TransformPorted: false,
  note: 'Algorithm closed statically; production Pixi cutover still has to port the integer BGR555 worker.',
} as const;

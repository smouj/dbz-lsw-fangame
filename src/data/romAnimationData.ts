// ═══════════════════════════════════════════════════════════════════════
// romAnimationData.ts — GENERADO por scripts/generate-rom-anim-data.ts
// Secuencias de animación REALES extraídas de la ROM (bancos $62-$64).
// Frame: [metasprite, ticks, deltaY, deltaX] — formato del reproductor GBC.
// NO editar a mano — regenerar tras reextraer la ROM.
// ═══════════════════════════════════════════════════════════════════════

/** Frame de animación ROM: [metaspriteIndex, durationTicks, deltaY, deltaX]. */
export interface RomAnimationFrame {
  meta: number;
  ticks: number;
  dy: number;
  dx: number;
  /** Raw 4-byte frame record: [metaspriteIndex, durationTicks, deltaY_u8, deltaX_u8]. */
  raw: readonly [number, number, number, number];
}

export interface RomAnimationSequence {
  /** Bank-local address of the sequence record. */
  addr: number;
  frames: RomAnimationFrame[];
  totalTicks: number;
}

/** Perfil de técnica anclado a la ROM (selector de ejecución + recursos). */
export interface RomTechniqueProfile {
  /** execution handler (byte +05) — dispatcher del juego. */
  handler: number;
  /** actor animation resource (byte +06, bancos $62-$64). */
  animationResource: number;
  /** effect graphics resource (byte +07, bancos $65+, VRAM $8800). */
  fxResource: number;
  /** effect palette ID (byte +08, tabla CGB banco $30:$6E00). */
  palette: number;
  /** secuencias del actor extraídas (rom-anim-sequences.json). */
  sequences: RomAnimationSequence[];
  /** banco ROM donde vive el recurso. */
  bank: number;
}

/** Técnicas con secuencias ROM_CONFIRMED (extracción byte-exacta). */
export const ROM_TECHNIQUES: Record<string, RomTechniqueProfile> = {
  "Kamehameha": {
    handler: 2,
    animationResource: 3,
    fxResource: 5,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 1191, totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 2, raw: [1, 3, 0, 2] },
        { meta: 1, ticks: 2, dy: 0, dx: 3, raw: [1, 2, 0, 3] },
        { meta: 1, ticks: 60, dy: 0, dx: 3, raw: [1, 60, 0, 3] },
        { meta: 1, ticks: 2, dy: 0, dx: 2, raw: [1, 2, 0, 2] },
        { meta: 2, ticks: 2, dy: 0, dx: -2, raw: [2, 2, 0, 254] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
        { meta: 2, ticks: 2, dy: 0, dx: -5, raw: [2, 2, 0, 251] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
      ] },
      { addr: 1224, totalTicks: 75, frames: [
        { meta: 3, ticks: 3, dy: 0, dx: 2, raw: [3, 3, 0, 2] },
        { meta: 3, ticks: 2, dy: 0, dx: 3, raw: [3, 2, 0, 3] },
        { meta: 3, ticks: 60, dy: 0, dx: 3, raw: [3, 60, 0, 3] },
        { meta: 3, ticks: 2, dy: 0, dx: 2, raw: [3, 2, 0, 2] },
        { meta: 4, ticks: 2, dy: 0, dx: -2, raw: [4, 2, 0, 254] },
        { meta: 4, ticks: 2, dy: 0, dx: -4, raw: [4, 2, 0, 252] },
        { meta: 4, ticks: 2, dy: 0, dx: -5, raw: [4, 2, 0, 251] },
        { meta: 4, ticks: 2, dy: 0, dx: -4, raw: [4, 2, 0, 252] },
      ] },
      { addr: 1257, totalTicks: 75, frames: [
        { meta: 5, ticks: 3, dy: 0, dx: 4, raw: [5, 3, 0, 4] },
        { meta: 5, ticks: 2, dy: 0, dx: 5, raw: [5, 2, 0, 5] },
        { meta: 5, ticks: 60, dy: 0, dx: 5, raw: [5, 60, 0, 5] },
        { meta: 5, ticks: 2, dy: 0, dx: 4, raw: [5, 2, 0, 4] },
        { meta: 6, ticks: 2, dy: 0, dx: -2, raw: [6, 2, 0, 254] },
        { meta: 6, ticks: 2, dy: 0, dx: -4, raw: [6, 2, 0, 252] },
        { meta: 6, ticks: 2, dy: 0, dx: -5, raw: [6, 2, 0, 251] },
        { meta: 6, ticks: 2, dy: 0, dx: -4, raw: [6, 2, 0, 252] },
      ] },
      { addr: 1290, totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 4, raw: [1, 3, 0, 4] },
        { meta: 1, ticks: 2, dy: 0, dx: 5, raw: [1, 2, 0, 5] },
        { meta: 1, ticks: 60, dy: 0, dx: 5, raw: [1, 60, 0, 5] },
        { meta: 1, ticks: 2, dy: 0, dx: 4, raw: [1, 2, 0, 4] },
        { meta: 2, ticks: 2, dy: 0, dx: -2, raw: [2, 2, 0, 254] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
        { meta: 2, ticks: 2, dy: 0, dx: -5, raw: [2, 2, 0, 251] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
      ] },
      { addr: 1323, totalTicks: 75, frames: [
        { meta: 7, ticks: 3, dy: 0, dx: 2, raw: [7, 3, 0, 2] },
        { meta: 7, ticks: 2, dy: 0, dx: 3, raw: [7, 2, 0, 3] },
        { meta: 7, ticks: 60, dy: 0, dx: 3, raw: [7, 60, 0, 3] },
        { meta: 7, ticks: 2, dy: 0, dx: 2, raw: [7, 2, 0, 2] },
        { meta: 8, ticks: 2, dy: 0, dx: -2, raw: [8, 2, 0, 254] },
        { meta: 8, ticks: 2, dy: 0, dx: -4, raw: [8, 2, 0, 252] },
        { meta: 8, ticks: 2, dy: 0, dx: -5, raw: [8, 2, 0, 251] },
        { meta: 8, ticks: 2, dy: 0, dx: -4, raw: [8, 2, 0, 252] },
      ] },
      { addr: 1356, totalTicks: 75, frames: [
        { meta: 9, ticks: 3, dy: 0, dx: 4, raw: [9, 3, 0, 4] },
        { meta: 9, ticks: 2, dy: 0, dx: 5, raw: [9, 2, 0, 5] },
        { meta: 9, ticks: 60, dy: 0, dx: 5, raw: [9, 60, 0, 5] },
        { meta: 9, ticks: 2, dy: 0, dx: 4, raw: [9, 2, 0, 4] },
        { meta: 10, ticks: 2, dy: 0, dx: -2, raw: [10, 2, 0, 254] },
        { meta: 10, ticks: 2, dy: 0, dx: -4, raw: [10, 2, 0, 252] },
        { meta: 10, ticks: 2, dy: 0, dx: -5, raw: [10, 2, 0, 251] },
        { meta: 10, ticks: 2, dy: 0, dx: -4, raw: [10, 2, 0, 252] },
      ] },
    ],
  },
  "Masenko": {
    handler: 2,
    animationResource: 4,
    fxResource: 8,
    palette: 45,
    bank: 98,
    sequences: [
      { addr: 2259, totalTicks: 74, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: 1, raw: [2, 3, 0, 1] },
        { meta: 2, ticks: 2, dy: 0, dx: 2, raw: [2, 2, 0, 2] },
        { meta: 2, ticks: 60, dy: 0, dx: 2, raw: [2, 60, 0, 2] },
        { meta: 1, ticks: 3, dy: 0, dx: -1, raw: [1, 3, 0, 255] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
      ] },
      { addr: 2288, totalTicks: 74, frames: [
        { meta: 4, ticks: 3, dy: 0, dx: 1, raw: [4, 3, 0, 1] },
        { meta: 4, ticks: 2, dy: 0, dx: 2, raw: [4, 2, 0, 2] },
        { meta: 4, ticks: 60, dy: 0, dx: 2, raw: [4, 60, 0, 2] },
        { meta: 1, ticks: 3, dy: 0, dx: -1, raw: [1, 3, 0, 255] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
      ] },
    ],
  },
  "Galick-Ho": {
    handler: 2,
    animationResource: 5,
    fxResource: 14,
    palette: 46,
    bank: 98,
    sequences: [
      { addr: 2719, totalTicks: 76, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: 1, raw: [2, 3, 0, 1] },
        { meta: 2, ticks: 2, dy: 0, dx: 2, raw: [2, 2, 0, 2] },
        { meta: 2, ticks: 60, dy: 0, dx: 3, raw: [2, 60, 0, 3] },
        { meta: 1, ticks: 3, dy: 0, dx: 0, raw: [1, 3, 0, 0] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -6, raw: [3, 2, 0, 250] },
        { meta: 3, ticks: 2, dy: 0, dx: -5, raw: [3, 2, 0, 251] },
      ] },
      { addr: 2752, totalTicks: 76, frames: [
        { meta: 4, ticks: 3, dy: 0, dx: 1, raw: [4, 3, 0, 1] },
        { meta: 4, ticks: 2, dy: 0, dx: 2, raw: [4, 2, 0, 2] },
        { meta: 4, ticks: 60, dy: 0, dx: 3, raw: [4, 60, 0, 3] },
        { meta: 1, ticks: 3, dy: 0, dx: 0, raw: [1, 3, 0, 0] },
        { meta: 5, ticks: 2, dy: 0, dx: -7, raw: [5, 2, 0, 249] },
        { meta: 5, ticks: 2, dy: 0, dx: -8, raw: [5, 2, 0, 248] },
        { meta: 5, ticks: 2, dy: 0, dx: -6, raw: [5, 2, 0, 250] },
        { meta: 5, ticks: 2, dy: 0, dx: -5, raw: [5, 2, 0, 251] },
      ] },
    ],
  },
  "Final Flash": {
    handler: 2,
    animationResource: 9,
    fxResource: 20,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 4963, totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5, raw: [2, 3, 0, 251] },
        { meta: 2, ticks: 60, dy: 0, dx: -4, raw: [2, 60, 0, 252] },
        { meta: 2, ticks: 4, dy: 0, dx: -3, raw: [2, 4, 0, 253] },
        { meta: 1, ticks: 3, dy: 0, dx: -4, raw: [1, 3, 0, 252] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
      ] },
      { addr: 4996, totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5, raw: [2, 3, 0, 251] },
        { meta: 2, ticks: 60, dy: 0, dx: -4, raw: [2, 60, 0, 252] },
        { meta: 2, ticks: 4, dy: 0, dx: -3, raw: [2, 4, 0, 253] },
        { meta: 1, ticks: 3, dy: 0, dx: -4, raw: [1, 3, 0, 252] },
        { meta: 4, ticks: 2, dy: 0, dx: -7, raw: [4, 2, 0, 249] },
        { meta: 4, ticks: 2, dy: 0, dx: -9, raw: [4, 2, 0, 247] },
        { meta: 4, ticks: 2, dy: 0, dx: -8, raw: [4, 2, 0, 248] },
        { meta: 4, ticks: 2, dy: 0, dx: -7, raw: [4, 2, 0, 249] },
      ] },
    ],
  },
  "Energy Wave": {
    handler: 2,
    animationResource: 0,
    fxResource: 2,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 799, totalTicks: 15, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 1, ticks: 2, dy: 0, dx: -1, raw: [1, 2, 0, 255] },
        { meta: 3, ticks: 2, dy: 0, dx: -2, raw: [3, 2, 0, 254] },
        { meta: 3, ticks: 2, dy: 0, dx: -3, raw: [3, 2, 0, 253] },
        { meta: 3, ticks: 2, dy: 0, dx: -2, raw: [3, 2, 0, 254] },
      ] },
      { addr: 828, totalTicks: 15, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 1, ticks: 2, dy: 0, dx: -1, raw: [1, 2, 0, 255] },
        { meta: 2, ticks: 2, dy: 0, dx: -2, raw: [2, 2, 0, 254] },
        { meta: 2, ticks: 2, dy: 0, dx: -3, raw: [2, 2, 0, 253] },
        { meta: 2, ticks: 2, dy: 0, dx: -2, raw: [2, 2, 0, 254] },
      ] },
    ],
  },
  "Finger Beam": {
    handler: 2,
    animationResource: 1,
    fxResource: 2,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 423, totalTicks: 13, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 2, ticks: 2, dy: 0, dx: -7, raw: [2, 2, 0, 249] },
        { meta: 2, ticks: 2, dy: 0, dx: -6, raw: [2, 2, 0, 250] },
      ] },
      { addr: 448, totalTicks: 13, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
        { meta: 3, ticks: 2, dy: 0, dx: -6, raw: [3, 2, 0, 250] },
      ] },
    ],
  },
  "Big Bang Attack": {
    handler: 5,
    animationResource: 15,
    fxResource: 39,
    palette: 45,
    bank: 98,
    sequences: [
      { addr: 1191, totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 2, raw: [1, 3, 0, 2] },
        { meta: 1, ticks: 2, dy: 0, dx: 3, raw: [1, 2, 0, 3] },
        { meta: 1, ticks: 60, dy: 0, dx: 3, raw: [1, 60, 0, 3] },
        { meta: 1, ticks: 2, dy: 0, dx: 2, raw: [1, 2, 0, 2] },
        { meta: 2, ticks: 2, dy: 0, dx: -2, raw: [2, 2, 0, 254] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
        { meta: 2, ticks: 2, dy: 0, dx: -5, raw: [2, 2, 0, 251] },
        { meta: 2, ticks: 2, dy: 0, dx: -4, raw: [2, 2, 0, 252] },
      ] },
      { addr: 1224, totalTicks: 75, frames: [
        { meta: 3, ticks: 3, dy: 0, dx: 2, raw: [3, 3, 0, 2] },
        { meta: 3, ticks: 2, dy: 0, dx: 3, raw: [3, 2, 0, 3] },
        { meta: 3, ticks: 60, dy: 0, dx: 3, raw: [3, 60, 0, 3] },
        { meta: 3, ticks: 2, dy: 0, dx: 2, raw: [3, 2, 0, 2] },
        { meta: 4, ticks: 2, dy: 0, dx: -2, raw: [4, 2, 0, 254] },
        { meta: 4, ticks: 2, dy: 0, dx: -4, raw: [4, 2, 0, 252] },
        { meta: 4, ticks: 2, dy: 0, dx: -5, raw: [4, 2, 0, 251] },
        { meta: 4, ticks: 2, dy: 0, dx: -4, raw: [4, 2, 0, 252] },
      ] },
    ],
  },
  "Destructo Disk": {
    handler: 7,
    animationResource: 18,
    fxResource: 48,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 9243, totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 2, ticks: 3, dy: 0, dx: -3, raw: [2, 3, 0, 253] },
        { meta: 2, ticks: 60, dy: 0, dx: -2, raw: [2, 60, 0, 254] },
        { meta: 1, ticks: 3, dy: 0, dx: -2, raw: [1, 3, 0, 254] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
      ] },
      { addr: 9280, totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 4, ticks: 3, dy: 0, dx: -3, raw: [4, 3, 0, 253] },
        { meta: 4, ticks: 60, dy: 0, dx: -2, raw: [4, 60, 0, 254] },
        { meta: 1, ticks: 3, dy: 0, dx: -2, raw: [1, 3, 0, 254] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
      ] },
      { addr: 9317, totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 2, ticks: 3, dy: 0, dx: -3, raw: [2, 3, 0, 253] },
        { meta: 2, ticks: 60, dy: 0, dx: -2, raw: [2, 60, 0, 254] },
        { meta: 1, ticks: 3, dy: 0, dx: -2, raw: [1, 3, 0, 254] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
      ] },
      { addr: 9354, totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 0, ticks: 2, dy: 0, dx: 0, raw: [0, 2, 0, 0] },
        { meta: 4, ticks: 3, dy: 0, dx: -3, raw: [4, 3, 0, 253] },
        { meta: 4, ticks: 60, dy: 0, dx: -2, raw: [4, 60, 0, 254] },
        { meta: 1, ticks: 3, dy: 0, dx: -2, raw: [1, 3, 0, 254] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
      ] },
    ],
  },
  "Special Beam Cannon": {
    handler: 2,
    animationResource: 22,
    fxResource: 57,
    palette: 45,
    bank: 98,
    sequences: [
      { addr: 4963, totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5, raw: [2, 3, 0, 251] },
        { meta: 2, ticks: 60, dy: 0, dx: -4, raw: [2, 60, 0, 252] },
        { meta: 2, ticks: 4, dy: 0, dx: -3, raw: [2, 4, 0, 253] },
        { meta: 1, ticks: 3, dy: 0, dx: -4, raw: [1, 3, 0, 252] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
        { meta: 3, ticks: 2, dy: 0, dx: -9, raw: [3, 2, 0, 247] },
        { meta: 3, ticks: 2, dy: 0, dx: -8, raw: [3, 2, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -7, raw: [3, 2, 0, 249] },
      ] },
      { addr: 4996, totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5, raw: [2, 3, 0, 251] },
        { meta: 2, ticks: 60, dy: 0, dx: -4, raw: [2, 60, 0, 252] },
        { meta: 2, ticks: 4, dy: 0, dx: -3, raw: [2, 4, 0, 253] },
        { meta: 1, ticks: 3, dy: 0, dx: -4, raw: [1, 3, 0, 252] },
        { meta: 4, ticks: 2, dy: 0, dx: -7, raw: [4, 2, 0, 249] },
        { meta: 4, ticks: 2, dy: 0, dx: -9, raw: [4, 2, 0, 247] },
        { meta: 4, ticks: 2, dy: 0, dx: -8, raw: [4, 2, 0, 248] },
        { meta: 4, ticks: 2, dy: 0, dx: -7, raw: [4, 2, 0, 249] },
      ] },
    ],
  },
  "Misty KiWave": {
    handler: 2,
    animationResource: 8,
    fxResource: 5,
    palette: 45,
    bank: 98,
    sequences: [
      { addr: 4605, totalTicks: 77, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0, raw: [0, 3, 0, 0] },
        { meta: 1, ticks: 3, dy: 0, dx: -2, raw: [1, 3, 0, 254] },
        { meta: 2, ticks: 2, dy: 0, dx: -3, raw: [2, 2, 0, 253] },
        { meta: 2, ticks: 60, dy: 0, dx: -4, raw: [2, 60, 0, 252] },
        { meta: 3, ticks: 3, dy: 0, dx: -8, raw: [3, 3, 0, 248] },
        { meta: 3, ticks: 2, dy: 0, dx: -6, raw: [3, 2, 0, 250] },
        { meta: 3, ticks: 2, dy: 0, dx: -5, raw: [3, 2, 0, 251] },
        { meta: 3, ticks: 2, dy: 0, dx: -6, raw: [3, 2, 0, 250] },
      ] },
    ],
  },
  "Spirit Bomb": {
    handler: 7,
    animationResource: 34,
    fxResource: 90,
    palette: 44,
    bank: 98,
    sequences: [
      { addr: 8873, totalTicks: 85, frames: [
        { meta: 2, ticks: 4, dy: 0, dx: -2, raw: [2, 4, 0, 254] },
        { meta: 2, ticks: 60, dy: 0, dx: -1, raw: [2, 60, 0, 255] },
        { meta: 2, ticks: 3, dy: 0, dx: -2, raw: [2, 3, 0, 254] },
        { meta: 1, ticks: 3, dy: 0, dx: -3, raw: [1, 3, 0, 253] },
        { meta: 3, ticks: 2, dy: 0, dx: -10, raw: [3, 2, 0, 246] },
        { meta: 3, ticks: 2, dy: 0, dx: -14, raw: [3, 2, 0, 242] },
        { meta: 3, ticks: 2, dy: 0, dx: -12, raw: [3, 2, 0, 244] },
        { meta: 3, ticks: 3, dy: 0, dx: -13, raw: [3, 3, 0, 243] },
        { meta: 3, ticks: 3, dy: 0, dx: -12, raw: [3, 3, 0, 244] },
        { meta: 3, ticks: 3, dy: 0, dx: -11, raw: [3, 3, 0, 245] },
      ] },
    ],
  },
  "Tail": {
    handler: 11,
    animationResource: 63,
    fxResource: 255,
    palette: 255,
    bank: 100,
    sequences: [
      { addr: 14163, totalTicks: 31, frames: [
        { meta: 0, ticks: 31, dy: 0, dx: 0, raw: [0, 31, 0, 0] },
      ] },
      { addr: 14168, totalTicks: 225, frames: [
        { meta: 1, ticks: 5, dy: 0, dx: 1, raw: [1, 5, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 1, raw: [2, 3, 255, 1] },
        { meta: 1, ticks: 4, dy: 0, dx: 1, raw: [1, 4, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 0, raw: [2, 3, 255, 0] },
        { meta: 1, ticks: 4, dy: 0, dx: 1, raw: [1, 4, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 1, raw: [2, 3, 255, 1] },
        { meta: 1, ticks: 4, dy: 0, dx: 1, raw: [1, 4, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 0, raw: [2, 3, 255, 0] },
        { meta: 1, ticks: 4, dy: 0, dx: 1, raw: [1, 4, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 1, raw: [2, 3, 255, 1] },
        { meta: 1, ticks: 4, dy: 0, dx: 1, raw: [1, 4, 0, 1] },
        { meta: 2, ticks: 3, dy: -1, dx: 0, raw: [2, 3, 255, 0] },
        { meta: 0, ticks: 60, dy: 0, dx: 0, raw: [0, 60, 0, 0] },
        { meta: 1, ticks: 2, dy: 0, dx: 1, raw: [1, 2, 0, 1] },
        { meta: 3, ticks: 4, dy: 0, dx: 2, raw: [3, 4, 0, 2] },
        { meta: 3, ticks: 30, dy: 0, dx: 2, raw: [3, 30, 0, 2] },
        { meta: 1, ticks: 3, dy: 0, dx: -1, raw: [1, 3, 0, 255] },
        { meta: 4, ticks: 2, dy: 0, dx: -16, raw: [4, 2, 0, 240] },
        { meta: 4, ticks: 2, dy: 2, dx: -18, raw: [4, 2, 2, 238] },
        { meta: 5, ticks: 2, dy: 0, dx: -18, raw: [5, 2, 0, 238] },
        { meta: 5, ticks: 3, dy: -1, dx: -18, raw: [5, 3, 255, 238] },
        { meta: 5, ticks: 60, dy: 0, dx: -18, raw: [5, 60, 0, 238] },
        { meta: 5, ticks: 6, dy: 0, dx: -19, raw: [5, 6, 0, 237] },
        { meta: 5, ticks: 6, dy: 0, dx: -20, raw: [5, 6, 0, 236] },
        { meta: 0, ticks: 2, dy: 0, dx: -12, raw: [0, 2, 0, 244] },
      ] },
    ],
  },
};

/** Busca el perfil ROM de una técnica (undefined si aún no confirmada). */
export function romTechnique(name: string): RomTechniqueProfile | undefined {
  return ROM_TECHNIQUES[name];
}

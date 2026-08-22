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
}

export interface RomAnimationSequence {
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
      { totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 2 },
        { meta: 1, ticks: 2, dy: 0, dx: 3 },
        { meta: 1, ticks: 60, dy: 0, dx: 3 },
        { meta: 1, ticks: 2, dy: 0, dx: 2 },
        { meta: 2, ticks: 2, dy: 0, dx: -2 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
        { meta: 2, ticks: 2, dy: 0, dx: -5 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 3, ticks: 3, dy: 0, dx: 2 },
        { meta: 3, ticks: 2, dy: 0, dx: 3 },
        { meta: 3, ticks: 60, dy: 0, dx: 3 },
        { meta: 3, ticks: 2, dy: 0, dx: 2 },
        { meta: 4, ticks: 2, dy: 0, dx: -2 },
        { meta: 4, ticks: 2, dy: 0, dx: -4 },
        { meta: 4, ticks: 2, dy: 0, dx: -5 },
        { meta: 4, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 5, ticks: 3, dy: 0, dx: 4 },
        { meta: 5, ticks: 2, dy: 0, dx: 5 },
        { meta: 5, ticks: 60, dy: 0, dx: 5 },
        { meta: 5, ticks: 2, dy: 0, dx: 4 },
        { meta: 6, ticks: 2, dy: 0, dx: -2 },
        { meta: 6, ticks: 2, dy: 0, dx: -4 },
        { meta: 6, ticks: 2, dy: 0, dx: -5 },
        { meta: 6, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 4 },
        { meta: 1, ticks: 2, dy: 0, dx: 5 },
        { meta: 1, ticks: 60, dy: 0, dx: 5 },
        { meta: 1, ticks: 2, dy: 0, dx: 4 },
        { meta: 2, ticks: 2, dy: 0, dx: -2 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
        { meta: 2, ticks: 2, dy: 0, dx: -5 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 7, ticks: 3, dy: 0, dx: 2 },
        { meta: 7, ticks: 2, dy: 0, dx: 3 },
        { meta: 7, ticks: 60, dy: 0, dx: 3 },
        { meta: 7, ticks: 2, dy: 0, dx: 2 },
        { meta: 8, ticks: 2, dy: 0, dx: -2 },
        { meta: 8, ticks: 2, dy: 0, dx: -4 },
        { meta: 8, ticks: 2, dy: 0, dx: -5 },
        { meta: 8, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 9, ticks: 3, dy: 0, dx: 4 },
        { meta: 9, ticks: 2, dy: 0, dx: 5 },
        { meta: 9, ticks: 60, dy: 0, dx: 5 },
        { meta: 9, ticks: 2, dy: 0, dx: 4 },
        { meta: 10, ticks: 2, dy: 0, dx: -2 },
        { meta: 10, ticks: 2, dy: 0, dx: -4 },
        { meta: 10, ticks: 2, dy: 0, dx: -5 },
        { meta: 10, ticks: 2, dy: 0, dx: -4 },
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
      { totalTicks: 74, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: 1 },
        { meta: 2, ticks: 2, dy: 0, dx: 2 },
        { meta: 2, ticks: 60, dy: 0, dx: 2 },
        { meta: 1, ticks: 3, dy: 0, dx: -1 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
      ] },
      { totalTicks: 74, frames: [
        { meta: 4, ticks: 3, dy: 0, dx: 1 },
        { meta: 4, ticks: 2, dy: 0, dx: 2 },
        { meta: 4, ticks: 60, dy: 0, dx: 2 },
        { meta: 1, ticks: 3, dy: 0, dx: -1 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
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
      { totalTicks: 76, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: 1 },
        { meta: 2, ticks: 2, dy: 0, dx: 2 },
        { meta: 2, ticks: 60, dy: 0, dx: 3 },
        { meta: 1, ticks: 3, dy: 0, dx: 0 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -6 },
        { meta: 3, ticks: 2, dy: 0, dx: -5 },
      ] },
      { totalTicks: 76, frames: [
        { meta: 4, ticks: 3, dy: 0, dx: 1 },
        { meta: 4, ticks: 2, dy: 0, dx: 2 },
        { meta: 4, ticks: 60, dy: 0, dx: 3 },
        { meta: 1, ticks: 3, dy: 0, dx: 0 },
        { meta: 5, ticks: 2, dy: 0, dx: -7 },
        { meta: 5, ticks: 2, dy: 0, dx: -8 },
        { meta: 5, ticks: 2, dy: 0, dx: -6 },
        { meta: 5, ticks: 2, dy: 0, dx: -5 },
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
      { totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5 },
        { meta: 2, ticks: 60, dy: 0, dx: -4 },
        { meta: 2, ticks: 4, dy: 0, dx: -3 },
        { meta: 1, ticks: 3, dy: 0, dx: -4 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
      ] },
      { totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5 },
        { meta: 2, ticks: 60, dy: 0, dx: -4 },
        { meta: 2, ticks: 4, dy: 0, dx: -3 },
        { meta: 1, ticks: 3, dy: 0, dx: -4 },
        { meta: 4, ticks: 2, dy: 0, dx: -7 },
        { meta: 4, ticks: 2, dy: 0, dx: -9 },
        { meta: 4, ticks: 2, dy: 0, dx: -8 },
        { meta: 4, ticks: 2, dy: 0, dx: -7 },
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
      { totalTicks: 15, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 1, ticks: 2, dy: 0, dx: -1 },
        { meta: 3, ticks: 2, dy: 0, dx: -2 },
        { meta: 3, ticks: 2, dy: 0, dx: -3 },
        { meta: 3, ticks: 2, dy: 0, dx: -2 },
      ] },
      { totalTicks: 15, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 1, ticks: 2, dy: 0, dx: -1 },
        { meta: 2, ticks: 2, dy: 0, dx: -2 },
        { meta: 2, ticks: 2, dy: 0, dx: -3 },
        { meta: 2, ticks: 2, dy: 0, dx: -2 },
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
      { totalTicks: 13, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 2, ticks: 2, dy: 0, dx: -7 },
        { meta: 2, ticks: 2, dy: 0, dx: -6 },
      ] },
      { totalTicks: 13, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
        { meta: 3, ticks: 2, dy: 0, dx: -6 },
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
      { totalTicks: 75, frames: [
        { meta: 1, ticks: 3, dy: 0, dx: 2 },
        { meta: 1, ticks: 2, dy: 0, dx: 3 },
        { meta: 1, ticks: 60, dy: 0, dx: 3 },
        { meta: 1, ticks: 2, dy: 0, dx: 2 },
        { meta: 2, ticks: 2, dy: 0, dx: -2 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
        { meta: 2, ticks: 2, dy: 0, dx: -5 },
        { meta: 2, ticks: 2, dy: 0, dx: -4 },
      ] },
      { totalTicks: 75, frames: [
        { meta: 3, ticks: 3, dy: 0, dx: 2 },
        { meta: 3, ticks: 2, dy: 0, dx: 3 },
        { meta: 3, ticks: 60, dy: 0, dx: 3 },
        { meta: 3, ticks: 2, dy: 0, dx: 2 },
        { meta: 4, ticks: 2, dy: 0, dx: -2 },
        { meta: 4, ticks: 2, dy: 0, dx: -4 },
        { meta: 4, ticks: 2, dy: 0, dx: -5 },
        { meta: 4, ticks: 2, dy: 0, dx: -4 },
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
      { totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 2, ticks: 3, dy: 0, dx: -3 },
        { meta: 2, ticks: 60, dy: 0, dx: -2 },
        { meta: 1, ticks: 3, dy: 0, dx: -2 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
      ] },
      { totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 4, ticks: 3, dy: 0, dx: -3 },
        { meta: 4, ticks: 60, dy: 0, dx: -2 },
        { meta: 1, ticks: 3, dy: 0, dx: -2 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
      ] },
      { totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 2, ticks: 3, dy: 0, dx: -3 },
        { meta: 2, ticks: 60, dy: 0, dx: -2 },
        { meta: 1, ticks: 3, dy: 0, dx: -2 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
      ] },
      { totalTicks: 79, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 0, ticks: 2, dy: 0, dx: 0 },
        { meta: 4, ticks: 3, dy: 0, dx: -3 },
        { meta: 4, ticks: 60, dy: 0, dx: -2 },
        { meta: 1, ticks: 3, dy: 0, dx: -2 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
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
      { totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5 },
        { meta: 2, ticks: 60, dy: 0, dx: -4 },
        { meta: 2, ticks: 4, dy: 0, dx: -3 },
        { meta: 1, ticks: 3, dy: 0, dx: -4 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
        { meta: 3, ticks: 2, dy: 0, dx: -9 },
        { meta: 3, ticks: 2, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -7 },
      ] },
      { totalTicks: 78, frames: [
        { meta: 2, ticks: 3, dy: 0, dx: -5 },
        { meta: 2, ticks: 60, dy: 0, dx: -4 },
        { meta: 2, ticks: 4, dy: 0, dx: -3 },
        { meta: 1, ticks: 3, dy: 0, dx: -4 },
        { meta: 4, ticks: 2, dy: 0, dx: -7 },
        { meta: 4, ticks: 2, dy: 0, dx: -9 },
        { meta: 4, ticks: 2, dy: 0, dx: -8 },
        { meta: 4, ticks: 2, dy: 0, dx: -7 },
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
      { totalTicks: 77, frames: [
        { meta: 0, ticks: 3, dy: 0, dx: 0 },
        { meta: 1, ticks: 3, dy: 0, dx: -2 },
        { meta: 2, ticks: 2, dy: 0, dx: -3 },
        { meta: 2, ticks: 60, dy: 0, dx: -4 },
        { meta: 3, ticks: 3, dy: 0, dx: -8 },
        { meta: 3, ticks: 2, dy: 0, dx: -6 },
        { meta: 3, ticks: 2, dy: 0, dx: -5 },
        { meta: 3, ticks: 2, dy: 0, dx: -6 },
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
      { totalTicks: 85, frames: [
        { meta: 2, ticks: 4, dy: 0, dx: -2 },
        { meta: 2, ticks: 60, dy: 0, dx: -1 },
        { meta: 2, ticks: 3, dy: 0, dx: -2 },
        { meta: 1, ticks: 3, dy: 0, dx: -3 },
        { meta: 3, ticks: 2, dy: 0, dx: -10 },
        { meta: 3, ticks: 2, dy: 0, dx: -14 },
        { meta: 3, ticks: 2, dy: 0, dx: -12 },
        { meta: 3, ticks: 3, dy: 0, dx: -13 },
        { meta: 3, ticks: 3, dy: 0, dx: -12 },
        { meta: 3, ticks: 3, dy: 0, dx: -11 },
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
      { totalTicks: 31, frames: [
        { meta: 0, ticks: 31, dy: 0, dx: 0 },
      ] },
      { totalTicks: 225, frames: [
        { meta: 1, ticks: 5, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 1 },
        { meta: 1, ticks: 4, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 0 },
        { meta: 1, ticks: 4, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 1 },
        { meta: 1, ticks: 4, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 0 },
        { meta: 1, ticks: 4, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 1 },
        { meta: 1, ticks: 4, dy: 0, dx: 1 },
        { meta: 2, ticks: 3, dy: -1, dx: 0 },
        { meta: 0, ticks: 60, dy: 0, dx: 0 },
        { meta: 1, ticks: 2, dy: 0, dx: 1 },
        { meta: 3, ticks: 4, dy: 0, dx: 2 },
        { meta: 3, ticks: 30, dy: 0, dx: 2 },
        { meta: 1, ticks: 3, dy: 0, dx: -1 },
        { meta: 4, ticks: 2, dy: 0, dx: -16 },
        { meta: 4, ticks: 2, dy: 2, dx: -18 },
        { meta: 5, ticks: 2, dy: 0, dx: -18 },
        { meta: 5, ticks: 3, dy: -1, dx: -18 },
        { meta: 5, ticks: 60, dy: 0, dx: -18 },
        { meta: 5, ticks: 6, dy: 0, dx: -19 },
        { meta: 5, ticks: 6, dy: 0, dx: -20 },
        { meta: 0, ticks: 2, dy: 0, dx: -12 },
      ] },
    ],
  },
};

/** Busca el perfil ROM de una técnica (undefined si aún no confirmada). */
export function romTechnique(name: string): RomTechniqueProfile | undefined {
  return ROM_TECHNIQUES[name];
}

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Config del renderer Pixi (resolución lógica del campo)
// ═══════════════════════════════════════════════════════════
// El campo de batalla GBC es 160×80 (2:1). Lo renderizamos a 2× entero
// (320×160) para pixel-perfect con nearest-neighbour; el CSS del canvas hace
// el upscale final (image-rendering: pixelated). NUNCA estirar el fondo.

export const BG_NATIVE_W = 160;
export const BG_NATIVE_H = 80;
export const BATTLE_LOGICAL_W = 320;
export const BATTLE_LOGICAL_H = 160;
/** Escala entera del fondo nativo → lógico. */
export const BG_SCALE = 2;

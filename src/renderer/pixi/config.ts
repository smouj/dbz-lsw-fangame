// ═══════════════════════════════════════════════════════════
// DBZ LSW — Config del renderer Pixi (resolución lógica del campo)
// ═══════════════════════════════════════════════════════════
// El campo de batalla GBC es 160×80 (2:1). Lo renderizamos a 2× entero
// (320×160) para pixel-perfect con nearest-neighbour; el CSS del canvas hace
// el upscale final (image-rendering: pixelated). NUNCA estirar el fondo.

export const BG_NATIVE_W = 160;
export const BG_NATIVE_H = 80;
/** Escala entera del fondo nativo → lógico. */
export const BG_SCALE = 2;

/**
 * ACTION trabaja siempre en el espacio nativo de la ROM. El contenedor de la
 * escena se proyecta una sola vez a píxeles de salida mediante ACTION_WORLD_SCALE.
 * Mantener estos valores separados evita volver a mezclar el tamaño del asset
 * (160×80) con el tamaño del canvas (320×160).
 */
export const ACTION_NATIVE_W = BG_NATIVE_W;
export const ACTION_NATIVE_H = BG_NATIVE_H;
export const ACTION_WORLD_SCALE = BG_SCALE;
export const BATTLE_LOGICAL_W = ACTION_NATIVE_W * ACTION_WORLD_SCALE;
export const BATTLE_LOGICAL_H = ACTION_NATIVE_H * ACTION_WORLD_SCALE;

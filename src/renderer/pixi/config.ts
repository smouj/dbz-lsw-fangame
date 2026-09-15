// ═══════════════════════════════════════════════════════════
// DBZ LSW — Config del renderer Pixi (resolución lógica del campo)
// ═══════════════════════════════════════════════════════════
// El campo de batalla GBC es 160×80 (2:1). Lo renderizamos a 2× entero
// (320×160) para pixel-perfect con nearest-neighbour; el CSS del canvas hace
// el upscale final (image-rendering: pixelated). NUNCA estirar el fondo.
//
// El shell del juego es 16:9 (320×180 a escala lógica). El mundo ROM sigue
// siendo 320×160 y se centra dentro de un output de 320×180 con 10 px lógicos
// de letterbox arriba y abajo. Así no se distorsiona ningún frame ni se deja
// el canvas en una superficie blanca con una proporción distinta.

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
/** Altura del output 16:9 (320×180), distinta de la altura del mundo ROM. */
export const BATTLE_OUTPUT_H = 180;
/** Desplazamiento vertical del mundo ROM dentro del output 16:9. */
export const BATTLE_OUTPUT_Y = Math.floor((BATTLE_OUTPUT_H - BATTLE_LOGICAL_H) / 2);

/**
 * Resuelve el factor de presentación del output Pixi dentro de su panel.
 *
 * El buffer sigue siendo siempre 320×180 y sus texturas siguen usando
 * nearest-neighbour. Preferimos escala entera cuando el panel permite 2× o
 * más; en el panel compacto de Battle (alto reducido por el HUD inferior),
 * una escala fraccionaria de aspect-fit evita dejar un canvas 1× diminuto o
 * provocar overflow vertical. No cambia ninguna coordenada ROM ni el mundo
 * 320×160: solo determina el tamaño CSS del output final.
 */
export function resolveBattleOutputScale(width: number, height: number): number {
  const fit = Math.min(width / BATTLE_LOGICAL_W, height / BATTLE_OUTPUT_H);
  if (!Number.isFinite(fit) || fit <= 0) return 1;
  const integer = Math.floor(fit);
  return integer >= 2 ? integer : fit;
}

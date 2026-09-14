import { spriteDirFor } from './spriteManifest';

// ═══════════════════════════════════════════════════════════
// DBZ LSW — FACING (orientación de sprites)
//
// REGLA (obligatoria, verificada con análisis de silueta):
//   · El luchador en el lado IZQUIERDO mira a la DERECHA
//   · El luchador en el lado DERECHO mira a la IZQUIERDA
//
// NORMALIZACIÓN CANÓNICA (2026-08-15): TODOS los sprites nativos miran a la
// DERECHA. Los 9 directorios que golpeaban nativamente a la izquierda
// (goku_super_saiyan, goku_super_saiyan_3, gohan_super_saiyan_1_2,
// goten_super_saiyan, gotenks_super_saiyan, gotenks_super_saiyan_3,
// piccolo_base, super_buu_base, kid_trunks_super_saiyan) fueron espejados
// horizontalmente con scripts/normalize-facing-right.py, así que el golpe
// nativo de las 44 formas es 'right'. El flip se computa por lado del
// personaje únicamente.
// ═══════════════════════════════════════════════════════════

export type StrikeDir = 'left' | 'right';
export type BattleSide = 'left' | 'right';
export type FacingAuthority = 'ROM_PHYSICAL_FRAME' | 'SEMANTIC_POSE';

// Dirección NATIVA del golpe por slug de sprite (44 formas).
// Todas 'right' tras la normalización 2026-08-15 (antes 9 eran 'left' y
// necesitaban flip compensatorio — docs/audit/native-strike-dir.json).
export const NATIVE_STRIKE_DIR: Record<string, StrikeDir> = {};

const DEFAULT_STRIKE: StrikeDir = 'right';

export function nativeStrikeDir(formId: string): StrikeDir {
  const spriteDir = spriteDirFor(formId) ?? formId;
  return NATIVE_STRIKE_DIR[spriteDir] ?? DEFAULT_STRIKE;
}

/**
 * Flip (escala X) necesario para que un luchador en `side` mire al centro.
 * Lado izquierdo → mira a la derecha. Lado derecho → mira a la izquierda.
 * Devuelve 1 (sin flip) o -1 (espejo).
 */
export function facingFlip(formId: string, side: BattleSide): number {
  const wantsRight = side === 'left'; // a la izquierda se mira a la derecha
  const native = nativeStrikeDir(formId) === 'right';
  return (wantsRight === native) ? 1 : -1;
}

/**
 * Escala horizontal canónica para cualquier representación de un luchador.
 *
 * Hay dos propietarios legítimos de la orientación:
 *   - ROM_PHYSICAL_FRAME: el frame físico ya está resuelto por ROM; solo se
 *     aplica el espejo del lado que lo coloca frente al rival.
 *   - SEMANTIC_POSE: las poses de compatibilidad pueden reutilizar el ciclo
 *     move_front para `move_back`, por lo que esa pose invierte el espejo de
 *     lado de forma explícita.
 *
 * Centralizar esta decisión evita que DOM, Pixi y Dev apliquen transformaciones
 * distintas al mismo personaje/pose. Los frames físicos nunca pasan por la
 * inversión semántica.
 */
export function facingScaleX(
  formId: string,
  side: BattleSide,
  pose?: string | null,
  authority: FacingAuthority = 'SEMANTIC_POSE',
): number {
  const base = facingFlip(formId, side);
  return authority === 'SEMANTIC_POSE' && pose === 'move_back' ? -base : base;
}

// ─── Compatibilidad (vista de retratos/idle con sheets antiguos) ───
// Tras la normalización 2026-08-15 TODOS los idles nativos (combate + menú)
// miran a la derecha, así que needsFlip siempre devuelve false.
// (Antes FLIP_TO_RIGHT marcaba 24 sheets, pero solo 9 idles de menú eran
// realmente espejo del combate — los otros 15 se mostraban INVERTIDOS en
// la selección de personaje. Se espejaron los 9 y se eliminó la tabla.)
const FLIP_TO_RIGHT: Record<string, boolean> = {};

export function needsFlip(sheet: string): boolean {
  return false;
}

import { spriteDirFor } from './spriteManifest';

// ═══════════════════════════════════════════════════════════
// DBZ LSW — FACING (orientación de sprites)
//
// REGLA (obligatoria, verificada con análisis de silueta):
//   · El luchador en el lado IZQUIERDO mira a la DERECHA
//   · El luchador en el lado DERECHO mira a la IZQUIERDA
//
// El paquete de sprites NO tiene orientación nativa uniforme:
// análisis de la secuencia attack_forward (windup → golpe) de las
// 44 formas determina la dirección NATIVA del golpe de cada una.
// El flip se computa por forma + lado del personaje.
// ═══════════════════════════════════════════════════════════

export type StrikeDir = 'left' | 'right';
export type BattleSide = 'left' | 'right';

// Dirección NATIVA del golpe por slug de sprite (44 formas, 2026-08-11)
// Fuente: docs/audit/native-strike-dir.json (análisis windup/golpe)
export const NATIVE_STRIKE_DIR: Record<string, StrikeDir> = {
  // Golpe nativo a la IZQUIERDA (9): necesitan flip cuando están a la izquierda
  goku_super_saiyan: 'left',
  goku_super_saiyan_3: 'left',
  gohan_super_saiyan_1_2: 'left',
  goten_super_saiyan: 'left',
  gotenks_super_saiyan: 'left',
  gotenks_super_saiyan_3: 'left',
  piccolo_base: 'left',
  super_buu_base: 'left',
  kid_trunks_super_saiyan: 'left',  // verificado visual 2026-08-12 (puño a la izq)
};

// Golpe nativo a la DERECHA (35) — el resto por defecto:
// android_16_base, android_17_base, android_18_base, android_19_base,
// android_20_base, burter_base, buu_base, buu_gohan_absorbed,
// buu_gotenks_absorbed, cell_imperfect_form, cell_jr_base, cell_perfect,
// cell_semi_perfect_form, frieza_base, future_trunks_base, ginyu_base,
// ginyu_gokus_body, gohan_ultimate, goku_base, goku_super_saiyan_2,
// goten_base, guldo_base, jeice_base, kid_buu_base, krillin_base, nappa_base,
// recoome_base, trunks_base, vegeta_base, vegeta_super_saiyan_majin,
// young_gohan_base, young_gohan_super_saiyan, young_gohan_super_saiyan_2

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

// ─── Compatibilidad (vista de retratos/idle con sheets antiguos) ───
const FLIP_TO_RIGHT: Record<string, boolean> = {
  'android-20-dr-gero': true, 'burter': true, 'buu': true, 'buu-gohan': true,
  'buu-gotenks': true, 'cell-imperfect-form': true, 'cell-perfect': true,
  'cell-semi-perfect-form': true, 'frieza': true, 'gohan-super-saiyan-1-2': true,
  'gohan-ultimate': true, 'goku-super-saiyan': true, 'goku-super-saiyan-2': true,
  'goku-super-saiyan-3': true, 'gotenks-super-saiyan': true, 'gotenks-super-saiyan-3': true,
  'kid-buu': true, 'krillin': true, 'piccolo': true, 'super-buu': true,
  'trunks': true, 'vegeta-super-saiyan-majin': true, 'young-gohan-super-saiyan': true,
  'young-gohan-super-saiyan-2': true,
};

export function needsFlip(sheet: string): boolean {
  const key = sheet.replace(/\.png$/, '');
  return FLIP_TO_RIGHT[key] ?? false;
}

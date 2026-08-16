// ═══════════════════════════════════════════════════════════
// DBZ LSW — Transformaciones en combate (cartas Sup.Saiyan)
// ═══════════════════════════════════════════════════════════
// Al usar una carta de transformación (Sup.Saiyan-2/3), el luchador avanza
// al siguiente form del personaje (goku_base → goku_super_saiyan → ...).
// El sprite cambia de verdad (palette/design swap real del GBC), no solo
// flash+aura. La forma vuelve al estado base al terminar el combate (la
// prop formId de BattleScreen no se muta; usamos estado local derivado).
//
// Reglas:
// - Solo personajes con transformaciones registradas (forms.length > 1).
// - La carta Sup.Saiyan-2 (id 27) / Sup.Saiyan-3 (id 28) avanzan un nivel.
// - Los transforms por personaje siguen el orden de CHARACTERS.forms[].
// - Si no hay siguiente forma, el flash+aura se muestra igual (sin swap).

import { getCharacter, getForm } from '../data/roster';

export const TRANSFORM_CARD_IDS = new Set([27, 28]); // Sup.Saiyan-2 / Sup.Saiyan-3

/**
 * Devuelve el formId transformado del luchador, o null si no hay
 * transformación disponible (última forma o personaje sin cadena).
 */
export function nextTransformedForm(currentFormId: string): string | null {
  const current = getForm(currentFormId);
  if (!current) return null;
  const char = getCharacter(current.character);
  if (!char || char.forms.length < 2) return null;
  const idx = char.forms.indexOf(currentFormId);
  if (idx < 0 || idx >= char.forms.length - 1) return null;
  return char.forms[idx + 1];
}

/** ¿La carta es una transformación de combate? */
export function isTransformCard(cardId: number): boolean {
  return TRANSFORM_CARD_IDS.has(cardId);
}

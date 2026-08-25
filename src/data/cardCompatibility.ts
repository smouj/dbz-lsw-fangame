// ═══════════════════════════════════════════════════════════════════════
// CARD COMPATIBILITY — compatibilidad carta ↔ personaje/forma
// ═══════════════════════════════════════════════════════════════════════
// FUENTE ÚNICA: CardDef.compatible / CardDef.notCompatible (cards.ts,
// extraído de la máscara de compatibilidad 48-bit de la ROM, Bank11:$4320
// bytes +9..14). NO mantener tablas manuales de compatibilidad en la UI.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from './cards';
import { getCard } from './cards';
import { getForm } from './roster';

/**
 * ¿El personaje puede usar esta carta?
 * - compatible: undefined → todos; definido → SOLO los listados.
 * - notCompatible: excluidos (el resto puede usarla).
 */
export function cardUsableByCharacter(card: CardDef, characterId: string): boolean {
  if (card.compatible && !card.compatible.includes(characterId)) return false;
  if (card.notCompatible && card.notCompatible.includes(characterId)) return false;
  return true;
}

/** ¿La forma puede usar esta carta? (delega al personaje padre). */
export function cardUsableByForm(card: CardDef, formId: string): boolean {
  const form = getForm(formId);
  if (!form) return false;
  return cardUsableByCharacter(card, form.character);
}

/** Filtra una lista de cartas por compatibilidad con un personaje. */
export function filterCardsForCharacter(cards: CardDef[], characterId: string): CardDef[] {
  return cards.filter(c => cardUsableByCharacter(c, characterId));
}

/** Filtra una lista de cartas por compatibilidad con una forma. */
export function filterCardsForForm(cards: CardDef[], formId: string): CardDef[] {
  return cards.filter(c => cardUsableByForm(c, formId));
}

/** ¿Un id de carta es usable por la forma? (getCard + delegación). */
export function cardIdUsableByForm(cardId: number, formId: string): boolean {
  const card = getCard(cardId);
  if (!card) return false;
  return cardUsableByForm(card, formId);
}

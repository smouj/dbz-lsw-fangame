// ═══════════════════════════════════════════════════════════════════════
// setupLogic — funciones PURAS del Team Setup (testeables sin React)
// ═══════════════════════════════════════════════════════════════════════
// Navegación del roll (wrap-around), miembros por defecto, decks por
// defecto, limpieza explícita de limits incompatibles.
// ═══════════════════════════════════════════════════════════════════════

import { getCharacter, getForm } from '../../data/roster';
import { getLimitCapacity, normalizeLoadout, getLimitLoadoutDefinition } from '../../data/limitLoadout';
import { DECK_SIZE, getCard } from '../../data/cards';
import { cardUsableByCharacter } from '../../data/cardCompatibility';
import type { TeamMember } from './teamSetupTypes';

/** Índice siguiente con wrap-around (roll circular). */
export function nextRollIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (current + 1) % count;
}

/** Índice anterior con wrap-around (roll circular). */
export function prevRollIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (current - 1 + count) % count;
}

/** Deck por defecto: el mazo guardado si tiene 20; si no, fallback
 *  determinista con las primeras cartas compatibles (nunca aleatorio). */
export function defaultJointDeck(characterId: string, fallbackDeck: number[]): number[] {
  if (fallbackDeck.length === DECK_SIZE) return [...fallbackDeck];
  const out: number[] = [];
  const seen = new Set<number>();
  for (let id = 1; id <= 125 && out.length < DECK_SIZE; id++) {
    const card = getCard(id);
    if (!card || seen.has(id)) continue;
    if (cardUsableByCharacter(card, characterId) && card.type !== 'command' && card.type !== 'special') {
      out.push(id);
      seen.add(id);
    }
  }
  let id = 1;
  while (out.length < DECK_SIZE) {
    const card = getCard(id);
    if (card && !seen.has(id)) { out.push(id); seen.add(id); }
    id++;
  }
  return out;
}

/** Miembro por defecto (personaje + forma base + loadout + deck). */
export function makeMember(characterId: string, formId: string, fallbackDeck: number[]): TeamMember {
  const defs = getLimitLoadoutDefinition(characterId);
  return {
    characterId,
    formId,
    limits: normalizeLoadout(characterId, defs),
    jointDeck: defaultJointDeck(characterId, fallbackDeck),
  };
}

/** Limpia EXPLÍCITAMENTE los limits incompatibles al cambiar personaje/forma
 *  (nunca sustitución oculta — el slot queda 0 = EMPTY visible). */
export function cleanLimitsFor(characterId: string, limits: number[]): number[] {
  const cap = getLimitCapacity(characterId);
  const out: number[] = [];
  for (let i = 0; i < cap; i++) {
    const id = limits[i] ?? 0;
    if (id !== 0) {
      const card = getCard(id);
      if (card && cardUsableByCharacter(card, characterId)) { out.push(id); continue; }
    }
    out.push(0);
  }
  return out;
}

/** ¿La forma es la base del personaje? (para el chibi del roll). */
export function baseFormIdOf(characterId: string): string {
  return getCharacter(characterId)?.forms[0] ?? getForm(characterId)?.id ?? characterId;
}

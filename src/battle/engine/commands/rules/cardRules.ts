// ═══════════════════════════════════════════════════════════════════════
// M2 — rules/cardRules: legalidad de cartas (mano, compatibilidad, fase).
// ═══════════════════════════════════════════════════════════════════════
// Fuente de verdad: canPlayInAttack + cardUsableBy + costes (main.tsx).
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef, CardType } from '../../../../data/cards';
import type { BattleSide, BattleState } from '../../state/BattleState';
import type { CommandCheck } from '../CommandResult';
import { ok, reject } from '../CommandResult';
import { hasCc } from './resourceRules';

/** ¿La carta está en la mano del combatiente? (por índice o por id) */
export function cardInHand(state: BattleState, side: BattleSide, handIndex: number): CardDef | null {
  const hand = (side === 'player' ? state.deck : state.eDeck).hand;
  return hand[handIndex] ?? null;
}

/** Compatibilidad personaje↔carta (chara) — misma regla que cardUsableBy. */
export function isCardCompatible(card: CardDef, characterId: string): boolean {
  if (!card.compatible || card.compatible.length === 0) return true;
  return card.compatible.includes(characterId);
}

/** ¿La carta es ofensiva (jugable en ATTACK PHASE)? — canPlayInAttack. */
export function isOffensiveCard(card: CardDef): boolean {
  return card.type === 'damage' || card.type === 'beam' || card.type === 'command' || card.type === 'special';
}

/** ¿La carta es defensiva/soporte (jugable en DEFENSE PHASE)? */
export function isDefensiveCard(card: CardDef): boolean {
  return card.type === 'support' || card.type === 'defense';
}

/** Regla completa de jugar carta en ataque: mano + CC + compatible + ofensiva. */
export function canPlayCard(state: BattleState, side: BattleSide, handIndex: number, characterId: string): CommandCheck {
  const card = cardInHand(state, side, handIndex);
  if (!card) return reject('CARD_NOT_IN_HAND');
  if (!isOffensiveCard(card)) return reject('WRONG_PHASE');
  if (!isCardCompatible(card, characterId)) return reject('CARD_NOT_COMPATIBLE');
  return hasCc(state, side, card.cc);
}

/** Regla completa de carta defensiva: mano + CC + compatible + defensiva.
 *  M8.C2a: SOLO UNA elección por ventana defensiva. */
export function canPlayDefenseCard(state: BattleState, side: BattleSide, handIndex: number, characterId: string): CommandCheck {
  const card = cardInHand(state, side, handIndex);
  if (!card) return reject('CARD_NOT_IN_HAND');
  if (!isDefensiveCard(card)) return reject('WRONG_PHASE');
  if (!isCardCompatible(card, characterId)) return reject('CARD_NOT_COMPATIBLE');
  if (side === 'player' && state.defenseChoice !== null) return reject('DEFENSE_ALREADY_COMMITTED');
  return hasCc(state, side, card.cc);
}

export type { CardDef, CardType };

// ═══════════════════════════════════════════════════════════════════════
// BATTLE STATE — reglas PURAS del combate LSW (fuente única de verdad).
// Compartido por el juego real (main.tsx) y el HUD Studio (hud.tsx):
// si cambias una regla aquí, ambos cambian. Nada de mocks paralelos.
//
// Manual GBC (GameFAQs):
//  - El mazo Joint se baraja UNA vez al iniciar el combate.
//  - Mano inicial: 3 cartas. drawPile = 17.
//  - Cada ATTACK PHASE: +3 CC y se roba 1 carta Joint del drawPile.
//  - Las Joint usadas van al DISCARD PILE (consumibles).
//  - Las Limit son reutilizables (no pasan por el descarte Joint).
//  - Transitoriamente puede haber 6 cartas en mano; si al resolver la
//    acción quedan >5, el jugador DEBE elegir cuál descartar (nunca
//    se descarta automáticamente).
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../data/cards';

export interface JointDeckState {
  /** Cartas por robar (mazo). Al agotarse, se rebaraja el descarte. */
  drawPile: CardDef[];
  /** Mano actual: máx 5 persistente, 6 transitorio durante el turno. */
  hand: CardDef[];
  /** Joint usadas/descartadas (consumibles). */
  discardPile: CardDef[];
}

export const HAND_INITIAL = 3;
export const HAND_MAX_PERSISTENT = 5;
export const HAND_MAX_TRANSITORY = 6;
export const CC_GAIN_PER_ATTACK_PHASE = 3;

/** RNG determinista (mulberry32) para seeds reproducibles (HUD Studio). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CreateBattleDeckOptions {
  /** Semilla opcional para shuffle determinista (demo). */
  seed?: number;
  /** Filtro de compatibilidad con el personaje activo. */
  usable?: (c: CardDef) => boolean;
}

/**
 * Crea el estado REAL del mazo: baraja UNA vez, roba 3 para la mano
 * inicial y deja el resto como drawPile. Nunca vuelve a sortear el
 * deck original.
 */
export function createBattleDeck(
  deckIds: (string | number | CardDef)[],
  opts: CreateBattleDeckOptions = {},
): JointDeckState {
  const { seed, usable } = opts;
  const rng = seed !== undefined ? seededRng(seed) : Math.random;
  // Resolver cartas (ids numéricos/string o CardDef directos)
  const cards: CardDef[] = deckIds
    .map(id => (typeof id === 'object' && id !== null ? id : findCardById(id as string | number)))
    .filter((c): c is CardDef => !!c && (!usable || usable(c)));
  const shuffled = shuffle(cards, rng);
  return {
    hand: shuffled.slice(0, HAND_INITIAL),
    drawPile: shuffled.slice(HAND_INITIAL),
    discardPile: [],
  };
}

/**
 * Roba 1 carta del drawPile (Attack Phase). Si el drawPile está vacío,
 * se rebaraja el descarte (ciclo del mazo). Devuelve el nuevo estado y
 * la carta robada (o null si no hay ninguna carta posible).
 */
export function drawOne(state: JointDeckState, seed?: number): { state: JointDeckState; card: CardDef | null } {
  let { drawPile, hand, discardPile } = state;
  if (drawPile.length === 0) {
    if (discardPile.length === 0) return { state, card: null };
    drawPile = shuffle(discardPile, seed !== undefined ? seededRng(seed) : Math.random);
    discardPile = [];
  }
  const card = drawPile[0];
  if (!card) return { state, card: null };
  drawPile = drawPile.slice(1);
  if (hand.length >= HAND_MAX_TRANSITORY) {
    // Mano llena (6): la carta robada va directamente al descarte
    // (no se puede tener más de 6 transitoriamente).
    discardPile = [...discardPile, card];
    return { state: { drawPile, hand, discardPile }, card: null };
  }
  return { state: { drawPile, hand: [...hand, card], discardPile }, card };
}

/** Usa una Joint de la mano: sale de `hand` y entra en `discardPile`. */
export function playJoint(state: JointDeckState, idx: number): JointDeckState {
  const card = state.hand[idx];
  if (!card) return state;
  return {
    drawPile: state.drawPile,
    hand: state.hand.filter((_, i) => i !== idx),
    discardPile: [...state.discardPile, card],
  };
}

/** Descarte voluntario (HAND_CHECK / DISCARD_REQUIRED): elige 1 carta. */
export function discardOne(state: JointDeckState, idx: number): JointDeckState {
  const card = state.hand[idx];
  if (!card) return state;
  return {
    drawPile: state.drawPile,
    hand: state.hand.filter((_, i) => i !== idx),
    discardPile: [...state.discardPile, card],
  };
}

/** ¿Hay que descartar? (más de 5 cartas persistente tras la acción). */
export function needsDiscard(state: JointDeckState): boolean {
  return state.hand.length > HAND_MAX_PERSISTENT;
}

// ── Resolución de cartas por id (evita dependencia circular con cards.ts) ──
let cardResolver: ((id: string | number) => CardDef | undefined) | null = null;
export function registerCardResolver(fn: (id: string | number) => CardDef | undefined): void {
  cardResolver = fn;
}
function findCardById(id: string | number): CardDef | undefined {
  return cardResolver ? cardResolver(id) : undefined;
}

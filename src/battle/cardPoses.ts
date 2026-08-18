// ═══════════════════════════════════════════════════════════
// CARD → POSE — CANON COMPARTIDO (runtime + Dev Studio)
// Fuente única de verdad: qué pose de combate dispara cada carta,
// y qué personaje puede usar cada carta. main.tsx y Character
// Studio consumen ESTE módulo para que no puedan divergir.
// ═══════════════════════════════════════════════════════════
import type { CardDef, CardEffect } from '../data/cards';
import type { BattleSpritePose } from './spriteConfig';

/** Efectos de soporte OFENSIVOS: golpe/daño con animación de ataque. */
export const OFFENSIVE_SUPPORT_EFFECTS = new Set<CardEffect>([
  'life_drain', 'knockdown_dmg', 'knockdown_min', 'gamebomb', 'candy',
  'naughty_book', 'ohko_lowacc', 'android_kill', 'damage',
]);

/** Efectos DEFENSIVOS: esquivar/reducir/absorber → pose de guardia. */
export const DEFENSIVE_EFFECTS = new Set<CardEffect>([
  'avoid_beam', 'avoid_damage', 'avoid_damage_taiyoken', 'reduce_damage',
  'absorb_beam', 'beam_shield', 'damage_shield', 'command_cancel',
]);

/**
 * Compatibilidad de carta por personaje (campo `compatible` de la ROM):
 * undefined/[] = todos los luchadores; si lista, solo esos personajes.
 * `notCompatible` = lista EXCLUIDA (el resto puede usarla) — p.ej. Stop
 * Device no lo pueden usar los androides (Users=43/48 de la tabla ROM).
 */
export function cardUsableBy(card: CardDef, charId: string): boolean {
  if (card.compatible && card.compatible.length > 0 && !card.compatible.includes(charId)) return false;
  if (card.notCompatible && card.notCompatible.includes(charId)) return false;
  return true;
}

/**
 * Pose de combate que dispara una carta (canon cinematográfico):
 * - beam        → beam_charge en el campo / beam_fire en el efecto (rayo)
 * - damage/command → attack_fwd (golpe físico)
 * - defense o efecto defensivo → guard
 * - soporte ofensivo → attack_fwd
 * - resto (soporte/power) → gather_power (carga de ki)
 */
export function cardBattlePose(card: CardDef, context: 'field' | 'fx' = 'field'): BattleSpritePose {
  if (card.type === 'beam') return context === 'fx' ? 'beam_fire' : 'beam_charge';
  if (card.type === 'damage' || card.type === 'command') return 'attack_fwd';
  if (card.type === 'defense' || DEFENSIVE_EFFECTS.has(card.effect)) return 'guard';
  if (OFFENSIVE_SUPPORT_EFFECTS.has(card.effect)) return 'attack_fwd';
  return 'gather_power';
}

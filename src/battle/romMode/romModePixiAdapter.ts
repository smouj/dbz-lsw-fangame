// ═══════════════════════════════════════════════════════════════════════
// ROM MODE (spike) — romModePixiAdapter
// ═══════════════════════════════════════════════════════════════════════
// Puente final: traduce una RomModePixiLayout (posiciones leídas del OAM de la
// ROM) a llamadas de la API que YA existe en la presentación Pixi.
//
// NO reimplementa render: usa `setActionObjectPosition(slot, x, y)`. El
// reparto es intencionado — la ROM decide DÓNDE están los luchadores; nuestra
// presentación decide cómo se ven.
//
// La parte que se verifica es la PURA (`layoutToSlotCalls`): qué slot recibe
// qué coordenada. El envío al target se prueba con un spy.
// ═══════════════════════════════════════════════════════════════════════

import type { RomModePixiLayout } from './romModePixiLayout';

/** Slots de ActionObject de la presentación (orden canónico). */
export const ROM_MODE_SLOT: Record<'ally' | 'enemy', 0 | 1> = { ally: 0, enemy: 1 };

export interface RomModeSlotCall {
  slot: 0 | 1;
  x: number;
  y: number;
  role: 'ally' | 'enemy';
}

/**
 * Traducción pura layout → llamadas de posición. El slot izquierdo (ally) va a
 * slot 0 y el derecho (enemy) a slot 1, conservando las coordenadas del OAM.
 */
export function layoutToSlotCalls(layout: RomModePixiLayout): RomModeSlotCall[] {
  return layout.nodes.map((n) => ({
    slot: ROM_MODE_SLOT[n.role],
    x: n.x,
    y: n.y,
    role: n.role,
  }));
}

/** API mínima que necesitamos del target (subconjunto de PixiBattlePresentation). */
export interface RomModePixiTarget {
  setActionObjectPosition(slot: 0 | 1, x: number, y: number): void;
}

export interface ApplyRomModeResult {
  applied: number;
  slots: (0 | 1)[];
}

/** Aplica el layout al target. Idempotente: mismas llamadas para mismo layout. */
export function applyRomModeLayout(target: RomModePixiTarget, layout: RomModePixiLayout): ApplyRomModeResult {
  const calls = layoutToSlotCalls(layout);
  for (const c of calls) target.setActionObjectPosition(c.slot, c.x, c.y);
  return { applied: calls.length, slots: calls.map((c) => c.slot) };
}

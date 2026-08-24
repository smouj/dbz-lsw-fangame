// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§300-302) — compare-traces: verificación cross-trace.
// La promoción a ROM_DYNAMIC_VERIFIED exige confirmación en VARIOS traces
// (CROSS_TRACE_CONFIRMED) con la misma variable controlada (§283/§302).
// ═══════════════════════════════════════════════════════════════════════

import type { RomActionTrace } from './trace-schema';

/** Compara dos traces y reporta si son del mismo handler/worker. */
export function sameHandler(a: RomActionTrace, b: RomActionTrace): boolean {
  return a.meta.workerBank === b.meta.workerBank && a.meta.workerAddress === b.meta.workerAddress;
}

/** ¿Un par de traces es un differential válido? (§283: una variable cada vez). */
export function isValidDifferentialPair(a: RomActionTrace, b: RomActionTrace, axis: 'ORIENTATION' | 'OUTCOME'): boolean {
  if (!sameHandler(a, b)) return false;
  if (a.meta.source.romSha256 !== b.meta.source.romSha256) return false;
  if (a.meta.attackerForm !== b.meta.attackerForm) return false;
  if (a.meta.defenderForm !== b.meta.defenderForm) return false;
  if (axis === 'ORIENTATION') {
    // misma carta/outcome, lado distinto
    return a.meta.cardId === b.meta.cardId
      && a.meta.expectedOutcome === b.meta.expectedOutcome
      && a.meta.attackerSide !== b.meta.attackerSide;
  }
  if (axis === 'OUTCOME') {
    // misma carta/lado, outcome distinto
    return a.meta.cardId === b.meta.cardId
      && a.meta.attackerSide === b.meta.attackerSide
      && a.meta.expectedOutcome !== b.meta.expectedOutcome;
  }
  return false;
}

/**
 * Promoción de un dato (§302):
 *   PENDING_ROM_TRACE → TRACE_CAPTURED → FIELD_CANDIDATE
 *   → CROSS_TRACE_CONFIRMED → ROM_DYNAMIC_VERIFIED
 */
export type PromotionState =
  | 'PENDING_ROM_TRACE'
  | 'TRACE_CAPTURED'
  | 'FIELD_CANDIDATE'
  | 'CROSS_TRACE_CONFIRMED'
  | 'ROM_DYNAMIC_VERIFIED';

export function nextPromotion(state: PromotionState): PromotionState {
  const order: PromotionState[] = [
    'PENDING_ROM_TRACE', 'TRACE_CAPTURED', 'FIELD_CANDIDATE',
    'CROSS_TRACE_CONFIRMED', 'ROM_DYNAMIC_VERIFIED',
  ];
  const idx = order.indexOf(state);
  if (idx === -1 || idx === order.length - 1) return state;
  return order[idx + 1];
}

/** Un dato solo puede entrar en los catálogos canónicos en el último estado. */
export function isCanonical(promotion: PromotionState): boolean {
  return promotion === 'ROM_DYNAMIC_VERIFIED';
}

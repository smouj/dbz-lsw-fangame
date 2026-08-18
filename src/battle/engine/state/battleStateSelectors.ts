// ═══════════════════════════════════════════════════════════════════════
// M1 — battleStateSelectors: todo lo DERIVABLE se calcula aquí.
// ═══════════════════════════════════════════════════════════════════════
// Nada derivable se cachea en el estado (regla M1): estos selectores son
// la única vía de lectura derivada. Puros y sin efectos.
// ═══════════════════════════════════════════════════════════════════════

import {
  POSITION_DATA,
  isBeamVulnerable,
  isDamageVulnerable,
  resolveRelativeDistance,
} from '../../../data/positions';
import type { BattlePosition } from '../../../data/positions';
import type { CardDef } from '../../../data/cards';
import type { BattleSide, BattleState } from './BattleState';

/** Combatiente que ataca en el exchange actual (spec §1-2: primero el turnOwner). */
export function activeAttacker(state: BattleState): BattleSide {
  return state.exchange === 0 ? state.activeSide : (state.activeSide === 'player' ? 'enemy' : 'player');
}

/** Combatiente que defiende en el exchange actual. */
export function activeDefender(state: BattleState): BattleSide {
  return activeAttacker(state) === 'player' ? 'enemy' : 'player';
}

/** SPD efectiva (base + stages) — el orden del turno se recalcula solo al inicio. */
export function effectiveSpd(state: BattleState, side: BattleSide): number {
  const f = side === 'player' ? state.player : state.enemy;
  const stage = (side === 'player' ? state.pStages : state.eStages).spd;
  return f.spd + stage * 8;
}

/** Quién ataca primero según SPD efectiva (empate → decide activeSide/input). */
export function speedOrder(state: BattleState): BattleSide {
  const p = effectiveSpd(state, 'player');
  const e = effectiveSpd(state, 'enemy');
  return p === e ? state.activeSide : (p > e ? 'player' : 'enemy');
}

/** Posición táctica de un combatiente (vive en fighters — selector de lectura). */
export function positionOf(state: BattleState, side: BattleSide): BattlePosition {
  return (side === 'player' ? state.player : state.enemy).battlePos;
}

/** Distancia relativa derivada de AMBAS posiciones (nunca almacenada). */
export function relativeDistance(state: BattleState): ReturnType<typeof resolveRelativeDistance> {
  return resolveRelativeDistance(positionOf(state, 'player'), positionOf(state, 'enemy'));
}

/** Vulnerabilidad de una posición a beam/damage (derivada, spec). */
export function isVulnerable(pos: BattlePosition, cardType: CardDef['type']): boolean {
  if (cardType === 'beam') return isBeamVulnerable(pos);
  if (cardType === 'damage') return isDamageVulnerable(pos);
  return false;
}

/** Altitud/depth legibles (derivadas de POSITION_DATA). */
export function altitudeOf(state: BattleState, side: BattleSide): 'AIR' | 'GROUND' {
  return POSITION_DATA[positionOf(state, side)].altitude;
}

export function depthOf(state: BattleState, side: BattleSide): 'BACK' | 'FRONT' {
  return POSITION_DATA[positionOf(state, side)].depth;
}

/** CC actual de un combatiente. */
export function ccOf(state: BattleState, side: BattleSide): number {
  return (side === 'player' ? state.player : state.enemy).cc;
}

/** HP actual / máx de un combatiente. */
export function hpOf(state: BattleState, side: BattleSide): { hp: number; maxHp: number } {
  const f = side === 'player' ? state.player : state.enemy;
  return { hp: f.hp, maxHp: f.maxHp };
}

/** Mano visible (derivable del mazo). */
export function handOf(state: BattleState, side: BattleSide): CardDef[] {
  return (side === 'player' ? state.deck : state.eDeck).hand;
}

/** Estado del QTE (solo lectura — el motor lo gobierna en M7). */
export function qteOf(state: BattleState) {
  return state.stageQte;
}

/** M8.C2a — ¿defensa comprometida? (choice !== null). Solo esto abre la
 *  resolución del atacante: la fase 'defend' sin choice espera input real,
 *  indefinidamente. La presentación consulta este selector — nunca deduce
 *  la elección de flags sueltos (guard=true ⇒ GUARD, etc.). */
export function isDefenseCommitted(state: BattleState): boolean {
  return state.defenseChoice !== null;
}

/** M8.C2a — elección defensiva actual (null = AWAITING_INPUT). */
export function defenseChoiceOf(state: BattleState): BattleState['defenseChoice'] {
  return state.defenseChoice;
}

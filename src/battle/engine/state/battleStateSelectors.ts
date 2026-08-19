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

/** Lado con iniciativa del turno (activeSide = turnOwner marcado con *).
 *  M8.C2a — la iniciativa es la ÚNICA fuente del orden: exchange 0 ataca
 *  la iniciativa, exchange 1 el opuesto. La fase NUNCA decide el lado. */
export function initiativeSide(state: BattleState): BattleSide {
  return state.activeSide;
}

// ─── P0: FRONTERAS DE CONTROL DEL JUGADOR (contrato único) ───
// El combate JAMÁS atraviesa una decisión humana automáticamente. El
// orquestador consulta getControlBoundary para saber DÓNDE debe pararse:
//   PLAYER_ATTACK_CHOICE   → espera una decisión de ataque (BattleCommand)
//   PLAYER_DEFENSE_CHOICE  → espera GUARD/MOVE/carta defensiva
//   ACTION_INPUT           → espera el input de la ACCIÓN en curso (ej.
//                            QTE Stage / counter) — el input pertenece a
//                            la acción, no a una fase del turno
//   RESOLVING              → resolución ya comprometida (automática OK)
//   NONE                   → sin control del jugador (win/lose/discard)
// Regla: en las tres primeras, ningún gameplay avanza sin BattleCommand.
export type ControlBoundary =
  | 'PLAYER_ATTACK_CHOICE'
  | 'PLAYER_DEFENSE_CHOICE'
  | 'ACTION_INPUT'
  | 'RESOLVING'
  | 'NONE';

// ─── EJECUCIÓN DE UNA ACCIÓN (contrato: toda acción elegida pasa por su
// ejecución; la preparación es parte de la acción, no una fase del turno) ───
//   IDLE          → sin acción en ejecución
//   PREPARING     → cinematografía de preparación (NO inputs, NO timer)
//   WAITING_INPUT → ventana interactiva de la acción (solo entonces inputs)
//   RESOLVING     → resolución ya comprometida (golpes/daño/FX)
//   COMPLETE      → acción terminada (a la espera del fin de exchange)
// No todas las acciones pasan por todos los estados: una acción sin input
// va PREPARING → RESOLVING → COMPLETE; el Stage va PREPARING →
// WAITING_INPUT → RESOLVING → COMPLETE.
export type ActionExecutionState =
  | 'IDLE' | 'PREPARING' | 'WAITING_INPUT' | 'RESOLVING' | 'COMPLETE';

/** Estado de ejecución de la acción actual, derivado del reloj QTE (la
 *  fuente autoritativa: el Engine abre WAITING_INPUT en inputOpenTick, la
 *  presentación solo representa). El input NUNCA aparece durante PREPARING. */
export function getActionExecution(state: BattleState): ActionExecutionState {
  const q = state.stageQte;
  switch (q.state) {
    case 'PREPARING': return 'PREPARING';
    case 'INPUT_WINDOW':
    case 'COUNTER_WINDOW': return 'WAITING_INPUT';
    case 'COMPLETED': return 'COMPLETE';
    default: return 'IDLE';
  }
}

export function getControlBoundary(state: BattleState): ControlBoundary {
  // ACTION_INPUT: ventana interactiva de la acción abierta (el reloj puede
  // expirar — timeout es parte del contrato; los inputs del jugador mandan).
  if (getActionExecution(state) === 'WAITING_INPUT') return 'ACTION_INPUT';
  // PLAYER_DEFENSE_CHOICE: ventana defensiva abierta esperando elección.
  // (La espera es INDEFINIDA — el reloj no expira la elección: la defensa
  // no tiene QTE; solo el orquestador la cierra con un comando.)
  if (state.phase === 'defend' && state.defenseState === 'AWAITING_CHOICE') return 'PLAYER_DEFENSE_CHOICE';
  // PLAYER_ATTACK_CHOICE: subfases de selección de ataque del jugador.
  if (state.phase === 'command' || state.phase === 'basic'
    || state.phase === 'cardSelect' || state.phase === 'limitSelect') return 'PLAYER_ATTACK_CHOICE';
  if (state.phase === 'win' || state.phase === 'lose') return 'NONE';
  return 'RESOLVING';
}

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
  // M8.C2a — COMMITTED explícito (fallback por elección para compat).
  return state.defenseState === 'COMMITTED' || state.defenseChoice !== null;
}

/** M8.C2a — estado defensivo actual (NONE/AWAITING_CHOICE/COMMITTED). */
export function defenseStateOf(state: BattleState): BattleState['defenseState'] {
  return state.defenseState;
}

/** M8.C2a — elección defensiva actual (null = AWAITING_CHOICE). */
export function defenseChoiceOf(state: BattleState): BattleState['defenseChoice'] {
  return state.defenseChoice;
}

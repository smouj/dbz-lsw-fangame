// ═══════════════════════════════════════════════════════════════════════
// M3/M4/M5 — reduceAcceptedCommand: resuelve un comando YA validado.
// ═══════════════════════════════════════════════════════════════════════
// Asume legalidad (executeCommand llama a canExecute antes). Cada dominio
// resuelve su semántica en su reducer — el dispatcher solo enruta.
// PURA: devuelve un NUEVO estado; jamás muta el input. Sin reloj de pared,
// sin presentación. El RNG (M5) avanza SOLO donde hay tirada real y se
// devuelve en el estado (state.rngState) — nunca por efectos laterales.
//
// M4 — devuelve también los EVENTOS de la resolución, en orden contractual:
//   1) eventos de dominio en orden de mutación (CC → carta → acción)
//   2) ACTION_STARTED cuando una acción comienza
//   3) resolución de daño (ATTACK_HIT/MISSED → DAMAGE_APPLIED → FIGHTER_DEFEATED)
//   4) PHASE_CHANGED AL FINAL, solo si la fase cambió de verdad
// ═══════════════════════════════════════════════════════════════════════

import { getCard, type CardDef } from '../../../data/cards';
import { romStageSequenceFor, stageVariantFromTick, type StageLevel } from '../../stageSequences';
import { stageWindowsTicks } from '../../../config/gameplay.config';
import { STAGE_PREP_TICKS } from '../clock/clock';
import { POSITION_DATA } from '../../../data/positions';
import type { BattleCommand } from './BattleCommand';
import type { BattleEvent } from '../events/BattleEvent';
import type { BattleState } from '../state/BattleState';
import { speedOrder, isBattleTerminal } from '../state/battleStateSelectors';
import { moveFighter } from './reducers/movementReducer';
import { playCard, playDefenseCard, playLimitCard } from './reducers/cardReducer';
import { gatherPower, guard, qteCorrectInput, qteWrongInput, qteCounterContinue, qteCounterDefend, characterSwitchPowerWindow } from './reducers/powerReducer';
import { resolveCardAction, resolveCounterDamage, resolvePartialStageDamage, resolveStageCard, applyStagePoweredReposition } from './reducers/damageReducer';
import { actionDescriptorForCard, actionDescriptorForStage } from './buildActionDescriptor';

/** Nivel de Stage de una carta command (3/4/5/6) según su nombre (paridad legacy). */
function stageLevelOfCardName(name: string): StageLevel {
  if (name.includes('6')) return 6;
  if (name.includes('5')) return 5;
  if (name.includes('4')) return 4;
  return 3;
}

/** Ventana del QTE según profundidades (paridad legacy STAGE_SEQUENCE_WINDOW). */
function stageWindowTicksFor(state: BattleState): number {
  const aDepth = POSITION_DATA[state.player.battlePos].depth;
  const bDepth = POSITION_DATA[state.enemy.battlePos].depth;
  const w = stageWindowsTicks();
  const pair = `${aDepth}_${bDepth}` as 'BACK_BACK' | 'BACK_FRONT' | 'FRONT_BACK' | 'FRONT_FRONT';
  return w[pair];
}

/** Crea el QTE de una carta: seq del pool (determinista por tick) + ventana. */
function qteForCard(state: BattleState, card: CardDef): BattleState['stageQte'] {
  const level = stageLevelOfCardName(card.name);
  const seq = romStageSequenceFor(level, stageVariantFromTick(state.tick));
  const windowTicks = stageWindowTicksFor(state);
  // M8.B: el QTE nace en PREPARING; el reloj abre INPUT_WINDOW en
  // inputOpenTick (= último idle de la preparación). El cronómetro de la
  // secuencia NO corre durante la preparación (deadline = inputOpen + ventana).
  return {
    state: 'PREPARING', seq, idx: 0, correct: 0, repaired: 0, card,
    startedTick: state.tick, inputOpenTick: state.tick + STAGE_PREP_TICKS,
    deadlineTick: state.tick + STAGE_PREP_TICKS + windowTicks, windowTicks,
    counterStartTick: 0, counterDeadlineTick: 0, result: null,
  };
}

export interface ReductionOutcome {
  state: BattleState;
  events: BattleEvent[];
}

export function reduceAcceptedCommand(state: BattleState, command: BattleCommand): ReductionOutcome {
  // PA8 — combate terminal: ningún reducer acepta comandos post-KO
  // (defensa en profundidad; canExecute ya rechaza con BATTLE_TERMINAL).
  if (isBattleTerminal(state)) {
    return { state, events: [{ type: 'COMMAND_REJECTED', command, reason: 'BATTLE_TERMINAL' }] };
  }
  let next: BattleState = state;
  let events: BattleEvent[] = [];

  switch (command.type) {
    // ── command-strip: transiciones de fase deterministas ──
    case 'LIMIT':
      next = { ...state, phase: 'limitSelect' };
      break;
    case 'JOINT':
      next = { ...state, phase: 'cardSelect' };
      break;
    case 'BASIC':
      next = { ...state, phase: 'basic' };
      break;
    case 'CHARACTER_ACTION': {
      // M8.CHARA — programa el swap diferido (sin mutar el miembro activo).
      const side = command.side ?? 'player';
      const cw = characterSwitchPowerWindow(state, side);
      next = cw.state;
      events = cw.events;
      break;
    }

    // ── mano ──
    case 'SELECT_CARD':
      next = { ...state, selectedCard: command.handIndex };
      events = [{ type: 'CARD_SELECTED', side: 'player', handIndex: command.handIndex }];
      break;
    case 'PLAY_CARD': {
      const card = state.deck.hand[command.handIndex] ?? null;
      const r = playCard(state, 'player', command.handIndex);
      if (card && card.type === 'command') {
        // M8.C2 — SOLO las cartas command (Stage Attack) llevan QTE:
        // preparación de 60t (stage_ready_*) + ventana de inputs. Las
        // cartas damage/beam/support se resuelven INMEDIATAMENTE (la
        // precisión con el PRNG canónico — ver abajo).
        const qte = qteForCard(r.state, card);
        next = { ...r.state, phase: 'stageInput', selectedCard: null, stageQte: qte };
        events = [
          ...r.events,
          { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForCard(card) },
          { type: 'STAGE_PREP_STARTED', side: 'player', level: stageLevelOfCardName(card.name), seq: qte.seq, prepTicks: STAGE_PREP_TICKS },
        ];
      } else if (card) {
        // M8.C2 — Melee/beam/support: resolución INMEDIATA (sin QTE).
        // El daño/precisión los resuelve el Engine (PRNG canónico M5);
        // la presentación solo recibe el EventLog.
        const resolution = resolveCardAction(r.state, 'player', card);
        next = {
          ...resolution.state,
          rngState: resolution.rngState,
          selectedCard: null,
          // El QTE queda limpio: estas cartas no abren ventana.
          stageQte: { ...r.state.stageQte, state: 'WAITING' as const },
        };
        events = [
          ...r.events,
          { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForCard(card) },
          ...resolution.events,
          { type: 'ACTION_RESOLVED', side: 'player', action: actionDescriptorForCard(card) },
        ];
      } else {
        next = r.state;
        events = r.events;
      }
      break;
    }
    case 'PLAY_LIMIT_CARD': {
      const card = getCard(command.cardId) ?? null;
      const r = playLimitCard(state, 'player', command.cardId);
      if (state.phase === 'defend') {
        // Defense LIMIT usa la misma carta equipada reutilizable: paga CC y
        // compromete la defensa como CARD, pero NO descarta ni compacta mano.
        next = { ...r.state, defenseState: 'COMMITTED', defenseChoice: { type: 'CARD', cardId: r.cardId } };
        events = [
          { type: 'DEFENSE_COMMITTED', side: 'player', choice: { type: 'CARD', cardId: r.cardId } },
          ...r.events,
        ];
      } else {
        next = { ...r.state, phase: 'stageInput' };
        events = [
          ...r.events,
          ...(card ? [{ type: 'ACTION_STARTED' as const, side: 'player' as const, action: actionDescriptorForCard(card) }] : []),
        ];
      }
      break;
    }

    // ── BASIC ──
    case 'BASIC_STAGE_ATTACK': {
      // Nivel del stage: 3 sin power window · 4 con window (ROM §100)
      const level: 3 | 4 = state.player.powerWindowCounter > 0 ? 4 : 3;
      const seq = romStageSequenceFor(level, stageVariantFromTick(state.tick));
      const windowTicks = stageWindowTicksFor(state);
      // M8.B: el Stage nace en PREPARING — QTE_STARTED lo emite el RELOJ al
      // alcanzar inputOpenTick (nunca al confirmar la acción).
      next = {
        ...state,
        phase: 'stageInput',
        stageQte: {
          state: 'PREPARING', seq, idx: 0, correct: 0, repaired: 0, card: null,
          startedTick: state.tick, inputOpenTick: state.tick + STAGE_PREP_TICKS,
          deadlineTick: state.tick + STAGE_PREP_TICKS + windowTicks, windowTicks,
          counterStartTick: 0, counterDeadlineTick: 0, result: null,
        },
      };
      events = [
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForStage(level) },
        { type: 'STAGE_PREP_STARTED', side: 'player', level, seq, prepTicks: STAGE_PREP_TICKS },
      ];
      break;
    }
    case 'GATHER_POWER': {
      const r = gatherPower(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }

    // ── defensa ──
    case 'DEFENSE_LIMIT':
    case 'DEFENSE_JOINT':
    case 'DEFENSE_BASIC':
      next = state; // navegación de menú (presentación); la fase no cambia
      break;
    case 'GUARD': {
      const r = guard(state, 'player');
      // M8.C2a — GUARD compromete la elección defensiva (autoritativa).
      // defenseState → COMMITTED → el atacante puede abrir su resolución.
      // La fase 'defend' sin elección (AWAITING_CHOICE) espera input
      // indefinidamente (contrato C2a: sin timers que autolancen al enemigo).
      // Orden del batch: DEFENSE_COMMITTED PRIMERO — la frontera defensiva
      // precede a los hechos derivados (GUARD_STARTED) en el timeline.
      next = { ...r.state, defenseState: 'COMMITTED', defenseChoice: { type: 'GUARD' } };
      events = [
        { type: 'DEFENSE_COMMITTED', side: 'player', choice: { type: 'GUARD' } },
        ...r.events,
      ];
      break;
    }
    case 'PLAY_DEFENSE_CARD': {
      const r = playDefenseCard(state, 'player', command.handIndex);
      // M8.C2a — la carta defensiva compromete la elección (CARD).
      next = { ...r.state, defenseState: 'COMMITTED', defenseChoice: { type: 'CARD', cardId: r.cardId } };
      events = [
        { type: 'DEFENSE_COMMITTED', side: 'player', choice: { type: 'CARD', cardId: r.cardId } },
        ...r.events,
      ];
      break;
    }
    case 'MOVE': {
      const r = moveFighter(state, 'player', command.axis);
      // M8.C2a — MOVE compromete la elección defensiva (MOVE + eje).
      // El Engine muta la posición táctica (autoridad); la presentación
      // NUNCA deriva BattlePosition de la animación (ver C2a §8).
      next = { ...r.state, defenseState: 'COMMITTED', defenseChoice: { type: 'MOVE', axis: command.axis } };
      events = [
        { type: 'DEFENSE_COMMITTED', side: 'player', choice: { type: 'MOVE', axis: command.axis } },
        ...r.events,
      ];
      break;
    }
    case 'RESET_DEFENSE': {
      // M8.C2a — abre ventana defensiva fresh: AWAITING_CHOICE (esperando
      // elección táctica del menú — NUNCA un QTE). Sin eventos: es una
      // primitiva de orquestación; la presentación reacciona a
      // DEFENSE_COMMITTED, no al reset. Idempotente.
      next = { ...state, defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      break;
    }
    case 'END_EXCHANGE': {
      // M8.C2a-L — TURN LIFECYCLE: transición autoritativa ÚNICA.
      //   exchange 0 → 1: mismo turno, MISMA iniciativa (el atacante del
      //   exchange 1 es el opuesto — activeAttacker lo deriva).
      //   exchange 1 → turn+1, exchange 0, iniciativa RECALCULADA por SPD
      //   efectiva (speedOrder: la iniciativa es del turno ACTUAL, nunca
      //   firstAttacker fijo — el GBC reordena si Speed cambió).
      // El empate de SPD mantiene la iniciativa actual (determinista, sin
      // Math.random: el Engine es puro). La fase NO cambia aquí (la
      // proyección ATTACK/DEFENSE la hace el orquestador desde el estado).
      // Solo toca lifecycle: 0 mutaciones de CC/mano/HP/QTE.
      if (state.exchange === 0) {
        next = { ...state, exchange: 1 };
      } else {
        next = {
          ...state,
          turn: state.turn + 1,
          exchange: 0,
          activeSide: speedOrder(state),
        };
      }
      break;
    }

    // ── QTE / Stage Attack ──
    case 'QTE_INPUT': {
      const q = state.stageQte;
      const expected = q.seq[q.idx];
      if (expected === undefined || command.input === expected) {
        // Acierto (o secuencia vacía): avanza / completa
        const r = qteCorrectInput(state, 'player', command.input);
        next = r.state;
        events = r.events;
        if (r.completed) {
          const level: 3 | 4 = state.stageQte.seq.length === 4 ? 4 : 3;
          // M5: al completar el Stage, la acción de la carta se RESUELVE
          // (command → daño determinista · damage/beam → precisión/evasión
          // con el PRNG canónico · support → efectos deterministas).
          const cardResolved = q.card ?? resolveStageCard(state, q.seq.length);
          const resolution = resolveCardAction(r.state, 'player', cardResolved);
          next = { ...resolution.state, rngState: resolution.rngState };
          events = [
            ...events,
            ...resolution.events,
            { type: 'ACTION_RESOLVED', side: 'player', action: actionDescriptorForStage(level) },
          ];
          // ROM §97-99: con power window activa, el prefijo resuelto del
          // Stage reposiciona al defensor (direccionales del prefijo).
          const reposition = applyStagePoweredReposition(next, 'player', q.seq, q.correct + q.repaired + 1);
          next = reposition.state;
          events = [...events, ...reposition.events];
        }
      } else {
        // M5: input equivocado → COUNTER_WINDOW (el GBC no rechaza: el
        // rival contraataca). Daño del counter en QTE_COUNTER_TIMEOUT.
        const r = qteWrongInput(state, 'player', command.input);
        next = r.state;
        events = r.events;
      }
      break;
    }
    case 'QTE_COUNTER_DEFEND': {
      // A = SAFE_ABORT: conserva CC, daño parcial del Stage según los
      // comandos RESUELTOS (ROM §93/§94: resolved = correct + repaired;
      // A finaliza con el progreso acumulado → resolvedCommandCount, no
      // una fracción). ROM §97-99: con power window activa, el prefijo
      // resuelto reposiciona al defensor (direccionales).
      const q = state.stageQte;
      const r = qteCounterDefend(state, 'player');
      next = r.state;
      events = r.events;
      const card = q.card ?? resolveStageCard(state, q.seq.length);
      const resolved = q.correct + q.repaired;
      const partial = resolvePartialStageDamage(next, 'player', card, resolved);
      next = partial.state;
      events = [...events, ...partial.events];
      const reposition = applyStagePoweredReposition(next, 'player', q.seq, resolved);
      next = reposition.state;
      events = [...events, ...reposition.events];
      break;
    }
    case 'QTE_COUNTER_CONTINUE': {
      // B = REPAIR (ROM §94): repara el comando fallado (cuenta como
      // resuelto, +1 CC) y continúa la secuencia con el timer GLOBAL
      // original. Si la reparación completa la secuencia (correct +
      // repaired == seq.length), la acción se RESUELVE igual que un
      // QTE completado.
      const q = state.stageQte;
      const r = qteCounterContinue(state, 'player');
      next = r.state;
      events = r.events;
      const q2 = next.stageQte;
      if (q2.correct + q2.repaired >= q2.seq.length && q2.seq.length > 0) {
        const level: 3 | 4 = q2.seq.length === 4 ? 4 : 3;
        const cardResolved = q.card ?? resolveStageCard(state, q.seq.length);
        const resolution = resolveCardAction(next, 'player', cardResolved);
        next = { ...resolution.state, rngState: resolution.rngState };
        events = [
          ...events,
          ...resolution.events,
          { type: 'QTE_COMPLETED', side: 'player', correct: q2.correct + q2.repaired, total: q2.seq.length, result: 'FULL_SUCCESS' },
          { type: 'ACTION_RESOLVED', side: 'player', action: actionDescriptorForStage(level) },
        ];
        const reposition = applyStagePoweredReposition(next, 'player', q2.seq, q2.correct + q2.repaired);
        next = reposition.state;
        events = [...events, ...reposition.events];
      }
      break;
    }
    default:
      next = state;
      break;
  }

  // PHASE_CHANGED al final, SOLO si la fase cambió de verdad
  // (contrato M4: el cambio de fase ocurre DESPUÉS de la resolución).
  if (next.phase !== state.phase) {
    events = [...events, { type: 'PHASE_CHANGED', from: state.phase, to: next.phase }];
  }

  return { state: next, events };
}

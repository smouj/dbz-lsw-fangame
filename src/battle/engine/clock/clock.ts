// ═══════════════════════════════════════════════════════════════════════
// M6 — GBC CLOCK: el tiempo lógico del BattleEngine.
// ═══════════════════════════════════════════════════════════════════════
// REGLAS (contrato M6):
//  - GBC_NATIVE_FPS (src/config/gameplay.config.ts) es la ÚNICA fuente
//    temporal canónica. state.tick = entero, monotónico, autoritativo.
//  - El tiempo NO es un BattleCommand (nada de TICK/WAIT/TIMEOUT): la
//    evolución temporal es advanceBattleClock(state, ticks) — pura, igual
//    que executeCommand pero representando tiempo, no intención.
//  - Cero Date.now/performance.now/setTimeout/setInterval/requestAnimationFrame
//    dentro del Engine. El adaptador real→GBC vive FUERA (GbcClockAdapter).
//  - El BattleState NO almacena fracciones temporales: el sobrante de
//    deltaMs pertenece al adaptador, nunca al estado.
//
// VENTANAS (QTE / COUNTER) — regla de borde CONTRACTUAL:
//    currentTick <  deadlineTick → ventana abierta
//    currentTick >= deadlineTick → timeout (exactamente UNA vez)
//  Cubierto: deadline−1 (abierta) · deadline (timeout) · deadline+1 (ya
//  transicionado — sin segundo timeout). advance(N) ≡ advance(1) × N:
//  el bucle interno procesa tick a tick, así ningún timeout se pierde
//  aunque el render avance a ráfagas o vaya lento.
// ═══════════════════════════════════════════════════════════════════════

import { GAMEPLAY_CONFIG } from '../../../config/gameplay.config';
const GBC_FPS = GAMEPLAY_CONFIG.gbcNativeFps;
import type { BattleEvent } from '../events/BattleEvent';
import type { BattleSide, BattleState } from '../state/BattleState';
import { resolveCounterDamage, resolveStageCard } from '../commands/reducers/damageReducer';

/** Ventana del contraataque (paridad legacy COUNTER_A_FRAMES ≈ 0.4s). */
export const COUNTER_WINDOW_TICKS = Math.round(0.4 * GBC_FPS);

// ═══ PREPARACIÓN del Stage (M8.B — contrato canónico) ═══
// Tras confirmar la acción: fade → ACTION → idle → estira brazos → encoge
// brazos → idle. En el ÚLTIMO idle (inputOpenTick) el Engine abre la
// ventana de inputs. Los ticks son INFERRED (perfil provisional hasta la
// pasada FRAME_VERIFIED sobre la ROM) — nunca setTimeout.
export const STAGE_PREP_TICKS = 60;

/** Beats de la preparación (frame relativo → pose canónica V9). */
export const STAGE_PREP_BEATS: Array<{ frame: number; pose: string }> = [
  { frame: 0, pose: 'idle' },          // idle inicial
  { frame: 12, pose: 'gather_power' }, // estira brazos (brazos arriba)
  { frame: 30, pose: 'beam_charge' },  // encoge brazos (manos juntas)
  { frame: 48, pose: 'idle' },         // último idle → INPUT_OPEN (60)
];

export const STAGE_PREP_FIDELITY = 'INFERRED' as const;

export interface ClockAdvanceOutcome {
  state: BattleState;
  events: BattleEvent[];
  /** Tick GBC en el que ocurrió CADA evento (misma longitud que events). */
  eventTicks: number[];
}

/**
 * Avanza el reloj N ticks GBC enteros. Puro: devuelve un NUEVO estado.
 * Internamente procesa tick a tick para que cada deadline dispare su
 * timeout exactamente una vez (advance(N) === advance(1) × N).
 * Sin ventana activa → avanza todo de golpe (mismo resultado).
 */
export function advanceBattleClock(state: BattleState, ticks: number): ClockAdvanceOutcome {
  const n = Math.floor(ticks);
  if (!(n > 0)) return { state, events: [], eventTicks: [] };
  let s = state;
  const events: BattleEvent[] = [];
  const eventTicks: number[] = [];
  let remaining = n;

  while (remaining > 0) {
    const q = s.stageQte;
    const activeDeadline =
      q.state === 'PREPARING' ? q.inputOpenTick
      : q.state === 'INPUT_WINDOW' ? q.deadlineTick
      : q.state === 'COUNTER_WINDOW' ? q.counterDeadlineTick
      : 0;

    if (activeDeadline <= 0) {
      // Sin ventana activa: el tiempo pasa sin hechos (bulk advance).
      s = { ...s, tick: s.tick + remaining };
      remaining = 0;
      break;
    }

    const nextTick = s.tick + 1;
    s = { ...s, tick: nextTick };
    remaining -= 1;
    const q2 = s.stageQte;

    if (q2.state === 'PREPARING' && nextTick >= q2.inputOpenTick) {
      // ⏱ Fin de la preparación (último idle): el Engine abre la ventana de
      // inputs — AQUÍ se emite QTE_STARTED (nunca al confirmar la acción).
      // El cronómetro GLOBAL de la secuencia empieza en este instante.
      const level = q2.seq.length >= 4 ? (q2.seq.length >= 5 ? 5 : 4) : 3;
      s = {
        ...s,
        stageQte: {
          ...q2, state: 'INPUT_WINDOW' as const,
          startedTick: nextTick,
          deadlineTick: nextTick + q2.windowTicks,
        },
      };
      events.push({ type: 'QTE_STARTED', side: 'player', level, seq: q2.seq, limitFrames: q2.windowTicks });
      eventTicks.push(nextTick);
    } else if (q2.state === 'INPUT_WINDOW' && nextTick >= q2.deadlineTick) {
      // ⏱ La ventana de inputs expiró → el rival contraataca (una vez).
      s = {
        ...s,
        stageQte: {
          ...q2, state: 'COUNTER_WINDOW' as const,
          counterDeadlineTick: nextTick + COUNTER_WINDOW_TICKS,
        },
      };
      events.push({ type: 'QTE_TIMEOUT', side: 'player', window: 'INPUT' });
      events.push({ type: 'QTE_COUNTER_STARTED', side: 'player' });
      eventTicks.push(nextTick, nextTick);
    } else if (q2.state === 'COUNTER_WINDOW' && nextTick >= q2.counterDeadlineTick) {
      // ⏱ El timing del contraataque expiró → el counter del rival conecta
      // sobre el jugador (fórmula legacy determinista — una sola vez).
      const card = q2.card ?? resolveStageCard(s, q2.seq.length);
      const counter = resolveCounterDamage(s, card.type);
      s = {
        ...counter.state,
        stageQte: { ...counter.state.stageQte, state: 'WAITING' as const },
      };
      const ticks = counter.events.map(() => nextTick);
      events.push(...counter.events, { type: 'QTE_COUNTER_RESOLVED', side: 'enemy', action: 'TIMEOUT' });
      eventTicks.push(...ticks, nextTick);
    }
  }

  return { state: s, events, eventTicks };
}
export { GBC_FPS };

// ═══════════════════════════════════════════════════════════════════════
// M7 — presentationScenarios: escenarios headless para el Adapter.
// Compartido entre Dev Studio (vista Timeline) y verify:presentation
// (golden fixtures). Cada escenario = seed + pasos (comandos y reloj) →
// EventLog determinista → buildPresentationTimeline.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleCommand } from '../battle/engine/commands/BattleCommand';
import { executeCommand } from '../battle/engine/commands/executeCommand';
import { advanceBattleClock } from '../battle/engine/clock';
import { createInitialBattleState } from '../battle/engine/state/createInitialBattleState';
import type { BattleState } from '../battle/engine/state/BattleState';
import { appendOutcomeToEventLog, emptyEventLog, type BattleEventLog } from '../battle/engine/events';
import { getCard, type CardDef } from '../data/cards';
import { BattlePosition } from '../data/positions';

export type ScenarioStep =
  | { kind: 'cmd'; command: BattleCommand; opts?: Parameters<typeof executeCommand>[2] }
  | { kind: 'ticks'; ticks: number }
  /** Completa el QTE con las teclas correctas de la secuencia actual. */
  | { kind: 'qte_complete' }
  /** Un solo input correcto (simula jugador lento intercalando ticks). */
  | { kind: 'qte_step' }
  /** M8.C2a — abre una ventana defensiva NUEVA (defenseChoice = null):
   *  simula el reset del orquestador entre exchanges. Sin esto, un segundo
   *  comando defensivo en la misma ventana es ilegal (UNA elección). */
  | { kind: 'reset_defense' }
  | { kind: 'qte_step' }
  /** Pulsa una tecla EQUIVOCADA (→ COUNTER_WINDOW). */
  | { kind: 'qte_wrong' };

export interface PresentationScenario {
  id: string;
  label: string;
  seed: number;
  /** Cartas en la mano del jugador (ids). */
  deck: number[];
  playerCc?: number;
  enemyHp?: number;
  playerPos?: string;
  enemyPos?: string;
  /** Fase inicial (default 'command'). */
  phase?: string;
  steps: ScenarioStep[];
}

export interface ScenarioRun {
  log: BattleEventLog;
  state: BattleState;
}

function deckOf(ids: number[]): { drawPile: CardDef[]; hand: CardDef[]; discardPile: CardDef[] } {
  const cards = ids.map(id => getCard(id)).filter((c): c is CardDef => !!c);
  return { drawPile: [], hand: cards, discardPile: [] };
}

const POS = (p: string): BattlePosition => (BattlePosition as unknown as Record<string, BattlePosition>)[p];

export const PRESENTATION_SCENARIOS: PresentationScenario[] = [
  {
    id: 'm7_stage_attack', label: 'Stage Attack completo (daño determinista)', seed: 4242,
    deck: [1, 5], playerCc: 0, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'qte_complete' },
    ],
  },
  {
    // M8.C test del contrato Stage: QTE lento (completa en tick 103) — la
    // resolución se ancla al resultado del QTE y NO a ACTION_STARTED.
    id: 'm7_stage_attack_slow103', label: 'Stage Attack QTE lento (completa @103)', seed: 4242,
    deck: [1, 5], playerCc: 0, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'qte_step' }, { kind: 'ticks', ticks: 21 },
      { kind: 'qte_step' }, { kind: 'ticks', ticks: 21 },
      { kind: 'qte_step' },
    ],
  },
  {
    // M8.C: QTE aún más lento (completa en tick 145) — toda la resolución
    // se desplaza; la preparación NO cambia.
    id: 'm7_stage_attack_slow145', label: 'Stage Attack QTE muy lento (completa @145)', seed: 4242,
    deck: [1, 5], playerCc: 0, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'qte_step' }, { kind: 'ticks', ticks: 42 },
      { kind: 'qte_step' }, { kind: 'ticks', ticks: 42 },
      { kind: 'qte_step' },
    ],
  },
  {
    id: 'm7_melee_hit', label: 'Melee hit (Cont.Punch acc 100)', seed: 999001,
    deck: [5], playerCc: 30, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'JOINT' } },
      // M8.C2: damage/beam resuelven INMEDIATO (sin QTE) — el PRNG canónico
      // decide la precisión en el mismo PLAY_CARD.
      { kind: 'cmd', command: { type: 'PLAY_CARD', handIndex: 0 }, opts: { side: 'player', characterId: 'goku' } },
    ],
  },
  {
    id: 'm7_melee_miss', label: 'Melee miss (Cont.Kick acc 80 — seed con fallo)', seed: 4,
    deck: [6], playerCc: 30, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'JOINT' } },
      { kind: 'cmd', command: { type: 'PLAY_CARD', handIndex: 0 }, opts: { side: 'player', characterId: 'goku' } },
    ],
  },
  {
    id: 'm7_beam_hit', label: 'Beam hit (Kamehameha ray)', seed: 555001,
    deck: [12], playerCc: 30, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'JOINT' } },
      { kind: 'cmd', command: { type: 'PLAY_CARD', handIndex: 0 }, opts: { side: 'player', characterId: 'goku' } },
    ],
  },
  {
    id: 'm7_beam_block', label: 'Beam defend → BLOCK (Kamehameha, seed con block)', seed: 1,
    deck: [12], playerCc: 30, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'JOINT' } },
      { kind: 'cmd', command: { type: 'PLAY_CARD', handIndex: 0 }, opts: { side: 'player', characterId: 'goku' } },
    ],
  },
  {
    id: 'm7_guard', label: 'Guardia (defensa básica → pose guard)', seed: 5,
    deck: [1], playerCc: 0, playerPos: 'DOWN_BACK', enemyPos: 'DOWN_BACK', phase: 'defend',
    steps: [
      { kind: 'cmd', command: { type: 'GUARD' }, opts: { side: 'player' } },
    ],
  },
  {
    id: 'm7_move', label: 'MOVE táctico (GUARD → ventana fresh → HORIZONTAL)', seed: 7,
    deck: [1], playerCc: 0, playerPos: 'DOWN_BACK', enemyPos: 'DOWN_BACK', phase: 'defend',
    steps: [
      { kind: 'cmd', command: { type: 'GUARD' }, opts: { side: 'player' } },
      { kind: 'reset_defense' },
      { kind: 'cmd', command: { type: 'MOVE', axis: 'HORIZONTAL' }, opts: { side: 'player' } },
    ],
  },
  {
    id: 'm7_gather', label: 'Gather Power (ACTION + aura)', seed: 9,
    deck: [1], playerCc: 0, playerPos: 'DOWN_BACK', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'GATHER_POWER' }, opts: { side: 'player' } },
    ],
  },
  {
    id: 'm7_qte_counter', label: 'QTE fallo → counter → DEFEND (parcial)', seed: 4243,
    deck: [1], playerCc: 0, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'qte_wrong' },
      { kind: 'cmd', command: { type: 'QTE_COUNTER_DEFEND' }, opts: { side: 'player' } },
    ],
  },
  {
    id: 'm7_qte_timeout', label: 'QTE timeout por reloj → counter daño', seed: 4244,
    deck: [1], playerCc: 0, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'ticks', ticks: 300 }, // expira la ventana de inputs y el counter
    ],
  },
  {
    id: 'm7_defeat', label: 'FIGHTER_DEFEATED (KO)', seed: 11,
    deck: [1], playerCc: 0, enemyHp: 3, playerPos: 'DOWN_FRONT', enemyPos: 'DOWN_BACK',
    steps: [
      { kind: 'cmd', command: { type: 'BASIC' } },
      { kind: 'cmd', command: { type: 'BASIC_STAGE_ATTACK' }, opts: { side: 'player' } },
      { kind: 'qte_complete' },
    ],
  },
];

/** Ejecuta un escenario headless (M1-M6) y devuelve EventLog + estado final. */
export function runPresentationScenario(sc: PresentationScenario): ScenarioRun {
  const cfg = {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: sc.playerCc ?? 0,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: sc.enemyHp ?? 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 0,
    playerPos: sc.playerPos ? POS(sc.playerPos) : BattlePosition.DOWN_BACK,
    enemyPos: sc.enemyPos ? POS(sc.enemyPos) : BattlePosition.DOWN_BACK,
    playerDeck: deckOf(sc.deck),
    enemyDeck: deckOf([1]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player' as const,
    seed: sc.seed,
  };
  let state = createInitialBattleState(cfg);
  state = { ...state, phase: (sc.phase ?? 'command') as never };
  const log = emptyEventLog();

  const runCmd = (command: BattleCommand, opts?: Parameters<typeof executeCommand>[2]) => {
    const r = executeCommand(state, command, opts);
    if (!r.ok) throw new Error(`scenario ${sc.id}: ${JSON.stringify(command)} rechazado: ${r.reason}`);
    log.entries.push(...r.events.map((e, i) => ({ sequence: log.entries.length + i, tick: r.state.tick, event: e })));
    state = r.state;
  };
  const runTicks = (ticks: number) => {
    const c = advanceBattleClock(state, ticks);
    log.entries.push(...c.events.map((e, i) => ({ sequence: log.entries.length + i, tick: c.eventTicks[i] ?? c.state.tick, event: e })));
    state = c.state;
  };
  // M8.B: si el QTE está en PREPARING, avanzar hasta que el reloj abra
  // INPUT_WINDOW (el último idle de la preparación) antes de los inputs.
  const openInputWindow = () => {
    if (state.stageQte.state === 'PREPARING') {
      runTicks(state.stageQte.inputOpenTick - state.tick + 1);
    }
  };

  for (const step of sc.steps) {
    if (step.kind === 'cmd') {
      runCmd(step.command, step.opts);
    } else if (step.kind === 'ticks') {
      runTicks(step.ticks);
    } else if (step.kind === 'reset_defense') {
      // M8.C2a — el orquestador abre una ventana defensiva nueva entre
      // exchanges (lo que hace el Runtime al entrar en fase defend): el
      // comando REAL RESET_DEFENSE, no una mutación directa del estado.
      runCmd({ type: 'RESET_DEFENSE' });
    } else if (step.kind === 'qte_complete') {
      openInputWindow();
      for (const key of [...state.stageQte.seq]) {
        runCmd({ type: 'QTE_INPUT', input: key }, { side: 'player' });
      }
    } else if (step.kind === 'qte_step') {
      // Un solo input correcto (para simular jugador LENTO: intercalar
      // { kind: 'ticks' } entre qte_step → QTE_COMPLETED en tick variable).
      openInputWindow();
      const key = state.stageQte.seq[state.stageQte.idx];
      runCmd({ type: 'QTE_INPUT', input: key }, { side: 'player' });
    } else if (step.kind === 'qte_wrong') {
      openInputWindow();
      const wrong = state.stageQte.seq[0] === 'A' ? 'B' : 'A';
      runCmd({ type: 'QTE_INPUT', input: wrong }, { side: 'player' });
    }
  }

  return { log, state };
}

/** Construye el log de envelopes listo para buildPresentationTimeline. */
export function envelopesOf(run: ScenarioRun): BattleEventLog['entries'] {
  return run.log.entries;
}

export { POS };

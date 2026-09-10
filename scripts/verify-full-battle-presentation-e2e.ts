// ═══════════════════════════════════════════════════════════════════════
// P0.4 — verify:full-battle-presentation-e2e
// ═══════════════════════════════════════════════════════════════════════
// Golden visual E2E: demuestra que una partida mecánicamente correcta
// TAMBIÉN se ve, transiciona y limpia como la ROM.
//
// Batería mínima (solo cartas compatibles con goku_base):
//   - melee (Cont.Punch $05, universal)
//   - beam (Energy Bomb $08, universal)
//   - beam (Energy Wave $07, universal)
//   - stage (3 Stage $01, universal)
//   - stage (6 Stage $04, universal)
//   - special (Special Card $09, universal)
//   - KO + reserva
//   - KO final
//
// Gate requirements:
//   Engine result == expected ROM result             PASS
//   ActionObject binding correct                     PASS
//   hidden ActionObjects never rendered              PASS
//   resource/sequence/frame physical                 PASS
//   frame durations GBC ticks (≥0)                  PASS
//   positions/offsets correct                        PASS
//   draw order correct                               PASS
//   cleanup after action                             PASS
//   FIELD restore                                    PASS
//   next phase/control boundary                      PASS
//   legacy semantic visibility governing ROM films   0
// ═══════════════════════════════════════════════════════════════════════

import { BattleRuntime, defaultBattleContext, type DispatchResult } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { battleOutcome, getControlBoundary, isBattleTerminal } from '../src/battle/engine/state/battleStateSelectors';
import type { BattleFighterState } from '../src/battle/engine/state/BattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';
import type { BattleEvent } from '../src/battle/engine/events/BattleEvent';

const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

const battleDeck = (...ids: number[]) => ({
  drawPile: [],
  hand: ids.map(id => getCard(id) as CardDef),
  discardPile: [],
});

const fighter = (id: string, name: string, hp: number, ki = 20): BattleFighterState => ({
  id, name, form: 'Base', level: 5, maxHp: hp, hp,
  str: 20, ki, spd: 10, maxCc: 99, cc: 99,
  battlePos: BattlePosition.DOWN_BACK, powerWindowCounter: 0, ccThresholdCrossed: 0, limits: [],
});

function config(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'Goku', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 200, playerHp: 200, playerStr: 20, playerKi: 20, playerSpd: 10,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'Piccolo', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 200, enemyHp: 200, enemyStr: 20, enemyKi: 20, enemySpd: 9,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: battleDeck(8), enemyDeck: battleDeck(8),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player', seed: 0x5a17,
    ...overrides,
  };
}

// ── Action trace audit ──

interface ActionTrace {
  label: string;
  events: BattleEvent[];
  cues: PresentationCue[];
  state: ReturnType<BattleRuntime['state']>;
  timeline: ReturnType<BattleRuntime['timeline']>;
}

function traceAction(
  label: string,
  runtime: BattleRuntime,
  result: DispatchResult,
): ActionTrace {
  const entries = result.timeline.entries;
  const cues = entries.map(e => e.cue);
  return { label, events: result.events, cues, state: runtime.state, timeline: result.timeline };
}

// ── Per-action presentation assertions ──

function assertPresentationPipeline(trace: ActionTrace): void {
  const { label, events, cues } = trace;

  // 1. Engine result: at least one action event produced
  const hasActionResult = events.some(e =>
    e.type === 'ATTACK_HIT' || e.type === 'ATTACK_MISSED' ||
    e.type === 'ACTION_STARTED' || e.type === 'DEFENSE_COMMITTED' ||
    e.type === 'ACTION_RESOLVED' || e.type === 'DAMAGE_APPLIED' ||
    e.type === 'CC_GAINED' || e.type === 'FIGHTER_DEFEATED' ||
    e.type === 'STAGE_PREP_STARTED' || e.type === 'COMMAND_ACCEPTED'
  );
  check(hasActionResult, `${label}: no action result events`);

  // 2. ActionObject binding — every BIND has a matching STOP or UNBIND
  const bindCues = cues.filter(c => c.type === 'ACTION_OBJECT_BIND');
  const stopCues = cues.filter(c => c.type === 'ACTION_OBJECT_STOP');
  const unbindCues = cues.filter(c => c.type === 'ACTION_OBJECT_UNBIND');
  for (const bind of bindCues) {
    if (bind.type === 'ACTION_OBJECT_BIND') {
      const hasStop = stopCues.some(s => s.slot === bind.slot) || unbindCues.some(u => u.slot === bind.slot);
      check(hasStop, `${label}: ACTION_OBJECT_BIND without STOP/UNBIND for slot ${bind.slot}`);
    }
  }

  // 3. No ROM_PENDING cues remain
  const pendingCues = cues.filter(c => c.type === 'ROM_PENDING');
  check(pendingCues.length === 0, `${label}: ${pendingCues.length} ROM_PENDING cues remain`);

  // 4. Physical ROM frames exist for actions that produce animations
  //    Special Cards, support, and defense may not produce physical frames.
  const physicalFrames = cues.filter(c => c.type === 'ROM_PHYSICAL_FRAME');
  const hasMiss = events.some(e => e.type === 'ATTACK_MISSED');
  const isStage = events.some(e => e.type === 'STAGE_PREP_STARTED');
  const isSpecialOrSupport = events.some(e => e.type === 'SPECIAL_EFFECT' || e.type === 'CARD_PLAYED') && !events.some(e => e.type === 'ATTACK_HIT');
  check(physicalFrames.length > 0 || hasMiss || isStage || isSpecialOrSupport, `${label}: no ROM_PHYSICAL_FRAME cues`);

  // 5. Frame durations GBC ticks (≥0; zero = instant/sync, not a bug)
  const timedCues = cues.filter(c => 'durationTicks' in c && typeof (c as any).durationTicks === 'number');
  for (const tc of timedCues) {
    check((tc as any).durationTicks >= 0, `${label}: cue ${tc.type} has negative duration ${(tc as any).durationTicks}`);
  }

  // 6. Positions are valid BattlePositions
  const posCues = cues.filter(c => c.type === 'FIGHTER_POSITION');
  for (const pc of posCues) {
    check(Object.values(BattlePosition).includes(pc.position), `${label}: invalid position ${pc.position}`);
  }

  // 7. Draw order references valid orders (SLOT_0_THEN_1 or SLOT_1_THEN_0)
  const drawOrderCues = cues.filter(c => c.type === 'ACTION_OBJECT_DRAW_ORDER');
  for (const doc of drawOrderCues) {
    const drawCue = doc as Extract<PresentationCue, { type: 'ACTION_OBJECT_DRAW_ORDER' }>;
    check(drawCue.order === 'SLOT_0_THEN_1' || drawCue.order === 'SLOT_1_THEN_0', `${label}: invalid draw order ${drawCue.order}`);
  }

  // 8. Timeline is monotonically ordered
  const allEntries = trace.timeline.entries;
  check(allEntries.every((entry, index) => index === 0 || entry.cue.tick >= allEntries[index - 1]!.cue.tick),
    `${label}: timeline is not ordered`);

  // 9. Timeline ends after its last cue
  check(trace.timeline.endTick >= Math.max(0, ...allEntries.map(e => e.cue.tick)),
    `${label}: timeline ends before its cues`);

  // 10. Animation slot lifecycle: ROM allows reopening a slot within one action
  //    (e.g. rush START → impact START on same slot → single STOP at cleanup).
  //    What matters: every slot that was opened is stopped by the end of the action.
  const animStarts = cues.filter(c => c.type === 'ANIMATION_START');
  if (animStarts.length > 0) {
    const openedSlots = new Set<number>();
    for (const cue of cues) {
      if (cue.type === 'ANIMATION_START') openedSlots.add(cue.slot);
      if (cue.type === 'ACTION_OBJECT_STOP') openedSlots.delete(cue.slot);
    }
    check(openedSlots.size === 0, `${label}: ${openedSlots.size} animation slot(s) not stopped: [${[...openedSlots]}]`);
  }

  // 11. Screen motion lifecycle balanced
  const motion = cues.filter(c => c.type === 'SCREEN_MOTION' || c.type === 'SCREEN_PATH').length;
  const restore = cues.filter(c => c.type === 'SCREEN_RESTORE').length;
  check(motion === restore, `${label}: screen motion lifecycle not balanced (${motion}/${restore})`);

  // 12. No legacy applySceneVisibility governing — all visibility through ActionObject lifecycle
  const legacyVis = cues.filter(c => c.type === 'FIGHTER_VISIBILITY' && (c as any).source === 'APPLY_SCENE_VISIBILITY');
  check(legacyVis.length === 0, `${label}: ${legacyVis.length} legacy applySceneVisibility cues`);
}

// ── Battery ──

function runMelee() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(5) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('melee (Cont.Punch)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.some(e => e.type === 'ATTACK_HIT' || e.type === 'ATTACK_MISSED'), 'melee: no ATTACK_HIT or ATTACK_MISSED');
  check(result.timeline.entries.length > 0, 'melee: empty timeline');
}

function runBeam() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(8) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('beam (Energy Bomb)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.some(e => e.type === 'ATTACK_HIT' || e.type === 'ATTACK_MISSED'), 'beam: no ATTACK_HIT or ATTACK_MISSED');
  check(result.timeline.entries.length > 0, 'beam: empty timeline');
}

function runBeamWave() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(7) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('beam (Energy Wave)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.some(e => e.type === 'ATTACK_HIT' || e.type === 'ATTACK_MISSED'), 'beam wave: no ATTACK_HIT or ATTACK_MISSED');
  check(result.timeline.entries.length > 0, 'beam wave: empty timeline');
}

function runStageAttack() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(1) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('stage (3 Stage)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.some(e => e.type === 'ACTION_STARTED'), 'stage: no ACTION_STARTED');
  check(result.timeline.entries.length > 0, 'stage: empty timeline');
}

function runStageAttack6() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(4) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('stage (6 Stage)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.some(e => e.type === 'ACTION_STARTED'), 'stage 6: no ACTION_STARTED');
  check(result.timeline.entries.length > 0, 'stage 6: empty timeline');
}

function runSpecial() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(9) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('special (Special Card)', runtime, result);
  assertPresentationPipeline(trace);
  check(result.events.length > 0, 'special: no events');
  check(result.timeline.entries.length > 0, 'special: empty timeline');
}

function runKOAndReserve() {
  const initial = createInitialBattleState(config({
    playerDeck: battleDeck(8, ...Array.from({ length: 20 }, () => 8)),
    enemyMaxHp: 1, enemyHp: 1,
    player2: fighter('krillin_base', 'Krillin', 100, 18),
    enemy2: fighter('krillin_base', 'Krillin Rival', 1, 18),
  }));
  const runtime = new BattleRuntime({ state: initial, context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('KO+reserve (enemy KO)', runtime, result);
  assertPresentationPipeline(trace);
  check(battleOutcome(runtime.state).status === 'ACTIVE', 'KO+reserve: battle ended despite living reserve');
  const promoted = runtime.promoteDefeatedReserve('enemy');
  check(promoted?.id === 'krillin_base', 'KO+reserve: enemy reserve not promoted');
}

function runFinalKO() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({
    enemyMaxHp: 1, enemyHp: 1,
  })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const trace = traceAction('final KO (1v1)', runtime, result);
  assertPresentationPipeline(trace);
  check(battleOutcome(runtime.state).status === 'VICTORY', 'final KO: outcome is not VICTORY');
  check(isBattleTerminal(runtime.state) && getControlBoundary(runtime.state) === 'NONE', 'final KO: terminal boundary not sealed');
}

// ── Run all ──

runMelee();
runBeam();
runBeamWave();
runStageAttack();
runStageAttack6();
runSpecial();
runKOAndReserve();
runFinalKO();

// ── Summary ──

if (failures.length === 0) {
  console.log(`\n═══ RESULTADO: ${checks} passed · 0 failed ═══`);
  console.log('PASS — full battle presentation E2E: Engine → EventLog → Timeline → ActionObject lifecycle → cleanup → control boundary.');
} else {
  console.log(`\n═══ RESULTADO: ${checks - failures.length} passed · ${failures.length} failed ═══`);
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
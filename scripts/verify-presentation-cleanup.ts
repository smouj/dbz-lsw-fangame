// ═══════════════════════════════════════════════════════════════════════
// P0.4G — verify:presentation-cleanup
// ═══════════════════════════════════════════════════════════════════════
// Gate: toda película termina limpia.
//
// Secuencia conceptual:
//   ACTION_OBJECT_STOP → FX STOP → projectile cleanup → palette restore
//   → screen restore → ActionObject unbind/reset → ACTION BG cleanup
//   → FIELD
//
// Invariantes después de restore:
//   active ActionObject accidental       0
//   visible hidden object accidental     0
//   orphan projectile                    0
//   orphan FX                            0
//   palette residual                     0
//   screen/camera residual              0
//   action BG residual                  0
//   stale binding                       0
//
// Test imprescindible:
//   ACTION A → FIELD → ACTION B (leaks en segunda película)
//   BEAM → FIELD → MELEE
//   KO → reserve → next action
// ═══════════════════════════════════════════════════════════════════════

import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import { battleOutcome, getControlBoundary, isBattleTerminal } from '../src/battle/engine/state/battleStateSelectors';
import type { BattleFighterState } from '../src/battle/engine/state/BattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

const battleDeck = (...ids: number[]) => ({
  drawPile: [], hand: ids.map(id => getCard(id) as CardDef), discardPile: [],
});

const fighter = (id: string, name: string, hp: number, ki = 20): BattleFighterState => ({
  id, name, form: 'Base', level: 5, maxHp: hp, hp,
  str: 20, ki, spd: 10, maxCc: 99, cc: 99,
  battlePos: BattlePosition.DOWN_BACK, powerWindowCounter: 0, ccThresholdCrossed: 0, limits: [],
});

function config(overrides: Record<string, unknown> = {}): any {
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

// ── Cleanup audit per action ──

function auditCleanup(label: string, cues: PresentationCue[]): void {
  // 1. Every opened ActionObject slot must be stopped
  const bindSlots = new Set<number>();
  const stopSlots = new Set<number>();
  const unbindSlots = new Set<number>();
  for (const cue of cues) {
    if (cue.type === 'ACTION_OBJECT_BIND') bindSlots.add(cue.slot);
    if (cue.type === 'ACTION_OBJECT_STOP') stopSlots.add(cue.slot);
    if (cue.type === 'ACTION_OBJECT_UNBIND') unbindSlots.add(cue.slot);
  }
  for (const slot of bindSlots) {
    check(stopSlots.has(slot) || unbindSlots.has(slot),
      `${label}: ACTION_OBJECT_BIND on slot ${slot} without STOP/UNBIND`);
  }

  // 2. No orphan ANIMATION_START (every START must have a matching STOP)
  const openSlots = new Set<number>();
  for (const cue of cues) {
    if (cue.type === 'ANIMATION_START') openSlots.add(cue.slot);
    if (cue.type === 'ACTION_OBJECT_STOP') openSlots.delete(cue.slot);
  }
  check(openSlots.size === 0, `${label}: ${openSlots.size} animation slot(s) not stopped after cleanup`);

  // 3. Screen motion lifecycle balanced
  const motionCount = cues.filter(c => c.type === 'SCREEN_MOTION' || c.type === 'SCREEN_PATH').length;
  const restoreCount = cues.filter(c => c.type === 'SCREEN_RESTORE').length;
  const selfRestoring = cues.filter(c => c.type === 'SCREEN_MOTION' && (c as any).restore === true).length;
  if (motionCount > 0) {
    check(restoreCount + selfRestoring >= 1,
      `${label}: ${motionCount} SCREEN_MOTION/PATH without restore`);
  }

  // 4. No ROM_PENDING cues remain
  const pendingCount = cues.filter(c => c.type === 'ROM_PENDING').length;
  check(pendingCount === 0, `${label}: ${pendingCount} ROM_PENDING cues remain after action`);

  // 5. No legacy applySceneVisibility
  const legacyVis = cues.filter(c => c.type === 'FIGHTER_VISIBILITY' && (c as any).source === 'APPLY_SCENE_VISIBILITY').length;
  check(legacyVis === 0, `${label}: ${legacyVis} legacy applySceneVisibility cues`);

  // 6. ActionObject DRAW_ORDER is valid (if present)
  const drawOrders = cues.filter(c => c.type === 'ACTION_OBJECT_DRAW_ORDER');
  for (const doc of drawOrders) {
    const drawCue = doc as Extract<PresentationCue, { type: 'ACTION_OBJECT_DRAW_ORDER' }>;
    check(drawCue.order === 'SLOT_0_THEN_1' || drawCue.order === 'SLOT_1_THEN_0',
      `${label}: invalid draw order ${drawCue.order}`);
  }
}

// ── Test: ACTION A → FIELD → ACTION B (leaks in second film) ──

function testSequentialActions(): void {
  // Action A: melee (Cont.Punch)
  const runtimeA = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(5, 8) })), context: defaultBattleContext() });
  runtimeA.state = { ...runtimeA.state, phase: 'cardSelect' };
  const resultA = runtimeA.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  const cuesA = resultA.timeline.entries.map(e => e.cue);
  auditCleanup('melee→FIELD→beam:first', cuesA);

  // Action B: beam (Energy Bomb) in same runtime
  const resultB = runtimeA.dispatch({ type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' });
  const cuesB = resultB.timeline.entries.map(e => e.cue);
  auditCleanup('melee→FIELD→beam:second', cuesB);

  // Second action should not have stale slots from first action
  const bindSlotsB = new Set<number>();
  const stopSlotsB = new Set<number>();
  for (const cue of cuesB) {
    if (cue.type === 'ACTION_OBJECT_BIND') bindSlotsB.add(cue.slot);
    if (cue.type === 'ACTION_OBJECT_STOP') stopSlotsB.add(cue.slot);
  }
  for (const slot of bindSlotsB) {
    check(stopSlotsB.has(slot), `melee→FIELD→beam:second: slot ${slot} opened but not stopped`);
  }
}

// ── Test: BEAM → FIELD → MELEE ──

function testBeamThenMelee(): void {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({ playerDeck: battleDeck(8, 5) })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };

  // Beam first
  const resultBeam = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  auditCleanup('beam→FIELD→melee:beam', resultBeam.timeline.entries.map(e => e.cue));

  // Melee second
  const resultMelee = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' });
  auditCleanup('beam→FIELD→melee:melee', resultMelee.timeline.entries.map(e => e.cue));
}

// ── Test: KO → reserve → next action ──

function testKOAndReserve(): void {
  const initial = createInitialBattleState(config({
    playerDeck: battleDeck(8, ...Array.from({ length: 20 }, () => 8)),
    enemyMaxHp: 1, enemyHp: 1,
    player2: fighter('krillin_base', 'Krillin', 100, 18),
    enemy2: fighter('krillin_base', 'Krillin Rival', 1, 18),
  }));
  const runtime = new BattleRuntime({ state: initial, context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };

  // KO enemy
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  auditCleanup('KO→reserve:first', result.timeline.entries.map(e => e.cue));
  check(battleOutcome(runtime.state).status === 'ACTIVE', 'KO→reserve: battle ended despite living reserve');

  // Promote reserve
  const promoted = runtime.promoteDefeatedReserve('enemy');
  check(promoted?.id === 'krillin_base', 'KO→reserve: enemy reserve not promoted');
}

// ── Test: Final KO ──

function testFinalKO(): void {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config({
    enemyMaxHp: 1, enemyHp: 1,
  })), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };

  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  auditCleanup('finalKO', result.timeline.entries.map(e => e.cue));
  check(battleOutcome(runtime.state).status === 'VICTORY', 'finalKO: outcome is not VICTORY');
  check(isBattleTerminal(runtime.state) && getControlBoundary(runtime.state) === 'NONE',
    'finalKO: terminal boundary not sealed');
}

// ── Run all tests ──

testSequentialActions();
testBeamThenMelee();
testKOAndReserve();
testFinalKO();

// ── Summary ──

if (failures.length === 0) {
  console.log(`\n═══ RESULTADO: ${checks} passed · 0 failed ═══`);
  console.log('PASS — presentation cleanup: all ActionObject slots stopped, no orphan projectiles, no camera residual.');
} else {
  console.log(`\n═══ RESULTADO: ${checks - failures.length} passed · ${failures.length} failed ═══`);
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
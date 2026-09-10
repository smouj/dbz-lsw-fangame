import { BattleRuntime, defaultBattleContext, type DispatchResult } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { battleOutcome, getControlBoundary, isBattleTerminal } from '../src/battle/engine/state/battleStateSelectors';
import type { BattleFighterState } from '../src/battle/engine/state/BattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';

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
  battlePos: BattlePosition.DOWN_BACK, powerWindowCounter: 0, limits: [],
});

function config(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'Goku', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 100, playerHp: 100, playerStr: 20, playerKi: 20, playerSpd: 10,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'Piccolo', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1, enemyHp: 1, enemyStr: 20, enemyKi: 20, enemySpd: 9,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: battleDeck(8), enemyDeck: battleDeck(21), playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player', seed: 0x5a17,
    ...overrides,
  };
}

function assertResolution(label: string, result: DispatchResult): void {
  const types = result.events.map(event => event.type);
  const hitOrMiss = Math.max(types.indexOf('ATTACK_HIT'), types.indexOf('ATTACK_MISSED'));
  const damage = types.indexOf('DAMAGE_APPLIED');
  const defeated = types.indexOf('FIGHTER_DEFEATED');
  const resolved = types.indexOf('ACTION_RESOLVED');
  // ROM §32/§59: ATTACK_MISSED with missType='ATTENUATED' also produces damage.
  // Causal order: ATTACK_HIT|ATTACK_MISSED → DAMAGE_APPLIED → FIGHTER_DEFEATED → ACTION_RESOLVED
  // CC_GAINED may appear between DEFEATED and RESOLVED.
  check(hitOrMiss >= 0 && damage > hitOrMiss && defeated > damage && resolved > defeated, `${label}: causal event order is invalid`);

  const allEntries = result.timeline.entries;
  // Runtime timelines are replay histories. Presenter consumes only the lot
  // anchored to the current logical tick, so lifecycle slots must be balanced
  // within that lot rather than folded together with prior fighters/actions.
  const entries = allEntries.filter(entry => entry.logicalTick === result.state.tick);
  check(allEntries.every((entry, index) => index === 0 || entry.cue.tick >= allEntries[index - 1]!.cue.tick), `${label}: timeline is not ordered`);
  check(result.timeline.endTick >= Math.max(result.timeline.startTick, ...allEntries.map(entry => entry.cue.tick), 0), `${label}: timeline ends before its cues`);
  check(!allEntries.some(entry => entry.cue.type === 'ROM_PENDING'), `${label}: ROM_PENDING cue remains`);
  const physical = entries.filter(entry => entry.cue.type === 'ROM_PHYSICAL_FRAME');
  check(physical.length > 0, `${label}: no physical ROM frames`);
  check(physical.every(entry => entry.cue.type === 'ROM_PHYSICAL_FRAME' && entry.cue.source === 'ROM_PHYSICAL'), `${label}: unresolved physical frame`);

  const openSlots = new Set<number>();
  let invalidLifecycle = false;
  for (const entry of entries) {
    if (entry.cue.type === 'ANIMATION_START') {
      if (openSlots.has(entry.cue.slot)) invalidLifecycle = true;
      openSlots.add(entry.cue.slot);
    }
    if (entry.cue.type === 'ACTION_OBJECT_STOP') {
      if (!openSlots.delete(entry.cue.slot)) invalidLifecycle = true;
    }
  }
  check(!invalidLifecycle && openSlots.size === 0, `${label}: animation/projectile slot survives cleanup`);
  const motion = entries.filter(entry => entry.cue.type === 'SCREEN_MOTION' || entry.cue.type === 'SCREEN_PATH').length;
  const restore = entries.filter(entry => entry.cue.type === 'SCREEN_RESTORE').length;
  check(motion === restore, `${label}: screen projectile lifecycle is not restored (${motion}/${restore})`);
}

function settlePresentation(runtime: BattleRuntime): void {
  runtime.advance(Math.max(1, runtime.timeline.endTick - runtime.state.tick + 1));
}

function runOneVsOne() {
  const runtime = new BattleRuntime({ state: createInitialBattleState(config()), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }); // Energy Bomb, physical handler $05
  assertResolution('1v1 Energy Bomb', result);
  check(battleOutcome(runtime.state).status === 'VICTORY', '1v1: final outcome is not VICTORY');
  check(isBattleTerminal(runtime.state) && getControlBoundary(runtime.state) === 'NONE', '1v1: terminal boundary is not sealed');
  return { state: runtime.state, log: runtime.log, timeline: runtime.timeline };
}

function runTwoVsTwo() {
  const initial = createInitialBattleState(config({
    playerHp: 1,
    playerDeck: battleDeck(8, ...Array.from({ length: 20 }, () => 21)),
    player2: fighter('krillin_base', 'Krillin', 100, 18),
    enemy2: fighter('krillin_base', 'Krillin Rival', 1, 18),
  }));
  const runtime = new BattleRuntime({ state: initial, context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };

  const firstKo = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  assertResolution('2v2 active enemy KO', firstKo);
  check(battleOutcome(runtime.state).status === 'ACTIVE' && !isBattleTerminal(runtime.state), '2v2: enemy active KO ended battle despite a living reserve');
  check(runtime.promoteDefeatedReserve('enemy')?.id === 'krillin_base' && runtime.state.enemy2 === null, '2v2: enemy reserve was not promoted and consumed');
  check(runtime.presentationInput().context.enemyFormId === 'krillin_base', '2v2: enemy presentation context did not follow reserve');
  settlePresentation(runtime);

  let secondKo: DispatchResult | null = null;
  for (let attempt = 0; attempt < 20 && !secondKo?.events.some(event => event.type === 'FIGHTER_DEFEATED'); attempt++) {
    secondKo = runtime.resolveCard('enemy', getCard(21) as CardDef); // Destruct-Disk, physical handler $07
    if (!secondKo.events.some(event => event.type === 'FIGHTER_DEFEATED')) settlePresentation(runtime);
  }
  if (!secondKo) throw new Error('enemy attack loop produced no result');
  assertResolution('2v2 active player KO', secondKo);
  check(battleOutcome(runtime.state).status === 'ACTIVE' && !isBattleTerminal(runtime.state), '2v2: player active KO ended battle despite a living reserve');
  check(runtime.promoteDefeatedReserve('player')?.id === 'krillin_base' && runtime.state.player2 === null, '2v2: player reserve was not promoted and consumed');
  check(runtime.presentationInput().context.playerFormId === 'krillin_base', '2v2: player presentation context did not follow reserve');
  settlePresentation(runtime);

  let finalKo: DispatchResult | null = null;
  for (let attempt = 0; attempt < 20 && !finalKo?.events.some(event => event.type === 'FIGHTER_DEFEATED'); attempt++) {
    finalKo = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'krillin' });
    if (!finalKo.events.some(event => event.type === 'FIGHTER_DEFEATED')) settlePresentation(runtime);
  }
  if (!finalKo) throw new Error('player attack loop produced no result');
  assertResolution('2v2 final reserve KO', finalKo);
  check(battleOutcome(runtime.state).status === 'VICTORY', '2v2: final outcome is not VICTORY');
  check(isBattleTerminal(runtime.state) && getControlBoundary(runtime.state) === 'NONE', '2v2: final terminal boundary is not sealed');
  check(runtime.state.player2 === null && runtime.state.enemy2 === null, '2v2: a consumed reserve slot reappeared');
  return { state: runtime.state, log: runtime.log, timeline: runtime.timeline };
}

const oneA = runOneVsOne();
const oneB = runOneVsOne();
check(JSON.stringify(oneA) === JSON.stringify(oneB), '1v1: same seed/input did not reproduce state, EventLog and timeline');
const twoA = runTwoVsTwo();
const twoB = runTwoVsTwo();
check(JSON.stringify(twoA) === JSON.stringify(twoB), '2v2: same seed/input did not reproduce state, EventLog and timeline');

console.log(`Full battle E2E: checks=${checks} failures=${failures.length}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('PASS — complete 1v1 and 2v2 battles reach the correct terminal outcome with deterministic Engine → EventLog → ROM timeline and zero orphan visual/projectile state.');

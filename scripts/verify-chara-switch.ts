/**
 * verify-chara-switch.ts — C1 ROM CHARACTER SWITCH CUTOVER (Engine + Presentation).
 *
 * Valida el ciclo semántico completo del switch (§176-178):
 *   CHARACTER_ACTION → CHARACTER_SWITCH_STARTED
 *     → (clock) CHARACTER_SWITCH_COMMITTED en +63t  [swap AUTORITATIVO]
 *     → (clock) CHARACTER_SWITCH_COMPLETED en +95t  [cleanup + maintenance]
 *   y que el timeline traduce:
 *     STARTED   → FIGHTER_MOTION CHARA_EXIT  (t+20, 43t, -98px)
 *     COMMITTED → FIGHTER_MOTION CHARA_ENTRY (t+63, 32t, +98px)
 *     COMPLETED → FIGHTER_POSE idle (cleanup)
 *
 * C1b — Team-mode Engine authority: el swap lógico ocurre EXACTAMENTE en
 * COMMITTED (entidad Fighter completa), el estado individual persiste A↔B,
 * y 1v1 (reserve == null) rechaza CHARACTER_ACTION.
 */
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import { BattleRuntime } from '../src/battle/runtime/BattleRuntime';
import { BattlePosition } from '../src/data/positions';
import type { BattleFighterState } from '../src/battle/engine/state/BattleState';
import {
  CHARA_SWITCH_PRE_WAIT_TICKS,
  CHARA_SWITCH_COMMIT_OFFSET,
  CHARA_SWITCH_COMPLETED_OFFSET,
  CHARA_EXIT,
  CHARA_ENTRY,
} from '../src/battle/engine/rom/romDescriptors';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail?: string): void {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}

const emptyDeck = { drawPile: [] as never[], hand: [] as never[], discardPile: [] as never[] };

/** Construye un BattleFighterState completo (con defaults de reserve). */
const makeFighter = (over: Partial<BattleFighterState> = {}): BattleFighterState => ({
  id: 'gohan_base', name: 'GOHAN', form: 'Base', level: 5,
  maxHp: 900, hp: 900, str: 8, ki: 7, spd: 8, maxCc: 99, cc: 0,
  battlePos: BattlePosition.DOWN_BACK, powerWindowCounter: 0, limits: [],
  ...over,
});

const makeConfig = (player2: BattleFighterState | null = makeFighter()) => createInitialBattleState({
  playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
  playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
  playerMaxCc: 99, playerCc: 0,
  enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
  enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
  enemyMaxCc: 99, enemyCc: 0,
  playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
  playerDeck: emptyDeck, enemyDeck: emptyDeck,
  playerLimits: [], playerFighterLimits: [],
  firstAttacker: 'player',
  player2,
});

console.log('C1 CHARACTER SWITCH — verify-chara-switch\n');

// ═══ 1. Dispatch semántico (team) — STARTED + pending, SIN swap inmediato ═══
const base = makeConfig();
const runtime = new BattleRuntime({ state: { ...base, phase: 'command' } });
const startTick = base.tick;

const r = runtime.dispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });

check('dispatch CHARACTER_ACTION (team) ok', r.ok === true, JSON.stringify(r.ok));
check('CHARACTER_SWITCH_STARTED emitido', r.events.some(e => e.type === 'CHARACTER_SWITCH_STARTED'));
check('pendingCharacterSwitch programado', r.state.pendingCharacterSwitch != null);
check('commitTick = start + 63 (WAIT20 + EXIT43)', r.state.pendingCharacterSwitch?.commitTick === startTick + CHARA_SWITCH_COMMIT_OFFSET, `got ${r.state.pendingCharacterSwitch?.commitTick}`);
check('completedTick = start + 95 (COMMIT63 + ENTRY32)', r.state.pendingCharacterSwitch?.completedTick === startTick + CHARA_SWITCH_COMPLETED_OFFSET, `got ${r.state.pendingCharacterSwitch?.completedTick}`);
check('NO swap inmediato en dispatch (active sigue OLD)', r.state.player.id === 'goku_base' && r.state.player2?.id === 'gohan_base');

// ═══ 2. Timeline cues ═══
const exitCue = r.timeline.entries.find(en => en.cue.type === 'FIGHTER_MOTION' && en.cue.kind === 'CHARA_EXIT');
check('timeline contiene CHARA_EXIT', !!exitCue);
check('CHARA_EXIT.tick = start + WAIT20', exitCue?.cue.tick === startTick + CHARA_SWITCH_PRE_WAIT_TICKS, `got ${exitCue?.cue.tick}`);
check('CHARA_EXIT durationTicks = 43t', exitCue?.cue.durationTicks === CHARA_EXIT.totalTicks, `got ${exitCue?.cue.durationTicks}`);
check('CHARA_EXIT deltaPx = -98 (player, sin mirror)', exitCue?.cue.deltaPx === -98, `got ${exitCue?.cue.deltaPx}`);
check('CHARA_EXIT segments preservados (5 segmentos)', exitCue?.cue.segments?.length === 5, `got ${exitCue?.cue.segments?.length}`);

// ═══ 3. Swap AUTORITATIVO @ T+63 (boundaries T+62/63/95) ═══
const a62 = runtime.advance(CHARA_SWITCH_COMMIT_OFFSET - 1);
check('T+62: active member sigue OLD (goku_base)', runtime.state.player.id === 'goku_base' && a62.outcome.events.every(e => e.type !== 'CHARACTER_SWITCH_COMMITTED'));

const a63 = runtime.advance(1);
check('T+63: CHARACTER_SWITCH_COMMITTED emitido una vez', a63.outcome.events.filter(e => e.type === 'CHARACTER_SWITCH_COMMITTED').length === 1);
check('T+63: active member = NEW (gohan_base)', runtime.state.player.id === 'gohan_base');
check('T+63: reserve = OLD (goku_base)', runtime.state.player2?.id === 'goku_base');
check('T+63: ENTRANTE recibe powerWindowCounter = 2 (§124-126)', runtime.state.player.powerWindowCounter === 2);
check('T+63: ENTRANTE recibe horizontal BACK', runtime.state.player.battlePos === BattlePosition.DOWN_BACK);
check('T+63: sin COMPLETED aún', !a63.outcome.events.some(e => e.type === 'CHARACTER_SWITCH_COMPLETED'));

const entryCue = runtime.timeline.entries.find(en => en.cue.type === 'FIGHTER_MOTION' && en.cue.kind === 'CHARA_ENTRY');
check('timeline contiene CHARA_ENTRY', !!entryCue);
check('CHARA_ENTRY.tick = commitTick (63)', entryCue?.cue.tick === startTick + CHARA_SWITCH_COMMIT_OFFSET, `got ${entryCue?.cue.tick}`);
check('CHARA_ENTRY durationTicks = 32t', entryCue?.cue.durationTicks === CHARA_ENTRY.totalTicks, `got ${entryCue?.cue.durationTicks}`);
check('CHARA_ENTRY deltaPx = +98', entryCue?.cue.deltaPx === 98, `got ${entryCue?.cue.deltaPx}`);

const a95 = runtime.advance(CHARA_ENTRY.totalTicks);
check('T+95: CHARACTER_SWITCH_COMPLETED emitido una vez', a95.outcome.events.filter(e => e.type === 'CHARACTER_SWITCH_COMPLETED').length === 1);
check('T+95: active member sigue NEW (gohan_base)', runtime.state.player.id === 'gohan_base');
check('T+95: pendingCharacterSwitch limpiado', runtime.state.pendingCharacterSwitch == null);
check('T+95: maintenance aplicado (powerWindow 2 → 1)', runtime.state.player.powerWindowCounter === 1);

const idleCue = runtime.timeline.entries.find(en => en.sourceEvent === 'CHARACTER_SWITCH_COMPLETED' && en.cue.type === 'FIGHTER_POSE' && en.cue.pose === 'idle');
check('cleanup FIGHTER_POSE idle en COMPLETED', !!idleCue);

// Orden temporal EXIT < ENTRY.
check('EXIT antes que ENTRY en el timeline', (exitCue?.cue.tick ?? Infinity) < (entryCue?.cue.tick ?? -Infinity));

// ═══ 4. A → B → A : persistencia EXACTA de entidad (detecta sustitución) ═══
const memberA = makeFighter({ id: 'goku_base', name: 'GOKU', hp: 700, ki: 2, powerWindowCounter: 0, str: 10, spd: 9 });
const memberB = makeFighter({ id: 'gohan_base', name: 'GOHAN', hp: 321, ki: 5, powerWindowCounter: 4, str: 8, spd: 8 });
const ab = new BattleRuntime({
  state: {
    ...makeConfig(memberB),
    phase: 'command',
    player: memberA,
  },
});
ab.dispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });
ab.advance(CHARA_SWITCH_COMMIT_OFFSET); // commit A→B
ab.advance(CHARA_ENTRY.totalTicks); // completed
check('A→B: active = B (HP 321, Ki 5)', ab.state.player.id === 'gohan_base' && ab.state.player.hp === 321 && ab.state.player.ki === 5);
check('A→B: reserve = A (HP 700, Ki 2)', ab.state.player2?.id === 'goku_base' && ab.state.player2?.hp === 700 && ab.state.player2?.ki === 2);

ab.dispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });
ab.advance(CHARA_SWITCH_COMMIT_OFFSET); // commit B→A
ab.advance(CHARA_ENTRY.totalTicks); // completed
check('B→A: active = A con HP 700 exacto', ab.state.player.id === 'goku_base' && ab.state.player.hp === 700);
check('B→A: active = A con Ki 2 exacto', ab.state.player.ki === 2);
check('B→A: active = A con str/spd originales', ab.state.player.str === 10 && ab.state.player.spd === 9);
check('B→A: reserve = B con HP 321 exacto', ab.state.player2?.id === 'gohan_base' && ab.state.player2?.hp === 321);
check('B→A: reserve = B con Ki 5 exacto', ab.state.player2?.ki === 5);
// CHARA (§124-126) SOBRESCRIBE powerWindow=2 al ENTRANTE en cada commit y el
// mantenimiento (§132-133) lo decrementa a 1 al cierre — es efecto de la
// acción, NO pérdida del estado del miembro. Lo importante: HP/Ki/str/spd
// del miembro vuelven EXACTOS (arriba), luego la entidad se intercambia, no
// se sustituye.
check('powerWindow = 1 (CHARA escribe 2 → maintenance −1; no es bug de copia)', ab.state.player.powerWindowCounter === 1, `got ${ab.state.player.powerWindowCounter}`);

// ═══ 5. 1v1 (reserve == null) → rechazado ═══
const solo = new BattleRuntime({ state: { ...makeConfig(null), phase: 'command' } });
const soloR = solo.dispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });
check('1v1: CHARACTER_ACTION rechazado (reserve null)', soloR.ok === false);
check('1v1: sin pendingCharacterSwitch', solo.state.pendingCharacterSwitch == null);

// ═══ 6. Enemy side ═══
const enemyState = {
  ...makeConfig(null),
  phase: 'command' as const,
  enemy2: makeFighter({ id: 'burter', name: 'BURTER', hp: 500 }),
};
const en = new BattleRuntime({ state: enemyState });
const enR = en.dispatch({ type: 'CHARACTER_ACTION', side: 'enemy' }, { side: 'enemy' });
check('enemy: CHARACTER_ACTION (side=enemy) ok', enR.ok === true);
en.advance(CHARA_SWITCH_COMMIT_OFFSET);
check('enemy: swap @ commit (enemy=burter, enemy2=piccolo_base)', en.state.enemy.id === 'burter' && en.state.enemy2?.id === 'piccolo_base');

// ═══ 7. Determinismo de replay ═══
const runtime2 = new BattleRuntime({ state: { ...base, phase: 'command' } });
const r2 = runtime2.dispatch({ type: 'CHARACTER_ACTION', side: 'player' }, { side: 'player' });
const exit2 = r2.timeline.entries.find(en => en.cue.type === 'FIGHTER_MOTION' && en.cue.kind === 'CHARA_EXIT');
check('replay determinista (CHARA_EXIT cue idéntico)', JSON.stringify(exit2?.cue) === JSON.stringify(exitCue?.cue));

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);

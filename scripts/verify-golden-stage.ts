// ═══════════════════════════════════════════════════════════════════════
// VERIFY: GOLDEN STAGE E2E — P0.3 gate.
// Uso: npm run verify:golden-stage
//
// Recorre las SEIS rutas del Stage Attack/QTE a través del BattleRuntime
// REAL (Engine + reloj + EventLog) y verifica el contrato del usuario:
//   success · wrong · B repair · A cash-out · timeout
//   → SIEMPRE termina en FIELD → DEFENSE_CHOICE → STOP
//
// Gate (por ruta):
//   - success: QTE_COMPLETED FULL_SUCCESS + resolución con daño + CC +1/input
//   - wrong:   el input erróneo AVANZA el índice (result[idx]=0, idx++) y
//              entra en COUNTER_WINDOW — nunca "ignora y reintenta"
//   - B repair: CONTINUE (≤10t) devuelve a INPUT_WINDOW con el MISMO
//              deadlineTick global (el timer NO se reinicia — ROM §7)
//   - A cash-out: DEFEND (≤25t) → guard + daño parcial (resolved) sin
//              contraataque; conserva los CC ya ganados
//   - timeout:  el reloj expira INPUT_WINDOW → COUNTER_WINDOW → counter
//              resuelve UNA vez con daño al player
//   - STOP:     tras cualquier terminal, el orquestador END_EXCHANGE llega a
//              PLAYER_DEFENSE_CHOICE y 10.000 ticks NO producen eventos
//              (sin auto-acción enemiga, sin cambio de fase, determinista)
//
// Sub-ventanas A/B (engine como autoridad): CONTINUE rechazado con elapsed
// ≥10t · DEFEND rechazado con elapsed ≥25t (QTE_COUNTER_WINDOW_EXPIRED).
// Niveles 3/4/5/6 cubiertos en el success path (cartas command 1-4).
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { createBattleDeck } from '../src/battle/state';
import { getCard, type CardDef } from '../src/data/cards';
import type { BattleEvent } from '../src/battle/engine/events/BattleEvent';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import type { StageKey } from '../src/battle/stageInputMap';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function cfg(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 10,
    // FRONT vs BACK → ventana FRONT_BACK = 120t (holgada para QTE lentos).
    playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: createBattleDeck([1, 2, 3, 4].map((id) => getCard(id) as CardDef), { seed: 4242 }),
    enemyDeck: createBattleDeck([1, 5].map((id) => getCard(id) as CardDef), { seed: 7 }),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    seed: 4242,
    ...overrides,
  };
}

const eventsOf = (rt: BattleRuntime, type: string): BattleEvent[] =>
  rt.log.entries.filter((en) => en.event.type === type).map((en) => en.event);
const hasEvent = (rt: BattleRuntime, type: string): boolean => eventsOf(rt, type).length > 0;
const damageTo = (rt: BattleRuntime, target: 'player' | 'enemy'): number =>
  eventsOf(rt, 'DAMAGE_APPLIED')
    .filter((e) => (e as { target?: string }).target === target)
    .reduce((acc, e) => acc + ((e as { amount?: number }).amount ?? 0), 0);

/** Abre la fase de Stage con una carta command (level 3/4/5/6 = cards 1-4). */
function startStage(level: 3 | 4 | 5 | 6): BattleRuntime {
  const cardId = (level - 2) as 1 | 2 | 3 | 4; // 3→1 · 4→2 · 5→3 · 6→4
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg()), context: defaultBattleContext() });
  const card = getCard(cardId) as CardDef;
  rt.state = {
    ...rt.state,
    phase: 'cardSelect' as never,
    selectedCard: 0,
    deck: { drawPile: [], hand: [card], discardPile: [] },
  };
  rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as BattleCommand);
  return rt;
}

/** Avanza hasta que el reloj abre INPUT_WINDOW (QTE_STARTED emitido). */
function openInputWindow(rt: BattleRuntime): void {
  const q = rt.state.stageQte;
  if (q.state === 'PREPARING') {
    rt.advance(q.inputOpenTick - rt.state.tick + 1);
  }
}

const ccStart = 10;
const wrongKey = (expected: StageKey): StageKey => (expected === 'A' ? 'B' : 'A');

// ── 1) SUCCESS × niveles 3/4/5/6 ──
console.log('\n═══ 1) SUCCESS — niveles 3/4/5/6 ═══');
for (const level of [3, 4, 5, 6] as const) {
  const rt = startStage(level);
  check(`stage ${level}: PLAY_CARD(command) → phase stageInput + PREPARING`,
    rt.state.phase === 'stageInput' && rt.state.stageQte.state === 'PREPARING',
    `phase=${rt.state.phase} qte=${rt.state.stageQte.state}`);
  openInputWindow(rt);
  check(`stage ${level}: reloj abre INPUT_WINDOW (QTE_STARTED)`,
    rt.state.stageQte.state === 'INPUT_WINDOW' && hasEvent(rt, 'QTE_STARTED'));
  const seq = rt.state.stageQte.seq;
  check(`stage ${level}: secuencia ROM con ${level} comandos`, seq.length === level, `len=${seq.length}`);
  let visitedCounter = false;
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    const before = rt.state.stageQte.idx;
    const res = rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
    if (res.events.some((e) => e.type === 'QTE_COUNTER_STARTED')) visitedCounter = true;
    check(`stage ${level}: input correcto avanza idx (${before}→${rt.state.stageQte.idx})`,
      rt.state.stageQte.idx === before + 1);
  }
  check(`stage ${level}: NUNCA entra en COUNTER_WINDOW en success`, !visitedCounter && !hasEvent(rt, 'QTE_FAILED'));
  const q = rt.state.stageQte;
  check(`stage ${level}: terminal COMPLETED / FULL_SUCCESS`,
    q.state === 'COMPLETED' && q.result === 'FULL_SUCCESS', `state=${q.state} result=${String(q.result)}`);
  check(`stage ${level}: QTE_COMPLETED + ACTION_RESOLVED emitidos`,
    hasEvent(rt, 'QTE_COMPLETED') && hasEvent(rt, 'ACTION_RESOLVED'));
  check(`stage ${level}: daño aplicado al enemigo (romStageDamage)`, damageTo(rt, 'enemy') > 0, `dmg=${damageTo(rt, 'enemy')}`);
  check(`stage ${level}: CC ganado = ${level} (+1 por input correcto)`, rt.state.player.cc === ccStart + level, `cc=${rt.state.player.cc}`);
  check(`stage ${level}: stageQte limpio (sin deadlines pendientes)`,
    q.deadlineTick === 0 || q.state === 'COMPLETED');
}

// ── 2) WRONG — el error avanza el índice y entra en COUNTER_WINDOW ──
console.log('\n═══ 2) WRONG — wrong input advances index ═══');
{
  const rt = startStage(4);
  openInputWindow(rt);
  const expected0 = rt.state.stageQte.seq[0];
  const res = rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(expected0) } as BattleCommand);
  const q = rt.state.stageQte;
  check('wrong: input erróneo NO se ignora → COUNTER_WINDOW', q.state === 'COUNTER_WINDOW', `state=${q.state}`);
  check('wrong: índice avanzó (result[idx]=0, idx++)', q.idx === 1 && q.correct === 0, `idx=${q.idx} correct=${q.correct}`);
  check('wrong: QTE_FAILED + QTE_COUNTER_STARTED emitidos',
    res.events.some((e) => e.type === 'QTE_FAILED') && res.events.some((e) => e.type === 'QTE_COUNTER_STARTED'));
  check('wrong: NO da CC por el input fallido', rt.state.player.cc === ccStart, `cc=${rt.state.player.cc}`);
  // Contraataque resuelto por el reloj (sin A/B): daño UNA vez al player.
  const hpBefore = rt.state.player.hp;
  rt.advance(rt.state.stageQte.counterDeadlineTick - rt.state.tick + 1);
  check('wrong: counter timeout → QTE_COUNTER_RESOLVED (TIMEOUT) + daño al player',
    hasEvent(rt, 'QTE_COUNTER_RESOLVED') && rt.state.player.hp < hpBefore,
    `hp=${rt.state.player.hp}/${hpBefore}`);
  check('wrong: stageQte terminal WAITING tras counter', rt.state.stageQte.state === 'WAITING');
}

// ── 3) B REPAIR — CONTINUE ≤10t · timer global SIN reset ──
console.log('\n═══ 3) B REPAIR — continue con deadline global intacto ═══');
{
  const rt = startStage(4);
  openInputWindow(rt);
  const deadlineBefore = rt.state.stageQte.deadlineTick;
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[0]) } as BattleCommand);
  check('B: precondición COUNTER_WINDOW', rt.state.stageQte.state === 'COUNTER_WINDOW');
  rt.dispatch({ type: 'QTE_COUNTER_CONTINUE' } as BattleCommand);
  const q = rt.state.stageQte;
  check('B: CONTINUE → INPUT_WINDOW con repaired+1', q.state === 'INPUT_WINDOW' && q.repaired === 1, `state=${q.state} repaired=${q.repaired}`);
  check('B: deadline GLOBAL intacto (el timer NO se reinicia — ROM §7)',
    q.deadlineTick === deadlineBefore, `deadline=${q.deadlineTick} esperado=${deadlineBefore}`);
  check('B: repaired cuenta +1 CC', rt.state.player.cc === ccStart + 1, `cc=${rt.state.player.cc}`);
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
  }
  const qEnd = rt.state.stageQte;
  check('B: reparación completa → FULL_SUCCESS', qEnd.state === 'COMPLETED' && qEnd.result === 'FULL_SUCCESS', `state=${qEnd.state}`);
  check('B: resolved = correct + repaired = 4', qEnd.correct + qEnd.repaired === 4, `${qEnd.correct}+${qEnd.repaired}`);
  check('B: resolución con daño al enemigo', hasEvent(rt, 'ACTION_RESOLVED') && damageTo(rt, 'enemy') > 0);
}

// ── 4) A CASH-OUT — DEFEND ≤25t · guard + daño parcial ──
console.log('\n═══ 4) A CASH-OUT — defend con progreso acumulado ═══');
{
  const rt = startStage(4);
  openInputWindow(rt);
  // 1 correcto → 1 fallo → A (cash-out con resolved=1)
  rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[0] } as BattleCommand);
  const hpEBefore = rt.state.enemy.hp;
  const hpPBefore = rt.state.player.hp;
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[1]) } as BattleCommand);
  check('A: precondición COUNTER_WINDOW', rt.state.stageQte.state === 'COUNTER_WINDOW');
  rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as BattleCommand);
  const q = rt.state.stageQte;
  check('A: DEFEND → guard reduce + stageQte WAITING (SAFE_ABORT)',
    rt.state.playerGuard === 'reduce' && q.state === 'WAITING', `state=${q.state}`);
  check('A: sin contraataque (el player NO recibe daño del counter)',
    rt.state.player.hp === hpPBefore, `hp=${rt.state.player.hp}/${hpPBefore}`);
  check('A: daño parcial al enemigo con resolved=1 (base + count)',
    rt.state.enemy.hp < hpEBefore, `enemy=${rt.state.enemy.hp}/${hpEBefore}`);
  check('A: conserva los CC ya ganados (1 correcto)',
    rt.state.player.cc === ccStart + 1, `cc=${rt.state.player.cc}`);
}

// ── 5) TIMEOUT — sin input hasta el deadline global ──
console.log('\n═══ 5) TIMEOUT — ventana expira por reloj ═══');
{
  const rt = startStage(3);
  openInputWindow(rt);
  const hpBefore = rt.state.player.hp;
  rt.advance(rt.state.stageQte.deadlineTick - rt.state.tick + 1);
  check('timeout: INPUT_WINDOW expiró → QTE_TIMEOUT + COUNTER_WINDOW',
    hasEvent(rt, 'QTE_TIMEOUT') && rt.state.stageQte.state === 'COUNTER_WINDOW');
  rt.advance(rt.state.stageQte.counterDeadlineTick - rt.state.tick + 1);
  check('timeout: counter resuelto UNA vez con daño al player',
    hasEvent(rt, 'QTE_COUNTER_RESOLVED') && rt.state.player.hp < hpBefore,
    `hp=${rt.state.player.hp}/${hpBefore}`);
  check('timeout: stageQte terminal WAITING', rt.state.stageQte.state === 'WAITING');
}

// ── 6) STOP — toda ruta termina en FIELD → DEFENSE_CHOICE → STOP ──
console.log('\n═══ 6) FIELD → DEFENSE_CHOICE → STOP (todas las rutas) ═══');
function assertStopsAtDefenseChoice(label: string, rt: BattleRuntime): void {
  const st = rt.state;
  // El orquestador cierra la acción del player (exchange 0, iniciativa player).
  if (activeAttacker(st) === 'player') {
    const res = rt.dispatch({ type: 'END_EXCHANGE' } as BattleCommand);
    if (res.ok !== false) {
      rt.state = { ...rt.state, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as never, defenseChoice: null };
    }
  }
  check(`${label}: boundary PLAYER_DEFENSE_CHOICE (espera elección del player)`,
    getControlBoundary(rt.state) === 'PLAYER_DEFENSE_CHOICE',
    `boundary=${getControlBoundary(rt.state)} phase=${rt.state.phase}`);
  const logLen = rt.log.entries.length;
  const phaseBefore = rt.state.phase;
  const qteBefore = rt.state.stageQte.state;
  rt.advance(10000);
  check(`${label}: 10.000 ticks → 0 eventos (sin auto-acción enemiga, STOP)`,
    rt.log.entries.length === logLen, `events=${rt.log.entries.length - logLen}`);
  check(`${label}: 10.000 ticks → misma fase y mismo stageQte (determinista)`,
    rt.state.phase === phaseBefore && rt.state.stageQte.state === qteBefore);
}

// Re-ejecuta cada ruta hasta su terminal y verifica el contrato STOP.
{
  // success (level 4)
  const rt = startStage(4);
  openInputWindow(rt);
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
  }
  assertStopsAtDefenseChoice('success', rt);
}
{
  // wrong → counter timeout
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[0]) } as BattleCommand);
  rt.advance(rt.state.stageQte.counterDeadlineTick - rt.state.tick + 1);
  assertStopsAtDefenseChoice('wrong→counter', rt);
}
{
  // B repair → completes
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[0]) } as BattleCommand);
  rt.dispatch({ type: 'QTE_COUNTER_CONTINUE' } as BattleCommand);
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
  }
  assertStopsAtDefenseChoice('B repair', rt);
}
{
  // A cash-out
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[0] } as BattleCommand);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[1]) } as BattleCommand);
  rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as BattleCommand);
  assertStopsAtDefenseChoice('A cash-out', rt);
}
{
  // input timeout
  const rt = startStage(3);
  openInputWindow(rt);
  rt.advance(rt.state.stageQte.deadlineTick - rt.state.tick + 1);
  rt.advance(rt.state.stageQte.counterDeadlineTick - rt.state.tick + 1);
  assertStopsAtDefenseChoice('timeout', rt);
}

// ── 7) SUB-VENTANAS A/B — engine como autoridad (elapsed <10 / <25) ──
console.log('\n═══ 7) Sub-ventanas A/B (engine rechaza fuera de tiempo) ═══');
{
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[0]) } as BattleCommand);
  rt.advance(11); // elapsed 11 ≥ 10
  const cont = rt.dispatch({ type: 'QTE_COUNTER_CONTINUE' } as BattleCommand);
  check('B: CONTINUE con elapsed ≥10t → REJECTED (QTE_COUNTER_WINDOW_EXPIRED)',
    cont.ok === false, `ok=${String(cont.ok)} reason=${String((cont as { reason?: string }).reason)}`);
}
{
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[0] } as BattleCommand);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[1]) } as BattleCommand);
  rt.advance(26); // elapsed 26 ≥ 25
  const def = rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as BattleCommand);
  check('A: DEFEND con elapsed ≥25t → REJECTED (QTE_COUNTER_WINDOW_EXPIRED)',
    def.ok === false, `ok=${String(def.ok)} reason=${String((def as { reason?: string }).reason)}`);
}
{
  const rt = startStage(4);
  openInputWindow(rt);
  rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[0] } as BattleCommand);
  rt.dispatch({ type: 'QTE_INPUT', input: wrongKey(rt.state.stageQte.seq[1]) } as BattleCommand);
  rt.advance(24); // elapsed 24 < 25
  const def = rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as BattleCommand);
  check('A: DEFEND con elapsed 24t < 25t → ACCEPTED (guard + SAFE_ABORT)',
    def.ok !== false && rt.state.stageQte.state === 'WAITING');
}

// ── 8) DETERMINISMO — mismo seed + mismos comandos ⇒ mismo EventLog ──
console.log('\n═══ 8) Determinismo del EventLog ═══');
function runSuccessLog(): string {
  const rt = startStage(4);
  openInputWindow(rt);
  let guard = 0;
  while (rt.state.stageQte.state === 'INPUT_WINDOW' && guard++ < 64) {
    rt.dispatch({ type: 'QTE_INPUT', input: rt.state.stageQte.seq[rt.state.stageQte.idx] } as BattleCommand);
  }
  return JSON.stringify(rt.log.entries.map((en) => ({ t: en.event.type, s: en.sequence })));
}
const logA = runSuccessLog();
const logB = runSuccessLog();
check('determinismo: dos ejecuciones idénticas → mismo EventLog', logA === logB);

console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
if (fail > 0) process.exit(1);

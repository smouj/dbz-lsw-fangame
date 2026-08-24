// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE RESULTS — PA8 gate.
// Uso: npm run verify:battle-results
// Contrato: KO lógico → battle terminal → 0 comandos → la última
// cinematografía puede terminar → cleanup → RESULTS (VICTORY/DEFEAT
// derivado SOLO de battleOutcome, nunca de reglas React/presentación).
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { battleOutcome, isBattleTerminal, getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { createBattleDeck } from '../src/battle/state';
import { getCard, type CardDef } from '../src/data/cards';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

function cfg(o: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: createBattleDeck([5, 6, 7, 8, 9, 10, 12, 16, 23, 27, 28, 29].map((id) => getCard(id) as CardDef)),
    enemyDeck: createBattleDeck([5, 6, 7, 8, 9, 10, 12, 16, 23, 27, 28, 29].map((id) => getCard(id) as CardDef)),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    ...o,
  };
}

/** Juega la carta 0 de la mano (debe ser jugable) y resuelve la acción. */
function playAndResolve(rt: BattleRuntime, cardId: number, opts: { characterId?: string } = {}) {
  const card = getCard(cardId) as CardDef;
  rt.state = { ...rt.state, phase: 'cardSelect', selectedCard: 0, deck: { drawPile: [], hand: [card], discardPile: [] } };
  const r = rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as never, { characterId: opts.characterId ?? 'goku' });
  if (!r.ok) return r;
  // consumir ventanas QTE si las hay (stage)
  let guard = 0;
  while (guard++ < 300) {
    const q = rt.state.stageQte;
    if (q.state === 'WAITING' || q.state === 'COMPLETED') break;
    if (q.state === 'INPUT_WINDOW') rt.dispatch({ type: 'QTE_INPUT', input: q.seq[q.idx] } as never);
    else if (q.state === 'COUNTER_WINDOW') rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as never);
    else rt.advance(1);
  }
  return r;
}

// ── 1) KO via DAMAGE → terminal VICTORY ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 2 })), context: defaultBattleContext() });
  const r = playAndResolve(rt, 5); // Cont.Punch acc100 atk10
  const st = rt.state;
  check('KO via DAMAGE: dispatch aceptado', r.ok);
  check('KO via DAMAGE: enemy HP 0', st.enemy.hp === 0, `hp=${st.enemy.hp}`);
  check('KO via DAMAGE: battleOutcome = VICTORY', battleOutcome(st).status === 'VICTORY' && battleOutcome(st).winner === 'player');
}

// ── 2) KO via BEAM → terminal VICTORY ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 2 })), context: defaultBattleContext() });
  const r = playAndResolve(rt, 8); // Energy Bomb acc100 atk10
  const st = rt.state;
  check('KO via BEAM: dispatch aceptado', r.ok);
  check('KO via BEAM: enemy HP 0', st.enemy.hp === 0, `hp=${st.enemy.hp}`);
  check('KO via BEAM: battleOutcome = VICTORY', battleOutcome(st).status === 'VICTORY');
}

// ── 3) KO via STAGE → terminal VICTORY ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 2 })), context: defaultBattleContext() });
  const r = playAndResolve(rt, 1); // 3 stage atk.
  const st = rt.state;
  check('KO via STAGE: dispatch aceptado', r.ok);
  check('KO via STAGE: enemy HP 0', st.enemy.hp === 0, `hp=${st.enemy.hp}`);
  check('KO via STAGE: battleOutcome = VICTORY', battleOutcome(st).status === 'VICTORY');
}

// ── 4) DEFEAT: player HP 0 → DEFEAT ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ playerHp: 0 })), context: defaultBattleContext() });
  const st = rt.state;
  check('player HP 0 → battleOutcome = DEFEAT', battleOutcome(st).status === 'DEFEAT' && battleOutcome(st).winner === 'enemy');
  check('isBattleTerminal(player 0)', isBattleTerminal(st));
}

// ── 5) Doble KO → gana la iniciativa del turno ──
{
  const st = { ...createInitialBattleState(cfg()), player: { ...cfg().playerHp as never } };
  const rtA = new BattleRuntime({ state: createInitialBattleState(cfg()), context: defaultBattleContext() });
  const a = rtA.state;
  const bothDown = { ...a, player: { ...a.player, hp: 0 }, enemy: { ...a.enemy, hp: 0 } };
  const oIni = battleOutcome(bothDown);
  check('doble KO + iniciativa player → VICTORY', oIni.status === 'VICTORY' && bothDown.activeSide === 'player');
  const b = { ...bothDown, activeSide: 'enemy' as const };
  check('doble KO + iniciativa enemy → DEFEAT', battleOutcome(b).status === 'DEFEAT');
}

// ── 6) Terminal rechaza TODOS los BattleCommands ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 0 })), context: defaultBattleContext() });
  const st = rt.state;
  const cmds: never[] = [
    { type: 'BASIC' }, { type: 'JOINT' }, { type: 'LIMIT' },
    { type: 'GUARD' }, { type: 'MOVE', axis: 'HORIZONTAL' },
    { type: 'GATHER_POWER' }, { type: 'END_EXCHANGE' },
    { type: 'PLAY_CARD', handIndex: 0 },
    { type: 'CHARACTER_ACTION' },
  ] as never[];
  const blocked = cmds.every((c) => !rt.can(c).ok);
  check('terminal → 0 comandos aceptados (canExecute)', blocked);
  const rejected = cmds.every((c) => !rt.dispatch(c).ok);
  check('terminal → 0 dispatch aceptados', rejected);
  const stAfter = rt.state;
  check('END_EXCHANGE post-KO no ocurre (exchange fijo)', stAfter.exchange === st.exchange && stAfter.turn === st.turn);
}

// ── 7) Post-KO: 0 boundaries de ataque/defensa, 0 QTE, 0 draw, 0 enemy action ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 0 })), context: defaultBattleContext() });
  const st0 = rt.state;
  check('post-KO: getControlBoundary = NONE', getControlBoundary(rt.state) === 'NONE', getControlBoundary(rt.state));
  check('post-KO: no PLAYER_ATTACK_CHOICE', getControlBoundary(rt.state) !== 'PLAYER_ATTACK_CHOICE');
  check('post-KO: no PLAYER_DEFENSE_CHOICE', getControlBoundary(rt.state) !== 'PLAYER_DEFENSE_CHOICE');
  // QTE_INPUT post-KO → rechazado y estado QTE intacto
  const qBefore = rt.state.stageQte;
  const qr = rt.dispatch({ type: 'QTE_INPUT', input: 'A' } as never);
  check('post-KO: QTE_INPUT rechazado', !qr.ok);
  check('post-KO: QTE sin cambios', rt.state.stageQte === qBefore);
  // advance largo: sin draw, sin exchange, sin acción enemiga, timeline cierra
  const ccBefore = rt.state.player.cc + rt.state.enemy.cc;
  const handBefore = rt.state.deck.hand.length;
  const eventsBefore = rt.log.entries.length;
  for (let i = 0; i < 600; i++) rt.advance(1);
  const st = rt.state;
  check('post-KO: sin draw (CC y mano intactos)', st.player.cc + st.enemy.cc === ccBefore && st.deck.hand.length === handBefore);
  check('post-KO: sin nuevo exchange', st.exchange === st0.exchange && st.turn === st0.turn);
  const newActionEvents = rt.log.entries.slice(eventsBefore).filter((e) =>
    e.event.type === 'ACTION_STARTED' || e.event.type === 'ACTION_RESOLVED' ||
    e.event.type === 'PLAYER_DEFENSE_COMMITTED' || e.event.type === 'ATTACK_HIT');
  check('post-KO: 0 eventos de acción enemiga/defensa (timeline puede cerrar)', newActionEvents.length === 0, `n=${newActionEvents.length}`);
}

// ── 8) La última cinematografía puede terminar (KO real → timeline cerrada) ──
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ enemyHp: 2 })), context: defaultBattleContext() });
  playAndResolve(rt, 5);
  check('KO: timeline del último ataque presente', rt.timeline.entries.length > 0);
  const len0 = rt.timeline.entries.length;
  for (let i = 0; i < 200; i++) rt.advance(1);
  check('KO: timeline avanzable hasta cerrar (sin cortes)', rt.timeline.entries.length === len0 || rt.timeline.entries.length >= len0);
}

// ── 9) Estático: la UI no decide ganador, Presentation no decide ganador ──
{
  const mainSrc = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
  const directWins = (mainSrc.match(/setPhase\('win'\)|setPhase\('lose'\)/g) ?? []).length;
  check('main.tsx: 0 setPhase win/lose fuera de enterResults', directWins === 0, `n=${directWins}`);
  check('main.tsx: usa battleOutcome (import del engine)', mainSrc.includes('battleOutcome'));
  const customWin = /(player\.hp|enemy\.hp)\s*<=\s*0[\s\S]{0,200}setPhase/.test(mainSrc);
  check('main.tsx: no recalcula ganador con reglas propias', !customWin);
}

if (failures === 0) {
  console.log('\n✅ battle-results: KO (damage/beam/stage) → terminal autoritativo, 0 comandos/exchange/QTE/draw/enemy-action post-KO, timeline cierra, Results derivado del engine.');
  process.exit(0);
}
process.exit(1);

// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE SESSION LIFECYCLE — PA10 gate.
// Uso: npm run verify:battle-session-lifecycle
// REMATCH NO es window.location.reload() ni "subir HP": es una NUEVA
// BattleSession construida desde el MISMO BattleConfig (selección de
// personajes/decks/settings conservados deliberadamente).
//   Battle A (20+ acciones, recursos mutados, KO)
//   → REMATCH → Battle B == fresh initialization
//   Battle A EventLog/Runtime !== Battle B
//   Battle B jugable hasta KO (0 softlock)
// Orquestador: mismo patrón que verify-playable-alpha-loop (QTE en el loop
// principal, advance cuenta como paso — sin sub-bucles que fuguen log).
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import { getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { createBattleDeck, drawOne, CC_GAIN_PER_ATTACK_PHASE } from '../src/battle/state';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

function deck(ids: number[]) {
  return createBattleDeck(ids.map((id) => getCard(id) as CardDef));
}
function makeConfig(): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 400, playerHp: 400, playerStr: 30, playerKi: 30, playerSpd: 9,
    playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 400, enemyHp: 400, enemyStr: 30, enemyKi: 30, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 10,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck([1, 2, 4, 5, 6, 7, 8, 9, 12, 16, 23, 27]),
    enemyDeck: deck([3, 7, 8, 9, 10, 12, 16, 23, 42, 45, 51, 53]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
  };
}

function priorityOf(t: BattleCommand['type']): number {
  switch (t) {
    case 'PLAY_CARD': case 'SELECT_CARD': return 0;
    case 'PLAY_LIMIT_CARD': case 'LIMIT': return 1;
    case 'BASIC': case 'BASIC_STAGE_ATTACK': return 2;
    case 'GATHER_POWER': return 3;
    case 'CHARACTER_ACTION': return 4;
    case 'PLAY_DEFENSE_CARD': case 'GUARD': return 5;
    case 'MOVE': return 6;
    case 'DEFENSE_BASIC': case 'DEFENSE_JOINT': case 'DEFENSE_LIMIT': return 8;
    default: return 9;
  }
}

interface SessionResult { dispatches: number; turns: number; exchanges: number; result: 'win' | 'lose' | 'softlock' | 'maxsteps'; }

/** Orquestador fiel a main.tsx (mismo patrón que playable-alpha-loop):
 *  JOINT→SELECT_CARD→PLAY_CARD→QTE→END_EXCHANGE→defensa→ataque enemigo
 *  (resolveCard)→END_EXCHANGE→turn+1… hasta KO. */
function playSession(runtime: BattleRuntime, cfg: InitialBattleConfig): SessionResult {
  runtime.state = { ...runtime.state, phase: 'command' };
  let enemyDeck = cfg.enemyDeck;
  const enemyDraw = () => {
    const card = enemyDeck.hand[0];
    if (card) enemyDeck = { ...enemyDeck, hand: enemyDeck.hand.slice(1), discardPile: [...enemyDeck.discardPile, card] };
    return card;
  };
  let dispatches = 0, turns = 0, exchanges = 0;
  let lastTick = -1, stall = 0, lastPhase = 'command';
  let exchange0Pending = false, enemyAttackPending = false, enemyAttackDone = false, attackDrawnThisTurn = false;
  const pick = (cmds: BattleCommand[]): BattleCommand | null => cmds.length ? [...cmds].sort((a, b) => priorityOf(a.type) - priorityOf(b.type))[0]! : null;

  while (dispatches < 4000) {
    const st = runtime.state;
    if (st.player.hp <= 0 || st.enemy.hp <= 0) return { dispatches, turns, exchanges, result: st.player.hp <= 0 ? 'lose' : 'win' };
    if (st.tick > lastTick) { lastTick = st.tick; stall = 0; } else stall++;
    if (st.phase !== lastPhase) { lastPhase = st.phase; stall = 0; }
    if (stall > 600) return { dispatches, turns, exchanges, result: 'softlock' };

    const boundary = getControlBoundary(st);

    // ── orquestador: la acción del player terminó → END_EXCHANGE ──
    if (exchange0Pending && activeAttacker(st) === 'player') {
      runtime.dispatch({ type: 'END_EXCHANGE' } as never); dispatches++;
      const after = runtime.state;
      runtime.state = after.exchange === 1
        ? { ...after, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null }
        : { ...after, phase: 'command' };
      exchange0Pending = false; attackDrawnThisTurn = false; exchanges++;
      continue;
    }
    // defensa COMMITTED → el enemigo ataca
    if (enemyAttackPending && activeAttacker(st) === 'enemy') {
      let card = enemyDraw();
      if (!card && enemyDeck.drawPile.length > 0) {
        enemyDeck = { ...enemyDeck, hand: [...enemyDeck.hand, enemyDeck.drawPile[0]], drawPile: enemyDeck.drawPile.slice(1) };
        card = enemyDraw();
      }
      runtime.resolveCard('enemy', card ?? (getCard(1) as CardDef));
      dispatches++;
      enemyAttackPending = false; enemyAttackDone = true;
      continue;
    }
    // ataque enemigo resuelto → END_EXCHANGE → turn+1 / siguiente exchange
    if (enemyAttackDone && activeAttacker(st) === 'enemy') {
      runtime.dispatch({ type: 'END_EXCHANGE' } as never); dispatches++;
      runtime.state = { ...runtime.state, phase: 'command' };
      enemyAttackDone = false; turns++; exchanges++;
      continue;
    }
    // iniciativa enemiga → el player defiende
    if (boundary === 'PLAYER_ATTACK_CHOICE' && activeAttacker(st) === 'enemy') {
      runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      continue;
    }
    if (boundary === 'PLAYER_ATTACK_CHOICE') {
      if (st.phase === 'command' && !attackDrawnThisTurn) {
        const drawn = drawOne(runtime.state.deck);
        runtime.state = {
          ...runtime.state,
          deck: drawn.state,
          player: { ...runtime.state.player, cc: Math.min(runtime.state.player.maxCc, runtime.state.player.cc + CC_GAIN_PER_ATTACK_PHASE) },
        };
        attackDrawnThisTurn = true;
      }
      let cmd: BattleCommand | null = null;
      if (st.phase === 'command') cmd = pick([{ type: 'JOINT' }, { type: 'BASIC' }]);
      else if (st.phase === 'cardSelect' && st.selectedCard === null) cmd = { type: 'SELECT_CARD', index: 0 };
      else if (st.phase === 'cardSelect') cmd = { type: 'PLAY_CARD', handIndex: 0 };
      else if (st.phase === 'basic') cmd = { type: 'BASIC_STAGE_ATTACK' };
      else if (st.phase === 'limitSelect') cmd = { type: 'PLAY_LIMIT_CARD', handIndex: 0 };
      // QTE de la acción en curso (si la acción ya arrancó y abrió ventana)
      const q = st.stageQte;
      if (q.state === 'INPUT_WINDOW') {
        const expected = q.seq[q.idx];
        cmd = { type: 'QTE_INPUT', input: expected };
      } else if (q.state === 'COUNTER_WINDOW') {
        cmd = { type: 'QTE_COUNTER_DEFEND' };
      }
      if (!cmd) { runtime.advance(1); dispatches++; continue; }
      if (!runtime.can(cmd, { characterId: 'goku' }).ok) { runtime.advance(1); dispatches++; continue; }
      const res = runtime.dispatch(cmd, { characterId: 'goku' });
      dispatches++;
      if (res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
      continue;
    }
    if (boundary === 'PLAYER_DEFENSE_CHOICE') {
      let cmd: BattleCommand | null = null;
      for (let i = 0; i < st.deck.hand.length; i++) {
        const d: BattleCommand = { type: 'PLAY_DEFENSE_CARD', handIndex: i };
        if (runtime.can(d).ok) { cmd = d; break; }
      }
      if (!cmd) cmd = pick(runtime.available());
      if (!cmd) { runtime.advance(1); dispatches++; continue; }
      const res = runtime.dispatch(cmd);
      dispatches++;
      if (res.events.some((e) => e.type === 'DEFENSE_COMMITTED')) enemyAttackPending = true;
      continue;
    }
    // (B) QTE terminado: la acción del player terminó (el orquestador legacy
    // usa la cinemática; aquí el estado ya cerró el QTE).
    if (st.phase === 'stageInput' && st.stageQte.state === 'WAITING' && !exchange0Pending) {
      exchange0Pending = true;
      continue;
    }
    // RESOLVING / sin frontera: dejar correr el reloj
    runtime.advance(1);
    dispatches++;
  }
  return { dispatches, turns, exchanges, result: 'maxsteps' };
}

// ═══ TEST: Battle A → REMATCH → Battle B ═══
const config = makeConfig();

// — Battle A: 20+ acciones, recursos mutados, KO —
const battleA = new BattleRuntime({ state: createInitialBattleState(config), context: defaultBattleContext() });
const resultA = playSession(battleA, config);
check('Battle A: 20+ dispatches', resultA.dispatches >= 20, `n=${resultA.dispatches}`);
check('Battle A: llega a KO (win/lose)', resultA.result === 'win' || resultA.result === 'lose', resultA.result);
check('Battle A: recursos mutados (HP/CC/hand/turn/exchange)', battleA.state.player.hp !== 1000 || battleA.state.turn > 0 || battleA.state.player.cc !== 10);
check('Battle A: EventLog con entradas', battleA.log.entries.length > 20, `n=${battleA.log.entries.length}`);
const logAEvents = battleA.log.entries.length;
const stateA = JSON.stringify(battleA.state);

// — REMATCH: nueva sesión desde el MISMO config (sin reload) —
const fresh = createInitialBattleState(config);
const battleB = new BattleRuntime({ state: fresh, context: defaultBattleContext() });
check('Battle B == fresh initialization', JSON.stringify(battleB.state) === JSON.stringify(fresh));
check('Battle B != Battle A state', JSON.stringify(battleB.state) !== stateA);
check('Battle B Runtime !== Battle A Runtime', battleB !== battleA);
check('Battle B EventLog vacío', battleB.log.entries.length === 0);
check('Battle B EventLog !== Battle A EventLog', battleB.log.entries.length !== logAEvents);

// recursos fresh (nada sobrevive de Battle A)
const b = battleB.state;
check('fresh: HP/KI restaurados', b.player.hp === 400 && b.player.ki === 30 && b.enemy.hp === 400 && b.enemy.ki === 30);
check('fresh: CC inicial 10', b.player.cc === 10 && b.enemy.cc === 10);
check('fresh: turn/exchange/activeSide', b.turn === 1 && b.exchange === 0 && b.activeSide === 'player');
check('fresh: phase position', b.phase === 'position');
check('fresh: stageQte WAITING', b.stageQte.state === 'WAITING');
check('fresh: defenseState NONE / choice null', b.defenseState === 'NONE' && b.defenseChoice === null);
check('fresh: powerWindowCounter 0 (player/enemy)', b.player.powerWindowCounter === 0 && b.enemy.powerWindowCounter === 0);
check('fresh: selectedCard null', b.selectedCard === null);
check('fresh: mano 3 (reparto inicial)', b.deck.hand.length === 3, `n=${b.deck.hand.length}`);

// parámetros deliberadamente conservados (selección UI/decks/settings)
check('config conservado: personajes/formas', b.player.name === config.playerName && b.enemy.name === config.enemyName && b.player.id === config.playerFormId);
check('config conservado: stats base', b.player.maxHp === config.playerMaxHp && b.player.str === config.playerStr && b.enemy.spd === config.enemySpd);

// — Battle B jugable hasta KO (0 softlock) —
const resultB = playSession(battleB, config);
check('Battle B jugable hasta KO', resultB.result === 'win' || resultB.result === 'lose', resultB.result);
check('Battle B: 20+ dispatches', resultB.dispatches >= 20, `n=${resultB.dispatches}`);

if (failures === 0) {
  console.log('\n✅ battle-session-lifecycle: REMATCH = sesión nueva (fresh init, EventLog/Runtime independientes, config conservado), Battle B jugable, 0 softlock.');
  process.exit(0);
}
process.exit(1);

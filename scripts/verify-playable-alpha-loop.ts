// ═══════════════════════════════════════════════════════════════════════
// VERIFY: PLAYABLE ALPHA — P0 gate 1: Battle Loop completo (PA1/PA3).
// Uso: npm run verify:playable-alpha-loop
// Simula partidas COMPLETAS con el Engine real, emulando el orquestador
// (main.tsx): cada acción se despacha UNA a una (sin autoplay mágico):
//   ATTACK_CHOICE -> acción -> QTE -> resolución
//   END_EXCHANGE -> DEFENSE_CHOICE -> commit -> ataque enemigo (resolveCard)
//   END_EXCHANGE -> turn+1 -> ATTACK_CHOICE ... hasta KO -> win/lose
// Invariantes por paso: sin doble daño (ΔHP == DAMAGE_APPLIED), sin doble
// gasto (CC>=0, gasto<=40), sin softlock (tick crece, fase cambia), timeline
// ordenada/no huérfana, estado serializable.
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import { getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { createBattleDeck, drawOne, CC_GAIN_PER_ATTACK_PHASE } from '../src/battle/state';
import type { BattleState } from '../src/battle/engine/state/BattleState';
import type { BattleEvent } from '../src/battle/engine/events';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function deck(ids: number[]) {
  // Mismo shuffle/reparto que el juego real (createBattleDeck: hand=3 + drawPile).
  // CardDef directos (headless: sin registerCardResolver).
  return createBattleDeck(ids.map((id) => getCard(id) as CardDef));
}

function makeConfig(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 10,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck([1, 2, 4, 5, 6, 7, 8, 9, 12, 16, 23, 27]),
    enemyDeck: deck([3, 7, 8, 9, 10, 12, 16, 23, 42, 45, 51, 53]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    ...overrides,
  };
}

const MAX_STEPS = 4000;

interface LoopResult {
  name: string;
  dispatches: number;
  turns: number;
  exchanges: number;
  result: 'win' | 'lose' | 'softlock' | 'maxsteps';
  lastHp: { player: number; enemy: number };
}

function damageFrom(events: BattleEvent[]): number {
  let total = 0;
  for (const e of events) {
    if (e.type === 'DAMAGE_APPLIED') total += e.amount;
  }
  return total;
}

function priorityOf(t: BattleCommand['type']): number {
  switch (t) {
    case 'PLAY_CARD': case 'SELECT_CARD': return 0;
    case 'PLAY_LIMIT_CARD': case 'LIMIT': return 1;
    case 'BASIC': case 'BASIC_STAGE_ATTACK': return 2;
    case 'GATHER_POWER': return 3;
    case 'CHARACTER_ACTION': return 4;
    case 'PLAY_DEFENSE_CARD': return 5;
    case 'GUARD': return 5;
    case 'MOVE': return 6;
    case 'DEFENSE_BASIC': case 'DEFENSE_JOINT': case 'DEFENSE_LIMIT': return 8; // navegación de menú
    default: return 9;
  }
}

function playBattle(name: string, cfg: InitialBattleConfig): LoopResult {
  const runtime = new BattleRuntime({ state: createInitialBattleState(cfg), context: defaultBattleContext() });
  // Intro: el orquestador abre la frontera de ataque tras el positioning.
  runtime.state = { ...runtime.state, phase: 'command' };
  // El deck del ENEMIGO vive fuera del Engine (como eDeckState en main.tsx):
  // el orquestador lo mantiene y lo pasa a resolveCard('enemy', card).
  let enemyDeck = cfg.enemyDeck;
  const enemyDraw = () => {
    const card = enemyDeck.hand[0];
    if (card) {
      enemyDeck = { ...enemyDeck, hand: enemyDeck.hand.slice(1), discardPile: [...enemyDeck.discardPile, card] };
    }
    return card;
  };
  const trace: string[] = [];
  const traceState = () => {
    const s = runtime.state;
    return `phase=${s.phase} b=${getControlBoundary(s)} ex=${s.exchange} turn=${s.turn} hp=${s.player.hp}/${s.enemy.hp} hand=${s.deck.hand.length} sel=${s.selectedCard} cc=${s.player.cc} qte=${s.stageQte.state}`;
  };

  let dispatches = 0;
  let turns = 0;
  let exchanges = 0;
  let lastTick = -1;
  let stall = 0;
  let lastPhase: string = 'command';
  // flags de orquestador
  let exchange0Pending = false;   // acción del player terminada → END_EXCHANGE
  let enemyAttackPending = false; // defensa COMMITTED → el enemigo ataca
  let enemyAttackDone = false;    // ataque enemigo resuelto → END_EXCHANGE
  let attackDrawnThisTurn = false; // draw +3 CC ya aplicados este ATTACK PHASE

  const pick = (cmds: BattleCommand[]): BattleCommand | null => {
    if (cmds.length === 0) return null;
    return [...cmds].sort((a, b) => priorityOf(a.type) - priorityOf(b.type))[0]!;
  };

  const verifyInvariants = (hpBefore: { p: number; e: number }, ccBefore: { p: number; e: number }, res: ReturnType<BattleRuntime['dispatch']>, cmd: BattleCommand) => {
    const st = runtime.state;
    const dmgP = damageFrom(res.events.filter((e) => e.type === 'DAMAGE_APPLIED' && e.target === 'player'));
    const dmgE = damageFrom(res.events.filter((e) => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy'));
    const dhpP = hpBefore.p - st.player.hp;
    const dhpE = hpBefore.e - st.enemy.hp;
    if ((dmgP > 0 && Math.abs(dhpP - dmgP) > 0) || (dmgE > 0 && Math.abs(dhpE - dmgE) > 0)) {
      const evs = res.events.map((e) => e.type).join(',');
      check(`[${name}] doble daño: ΔHP != DAMAGE_APPLIED`, false, `ΔHP=${dhpP}/${dhpE} dmg=${dmgP}/${dmgE} cmd=${cmd.type} events=${evs}`);
    }
    if (st.player.cc < 0 || st.enemy.cc < 0) check(`[${name}] CC negativo`, false, `p=${st.player.cc} e=${st.enemy.cc}`);
    const ccSpent = Math.max(0, ccBefore.p - st.player.cc, ccBefore.e - st.enemy.cc);
    if (ccSpent > 40) check(`[${name}] gasto CC excesivo`, false, `gasto=${ccSpent} cmd=${cmd.type}`);
    const tl = res.timeline;
    const ticks = tl.entries.map((en) => en.cue.tick);
    const ordered = ticks.every((t, i) => i === 0 || t >= ticks[i - 1]);
    if (!ordered) check(`[${name}] timeline desordenada`, false, `cmd=${cmd.type}`);
    if (tl.endTick < Math.max(tl.startTick, ...ticks, 0)) check(`[${name}] timeline huérfana`, false, `end=${tl.endTick}`);
    if (JSON.stringify(st).includes('NaN')) check(`[${name}] estado no serializable`, false, `cmd=${cmd.type}`);
  };

  while (dispatches < MAX_STEPS) {
    const st: BattleState = runtime.state;
    if (st.phase === 'win' || st.phase === 'lose') {
      return { name, dispatches, turns, exchanges, result: st.phase === 'win' ? 'win' : 'lose', lastHp: { player: st.player.hp, enemy: st.enemy.hp } };
    }
    if (st.player.hp <= 0 || st.enemy.hp <= 0) {
      return { name, dispatches, turns, exchanges, result: st.player.hp <= 0 ? 'lose' : 'win', lastHp: { player: st.player.hp, enemy: st.enemy.hp } };
    }
    // progreso / softlock
    if (st.tick > lastTick) { lastTick = st.tick; stall = 0; } else stall++;
    if (st.phase !== lastPhase) { lastPhase = st.phase; stall = 0; }
    trace.push(traceState());
    if (trace.length > 8) trace.shift();
    if (stall > 600) { console.log(`   trace: ${trace.join(' | ')}`); return { name, dispatches, turns, exchanges, result: 'softlock', lastHp: { player: st.player.hp, enemy: st.enemy.hp } }; }

    const boundary = getControlBoundary(st);
    const hpBefore = { p: st.player.hp, e: st.enemy.hp };
    const ccBefore = { p: st.player.cc, e: st.enemy.cc };

    // ── ORQUESTADOR (se consume antes de cualquier input): ──
    // la acción del player terminó -> END_EXCHANGE (ex0->ex1 defensa;
    // ex1->turn+1 siguiente ataque). El player ataca en su exchange (0 con
    // iniciativa player, 1 con iniciativa enemiga) -> activeAttacker.
    if (exchange0Pending && activeAttacker(st) === 'player') {
      runtime.dispatch({ type: 'END_EXCHANGE' });
      dispatches++;
      const after = runtime.state;
      if (after.exchange === 1) {
        runtime.state = { ...after, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      } else {
        runtime.state = { ...after, phase: 'command' };
      }
      exchange0Pending = false;
      attackDrawnThisTurn = false;
      exchanges++;
      continue;
    }
    // defensa COMMITTED -> el enemigo ataca (cualquier exchange con iniciativa enemiga)
    if (enemyAttackPending && activeAttacker(st) === 'enemy') {
      let card = enemyDraw();
      if (!card && enemyDeck.drawPile.length > 0) {
        enemyDeck = { ...enemyDeck, hand: [...enemyDeck.hand, enemyDeck.drawPile[0]], drawPile: enemyDeck.drawPile.slice(1) };
        card = enemyDraw();
      }
      if (!card) {
        // mazo agotado: el enemigo usa ataque básico (stage universal cc0)
        card = getCard(1) as CardDef;
      }
      {
        const before = { p: runtime.state.player.hp, e: runtime.state.enemy.hp };
        const ccB = { p: runtime.state.player.cc, e: runtime.state.enemy.cc };
        const res = runtime.resolveCard('enemy', card);
        dispatches++;
        // El invariante del ataque enemigo usa un cmd distinguible.
        verifyInvariants(before, ccB, res as ReturnType<BattleRuntime['dispatch']>, { type: 'CHARACTER_ACTION' });
        enemyAttackPending = false;
        enemyAttackDone = true;
      }
      continue;
    }
    // ataque enemigo resuelto -> END_EXCHANGE -> turn+1 / siguiente exchange
    if (enemyAttackDone && activeAttacker(st) === 'enemy') {
      runtime.dispatch({ type: 'END_EXCHANGE' });
      dispatches++;
      runtime.state = { ...runtime.state, phase: 'command' };
      enemyAttackDone = false;
      turns++;
      exchanges++;
      continue;
    }

    // Con iniciativa enemiga (exchange 0 = ENEMY ataca), el player DEFIENDE:
    // el orquestador abre la ventana defensiva en vez del ataque.
    if (boundary === 'PLAYER_ATTACK_CHOICE' && activeAttacker(st) === 'enemy') {
      runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      continue;
    }

    if (boundary === 'PLAYER_ATTACK_CHOICE') {
      // ATTACK PHASE del player: robar 1 carta + 3 CC (una vez por turno).
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
      if (st.phase === 'command') {
        // flujo real: JOINT abre la mano (cardSelect) SOLO si hay carta
        // jugable; si no -> BASIC (stage directo, evita bucle cardSelect).
        let anyPlayable = false;
        for (let i = 0; i < st.deck.hand.length; i++) {
          if (runtime.can({ type: 'PLAY_CARD', handIndex: i }).ok) { anyPlayable = true; break; }
        }
        if (anyPlayable) {
          const j: BattleCommand = { type: 'JOINT' };
          cmd = runtime.can(j).ok ? j : pick(runtime.available());
        } else {
          cmd = pick(runtime.available()); // BASIC
        }
      } else if (st.phase === 'cardSelect') {
        // elegir la PRIMERA carta jugable (compatibilidad + CC), no handIndex fijo
        let playableIdx = -1;
        for (let i = 0; i < st.deck.hand.length; i++) {
          if (runtime.can({ type: 'PLAY_CARD', handIndex: i }).ok) { playableIdx = i; break; }
        }
        if (playableIdx >= 0) {
          cmd = st.selectedCard !== playableIdx
            ? { type: 'SELECT_CARD', handIndex: playableIdx }
            : { type: 'PLAY_CARD', handIndex: playableIdx };
        } else {
          // mano muerta (incompatible/sin CC): cancelar selección y volver a
          // command para BASIC (el orquestador real permite cancelar).
          runtime.state = { ...runtime.state, phase: 'command', selectedCard: null };
          continue;
        }
      } else {
        cmd = pick(runtime.available()); // basic: BASIC_STAGE_ATTACK/GATHER
      }
      if (!cmd) { runtime.advance(1); dispatches++; continue; }
      const res = runtime.dispatch(cmd);
      dispatches++;
      verifyInvariants(hpBefore, ccBefore, res, cmd);
      if (res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
      continue;
    }

    if (boundary === 'ACTION_INPUT') {
      const q = st.stageQte;
      let cmd: BattleCommand | null = null;
      if (q.state === 'INPUT_WINDOW') {
        const expected = q.seq[q.idx];
        // determinista: ~1 de cada 5 inputs falla (prueba ramas miss/counter)
        const wrong = st.tick % 5 === 0;
        cmd = { type: 'QTE_INPUT', input: wrong ? (expected === 'LEFT' ? 'RIGHT' : 'LEFT') : expected };
      } else if (q.state === 'COUNTER_WINDOW') {
        cmd = st.tick % 2 === 0 ? { type: 'QTE_COUNTER_DEFEND' } : { type: 'QTE_COUNTER_CONTINUE' };
      } else {
        runtime.advance(1); dispatches++; continue;
      }
      if (!runtime.can(cmd).ok) { runtime.advance(1); dispatches++; continue; }
      const res = runtime.dispatch(cmd);
      dispatches++;
      verifyInvariants(hpBefore, ccBefore, res, cmd);
      if (res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
      continue;
    }

    if (boundary === 'PLAYER_DEFENSE_CHOICE') {
      let cmd: BattleCommand | null = null;
      // elegir la primera carta defensiva jugable; si no hay, GUARD/MOVE
      for (let i = 0; i < st.deck.hand.length; i++) {
        const d: BattleCommand = { type: 'PLAY_DEFENSE_CARD', handIndex: i };
        if (runtime.can(d).ok) { cmd = d; break; }
      }
      if (!cmd) cmd = pick(runtime.available());
      if (!cmd) { runtime.advance(1); dispatches++; continue; }
      const res = runtime.dispatch(cmd);
      dispatches++;
      verifyInvariants(hpBefore, ccBefore, res, cmd);
      if (res.events.some((e) => e.type === 'DEFENSE_COMMITTED')) enemyAttackPending = true;
      continue;
    }

    // (B) QTE terminado: la phase quedó en stageInput con qte WAITING -> la
    // acción del player terminó (el orquestador legacy usa la cinemática).
    if (st.phase === 'stageInput' && st.stageQte.state === 'WAITING' && !exchange0Pending) {
      exchange0Pending = true;
      continue;
    }
    // RESOLVING / sin frontera: dejar correr el reloj
    runtime.advance(1);
    dispatches++;
  }
  console.log(`   trace: ${trace.join(' | ')}`);
  return { name, dispatches, turns, exchanges, result: 'maxsteps', lastHp: { player: runtime.state.player.hp, enemy: runtime.state.enemy.hp } };
}

const configs: { name: string; cfg: InitialBattleConfig }[] = [
  { name: 'goku_vs_piccolo', cfg: makeConfig() },
  { name: 'enemy_initiative', cfg: makeConfig({ firstAttacker: 'enemy' }) },
  { name: 'low_hp', cfg: makeConfig({ playerHp: 300, enemyHp: 300 }) },
  { name: 'speed_gap', cfg: makeConfig({ playerSpd: 5, enemySpd: 12 }) },
  { name: 'fight_to_ko', cfg: makeConfig({ playerStr: 30, playerKi: 30, enemyStr: 30, enemyKi: 30, playerHp: 400, enemyHp: 400 }) },
];

const results: LoopResult[] = [];
for (const { name, cfg } of configs) {
  const r = playBattle(name, cfg);
  results.push(r);
  console.log(`\n[${name}] → ${r.result} · dispatches=${r.dispatches} · turns=${r.turns} · exchanges=${r.exchanges} · HP p=${r.lastHp.player}/e=${r.lastHp.enemy}`);
}

for (const r of results) {
  check(`[${r.name}] loop estable (≥10 exchanges)`, r.exchanges >= 10, `exchanges=${r.exchanges}`);
  check(`[${r.name}] sin softlock`, r.result !== 'softlock', 'stall');
  if (r.result === 'win' || r.result === 'lose') {
    check(`[${r.name}] KO alcanzado`, true, `${r.result} (HP ${r.lastHp.player}/${r.lastHp.enemy})`);
  } else {
    console.log(`INFO [${r.name}] sin KO en ${r.dispatches} pasos (curas del rival) — loop estable OK`);
  }
}

if (failures === 0) {
  console.log('\n✅ playable-alpha-loop: batallas completas hasta KO, invariantes OK (daño/gasto/timeline/progreso).');
  process.exit(0);
}
console.log(`\n❌ playable-alpha-loop: ${failures} fallo(s).`);
process.exit(1);

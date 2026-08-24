// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE BOUNDARIES — PA2.2/PA2.3: las dos fronteras del jugador
// soportan espera indefinida (gameplay congelado; la presentación nunca
// dispara la siguiente acción).
// Uso: npm run verify:battle-boundaries
//   PLAYER_ATTACK_CHOICE: llegar → snapshot → advance/render 10000 ticks →
//   mismo phase/exchange/HP/CC, 0 comandos despachados.
//   PLAYER_DEFENSE_CHOICE: idem.
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { createBattleDeck, drawOne, CC_GAIN_PER_ATTACK_PHASE } from '../src/battle/state';
import { getCard, type CardDef } from '../src/data/cards';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function cfg(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 10,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: createBattleDeck([1, 2, 4, 5, 6, 7, 8, 9, 12, 16, 23, 27].map((id) => getCard(id) as CardDef)),
    enemyDeck: createBattleDeck([3, 7, 8, 9, 10, 12, 16, 23, 42, 45, 51, 53].map((id) => getCard(id) as CardDef)),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player',
    ...overrides,
  };
}

function snapshot(s: ReturnType<BattleRuntime['state'] extends never ? never : never> extends never ? never : never): never { throw new Error('unused'); }
type Snap = { phase: string; exchange: number; turn: number; hpP: number; hpE: number; ccP: number; ccE: number; handP: number };

function snapOf(s: { phase: string; exchange: number; turn: number; player: { hp: number; cc: number }; enemy: { hp: number; cc: number }; deck: { hand: unknown[] } }): Snap {
  return { phase: s.phase, exchange: s.exchange, turn: s.turn, hpP: s.player.hp, hpE: s.enemy.hp, ccP: s.player.cc, ccE: s.enemy.cc, handP: s.deck.hand.length };
}

/** Lleva la partida hasta la frontera indicada (orquestador emulado). */
function reachBoundary(target: 'PLAYER_ATTACK_CHOICE' | 'PLAYER_DEFENSE_CHOICE'): { runtime: BattleRuntime; dispatches: number } {
  const runtime = new BattleRuntime({ state: createInitialBattleState(cfg()), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'command' };
  let enemyDeck = cfg().enemyDeck;
  let ex0 = false, atkP = false, atkD = false, drawn = false;
  let guard = 0;
  while (guard++ < 2000) {
    const st = runtime.state;
    const b = getControlBoundary(st);
    if (b === target) return { runtime, dispatches: guard };
    if (b === 'NONE') break;
    if (ex0 && activeAttacker(st) === 'player') {
      runtime.dispatch({ type: 'END_EXCHANGE' } as never);
      runtime.state = { ...runtime.state, phase: runtime.state.exchange === 1 ? 'defend' : 'command', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      ex0 = false; drawn = false;
      continue;
    }
    if (atkP && activeAttacker(st) === 'enemy') {
      let card = enemyDeck.hand[0];
      if (card) enemyDeck = { ...enemyDeck, hand: enemyDeck.hand.slice(1), discardPile: [...enemyDeck.discardPile, card] };
      else { card = getCard(1) as CardDef; }
      runtime.resolveCard('enemy', card);
      atkP = false; atkD = true;
      continue;
    }
    if (atkD && activeAttacker(st) === 'enemy') {
      runtime.dispatch({ type: 'END_EXCHANGE' } as never);
      runtime.state = { ...runtime.state, phase: 'command' };
      atkD = false;
      continue;
    }
    if (b === 'PLAYER_ATTACK_CHOICE' && activeAttacker(st) === 'enemy') {
      runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
      continue;
    }
    if (b === 'PLAYER_ATTACK_CHOICE') {
      if (st.phase === 'command' && !drawn) {
        const d = drawOne(runtime.state.deck);
        runtime.state = { ...runtime.state, deck: d.state, player: { ...runtime.state.player, cc: Math.min(runtime.state.player.maxCc, runtime.state.player.cc + CC_GAIN_PER_ATTACK_PHASE) } };
        drawn = true;
      }
      let cmd: never | null = null;
      if (st.phase === 'command') {
        let anyPlayable = false;
        for (let i = 0; i < st.deck.hand.length; i++) if (runtime.can({ type: 'PLAY_CARD', handIndex: i }).ok) { anyPlayable = true; break; }
        if (anyPlayable) cmd = { type: 'JOINT' } as never;
        else cmd = runtime.available()[0] as never ?? null;
      } else if (st.phase === 'cardSelect') {
        let pi = -1;
        for (let i = 0; i < st.deck.hand.length; i++) if (runtime.can({ type: 'PLAY_CARD', handIndex: i }).ok) { pi = i; break; }
        if (pi >= 0) cmd = (st.selectedCard !== pi ? { type: 'SELECT_CARD', handIndex: pi } : { type: 'PLAY_CARD', handIndex: pi }) as never;
        else { runtime.state = { ...runtime.state, phase: 'command', selectedCard: null }; continue; }
      } else {
        cmd = runtime.available()[0] as never ?? null;
      }
      if (!cmd) { runtime.advance(1); continue; }
      const res = runtime.dispatch(cmd);
      if (res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) ex0 = true;
      continue;
    }
    if (b === 'ACTION_INPUT') {
      const q = st.stageQte;
      if (q.state === 'INPUT_WINDOW') {
        const r = runtime.dispatch({ type: 'QTE_INPUT', input: q.seq[q.idx] } as never);
        if (r.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) ex0 = true;
      } else if (q.state === 'COUNTER_WINDOW') {
        runtime.dispatch({ type: 'QTE_COUNTER_DEFEND' } as never);
      } else runtime.advance(1);
      continue;
    }
    if (b === 'PLAYER_DEFENSE_CHOICE') {
      let cmd: never | null = null;
      for (let i = 0; i < st.deck.hand.length; i++) {
        const d = { type: 'PLAY_DEFENSE_CARD', handIndex: i } as never;
        if (runtime.can(d).ok) { cmd = d; break; }
      }
      if (!cmd) cmd = runtime.available()[0] as never ?? null;
      if (!cmd) { runtime.advance(1); continue; }
      const res = runtime.dispatch(cmd);
      if (res.events.some((e) => e.type === 'DEFENSE_COMMITTED')) atkP = true;
      continue;
    }
    runtime.advance(1);
  }
  throw new Error(`no se alcanzó ${target}`);
}

// ── Test: espera indefinida en las dos fronteras ──
for (const target of ['PLAYER_ATTACK_CHOICE', 'PLAYER_DEFENSE_CHOICE'] as const) {
  const { runtime } = reachBoundary(target);
  const before = snapOf(runtime.state);
  const commandsBefore = runtime.log.entries.length;

  // "render" 10000 ticks: la presentación puede actualizar visual idle,
  // pero el gameplay debe quedar congelado.
  const r = runtime.advance(10000);
  const after = snapOf(runtime.state);
  const commandsAfter = runtime.log.entries.length;

  check(
    `[${target}] gameplay congelado tras 10000 ticks`,
    after.phase === before.phase && after.exchange === before.exchange && after.turn === before.turn &&
      after.hpP === before.hpP && after.hpE === before.hpE && after.ccP === before.ccP && after.ccE === before.ccE && after.handP === before.handP,
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
  check(`[${target}] 0 comandos despachados durante la espera`, commandsAfter === commandsBefore, `events ${commandsBefore} -> ${commandsAfter}`);
  check(`[${target}] timeline sin eventos nuevos`, r.outcome.events.length === 0, `events=${r.outcome.events.length}`);
}

if (failures === 0) {
  console.log('\n✅ battle-boundaries: PLAYER_ATTACK_CHOICE y PLAYER_DEFENSE_CHOICE esperan indefinidamente (gameplay congelado).');
  process.exit(0);
}
process.exit(1);

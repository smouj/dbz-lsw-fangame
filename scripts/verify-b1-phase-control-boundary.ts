// ═══════════════════════════════════════════════════════════════════════
// VERIFY: B1 — PHASE → CONTROL BOUNDARY
// Uso: npm run verify:b1-phase-control-boundary
//
// Gate de BattleScreen + Runtime:
//   A) player initiative: ATTACK queda idle indefinido.
//   B) enemy initiative: DEFENSE queda idle indefinido.
//   C) tras acción del player: DEFENSE espera, sin autoattack.
//   D) tras resolución enemiga: siguiente ATTACK espera, sin comando auto.
//   E) phase banners no tienen callback/bridge que despache gameplay.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { activeAttacker, activeDefender, getControlBoundary } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { createBattleDeck, drawOne, CC_GAIN_PER_ATTACK_PHASE } from '../src/battle/state';
import { getCard, type CardDef } from '../src/data/cards';

let passed = 0;
let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    passed++;
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

type Snap = {
  turn: number;
  exchange: number;
  phase: string;
  attacker: string;
  defender: string;
  boundary: string;
  hpP: number;
  hpE: number;
  ccP: number;
  ccE: number;
  handP: number;
  logCount: number;
};

function snap(rt: BattleRuntime): Snap {
  const s = rt.state;
  return {
    turn: s.turn,
    exchange: s.exchange,
    phase: s.phase,
    attacker: activeAttacker(s),
    defender: activeDefender(s),
    boundary: getControlBoundary(s),
    hpP: s.player.hp,
    hpE: s.enemy.hp,
    ccP: s.player.cc,
    ccE: s.enemy.cc,
    handP: s.deck.hand.length,
    logCount: rt.log.entries.length,
  };
}

function sameStable(a: Snap, b: Snap): boolean {
  return a.turn === b.turn
    && a.exchange === b.exchange
    && a.phase === b.phase
    && a.attacker === b.attacker
    && a.defender === b.defender
    && a.boundary === b.boundary
    && a.hpP === b.hpP
    && a.hpE === b.hpE
    && a.ccP === b.ccP
    && a.ccE === b.ccE
    && a.handP === b.handP
    && a.logCount === b.logCount;
}

function assertIdle(name: string, rt: BattleRuntime, expectedBoundary: Snap['boundary']) {
  const before = snap(rt);
  const result = rt.advance(5000);
  const after = snap(rt);
  check(`${name}: boundary correcto`, before.boundary === expectedBoundary, `before=${JSON.stringify(before)}`);
  check(`${name}: idle 5000 ticks sin mutar gameplay`, sameStable(before, after), `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  check(`${name}: 0 eventos nuevos durante espera`, result.outcome.events.length === 0, `events=${result.outcome.events.length}`);
}

function enterPlayerAttackChoice(rt: BattleRuntime) {
  const drawn = drawOne(rt.state.deck);
  rt.state = {
    ...rt.state,
    phase: 'command',
    deck: drawn.state,
    player: { ...rt.state.player, cc: Math.min(rt.state.player.maxCc, rt.state.player.cc + CC_GAIN_PER_ATTACK_PHASE) },
  };
}

function enterPlayerDefenseChoice(rt: BattleRuntime) {
  rt.state = {
    ...rt.state,
    phase: 'defend',
    defenseState: 'AWAITING_CHOICE',
    defenseChoice: null,
  };
}

// E — auditoría estática de BattleScreen.
{
  const mainSrc = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
  check('showPhaseCue no acepta callback de gameplay', /const showPhaseCue = \(phaseKind: PhaseBannerKind\)/.test(mainSrc));
  check('0 llamadas showPhaseCue con segundo argumento', !/showPhaseCue\([^)\n]+,/.test(mainSrc));
  check('0 símbolo legacy enemyAttack en BattleScreen', !/\benemyAttack\b/.test(mainSrc));
  check('BattleScreen usa proyección explícita de control', /type BattleControlProjection[\s\S]+PLAYER_ATTACK_CHOICE[\s\S]+PLAYER_DEFENSE_CHOICE/.test(mainSrc));
  check('preparación enemiga abre DEFENSE, no playCardCinematic directo', /const prepareEnemyIncomingAttack[\s\S]+incomingCard\.current = card[\s\S]+enterDefensePhase\(card\.name\)/.test(mainSrc));
}

// A — player initiative → ATTACK → idle indefinido.
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'player' })), context: defaultBattleContext() });
  enterPlayerAttackChoice(rt);
  assertIdle('A player initiative ATTACK', rt, 'PLAYER_ATTACK_CHOICE');
}

// B — enemy initiative → DEFENSE → idle indefinido.
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy' })), context: defaultBattleContext() });
  rt.state = { ...rt.state, enemy: { ...rt.state.enemy, cc: rt.state.enemy.cc + CC_GAIN_PER_ATTACK_PHASE } };
  enterPlayerDefenseChoice(rt);
  check('B enemy initiative: attacker enemy defender player', activeAttacker(rt.state) === 'enemy' && activeDefender(rt.state) === 'player');
  assertIdle('B enemy initiative DEFENSE', rt, 'PLAYER_DEFENSE_CHOICE');
}

// C — acción player completa → END_EXCHANGE → DEFENSE, sin resolver enemigo.
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ playerCc: 99, enemyCc: 10, firstAttacker: 'player' })), context: defaultBattleContext() });
  const card = getCard(6) as CardDef;
  rt.state = { ...rt.state, phase: 'cardSelect', selectedCard: 0, deck: { drawPile: [], hand: [card], discardPile: [] } };
  const attack = rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as never);
  check('C player action resuelve sin cambiar exchange', attack.ok && rt.state.exchange === 0 && activeAttacker(rt.state) === 'player');
  const hpBeforeEnemyTurn = rt.state.player.hp;
  rt.dispatch({ type: 'END_EXCHANGE' } as never);
  enterPlayerDefenseChoice(rt);
  check('C tras acción: enemy attacker, player defender', rt.state.exchange === 1 && activeAttacker(rt.state) === 'enemy' && activeDefender(rt.state) === 'player');
  check('C enemigo aún no dañó al player', rt.state.player.hp === hpBeforeEnemyTurn, `hp=${rt.state.player.hp}`);
  assertIdle('C player action complete → DEFENSE', rt, 'PLAYER_DEFENSE_CHOICE');
}

// D — defensa comprometida + resolución enemiga → siguiente ATTACK espera.
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy', playerCc: 99, enemyCc: 99 })), context: defaultBattleContext() });
  enterPlayerDefenseChoice(rt);
  const guard = rt.dispatch({ type: 'GUARD' } as never);
  check('D defensa se compromete antes de resolver enemigo', guard.ok && rt.state.defenseState === 'COMMITTED');
  const card = getCard(6) as CardDef;
  const enemyResolution = rt.resolveCard('enemy', card);
  check('D ataque enemigo se resuelve solo después de DEFENSE_COMMITTED', enemyResolution.events.some((e) => e.type === 'ACTION_RESOLVED' || e.type === 'DAMAGE_APPLIED' || e.type === 'ATTACK_MISSED'));
  rt.dispatch({ type: 'END_EXCHANGE' } as never);
  enterPlayerAttackChoice(rt);
  check('D siguiente exchange/turn tiene attacker player', activeAttacker(rt.state) === 'player');
  assertIdle('D enemy action complete → ATTACK', rt, 'PLAYER_ATTACK_CHOICE');
}

if (failures === 0) {
  console.log(`\n✅ B1 phase-control-boundary: ${passed} passed / 0 failed`);
  process.exit(0);
}
console.log(`\n❌ B1 phase-control-boundary: ${passed} passed / ${failures} failed`);
process.exit(1);

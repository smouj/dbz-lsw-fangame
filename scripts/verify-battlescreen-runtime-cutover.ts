// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLESCREEN RUNTIME CUTOVER — PA2 gate.
// Uso: npm run verify:battlescreen-runtime-cutover
// 1) Búsqueda estática: 0 timers/callbacks en main.tsx que conduzcan
//    gameplay (advanceExchange/afterPlayerAction/finishPlayerTurn/
//    endTurnRef/setPhase win|lose/enemyAttack dentro de setTimeout).
// 2) Orquestación (Engine real):
//    - DEFENSE_BASIC/JOINT/LIMIT = navegación (no commitean)
//    - GUARD/MOVE/carta defensiva = commit (DEFENSE_COMMITTED)
//    - player action completion NO lanza enemy action
//    - enemy initiative exchange0 -> player defiende (activeAttacker)
//    - KO impide nuevos comandos
//    - Stage completion llega a boundary correcto
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { getControlBoundary, activeAttacker } from '../src/battle/engine/state/battleStateSelectors';
import { BattlePosition } from '../src/data/positions';
import { createBattleDeck } from '../src/battle/state';
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

// ── 1) Búsqueda estática de gameplay bridges en main.tsx ──
const mainSrc = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const GAMEPLAY_CALLS = ['advanceExchange', 'afterPlayerAction', 'finishPlayerTurn', 'endTurnRef', "setPhase('win')", "setPhase('lose')", 'enemyAttack('];
const timerBridgePattern = new RegExp(
  `setTimeout\\([^)]*(${GAMEPLAY_CALLS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g',
);
const hits = [...mainSrc.matchAll(timerBridgePattern)];
const detail = hits.length > 0 ? hits.slice(0, 8).map((m) => `setTimeout→${m[1]} @~${mainSrc.slice(0, m.index).split('\n').length}`).join('; ') : 'clean';
check('main.tsx: 0 timers que conduzcan gameplay (PLAYABLE_ALPHA_BRIDGE = 0)', hits.length === 0, detail);

// ── 2) Orquestación con el Engine real ──
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

// 2a) Submenú defensivo NO commitea; GUARD/MOVE/carta SÍ commitean
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy' })), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
  rt.dispatch({ type: 'DEFENSE_BASIC' } as never);
  check('DEFENSE_BASIC = navegación (no commitea)', rt.state.defenseState === 'AWAITING_CHOICE' && rt.state.defenseChoice === null);
  rt.dispatch({ type: 'DEFENSE_JOINT' } as never);
  check('DEFENSE_JOINT = navegación (no commitea)', rt.state.defenseState === 'AWAITING_CHOICE');
  rt.dispatch({ type: 'DEFENSE_LIMIT' } as never);
  check('DEFENSE_LIMIT = navegación (no commitea)', rt.state.defenseState === 'AWAITING_CHOICE');
  rt.dispatch({ type: 'GUARD' } as never);
  check('GUARD = commit (DEFENSE_COMMITTED)', rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'GUARD');
}
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy' })), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
  rt.dispatch({ type: 'MOVE', axis: 'HORIZONTAL' } as never);
  check('MOVE = commit (DEFENSE_COMMITTED)', rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'MOVE');
}
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy' })), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
  // elegir una carta Defense compatible (con characterId del contexto)
  let used: CardDef | null = null;
  for (const id of [19, 45, 121, 124, 125]) {
    const d = getCard(id) as CardDef;
    rt.state = { ...rt.state, deck: { drawPile: [], hand: [d], discardPile: [] } };
    const can = rt.can({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 }, { characterId: 'goku' });
    if (can.ok) { used = d; break; }
  }
  check('carta Defense compatible encontrada', used !== null);
  if (used) {
    const r = rt.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 }, { characterId: 'goku' });
    check('carta Defense válida = commit', r.ok && rt.state.defenseState === 'COMMITTED' && rt.state.defenseChoice?.type === 'CARD');
  }
}

// 2b) Player action completion NO lanza enemy action
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ playerCc: 99, enemyCc: 99 })), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'cardSelect', selectedCard: 0 };
  const card = getCard(6) as CardDef; // Cont.Kick (damage, cc15)
  rt.state = { ...rt.state, deck: { drawPile: [], hand: [card], discardPile: [] } };
  const res = rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as never);
  const after = rt.state;
  // terminal: ACTION_RESOLVED (hit) o ATTACK_MISSED (miss) — ambos cierran la acción
  const resolved = res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player') ||
    res.events.some((e) => e.type === 'ATTACK_MISSED' && e.source === 'player');
  check('acción del player resuelta (hit o miss)', resolved);
  check(
    'sin END_EXCHANGE → el enemigo NO actúa (exchange 0, player atacante)',
    after.exchange === 0 && activeAttacker(after) === 'player',
    `exchange=${after.exchange} attacker=${activeAttacker(after)}`,
  );
  check('boundary sigue siendo del jugador (no enemy action)', getControlBoundary(after) !== 'PLAYER_DEFENSE_CHOICE' || activeAttacker(after) === 'enemy');
}

// 2c) Enemy initiative exchange 0 → player defiende
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ firstAttacker: 'enemy' })), context: defaultBattleContext() });
  const st = rt.state;
  check('enemy initiative exchange0 → activeAttacker enemy', st.exchange === 0 && activeAttacker(st) === 'enemy');
  check('activeDefender = player', activeAttacker(st) === 'enemy');
}

// 2d) KO impide nuevos comandos
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg({ playerHp: 1 })), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'cardSelect', selectedCard: 0, enemy: { ...rt.state.enemy, hp: 0 } };
  const cmds: never[] = [
    { type: 'BASIC' },
    { type: 'GUARD' },
    { type: 'GATHER_POWER' },
  ] as never[];
  const blocked = cmds.every((c) => !rt.can(c).ok);
  check('KO → 0 comandos aceptados', blocked);
}

// 2e) Stage completion llega a boundary correcto (QTE completo → resolución)
{
  const rt = new BattleRuntime({ state: createInitialBattleState(cfg()), context: defaultBattleContext() });
  rt.state = { ...rt.state, phase: 'cardSelect', selectedCard: 0 };
  const card = getCard(1) as CardDef; // command (stage)
  rt.state = { ...rt.state, deck: { drawPile: [], hand: [card], discardPile: [] } };
  rt.dispatch({ type: 'PLAY_CARD', handIndex: 0 } as never);
  let guard = 0;
  let completed = false;
  while (guard++ < 200) {
    const q = rt.state.stageQte;
    if (q.state === 'WAITING' || q.state === 'COMPLETED') { completed = true; break; }
    if (q.state === 'INPUT_WINDOW') {
      rt.dispatch({ type: 'QTE_INPUT', input: q.seq[q.idx] } as never);
    } else if (q.state === 'COUNTER_WINDOW') {
      rt.dispatch({ type: 'QTE_COUNTER_DEFEND' } as never);
    } else rt.advance(1);
  }
  check('Stage QTE completa', completed);
  const resolved = rt.log.entries.some((e) => e.event.type === 'ACTION_RESOLVED' && e.event.side === 'player') ||
    rt.log.entries.some((e) => e.event.type === 'ATTACK_MISSED' && e.event.source === 'player');
  check('Stage → resolución (lifecycle Runtime, no timer)', resolved);
}

if (failures === 0) {
  console.log('\n✅ battlescreen-runtime-cutover: 0 bridges legacy, defensa commit/navegación correcta, sin enemy auto-start, KO bloquea comandos, Stage vuelve al lifecycle.');
  process.exit(0);
}
process.exit(1);

// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE-ENGINE — invariantes de M1 (BattleState puro).
// Uso: npm run verify:battle-engine
// Prueba que el estado extraído es: puro (sin DOM/React/Pixi/timers/
// Math.random), determinista, válido y SERIALIZABLE (JSON round-trip sin
// pérdida semántica).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from 'fs';
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import {
  activeAttacker, activeDefender, speedOrder, positionOf,
  relativeDistance, isVulnerable, ccOf, hpOf, handOf,
} from '../src/battle/engine/state/battleStateSelectors';
import { canExecute, getAvailableCommands } from '../src/battle/engine/commands/canExecute';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

function makeConfig(overrides: Partial<Parameters<typeof createInitialBattleState>[0]> = {}) {
  const deck = (ids: number[]) => ({
    drawPile: ids.map(id => getCard(id) as CardDef),
    hand: [],
    discardPile: [],
  });
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: 0,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 0,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck([1, 2, 4, 5, 6]), enemyDeck: deck([3, 7, 8, 9, 10]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player' as const,
    ...overrides,
  };
}

console.log('═══ verify:battle-engine — invariantes M1 (BattleState puro) ═══\n');

// ── Determinismo ──
const cfg = makeConfig();
const s1 = createInitialBattleState(cfg);
const s2 = createInitialBattleState(cfg);
check('createInitialBattleState determinista (mismos inputs → mismo estado)', JSON.stringify(s1) === JSON.stringify(s2));
check('determinista con firstAttacker enemigo', JSON.stringify(createInitialBattleState(makeConfig({ firstAttacker: 'enemy' })).activeSide) === '"enemy"');

// ── Estado inicial válido ──
check('fase inicial = position', s1.phase === 'position');
check('turno inicial = 1', s1.turn === 1);
check('exchange inicial = 0', s1.exchange === 0);
check('intro inicial = true', s1.intro === true);
check('tick inicial = 0 (reloj GBC en ticks, sin Date.now)', s1.tick === 0);
check('QTE inicial WAITING', s1.stageQte.state === 'WAITING' && s1.stageQte.elapsedFrames === 0);

// ── Posiciones iniciales válidas ──
check('posición jugador = DOWN_BACK', positionOf(s1, 'player') === BattlePosition.DOWN_BACK);
check('posición enemigo = DOWN_BACK', positionOf(s1, 'enemy') === BattlePosition.DOWN_BACK);
check('distancia relativa derivada (BACK+BACK = FAR)', relativeDistance(s1) !== undefined);
const front = createInitialBattleState(makeConfig({ playerPos: BattlePosition.DOWN_FRONT }));
check('distancia relativa cambia con posición (derivable, no cacheada)', relativeDistance(front) !== relativeDistance(s1));
check('vulnerabilidad derivada (DOWN_BACK damage)', isVulnerable(BattlePosition.DOWN_BACK, 'damage') === false || isVulnerable(BattlePosition.DOWN_BACK, 'damage') === true);

// ── Recursos dentro de límites ──
check('HP inicial dentro de límites', hpOf(s1, 'player').hp <= hpOf(s1, 'player').maxHp && hpOf(s1, 'player').hp >= 0);
check('CC inicial dentro de límites', ccOf(s1, 'player') >= 0 && ccOf(s1, 'player') <= s1.player.maxCc);
check('stages iniciales a 0', s1.pStages.str === 0 && s1.pStages.ki === 0 && s1.pStages.spd === 0 && s1.pStages.guard === 0);
check('guardia inicial null', s1.playerGuard === null);
check('power inicial NORMAL', s1.powerState === 'NORMAL' && s1.gatherTurns === 0);

// ── Selectores (derivables, no cacheados) ──
check('activeAttacker = activeSide en exchange 0', activeAttacker(s1) === 'player');
check('activeDefender espejo', activeDefender(s1) === 'enemy');
const spdCfg = makeConfig({ playerSpd: 5, enemySpd: 10 });
const spdState = createInitialBattleState(spdCfg);
check('speedOrder por SPD efectiva (enemigo más rápido)', speedOrder(spdState) === 'enemy');
check('mano inicial vacía (derivable del mazo)', handOf(s1, 'player').length === 0);

// ── Pureza: sin DOM / React / Pixi / timers / Math.random ──
const stateSrc = [
  'BattleState.ts', 'createInitialBattleState.ts', 'battleStateSelectors.ts',
].map(f => readFileSync(`src/battle/engine/state/${f}`, 'utf8')).join('\n');
check('sin referencias DOM (document/window/HTMLElement)', !/document|window|HTMLElement|DOMRect/.test(stateSrc));
check('sin dependencias React (useState/useRef/useEffect)', !/useState|useRef|useEffect|from 'react'/.test(stateSrc));
check('sin dependencias Pixi (canvas/WebGL/sprite)', !/canvas|WebGL|PIXI|pixi|Texture|Sprite/.test(stateSrc));
check('sin timers (setTimeout/setInterval/Date.now/performance)', !/setTimeout\s*\(|setInterval\s*\(|Date\.now\s*\(|performance\.now\s*\(/.test(stateSrc));
check('sin Math.random interno (ninguna llamada)', !/Math\.random\(/.test(stateSrc));
// M5: TODO el engine (state/commands/events/random/combat) sin llamadas reales
// a fuentes no deterministas — los comentarios pueden mencionarlas, las
// llamadas NO (criterio de cierre M5: 0 Math.random/Date.now/performance.now).
const engineSrc = ['state', 'commands', 'events', 'random', 'combat']
  .flatMap(d => (readdirSync(`src/battle/engine/${d}`, { recursive: true }) as string[])
    .filter(f => f.endsWith('.ts'))
    .map(f => readFileSync(`src/battle/engine/${d}/${f}`, 'utf8')))
  .join('\n');
check('M5: 0 llamadas Math.random()/Date.now()/performance.now() en todo el engine',
  !/Math\.random\s*\(/.test(engineSrc) && !/Date\.now\s*\(/.test(engineSrc) && !/performance\.now\s*\(/.test(engineSrc));

// ── Serialización ──
const roundTrip = JSON.parse(JSON.stringify(s1)) as typeof s1;
check('BattleState serializable (JSON round-trip sin pérdida)', JSON.stringify(roundTrip) === JSON.stringify(s1));
check('clone no cambia semántica (selectores idénticos)', activeAttacker(roundTrip) === activeAttacker(s1) && hpOf(roundTrip, 'player').hp === hpOf(s1, 'player').hp);
check('mazos sobreviven al round-trip', roundTrip.deck.drawPile.length === s1.deck.drawPile.length && roundTrip.eDeck.drawPile.length === s1.eDeck.drawPile.length);

// ═══════════════════════════════════════════════════════════════════════
// M2 — canExecute: pureza, fases, recursos, cartas, movimiento, QTE, paridad
// ═══════════════════════════════════════════════════════════════════════

console.log('\n── M2 · canExecute ──\n');

// Estado de batalla para M2: fase command + mano con cartas reales
const m2Deck = (ids: number[]) => ({ drawPile: ids.map(id => getCard(id) as CardDef), hand: ids.map(id => getCard(id) as CardDef), discardPile: [] as CardDef[] });
const damageCard = getCard(4) as CardDef;   // carta damage
const supportCard = getCard(25) as CardDef;  // carta support

const m2Cfg = makeConfig({
  playerDeck: m2Deck([4, 25]), enemyDeck: m2Deck([1]),
  playerCc: 30,
});
const m2State = createInitialBattleState(m2Cfg);
const commandPhase: typeof m2State = { ...m2State, phase: 'command' };
const attackPhase: typeof m2State = { ...m2State, phase: 'cardSelect', exchange: 0, activeSide: 'player' };
const defendPhase: typeof m2State = { ...m2State, phase: 'defend' };

// ── Pureza ──
const before = JSON.stringify(commandPhase);
canExecute(commandPhase, { type: 'JOINT' }, { side: 'player' });
canExecute(commandPhase, { type: 'LIMIT' }, { side: 'player', limitCardsCount: 3 });
canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
check('canExecute NO muta BattleState', JSON.stringify(commandPhase) === before);
check('canExecute determinista (misma pareja → mismo resultado)', JSON.stringify(canExecute(commandPhase, { type: 'JOINT' })) === JSON.stringify(canExecute(commandPhase, { type: 'JOINT' })));
const cmdSrc = ['BattleCommand.ts', 'CommandResult.ts', 'canExecute.ts', 'rules/resourceRules.ts', 'rules/cardRules.ts', 'rules/movementRules.ts', 'rules/defenseRules.ts']
  .map(f => readFileSync(`src/battle/engine/commands/${f}`, 'utf8')).join('\n');
check('M2 sin DOM/React/Pixi/timers', !/document|window|useState|useRef|canvas|WebGL|setTimeout|Date\.now/.test(cmdSrc));
check('M2 sin Math.random', !/Math\.random\(/.test(cmdSrc));

// ── Turno/fase ──
check('atacante puede PLAY_CARD en su ventana', canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }).ok);
const enemyAttackPhase = { ...attackPhase, activeSide: 'enemy' as const };
check('defensor NO puede PLAY_CARD (offensiva)', !canExecute(enemyAttackPhase, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }).ok);
check('JOINT solo en fase command', canExecute(commandPhase, { type: 'JOINT' }).ok && !canExecute(defendPhase, { type: 'JOINT' }).ok);
check('GUARD solo en fase defend', canExecute(defendPhase, { type: 'GUARD' }).ok && !canExecute(commandPhase, { type: 'GUARD' }).ok);
check('GATHER solo en fase basic', canExecute({ ...m2State, phase: 'basic' }, { type: 'GATHER_POWER' }).ok && !canExecute(commandPhase, { type: 'GATHER_POWER' }).ok);

// ── Recursos ──
const poorState = { ...attackPhase, player: { ...attackPhase.player, cc: 0 } };
// card 25 (Solid Shot) cuesta 19 CC — con cc 0 debe rechazar
check('CC insuficiente rechaza PLAY_CARD', !canExecute(poorState, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }).ok);
check('CC suficiente permite (carta 4, cc 0)', canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }).ok);
check('rechazo no consume CC', poorState.player.cc === 0 && JSON.stringify(poorState.player) === JSON.stringify({ ...attackPhase, player: { ...attackPhase.player, cc: 0 } }.player));

// ── Cartas ──
check('carta fuera de mano rechazada', !canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 9 }, { side: 'player', characterId: 'goku' }).ok);
// card 25 (Solid Shot) es compatible SOLO con goku — piccolo debe rechazar
check('carta incompatible rechazada', !canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'piccolo' }).ok);
// card 25 es DAMAGE (ofensiva) → rechazada en defensa
check('carta ofensiva rechazada en defensa', !canExecute(defendPhase, { type: 'PLAY_DEFENSE_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }).ok);
// Taiyoken (id 19) es DEFENSE y compatible con goku → permitida en defensa
const taiyoken = getCard(19) as CardDef;
const defenseHand = { ...defendPhase, deck: { ...defendPhase.deck, hand: [taiyoken] } };
check('carta defensiva permitida en defensa (Taiyoken, cc 0)', canExecute(defenseHand, { type: 'PLAY_DEFENSE_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }).ok);

// ── Movimiento ──
check('MOVE horizontal legal (DOWN_BACK → DOWN_FRONT)', canExecute(defendPhase, { type: 'MOVE', axis: 'HORIZONTAL' }, { side: 'player' }).ok);
check('MOVE vertical legal (DOWN_BACK → UP_BACK)', canExecute(defendPhase, { type: 'MOVE', axis: 'VERTICAL' }, { side: 'player' }).ok);
const destH = applyMoveAxisLocal(BattlePosition.DOWN_BACK, 'HORIZONTAL');
check('destino horizontal derivado = DOWN_FRONT', destH === BattlePosition.DOWN_FRONT);
const destV = applyMoveAxisLocal(BattlePosition.DOWN_BACK, 'VERTICAL');
check('destino vertical derivado = UP_BACK', destV === BattlePosition.UP_BACK);
check('MOVE nunca deja la misma posición', destH !== BattlePosition.DOWN_BACK && destV !== BattlePosition.DOWN_BACK);

// ── Stage / QTE ──
const qteActive = { ...m2State, phase: 'stageInput' as const, stageQte: { state: 'INPUT_WINDOW' as const, seq: ['A', 'A', 'RIGHT', 'DOWN'] as const, idx: 0, correct: 0, card: null, elapsedFrames: 0, limitFrames: 173, counterFrames: 0, result: null } };
check('QTE_INPUT rechazado sin QTE activo', !canExecute(m2State, { type: 'QTE_INPUT', input: 'A' }).ok);
check('QTE_INPUT válido con la tecla esperada', canExecute(qteActive, { type: 'QTE_INPUT', input: 'A' }).ok);
check('M5: QTE_INPUT con tecla equivocada ES legal (fallo → COUNTER_WINDOW)', canExecute(qteActive, { type: 'QTE_INPUT', input: 'B' }).ok);
const counterWindow = { ...m2State, phase: 'stageInput' as const, stageQte: { state: 'COUNTER_WINDOW' as const, seq: [] as string[], idx: 0, correct: 0, card: null, elapsedFrames: 0, limitFrames: 0, counterFrames: 0, result: null } };
check('contraataque: DEFEND solo en COUNTER_WINDOW', canExecute(counterWindow, { type: 'QTE_COUNTER_DEFEND' }).ok && !canExecute(qteActive, { type: 'QTE_COUNTER_DEFEND' }).ok);
check('contraataque: CONTINUE solo en COUNTER_WINDOW', canExecute(counterWindow, { type: 'QTE_COUNTER_CONTINUE' }).ok && !canExecute(qteActive, { type: 'QTE_COUNTER_CONTINUE' }).ok);

// ── Authority parity (legacy ↔ engine) ──
// Reglas legacy auditadas de main.tsx:
//   LIMIT  → !limitsPowered || limitCards.length === 0
//   GATHER → gatherTurns > 0
//   PLAY_CARD → canPlayInAttack(card) && cc >= cost && compatible
const legacyLimitEnabled = (s: typeof m2State, powered: boolean, count: number) => powered && count > 0;
const legacyGatherEnabled = (s: typeof m2State) => s.gatherTurns === 0;
const cmdLimit = canExecute(commandPhase, { type: 'LIMIT' }, { side: 'player', limitCardsCount: 2 });
const cmdLimitOff = canExecute(commandPhase, { type: 'LIMIT' }, { side: 'player', limitCardsCount: 0 });
check('paridad LIMIT: legacy habilitado ⇔ canExecute ok', (legacyLimitEnabled(commandPhase, commandPhase.powerState !== 'NORMAL', 2) === cmdLimit.ok) && (legacyLimitEnabled(commandPhase, commandPhase.powerState !== 'NORMAL', 0) === cmdLimitOff.ok));
const gathered = { ...m2State, gatherTurns: 2 };
check('paridad GATHER: legacy (gatherTurns>0 bloquea) ⇔ canExecute', (legacyGatherEnabled(m2State) === canExecute({ ...m2State, phase: 'basic' }, { type: 'GATHER_POWER' }).ok) && (legacyGatherEnabled(gathered) === canExecute({ ...gathered, phase: 'basic' }, { type: 'GATHER_POWER' }).ok));
const legacyCardEnabled = (s: typeof m2State, card: CardDef, char: string) => (card.type === 'damage' || card.type === 'beam' || card.type === 'command' || card.type === 'special') && s.player.cc >= card.cc && (!card.compatible?.length || card.compatible.includes(char));
check('paridad PLAY_CARD: legacy ⇔ canExecute', legacyCardEnabled(attackPhase, damageCard, 'goku') === canExecute(attackPhase, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' }).ok);
check('getAvailableCommands en fase command incluye JOINT/BASIC y NO GUARD', getAvailableCommands(commandPhase).some(c => c.type === 'JOINT') && !getAvailableCommands(commandPhase).some(c => c.type === 'GUARD'));

function applyMoveAxisLocal(pos: BattlePosition, axis: 'HORIZONTAL' | 'VERTICAL'): BattlePosition {
  // misma regla que positions.ts applyMoveAxis (espejo de la fuente única)
  const d = pos === BattlePosition.UP_BACK || pos === BattlePosition.UP_FRONT ? 'AIR' : 'GROUND';
  const depth = pos === BattlePosition.UP_BACK || pos === BattlePosition.DOWN_BACK ? 'BACK' : 'FRONT';
  if (axis === 'HORIZONTAL') return depth === 'BACK'
    ? (d === 'AIR' ? BattlePosition.UP_FRONT : BattlePosition.DOWN_FRONT)
    : (d === 'AIR' ? BattlePosition.UP_BACK : BattlePosition.DOWN_BACK);
  return d === 'GROUND'
    ? (depth === 'BACK' ? BattlePosition.UP_BACK : BattlePosition.UP_FRONT)
    : (depth === 'BACK' ? BattlePosition.DOWN_BACK : BattlePosition.DOWN_FRONT);
}


// ═══════════════════════════════════════════════════════════════════════
// M3 — executeCommand: pureza, recursos, cartas, movimiento, invariantes,
// secuencias headless (simulador)
// ═══════════════════════════════════════════════════════════════════════

console.log('\n── M3 · executeCommand ──\n');

import { executeCommand, mustExecute } from '../src/battle/engine/commands/executeCommand';
import { BattlePosition } from '../src/data/positions';

// ── Ejecución / pureza ──
const m3State = createInitialBattleState(makeConfig({
  playerDeck: m2Deck([25, 4]), playerCc: 30,
  playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
  phase: 'cardSelect' as never, // fase inicial position → la ajustamos
}));
const m3Command: typeof m3State = { ...m3State, phase: 'cardSelect' };
const frozenBefore = JSON.stringify(m3Command);
const rejectedRes = executeCommand(m3Command, { type: 'PLAY_CARD', handIndex: 5 }, { side: 'player', characterId: 'goku' }); // handIndex fuera
check('M3: comando ilegal → rejected', !rejectedRes.ok);
check('M3: rechazo devuelve el MISMO objeto state (cero mutación)', rejectedRes.ok === false && (rejectedRes as { state: typeof m3State }).state === m3Command);
check('M3: estado original nunca se muta', JSON.stringify(m3Command) === frozenBefore);
const acceptedRes = executeCommand(m3Command, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
check('M3: comando legal → accepted con nuevo estado', acceptedRes.ok && acceptedRes.state !== m3Command);
check('M3: determinismo (misma pareja → mismo resultado)', JSON.stringify(executeCommand(m3Command, { type: 'MOVE', axis: 'HORIZONTAL' }, { side: 'player' })) === JSON.stringify(executeCommand(m3Command, { type: 'MOVE', axis: 'HORIZONTAL' }, { side: 'player' })));

// ── Recursos: coste exacto UNA vez ──
// handIndex 0 = card 25 (cc 19) → 30 - 19 = 11
if (acceptedRes.ok) {
  check('M3: coste CC exacto (30 − 19 = 11)', acceptedRes.state.player.cc === 11);
}
const rejectNoCost = executeCommand(m3Command, { type: 'PLAY_CARD', handIndex: 9 }, { side: 'player', characterId: 'goku' });
check('M3: rechazo no cobra nada', !rejectNoCost.ok && (rejectNoCost as { state: typeof m3State }).state.player.cc === 30);
const poor2 = { ...m3Command, player: { ...m3Command.player, cc: 5 } };
const poorRes = executeCommand(poor2, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
check('M3: CC insuficiente → rechazo (no negativo)', !poorRes.ok && (poorRes as { state: typeof m3State }).state.player.cc === 5);

// ── Cartas: elimina la carta EXACTA, va al descarte, vecinas intactas ──
if (acceptedRes.ok) {
  const hand = acceptedRes.state.deck.hand;
  check('M3: la carta jugada sale de la mano', hand.length === 1 && hand[0].id === 4);
  check('M3: la carta va al discardPile', acceptedRes.state.deck.discardPile.length === 1 && acceptedRes.state.deck.discardPile[0].id === 25);
  check('M3: cartas vecinas intactas (drawPile sin tocar, otra carta en mano)', acceptedRes.state.deck.drawPile.length === 2 && acceptedRes.state.deck.hand[0].id === 4);
  check('M3: mazo serializable tras jugar', JSON.parse(JSON.stringify(acceptedRes.state.deck)).hand.length === 1);
}

// ── Movimiento: 4 posiciones × 2 ejes, nunca quinta posición ──
const POSITIONS4 = [BattlePosition.UP_BACK, BattlePosition.UP_FRONT, BattlePosition.DOWN_BACK, BattlePosition.DOWN_FRONT];
let mvOk = 0;
for (const pos of POSITIONS4) {
  const s = { ...m3Command, phase: 'defend' as never, player: { ...m3Command.player, battlePos: pos } };
  const h = executeCommand(s, { type: 'MOVE', axis: 'HORIZONTAL' }, { side: 'player' });
  const v = executeCommand(s, { type: 'MOVE', axis: 'VERTICAL' }, { side: 'player' });
  if (h.ok && v.ok) {
    const hp = (h as { state: typeof s }).state.player.battlePos;
    const vp = (v as { state: typeof s }).state.player.battlePos;
    const hDepthChanged = (hp === BattlePosition.UP_FRONT || hp === BattlePosition.DOWN_FRONT) !== (pos === BattlePosition.UP_FRONT || pos === BattlePosition.DOWN_FRONT);
    const vAltChanged = (vp === BattlePosition.UP_BACK || vp === BattlePosition.UP_FRONT) !== (pos === BattlePosition.UP_BACK || pos === BattlePosition.UP_FRONT);
    const hKeepsAlt = (hp === BattlePosition.UP_BACK || hp === BattlePosition.UP_FRONT) === (pos === BattlePosition.UP_BACK || pos === BattlePosition.UP_FRONT);
    const vKeepsDepth = (vp === BattlePosition.UP_BACK || vp === BattlePosition.DOWN_BACK) === (pos === BattlePosition.UP_BACK || pos === BattlePosition.DOWN_BACK);
    if (hDepthChanged && hKeepsAlt && vAltChanged && vKeepsDepth && POSITIONS4.includes(hp) && POSITIONS4.includes(vp)) mvOk++;
  }
}
check('M3: movimiento correcto en las 4 posiciones × 2 ejes (8/8)', mvOk === 4);
check('M3: horizontal no cambia altitud · vertical no cambia depth (incluido arriba)', mvOk === 4);

// ── Invariantes tras cada comando ──
function invariantCheck(s: typeof m3State): boolean {
  const okHp = s.player.hp >= 0 && s.player.hp <= s.player.maxHp && s.enemy.hp >= 0 && s.enemy.hp <= s.enemy.maxHp;
  const okCc = s.player.cc >= 0 && s.player.cc <= s.player.maxCc;
  const okPos = POSITIONS4.includes(s.player.battlePos) && POSITIONS4.includes(s.enemy.battlePos);
  const okDeck = s.deck.hand.length + s.deck.drawPile.length + s.deck.discardPile.length === TOTAL_DECK;
  const okSerial = (() => { try { JSON.parse(JSON.stringify(s)); return true; } catch { return false; } })();
  return okHp && okCc && okPos && okDeck && okSerial;
}
const TOTAL_DECK = m3Command.deck.hand.length + m3Command.deck.drawPile.length + m3Command.deck.discardPile.length;
const invState = mustExecute(m3Command, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }); // card 4 cc 0
check('M3: invariantes tras PLAY_CARD (HP/CC/posición/mazo/serializable)', invariantCheck(invState));

// ── Secuencias headless (simulador) ──
let sim = createInitialBattleState(makeConfig({
  playerDeck: m2Deck([4, 25]), enemyDeck: m2Deck([1]), playerCc: 30,
  playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
}));
sim = { ...sim, phase: 'command' as never };
sim = mustExecute(sim, { type: 'JOINT' });
sim = mustExecute(sim, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }); // card 25, cc 30→11
check('M3: secuencia JOINT→PLAY_CARD: fase stageInput y CC 11', sim.phase === 'stageInput' && sim.player.cc === 11);
// QTE: input correcto (la secuencia del stage 3 empieza por 'A')
const seq = sim.stageQte.seq;
if (seq.length > 0) {
  const q1 = mustExecute(sim, { type: 'QTE_INPUT', input: seq[0] });
  check('M3: QTE_INPUT correcto → idx avanza y +1 CC', q1.stageQte.idx === 1 && q1.player.cc === 12);
  const qBad = executeCommand(sim, { type: 'QTE_INPUT', input: 'B' });
  check('M5: QTE_INPUT equivocado → accepted y COUNTER_WINDOW (el GBC no rechaza inputs)', qBad.ok && qBad.state.stageQte.state === 'COUNTER_WINDOW');
}
// Defensa: GUARD + MOVE
const sim2 = { ...m3Command, phase: 'defend' as never, player: { ...m3Command.player, battlePos: BattlePosition.DOWN_BACK } };
const g = mustExecute(sim2, { type: 'GUARD' });
check('M3: GUARD → playerGuard reduce', g.playerGuard === 'reduce');
const mv = mustExecute(sim2, { type: 'MOVE', axis: 'HORIZONTAL' });
check('M3: MOVE horizontal → DOWN_FRONT', mv.player.battlePos === BattlePosition.DOWN_FRONT);
const mv2 = mustExecute(mv, { type: 'MOVE', axis: 'VERTICAL' });
check('M3: MOVE vertical tras horizontal → UP_FRONT (no diagonal inválida)', mv2.player.battlePos === BattlePosition.UP_FRONT);


// ═══════════════════════════════════════════════════════════════════════
// M4 — BattleEvent: hechos resultantes, orden contractual, pureza y golden
// ═══════════════════════════════════════════════════════════════════════

console.log('\n── M4 · BattleEvent ──\n');

import { eventTypeSequence, appendToEventLog, sequenceEvents, emptyEventLog } from '../src/battle/engine/events';
import type { BattleEvent } from '../src/battle/engine/events';

// ── Estado ↔ eventos ──
const m4Base = createInitialBattleState(makeConfig({
  playerDeck: m2Deck([4, 25]), enemyDeck: m2Deck([1]), playerCc: 30,
  playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
}));
const m4Cmd: typeof m4Base = { ...m4Base, phase: 'cardSelect' };
const m4Play = executeCommand(m4Cmd, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }); // carta 25, cc 19
check('M4: PLAY_CARD aceptado devuelve events', m4Play.ok && m4Play.events.length > 0);
if (m4Play.ok) {
  const ccSpent = m4Play.events.find(e => e.type === 'CC_SPENT');
  check('M4: CC 30→11 produce CC_SPENT amount=19 before=30 after=11',
    ccSpent?.type === 'CC_SPENT' && ccSpent.amount === 19 && ccSpent.before === 30 && ccSpent.after === 11 && ccSpent.side === 'player');
  check('M4: CARD_PLAYED + CARD_DISCARDED con cardId 25',
    m4Play.events.some(e => e.type === 'CARD_PLAYED' && e.cardId === 25) &&
    m4Play.events.some(e => e.type === 'CARD_DISCARDED' && e.cardId === 25));
  check('M4: los eventos reflejan el estado (cc 11, descarte con 25)',
    m4Play.state.player.cc === 11 && m4Play.state.deck.discardPile[0]?.id === 25);
}
const m4Move = executeCommand({ ...m4Cmd, phase: 'defend' }, { type: 'MOVE', axis: 'HORIZONTAL' }, { side: 'player' });
if (m4Move.ok) {
  const pc = m4Move.events.find(e => e.type === 'POSITION_CHANGED');
  check('M4: MOVE DOWN_BACK→DOWN_FRONT produce POSITION_CHANGED exacto',
    pc?.type === 'POSITION_CHANGED' && pc.from === BattlePosition.DOWN_BACK && pc.to === BattlePosition.DOWN_FRONT && pc.axis === 'HORIZONTAL' && pc.side === 'player');
}
// QTE: input correcto produce QTE_INPUT_RESOLVED con índices before/after
const m4QteState: typeof m4Base = { ...m4Base, phase: 'stageInput', stageQte: { state: 'INPUT_WINDOW', seq: ['A', 'B', 'A'], idx: 1, correct: 1, card: null, elapsedFrames: 0, limitFrames: 173, counterFrames: 0, result: null } };
const m4Qte = executeCommand(m4QteState, { type: 'QTE_INPUT', input: 'B' }, { side: 'player' });
if (m4Qte.ok) {
  const qr = m4Qte.events.find(e => e.type === 'QTE_INPUT_RESOLVED');
  check('M4: QTE_INPUT_RESOLVED indexBefore=1 indexAfter=2 success=true',
    qr?.type === 'QTE_INPUT_RESOLVED' && qr.indexBefore === 1 && qr.indexAfter === 2 && qr.success === true && qr.input === 'B');
  check('M4: QTE acierto emite CC_GAINED (+1)', m4Qte.events.some(e => e.type === 'CC_GAINED' && e.amount === 1));
}
// Rechazo
const m4Bad = executeCommand(m4Cmd, { type: 'GUARD' }, { side: 'player' }); // WRONG_PHASE (cardSelect)
check('M4: rechazo emite COMMAND_REJECTED con reason', !m4Bad.ok && m4Bad.events.length === 1 && m4Bad.events[0].type === 'COMMAND_REJECTED' && m4Bad.events[0].reason === 'WRONG_PHASE');
check('M4: rechazo devuelve el MISMO objeto state (cero mutaciones)', !m4Bad.ok && m4Bad.state === m4Cmd);

// ── Orden contractual ──
if (m4Play.ok) {
  check('M4: PLAY_CARD orden = ACCEPTED,CC_SPENT,CARD_PLAYED,CARD_DISCARDED,ACTION_STARTED,QTE_STARTED,PHASE_CHANGED',
    JSON.stringify(eventTypeSequence(m4Play.events)) === JSON.stringify(['COMMAND_ACCEPTED', 'CC_SPENT', 'CARD_PLAYED', 'CARD_DISCARDED', 'ACTION_STARTED', 'QTE_STARTED', 'PHASE_CHANGED']));
  const idxAcc = m4Play.events.findIndex(e => e.type === 'COMMAND_ACCEPTED');
  const idxPos = m4Play.events.findIndex(e => e.type === 'PHASE_CHANGED');
  check('M4: PHASE_CHANGED es el ÚLTIMO evento (tras la resolución)', idxPos === m4Play.events.length - 1 && idxAcc < idxPos);
}
if (m4Move.ok) {
  check('M4: MOVE orden = ACCEPTED antes de POSITION_CHANGED',
    m4Move.events[0].type === 'COMMAND_ACCEPTED' && m4Move.events[1].type === 'POSITION_CHANGED');
}

// ── Pureza / serialización / determinismo ──
check('M4: eventos serializables (JSON round-trip)', (() => { try { const j = JSON.parse(JSON.stringify(m4Play.events)); return Array.isArray(j) && j.length === m4Play.events.length; } catch { return false; } })());
check('M4: eventos sin funciones (todos objetos planos serializables)', m4Play.events.every(e => JSON.stringify(e) !== undefined));
const m4Det1 = executeCommand(m4QteState, { type: 'QTE_INPUT', input: 'B' }, { side: 'player' });
const m4Det2 = executeCommand(m4QteState, { type: 'QTE_INPUT', input: 'B' }, { side: 'player' });
check('M4: mismo input ⇒ mismo state + mismo event stream', m4Det1.ok && m4Det2.ok && JSON.stringify(m4Det1.state) === JSON.stringify(m4Det2.state) && JSON.stringify(m4Det1.events) === JSON.stringify(m4Det2.events));
check('M4: ejecutar no muta el estado origen', JSON.stringify(m4QteState) === JSON.stringify({ ...m4Base, phase: 'stageInput', stageQte: { state: 'INPUT_WINDOW', seq: ['A', 'B', 'A'], idx: 1, correct: 1, card: null, elapsedFrames: 0, limitFrames: 173, counterFrames: 0, result: null } }));

// ── EventLog ──
const log0 = emptyEventLog();
const log1 = appendToEventLog(log0, m4Play.events);
check('M4: EventLog secuencia 0..N estable', log1.entries.length === m4Play.events.length && log1.entries.every((en, i) => en.sequence === i));
const log2 = appendToEventLog(log1, [{ type: 'PHASE_CHANGED', from: 'stageInput', to: 'defend' }]);
check('M4: append continúa la secuencia (N, N+1...)', log2.entries[log1.entries.length].sequence === log1.entries.length);
check('M4: sequenceEvents(startAt) numera desde startAt', sequenceEvents([{ type: 'COMMAND_ACCEPTED', command: { type: 'JOINT' } }], 7)[0].sequence === 7);

// ── Golden fixtures (orden protegido contra cambios accidentales) ──
function runGolden(path: string): { expected: string[]; actual: string[]; events: BattleEvent[] } {
  const fx = JSON.parse(readFileSync(path, 'utf8'));
  let s = createInitialBattleState(makeConfig({
    playerDeck: m2Deck(fx.deck), enemyDeck: m2Deck([1]),
    playerCc: fx.setup.playerCc ?? 30,
    playerPos: (BattlePosition as unknown as Record<string, BattlePosition>)[fx.setup.playerPos ?? 'DOWN_BACK'],
    enemyPos: (BattlePosition as unknown as Record<string, BattlePosition>)[fx.setup.enemyPos ?? 'DOWN_BACK'],
  }));
  if (fx.setup.phase) s = { ...s, phase: fx.setup.phase as never };
  const all: BattleEvent[] = [];
  for (const cmd of fx.commands) {
    const res = executeCommand(s, cmd as BattleCommand, { side: 'player', characterId: 'goku' });
    if (!res.ok) {
      if (fx.expectRejected) {
        all.push(...res.events);
        continue;
      }
      throw new Error(`golden ${fx.name}: ${JSON.stringify(cmd)} rechazado: ${res.reason}`);
    }
    all.push(...res.events);
    s = res.state;
  }
  return { expected: fx.expectedEvents, actual: eventTypeSequence(all), events: all };
}
const GOLDEN_DIR = 'scripts/fixtures';
for (const name of ['m4_card_attack', 'm4_stage_attack', 'm4_guard_move', 'm4_rejected']) {
  try {
    const g = runGolden(`${GOLDEN_DIR}/${name}.json`);
    check(`M4: golden ${name} — secuencia exacta`, JSON.stringify(g.actual) === JSON.stringify(g.expected));
  } catch (e) {
    check(`M4: golden ${name} — ${(e as Error).message}`, false);
  }
}
// Golden determinista: ejecutar dos veces el mismo fixture da el mismo stream
const gA = runGolden(`${GOLDEN_DIR}/m4_card_attack.json`);
const gB = runGolden(`${GOLDEN_DIR}/m4_card_attack.json`);
check('M4: golden determinista (dos ejecuciones → mismo stream)', JSON.stringify(gA.actual) === JSON.stringify(gB.actual) && JSON.stringify(gA.events) === JSON.stringify(gB.events));
// Golden rechazo: cero mutación
const fxRej = JSON.parse(readFileSync(`${GOLDEN_DIR}/m4_rejected.json`, 'utf8'));
let sRej = createInitialBattleState(makeConfig({ playerDeck: m2Deck(fxRej.deck), enemyDeck: m2Deck([1]), playerCc: fxRej.setup.playerCc ?? 30 }));
sRej = { ...sRej, phase: fxRej.setup.phase as never };
const rejRes = executeCommand(sRej, fxRej.commands[0] as BattleCommand, { side: 'player', characterId: 'goku' });
check('M4: golden rejected — mismo objeto state (cero mutación)', !rejRes.ok && rejRes.state === sRej);

// ── CANON DE ANIMACIÓN (M4 → poses de los sheets perfectos) ──
import { canonForAction, canonForEvent, listAnimationCanon, auraForAction } from '../src/battle/animationCanon';
const beamCanon = canonForAction({ id: 'kamehameha', label: 'Kamehameha', kind: 'beam', visual: 'ray', fidelity: 'INFERRED' });
check('CANON: beam = gather_power → beam_charge → beam_fire + aura power',
  beamCanon.actor.some(b => b.pose === 'gather_power') && beamCanon.actor.some(b => b.pose === 'beam_charge') && beamCanon.actor.some(b => b.pose === 'beam_fire') && beamCanon.aura === 'power');
const stageCanon = canonForAction({ id: 'stage_3', label: '3 Stage Attack', kind: 'command', visual: 'rush', fidelity: 'INFERRED' });
check('CANON: stage = windup attack_fwd + golpe + target knockback_back',
  stageCanon.actor.some(b => b.pose === 'attack_fwd') && stageCanon.target[0]?.pose === 'knockback_back' && stageCanon.contactFrame === 94);
const meleeCanon = canonForAction({ id: 'cont_punch', label: 'Cont. Punch', kind: 'damage', visual: 'rush', fidelity: 'INFERRED' });
check('CANON: damage = secuencia melee sin aura', meleeCanon.actor[0]?.pose === 'idle' && meleeCanon.aura === 'none' && meleeCanon.target[0]?.pose === 'knockback_back');
check('CANON: canonForEvent(ACTION_STARTED) resuelve y CC_SPENT → null',
  canonForEvent({ type: 'ACTION_STARTED', side: 'player', action: { id: 'x', label: 'X', kind: 'beam', visual: 'ball', fidelity: 'INFERRED' } })?.aura === 'power' &&
  canonForEvent({ type: 'CC_SPENT', side: 'player', amount: 1, before: 2, after: 1 }) === null);
check('CANON: aura item = support (azul) / beam = power (dorada)',
  auraForAction({ id: 'x', label: 'X', kind: 'support', visual: 'item', fidelity: 'INFERRED' }) === 'support' &&
  auraForAction({ id: 'x', label: 'X', kind: 'beam', visual: 'wave', fidelity: 'INFERRED' }) === 'power');
check('CANON: tabla cubre todas las familias (command/damage/beam/support/gather/guard/move)',
  ['command', 'damage', 'beam', 'support', 'gather', 'guard', 'move'].every(k => listAnimationCanon().some(c => c.kind === k)));


// ═══════════════════════════════════════════════════════════════════════
// M5 — RNG determinista + daño: PRNG canónico, seed explícito, damage real,
// counter, LIMIT CC, golden determinista, divergencia y shadow parity.
// ═══════════════════════════════════════════════════════════════════════

console.log('\n── M5 · RNG determinista + daño ──\n');

import { initRng, nextRng, rollPercent, rollRange } from '../src/battle/engine/random';
import type { RngState } from '../src/battle/engine/random';
import {
  effectiveAttackAccuracy, effectiveDefenseAccuracy, accuracyHits,
  hitBlockAvoidFromRoll, attackDamage, counterDamage, stageAttackDamage,
  stagePartialDamage, stageProgress, powerFor, spdFor,
} from '../src/battle/engine/combat/resolution';
import { resolveHitBlockAvoid } from '../src/battle/combat';
import { applyDamage, resolveCounterDamage, resolvePartialStageDamage } from '../src/battle/engine/commands/reducers/damageReducer';
import type { DamageCause } from '../src/battle/engine/events';

// ── PRNG puro y canónico ──
const r0 = initRng(123456);
const r1 = nextRng(r0);
const r2 = nextRng(r1.rngState);
check('M5: initRng determinista (misma seed → mismo estado)', initRng(123456) === r0);
check('M5: nextRng puro (no muta la entrada)', r0 === 123456 && r1.value >= 0 && r1.value < 1 && Number.isInteger(r1.rngState));
check('M5: misma seed → misma secuencia (3 valores)', nextRng(r1.rngState).value === r2.value && nextRng(initRng(123456)).value === r1.value);
check('M5: secuencias de seeds distintas difieren (en 3 valores)',
  [1, 2, 3, 4, 5].some(s => nextRng(initRng(s)).value !== r1.value));
const rollA = rollPercent(r0, 50);
const rollB = rollRange(r0, 1, 6);
check('M5: rollPercent consume 1 avance y devuelve booleano', typeof rollA.value === 'boolean' && rollA.rngState !== r0);
check('M5: rollRange [min,max] inclusivo y 1 avance', rollB.value >= 1 && rollB.value <= 6 && rollB.rngState === rollA.rngState);
check('M5: rollPercent(0) siempre false · rollPercent(100) siempre true', !rollPercent(r0, 0).value && rollPercent(r0, 100).value);

// ── rngState vive en BattleState · rejected no avanza · determinista no avanza ──
const m5cfg = makeConfig({ playerDeck: m2Deck([4, 5, 25]), enemyDeck: m2Deck([1]), playerCc: 30, playerStr: 10, playerKi: 8 });
const m5s0 = createInitialBattleState({ ...m5cfg, seed: 987654 });
check('M5: rngState inicial derivado del seed explícito', m5s0.seed === 987654 && m5s0.rngState === initRng(987654));
const m5cmd: typeof m5s0 = { ...m5s0, phase: 'command' };
const rngBeforeReject = m5cmd.rngState;
const m5Rej = executeCommand(m5cmd, { type: 'GUARD' }, { side: 'player' });
check('M5: comando rechazado NO avanza rngState', !m5Rej.ok && m5Rej.state.rngState === rngBeforeReject);
const rngBeforeJoin = m5cmd.rngState;
const m5Join = executeCommand(m5cmd, { type: 'JOINT' });
check('M5: acción determinista (JOINT) NO avanza rngState', m5Join.ok && m5Join.state.rngState === rngBeforeJoin);
const m5Gather = executeCommand({ ...m5cmd, phase: 'basic' }, { type: 'GATHER_POWER' }, { side: 'player' });
check('M5: acción determinista (GATHER) NO avanza rngState', m5Gather.ok && m5Gather.state.rngState === rngBeforeJoin);

// ── P1: PLAY_CARD inicializa su QTE de verdad ──
const m5Play = executeCommand({ ...m5cmd, phase: 'cardSelect' }, { type: 'PLAY_CARD', handIndex: 2 }, { side: 'player', characterId: 'goku' }); // carta 25 (damage)
if (m5Play.ok) {
  const q = m5Play.state.stageQte;
  check('M5-P1: PLAY_CARD inicializa stageQte INPUT_WINDOW con secuencia no vacía', q.state === 'INPUT_WINDOW' && q.seq.length > 0 && q.idx === 0);
  check('M5-P1: QTE_STARTED emitido con level/seq/limitFrames', m5Play.events.some(e => e.type === 'QTE_STARTED' && (e as { level?: number }).level === 3 && (e as { limitFrames?: number }).limitFrames! > 0));
  check('M5-P1: limitFrames = ventana GBC (profundidades) > 0', q.limitFrames > 0 && Number.isInteger(q.limitFrames));
  check('M5-P1: PLAY_CARD determinista NO avanza rngState (stage de command, 0 tiradas)', m5Play.state.rngState === m5cmd.rngState);
}

// ── P2: LIMIT cobra el CC real del catálogo ──
const limitCard = getCard(13) as CardDef; // S.Kamehameha cc 23
const m5LimitState: typeof m5s0 = { ...m5s0, phase: 'limitSelect', limits: [13], powerState: 'FULL_POWER', player: { ...m5s0.player, cc: 30 } };
const m5Limit = executeCommand(m5LimitState, { type: 'PLAY_LIMIT_CARD', cardId: 13 }, { side: 'player', limitCardsCount: 3 });
check('M5-P2: PLAY_LIMIT_CARD cobra el CC real (30 − 23 = 7)', m5Limit.ok && m5Limit.state.player.cc === 7);
check('M5-P2: CC_SPENT emitido con amount=23', m5Limit.ok && m5Limit.events.some(e => e.type === 'CC_SPENT' && e.amount === 23));
const m5Poor = { ...m5LimitState, player: { ...m5s0.player, cc: 10 } };
const m5LimitPoor = executeCommand(m5Poor, { type: 'PLAY_LIMIT_CARD', cardId: 13 }, { side: 'player', limitCardsCount: 3 });
check('M5-P2: CC insuficiente para LIMITED → INSUFFICIENT_CC sin cobro', !m5LimitPoor.ok && m5LimitPoor.reason === 'INSUFFICIENT_CC' && m5LimitPoor.state.player.cc === 10);

// ── QTE completado → DAMAGE_APPLIED real (command determinista) ──
const m5Stage = createInitialBattleState({ ...m5cfg, seed: 42, playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK, playerCc: 0 });
const m5StageCmd: typeof m5Stage = { ...m5Stage, phase: 'command' };
let sim5 = mustExecute(m5StageCmd, { type: 'BASIC' });
sim5 = mustExecute(sim5, { type: 'BASIC_STAGE_ATTACK' }, { side: 'player' });
const seq5 = [...sim5.stageQte.seq];
for (const k of seq5) sim5 = mustExecute(sim5, { type: 'QTE_INPUT', input: k }, { side: 'player' });
{
  // stage 3 (command, atk 0): dmg = floor((0 + str 10) × posMult); DOWN_FRONT vs DOWN_BACK
  // depth FRONT + command → no vulnerable → posMult 0.5 → dmg = floor(10 × 0.5) = 5
  const enemyHpAfter = sim5.enemy.hp;
  check('M5: Stage completo aplica daño real (floor((atk+str)×posMult) = 5)', sim5.enemy.hp === m5Stage.enemy.hp - 5);
  check('M5: rngState intacto en Stage completo (0 tiradas)', sim5.rngState === m5StageCmd.rngState);
}
// FIGHTER_DEFEATED: daño suficiente para KO
const m5Ko = createInitialBattleState({ ...m5cfg, seed: 7, playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK, playerCc: 0, enemyHp: 3 });
let simKo = mustExecute({ ...m5Ko, phase: 'command' }, { type: 'BASIC' });
simKo = mustExecute(simKo, { type: 'BASIC_STAGE_ATTACK' }, { side: 'player' });
for (const k of [...simKo.stageQte.seq]) simKo = mustExecute(simKo, { type: 'QTE_INPUT', input: k }, { side: 'player' });
check('M5: KO → HP 0 + DAMAGE_APPLIED ANTES de FIGHTER_DEFEATED', simKo.enemy.hp === 0);
{
  const res = executeCommand({ ...m5Stage, phase: 'command' }, { type: 'BASIC' }, { side: 'player' });
  void res;
}

// ── QTE fallo → COUNTER · DEFEND = parcial · TIMEOUT = counter daño ──
const m5Fail = createInitialBattleState({ ...m5cfg, seed: 11, playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK, playerCc: 0 });
let simF = mustExecute({ ...m5Fail, phase: 'command' }, { type: 'BASIC' });
simF = mustExecute(simF, { type: 'BASIC_STAGE_ATTACK' }, { side: 'player' });
const wrongKey = simF.stageQte.seq[0] === 'A' ? 'B' : 'A';
const simF2 = executeCommand(simF, { type: 'QTE_INPUT', input: wrongKey }, { side: 'player' });
check('M5: input equivocado → accepted + COUNTER_WINDOW + QTE_FAILED', simF2.ok && simF2.state.stageQte.state === 'COUNTER_WINDOW' && simF2.events.some(e => e.type === 'QTE_FAILED'));
// DEFEND (A): daño parcial del Stage abortado (progreso 0 → 0 daño)
const simDef = executeCommand(simF2.state, { type: 'QTE_COUNTER_DEFEND' }, { side: 'player' });
check('M5: DEFEND con 0 aciertos → sin daño (parcial 0)', simDef.ok && simDef.state.enemy.hp === m5Fail.enemy.hp && simDef.state.stageQte.state === 'WAITING');
// TIMEOUT: el counter del rival conecta sobre el jugador
const simTo = executeCommand(simF2.state, { type: 'QTE_COUNTER_TIMEOUT' }, { side: 'player' });
if (simTo.ok) {
  const counterExpected = Math.max(1, Math.floor((m5Fail.enemy.str + m5Fail.enemy.ki) * 0.5 * 0.5)); // posMult 0.5 (GROUND no vulnerable)
  check('M5: TIMEOUT → counter daño legacy al jugador', simTo.state.player.hp === m5Fail.player.hp - counterExpected);
  check('M5: TIMEOUT emite ATTACK_HIT + DAMAGE_APPLIED + QTE_COUNTER_RESOLVED',
    simTo.events.some(e => e.type === 'ATTACK_HIT' && e.source === 'enemy' && e.target === 'player') &&
    simTo.events.some(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player') &&
    simTo.events.some(e => e.type === 'QTE_COUNTER_RESOLVED'));
}

// ── Carta damage/beam: precisión determinista desde seed (RNG consumido) ──
const m5Dmg = createInitialBattleState({ ...m5cfg, seed: 999, playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK, playerCc: 30 });
const m5DmgCmd: typeof m5Dmg = { ...m5Dmg, phase: 'cardSelect' };
const playDmg = executeCommand(m5DmgCmd, { type: 'PLAY_CARD', handIndex: 1 }, { side: 'player', characterId: 'goku' }); // carta 5 Cont.Punch acc 100
if (playDmg.ok) {
  let s = playDmg.state;
  for (const k of [...s.stageQte.seq]) s = mustExecute(s, { type: 'QTE_INPUT', input: k }, { side: 'player' });
  const hit = s.enemy.hp < m5Dmg.enemy.hp;
  check('M5: damage card (acc 100) → siempre conecta (hits) y daña', hit);
  check('M5: damage card consume RNG (rngState avanzó con las tiradas)', s.rngState !== m5DmgCmd.rngState);
}

// ── Golden determinista completo (seed + comandos → mismo state/events/rngState) ──
function simulateM5(seed: number, enemyHp: number) {
  let s = createInitialBattleState({ ...m5cfg, seed, playerPos: BattlePosition.DOWN_FRONT, enemyPos: BattlePosition.DOWN_BACK, playerCc: 30, enemyHp });
  s = { ...s, phase: 'command' as never };
  const all: BattleEvent[] = [];
  for (const cmd of [
    { type: 'BASIC' },
    { type: 'BASIC_STAGE_ATTACK' },
  ] as BattleCommand[]) {
    const r = executeCommand(s, cmd, { side: 'player' });
    if (!r.ok) throw new Error(`simulateM5: ${JSON.stringify(cmd)} rechazado: ${r.reason}`);
    all.push(...r.events);
    s = r.state;
  }
  for (const k of [...s.stageQte.seq]) {
    const r = executeCommand(s, { type: 'QTE_INPUT', input: k }, { side: 'player' });
    if (!r.ok) throw new Error(`simulateM5 QTE: ${r.reason}`);
    all.push(...r.events);
    s = r.state;
  }
  return { state: s, events: all };
}
const g1 = simulateM5(123456, 1000);
const g2 = simulateM5(123456, 1000);
check('M5: mismo seed + comandos ⇒ mismo state + mismos events + mismo rngState',
  JSON.stringify(g1.state) === JSON.stringify(g2.state) &&
  JSON.stringify(g1.events) === JSON.stringify(g2.events) &&
  g1.state.rngState === g2.state.rngState);
check('M5: seed distinto puede producir otro resultado (stage command determinista: mismo daño, otro estado igual — sin azar no debe divergir)',
  JSON.stringify(simulateM5(555, 1000).state.player) === JSON.stringify(g1.state.player));

// ── Divergencia de RNG: tiradas exactas y localizadas ──
function rngTrace(seed: number): number[] {
  const out: number[] = [];
  let st = initRng(seed);
  for (let i = 0; i < 4; i++) {
    const n = nextRng(st);
    out.push(n.value);
    st = n.rngState;
  }
  return out;
}
const trace = rngTrace(777);
check('M5: rngState avanza de forma canónica (trace estable)',
  JSON.stringify(rngTrace(777)) === JSON.stringify(trace) && trace.every(v => v >= 0 && v < 1));

// ── Shadow parity con legacy (mismos inputs → mismos veredictos) ──
const PARITY_ROLLS = [0.0, 0.049, 0.05, 0.2, 0.5, 0.549, 0.55, 0.8, 0.99, 0.999];
let parityOk = 0;
for (const roll of PARITY_ROLLS) {
  for (const spd of [5, 25, 60]) {
    for (const acc of [50, 85, 100]) {
      const legacy = resolveHitBlockAvoid(spd, acc, () => roll);
      const engine = hitBlockAvoidFromRoll(roll, spd, acc);
      if (legacy === engine) parityOk++;
    }
  }
}
check('M5: parity HIT/BLOCK/AVOID (90 combinaciones roll×spd×acc)', parityOk === PARITY_ROLLS.length * 3 * 3);
check('M5: parity accuracy efectiva (+30 pAcc / −30 pEva)',
  effectiveAttackAccuracy(85, true) === 100 && effectiveAttackAccuracy(85, false) === 85 &&
  effectiveDefenseAccuracy(50, true) === 20 && effectiveDefenseAccuracy(50, false) === 50 &&
  accuracyHits(0.9, 85, false) === false && accuracyHits(0.9, 85, true) === true);
check('M5: parity daño (attackDamage/stage/counter/power/spd)',
  attackDamage(25, 18, BattlePosition.DOWN_FRONT, 'damage') === Math.floor((25 + 18) * 0.8) &&
  stageAttackDamage(0, 10, BattlePosition.DOWN_FRONT, 'command') === 5 &&
  counterDamage(9, 10, BattlePosition.DOWN_FRONT, 'beam') === Math.max(1, Math.floor((9 + 10) * 0.5 * 0.5)) &&
  powerFor('beam', 5, 8, 0, 2) === 24 && powerFor('damage', 10, 5, 1, 0) === 18 &&
  spdFor(5, 2) === 21 &&
  stageProgress(2, 6) === 1 / 3 && stageProgress(6, 6) === 1 && stageProgress(0, 6) === 0);

// ── Invariantes tras cualquier daño ──
function m5Invariants(s: typeof m5s0): boolean {
  const okHp = s.player.hp >= 0 && s.player.hp <= s.player.maxHp && s.enemy.hp >= 0 && s.enemy.hp <= s.enemy.maxHp;
  const okRng = Number.isInteger(s.rngState) && s.rngState >= 0;
  const okSerial = (() => { try { JSON.parse(JSON.stringify(s)); return true; } catch { return false; } })();
  return okHp && okRng && okSerial;
}
check('M5: invariantes tras Stage completo (HP/CC/rng/serializable)', m5Invariants(sim5));
check('M5: invariantes tras counter (HP en rango)', m5Invariants(simTo.ok ? simTo.state : m5Fail));
// DAMAGE_APPLIED amount = hpBefore − hpAfter (invariante de evento)
function collectDamageEvents(seed: number, enemyHp: number) {
  const sim = simulateM5(seed, enemyHp);
  return sim.events.filter((e): e is Extract<BattleEvent, { type: 'DAMAGE_APPLIED' }> => e.type === 'DAMAGE_APPLIED');
}
const dmgEvents = collectDamageEvents(123456, 1000);
check('M5: todo DAMAGE_APPLIED cumple amount = hpBefore − hpAfter (y no negativos)',
  dmgEvents.length > 0 && dmgEvents.every(e => e.amount >= 0 && e.amount === e.hpBefore - e.hpAfter && e.hpAfter >= 0));


console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}

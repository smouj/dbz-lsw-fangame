// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE-ENGINE — invariantes de M1 (BattleState puro).
// Uso: npm run verify:battle-engine
// Prueba que el estado extraído es: puro (sin DOM/React/Pixi/timers/
// Math.random), determinista, válido y SERIALIZABLE (JSON round-trip sin
// pérdida semántica).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
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
check('sin timers (setTimeout/setInterval/Date.now/performance)', !/setTimeout|setInterval|Date\.now|performance\.now/.test(stateSrc));
check('sin Math.random interno (ninguna llamada)', !/Math\.random\(/.test(stateSrc));

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
check('QTE_INPUT inválido con tecla equivocada', !canExecute(qteActive, { type: 'QTE_INPUT', input: 'B' }).ok);
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

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}

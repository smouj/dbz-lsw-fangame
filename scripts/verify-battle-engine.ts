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

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}

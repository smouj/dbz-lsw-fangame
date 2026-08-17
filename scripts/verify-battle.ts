// ═══════════════════════════════════════════════════════════════════════
// VERIFY: BATTLE — tests DETERMINISTAS del motor (src/battle/state.ts).
// No son validaciones estáticas: ejecutan las reglas reales del combate
// (deck, robo, descarte, reshuffle, límites) y fallan si algo se rompe.
// Uso: npm run verify:battle
// ═══════════════════════════════════════════════════════════════════════

import {
  createBattleDeck, drawOne, playJoint, discardOne, needsDiscard,
  registerCardResolver, seededRng,
  HAND_INITIAL, HAND_MAX_PERSISTENT, HAND_MAX_TRANSITORY,
  CC_GAIN_PER_ATTACK_PHASE,
  type JointDeckState,
} from '../src/battle/state';
import {
  initialState as engineInit, enterAttackPhase, drawFor, toCommand,
  selectCommand, playCard, settleAfterAction, chooseDiscard, defendAction,
  playEnemyCard, settleEnemyAction, type BattleEngineState,
} from '../src/battle/engine';
import { getCard } from '../src/data/cards';

registerCardResolver(id => getCard(typeof id === 'number' ? id : Number(id)));

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const DECK_20 = Array.from({ length: 20 }, (_, i) => i + 1);

console.log('═══ BATTLE ENGINE — tests deterministas ═══\n');

// ── 1. createBattleDeck: baraja UNA vez → mano 3 + drawPile 17 ──
console.log('▸ createBattleDeck');
{
  const d = createBattleDeck(DECK_20);
  check('mano inicial = 3', d.hand.length === HAND_INITIAL, `got ${d.hand.length}`);
  check('drawPile = 17', d.drawPile.length === 20 - HAND_INITIAL, `got ${d.drawPile.length}`);
  check('discardPile = 0', d.discardPile.length === 0);
  const all = [...d.hand, ...d.drawPile];
  const ids = all.map(c => c.id).sort((a, b) => a - b);
  check('mazo completo sin pérdidas ni duplicados', JSON.stringify(ids) === JSON.stringify([...DECK_20].sort((a, b) => a - b)));
}
// Determinismo por seed
{
  const a = createBattleDeck(DECK_20, { seed: 42 });
  const b = createBattleDeck(DECK_20, { seed: 42 });
  check('misma seed → mismo shuffle', JSON.stringify(a.hand.map(c => c.id)) === JSON.stringify(b.hand.map(c => c.id)));
  const c = createBattleDeck(DECK_20, { seed: 43 });
  check('seed distinta → orden distinto', JSON.stringify(a.hand.map(c => c.id)) !== JSON.stringify(c.hand.map(c => c.id)));
}
// Filtro usable
{
  const d = createBattleDeck(DECK_20, { usable: c => c.id % 2 === 0 });
  const usableIds = [...d.hand, ...d.drawPile].map(c => c.id);
  check('filtro usable aplicado (solo pares)', usableIds.every(id => id % 2 === 0), usableIds.join(','));
}

// ── 2. drawOne: roba del drawPile (nunca re-sorteo del original) ──
console.log('\n▸ drawOne');
{
  const d0 = createBattleDeck(DECK_20, { seed: 7 });
  const drawPile0 = d0.drawPile.map(c => c.id);
  const { state: d1, card } = drawOne(d0);
  check('roba 1 carta', card !== null);
  check('hand 3 → 4', d1.hand.length === 4, `got ${d1.hand.length}`);
  check('drawPile 17 → 16', d1.drawPile.length === 16, `got ${d1.drawPile.length}`);
  check('la carta robada es la PRIMERA del drawPile (no un random del original)', card?.id === drawPile0[0], `got ${card?.id}, expected ${drawPile0[0]}`);
  check('la carta robada está en la mano', d1.hand.some(c => c.id === card?.id));
}
// Límite transitorio: con 6 en mano, el robo va al discard (nunca 7)
{
  const d: JointDeckState = {
    drawPile: DECK_20.slice(0, 2).map(id => getCard(id)!),
    hand: [3, 4, 5, 6, 7, 8].map(id => getCard(id)!),
    discardPile: [],
  };
  const { state: d1, card } = drawOne(d);
  check('con 6 en mano, no se roba a la mano', d1.hand.length === HAND_MAX_TRANSITORY, `got ${d1.hand.length}`);
  check('la carta extra va al discardPile', d1.discardPile.length === 1, `got ${d1.discardPile.length}`);
  check('drawPile consumido', d1.drawPile.length === 1, `got ${d1.drawPile.length}`);
  void card;
}
// Reshuffle del discard cuando el drawPile se agota (drawPile VACÍO)
{
  const d: JointDeckState = {
    drawPile: [],
    hand: [getCard(2)!],
    discardPile: [getCard(3)!, getCard(4)!],
  };
  const { state: d1 } = drawOne(d);
  check('drawPile agotado → rebaraja el discard', d1.drawPile.length === 1, `got ${d1.drawPile.length}`);
  check('discardPile vacío tras rebarajar', d1.discardPile.length === 0, `got ${d1.discardPile.length}`);
  check('hand 1 → 2 (la carta rebarajada se roba)', d1.hand.length === 2, `got ${d1.hand.length}`);
  check('la carta robada viene del discard rebarajado', d1.hand.some(c => c.id === 3 || c.id === 4));
}
// Con drawPile NO vacío: roba de ahí sin tocar el discard
{
  const d: JointDeckState = {
    drawPile: [getCard(1)!],
    hand: [getCard(2)!],
    discardPile: [getCard(3)!, getCard(4)!],
  };
  const { state: d1 } = drawOne(d);
  check('drawPile con cartas → roba de ahí (sin rebarajar)', d1.drawPile.length === 0 && d1.discardPile.length === 2, `dp ${d1.drawPile.length} disc ${d1.discardPile.length}`);
}
// Sin cartas en ningún sitio → null
{
  const { state, card } = drawOne({ drawPile: [], hand: [], discardPile: [] });
  check('mazo vacío → card null', card === null);
  check('mazo vacío → estado intacto', state.hand.length === 0);
}

// ── 3. playJoint / discardOne: hand → discardPile (consumibles) ──
console.log('\n▸ playJoint / discardOne');
{
  const d = createBattleDeck(DECK_20, { seed: 5 });
  const played = d.hand[1];
  const d1 = playJoint(d, 1);
  check('playJoint: carta fuera de la mano', !d1.hand.includes(played));
  check('playJoint: carta en discardPile', d1.discardPile.includes(played));
  check('playJoint: drawPile intacto', d1.drawPile.length === d.drawPile.length);
  check('playJoint: mano 3 → 2', d1.hand.length === 2);
  check('playJoint: idx inválido → estado intacto', playJoint(d, 99) === d);
  const discarded = d.hand[0];
  const d2 = discardOne(d, 0);
  check('discardOne: carta fuera de la mano', !d2.hand.includes(discarded));
  check('discardOne: carta en discardPile', d2.discardPile.includes(discarded));
  check('discardOne: no muta el original', d.hand.length === 3);
}

// ── 4. needsDiscard: HAND CHECK (regla GBC: >5 tras la acción) ──
console.log('\n▸ needsDiscard');
{
  const d5: JointDeckState = { drawPile: [], hand: [1, 2, 3, 4, 5].map(id => getCard(id)!), discardPile: [] };
  check('5 cartas → NO descarte', !needsDiscard(d5));
  const d6: JointDeckState = { drawPile: [], hand: [1, 2, 3, 4, 5, 6].map(id => getCard(id)!), discardPile: [] };
  check('6 cartas → descarte requerido', needsDiscard(d6));
  check('máx persistente = 5', HAND_MAX_PERSISTENT === 5);
  check('máx transitorio = 6', HAND_MAX_TRANSITORY === 6);
}

// ── 5. Economía: +3 CC por Attack Phase ──
console.log('\n▸ Economía CC');
{
  check('CC_GAIN_PER_ATTACK_PHASE = 3', CC_GAIN_PER_ATTACK_PHASE === 3);
}

// ── 6. RNG determinista ──
console.log('\n▸ seededRng');
{
  const r1 = seededRng(1234);
  const r2 = seededRng(1234);
  const s1 = Array.from({ length: 8 }, () => r1());
  const s2 = Array.from({ length: 8 }, () => r2());
  check('misma seed → misma secuencia', JSON.stringify(s1) === JSON.stringify(s2));
  check('valores en [0,1)', s1.every(v => v >= 0 && v < 1));
  const r3 = seededRng(5678);
  check('seed distinta → secuencia distinta', r3() !== s1[0]);
}

// ── 7. Secuencia de combate completa (mano inicial → 2 robos → jugar → descartar) ──
console.log('\n▸ Secuencia canónica (simulación de 2 Attack Phases)');
{
  // Deck solo de Stage Attacks (cc 0) → siempre hay carta asequible
  const DECK_BARATO = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 1, 2, 3, 4, 1, 2, 3, 4];
  let s = createBattleDeck(DECK_BARATO, { seed: 99 });
  check('inicio: 3 cartas', s.hand.length === 3);
  // Attack Phase 1: +3 CC y robo (simulamos el CC del atacante)
  const cc = CC_GAIN_PER_ATTACK_PHASE;
  check('CC = 3 tras el +3 inicial', cc === 3);
  const r1 = drawOne(s);
  s = r1.state;
  check('tras robo 1: 4 cartas', s.hand.length === 4);
  // El jugador juega la primera carta asequible (simulamos cc 3)
  const idx = s.hand.findIndex(c => c.cc <= cc);
  if (idx >= 0) {
    s = playJoint(s, idx);
    check('tras jugar: 3 cartas', s.hand.length === 3);
    check('discardPile = 1', s.discardPile.length === 1);
  } else {
    check('mano con carta asequible (deck de prueba)', false, 'ninguna carta <= 3 CC en la mano');
  }
  // Attack Phase 2: +3 CC más y robo
  const r2 = drawOne(s);
  s = r2.state;
  check('tras robo 2: 4 cartas', s.hand.length === 4);
  check('sin descarte necesario (4 <= 5)', !needsDiscard(s));
  // 6 cartas → HAND CHECK real
  s = { ...s, hand: [...s.hand, getCard(11)!, getCard(12)!] };
  check('6 cartas → HAND CHECK', needsDiscard(s));
  s = discardOne(s, 0);
  check('tras descartar: 5 cartas', s.hand.length === HAND_MAX_PERSISTENT);
}

// ── 8. BATTLE ENGINE: máquina de fases compartida ──
console.log('\n▸ BattleEngine (fases/turnos)');
{
  // Deck solo de Stage Attacks (cc 0) → siempre hay carta asequible
  const BARATO = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 1, 2, 3, 4, 1, 2, 3, 4];
  const opts = { seed: 2026, deckIds: BARATO, eDeckIds: BARATO };
  let s: BattleEngineState = engineInit(opts);
  check('init: intro, turn 1, exchange 1', s.phase === 'intro' && s.turn === 1 && s.exchange === 1);
  check('init: mano 3 + drawPile 17 (ambos lados)', s.deck.hand.length === 3 && s.deck.drawPile.length === 17 && s.eDeck.hand.length === 3);
  // ATTACK_PHASE_ENTER: +3 CC y cue
  s = enterAttackPhase(s, 'player');
  check('attackPhase: +3 CC al atacante', s.player.cc === 3, `got ${s.player.cc}`);
  check('attackPhase: cue ATTACK PHASE', s.cue?.title === 'ATTACK PHASE');
  check('attackPhase: defensor sin +CC', s.enemy.cc === 0);
  // JOINT_DRAW: roba 1 del drawPile del atacante
  s = drawFor(s, 'player');
  check('draw: carta real del drawPile en pantalla', s.drawCard !== null);
  check('draw: mano 3 → 4', s.deck.hand.length === 4, `got ${s.deck.hand.length}`);
  check('draw: eDeck intacto', s.eDeck.hand.length === 3);
  // COMMAND: JOINT NO roba (abre la mano)
  s = toCommand(s);
  check('command: sin carta en vuelo', s.drawCard === null && s.phase === 'command');
  s = selectCommand(s, 'JOINT');
  check('JOINT → cardSelect sin robar', s.phase === 'cardSelect' && s.deck.hand.length === 4);
  // Jugar carta real: hand → discardPile + coste CC
  const idx = s.deck.hand.findIndex(c => c.cc <= s.player.cc);
  const before = s.deck.hand.length;
  if (idx >= 0) {
    s = playCard(s, idx);
    check('playCard: cinematic + carta fuera de hand', s.phase === 'cinematic' && s.deck.hand.length === before - 1);
    check('playCard: carta en discardPile', s.deck.discardPile.length === 1);
    check('playCard: CC descontado (stage = 0 CC → sin pérdida)', s.player.cc <= 3 && s.player.cc >= 0);
  } else {
    check('playCard: carta asequible en la mano (deck 1-20)', false, 'todas > 3 CC');
  }
  // HAND CHECK: 4 cartas → defend (sin discard)
  s = settleAfterAction(s);
  check('settle: 4 cartas → defend', s.phase === 'defend');
  // Defensa → Exchange 2 con roles invertidos
  s = defendAction(s, 'GUARD');
  check('defend: exchange 2, atacante = enemigo', s.exchange === 2 && s.attacker === 'enemy');
  check('defend: fase command (turno del rival)', s.phase === 'command');
  // El enemigo ataca con SU mazo (autopilot): roba + juega
  s = enterAttackPhase(s, 'enemy');
  check('enemy attackPhase: +3 CC enemigo', s.enemy.cc === 3, `got ${s.enemy.cc}`);
  s = drawFor(s, 'enemy');
  check('enemy draw: eDeck hand 3 → 4', s.eDeck.hand.length === 4, `got ${s.eDeck.hand.length}`);
  s = toCommand(s);
  const eIdx = s.eDeck.hand.findIndex(c => c.cc <= s.enemy.cc);
  if (eIdx >= 0) {
    s = playEnemyCard(s, eIdx);
    check('playEnemyCard: cinematic + eHand--', s.phase === 'cinematic' && s.eDeck.hand.length === 3);
    check('playEnemyCard: carta en eDiscardPile', s.eDeck.discardPile.length === 1);
    s = settleEnemyAction(s);
    check('settleEnemy: defend', s.phase === 'defend');
  } else {
    check('playEnemyCard: carta asequible', false, 'todas > 3 CC en eHand');
  }
  // Defensa → nuevo TURN (exchange 1, turn 2, atacante jugador)
  s = defendAction(s, 'MOVE');
  check('defend: turno 2, exchange 1', s.turn === 2 && s.exchange === 1 && s.attacker === 'player');
  // DISCARD_REQUIRED real: mano 6 → discard → 5
  let d = { ...s, deck: { ...s.deck, hand: [...s.deck.hand, getCard(11)!, getCard(12)!, getCard(13)!] } };
  d = settleAfterAction(d);
  check('settle con 6 → fase discard', d.phase === 'discard');
  d = chooseDiscard(d, 0);
  check('chooseDiscard: 5 cartas y defend', d.deck.hand.length === 5 && d.phase === 'defend');
}

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

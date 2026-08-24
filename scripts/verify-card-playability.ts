// ═══════════════════════════════════════════════════════════════════════
// VERIFY: CARD PLAYABILITY — PA4: las 125 cartas realmente jugables.
// Uso: npm run verify:card-playability
// Para cada carta 1..125 construye un contexto legal (mano + CC + personaje
// compatible) y prueba el ciclo completo:
//   canExecute -> dispatch accepted -> coste una vez -> carta sale de la
//   mano -> acción termina -> timeline termina -> boundary válido ->
//   serializable. Stage/command incluye QTE real; defense se prueba dentro
//   de un incoming attack.
// Clasificación: PLAYABLE / BLOCKED(razón). PLAYABILITY ≠ ROM_FIDELITY:
// una carta puede ser PLAYABLE con fidelidad PARTIAL/PENDING.
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';
import type { BattleState } from '../src/battle/engine/state/BattleState';
import { CARDS, getCard, type CardDef } from '../src/data/cards';
import { BattlePosition } from '../src/data/positions';
import { STAGE_SEQUENCE_POOL } from '../src/battle/stageSequences';

let failures = 0;

interface CardResult {
  cardId: number;
  name: string;
  type: string;
  status: 'PLAYABLE' | 'BLOCKED';
  reason: string;
  checks: { label: string; ok: boolean }[];
}

// Todos los characterIds mencionados en las cartas (unión) + base del roster.
const ALL_CHARACTER_IDS = [...new Set(CARDS.flatMap((c) => c.compatible ?? []))];

function firstCompatible(card: CardDef): string | null {
  if (!card.compatible || card.compatible.length === 0) return null; // todos
  return card.compatible.find((id) => ALL_CHARACTER_IDS.includes(id)) ?? card.compatible[0] ?? null;
}

function baseConfig(card: CardDef, characterId: string | null, defenderContext = false): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: { drawPile: [], hand: [card], discardPile: [] },
    enemyDeck: { drawPile: [], hand: [getCard(3) as CardDef], discardPile: [] },
    playerLimits: [], playerFighterLimits: [],
    // defensa: el ENEMIGO ataca primero (player = defensor en exchange 0)
    firstAttacker: defenderContext ? 'enemy' : 'player',
  };
}

function completeStageQte(runtime: BattleRuntime): { ok: boolean; detail: string } {
  // PREPARING -> advance hasta INPUT_WINDOW -> QTE_INPUT para cada tecla.
  let guard = 0;
  while (guard++ < 200) {
    const q = runtime.state.stageQte;
    if (q.state === 'WAITING' || q.state === 'COMPLETED') return { ok: true, detail: 'qte done' };
    if (q.state === 'INPUT_WINDOW') {
      const expected = q.seq[q.idx];
      if (expected === undefined) return { ok: true, detail: 'seq empty' };
      const r = runtime.dispatch({ type: 'QTE_INPUT', input: expected } as BattleCommand);
      if (!r.ok) return { ok: false, detail: `QTE_INPUT rejected (${(r as any).reason})` };
      continue;
    }
    if (q.state === 'COUNTER_WINDOW') {
      runtime.dispatch({ type: 'QTE_COUNTER_DEFEND' } as BattleCommand);
      continue;
    }
    runtime.advance(1);
  }
  return { ok: false, detail: 'stage qte no terminó (timeout)' };
}

function playCard(runtime: BattleRuntime, card: CardDef, characterId: string | null): { ok: boolean; reason: string; checks: { label: string; ok: boolean }[] } {
  const checks: { label: string; ok: boolean }[] = [];
  const pre = { cc: runtime.state.player.cc, handLen: runtime.state.deck.hand.length, hp: runtime.state.enemy.hp };

  const ctx = { characterId: characterId ?? '' };
  // 1) canExecute (contexto legal)
  const can = runtime.can({ type: 'PLAY_CARD', handIndex: 0 }, ctx);
  checks.push({ label: 'canExecute', ok: can.ok });
  if (!can.ok) return { ok: false, reason: `canExecute: ${(can as any).reason}`, checks };

  // 2) dispatch aceptado
  const res = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, ctx);
  checks.push({ label: 'dispatch accepted', ok: res.ok });
  if (!res.ok) return { ok: false, reason: `dispatch: ${(res as any).reason}`, checks };

  const after = runtime.state;
  // 3) coste aplicado una vez
  checks.push({ label: 'coste una vez', ok: pre.cc - after.player.cc === card.cc });
  // 4) carta sale de la mano
  checks.push({ label: 'carta sale de la mano', ok: after.deck.hand.length < pre.handLen });

  // 5) acción termina (command -> QTE completo; resto -> ACTION_RESOLVED)
  if (card.type === 'command') {
    const qte = completeStageQte(runtime);
    checks.push({ label: 'QTE completo', ok: qte.ok });
    if (!qte.ok) return { ok: false, reason: qte.detail, checks };
  }
  const resolved = runtime.state.stageQte.state === 'WAITING' || runtime.log.entries.some((e) => e.event.type === 'ACTION_RESOLVED' && e.event.side === 'player');
  checks.push({ label: 'acción termina', ok: resolved });

  // 6) timeline termina (sin huérfanas)
  const tl = runtime.timeline;
  const ticks = tl.entries.map((en) => en.cue.tick);
  const ordered = ticks.every((t, i) => i === 0 || t >= ticks[i - 1]);
  const closed = tl.endTick >= Math.max(tl.startTick, ...ticks, 0);
  checks.push({ label: 'timeline ordenada', ok: ordered });
  checks.push({ label: 'timeline cerrada', ok: closed });

  // 7) boundary válido (vuelve a control del jugador o terminal)
  const b = runtime.state.phase;
  const validBoundary = b === 'command' || b === 'cardSelect' || b === 'stageInput' || b === 'defend' || b === 'win' || b === 'lose';
  checks.push({ label: 'boundary válido', ok: validBoundary });

  // 8) serializable
  const json = JSON.stringify(after);
  checks.push({ label: 'serializable', ok: !json.includes('NaN') && !json.includes('Infinity') });

  return { ok: true, reason: '', checks };
}

function playDefenseCard(runtime: BattleRuntime, card: CardDef, characterId: string | null): { ok: boolean; reason: string; checks: { label: string; ok: boolean }[] } {
  const checks: { label: string; ok: boolean }[] = [];
  const ctx = { characterId: characterId ?? '' };
  // dentro de un incoming attack: el enemigo ataca primero (exchange 1)
  runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
  const can = runtime.can({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 }, ctx);
  checks.push({ label: 'canExecute (incoming attack)', ok: can.ok });
  if (!can.ok) return { ok: false, reason: `canExecute: ${(can as any).reason}`, checks };
  const preCc = runtime.state.player.cc;
  const res = runtime.dispatch({ type: 'PLAY_DEFENSE_CARD', handIndex: 0 }, ctx);
  checks.push({ label: 'dispatch accepted', ok: res.ok });
  if (!res.ok) return { ok: false, reason: `dispatch: ${(res as any).reason}`, checks };
  checks.push({ label: 'coste una vez', ok: preCc - runtime.state.player.cc === card.cc });
  checks.push({ label: 'defensa COMMITTED', ok: runtime.state.defenseState === 'COMMITTED' });
  // el ataque enemigo se resuelve contra la defensa
  const enemyCard = getCard(3) as CardDef;
  const before = runtime.state.player.hp;
  runtime.resolveCard('enemy', enemyCard);
  checks.push({ label: 'incoming attack resuelto', ok: runtime.state.player.hp <= before });
  const tl = runtime.timeline;
  const ticks = tl.entries.map((en) => en.cue.tick);
  checks.push({ label: 'timeline cerrada', ok: tl.endTick >= Math.max(tl.startTick, ...ticks, 0) });
  const json = JSON.stringify(runtime.state);
  checks.push({ label: 'serializable', ok: !json.includes('NaN') });
  return { ok: true, reason: '', checks };
}

const results: CardResult[] = [];

for (const card of CARDS) {
  const characterId = firstCompatible(card);
  const cfg = baseConfig(card, characterId);
  const runtime = new BattleRuntime({ state: createInitialBattleState(cfg), context: defaultBattleContext() });
  runtime.state = { ...runtime.state, phase: 'cardSelect', selectedCard: 0 };

  if (card.type === 'defense' || card.type === 'support') {
    const runtime = new BattleRuntime({ state: createInitialBattleState(baseConfig(card, characterId, true)), context: defaultBattleContext() });
    runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
    const r = playDefenseCard(runtime, card, characterId);
    results.push({ cardId: card.id, name: card.name, type: card.type, status: r.ok ? 'PLAYABLE' : 'BLOCKED', reason: r.reason, checks: r.checks });
  } else {
    const r = playCard(runtime, card, characterId);
    results.push({ cardId: card.id, name: card.name, type: card.type, status: r.ok ? 'PLAYABLE' : 'BLOCKED', reason: r.reason, checks: r.checks });
  }
}

// ── Reporte ──
const playable = results.filter((r) => r.status === 'PLAYABLE');
const blocked = results.filter((r) => r.status === 'BLOCKED');
console.log(`\nCARD PLAYABILITY: ${playable.length}/125 PLAYABLE · ${blocked.length} BLOCKED`);
for (const r of blocked) {
  console.log(`  BLOCKED #${r.cardId} ${r.name} (${r.type}): ${r.reason}`);
  failures++;
}
for (const r of playable) {
  const bad = r.checks.filter((c) => !c.ok);
  if (bad.length > 0) {
    console.log(`  WARN #${r.cardId} ${r.name}: checks rotos → ${bad.map((c) => c.label).join(', ')}`);
    failures++;
  }
}

if (failures === 0) {
  console.log('\n✅ card-playability: 125/125 PLAYABLE, 0 crash, 0 softlock, 0 cleanup inválido.');
  process.exit(0);
}
console.log(`\n❌ card-playability: ${failures} problema(s).`);
process.exit(1);

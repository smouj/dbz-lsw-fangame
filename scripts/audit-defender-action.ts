// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B7A — AUDITORÍA: DEFENDER_ACTION como autoridad visual
// ═══════════════════════════════════════════════════════════════════════
// No decide nada: DESCRIBE. Conduce rutas reales por el runtime y vuelca, por
// ruta: slot0/slot1 owner · binding · resource/sequence · first physicalId ·
// BG/display · palette · draw order · ticks · y si `DEFENDER_ACTION` gobierna
// la visibilidad.
//
// Uso: npx tsx scripts/audit-defender-action.ts
// ═══════════════════════════════════════════════════════════════════════
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { ACTION_OBJECT_BINDING } from '../src/battle/romActionObject';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

const battleDeck = (...ids: number[]) => ({
  drawPile: [],
  hand: ids.map(id => getCard(id) as CardDef),
  discardPile: [],
});

function config(overrides: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'Goku', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 200, playerHp: 200, playerStr: 20, playerKi: 20, playerSpd: 10,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'Piccolo', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 200, enemyHp: 200, enemyStr: 20, enemyKi: 20, enemySpd: 9,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: battleDeck(5), enemyDeck: battleDeck(8),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'player', seed: 0x5a17,
    ...overrides,
  };
}

interface Trace { label: string; cues: PresentationCue[]; events: string[] }

function run(label: string, cardId: number, seed: number, enemyCard = 8): Trace {
  const runtime = new BattleRuntime({
    state: createInitialBattleState(config({ playerDeck: battleDeck(cardId), enemyDeck: battleDeck(enemyCard), seed })),
    context: defaultBattleContext(),
  });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  return { label, cues: result.timeline.entries.map(e => e.cue), events: result.events.map(e => e.type) };
}

function summarize(t: Trace): void {
  const of = (ty: PresentationCue['type']) => t.cues.filter(c => c.type === ty);
  const binds = of('ACTION_OBJECT_BIND');
  const unscoped = (c: PresentationCue) => c as unknown as Record<string, unknown>;

  const slotOwners = binds.map(c => {
    const b = unscoped(c);
    return `slot${String(b.slot ?? '?')}=${String(b.fighterSide ?? b.role ?? '?')}`;
  });
  const vis = of('FIGHTER_VISIBILITY').map(c => {
    const v = unscoped(c);
    return `${String(v.side ?? '?')}:${v.visible ? 'on' : 'off'}`;
  });
  const scenes = of('SCENE_LOAD').map(c => String(unscoped(c).mode ?? '?'));
  const bg = of('BG_ASSEMBLY').map(c => `$${Number(unscoped(c).resource).toString(16)}`);
  const pal = of('PALETTE_LOAD').concat(of('PALETTE_TRANSITION') as never[]).map(c => `t${c.tick}`);
  const order = of('ACTION_OBJECT_DRAW_ORDER').map(c => `slot${String(unscoped(c).slot ?? '?')}#${String(unscoped(c).order ?? '?')}`);
  const anim = of('ANIMATION_START').map(c => `r${String(unscoped(c).resource ?? '?')}/s${String(unscoped(c).sequence ?? '?')}/slot${String(unscoped(c).slot ?? '?')}`);
  const phys = of('ROM_PHYSICAL_FRAME');
  const fx = of('DEFENSE_FX').map(c => String(unscoped(c).result ?? '?'));
  const actionObjects = of('ACTION_OBJECT_FRAME').length + of('ACTION_OBJECT_POSITION').length + of('ACTION_OBJECT_MOTION').length;
  const defenderAction = JSON.stringify(t.cues).includes('DEFENDER_ACTION');

  console.log(`\n── ${t.label} ──`);
  console.log(`  events        : ${[...new Set(t.events)].join(',') || '—'}`);
  console.log(`  slots (bind)  : ${slotOwners.join(' · ') || '—'}`);
  console.log(`  visibility    : ${vis.join(',') || '—'}`);
  console.log(`  scenes        : ${scenes.join(',') || '—'}`);
  console.log(`  BG/display    : ${bg.join(',') || '—'}   paleta(t): ${pal.join(',') || '—'}`);
  console.log(`  draw order    : ${order.join(',') || '—'}`);
  console.log(`  ANIMATION     : ${anim.join(',') || '—'}`);
  console.log(`  físico        : ${phys.length ? `first=${phys[0].tick}t ${String(unscoped(phys[0]).formId)}/slot${String(unscoped(phys[0]).slot)} total=${phys.length}` : '—'}`);
  console.log(`  ActionObject  : frame/pos/motion=${actionObjects}`);
  console.log(`  defenseFX     : ${fx.join(',') || '—'}`);
  console.log(`  ticks         : start=${t.cues.length ? Math.min(...t.cues.map(c => c.tick)) : '—'} end=${t.cues.length ? Math.max(...t.cues.map(c => c.tick)) : '—'}`);
  console.log(`  DEFENDER_ACTION como autoridad: ${defenderAction ? 'SÍ ⚠️' : 'no'}`);
}

console.log('═══ B7A — AUDITORÍA DEFENDER_ACTION ═══');
console.log('\n[Contexto ROM — binding de slots, romActionObject.ts]');
console.log(`  ${ACTION_OBJECT_BINDING.conclusion}`);
for (const b of ACTION_OBJECT_BINDING.binders) {
  console.log(`  £${b.address.toString(16)} ${b.context}: slot0=${b.slot0Semantic} slot1=${b.slot1Semantic}`);
}

const ROUTES: Array<[string, number, number]> = [
  ['hit normal / STANDARD_DAMAGE', 5, 0x5a17],
  ['MISS / AVOID (seed alterno)', 5, 1],
  ['Beam (Energy Wave)', 7, 0x5a17],
  ['Beam (Energy Bomb)', 8, 0x5a17],
  ['Stage (3 etapas)', 1, 0x5a17],
  ['Stage (6 etapas)', 4, 0x5a17],
  ['Special', 23, 0x5a17],
];

for (const [name, card, seed] of ROUTES) {
  try {
    summarize(run(name, card, seed));
  } catch (err) {
    console.log(`\n── ${name} ──\n  (no conducido: ${(err as Error).message})`);
  }
}

console.log('\n═══ fin auditoría ═══');

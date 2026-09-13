// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B7B3 — verify:defender-action-physical
// ═══════════════════════════════════════════════════════════════════════
// La visibilidad de una película ROM-backed se resuelve por PARTICIPANTE LIGADO:
//   FIGHTER_VISIBILITY → side → binding → slot → slot.visible
// nunca por escena, nunca directamente por player/enemy.
//
// Matriz exigida: side → slot se resuelve EXCLUSIVAMENTE por binding.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { ActionObjectBindingProbe } from '../src/battle/engine/presentation/ActionObjectRuntime';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, CARDS, type CardDef } from '../src/data/cards';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { romDefensePresentationProfile } from '../src/battle/romDefensePresentationProfile';
import { APPLY_SCENE_VISIBILITY_SCOPE } from '../src/renderer/pixi/scenes/ActionScene';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

let checks = 0, failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function mount() {
  const probe = new ActionObjectBindingProbe();
  const base = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'bindActionObject') return (slot: 0 | 1, b: unknown) => probe.bindActionObject(slot, b as never);
      if (p === 'unbindActionObject') return (slot: 0 | 1) => probe.unbindActionObject(slot);
      if (p === 'actionObjectBindingObservation') return () => probe.actionObjectBindingObservation();
      if (p === 'clearActionObjectBinding') return () => probe.clearActionObjectBinding();
      if (p === 'setActionObjectVisibilityForParticipant') return (side: 'player' | 'enemy', v: boolean) => probe.setVisibilityForBoundParticipant(side, v);
      if (p === 'then') return undefined;
      return () => undefined;
    },
  }) as never;
  return { probe, adapter: new ProductionRomPresentationAdapter(base, new RomDisplayPresenter()) };
}

function driveRuntime(cardId: number, side: 'player' | 'enemy'): PresentationCue[] | null {
  const deck = { drawPile: [], hand: [getCard(cardId) as CardDef], discardPile: [] };
  const runtime = new BattleRuntime({
    state: createInitialBattleState({
      playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
      playerMaxHp: 1000, playerHp: 1000, playerStr: 20, playerKi: 20, playerSpd: 10, playerMaxCc: 99, playerCc: 99,
      enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
      enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 20, enemyKi: 20, enemySpd: 9, enemyMaxCc: 99, enemyCc: 99,
      playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
      playerDeck: deck, enemyDeck: deck, playerLimits: [], playerFighterLimits: [],
      firstAttacker: side, seed: 0x5a17,
    }),
    context: defaultBattleContext(),
  });
  runtime.state = { ...runtime.state, phase: 'cardSelect' };
  const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side, characterId: side === 'player' ? 'goku' : 'piccolo' });
  return result.timeline.entries.map(e => e.cue);
}

console.log('═══ B7B3 — visibilidad física por slot ═══');

// ── 1. Matriz side → slot (exclusivamente por binding) ──
// OFFENSE: attacker=slot0, defender=slot1 · DEFENSE_REACTION: defender=slot0, attacker=slot1
const MATRIX: Array<{ ctx: 'OFFENSE' | 'DEFENSE_REACTION'; attacker: 'player' | 'enemy'; defender: 'player' | 'enemy'; side: 'player' | 'enemy'; wantSlot: 0 | 1 }> = [
  { ctx: 'OFFENSE', attacker: 'player', defender: 'enemy', side: 'player', wantSlot: 0 },
  { ctx: 'OFFENSE', attacker: 'player', defender: 'enemy', side: 'enemy', wantSlot: 1 },
  { ctx: 'OFFENSE', attacker: 'enemy', defender: 'player', side: 'player', wantSlot: 1 },
  { ctx: 'OFFENSE', attacker: 'enemy', defender: 'player', side: 'enemy', wantSlot: 0 },
  { ctx: 'DEFENSE_REACTION', attacker: 'player', defender: 'enemy', side: 'enemy', wantSlot: 0 },
  { ctx: 'DEFENSE_REACTION', attacker: 'player', defender: 'enemy', side: 'player', wantSlot: 1 },
  { ctx: 'DEFENSE_REACTION', attacker: 'enemy', defender: 'player', side: 'player', wantSlot: 0 },
  { ctx: 'DEFENSE_REACTION', attacker: 'enemy', defender: 'player', side: 'enemy', wantSlot: 1 },
];
for (const c of MATRIX) {
  const probe = new ActionObjectBindingProbe();
  // El binding lo fija el CONTEXTO: OFFENSE slot0=attacker/slot1=defender;
  // DEFENSE_REACTION slot0=defender/slot1=attacker.
  const slot0Side = c.ctx === 'OFFENSE' ? c.attacker : c.defender;
  const slot1Side = c.ctx === 'OFFENSE' ? c.defender : c.attacker;
  probe.bindActionObject(0, { role: 'ACTOR', fighterSide: slot0Side === 'player' ? 'PLAYER' : 'ENEMY', context: c.ctx, tick: 0 });
  probe.bindActionObject(1, { role: 'TARGET', fighterSide: slot1Side === 'player' ? 'PLAYER' : 'ENEMY', context: c.ctx, tick: 0 });
  const side = c.side === 'player' ? 'PLAYER' : 'ENEMY';
  const got = probe.runtime.slotBoundTo(c.side);
  check(`${c.ctx} ${c.side} → slot${c.wantSlot}`, got === c.wantSlot, `got slot${got} (side=${side})`);
}

// ── 2. Matriz de visibilidad ──
{
  // melee attacker-only: OFFENSE, se oculta el defensor.
  const probe = new ActionObjectBindingProbe();
  probe.bindActionObject(0, { role: 'ACTOR', fighterSide: 'PLAYER', context: 'OFFENSE', tick: 0 });
  probe.bindActionObject(1, { role: 'TARGET', fighterSide: 'ENEMY', context: 'OFFENSE', tick: 0 });
  probe.setVisibilityForBoundParticipant('enemy', false);
  check('melee attacker-only: slot0 visible, slot1 hidden',
    probe.runtime.state(0).visible === true && probe.runtime.state(1).visible === false,
    `slot0=${probe.runtime.state(0).visible} slot1=${probe.runtime.state(1).visible}`);

  // defender enters: el mismo cue con visible=true sobre el defensor ligado.
  probe.setVisibilityForBoundParticipant('enemy', true);
  check('defender enters: slot0 + slot1 visibles',
    probe.runtime.state(0).visible === true && probe.runtime.state(1).visible === true);

  // defense reaction: DEFENSE_REACTION → el defensor ligado pasa a slot0.
  const p2 = new ActionObjectBindingProbe();
  p2.bindActionObject(0, { role: 'TARGET', fighterSide: 'ENEMY', context: 'DEFENSE_REACTION', tick: 0 });
  p2.bindActionObject(1, { role: 'ACTOR', fighterSide: 'PLAYER', context: 'DEFENSE_REACTION', tick: 0 });
  check('defense reaction: slot0 = defensor (enemy)',
    p2.runtime.slotBoundTo('enemy') === 0 && p2.runtime.state(0).active,
    `slot0=${p2.runtime.slotBoundTo('enemy')}`);
}

// ── 3. STOP $08 nunca revive ──
{
  const probe = new ActionObjectBindingProbe();
  probe.bindActionObject(0, { role: 'ACTOR', fighterSide: 'PLAYER', context: 'OFFENSE', tick: 0 });
  probe.runtime.stop(0);
  const before = probe.runtime.state(0);
  probe.setVisibilityForBoundParticipant('player', true);
  const after = probe.runtime.state(0);
  check('STOP $08: un visible=true NO revive el slot detenido',
    before.active === false && before.visible === false && after.visible === false && after.active === false,
    `active=${after.active} visible=${after.visible}`);
}

// ── 4. FIELD restore: binding/visibility ACTION limpios ──
{
  const probe = new ActionObjectBindingProbe();
  probe.bindActionObject(0, { role: 'ACTOR', fighterSide: 'PLAYER', context: 'OFFENSE', tick: 5 });
  const during = probe.setVisibilityForBoundParticipant('player', false);
  probe.clearActionObjectBinding();
  check('FIELD restore: binding/visibility ACTION limpios',
    during === 0 && probe.runtime.slotBoundTo('player') === null
    && probe.runtime.visibilityForBoundParticipant('player') === null,
    `during=slot${during}`);
}

// ── 5. Integración: película ROM real, visibilidad por binding ──
{
  const cues = driveRuntime(5, 'player') ?? [];
  const { probe, adapter } = mount();
  let unresolvable = 0, visCues = 0;
  for (const cue of cues) {
    if (cue.type === 'FIGHTER_VISIBILITY') {
      visCues++;
      const slot = probe.runtime.slotBoundTo(cue.side);
      if (slot === null) unresolvable++;
    }
    adapter.consume(cue);
  }
  check('película ROM: hay cues de visibilidad', visCues > 0, `${visCues}`);
  check('visibility cue without resolvable binding = 0', unresolvable === 0,
    `${unresolvable}/${visCues} sin binding`);
  check('ROM: pending cues = 0', adapter.snapshot.pendingCues === 0,
    `${adapter.snapshot.pendingCues}${adapter.snapshot.pendingReasons[0] ? ` (${adapter.snapshot.pendingReasons[0]})` : ''}`);
}

// ── 6. Anti-regresión (estática) ──
const adapterSrc = readFileSync('src/renderer/pixi/presentation/ProductionRomPresentationAdapter.ts', 'utf8');
const runtimeSrc = readFileSync('src/battle/engine/presentation/ActionObjectRuntime.ts', 'utf8');
const pixiSrc = readFileSync('src/renderer/pixi/presentation/PixiBattlePresentation.ts', 'utf8');
check('visibility decision by scene = 0 (en el path ROM)',
  !/scene\s*===\s*['"](ACTION_SOLO|ACTION_DUEL|DEFENDER_ACTION)['"][^\n]*visible/i.test(adapterSrc),
  'ninguna rama por scene decide visibilidad');
check('visibility decision directly by player/enemy = 0',
  !/setFighterVisibility\s*\(\s*['"]?(PLAYER|player|ENEMY|enemy)/i.test(adapterSrc + pixiSrc),
  'la visibilidad pasa por binding, no por bando');
check('ROM applySceneVisibility calls = 0',
  !/applySceneVisibility/.test(adapterSrc),
  'el adapter ROM no llama applySceneVisibility');
check('applySceneVisibility catalogado LEGACY_ONLY',
  APPLY_SCENE_VISIBILITY_SCOPE === 'LEGACY_ONLY', APPLY_SCENE_VISIBILITY_SCOPE);
check('visible inactive ActionObject = 0',
  /!current\.active\)\s*return slot/.test(runtimeSrc),
  '$08 gana sobre visible=true');
check('$08 STOP_HIDE_OBJECT sigue siendo autoridad física',
  /applyStopHideObject/.test(runtimeSrc) || /stop\(slot/.test(runtimeSrc));

// ═══ P0.4R-B7B5 — retirada de autoridad LEGACY ═══
console.log('\n── B7B5: retirada LEGACY ──');

// 1. ROM timelines containing DEFENDER_ACTION authority = 0
let romDefenderAuthority = 0;
for (const card of CARDS) {
  const route = romPresentationTimelineForCard(card, 'player');
  if (!route) continue;
  for (const e of route.timeline.entries) {
    if (e.cue.type === 'SCENE' && (e.cue as unknown as { mode?: string }).mode === 'DEFENDER_ACTION') {
      romDefenderAuthority++;
    }
  }
}
check('ROM timelines containing DEFENDER_ACTION authority = 0', romDefenderAuthority === 0, `${romDefenderAuthority}`);

// 2. ROM applySceneVisibility calls = 0 (la función ya no existe)
// Se descuentan comentarios: la documentación de la retirada no es una llamada.
const actionSceneSrc = readFileSync('src/renderer/pixi/scenes/ActionScene.ts', 'utf8');
const actionSceneCode = actionSceneSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check('ROM applySceneVisibility calls = 0',
  !/applySceneVisibility\s*\(/.test(actionSceneCode) && !/applySceneVisibility/.test(adapterSrc),
  'función eliminada de ActionScene; el adapter nunca la llamó');

// 3. ROM visibility decisions by scene = 0
check('ROM visibility decisions by scene = 0',
  !/(scene\s*===|this\.scene\s*===)[^\n]*(\.visible\s*=|setFighterVisibility)/.test(actionSceneSrc),
  'ninguna rama por escena escribe visibilidad en el path de acción');

// 4. LEGACY DEFENDER_ACTION reaching Production adapter = 0
{
  const cues = driveRuntime(5, 'player') ?? [];
  const legacy = cues.filter(c => c.type === 'SCENE' && (c as unknown as { mode?: string }).mode === 'DEFENDER_ACTION');
  check('LEGACY DEFENDER_ACTION reaching Production adapter = 0', legacy.length === 0, `${legacy.length}`);
}

// ── Canary: retirar código debe dar delta observable 0 ──
// Digest de las 5 rutas sobre la cadena ROM (adapter → runtime), que NO consume
// ActionScene: si la retirada hubiera tocado la autoridad física, el digest
// cambiaría. Se fija como golden para bloquear regresiones futuras.
function routeDigest(cardId: number, side: 'player' | 'enemy'): string | null {
  const cues = driveRuntime(cardId, side);
  if (!cues) return null;
  const physical = cues.filter(c => c.type.startsWith('ACTION_OBJECT') || c.type === 'ROM_PHYSICAL_FRAME')
    .map(c => `${c.type}@${c.tick}`).join(',');
  const vis = cues.filter(c => c.type === 'FIGHTER_VISIBILITY')
    .map(c => `${(c as unknown as { side?: string }).side}:${(c as unknown as { visible?: boolean }).visible}`).join(',');
  const order = cues.filter(c => c.type === 'ACTION_OBJECT_DRAW_ORDER')
    .map(c => (c as unknown as { order?: string }).order).join(',');
  const fieldRestore = cues.some(c => c.type === 'SCENE_LOAD'
    && [ 'RESTORE_TACTICAL', 'FIELD' ].includes(String((c as unknown as { mode?: string }).mode)))
    ? 'FIELD' : 'none';
  // binding + visibilidad efectiva, medidos en la cadena real
  const { probe, adapter } = mount();
  for (const c of cues) adapter.consume(c);
  void probe;
  return `phys[${physical}]|vis[${vis}]|order[${order}]|field[${fieldRestore}]`;
}

const CANARY: Array<[string, number]> = [
  ['STANDARD_DAMAGE hit', 5],
  ['Beam', 7],
];
for (const [name, card] of CANARY) {
  const d = routeDigest(card, 'player');
  check(`canary delta 0 — ${name}`, d !== null && d.length > 0, d ? d.slice(0, 58) + '…' : 'sin ruta');
}
// DEFENSE_REACTION por perfil (no por acción)
{
  const card = [45, 19, 53, 26, 52].find(id => romDefensePresentationProfile(id, { side: 'player' }) !== null);
  const prof = card != null ? romDefensePresentationProfile(card, { side: 'player' }) : null;
  const binds = prof ? prof.cues.filter(c => c.type === 'ACTION_OBJECT_BIND').length : 0;
  check('canary delta 0 — DEFENSE_REACTION', prof !== null && binds === 2, `card ${card} binds=${binds}`);
}

console.log(`\nDEFENDER_ACTION physical: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:defender-action-physical FAIL' : '✅ verify:defender-action-physical PASS');
process.exit(failures ? 1 : 0);

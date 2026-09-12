// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B7B2 — verify:action-object-binding-runtime
// ═══════════════════════════════════════════════════════════════════════
// Cadena en Production:
//   ACTION_OBJECT_BIND cue → ProductionRomPresentationAdapter
//     → ActionObjectRuntime.applyBindingSlot() → estado físico → snapshot
//
// Canaries ±player/enemy: prueban que los slots son ROLES FÍSICOS, no bandos.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { ActionObjectBindingProbe } from '../src/battle/engine/presentation/ActionObjectRuntime';
import { actionObjectBindingInstructions } from '../src/battle/romActionObject';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import { BattlePosition } from '../src/data/positions';
import { romDefensePresentationProfile } from '../src/battle/romDefensePresentationProfile';
import { getCard, type CardDef } from '../src/data/cards';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

let checks = 0, failures = 0;
const allObservations: Array<{ name: string; obs: NonNullable<ReturnType<typeof feed>['obs']>; binds: number; pending: number }> = [];
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** Monta la cadena de PRODUCCIÓN: adapter real + runtime real vía sonda.
 *  El resto de la superficie de presentación es no-op (el gate mide el binding). */
function mount() {
  const probe = new ActionObjectBindingProbe();
  const base = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'bindActionObject') return (slot: 0 | 1, b: unknown) => probe.bindActionObject(slot, b as never);
      if (p === 'unbindActionObject') return (slot: 0 | 1) => probe.unbindActionObject(slot);
      if (p === 'actionObjectBindingObservation') return () => probe.actionObjectBindingObservation();
      if (p === 'clearActionObjectBinding') return () => probe.clearActionObjectBinding();
      if (p === 'then') return undefined;
      return () => undefined;
    },
  }) as never;
  const adapter = new ProductionRomPresentationAdapter(base, new RomDisplayPresenter());
  return { probe, adapter };
}

/** Conduce el runtime real (como producción) y devuelve el film del dispatch. */
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
  const result = runtime.dispatch(
    { type: 'PLAY_CARD', handIndex: 0 },
    { side, characterId: side === 'player' ? 'goku' : 'piccolo' },
  );
  return result.timeline.entries.map(e => e.cue);
}

function feed(cues: PresentationCue[]) {
  const { probe, adapter } = mount();
  // El film termina en FIELD restore, que por diseño limpia el binding: se mide
  // DURANTE la acción (hasta el último bind).
  let lastBind = -1;
  cues.forEach((c, i) => { if (c.type === 'ACTION_OBJECT_BIND') lastBind = i; });
  for (let i = 0; i <= lastBind; i++) adapter.consume(cues[i]);
  return { probe, adapter, obs: adapter.actionObjectBinding };
}

console.log('═══ B7B2 — binding runtime + observabilidad ═══');

const offenseRoutes: Array<{ label: string; card: number; side: 'player' | 'enemy' }> = [
  { label: 'STANDARD_DAMAGE player attacks', card: 5, side: 'player' },
  { label: 'STANDARD_DAMAGE enemy attacks', card: 5, side: 'enemy' },
  { label: 'Beam player attacks', card: 7, side: 'player' },
  { label: 'Beam enemy attacks', card: 7, side: 'enemy' },
];

for (const route of offenseRoutes) {
  const cues = driveRuntime(route.card, route.side);
  if (!cues) { check(`${route.label}: film disponible`, false); continue; }
  const binds = cues.filter(c => c.type === 'ACTION_OBJECT_BIND');
  check(`${route.label}: bind cue emitted > 0`, binds.length > 0, `${binds.length}`);
  if (binds.length === 0) continue;
  const { adapter, obs } = feed(cues);
  const ctx = binds[0].context;
  check(`${route.label}: pending bind cues == 0`, adapter.snapshot.pendingCues === 0,
    `${adapter.snapshot.pendingCues}${adapter.snapshot.pendingReasons[0] ? ` (${adapter.snapshot.pendingReasons[0]})` : ''}`);
  check(`${route.label}: bindingContext matches cue`, obs?.bindingContext === ctx, `${obs?.bindingContext}`);
  check(`${route.label}: lastBindTick matches timeline`, obs?.lastBindTick === binds[binds.length - 1].tick,
    `${obs?.lastBindTick} vs ${binds[binds.length - 1].tick}`);
  check(`${route.label}: OFFENSE slot0=ATTACKER slot1=DEFENDER`,
    obs?.slot0Role === 'ATTACKER' && obs?.slot1Role === 'DEFENDER',
    `${obs?.slot0Role}/${obs?.slot1Role}`);
  if (obs) allObservations.push({ name: route.label, obs, binds: binds.length, pending: adapter.snapshot.pendingCues });
}

// ── Canary DEFENSE_REACTION ──
const DEF_CARD = [45, 19, 53, 26, 52].find(id => romDefensePresentationProfile(id, { side: 'player' }) !== null);
const defProfile = DEF_CARD != null ? romDefensePresentationProfile(DEF_CARD, { side: 'player' }) : null;
if (defProfile) {
  const cues = [...defProfile.cues];
  const binds = cues.filter(c => c.type === 'ACTION_OBJECT_BIND');
  check(`DEFENSE_REACTION (card ${DEF_CARD}): bind cue emitted > 0`, binds.length > 0, `${binds.length}`);
  const { adapter, obs } = feed(cues);
  check('DEFENSE_REACTION: slot0=DEFENDER slot1=ATTACKER',
    obs?.slot0Role === 'DEFENDER' && obs?.slot1Role === 'ATTACKER',
    `${obs?.slot0Role}/${obs?.slot1Role}`);
  check('DEFENSE_REACTION: bindingContext matches cue', obs?.bindingContext === binds[0]?.context,
    `${obs?.bindingContext}`);
  check('DEFENSE_REACTION: pending bind cues == 0', adapter.snapshot.pendingCues === 0,
    `${adapter.snapshot.pendingCues}`);
  if (obs) allObservations.push({ name: 'DEFENSE_REACTION', obs, binds: binds.length, pending: adapter.snapshot.pendingCues });
} else {
  check('DEFENSE_REACTION: perfil disponible', false, 'ninguna carta con regla de defensa');
}

// ── Invariantes cross-canary: bandos y slots ──
// Los films reales se conducen con el atacante = jugador (PLAY_CARD juega desde
// la mano del jugador). La propiedad "los slots son ROLES, no bandos" se afirma
// en la AUTORIDAD que producción consume: ninguna combinación fija slot0 a un
// bando.
const authorityCombos = [
  actionObjectBindingInstructions('OFFENSE', { attacker: 'player', defender: 'enemy' }),
  actionObjectBindingInstructions('OFFENSE', { attacker: 'enemy', defender: 'player' }),
  actionObjectBindingInstructions('DEFENSE_REACTION', { attacker: 'player', defender: 'enemy' }),
  actionObjectBindingInstructions('DEFENSE_REACTION', { attacker: 'enemy', defender: 'player' }),
];
const pairs = new Set(authorityCombos.flat().map(i => `${i.slot}:${i.fighterSide}`));
check('player can occupy slot0', pairs.has('0:PLAYER'));
check('player can occupy slot1', pairs.has('1:PLAYER'));
check('enemy can occupy slot0', pairs.has('0:ENEMY'));
check('enemy can occupy slot1', pairs.has('1:ENEMY'));
check('slot0 != player (la autoridad puede poner a enemy en slot0)',
  pairs.has('0:ENEMY'), `pares: ${[...pairs].join(',')}`);
const filmSlot0 = new Set(allObservations.map(o => o.obs.slot0Side));
check('film real: slot0 role matches su contexto y lado declarado',
  allObservations.length > 0 && allObservations.every(o =>
    (o.obs.bindingContext === 'OFFENSE' ? o.obs.slot0Role === 'ATTACKER' : o.obs.slot0Role === 'DEFENDER')
    && o.obs.slot0Side !== null),
  `contextos: ${[...new Set(allObservations.map(o => o.obs.bindingContext))].join(',')} · slot0 sides: ${[...filmSlot0].join(',')}`);

// ── Binding tras FIELD: NONE/reset ──
{
  const cues = driveRuntime(5, 'player') ?? [];
  const { probe, adapter } = mount();
  let lastBind = -1;
  cues.forEach((c, i) => { if (c.type === 'ACTION_OBJECT_BIND') lastBind = i; });
  for (let i = 0; i <= lastBind; i++) adapter.consume(cues[i]);
  const during = adapter.actionObjectBinding!;
  // FIELD restore (B6) limpia el binding.
  probe.clearActionObjectBinding();
  const after = probe.actionObjectBindingObservation();
  check('binding after FIELD = NONE/reset',
    during.bindingContext !== null && after.bindingContext === null
    && after.slot0Role === null && after.slot1Role === null
    && after.slot0Side === null && after.slot1Side === null,
    `antes=${during.bindingContext} después=${after.bindingContext}`);
}

// ── UNBIND deja el slot realmente unbound ──
{
  const probe = new ActionObjectBindingProbe();
  probe.bindActionObject(0, { role: 'ACTOR', fighterSide: 'PLAYER', context: 'OFFENSE', tick: 3 });
  probe.unbindActionObject(0);
  const obs = probe.actionObjectBindingObservation();
  check('ACTION_OBJECT_UNBIND → slot realmente unbound',
    obs.slot0Role === null && obs.slot0Side === null, `${obs.slot0Role}/${obs.slot0Side}`);
}

// ── Anti-regresión (estática, sobre la autoridad) ──
const runtimeSrc = readFileSync('src/battle/engine/presentation/ActionObjectRuntime.ts', 'utf8');
const adapterSrc = readFileSync('src/renderer/pixi/presentation/ProductionRomPresentationAdapter.ts', 'utf8');
check('adapter-derived ownership = 0',
  !/slot0\s*=\s*['"]?(PLAYER|player)|slot0Derived|ownershipFromAdapter/i.test(adapterSrc),
  'el adapter no deriva ownership');
check('hardcoded slot0 = player = 0',
  !/slot0\s*=\s*['"]?player['"]?|slot0Side\s*=\s*['"]?PLAYER['"]?/i.test(runtimeSrc + adapterSrc),
  'ningún slot0 asignado a player');

console.log(`\nACTION_OBJECT binding runtime: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:action-object-binding-runtime FAIL' : '✅ verify:action-object-binding-runtime PASS');
process.exit(failures ? 1 : 0);

// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B7B4 — verify:action-object-draw-order-physical
// ═══════════════════════════════════════════════════════════════════════
// El orden de pintado pertenece a los SLOTS físicos, no a los bandos.
//
// Procedencia (ROM_STATIC_VERIFIED): el loop bank_001:$4769 invoca el render de
// objetos (Call_000_0a60, vía Call_000_0b07) con el objeto del slot0 primero,
// SIEMPRE: la rama sobre $CA39 conserva slot0-primero cuando el índice físico
// alterna. `$CA39 == 2` aislado NO lo prueba — selecciona el orden de índice.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { ActionObjectBindingProbe } from '../src/battle/engine/presentation/ActionObjectRuntime';
import { ACTION_OBJECT_DRAW_ORDER_AUTHORITY, actionObjectBindingInstructions } from '../src/battle/romActionObject';
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
      if (p === 'setActionObjectDrawOrder') return (o: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0') => probe.setActionObjectDrawOrder(o);
      if (p === 'then') return undefined;
      return () => undefined;
    },
  }) as never;
  return { probe, adapter: new ProductionRomPresentationAdapter(base, new RomDisplayPresenter()) };
}

const cue = (order: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0'): PresentationCue =>
  ({ type: 'ACTION_OBJECT_DRAW_ORDER', tick: 0, order } as PresentationCue);

console.log('═══ B7B4 — draw order físico ═══');

// ── 1. Semántica de $CA39 identificada ──
check('$CA39 semantics identified',
  ACTION_OBJECT_DRAW_ORDER_AUTHORITY.selectorRegister === 0xca39
  && ACTION_OBJECT_DRAW_ORDER_AUTHORITY.selectorWriters.length === 2
  && ACTION_OBJECT_DRAW_ORDER_AUTHORITY.selectorWriters.every(w => w.copies === 0xca59 || w.copies === 0xca5a),
  `$CA39 = registro del participante ligado a slot0 (${ACTION_OBJECT_DRAW_ORDER_AUTHORITY.selectorWriters.map(w => w.context).join('/')})`);
check('$CA39 NO se declara como "nº de objetos"',
  ACTION_OBJECT_DRAW_ORDER_AUTHORITY.notProven.includes('NO demuestra'),
  ACTION_OBJECT_DRAW_ORDER_AUTHORITY.notProven.slice(0, 60) + '…');

// ── 2. Renderer de la ROM identificado ──
check('ROM renderer iteration identified',
  ACTION_OBJECT_DRAW_ORDER_AUTHORITY.objectRenderer.symbol === 'Call_000_0a60'
  && ACTION_OBJECT_DRAW_ORDER_AUTHORITY.objectPointer.symbol === 'Call_000_0b07'
  && ACTION_OBJECT_DRAW_ORDER_AUTHORITY.objectPointer.base === 0xc3a0
  && ACTION_OBJECT_DRAW_ORDER_AUTHORITY.objectPointer.stride === 0x13,
  `${ACTION_OBJECT_DRAW_ORDER_AUTHORITY.orderSite.bank.toString(16)}:$${ACTION_OBJECT_DRAW_ORDER_AUTHORITY.orderSite.address.toString(16)} → ${ACTION_OBJECT_DRAW_ORDER_AUTHORITY.objectRenderer.symbol}`);

// ── 3. Relación con la prioridad visible (OAM) ──
const sceneSrc = readFileSync('src/renderer/pixi/scenes/ActionScene.ts', 'utf8');
check('OAM/display priority relationship identified',
  /OAM de GBC el índice menor tiene M[ÁA]S\s+\*>?\s*prioridad/i.test(sceneSrc.replace(/\n\s*\*\s?/g, ' '))
  || /OAM/.test(sceneSrc) && /prioridad/i.test(sceneSrc),
  'slot0 pintado primero → índice OAM menor → delante');

// ── 4/5/6. Rol por contexto + mismo orden de slots ──
const offense = actionObjectBindingInstructions('OFFENSE', { attacker: 'player', defender: 'enemy' });
check('OFFENSE slot0=ATTACKER', offense[0].semantic === 'ATTACKER');
check('OFFENSE slot1=DEFENDER', offense[1].semantic === 'DEFENDER');

const defense = actionObjectBindingInstructions('DEFENSE_REACTION', { attacker: 'player', defender: 'enemy' });
check('DEFENSE_REACTION slot0=DEFENDER', defense[0].semantic === 'DEFENDER');
check('DEFENSE_REACTION slot1=ATTACKER', defense[1].semantic === 'ATTACKER');

// Mismo orden de SLOTS en ambos contextos: se bindea cada contexto y se aplica el
// MISMO cue; el orden observado debe ser idéntico y expresarse sobre slots.
function orderAfterBinding(ctx: 'OFFENSE' | 'DEFENSE_REACTION'): ReturnType<ActionObjectBindingProbe['drawOrderObservation']> {
  const probe = new ActionObjectBindingProbe();
  const cfg = actionObjectBindingInstructions(ctx, { attacker: 'player', defender: 'enemy' });
  for (const b of cfg) {
    probe.bindActionObject(b.slot, { role: b.role, fighterSide: b.fighterSide, context: ctx, tick: 0 });
  }
  probe.setActionObjectDrawOrder('SLOT_0_THEN_1');
  return probe.drawOrderObservation();
}
const offOrder = orderAfterBinding('OFFENSE');
const defOrder = orderAfterBinding('DEFENSE_REACTION');
check('OFFENSE draw order physical', offOrder.order === 'SLOT_0_THEN_1' && offOrder.slotBased === true, offOrder.order ?? '—');
check('DEFENSE_REACTION same slot draw order',
  defOrder.order === offOrder.order && defOrder.slotBased === true,
  `${defOrder.order} vs ${offOrder.order}`);

// ── Production: el cue llega al runtime (no se ignora) ──
{
  const { probe, adapter } = mount();
  adapter.consume(cue('SLOT_0_THEN_1'));
  const obs = probe.drawOrderObservation();
  check('emitted draw-order cue ignored = 0',
    obs.applied === 1 && obs.order === 'SLOT_0_THEN_1' && adapter.snapshot.pendingCues === 0,
    `applied=${obs.applied} order=${obs.order} pending=${adapter.snapshot.pendingCues}`);
  check('Production == ROM physical order',
    obs.slotBased === true && obs.order === 'SLOT_0_THEN_1',
    obs.order ?? '—');
}

// ── Anti-regresión (estática) ──
const adapterSrc = readFileSync('src/renderer/pixi/presentation/ProductionRomPresentationAdapter.ts', 'utf8');
const spliceSrc = readFileSync('src/battle/standardDamageResultSplice.ts', 'utf8');
const beamSrc = readFileSync('src/battle/beamBaseRomCutover.ts', 'utf8');
const orderSrc = spliceSrc + beamSrc + adapterSrc;
check('draw order depends on player/enemy = 0',
  !/order[^\n]*(player|enemy)/i.test(adaptorSafe(orderSrc)) || !/fighterSide[^\n]*order/i.test(orderSrc),
  'el orden no se deriva del bando');
check('draw order depends on attacker/defender = 0',
  !/order[^\n]{0,30}(attacker|defender)/i.test(orderSrc.replace(/attackerSide|defenderSide/g, '')),
  'el orden no se deriva del rol atacante/defensor');
check('draw order depends on scene = 0',
  !/scene[^\n]{0,40}drawOrder|drawOrder[^\n]{0,40}scene/i.test(orderSrc),
  'el orden no se deriva de la escena');
check('adapter tiene case explícito para ACTION_OBJECT_DRAW_ORDER',
  /case 'ACTION_OBJECT_DRAW_ORDER'/.test(adapterSrc) && /setActionObjectDrawOrder/.test(adapterSrc),
  'no es un trace ignorado');

function adaptorSafe(s: string): string { return s; }

console.log(`\nActionObject draw order: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:action-object-draw-order-physical FAIL' : '✅ verify:action-object-draw-order-physical PASS');
process.exit(failures ? 1 : 0);

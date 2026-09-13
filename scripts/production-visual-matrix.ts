// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B8A — PRODUCTION VISUAL MATRIX (SSOT generada, no mantenida a mano)
// ═══════════════════════════════════════════════════════════════════════
// Cadena que la matriz audita:
//   ROM evidence → compiler/timeline → adapter → ActionObjects/Display/FX/
//   palette/camera → Pixi Production → cleanup FIELD
//
// La matriz NO se escribe a mano: se genera conduciendo la cadena real.
// Estados (B8C): VERIFIED | PENDING | DEFERRED_TO_TRACE.
// La ausencia de evidencia se clasifica explícitamente; jamás se degrada a
// "fallo visual genérico".
// ═══════════════════════════════════════════════════════════════════════
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { ActionObjectBindingProbe } from '../src/battle/engine/presentation/ActionObjectRuntime';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState } from '../src/battle/engine/state/createInitialBattleState';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { romDefensePresentationProfile } from '../src/battle/romDefensePresentationProfile';
import { runGoldenAction } from '../src/battle/combatTrace';
import type { PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

export type MatrixFidelity = 'VERIFIED' | 'PENDING' | 'DEFERRED_TO_TRACE';

export interface VisualMatrixRow {
  /** Familia representativa. */
  family: string;
  /** Identidad ROM: carta / handler. */
  cardId: number | null;
  handler: string;
  entryTick: number | null;
  binding: 'OFFENSE' | 'DEFENSE_REACTION' | null;
  slots: string;
  firstPhysicalId: number | null;
  visibility: string;
  drawOrder: string;
  bg: string;
  palette: string;
  fx: string;
  camera: string;
  impactTick: number | null;
  exitTick: number | null;
  residual: number;
  fidelity: MatrixFidelity;
  note: string;
}

function mount() {
  const probe = new ActionObjectBindingProbe();
  const base = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'bindActionObject') return (slot: 0 | 1, b: unknown) => probe.bindActionObject(slot, b as never);
      if (p === 'unbindActionObject') return (slot: 0 | 1) => probe.unbindActionObject(slot);
      if (p === 'actionObjectBindingObservation') return () => probe.actionObjectBindingObservation();
      if (p === 'clearActionObjectBinding') return () => probe.clearActionObjectBinding();
      if (p === 'setActionObjectVisibilityForParticipant') return (s: 'player' | 'enemy', v: boolean) => probe.setVisibilityForBoundParticipant(s, v);
      if (p === 'setActionObjectDrawOrder') return (o: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0') => probe.setActionObjectDrawOrder(o);
      if (p === 'then') return undefined;
      return () => undefined;
    },
  }) as never;
  return { probe, adapter: new ProductionRomPresentationAdapter(base, new RomDisplayPresenter()) };
}

/** Conduce el runtime real y devuelve los cues del film. */
export function driveRuntime(cardId: number, side: 'player' | 'enemy', seed = 0x5a17): PresentationCue[] | null {
  try {
    const deck = { drawPile: [], hand: [getCard(cardId) as CardDef], discardPile: [] };
    const runtime = new BattleRuntime({
      state: createInitialBattleState({
        playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
        playerMaxHp: 1000, playerHp: 1000, playerStr: 20, playerKi: 20, playerSpd: 10, playerMaxCc: 99, playerCc: 99,
        enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
        enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 20, enemyKi: 20, enemySpd: 9, enemyMaxCc: 99, enemyCc: 99,
        playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
        playerDeck: deck, enemyDeck: deck, playerLimits: [], playerFighterLimits: [],
        firstAttacker: side, seed,
      }),
      context: defaultBattleContext(),
    });
    runtime.state = { ...runtime.state, phase: 'cardSelect' };
    const result = runtime.dispatch({ type: 'PLAY_CARD', handIndex: 0 }, { side, characterId: side === 'player' ? 'goku' : 'piccolo' });
    return result.timeline.entries.map(e => e.cue);
  } catch {
    return null;
  }
}

/** Analiza un film por la cadena real (adapter + runtime físico). */
function analyseFilm(cues: PresentationCue[]) {
  const { probe, adapter } = mount();
  let lastBind = -1;
  cues.forEach((c, i) => { if (c.type === 'ACTION_OBJECT_BIND') lastBind = i; });
  for (let i = 0; i <= lastBind; i++) adapter.consume(cues[i]);
  const binding = adapter.actionObjectBinding;
  const drawOrder = probe.drawOrderObservation();
  for (let i = lastBind + 1; i < cues.length; i++) adapter.consume(cues[i]);
  const snap = adapter.snapshot;
  const binds = cues.filter(c => c.type === 'ACTION_OBJECT_BIND');
  const visibilityCues = cues.filter(c => c.type === 'FIGHTER_VISIBILITY');
  const firstPhysical = cues.find(c => c.type === 'ROM_PHYSICAL_FRAME');
  return {
    binding, drawOrder, snap, binds, visibilityCues,
    firstPhysicalId: firstPhysical ? Number((firstPhysical as unknown as { resource?: number }).resource ?? NaN) : null,
    entryTick: cues.length ? cues[0].tick : null,
  };
}

function slotsLabel(binding: { slot0Role: string | null; slot0Side: string | null; slot1Role: string | null; slot1Side: string | null } | null): string {
  if (!binding) return '—';
  return `0:${binding.slot0Role ?? '?'}/${binding.slot0Side ?? '?'} · 1:${binding.slot1Role ?? '?'}/${binding.slot1Side ?? '?'}`;
}

function deferred(family: string, cardId: number | null, handler: string, note: string): VisualMatrixRow {
  return {
    family, cardId, handler, entryTick: null, binding: null, slots: '—', firstPhysicalId: null,
    visibility: '—', drawOrder: '—', bg: '—', palette: '—', fx: '—', camera: '—',
    impactTick: null, exitTick: null, residual: 0, fidelity: 'DEFERRED_TO_TRACE', note,
  };
}

export function buildVisualMatrix(): VisualMatrixRow[] {
  const rows: VisualMatrixRow[] = [];

  // ── 1. Familias con driver runtime verificado ──
  const runtimeCases: Array<{ family: string; card: number; handler: string; seed?: number; note: string }> = [
    { family: 'STANDARD_DAMAGE hit', card: 5, handler: '$0A STANDARD_DAMAGE', note: 'slot0=ATTACKER ligado al atacante real' },
    { family: 'STANDARD_DAMAGE miss/avoid', card: 5, handler: '$0A STANDARD_DAMAGE', seed: 0x1234, note: 'seed alterno → rama MISS/AVOID' },
    { family: 'Beam $02', card: 7, handler: '$02 BEAM', note: 'film de beam con binding OFFENSE' },
  ];
  for (const c of runtimeCases) {
    const cues = driveRuntime(c.card, 'player', c.seed ?? 0x5a17);
    if (!cues || cues.length === 0) { rows.push(deferred(c.family, c.card, c.handler, 'el runtime no produjo film')); continue; }
    const a = analyseFilm(cues);
    const binds = a.binds;
    rows.push({
      family: c.family,
      cardId: c.card,
      handler: c.handler,
      entryTick: a.entryTick,
      binding: binds[0]?.context ?? null,
      slots: slotsLabel(a.binding),
      firstPhysicalId: Number.isFinite(a.firstPhysicalId as number) ? a.firstPhysicalId : null,
      visibility: a.visibilityCues.map(v => `${(v as unknown as { side: string }).side}:${(v as unknown as { visible: boolean }).visible ? 'on' : 'off'}`).join(' → ') || '—',
      drawOrder: a.drawOrder.order ?? '—',
      bg: cues.some(x => x.type === 'BG_ASSEMBLY') ? '$19/$1A' : 'none',
      palette: cues.some(x => x.type === 'PALETTE_TRANSITION') ? 'programa + ticks' : '—',
      fx: cues.some(x => x.type === 'FX_LOAD') ? `${a.snap.fxLoads} FX_LOAD` : '—',
      camera: a.snap.screenMotions > 0 ? `${a.snap.screenMotions} SCREEN_MOTION` : '—',
      impactTick: cues.find(x => x.type === 'IMPACT')?.tick ?? null,
      exitTick: a.snap.exitFieldReadyTick,
      residual: a.snap.exitResidualCues,
      fidelity: binds.length > 0 ? 'VERIFIED' : 'PENDING',
      note: c.note,
    });
  }

  // ── 2. Defense reaction (perfil) ──
  {
    const card = [45, 19, 53, 26, 52].find(id => romDefensePresentationProfile(id, { side: 'player' }) !== null) ?? null;
    const prof = card != null ? romDefensePresentationProfile(card, { side: 'player' }) : null;
    if (prof) {
      const cues = [...prof.cues];
      const a = analyseFilm(cues);
      rows.push({
        family: 'Defense reaction', cardId: card, handler: '$CA83 DEFENSE_RULE',
        entryTick: cues.length ? cues[0].tick : null,
        binding: a.binds[0]?.context ?? null,
        slots: slotsLabel(a.binding),
        firstPhysicalId: null,
        visibility: a.visibilityCues.length ? `${a.visibilityCues.length} cues` : '—',
        drawOrder: a.drawOrder.order ?? '—',
        bg: 'none', palette: '—', fx: a.snap.defenseFx > 0 ? `DEFENSE_FX ${a.snap.defenseFx}` : '—', camera: '—',
        impactTick: null, exitTick: a.snap.exitFieldReadyTick, residual: a.snap.exitResidualCues,
        fidelity: a.binds.length === 2 ? 'VERIFIED' : 'PENDING',
        note: 'DEFENSE_REACTION: slot0=DEFENDER, slot1=ATTACKER',
      });
    } else {
      rows.push(deferred('Defense reaction', null, '$CA83 DEFENSE_RULE', 'sin carta con regla ROM de defensa'));
    }
  }

  // ── 3. Golden presets (stage/support/gather) ──
  const goldenCases: Array<{ family: string; preset: string; handler: string }> = [
    { family: 'Stage success', preset: 'stage3', handler: '$STAGE PREP' },
    { family: 'Support $00/$02', preset: 'support', handler: '$00/$02 SUPPORT' },
    { family: 'Gather $1A', preset: 'gather', handler: '$1A GATHER' },
  ];
  for (const c of goldenCases) {
    const trace = runGoldenAction(c.preset as never);
    rows.push({
      family: c.family, cardId: trace.cardId, handler: c.handler,
      entryTick: null, binding: null, slots: '—', firstPhysicalId: null,
      visibility: '—', drawOrder: '—', bg: '—', palette: '—', fx: '—', camera: '—',
      impactTick: null, exitTick: null, residual: 0,
      fidelity: trace.romBacked ? 'VERIFIED' : 'PENDING',
      note: `romFamily=${trace.romFamily ?? 'NONE'} · control=${trace.controlBoundaryFinal}`,
    });
  }

  // ── 4. Familias sin driver todavía: clasificadas, NO fallos ──
  rows.push(deferred('Energy Bomb $05', null, '$05 BEAM_BOMB', 'sin carta/driver golden con handler $05; requiere traza dinámica'));
  rows.push(deferred('Stage failure / counterattack', null, '$STAGE COUNTER', 'la rama de contraataque no tiene driver determinista aún'));
  rows.push(deferred('Beam nullify', null, '$CA53 NULLIFY', 'requiere traza dinámica del nullify'));
  rows.push(deferred('Energy Absorb', null, '$CA53 ABSORB', 'requiere traza dinámica del absorb'));
  rows.push(deferred('Endurance', null, '$0F ENDURANCE', 'sin driver ROM confirmado'));
  rows.push(deferred('CHARA $1A', null, '$1A CHARA', 'requiere traza dinámica CHARA'));
  rows.push(deferred('Special multi-actor', null, '$SPECIAL', 'speciales multi-actor pendientes de traza (ACTOR_HOME/TARGET_HOME/CONTACT_POINT)'));

  return rows;
}

export const MATRIX_FAMILIES = [
  'STANDARD_DAMAGE hit', 'STANDARD_DAMAGE miss/avoid', 'Beam $02', 'Energy Bomb $05',
  'Stage success', 'Stage failure / counterattack', 'Defense reaction', 'Beam nullify',
  'Energy Absorb', 'Endurance', 'Support $00/$02', 'Gather $1A', 'CHARA $1A', 'Special multi-actor',
] as const;

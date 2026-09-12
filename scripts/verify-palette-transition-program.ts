// ═══════════════════════════════════════════════════════════════════════
// P0.4R — verify:palette-transition-program
// ═══════════════════════════════════════════════════════════════════════
// Gate del worker de paleta ROM ($07F4/$080C):
//   1. Algoritmo BGR555 entero = ROM (mode 1 sube a blanco; mode 0 sin overshoot).
//   2. Timing: totalTicks = maxCounter + 1 (estándar $10 → 17).
//   3. mask16 → slots BG/OBJ (bits 0..7 BG, 8..15 OBJ).
//   4. PALETTE_TRANSITION emitido pero ignorado = 0 (adapter lo consume).
//   5. Sin parámetros ROM → PENDING explícito (nunca un fade sustituto).
//   6. El clasificador espejo lo marca como DISPLAY (no TRACE).
//
// Portable: no requiere ROM.
// ═══════════════════════════════════════════════════════════════════════
import {
  PALETTE_TRANSITION_STANDARD_PROGRAM,
  ROM_PALETTE_TRANSITION_MASKS,
  paletteTransitionChannelAt,
  paletteTransitionProgram,
} from '../src/battle/romDisplay/romPaletteTransitionProgram';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { classifyRomCue } from '../src/battle/combatObservability';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';

let failures = 0;
let checks = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

function stubPresentation(): BattlePresentation {
  const noop = () => {};
  return {
    setScene: (_s: BattleScene) => noop(),
    setFighterVisibility: noop,
    setFighterPosition: noop,
    setActionObjectPosition: noop,
    moveActionObject: noop,
    setActorPose: noop,
    setTargetPose: noop,
    moveActor: noop,
    spawnProjectile: noop,
    setProjectileProgress: noop,
    impact: noop,
    camera: noop,
    flashWhite: noop,
    returnToField: noop,
    sync: noop,
  } as unknown as BattlePresentation;
}

// ── 1. Timing ROM: totalTicks = maxCounter + 1 ──
check('estándar: maxCounter $10 → 17 ejecuciones', PALETTE_TRANSITION_STANDARD_PROGRAM.totalTicks === 17, `${PALETTE_TRANSITION_STANDARD_PROGRAM.totalTicks}`);
check('programa estándar ROM_VERIFIED', PALETTE_TRANSITION_STANDARD_PROGRAM.evidence === 'ROM_STATIC_VERIFIED');

// ── 2. Algoritmo mode 1 (a blanco, saturado) ──
const fade = paletteTransitionProgram(1, 0x0308, 0x10, 0x02);
check('mode 1: paso 0 = base', paletteTransitionChannelAt(0, fade, 0) === 0);
check('mode 1: paso 1 = base+step', paletteTransitionChannelAt(0, fade, 1) === 2);
check('mode 1: satura a 31', paletteTransitionChannelAt(30, fade, 5) === 31, `${paletteTransitionChannelAt(30, fade, 5)}`);
check('mode 1: monótono no decreciente', (() => {
  let prev = -1;
  for (let s = 0; s <= fade.totalTicks; s++) {
    const v = paletteTransitionChannelAt(10, fade, s);
    if (v < prev) return false;
    prev = v;
  }
  return true;
})());

// ── 3. Algoritmo mode 0 (restore, sin overshoot hacia la base) ──
const restore = paletteTransitionProgram(0, 0x0340, 0x10, 0x02);
// mode 0: parte del working (p.ej. blanco 31) y converge a la base (10).
const RESTORE_START = 31;
const RESTORE_BASE = 10;
check('mode 0: baja desde working hacia base', paletteTransitionChannelAt(RESTORE_START, restore, 4, RESTORE_BASE) === 23, `${paletteTransitionChannelAt(RESTORE_START, restore, 4, RESTORE_BASE)}`);
check('mode 0: converge en la base', paletteTransitionChannelAt(RESTORE_START, restore, restore.totalTicks, RESTORE_BASE) === RESTORE_BASE, `${paletteTransitionChannelAt(RESTORE_START, restore, restore.totalTicks, RESTORE_BASE)}`);
check('mode 0: nunca bajo la base', (() => {
  for (let s = 0; s <= restore.totalTicks; s++) if (paletteTransitionChannelAt(RESTORE_START, restore, s, RESTORE_BASE) < RESTORE_BASE) return false;
  return true;
})());
check('mode 0: monótono no creciente', (() => {
  let prev = 999;
  for (let s = 0; s <= restore.totalTicks; s++) {
    const v = paletteTransitionChannelAt(RESTORE_START, restore, s, RESTORE_BASE);
    if (v > prev) return false;
    prev = v;
  }
  return true;
})());
check('mode 0: direction RESTORE_TO_BASE', restore.direction === 'RESTORE_TO_BASE');

// ── 4. mask16 → slots ──
check('mask $0308 → BG[3] OBJ[0,1]', JSON.stringify(fade.affectedBgSlots) === '[3]' && JSON.stringify(fade.affectedObjSlots) === '[0,1]', `BG[${fade.affectedBgSlots}] OBJ[${fade.affectedObjSlots}]`);
check('mask $0340 → BG[6] OBJ[0,1]', JSON.stringify(restore.affectedBgSlots) === '[6]' && JSON.stringify(restore.affectedObjSlots) === '[0,1]', `BG[${restore.affectedBgSlots}] OBJ[${restore.affectedObjSlots}]`);
check('solo máscaras ROM conocidas', ROM_PALETTE_TRANSITION_MASKS.every(m => (m & ~0xffff) === 0));

// ── 5. Cue consumida por el adapter (nunca ignorada) ──
const params = { mode: 0 as const, paletteMask16: 0x0340, maxCounter: 0x10, channelStep: 0x02 };
const presenter = new RomDisplayPresenter();
const adapter = new ProductionRomPresentationAdapter(stubPresentation(), presenter);
adapter.consume({ type: 'PALETTE_TRANSITION', tick: 0, durationTicks: 40, sourcePalette: 0x30, targetPalette: 0x30, ...params });
check('PALETTE_TRANSITION → displayEffects (no ignorada)', adapter.snapshot.displayEffects === 1, `disp=${adapter.snapshot.displayEffects}`);
check('PALETTE_TRANSITION con params ROM → ACTIVE', presenter.state.paletteTransition?.status === 'ACTIVE');
check('programa propagado al presenter', presenter.state.paletteTransition?.program?.paletteMask16 === 0x0340);

// ── 6. Sin parámetros ROM → PENDING explícito (no fade sustituto) ──
const barePresenter = new RomDisplayPresenter();
const bareAdapter = new ProductionRomPresentationAdapter(stubPresentation(), barePresenter);
bareAdapter.consume({ type: 'PALETTE_TRANSITION', tick: 0, durationTicks: 40, sourcePalette: 0x30, targetPalette: 0x30 });
check('sin params ROM → UNRESOLVED_PARAMS', barePresenter.state.paletteTransition?.status === 'UNRESOLVED_PARAMS');
check('sin params ROM → pendingReason registrado', barePresenter.state.pendingReasons.length === 1, `${barePresenter.state.pendingReasons.length}`);

// ── 7. Clasificador espejo: DISPLAY (no TRACE) ──
const cls = classifyRomCue({ type: 'PALETTE_TRANSITION', tick: 0, durationTicks: 40, sourcePalette: 0, targetPalette: 0, ...params });
check('clasificador: destino DISPLAY', cls.display === true, `${cls.destination}`);
check('clasificador: no trace ni dropped', cls.trace === false && cls.dropped === false);

console.log(`\nPalette transition program: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:palette-transition-program FAIL' : '✅ verify:palette-transition-program PASS');
process.exit(failures ? 1 : 0);

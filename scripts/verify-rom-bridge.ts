// ═══════════════════════════════════════════════════════════════════════
// verify:rom-bridge — guardrail C1.0
// ═══════════════════════════════════════════════════════════════════════
// Gate de la directiva C1.0 §6: una carta NO puede declararse ROM-backed en
// producción si sus cues ROM no producen consumo + efecto visible en Pixi.
//   ROM_PRESENTATION_SELECTED  ⇒  cuesConsumed > 0  AND  visibleEffects > 0
//
// Headless (Node): usa un fake BattlePresentation — sin Pixi. Verifica:
//   1. Una carta BEAM_BASE ($02, p.ej. Kamehameha) produce ruta ROM.
//   2. Sus cues, pasados por el ProductionRomPresentationAdapter, consumen y
//      cambian Pixi (scene + FX + impact).
//   3. Una carta sin ruta madura → null (fallback LEGACY honesto).
//   4. Un cue ROM_PENDING nunca es no-op silencioso.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS } from '../src/data/cards';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';

class FakePresentation implements BattlePresentation {
  scenes: BattleScene[] = [];
  actorPoses: string[] = [];
  targetPoses: string[] = [];
  moves = 0;
  projectiles = 0;
  impacts = 0;
  cameras = 0;
  fieldReturns = 0;
  syncs = 0;
  setScene(s: BattleScene): void { this.scenes.push(s); }
  setFighterVisibility(): void {}
  setFighterPosition(): void {}
  setActionObjectPosition(): void {}
  moveActionObject(): void {}
  setActorPose(p: string): void { this.actorPoses.push(p); }
  setTargetPose(p: string): void { this.targetPoses.push(p); }
  moveActor(): void { this.moves++; }
  spawnProjectile(): void { this.projectiles++; }
  setProjectileProgress(): void {}
  impact(): void { this.impacts++; }
  camera(): void { this.cameras++; }
  returnToField(): void { this.fieldReturns++; }
  applyFrameOffset(): void {}
  setRomSequenceForSlot(): void {}
  moveActorByRomMotion(): void {}
  moveTargetByRomMotion(): void {}
  applyScreenMotion(): void {}
  applyScreenRestore(): void {}
  applyScreenPath(): void {}
  sync(): void { this.syncs++; }
}

let failures = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) console.log(`  ✅ ${name}`);
  else { failures++; console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

// 1. Carta BEAM_BASE ($02) → ruta ROM + consumo + efecto visible (scene + FX)
const beam = CARDS.find(c => romPresentationTimelineForCard(c, 'player')?.kind === 'BEAM_BASE');
check('BEAM_BASE card exists', !!beam);
if (beam) {
  const route = romPresentationTimelineForCard(beam, 'player')!;
  const fake = new FakePresentation();
  const adapter = new ProductionRomPresentationAdapter(fake);
  adapter.reset('ROM');
  for (const en of route.timeline.entries) adapter.consume(en.cue);
  const s = adapter.snapshot;

  check(`route for ${beam.name} (handler $02)`, !!route);
  check('cuesConsumed > 0', s.cuesConsumed > 0, `cuesConsumed=${s.cuesConsumed}`);
  check('visibleEffects > 0', s.visibleEffects > 0, `visibleEffects=${s.visibleEffects}`);
  check('scene change visible', fake.scenes.length > 0, `scenes=${fake.scenes.length}`);
  check('motion recorded (no easeOutCubic)', s.motions > 0, `motions=${s.motions}`);
  check('FX load recorded (no procedural projectile)', s.fxLoads > 0, `fxLoads=${s.fxLoads}`);
  check('NO procedural projectile spawned (ban)', fake.projectiles === 0, `projectiles=${fake.projectiles}`);
  check('NO easeOutCubic rush (ban)', fake.moves === 0, `moves=${fake.moves}`);
  check('provenance = ROM', s.source === 'ROM');
}

// 1b. Canary COMPLETO: BEAM_BASE CON rama de resultado (Kamehameha-class) → impacto.
const beamFull = CARDS.find(c => {
  const r = romPresentationTimelineForCard(c, 'player');
  return r?.kind === 'BEAM_BASE' && r.timeline.entries.some(en => en.cue.type === 'ROM_RESULT_BRANCH');
});
check('BEAM_BASE with result branch exists (Kamehameha-class)', !!beamFull);
if (beamFull) {
  const route = romPresentationTimelineForCard(beamFull, 'player')!;
  const fake = new FakePresentation();
  const adapter = new ProductionRomPresentationAdapter(fake);
  adapter.reset('ROM');
  for (const en of route.timeline.entries) adapter.consume(en.cue);
  check(`impact visible for ${beamFull.name}`, fake.impacts > 0, `impacts=${fake.impacts}`);
}

// 2. Carta no elegible → null (fallback LEGACY honesto, nunca un no-op ROM)
const legacy = CARDS.find(c => romPresentationTimelineForCard(c, 'player') === null);
check('non-eligible card → null route (LEGACY fallback)', !!legacy, legacy ? legacy.name : '');

// 3. STANDARD_DAMAGE ($0A) también produce ruta ROM madura
const dmg = CARDS.find(c => romPresentationTimelineForCard(c, 'player')?.kind === 'STANDARD_DAMAGE');
check('STANDARD_DAMAGE card exists', !!dmg);
if (dmg) {
  const route = romPresentationTimelineForCard(dmg, 'player');
  const fake = new FakePresentation();
  const adapter = new ProductionRomPresentationAdapter(fake);
  adapter.reset('ROM');
  for (const en of route!.timeline.entries) adapter.consume(en.cue);
  check('STANDARD_DAMAGE visibleEffects > 0', adapter.snapshot.visibleEffects > 0, `visibleEffects=${adapter.snapshot.visibleEffects}`);
}

// 4. ROM_PENDING nunca no-op silencioso
const fake2 = new FakePresentation();
const adapter2 = new ProductionRomPresentationAdapter(fake2);
adapter2.consume({ type: 'ROM_PENDING', tick: 0, reason: 'test', boundary: 'STATIC' } as never);
check('ROM_PENDING → pendingCues=1', adapter2.snapshot.pendingCues === 1, `pendingCues=${adapter2.snapshot.pendingCues}`);

console.log('');
if (failures === 0) {
  console.log('ALL CHECKS PASSED ✅');
  process.exit(0);
} else {
  console.error(`${failures} CHECK(S) FAILED ❌`);
  process.exit(1);
}

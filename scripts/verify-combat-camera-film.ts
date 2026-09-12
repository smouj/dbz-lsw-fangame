import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BattleRuntime } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import type { BattleTimeline, PresentationCue } from '../src/battle/engine/presentation/PresentationCue';
import type { BattleSide } from '../src/battle/engine/state/BattleState';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { getCard, type CardDef } from '../src/data/cards';
import { createBattleDeck } from '../src/battle/state';
import { BattlePosition } from '../src/data/positions';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';
import { CameraPresenter } from '../src/renderer/pixi/presentation/CameraPresenter';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { advanceAuthoritativeBattleTick } from '../src/renderer/pixi/presentation/RomPresentationPlayer';
import { resolveActionEntryBoundary, describeActionEntryBoundary } from '../src/battle/presentation/actionBoundary';
import { canonForAction } from '../src/battle/animationCanon';
import { actionDescriptorForCard } from '../src/battle/engine/commands/buildActionDescriptor';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function runtime(seed = 4242): BattleRuntime {
  const cfg: InitialBattleConfig = {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: createBattleDeck([], { seed }), enemyDeck: createBattleDeck([], { seed: seed + 1 }),
    playerLimits: [], playerFighterLimits: [], firstAttacker: 'player', seed,
  };
  return new BattleRuntime({ state: createInitialBattleState(cfg) });
}

interface FilmFrame {
  battleTick: number;
  presentationTick: number;
  scene: BattleScene;
  background: string;
  motionActive: boolean;
  pathActive: boolean;
  offsetX: number;
  offsetY: number;
  actorVisible: boolean;
  targetVisible: boolean;
  impactCount: number;
  whiteFlashCount: number;
}

class CameraFilmProbe implements BattlePresentation {
  readonly cameraPresenter = new CameraPresenter();
  currentTick = 0;
  scene: BattleScene = 'FIELD';
  background = '';
  actorVisible = true;
  targetVisible = true;
  impactCount = 0;
  whiteFlashCount = 0;
  frames: FilmFrame[] = [];

  setScene(scene: BattleScene, background = this.background): void { this.scene = scene; this.background = background; }
  setFighterVisibility(role: 'ACTOR' | 'TARGET', visible: boolean): void {
    if (role === 'ACTOR') this.actorVisible = visible; else this.targetVisible = visible;
  }
  setFighterPosition(): void {}
  setActionObjectPosition(): void {}
  moveActionObject(): void {}
  setActorPose(): void {}
  setTargetPose(): void {}
  moveActor(): void {}
  spawnProjectile(): void {}
  setProjectileProgress(): void {}
  impact(): void { this.impactCount++; }
  camera(): void {}
  flashWhite(): void { this.whiteFlashCount++; }
  returnToField(): void { this.scene = 'FIELD'; this.cameraPresenter.reset(); }
  applyFrameOffset(): void {}
  setRomSequenceForSlot(): void {}
  moveActorByRomMotion(): void {}
  moveTargetByRomMotion(): void {}
  applyScreenMotion(dxPerTick: number, durationTicks: number, restore: boolean): void {
    this.cameraPresenter.applyScreenMotion(this.currentTick, dxPerTick, durationTicks, restore);
  }
  applyScreenRestore(): void { this.cameraPresenter.applyScreenRestore(); }
  applyScreenPath(durationTicks: number): void { this.cameraPresenter.applyScreenPath(this.currentTick, durationTicks); }
  sync(tick: number): void { this.currentTick = tick; }

  capture(presentationTick: number): void {
    const camera = this.cameraPresenter.compute(this.currentTick);
    this.frames.push({
      battleTick: this.currentTick, presentationTick, scene: this.scene, background: this.background,
      motionActive: camera.screenMotionActive, pathActive: camera.screenPathActive,
      offsetX: camera.components.romScreenOffsetX, offsetY: camera.components.romScreenOffsetY,
      actorVisible: this.actorVisible, targetVisible: this.targetVisible, impactCount: this.impactCount,
      whiteFlashCount: this.whiteFlashCount,
    });
  }
}

function playFilm(timeline: BattleTimeline, seed = 4242): { frames: FilmFrame[]; runtime: BattleRuntime; clockExact: boolean } {
  const rt = runtime(seed);
  const probe = new CameraFilmProbe();
  const adapter = new ProductionRomPresentationAdapter(probe);
  const byTick = new Map<number, PresentationCue[]>();
  for (const entry of timeline.entries) {
    const list = byTick.get(entry.cue.tick) ?? [];
    list.push(entry.cue);
    byTick.set(entry.cue.tick, list);
  }
  const startBattleTick = rt.state.tick;
  const clock = { getTick: () => rt.state.tick, advance: (ticks: number) => { rt.advance(ticks); } };
  let clockExact = true;
  for (let t = timeline.startTick; t <= timeline.endTick; t++) {
    if (t > timeline.startTick) advanceAuthoritativeBattleTick(clock);
    const expected = startBattleTick + (t - timeline.startTick);
    clockExact = clockExact && rt.state.tick === expected;
    adapter.sync(rt.state.tick);
    for (const cue of byTick.get(t) ?? []) adapter.consume(cue);
    probe.capture(t);
  }
  return { frames: probe.frames, runtime: rt, clockExact };
}

function route(cardId: number, formId: string, side: BattleSide = 'player'): BattleTimeline {
  const value = romPresentationTimelineForCard(getCard(cardId) as CardDef, side, formId);
  if (!value) throw new Error(`missing ROM route for card ${cardId}`);
  return value.timeline;
}

console.log('═══ COMBAT CAMERA FILM — BattleRuntime tick → ROM timeline → viewport ═══');

const energyTimeline = route(8, 'goku_base');
const energy = playFilm(energyTimeline);
check('Energy Bomb film uses the exact BattleRuntime tick', energy.clockExact);
const energyMotionCue = energyTimeline.entries.find(entry => entry.cue.type === 'SCREEN_MOTION')?.cue;
const energyMotionTick = energyMotionCue?.type === 'SCREEN_MOTION' ? energyMotionCue.tick : -1;
const energyActive = energy.frames.find(frame => frame.presentationTick === energyMotionTick);
const energyMoved = energy.frames.find(frame => frame.presentationTick === energyMotionTick + 1);
const energyFinal = energy.frames.at(-1)!;
check('Energy Bomb emits SCREEN_MOTION', energyMotionCue?.type === 'SCREEN_MOTION');
check('SCREEN_MOTION activates the production viewport', energyActive?.motionActive === true);
check('viewport offset changes on the next authoritative tick', energyMoved?.offsetX === -6, `offsetX=${energyMoved?.offsetX}`);
check('Energy Bomb restores the viewport exactly', energyFinal.offsetX === 0 && energyFinal.offsetY === 0 && !energyFinal.motionActive);

const diskTimeline = route(21, 'krillin_base');
const disk = playFilm(diskTimeline);
check('Destruct-Disk film uses the exact BattleRuntime tick', disk.clockExact);
const pathCue = diskTimeline.entries.find(entry => entry.cue.type === 'SCREEN_PATH')?.cue;
const pathTick = pathCue?.type === 'SCREEN_PATH' ? pathCue.tick : -1;
const pathActive = disk.frames.find(frame => frame.presentationTick === pathTick);
const pathMoved = disk.frames.find(frame => frame.presentationTick === pathTick + 1);
const diskFinal = disk.frames.at(-1)!;
check('Destruct-Disk emits SCREEN_PATH', pathCue?.type === 'SCREEN_PATH' && pathCue.durationTicks === 18);
check('SCREEN_PATH activates the production viewport', pathActive?.pathActive === true);
check('fixed ROM path changes both viewport axes', !!pathMoved && pathMoved.offsetX !== 0 && pathMoved.offsetY !== 0,
  `offset=${pathMoved?.offsetX},${pathMoved?.offsetY}`);
check('Destruct-Disk restores the viewport exactly', diskFinal.offsetX === 0 && diskFinal.offsetY === 0 && !diskFinal.pathActive);

function assertStaticDefenderEntrance(cardId: number, formId: string, label: string, side: BattleSide = 'player'): void {
  const card = getCard(cardId) as CardDef;
  const timeline = route(cardId, formId, side);
  const defenderIn = canonForAction(actionDescriptorForCard(card)).defenderIn;
  const targetSide: BattleSide = side === 'player' ? 'enemy' : 'player';
  const film = playFilm(timeline, 5150 + cardId);
  // P0.4R-B5 — la autoridad del boundary es el contrato, NO timeline.startTick.
  const boundary = resolveActionEntryBoundary(timeline);
  const entryTick = boundary.actionEntryTick ?? timeline.startTick;
  const showCue = timeline.entries.find(entry =>
    entry.cue.type === 'FIGHTER_VISIBILITY'
    && entry.cue.role === 'TARGET'
    && entry.cue.side === targetSide
    && entry.cue.visible);
  const showTick = showCue?.cue.tick ?? timeline.startTick + defenderIn;
  const before = film.frames.find(frame => frame.presentationTick === entryTick);
  const entrance = film.frames.find(frame => frame.presentationTick === showTick);
  check(`${label} hides the target in the attacker-only shot`, before?.scene === 'ACTION_SOLO' && before.targetVisible === false,
    `entry=${entryTick} ${describeActionEntryBoundary(boundary)}`);
  check(`${label} emits the verified defenderIn boundary`, showCue !== undefined && showCue.cue.tick === timeline.startTick + defenderIn,
    `show=${showCue?.cue.tick} esperado=${timeline.startTick + defenderIn}`);
  check(`${label} el duelo no se forma antes de la entrada a ACTION`, showTick >= entryTick, `show=${showTick} entry=${entryTick}`);
  check(`${label} composes the duel from target visibility`, entrance?.targetVisible === true && entrance.scene === 'ACTION_DUEL');
}

assertStaticDefenderEntrance(5, 'goku_base', 'Cont.Punch STANDARD_DAMAGE');
assertStaticDefenderEntrance(5, 'piccolo_base', 'Enemy Cont.Punch STANDARD_DAMAGE', 'enemy');
assertStaticDefenderEntrance(7, 'goku_base', 'Energy Wave BEAM_BASE');
assertStaticDefenderEntrance(1, 'goku_base', '3 stage atk. static bridge');

type FlatFixtureCue = PresentationCue & { logicalTick?: number; source?: string; fidelity?: string; profile?: string };
const fixture = JSON.parse(readFileSync(join(process.cwd(), 'scripts/fixtures/m7_stage_attack.json'), 'utf8')) as {
  timeline: FlatFixtureCue[];
};
const stageEntries = fixture.timeline.map((row) => {
  const { logicalTick = 0, source = 'FIXTURE', fidelity = 'NONE', profile, ...cue } = row;
  return { cue: cue as PresentationCue, logicalTick, sourceEvent: source, profileId: profile, fidelity } as BattleTimeline['entries'][number];
});
const stageTimeline: BattleTimeline = {
  startTick: Math.min(...stageEntries.map(entry => entry.cue.tick)),
  endTick: Math.max(...stageEntries.map(entry => entry.cue.tick)),
  entries: stageEntries,
};
const stageA = playFilm(stageTimeline, 4242);
const stageB = playFilm(stageTimeline, 4242);
check('Stage Attack film uses the exact BattleRuntime tick', stageA.clockExact && stageB.clockExact);
const scenes = stageA.frames.map(frame => frame.scene);
check('Stage Attack enters SOLO', scenes.includes('ACTION_SOLO'));
check('Stage entrance consumes a white-screen transition', stageA.frames.some(frame => frame.whiteFlashCount > 0));
check('Stage Attack enters DUEL', scenes.includes('ACTION_DUEL'));
check('Stage Attack reaches impact', stageA.frames.some(frame => frame.impactCount > 0));
check('Stage Attack returns to TACTICAL', stageA.frames.at(-1)?.scene === 'FIELD');
check('SHOT carries the canonical action and overview backgrounds',
  stageA.frames.some(frame => frame.background.includes('01_action.png'))
  && stageA.frames.some(frame => frame.background.includes('01_world.png')));
check('VISIBILITY hides target in SOLO and reveals it for DUEL',
  stageA.frames.some(frame => frame.scene === 'ACTION_SOLO' && !frame.targetVisible)
  && stageA.frames.some(frame => frame.scene === 'ACTION_DUEL' && frame.targetVisible));
check('same seed repeated twice produces the same complete film', JSON.stringify(stageA.frames) === JSON.stringify(stageB.frames));

// Guardrail de integración: el fallo que motivó P0.3 no estaba en la fixture,
// sino en producción. BattleScreen recompilaba Stage desde la carta (timeline
// parcial) después del QTE y perdía DUEL/reacción/retorno. El flujo visible
// debe conservar el adaptador iniciado durante el QTE y continuar con el
// timeline completo que ya posee BattleRuntime.
const battleScreen = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8');
check('production Stage presentation starts while the QTE is active',
  battleScreen.includes('stageRomActiveRef.current = true')
  && battleScreen.includes('runtimeTimelineCursorRef.current = cursor'));
check('production Stage continuation consumes BattleRuntime.timeline',
  battleScreen.includes('const completeTimeline = rtApi.runtime.timeline')
  && battleScreen.includes('completeTimeline.entries.filter(entry => entry.cue.tick > currentTick)'));
check('production Stage does not restart the partial card-level timeline after QTE',
  battleScreen.includes("const continuingRuntimeStage = card.type === 'command'")
  && battleScreen.includes('pixiPres && !runtimeStandardDamage && !continuingRuntimeStage')
  && battleScreen.includes('romPresentationTimelineForCard(card, side, actorFormId)'));

console.log(`\ncombat-camera-film: checks=${checks} failures=${failures}`);
if (failures > 0) process.exit(1);
console.log('PASS — BattleRuntime is the only logical clock and ROM camera/scene cues visibly control and restore the viewport.');

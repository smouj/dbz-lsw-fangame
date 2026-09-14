// ═══════════════════════════════════════════════════════════
// DBZ LSW — P0 ANIMATION OWNERSHIP (G7) — tests de consumo
// ═══════════════════════════════════════════════════════════
// Garantías que protegen estos tests (verifiers del P0, §17):
//   1. FIGHTER_VISIBILITY / mostrar un fighter NUNCA arranca playback.
//   2. Ocultar o STOP (ROM $08) congela el track: sync() no avanza frames.
//   3. El mapeo de slots ActionObject es POR ROL (slot0=actor, slot1=target):
//      una accion del ENEMIGO enruta slot0 al fighter derecho (actor).
//   4. El adapter consume ACTION_OBJECT_STOP -> freeze (no trace no-op).
// ═══════════════════════════════════════════════════════════

import { describe, expect, it, vi } from 'vitest';
import { Container, Texture } from 'pixi.js';
import { FighterActor } from '../actors/FighterActor';
import { PixiBattlePresentation } from './PixiBattlePresentation';
import { ProductionRomPresentationAdapter } from './ProductionRomPresentationAdapter';
import type { BattleRenderer } from '../BattleRenderer';
import { ImpactSystem } from '../systems/ImpactSystem';
import type { FormAtlas } from '../assets/AtlasLoader';
import { BattlePosition } from '../../../data/positions';
import { ACTION_LEFT_X, ACTION_RIGHT_X, ACTION_SPECIAL_LEFT_X, ACTION_SPECIAL_RIGHT_X } from '../scenes/ActionScene';
import { ActionScene } from '../scenes/ActionScene';
import { ACTION_NATIVE_H, ACTION_NATIVE_W, ACTION_WORLD_SCALE, BATTLE_LOGICAL_H, BATTLE_LOGICAL_W } from '../config';
import { ACTION_GROUND_Y } from '../systems/MotionSystem';
import { ActionObjectRuntime } from '../../../battle/engine/presentation/ActionObjectRuntime';

function fakeAtlas(): FormAtlas {
  return { formId: 'gohan_young', dir: '', anims: new Map(), textures: new Map(), maxW: 16, maxH: 16 };
}

function physicalLatchAtlas(): FormAtlas {
  const atlas = fakeAtlas();
  atlas.anims.set('attack_fwd', {
    fps: 12,
    loop: true,
    frames: [{ file: 'semantic.png', w: 8, h: 8, durationTicks: 1 }],
  });
  atlas.textures.set('attack_fwd:0', Texture.EMPTY);
  atlas.textures.set('rom-frame-0', Texture.WHITE);
  return atlas;
}

function rendererFixture() {
  const app = { stage: new Container(), screen: { width: 320, height: 160 } };
  const world = new Container();
  const sceneDirector: any = {
    setScene: vi.fn(),
    action: {
      actorHomeX: () => 48,
      targetHomeX: () => 112,
      setFighters: vi.fn(),
      setRoles: vi.fn(),
    },
    tactical: { setBackground: vi.fn(), setOverworld: vi.fn() },
    projectileLayer: new Container(),
  };
  const rendererObj = {
    app,
    world,
    currentTick: 100,
    impactSystem: new ImpactSystem(),
    sceneDirector,
    sync: null as unknown as (tick: number) => void,
  };
  rendererObj.sync = (tick: number) => { rendererObj.currentTick = tick; };
  return rendererObj as unknown as BattleRenderer;
}

function presentationWith(renderer: BattleRenderer) {
  const pres = new PixiBattlePresentation(renderer, {
    playerFormId: 'gohan_young',
    enemyFormId: 'piccolo_evil',
    overviewBackground: '',
    actionBackground: '',
    playerPos: BattlePosition.DOWN_BACK,
    enemyPos: BattlePosition.DOWN_BACK,
  });
  return pres;
}


describe('FighterActor track ownership (G7)', () => {
  it('freezeTrack detiene el avance: sync() no cambia frame con playback off', () => {
    const actor = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    actor.setPlaybackEnabled(true);
    actor.freezeTrack();
    expect(actor.isPlaybackEnabled).toBe(false);
    // Con playback desactivado el frame no puede avanzar por el reloj.
    const frameBefore = actor.frameIndex;
    actor.sync(500);
    expect(actor.frameIndex).toBe(frameBefore);
  });

  it('visible por sí solo no arranca playback (regla absoluta del P0)', () => {
    const actor = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    actor.setPlaybackEnabled(false);
    actor.visible = true; // FIGHTER_VISIBILITY muestra el contenedor
    expect(actor.isPlaybackEnabled).toBe(false);
    actor.visible = false; // ocultar también desactiva en el adaptador
    // (la semántica de ocultar→freeze la aplica PixiBattlePresentation)
  });

  it('setPose es la ÚNICA opt-in de playback (cue FIGHTER_POSE/animación)', () => {
    const actor = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    actor.freezeTrack();
    expect(actor.isPlaybackEnabled).toBe(false);
    actor.setPose('attack_fwd', 10);
    expect(actor.isPlaybackEnabled).toBe(true);
  });

  it('mantiene el frame físico ROM entre cues y no deja que sync lo sustituya', () => {
    const actor = new FighterActor(physicalLatchAtlas(), 'gohan_young', 'left');
    actor.setPose('attack_fwd', 0);
    actor.setPhysicalFrame({
      resource: 44,
      sequence: 0,
      frameIndex: 0,
      physicalId: 'rom-frame-0',
      offsetX: 3,
      offsetY: -2,
    });
    actor.setPlaybackEnabled(true);
    const sprite = (actor as any).sprite;
    expect(sprite.texture).toBe(Texture.WHITE);
    expect(actor.inspect().frameOffsetX).toBe(3);
    expect(actor.inspect().frameOffsetY).toBe(-2);
    actor.sync(1);
    expect(sprite.texture).toBe(Texture.WHITE);
    expect(actor.frameIndex).toBe(0);

    // An explicit semantic pose is the documented ownership hand-off.
    actor.setPose('attack_fwd', 2);
    expect(sprite.texture).toBe(Texture.EMPTY);
  });

  it('no reutiliza offsets ni pose cuando el frame físico no está materializado', () => {
    const actor = new FighterActor(physicalLatchAtlas(), 'gohan_young', 'left');
    actor.setPose('attack_fwd', 0);
    actor.setPhysicalFrame({
      resource: 44,
      sequence: 0,
      frameIndex: 0,
      physicalId: 'missing-rom-frame',
      offsetX: 7,
      offsetY: 4,
    });
    actor.setPlaybackEnabled(true);
    const sprite = (actor as any).sprite;
    expect(sprite.visible).toBe(false);
    actor.sync(10);
    expect(sprite.visible).toBe(false);
    expect(actor.inspect().frameOffsetX).toBe(7);
    expect(actor.inspect().frameOffsetY).toBe(4);

    // The next physical record without explicit deltas resets both axes.
    actor.setPhysicalFrame({ resource: 44, sequence: 0, frameIndex: 1, physicalId: 'rom-frame-0' });
    expect(actor.inspect().frameOffsetX).toBe(0);
    expect(actor.inspect().frameOffsetY).toBe(0);
  });
});

describe('SPECIAL_ACTION optical anchors', () => {
  it('moves only the special plane inward while preserving normal ACTION spacing', () => {
    expect(ACTION_LEFT_X).toBe(48);
    expect(ACTION_RIGHT_X).toBe(112);
    expect(ACTION_SPECIAL_LEFT_X).toBeGreaterThan(ACTION_LEFT_X);
    expect(ACTION_SPECIAL_RIGHT_X).toBeLessThan(ACTION_RIGHT_X);
    expect(ACTION_SPECIAL_LEFT_X + ACTION_SPECIAL_RIGHT_X).toBe(ACTION_LEFT_X + ACTION_RIGHT_X);
  });
});

describe('ACTION native geometry projection', () => {
  it('keeps the scene in 160×80 native space and projects it once to 320×160', () => {
    const scene = new ActionScene();
    expect(ACTION_NATIVE_W).toBe(160);
    expect(ACTION_NATIVE_H).toBe(80);
    expect(ACTION_WORLD_SCALE).toBe(2);
    expect(BATTLE_LOGICAL_W).toBe(ACTION_NATIVE_W * ACTION_WORLD_SCALE);
    expect(BATTLE_LOGICAL_H).toBe(ACTION_NATIVE_H * ACTION_WORLD_SCALE);
    expect(scene.scale.x).toBe(ACTION_WORLD_SCALE);
    expect(scene.scale.y).toBe(ACTION_WORLD_SCALE);
    expect(scene.label).toBe('action-scene-native-160x80');
    expect(ACTION_GROUND_Y).toBe(75);
  });

  it('reorders fighters without moving either one below the BG', () => {
    const scene = new ActionScene();
    scene.setBackground(Texture.WHITE);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    const right = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    scene.setFighters(left, right);
    scene.reorderFightersDrawnOrder(right, left);
    expect(scene.children[0]).not.toBe(right);
    expect(scene.children[0]).not.toBe(left);
    expect(scene.children.indexOf(right)).toBe(1);
    expect(scene.children.indexOf(left)).toBe(2);
  });

  it('keeps the ROM display layer behind both fighters when draw order changes', () => {
    const scene = new ActionScene();
    scene.setBackground(Texture.WHITE);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    const right = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    scene.setFighters(left, right);
    const romDisplay = new Container();
    romDisplay.label = 'rom-display';
    scene.addChildAt(romDisplay, 1);

    scene.reorderFightersDrawnOrder(right, left);

    expect(scene.children.indexOf(romDisplay)).toBe(1);
    expect(scene.children.indexOf(right)).toBe(2);
    expect(scene.children.indexOf(left)).toBe(3);
  });
});

describe('ActionObject slot mapping por ROL (P0.4/P0.7)', () => {
  it('runtime binding supports offense, defense, rebind and unbind without fixed slot sides', () => {
    const runtime = new ActionObjectRuntime();
    expect(runtime.resolve(0)?.role).toBe('ACTOR');
    expect(runtime.resolve(1)?.role).toBe('TARGET');
    runtime.bind(0, { role: 'TARGET', fighterSide: 'PLAYER' });
    expect(runtime.resolve(0)).toEqual({ role: 'TARGET', fighterSide: 'PLAYER' });
    runtime.stop(0);
    expect(runtime.state(0)).toMatchObject({ active: false, visible: false });
    runtime.bind(0, { role: 'ACTOR', fighterSide: 'ENEMY' });
    expect(runtime.state(0)).toMatchObject({ active: true, visible: true });
    expect(runtime.resolve(0)?.role).toBe('ACTOR');
    runtime.unbind(0);
    expect(runtime.resolve(0)).toBeNull();
    expect(runtime.state(0)).toMatchObject({ active: false, visible: false });
  });

  it('adapter bind/unbind changes the real slot target and stop hides the rebound fighter', () => {
    const renderer = rendererFixture();
    const pres = presentationWith(renderer);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    const right = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    (pres as any).leftActor = left;
    (pres as any).rightActor = right;
    pres.setAttacker('left');
    const adapter = new ProductionRomPresentationAdapter(pres);
    adapter.consume({ type: 'ACTION_OBJECT_BIND', tick: 0, slot: 0, role: 'TARGET' } as never);
    pres.setRomSequenceForSlot(0, 44, 1);
    expect(right.currentRomSequence).toEqual({ resource: 44, sequence: 1 });
    adapter.consume({ type: 'ACTION_OBJECT_STOP', tick: 1, slot: 0 } as never);
    expect(right.isPlaybackEnabled).toBe(false);
    expect(pres.actionObjectSnapshot[0]).toMatchObject({ active: false, visible: false });
    adapter.consume({ type: 'ACTION_OBJECT_BIND', tick: 2, slot: 0, role: 'ACTOR' } as never);
    expect(pres.actionObjectSnapshot[0]).toMatchObject({ active: true, visible: true });
    adapter.consume({ type: 'ACTION_OBJECT_UNBIND', tick: 3, slot: 0 } as never);
    expect(pres.actionObjectSnapshot[0]).toMatchObject({ binding: null, active: false, visible: false });
  });

  function rig(attackerSide: 'left' | 'right') {
    const renderer = rendererFixture();
    const pres = presentationWith(renderer);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    const right = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    (pres as any).leftActor = left;
    (pres as any).rightActor = right;
    pres.setAttacker(attackerSide);
    return { pres, left, right };
  }

  it('en acción del JUGADOR slot0→left(actor), slot1→right(target)', () => {
    const { pres, left, right } = rig('left');
    pres.setRomSequenceForSlot(0, 44, 1);
    pres.setPhysicalFrameForSlot(1, { resource: 0, sequence: 13, frameIndex: 0 });
    expect(left.currentRomSequence).toEqual({ resource: 44, sequence: 1 });
    expect(right.currentRomSequence).toEqual({ resource: 0, sequence: 13 });
    expect(left.frameIndex).toBe(0);
  });

  it('en acción del ENEMIGO slot0→right(actor), slot1→left(target) — anti-swap', () => {
    const { pres, left, right } = rig('right');
    pres.setRomSequenceForSlot(0, 44, 1);
    pres.setPhysicalFrameForSlot(1, { resource: 0, sequence: 13, frameIndex: 2 });
    expect(right.currentRomSequence).toEqual({ resource: 44, sequence: 1 });
    expect(left.currentRomSequence).toEqual({ resource: 0, sequence: 13 });
    // El slot0 del enemigo NUNCA debe conducir al fighter del jugador.
    expect(left.currentRomSequence).not.toEqual({ resource: 44, sequence: 1 });
  });

  it('ACTION_OBJECT_STOP congela el track del slot correcto (adapter→presenter)', () => {
    const renderer = rendererFixture();
    const pres = presentationWith(renderer);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    const right = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    (pres as any).leftActor = left;
    (pres as any).rightActor = right;
    pres.setAttacker('right'); // actor = right
    left.setPlaybackEnabled(true);
    right.setPlaybackEnabled(true);
    const adapter = new ProductionRomPresentationAdapter(pres);
    adapter.consume({ type: 'ACTION_OBJECT_STOP', tick: 0, slot: 0 } as never);
    expect(right.isPlaybackEnabled).toBe(false); // slot0 → actor (enemigo)
    expect(left.isPlaybackEnabled).toBe(true);   // target intacto
    adapter.consume({ type: 'ACTION_OBJECT_STOP', tick: 0, slot: 1 } as never);
    expect(left.isPlaybackEnabled).toBe(false);
  });
});

describe('P0.13 cleanup — baseline visual real entre acciones', () => {
  it('returnToField limpia offsets ROM y deja el idle estatico (playback off)', () => {
    const renderer = rendererFixture();
    const pres = presentationWith(renderer);
    const left = new FighterActor(fakeAtlas(), 'gohan_young', 'left');
    (pres as any).leftActor = left;
    (pres as any).rightActor = new FighterActor(fakeAtlas(), 'piccolo_evil', 'right');
    pres.setAttacker('left');
    // Frame offset ROM aplicado durante la pelicula (slot0 → actor = left).
    pres.applyFrameOffset(12, -4, 0);
    expect(left.inspect().frameOffsetX).toBe(12);
    expect(left.inspect().frameOffsetY).toBe(-4);
    pres.returnToField();
    // ACTION N+1 no hereda offset residual: baseline limpio y estatico.
    expect(left.inspect().frameOffsetX).toBe(0);
    expect(left.inspect().frameOffsetY).toBe(0);
    expect(left.isPlaybackEnabled).toBe(false);
    expect(left.currentRomSequence).toBeNull();
  });
});

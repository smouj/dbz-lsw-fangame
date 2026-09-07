import { describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import type { BattleRenderer } from '../BattleRenderer';
import { ImpactSystem } from '../systems/ImpactSystem';
import { PixiBattlePresentation } from './PixiBattlePresentation';
import { ProductionRomPresentationAdapter } from './ProductionRomPresentationAdapter';
import { BattlePosition } from '../../../data/positions';
import { FighterActor } from '../actors/FighterActor';
import { Texture } from 'pixi.js';
import type { FormAtlas, PoseAnim } from '../assets/AtlasLoader';

function fixture() {
  const stage = new Container();
  const renderer = {
    app: { stage, screen: { width: 320, height: 160 } },
    world: new Container(), currentTick: 50, impactSystem: new ImpactSystem(),
    sceneDirector: { setScene: vi.fn() },
    sync(tick: number) { this.currentTick = tick; },
  };
  const presentation = new PixiBattlePresentation(renderer as unknown as BattleRenderer, {
    playerFormId: 'goku_base', enemyFormId: 'piccolo_base',
    overviewBackground: '', actionBackground: '',
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
  });
  return { renderer, presentation, overlay: stage.children[0] };
}

describe('white screen transition', () => {
  it('covers the viewport for two ticks without moving the camera or freezing fighters', () => {
    const { renderer, presentation, overlay } = fixture();
    new ProductionRomPresentationAdapter(presentation).consume({ type: 'CAMERA', tick: 50, action: 'FLASH_WHITE' });
    expect(overlay.visible).toBe(true);
    expect(overlay.width).toBe(320);
    expect(overlay.height).toBe(160);
    expect(overlay.parent).toBe(renderer.app.stage);
    expect(renderer.impactSystem.snapshot(50)).toEqual({ hitstop: false, flash: 0, shakeX: 0, shakeY: 0 });
    presentation.sync(51);
    expect(overlay.visible).toBe(true);
    presentation.sync(52);
    expect(overlay.visible).toBe(false);
  });

  it('adapts to resize and clears immediately on field return', () => {
    const { renderer, presentation, overlay } = fixture();
    presentation.flashWhite(2);
    renderer.app.screen.width = 640;
    renderer.app.screen.height = 320;
    presentation.sync(51);
    expect([overlay.width, overlay.height]).toEqual([640, 320]);
    presentation.returnToField();
    expect(overlay.visible).toBe(false);
    presentation.sync(51);
    expect(overlay.visible).toBe(false);
  });
});

describe('ROM playback ownership', () => {
  it('keeps visibility and playback independent until an explicit pose start', () => {
    const idle: PoseAnim = {
      fps: 60,
      loop: true,
      frames: [
        { file: 'idle-0.png', w: 8, h: 8, durationTicks: 2 },
        { file: 'idle-1.png', w: 8, h: 8, durationTicks: 2 },
      ],
    };
    const atlas: FormAtlas = {
      formId: 'goku_base',
      dir: 'goku_base',
      textures: new Map([
        ['idle:0', Texture.WHITE],
        ['idle:1', Texture.WHITE],
      ]),
      anims: new Map([['idle', idle]]),
      maxW: 8,
      maxH: 8,
    };
    const actor = new FighterActor(atlas, 'goku_base', 'player');

    expect(actor.isPlaybackEnabled).toBe(false);
    actor.sync(20);
    expect(actor.frameIndex).toBe(0);

    actor.setPose('idle', 20);
    expect(actor.isPlaybackEnabled).toBe(true);
    actor.sync(22);
    expect(actor.frameIndex).toBe(1);

    actor.visible = false;
    actor.setPlaybackEnabled(false);
    actor.sync(24);
    expect(actor.frameIndex).toBe(1);
    actor.visible = true;
    actor.sync(26);
    expect(actor.frameIndex).toBe(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Container } from 'pixi.js';
import type { BattleRenderer } from '../BattleRenderer';
import { ImpactSystem } from '../systems/ImpactSystem';
import { PixiBattlePresentation } from './PixiBattlePresentation';
import { ProductionRomPresentationAdapter } from './ProductionRomPresentationAdapter';
import { BattlePosition } from '../../../data/positions';

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

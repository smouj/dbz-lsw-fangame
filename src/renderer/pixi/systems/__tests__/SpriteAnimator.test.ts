import { describe, expect, it } from 'vitest';
import type { PoseAnim } from '../../assets/AtlasLoader';
import { currentFrame } from '../SpriteAnimator';

function anim(frames: Array<Partial<PoseAnim['frames'][number]>>, loop = false, fps = 10): PoseAnim {
  return {
    fps,
    loop,
    frames: frames.map((frame, i) => ({
      file: `frame-${i}.png`,
      w: 8,
      h: 8,
      ...frame,
    })),
  };
}

describe('SpriteAnimator currentFrame', () => {
  it('uses legacy uniform fps when frames do not all have ROM durations', () => {
    const state = currentFrame(anim([{}, {}, {}], false, 10), 6, 60);

    expect(state.frameIndex).toBe(1);
    expect(state.frame.file).toBe('frame-1.png');
    expect(state.finished).toBe(false);
  });

  it('wraps legacy looping animations deterministically', () => {
    const state = currentFrame(anim([{}, {}, {}], true, 10), 24, 60);

    expect(state.frameIndex).toBe(1);
    expect(state.finished).toBe(false);
  });

  it('uses per-frame ROM durationTicks when every frame provides them', () => {
    const romAnim = anim([
      { durationTicks: 3 },
      { durationTicks: 8 },
      { durationTicks: 2 },
    ]);

    expect(currentFrame(romAnim, 0).frameIndex).toBe(0);
    expect(currentFrame(romAnim, 2).frameIndex).toBe(0);
    expect(currentFrame(romAnim, 3).frameIndex).toBe(1);
    expect(currentFrame(romAnim, 10).frameIndex).toBe(1);
    expect(currentFrame(romAnim, 11).frameIndex).toBe(2);
  });

  it('holds the last ROM-duration frame and reports finished after its duration', () => {
    const romAnim = anim([{ durationTicks: 3 }, { durationTicks: 2 }]);

    expect(currentFrame(romAnim, 4).frameIndex).toBe(1);
    expect(currentFrame(romAnim, 4).finished).toBe(false);
    expect(currentFrame(romAnim, 5).frameIndex).toBe(1);
    expect(currentFrame(romAnim, 5).finished).toBe(true);
  });

  it('wraps ROM-duration looping animations by total duration', () => {
    const romAnim = anim([{ durationTicks: 3 }, { durationTicks: 2 }], true);

    expect(currentFrame(romAnim, 5).frameIndex).toBe(0);
    expect(currentFrame(romAnim, 8).frameIndex).toBe(1);
    expect(currentFrame(romAnim, 10).frameIndex).toBe(0);
    expect(currentFrame(romAnim, 10).finished).toBe(false);
  });

  it('falls back to legacy timing when any durationTicks value is invalid', () => {
    const mixedAnim = anim([{ durationTicks: 3 }, { durationTicks: 0 }, { durationTicks: 2 }], false, 10);

    expect(currentFrame(mixedAnim, 6, 60).frameIndex).toBe(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPowerPreview, type PowerPreviewFrame } from './powerPreviewPlayback';

class PreviewImage {
  static requests: PreviewImage[] = [];
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { PreviewImage.requests.push(this); }
}
let run = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Image', PreviewImage);
  PreviewImage.requests = [];
  run++;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const urls = () => ({ powerUrl: `/power-${run}.png`, auraUrl: `/aura-${run}.png`, reducedMotion: false });

describe('OW selection playback', () => {
  it('settles before charging, then holds the same character with its aura', async () => {
    const frames: PowerPreviewFrame[] = [];
    const stop = startPowerPreview(urls(), frame => frames.push(frame));
    PreviewImage.requests.forEach(image => image.onload?.());
    await vi.advanceTimersByTimeAsync(299);
    expect(frames.map(f => f.phase)).toEqual(['settling']);
    await vi.advanceTimersByTimeAsync(1);
    expect(frames.at(-1)?.phase).toBe('charging');
    await vi.advanceTimersByTimeAsync(240);
    expect(frames.at(-1)).toEqual({ phase: 'powered', power: urls().powerUrl, aura: urls().auraUrl });
    await vi.advanceTimersByTimeAsync(5000);
    expect(frames).toHaveLength(3);
    stop();
  });

  it('waits for slow assets instead of popping an aura into a charged pose', async () => {
    const update = vi.fn();
    const stop = startPowerPreview(urls(), update);
    await vi.advanceTimersByTimeAsync(800);
    expect(update).toHaveBeenCalledTimes(1);
    PreviewImage.requests.forEach(image => image.onload?.());
    await vi.advanceTimersByTimeAsync(0);
    expect(update.mock.lastCall?.[0].phase).toBe('charging');
    stop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('cancels obsolete loads during rapid character or form changes', async () => {
    const oldUpdate = vi.fn();
    const stopOld = startPowerPreview(urls(), oldUpdate);
    stopOld();
    const update = vi.fn();
    const stop = startPowerPreview({ powerUrl: '/new-form.png', reducedMotion: false }, update);
    PreviewImage.requests.forEach(image => image.onload?.());
    await vi.advanceTimersByTimeAsync(1000);
    expect(oldUpdate).toHaveBeenCalledTimes(1);
    expect(update.mock.lastCall?.[0]).toEqual({ phase: 'powered', power: '/new-form.png', aura: undefined });
    stop();
  });

  it('keeps a valid pose if the aura fails and omits aura if the pose fails', async () => {
    const update = vi.fn();
    startPowerPreview(urls(), update);
    PreviewImage.requests[0].onload?.();
    PreviewImage.requests[1].onerror?.();
    await vi.advanceTimersByTimeAsync(600);
    expect(update.mock.lastCall?.[0]).toEqual({ phase: 'powered', power: urls().powerUrl, aura: undefined });
    startPowerPreview({ powerUrl: '/failed-pose.png', auraUrl: '/valid-aura.png', reducedMotion: true }, update);
    PreviewImage.requests[2].onerror?.();
    PreviewImage.requests[3].onload?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(update.mock.lastCall?.[0]).toEqual({ phase: 'powered', power: undefined, aura: undefined });
  });

  it('does not animate the entrance when reduced motion is requested', async () => {
    const update = vi.fn();
    startPowerPreview({ ...urls(), reducedMotion: true }, update);
    PreviewImage.requests.forEach(image => image.onload?.());
    await vi.advanceTimersByTimeAsync(0);
    expect(update.mock.calls.map(([frame]) => frame.phase)).toEqual(['settling', 'powered']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recovers from a timed out image rather than leaving selection loading forever', async () => {
    const update = vi.fn();
    startPowerPreview(urls(), update);
    await vi.advanceTimersByTimeAsync(4240);
    expect(update.mock.lastCall?.[0]).toEqual({ phase: 'powered', power: undefined, aura: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });
});

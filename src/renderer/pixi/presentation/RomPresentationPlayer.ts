// ═══════════════════════════════════════════════════════════════════════
// C1.0 — RomPresentationPlayer
// ═══════════════════════════════════════════════════════════════════════
// Scheduler de ticks GBC para un BattleTimeline ROM (PresentationCue[]).
// Espejo del scheduler LEGACY BattleTimeline, pero opera sobre cues ROM en
// lugar de CinematicEvent: avanza en frames GBC vía requestAnimationFrame y
// alimenta cada cue (en su tick) al ProductionRomPresentationAdapter.
//
// Es un puente hacia (b): cuando BattleRuntime.timeline completo se enrute por
// el Presenter, el Presenter sustituirá a este scheduler de canary.
// ═══════════════════════════════════════════════════════════════════════

import { GAMEPLAY_CONFIG } from '../../../config/gameplay.config';
import type { BattleTimeline } from '../../../battle/engine/presentation/PresentationCue';
import type { ProductionRomPresentationAdapter } from './ProductionRomPresentationAdapter';

const GBC_FPS = GAMEPLAY_CONFIG.gbcNativeFps;

export interface RomPresentationPlayerOptions {
  onTick?: (tick: number) => void;
  onComplete: () => void;
}

export class RomPresentationPlayer {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private tickCursor = -1;
  private done = false;
  private readonly totalTicks: number;

  constructor(
    private readonly timeline: BattleTimeline,
    private readonly adapter: ProductionRomPresentationAdapter,
    private readonly opts: RomPresentationPlayerOptions,
  ) {
    this.totalTicks = timeline.endTick;
  }

  get tick(): number {
    return Math.max(0, Math.min(this.tickCursor, this.totalTicks));
  }

  start(): void {
    if (this.done) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tickLoop);
  }

  cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tickLoop = (now: number): void => {
    if (this.done) return;
    const delta = ((now - this.last) / 1000) * GBC_FPS;
    this.last = now;
    this.acc += delta;

    const target = Math.min(Math.floor(this.acc), this.totalTicks);
    while (this.tickCursor < target) {
      this.tickCursor += 1;
      const at = this.tickCursor;
      // Sincroniza el reloj ANTES de aplicar los cues del tick (frame = f(tick)).
      this.adapter.sync(at);
      for (const entry of this.timeline.entries) {
        if (entry.cue.tick === at) this.adapter.consume(entry.cue);
      }
    }

    this.opts.onTick?.(target);

    if (this.tickCursor >= this.totalTicks) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.tickLoop);
  };

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cancel();
    this.opts.onComplete();
  }
}

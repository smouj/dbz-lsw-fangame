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

import type { BattleTimeline, PresentationCue } from '../../../battle/engine/presentation/PresentationCue';
import { GbcClockAdapter } from '../../../battle/GbcClockAdapter';
import type { ProductionRomPresentationAdapter } from './ProductionRomPresentationAdapter';

export interface BattleTickAuthority {
  /** Tick absoluto y monotónico del BattleRuntime. */
  getTick(): number;
  /** Única vía por la que el tiempo lógico puede avanzar. */
  advance(ticks: number): void;
}

/** Avanza exactamente un tick mediante la autoridad y verifica monotonicidad. */
export function advanceAuthoritativeBattleTick(clock: BattleTickAuthority): number {
  const before = clock.getTick();
  clock.advance(1);
  const after = clock.getTick();
  if (after !== before + 1) {
    throw new Error(`Battle tick authority must advance exactly one tick (${before} -> ${after})`);
  }
  return after;
}

export interface RomPresentationPlayerOptions {
  clock: BattleTickAuthority;
  onTick?: (presentationTick: number, battleTick: number) => void;
  /** Observes an already-authored visual cue; it never mutates gameplay. */
  onCue?: (cue: PresentationCue, presentationTick: number, battleTick: number) => void;
  onComplete: () => void;
}

export class RomPresentationPlayer {
  private raf = 0;
  private last = 0;
  private tickCursor = -1;
  private done = false;
  private readonly totalTicks: number;
  private readonly realClock = new GbcClockAdapter();
  private battleStartTick = 0;

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
    this.battleStartTick = this.opts.clock.getTick();
    this.tickCursor = this.timeline.startTick - 1;
    this.realClock.reset();
    this.last = performance.now();
    // El tick inicial también procede de la autoridad. No se inventa un tick
    // local para consumir los cues que empiezan en timeline.startTick.
    this.presentCurrentTick(this.timeline.startTick, this.battleStartTick);
    this.raf = requestAnimationFrame(this.tickLoop);
  }

  cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tickLoop = (now: number): void => {
    if (this.done) return;
    const ticksDue = this.realClock.push(now - this.last);
    this.last = now;

    // RAF solo entrega cadencia real al GbcClockAdapter. Cada paso lógico pasa
    // por BattleRuntime.advance(1), y Pixi siempre lee después su tick real.
    for (let i = 0; i < ticksDue && this.tickCursor < this.totalTicks; i++) {
      const battleTick = advanceAuthoritativeBattleTick(this.opts.clock);
      const presentationTick = this.timeline.startTick + (battleTick - this.battleStartTick);
      this.presentCurrentTick(presentationTick, battleTick);
    }

    if (this.tickCursor >= this.totalTicks) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.tickLoop);
  };

  private presentCurrentTick(presentationTick: number, battleTick: number): void {
    const target = Math.min(presentationTick, this.totalTicks);
    while (this.tickCursor < target) {
      this.tickCursor += 1;
      // El renderer recibe el tick ABSOLUTO del Runtime; el timeline conserva
      // sus ticks relativos únicamente para seleccionar qué cues corresponden.
      this.adapter.sync(battleTick - (target - this.tickCursor));
      for (const entry of this.timeline.entries) {
        if (entry.cue.tick === this.tickCursor) {
          this.adapter.consume(entry.cue);
          this.opts.onCue?.(entry.cue, this.tickCursor, battleTick - (target - this.tickCursor));
        }
      }
    }
    this.opts.onTick?.(target, battleTick);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cancel();
    this.opts.onComplete();
  }
}

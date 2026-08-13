// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattleTimeline: reloj ÚNICO y determinista
// ═══════════════════════════════════════════════════════════
// El corazón de la presentación cinematográfica (plan del usuario, punto 1-2):
// NINGÚN setTimeout/CSS animation-duration manda sobre el gameplay. Un único
// reloj avanza en FRAMES GBC (GBC_NATIVE_FPS) y emite eventos por tick; la
// lógica de batalla ya resolvió el resultado ANTES y solo espera los eventos
// (APPLY_DAMAGE, HIT_FRAME…) para aplicarlo.
//
// Uso:
//   const tl = new BattleTimeline(buildCinematicTracks(profile, side), {
//     onEvent: (e) => { ...aplicar al estado React... },
//     onComplete: () => { ...fin de la cinemática... },
//   });
//   tl.start();
//   tl.cancel(); // al desmontar
//
// El timeline es AGNÓSTICO de React: emite eventos; el consumidor decide qué
// setState hacer. Así la presentación es 100% reproducible (mismo perfil →
// misma secuencia de ticks) y el depurador frame a frame es trivial.

export const GBC_FPS = 59.72750056960583;

export type CinematicEventType =
  | 'SHOT'            // cambia el plano (FIELD/SOLO/DUEL/PROJECTILE/IMPACT)
  | 'ACTOR_POSE'      // pose del atacante (idle, charge, rush, contact…)
  | 'TARGET_POSE'     // pose del defensor (idle, guard, hit…)
  | 'PROJECTILE'      // crear/avanzar/desvanecer proyectil
  | 'HIT_FRAME'       // instante EXACTO de contacto (sincroniza todo)
  | 'APPLY_DAMAGE'    // la lógica aplica el resultado precalculado
  | 'SFX'             // sonido
  | 'CAMERA'          // shake/flash/zoom
  | 'MESSAGE'         // panel inferior (sincronizado con la película)
  | 'FIELD_RETURN'    // volver al plano FIELD
  | 'COMPLETE';       // fin de la cinemática

export interface CinematicEvent {
  type: CinematicEventType;
  tick: number;          // tick absoluto (frames GBC desde el inicio)
  payload?: unknown;
}

export interface CinematicTrack {
  tick: number;
  event: Omit<CinematicEvent, 'tick'>;
}

export type CinematicProfilePresentation =
  | 'FIELD'
  | 'ACTION_SOLO'
  | 'ACTION_DUEL'
  | 'PROJECTILE'
  | 'IMPACT';

export interface CinematicProfile {
  id: string;
  presentation: CinematicProfilePresentation;
  totalTicks: number;
  tracks: CinematicTrack[];
}

export interface BattleTimelineOptions {
  onEvent: (e: CinematicEvent) => void;
  onComplete: () => void;
  /**
   * Se dispara CADA frame con el tick GBC absoluto actual (floor del acumulador).
   * El renderer lo usa para sincronizar la animación de sprites al MISMO reloj
   * que emite los eventos (frame = f(tick) determinista a cualquier Hz).
   */
  onTick?: (tick: number) => void;
}

export class BattleTimeline {
  readonly profile: CinematicProfile;
  private opts: BattleTimelineOptions;
  private raf = 0;
  private last = 0;
  private acc = 0;          // acumulador en frames GBC
  private tickCursor = -1;  // último tick emitido (-1 = aún no se emitió el tick 0)
  private done = false;

  constructor(profile: CinematicProfile, opts: BattleTimelineOptions) {
    this.profile = profile;
    this.opts = opts;
  }

  get tick(): number {
    return Math.max(0, Math.min(this.tickCursor, this.profile.totalTicks));
  }

  get progress(): number {
    return this.profile.totalTicks > 0 ? this.tick / this.profile.totalTicks : 1;
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

  /** True si el reloj está parado a mitad de secuencia (pausa manual). */
  get paused(): boolean {
    return this.raf === 0 && !this.done;
  }

  pause(): void {
    if (this.done) return;
    this.cancel();
  }

  resume(): void {
    if (this.done || this.raf) return;
    this.start();
  }

  /** Salta a un tick concreto (depurador frame a frame). */
  seek(tick: number): void {
    const target = Math.max(0, Math.min(tick, this.profile.totalTicks));
    // re-emitir todos los eventos hasta el tick objetivo (reproducible)
    for (const track of this.profile.tracks) {
      if (track.tick > this.tickCursor && track.tick <= target) {
        this.opts.onEvent({ type: track.event.type, tick: track.tick, payload: track.event.payload });
      }
    }
    this.tickCursor = target;
    this.acc = target;
    if (target >= this.profile.totalTicks) this.finish();
  }

  private tickLoop = (now: number): void => {
    if (this.done) return;
    const delta = ((now - this.last) / 1000) * GBC_FPS;
    this.last = now;
    this.acc += delta;

    const targetTick = Math.min(Math.floor(this.acc), this.profile.totalTicks);
    // emitir los tracks cuyo tick cae en (tickCursor, targetTick]
    while (this.tickCursor < targetTick) {
      this.tickCursor += 1;
      const at = this.tickCursor;
      for (const track of this.profile.tracks) {
        if (track.tick === at) {
          this.opts.onEvent({ type: track.event.type, tick: at, payload: track.event.payload });
        }
      }
    }

    // Sincronizar la animación de sprites al mismo tick (reloj único).
    this.opts.onTick?.(targetTick);

    if (this.tickCursor >= this.profile.totalTicks) {
      this.finish();
      return;
    }
    this.raf = requestAnimationFrame(this.tickLoop);
  };

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cancel();
    this.opts.onEvent({ type: 'COMPLETE', tick: this.profile.totalTicks });
    this.opts.onComplete();
  }
}

// ── Helpers de construcción ────────────────────────────────────────────────

export function track(tick: number, event: CinematicEventType, payload?: unknown): CinematicTrack {
  return { tick, event: { type: event, payload } };
}

export function buildProfile(
  id: string,
  presentation: CinematicProfilePresentation,
  tracks: CinematicTrack[],
): CinematicProfile {
  const totalTicks = Math.max(0, ...tracks.map(t => t.tick));
  return { id, presentation, totalTicks, tracks };
}

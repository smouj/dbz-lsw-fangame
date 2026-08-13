// ═══════════════════════════════════════════════════════════
// DBZ LSW — ImpactSystem (hitstop + flash + shake) determinista
// ═══════════════════════════════════════════════════════════
// Todo efecto de impacto es f(tick GBC absoluto − tick de impacto): sin
// timers, sin estado mutable que derive. El mismo HIT_FRAME activa:
//   · hitstop (el reloj de los luchadores se congela unos ticks)
//   · flash   (tinte blanco que decae)
//   · shake   (desplazamiento de cámara que decae)
// Reproducir la misma secuencia de ticks ⇒ la MISMA imagen en pantalla.

export interface ImpactSnapshot {
  /** true si el reloj de los luchadores está congelado en este tick. */
  hitstop: boolean;
  /** 0..1 intensidad de flash (tinte blanco del defensor). */
  flash: number;
  /** offset de cámara {x,y} por sacudida (px lógicos). */
  shakeX: number;
  shakeY: number;
}

export class ImpactSystem {
  private impactTick = -1;
  private hitstopTicks = 0;
  private flashTicks = 0;
  private shakeTicks = 0;
  private shakeMag = 0;

  /**
   * Registra un impacto en el tick absoluto `tick`.
   * @param hitstop frames de congelación (peso del golpe)
   * @param flash   frames de tinte blanco
   * @param shake   frames de sacudida
   * @param mag     amplitud de sacudida (0..1)
   */
  impact(tick: number, opts: { hitstop?: number; flash?: number; shake?: number; mag?: number } = {}): void {
    this.impactTick = tick;
    this.hitstopTicks = opts.hitstop ?? 2;
    this.flashTicks = opts.flash ?? 4;
    this.shakeTicks = opts.shake ?? 6;
    this.shakeMag = opts.mag ?? 0.35;
  }

  /** Añade sacudida de cámara (CAMERA) sin tocar hitstop/flash. */
  shake(tick: number, mag: number): void {
    this.impactTick = tick;
    this.shakeTicks = Math.max(this.shakeTicks, 6);
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  /** true si `tick` cae dentro de la ventana de hitstop. */
  isHitstop(tick: number): boolean {
    if (this.impactTick < 0) return false;
    const dt = tick - this.impactTick;
    return dt >= 0 && dt < this.hitstopTicks;
  }

  /** Snapshot de efectos para el tick absoluto `tick`. */
  snapshot(tick: number): ImpactSnapshot {
    if (this.impactTick < 0) return { hitstop: false, flash: 0, shakeX: 0, shakeY: 0 };
    const dt = tick - this.impactTick;
    if (dt < 0) return { hitstop: false, flash: 0, shakeX: 0, shakeY: 0 };

    // flash: 1 → 0 lineal en flashTicks
    const flash = dt < this.flashTicks ? 1 - dt / this.flashTicks : 0;
    // hitstop: [0, hitstopTicks)
    const hitstop = dt < this.hitstopTicks;

    // shake: onda senoidal amortiguada en shakeTicks
    let shakeX = 0;
    let shakeY = 0;
    if (dt < this.shakeTicks) {
      const decay = 1 - dt / this.shakeTicks;
      const amp = this.shakeMag * decay;
      const phase = dt * 1.7;
      shakeX = Math.sin(phase) * amp;
      shakeY = Math.cos(phase * 1.3) * amp * 0.6;
    }

    return { hitstop, flash, shakeX, shakeY };
  }

  /** Vuelve al estado inicial (para replay determinista). */
  reset(): void {
    this.impactTick = -1;
    this.hitstopTicks = 0;
    this.flashTicks = 0;
    this.shakeTicks = 0;
    this.shakeMag = 0;
  }
}

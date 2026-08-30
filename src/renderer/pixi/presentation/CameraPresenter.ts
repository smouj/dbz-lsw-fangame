// ═══════════════════════════════════════════════════════════
// DBZ LSW — CameraPresenter (autoridad ÚNICA de cámara/pantalla)
// ═══════════════════════════════════════════════════════════
// Centraliza TODA modificación visual de pantalla: scroll, pan,
// shake, path, restore. Nada fuera de CameraPresenter puede
// mutar la posición del world container.
//
// Modelo de estado visual:
//   finalScreenX = baseSceneX + romScreenOffsetX + transientOffsetX
//   finalScreenY = baseSceneY + romScreenOffsetY + transientOffsetY
//
// No acumular error frame a frame. Todo calculable desde estado/cue/tick.
//
// Consumes:
//   SCREEN_MOTION  $0E — dxPerTick * elapsed, discrete per tick
//   SCREEN_RESTORE $0F — disables STAT/HBlank cinematic viewport
//   SCREEN_PATH    $11 — single fixed ROM path (no pathId family)
//   ImpactSystem shake — transient overlay (sine decay)
//
// PROHIBIDO mantener en otro sitio:
//   container.x += ...
//   container.y += ...
//   CSS transform
//   setTimeout camera
//   requestAnimationFrame-based camera completion
// ═══════════════════════════════════════════════════════════

import { screenPathOffsetAt, SCREEN_PATH_STEPS } from '../../../battle/romScreenPath';

export interface CameraState {
  /** Base scene origin X (FIELD=0, ACTION=0 by default). */
  baseSceneX: number;
  /** Base scene origin Y. */
  baseSceneY: number;
  /** ROM screen motion offset X (from SCREEN_MOTION $0E). */
  romScreenOffsetX: number;
  /** ROM screen motion offset Y. */
  romScreenOffsetY: number;
  /** Transient offset X (shake from ImpactSystem). */
  transientOffsetX: number;
  /** Transient offset Y (shake from ImpactSystem). */
  transientOffsetY: number;
  /** Whether a screen motion is active. */
  screenMotionActive: boolean;
  /** Whether a screen path is active. */
  screenPathActive: boolean;
  /** Whether the C5 STAT/HBlank cinematic viewport is enabled. */
  cinematicViewportEnabled: boolean;
}

export interface CameraSnapshot {
  /** Final computed screen X position. */
  screenX: number;
  /** Final computed screen Y position. */
  screenY: number;
  /** Component breakdown for diagnostics. */
  components: {
    baseSceneX: number;
    baseSceneY: number;
    romScreenOffsetX: number;
    romScreenOffsetY: number;
    transientOffsetX: number;
    transientOffsetY: number;
  };
  /** Active motion state. */
  screenMotionActive: boolean;
  screenPathActive: boolean;
  cinematicViewportEnabled: boolean;
}

export class CameraPresenter {
  // ── Base scene position (set when scene changes) ──
  private baseSceneX = 0;
  private baseSceneY = 0;

  // ── ROM screen motion (SCREEN_MOTION $0E) ──
  private screenMotionActive = false;
  private screenMotionStartTick = 0;
  private screenMotionDxPerTick = 0;
  private screenMotionDyPerTick = 0;
  private screenMotionDuration = 0;
  private screenMotionRestore = false;
  private screenMotionDone = false;

  // ── Screen path (SCREEN_PATH $11) ──
  private screenPathActive = false;
  private screenPathStartTick = 0;
  private screenPathDone = false;
  private screenPathSide: 'SIDE_1' | 'SIDE_2' = 'SIDE_1';

  // ── Computed ROM offsets (updated per tick) ──
  private romScreenOffsetX = 0;
  private romScreenOffsetY = 0;

  // ── Transient offsets (set from ImpactSystem) ──
  private transientOffsetX = 0;
  private transientOffsetY = 0;

  // ── C5 cinematic viewport (separate from whole-world camera) ──
  // Formula outside viewport: SCY=low(C407), SCX=low(C409)
  // Formula inside viewport:  SCY=low(C407)+C405, SCX=low(C409)+C406
  // $0F disables STAT/HBlank viewport but preserves C405/C406.
  private beamBaseScx: number | null = null;
  private beamBaseScy: number | null = null;
  private beamFrameDeltaScx = 0; // $C406 (side-dependent)
  private beamFrameDeltaScy = 0; // $C405
  private beamSide: 'SIDE_1' | 'SIDE_2' | null = null;
  private cinematicViewportEnabled = false;

  /**
   * Set base scene position. Called when scene changes (FIELD→ACTION, etc.).
   * Default: both 0 (no base offset for any scene currently).
   */
  setBaseScene(x: number, y: number): void {
    this.baseSceneX = x;
    this.baseSceneY = y;
  }

  /**
   * SCREEN_MOTION $0E — progressive screen displacement.
   * dxPerTick * elapsed ticks, discrete per tick, no easing.
   * If restore=true, offsets are cleared when motion completes.
   */
  applyScreenMotion(tick: number, dxPerTick: number, durationTicks: number, restore: boolean): void {
    this.screenMotionActive = true;
    this.screenMotionStartTick = tick;
    this.screenMotionDxPerTick = dxPerTick;
    this.screenMotionDyPerTick = 0; // ROM only provides dx for now
    this.screenMotionDuration = durationTicks;
    this.screenMotionRestore = restore;
    this.screenMotionDone = false;
  }

  /**
   * SCREEN_RESTORE $0F — restore screen visually to base position.
   * Disables STAT/HBlank viewport, but preserves C405/C406 cinematic deltas.
   */
  applyScreenRestore(): void {
    this.romScreenOffsetX = 0;
    this.romScreenOffsetY = 0;
    this.screenMotionActive = false;
    this.screenMotionDone = false;
    this.screenPathActive = false;
    this.cinematicViewportEnabled = false;
  }

  /**
   * SCREEN_PATH $11 — ejecuta la trayectoria ROM fija de 18 pasos (Bank7E:$73C5).
   * El path ya NO es TRACE_ONLY: la tabla es estática (ver romScreenPath.ts).
   *
   * El X se refleja por lado: SIDE_1 → negativo, SIDE_2 → positivo (net ΔSCX ±156).
   * La Y no se refleja (net ΔSCY -42).
   *
   * ⚠ Coordenadas en espacio GBC (sin ×2): mismo convenio que SCREEN_MOTION. La
   * reconciliación de escala (ACTION ×2 vs luchadores ×3) sigue pendiente aparte.
   */
  applyScreenPath(tick: number, durationTicks: number, side: 'SIDE_1' | 'SIDE_2' = 'SIDE_1'): void {
    this.screenPathActive = true;
    this.screenPathStartTick = tick;
    this.screenPathDone = false;
    this.screenPathSide = side;
  }

  /**
   * Set transient offsets from ImpactSystem (shake).
   * Called each tick from sync(), AFTER ImpactSystem.snapshot().
   */
  setTransientOffset(x: number, y: number): void {
    this.transientOffsetX = x;
    this.transientOffsetY = y;
  }

  // ── Beam BG scroll (separate domain from world camera) ──

  /**
   * Set C5 base scroll values ($C407/$C409).
   * These are base camera/BG scroll, not beam-exclusive state.
   */
  setBeamBaseScroll(baseScx: number | null, baseScy: number | null): void {
    this.beamBaseScx = baseScx;
    this.beamBaseScy = baseScy;
  }

  /**
   * Set beam frame deltas ($C406/$C405) for the current animation frame.
   * $C406 is side-dependent: SIDE_1 vs SIDE_2 have different SCX offsets.
   * $C405 is the SCY delta per frame.
   */
  setBeamFrameDeltas(deltaScx: number, deltaScy: number, side: 'SIDE_1' | 'SIDE_2'): void {
    this.beamFrameDeltaScx = deltaScx;
    this.beamFrameDeltaScy = deltaScy;
    this.beamSide = side;
    this.cinematicViewportEnabled = true;
  }

  /**
   * Clear cinematic viewport state (hard reset after FX window is fully done).
   */
  clearBeamBg(): void {
    this.beamBaseScx = null;
    this.beamBaseScy = null;
    this.beamFrameDeltaScx = 0;
    this.beamFrameDeltaScy = 0;
    this.beamSide = null;
    this.cinematicViewportEnabled = false;
  }

  /**
   * Compute C5 viewport SCX/SCY while STAT/HBlank viewport is enabled.
   * SCY = baseScrollY + cinematicDeltaY (C407 + C405)
   * SCX = baseScrollX + cinematicDeltaX (C409 + C406)
   */
  beamBgScroll(): { scx: number | null; scy: number | null } {
    if (!this.cinematicViewportEnabled || this.beamBaseScx == null || this.beamBaseScy == null) {
      return { scx: null, scy: null };
    }
    return {
      scx: this.beamBaseScx + this.beamFrameDeltaScx,
      scy: this.beamBaseScy + this.beamFrameDeltaScy,
    };
  }

  /**
   * Compute final screen position for the given tick.
   * finalScreenX = baseSceneX + romScreenOffsetX + transientOffsetX
   * finalScreenY = baseSceneY + romScreenOffsetY + transientOffsetY
   */
  compute(tick: number): CameraSnapshot {
    // Advance ROM screen motion if active
    if (this.screenMotionActive && !this.screenMotionDone) {
      const elapsed = tick - this.screenMotionStartTick;
      if (elapsed <= this.screenMotionDuration) {
        // Motion phase: discrete displacement
        this.romScreenOffsetX = this.screenMotionDxPerTick * elapsed;
        this.romScreenOffsetY = this.screenMotionDyPerTick * elapsed;
      } else {
        // Motion complete
        if (this.screenMotionRestore) {
          // Restore flag: offsets return to 0 after motion completes
          this.romScreenOffsetX = 0;
          this.romScreenOffsetY = 0;
        } else {
          // No restore: stay at final displacement
          this.romScreenOffsetX = this.screenMotionDxPerTick * this.screenMotionDuration;
          this.romScreenOffsetY = this.screenMotionDyPerTick * this.screenMotionDuration;
        }
        this.screenMotionDone = true;
        this.screenMotionActive = false;
      }
    }

    // Advance ROM screen path if active (SCREEN_PATH $11 — 18 fixed steps)
    if (this.screenPathActive && !this.screenPathDone) {
      const elapsed = tick - this.screenPathStartTick;
      const steps = Math.min(SCREEN_PATH_STEPS.length, Math.max(0, elapsed));
      const offset = screenPathOffsetAt(steps);
      this.romScreenOffsetY = offset.deltaY;
      // X reflejado por lado: SIDE_1 negativo, SIDE_2 positivo (ΔSCX ±156).
      this.romScreenOffsetX = this.screenPathSide === 'SIDE_1' ? offset.deltaX : -offset.deltaX;
      if (elapsed >= SCREEN_PATH_STEPS.length) {
        this.screenPathDone = true;
        this.screenPathActive = false;
      }
    }

    const screenX = this.baseSceneX + this.romScreenOffsetX + this.transientOffsetX;
    const screenY = this.baseSceneY + this.romScreenOffsetY + this.transientOffsetY;

    return {
      screenX,
      screenY,
      components: {
        baseSceneX: this.baseSceneX,
        baseSceneY: this.baseSceneY,
        romScreenOffsetX: this.romScreenOffsetX,
        romScreenOffsetY: this.romScreenOffsetY,
        transientOffsetX: this.transientOffsetX,
        transientOffsetY: this.transientOffsetY,
      },
      screenMotionActive: this.screenMotionActive,
      screenPathActive: this.screenPathActive,
      cinematicViewportEnabled: this.cinematicViewportEnabled,
    };
  }

  /**
   * Full reset for replay/cleanup.
   * Restores to base scene position with zero offsets.
   */
  reset(): void {
    this.romScreenOffsetX = 0;
    this.romScreenOffsetY = 0;
    this.transientOffsetX = 0;
    this.transientOffsetY = 0;
    this.screenMotionActive = false;
    this.screenMotionDone = false;
    this.screenMotionStartTick = 0;
    this.screenMotionDxPerTick = 0;
    this.screenMotionDyPerTick = 0;
    this.screenMotionDuration = 0;
    this.screenMotionRestore = false;
    this.screenPathActive = false;
    this.screenPathStartTick = 0;
    this.screenPathDone = false;
    this.screenPathSide = 'SIDE_1';
    this.beamBaseScx = null;
    this.beamBaseScy = null;
    this.beamFrameDeltaScx = 0;
    this.beamFrameDeltaScy = 0;
    this.beamSide = null;
    this.cinematicViewportEnabled = false;
  }

  /** Current state for diagnostics. */
  state(): CameraState {
    return {
      baseSceneX: this.baseSceneX,
      baseSceneY: this.baseSceneY,
      romScreenOffsetX: this.romScreenOffsetX,
      romScreenOffsetY: this.romScreenOffsetY,
      transientOffsetX: this.transientOffsetX,
      transientOffsetY: this.transientOffsetY,
      screenMotionActive: this.screenMotionActive,
      screenPathActive: this.screenPathActive,
      cinematicViewportEnabled: this.cinematicViewportEnabled,
    };
  }

  /** Cinematic viewport state for diagnostics (legacy method name kept for callers). */
  beamBgState(): {
    active: boolean;
    viewportEnabled: boolean;
    baseScx: number | null;
    baseScy: number | null;
    deltaScx: number;
    deltaScy: number;
    side: 'SIDE_1' | 'SIDE_2' | null;
    finalScx: number | null;
    finalScy: number | null;
  } {
    const scroll = this.beamBgScroll();
    return {
      active: this.cinematicViewportEnabled,
      viewportEnabled: this.cinematicViewportEnabled,
      baseScx: this.beamBaseScx,
      baseScy: this.beamBaseScy,
      deltaScx: this.beamFrameDeltaScx,
      deltaScy: this.beamFrameDeltaScy,
      side: this.beamSide,
      finalScx: scroll.scx,
      finalScy: scroll.scy,
    };
  }

  /** Inspect for diagnostic trace (tick-level observability). */
  inspect(tick: number): {
    tick: number;
    screenX: number;
    screenY: number;
    baseSceneX: number;
    baseSceneY: number;
    romOffsetX: number;
    romOffsetY: number;
    transientX: number;
    transientY: number;
    motionActive: boolean;
    pathActive: boolean;
    beamBgActive: boolean;
    cinematicViewportEnabled: boolean;
    beamBgScx: number | null;
    beamBgScy: number | null;
    beamSide: 'SIDE_1' | 'SIDE_2' | null;
  } {
    const snap = this.compute(tick);
    const beamScroll = this.beamBgScroll();
    return {
      tick,
      screenX: snap.screenX,
      screenY: snap.screenY,
      baseSceneX: snap.components.baseSceneX,
      baseSceneY: snap.components.baseSceneY,
      romOffsetX: snap.components.romScreenOffsetX,
      romOffsetY: snap.components.romScreenOffsetY,
      transientX: snap.components.transientOffsetX,
      transientY: snap.components.transientOffsetY,
      motionActive: snap.screenMotionActive,
      pathActive: snap.screenPathActive,
      beamBgActive: this.cinematicViewportEnabled,
      cinematicViewportEnabled: this.cinematicViewportEnabled,
      beamBgScx: beamScroll.scx,
      beamBgScy: beamScroll.scy,
      beamSide: this.beamSide,
    };
  }
}

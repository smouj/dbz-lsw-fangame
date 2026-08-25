// ═══════════════════════════════════════════════════════════════════════
// C1.0 — ProductionRomPresentationAdapter
// ═══════════════════════════════════════════════════════════════════════
// Frontera ÚNICA de presentación ROM: consume PresentationCue[] y produce
// consecuencias observables sobre el contrato BattlePresentation (Pixi) y,
// cuando el cue pertenece a la capa de display Support/Defense, sobre el
// RomDisplayPresenter.
//
// Propósito (directiva C1.0):
//   (a) puente quirúrgico HOY  →  (b) BattleRuntime.timeline → BattlePresenter
//       → este mismo adaptador → Pixi.  NO es un tercer pipeline permanente:
//       es el MISMO adaptador que (b) reutilizará.
//
// Reglas:
//   - NUNCA muta gameplay (HP/CC/phase/position/powerWindow/outcome).
//   - NUNCA convierte PresentationCue → CinematicEvent/CinematicProfile LEGACY.
//   - NUNCA inventa poses semánticas: los cues ROM de trazabilidad (macros,
//     waits, animation state) se REGISTRAN como consumidos, sin fabricar una
//     pose que la ROM no declara.
//   - Cada cue termina en un efecto observable (Pixi / display / registro) o en
//     un PENDING explícito — jamás un no-op silencioso.
//   - El proyectil/easing procedural usado por los puentes (FX_LOAD / motion)
//     es TEMPORAL y se sustituye por recursos ROM en (b). Se marca como BRIDGE.
//
// Puro respecto a Pixi: solo depende del interfaz BattlePresentation (tipo) y
// de RomDisplayPresenter (puro). Testable headless en Node.
// ═══════════════════════════════════════════════════════════════════════

import type { BattlePresentation, BattleScene } from './BattlePresentation';
import type { PresentationCue } from '../../../battle/engine/presentation/PresentationCue';
import type { RomDisplayPresenter } from '../../../battle/romDisplay/RomDisplayPresenter';

export type ProductionPresentationSource = 'ROM' | 'LEGACY' | 'NONE';

export interface ProductionRomPresentationStats {
  source: ProductionPresentationSource;
  /** Todos los cues entregados al adaptador. */
  cuesTotal: number;
  /** Cues procesados a un destino concreto (visible/display/registro). */
  cuesConsumed: number;
  /** Cues que cambiaron Pixi (scene/pose/proyectil/impact/motion/fx). */
  visibleEffects: number;
  /** Cues enrutados al RomDisplayPresenter (Support/Defense). */
  displayEffects: number;
  /** Cues de trazabilidad registrados (macros/waits/audio/screen…). */
  traceCues: number;
  /** Cues PENDING o no reconocidos. */
  pendingCues: number;
  pendingReasons: string[];
  sceneChanges: number;
  /** Cues FIGHTER_MOTION registrados (trazabilidad — no easeOutCubic). */
  motions: number;
  /** Cues FX_LOAD registrados (trazabilidad — no proyectil procedural). */
  fxLoads: number;
  /** Ventanas ROM FX normalizadas enviadas a RomDisplayPresenter. */
  fxWindows: number;
  impacts: number;
  physicalFrames: number;
  physicalFrameSources: Record<string, number>;
  lastPhysicalFrame: {
    formId: string;
    resource: number;
    sequence: number;
    frameIndex: number;
    physicalId: string | null;
    source: string;
    file: string | null;
    offsetX: number | null;
    offsetY: number | null;
    durationTicks: number | null;
  } | null;
}

const SCENE_MODE_TO_BATTLE_SCENE: Record<string, BattleScene> = {
  OVERVIEW: 'FIELD',
  PLAYER_ACTION: 'ACTION_SOLO',
  ENEMY_ACTION: 'ACTION_SOLO',
  SPECIAL_ACTION: 'ACTION_SOLO',
  ACTION_DUEL: 'ACTION_DUEL',
  DEFENDER_ACTION: 'DEFENDER_ACTION',
};

/** Cues de display Support/Defense → RomDisplayPresenter (capa V7.8). */
const DISPLAY_CUES = new Set<PresentationCue['type']>([
  'SUPPORT_VISUAL_LOAD',
  'PALETTE_LOAD',
  'BG_ASSEMBLY',
  'DISPLAY_COMPOSE',
  'SUPPORT_MACRO',
  'DISPLAY_CLEAR',
  'DEFENSE_FX',
  'SUPPORT_FX',
  'ROM_FX_WINDOW',
]);

/** Cues de trazabilidad ROM (macros/waits/animation/screen/audio…). */
const TRACE_CUES = new Set<PresentationCue['type']>([
  'MACRO',
  'ROM_MACRO',
  'PALETTE_TRANSITION',
  'ANIMATION_START',
  'ANIMATION_STATE',
  'WAIT_ANIMATION',
  'WAIT_ANIMATION_FRAME',
  'ACTION_OBJECT_POSITION',
  'ACTION_OBJECT_MOTION',
  'APPLY_FRAME_DELTA',
  'FX_AUX',
  'SCENE_CONFIGURE',
  'SCREEN_MOTION',
  'SCREEN_RESTORE',
  'SCREEN_PATH',
  'ROM_SFX',
  'ROM_AUDIO_SCRIPT',
  'ROM_WAIT',
  'ACTION_OBJECT_BIND',
  'ACTION_OBJECT_UNBIND',
  'ACTION_OBJECT_DRAW_ORDER',
  'ACTION_OBJECT_FRAME',
  'ACTION_OBJECT_FRAME_OFFSET',
  'ACTION_OBJECT_STOP',
  'MULTI_ACTOR_SYNC',
  'FIGHTER_VISIBILITY',
  'FIGHTER_POSITION',
  'AURA',
  'EFFECT',
  'HUD',
  'AUDIO',
]);

export class ProductionRomPresentationAdapter {
  private readonly pres: BattlePresentation;
  private readonly romDisplay: RomDisplayPresenter | null;
  private stats: ProductionRomPresentationStats;

  constructor(pres: BattlePresentation, romDisplay?: RomDisplayPresenter) {
    this.pres = pres;
    this.romDisplay = romDisplay ?? null;
    this.stats = this.blank('NONE');
  }

  private blank(source: ProductionPresentationSource): ProductionRomPresentationStats {
    return {
      source,
      cuesTotal: 0,
      cuesConsumed: 0,
      visibleEffects: 0,
      displayEffects: 0,
      traceCues: 0,
      pendingCues: 0,
      pendingReasons: [],
      sceneChanges: 0,
      motions: 0,
      fxLoads: 0,
      fxWindows: 0,
      impacts: 0,
      physicalFrames: 0,
      physicalFrameSources: {},
      lastPhysicalFrame: null,
    };
  }

  reset(source: ProductionPresentationSource = 'NONE'): void {
    this.stats = this.blank(source);
  }

  get snapshot(): ProductionRomPresentationStats {
    return { ...this.stats, pendingReasons: [...this.stats.pendingReasons] };
  }

  get cuesConsumed(): number {
    return this.stats.cuesConsumed;
  }

  /** Sincroniza el reloj GBC de la presentación (frame = f(tick, poseStartTick)). */
  sync(tick: number): void {
    this.pres.sync(tick);
  }

  /** Consume un cue ROM → efecto observable. Devuelve true si cambió Pixi. */
  consume(cue: PresentationCue): boolean {
    this.stats.cuesTotal++;
    let visible = false;

    switch (cue.type) {
      // ── SEMÁNTICOS (buildTimeline: MOVE/GUARD + futuros cutovers) ──
      case 'SCENE': {
        this.pres.setScene(SCENE_MODE_TO_BATTLE_SCENE[cue.mode] ?? 'ACTION_DUEL');
        this.stats.sceneChanges++;
        visible = true;
        break;
      }
      case 'FIGHTER_POSE': {
        if (cue.role === 'ACTOR') this.pres.setActorPose(cue.pose);
        else this.pres.setTargetPose(cue.pose);
        visible = true;
        break;
      }
      case 'PROJECTILE': {
        if (cue.action === 'spawn') this.pres.spawnProjectile(cue.kind);
        else if (cue.action === 'travel') this.pres.setProjectileProgress(0.5);
        else this.pres.setProjectileProgress(1);
        visible = true;
        break;
      }
      case 'CAMERA': {
        const shake = cue.action === 'IMPACT' ? 0.4 : cue.action === 'FLASH_WHITE' ? 0.15 : 0.2;
        this.pres.camera(shake);
        visible = true;
        break;
      }
      case 'IMPACT': {
        this.pres.impact();
        this.stats.impacts++;
        visible = true;
        break;
      }

      // ── ROM VM — efectos visibles no-semánticos ──
      case 'SCENE_LOAD': {
        this.pres.setScene(cue.mode === 'RESTORE_TACTICAL' ? 'FIELD' : 'ACTION_SOLO');
        this.stats.sceneChanges++;
        visible = true;
        break;
      }
      case 'FIGHTER_MOTION': {
        // ROM motion discreto (segments dx/tick). NO moveActor/easeOutCubic (ban).
        // El movimiento discreto se aplicará en (b); aquí se REGISTRA como
        // trazabilidad (no se inventa easing).
        this.stats.motions++;
        this.stats.traceCues++;
        break;
      }
      case 'FX_LOAD': {
        // ROM FX resource (p.ej. $05 Kamehameha). NO proyectil procedural
        // (ban: ROM FX exists). El sprite ROM se montará en (b); aquí se
        // REGISTRA el resource (trazabilidad).
        this.stats.fxLoads++;
        this.stats.traceCues++;
        break;
      }
      case 'ROM_RESULT_BRANCH': {
        this.pres.impact();
        this.stats.impacts++;
        visible = true;
        break;
      }
      case 'ROM_PHYSICAL_FRAME': {
        this.stats.physicalFrames++;
        this.stats.physicalFrameSources[cue.source] = (this.stats.physicalFrameSources[cue.source] ?? 0) + 1;
        this.stats.lastPhysicalFrame = {
          formId: cue.formId,
          resource: cue.resource,
          sequence: cue.sequence,
          frameIndex: cue.frameIndex,
          physicalId: cue.physicalId,
          source: cue.source,
          file: cue.file,
          offsetX: cue.offsetX,
          offsetY: cue.offsetY,
          durationTicks: cue.durationTicks,
        };
        this.stats.traceCues++;
        break;
      }

      default: {
        if (DISPLAY_CUES.has(cue.type)) {
          if (this.romDisplay) {
            this.romDisplay.consume(cue);
            this.stats.displayEffects++;
            if (cue.type === 'ROM_FX_WINDOW') this.stats.fxWindows++;
          }
          break;
        }
        if (TRACE_CUES.has(cue.type)) {
          // Consumido como trazabilidad: no inventa poses.
          this.stats.traceCues++;
          break;
        }
        if (cue.type === 'ROM_PENDING') {
          this.stats.pendingCues++;
          this.stats.pendingReasons.push(cue.reason);
          break;
        }
        // Nunca no-op silencioso.
        this.stats.pendingCues++;
        this.stats.pendingReasons.push(`unhandled cue ${(cue as PresentationCue).type}`);
        break;
      }
    }

    this.stats.cuesConsumed++;
    if (visible) this.stats.visibleEffects++;
    return visible;
  }
}

export { SCENE_MODE_TO_BATTLE_SCENE };

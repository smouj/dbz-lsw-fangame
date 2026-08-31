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
  /** Cues DEFENSE_FX con pose guard/evade aplicada al defensor. */
  defenseFx: number;
  /** Cues FX_LOAD registrados (trazabilidad — no proyectil procedural). */
  fxLoads: number;
  /** P0 CAMERA PRESENTER — cues SCREEN_MOTION consumidos. */
  screenMotions: number;
  /** P0 CAMERA PRESENTER — cues SCREEN_RESTORE consumidos. */
  screenRestores: number;
  /** P0 CAMERA PRESENTER — cues SCREEN_PATH consumidos. */
  screenPaths: number;
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
  /** Per-slot ROM sequence tracks (independent for Purple Comet / P.Comet Z / multi-actor specials) */
  romSequenceBySlot: Array<{ resource: number; sequence: number } | null>;
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
  // P0 CAMERA PRESENTER: SCREEN_MOTION/RESTORE/PATH now consumed (moved below)
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
      defenseFx: 0,
      fxLoads: 0,
      screenMotions: 0,
      screenRestores: 0,
      screenPaths: 0,
      fxWindows: 0,
      impacts: 0,
      physicalFrames: 0,
      physicalFrameSources: {},
      lastPhysicalFrame: null,
      romSequenceBySlot: [null, null],
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
        // P0 SCENE-CAMERA — Consume ROM motion discrete segments.
        // CHARA_EXIT/ENTRY, RUSH, BEAM_SETUP son motions del ACTOR (el miembro
        // activo sale/entra o rushea). positionAtTick(segments, elapsed) reemplaza
        // el easing; los segmentos discretos no se aplanan a dxPerTick uniforme.
        const applyMotion = (this.pres as Partial<Pick<BattlePresentation, 'moveActorByRomMotion'>>).moveActorByRomMotion;
        if (typeof applyMotion === 'function') {
          applyMotion.call(this.pres, cue.deltaPx, cue.durationTicks, cue.holdTicks, cue.segments);
          visible = true;
        }
        this.stats.motions++;
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
      // ── P0 CAMERA PRESENTER — Screen motion/restore/path ──
      case 'SCREEN_MOTION': {
        // SCREEN_MOTION $0E: progressive screen displacement.
        // dxPerTick * elapsed, discrete per tick, no easing.
        // If restore=true, CameraPresenter clears offset when motion completes.
        const applyScreenMotion = (this.pres as Partial<Pick<BattlePresentation, 'applyScreenMotion'>>).applyScreenMotion;
        if (typeof applyScreenMotion === 'function') {
          applyScreenMotion.call(this.pres, cue.dxPerTick, cue.durationTicks, cue.restore);
          visible = true;
        }
        this.stats.screenMotions++;
        break;
      }
      case 'SCREEN_RESTORE': {
        // SCREEN_RESTORE $0F: visually returns to base by disabling STAT/HBlank viewport.
        // It does not clear C405/C406 cinematic deltas.
        const applyScreenRestore = (this.pres as Partial<Pick<BattlePresentation, 'applyScreenRestore'>>).applyScreenRestore;
        if (typeof applyScreenRestore === 'function') {
          applyScreenRestore.call(this.pres);
          visible = true;
        }
        this.stats.screenRestores++;
        break;
      }
      case 'SCREEN_PATH': {
        // SCREEN_PATH $11: single fixed ROM path (Bank7E:$73C5), no pathId family.
        const applyScreenPath = (this.pres as Partial<Pick<BattlePresentation, 'applyScreenPath'>>).applyScreenPath;
        if (typeof applyScreenPath === 'function') {
          applyScreenPath.call(this.pres, cue.durationTicks);
          visible = true;
        }
        this.stats.screenPaths++;
        break;
      }
      case 'ROM_RESULT_BRANCH': {
        this.pres.impact();
        this.stats.impacts++;
        visible = true;
        break;
      }
      case 'DEFENSE_FX': {
        // ROM defense: el defensor muestra la pose de guardia (slot8 preload).
        // Antes este cue se registraba como COMPOSED sin efecto visible — el
        // personaje se quedaba en idle. La pose es f(result, side):
        //   AVOIDED → evade · NULLIFIED/ATTENUATED/ABSORBED → guard ·
        //   COMMAND_CANCELLED → idle.
        const defensePose =
          cue.result === 'AVOIDED' ? 'evade'
          : cue.result === 'COMMAND_CANCELLED' ? 'idle'
          : 'guard';
        if (cue.side === 'enemy') this.pres.setTargetPose(defensePose);
        else this.pres.setActorPose(defensePose);
        this.stats.defenseFx++;
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
        // Maintain independent ROM sequence track per slot (Purple Comet / P.Comet Z requirement)
        if (cue.slot === 0 || cue.slot === 1) {
          this.stats.romSequenceBySlot[cue.slot] = {
            resource: cue.resource,
            sequence: cue.sequence,
          };
        }
        // Wire ROM_PHYSICAL_FRAME to FighterActor per slot (direct physical frame consumption)
        const setRomSeq = (this.pres as any).setRomSequenceForSlot;
        if (typeof setRomSeq === 'function') {
          setRomSeq.call(this.pres, cue.slot, cue.resource, cue.sequence);
        }

        // Direct texture drive from ROM_PHYSICAL_FRAME (to match ROM exactly, bypassing pose fallback)
        if (cue.visualFrameId != null || cue.file) {
          const setPhysical = (this.pres as any).setPhysicalFrameForSlot;
          if (typeof setPhysical === 'function') {
            setPhysical.call(this.pres, cue.slot, cue);
          }
        }
        // P0 ROM FIDELITY: Apply ROM-native offsets from the SAME frame record.
        // Never get timing from ROM and offsets from manifest.
        // The actor pose is set by FIGHTER_POSE cue; offsets come from ROM_PHYSICAL_FRAME.
        if (cue.offsetX != null || cue.offsetY != null) {
          const applyFrameOffset = (this.pres as Partial<Pick<BattlePresentation, 'applyFrameOffset'>>).applyFrameOffset;
          if (typeof applyFrameOffset === 'function') {
            // P7 — NO dropear cue.slot: aplicar el offset al actor correcto.
            // slot 0 = actor, slot 1 = target (antes se aplicaba siempre al izquierdo).
            applyFrameOffset.call(this.pres, cue.offsetX ?? 0, cue.offsetY ?? 0, cue.slot);
            visible = true;
          } else {
            this.stats.pendingCues++;
            this.stats.pendingReasons.push('BattlePresentation.applyFrameOffset missing');
          }
        }
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

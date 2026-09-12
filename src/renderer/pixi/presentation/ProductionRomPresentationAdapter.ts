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
import { sceneLoadEffect } from '../../../battle/presentation/actionBoundary';
import { isExitResidualCue, type ActionExitBoundary } from '../../../battle/presentation/actionExitBoundary';
import type { ActionObjectBinding, ActionObjectSlot, ActionObjectBindingObservation } from '../../../battle/engine/presentation/ActionObjectRuntime';

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
  /** P0.4R-B5 — fases de preparación TACTICAL→ACTION (VRAM $8E00 + macros). */
  scenePrepares: number;
  /** P0.4R-B6B — tick ROM en el que el contrato declara FIELD_READY (null si no declarado). */
  exitFieldReadyTick: number | null;
  /** P0.4R-B6B — tick en el que el adapter aplicó realmente el restore a FIELD. */
  exitFieldRestoredTick: number | null;
  /** P0.4R-B6B — cues físicos/FX observados DESPUÉS del restore (debe ser 0). */
  exitResidualCues: number;
  exitResidualTypes: string[];
  /** P0.4R-B6B/B6C — releases de display ROM ordenados por el contrato. */
  exitDisplayReleases: number;
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
  // P0.4R — la transición de paleta ROM es display FÍSICO (no trace): gobierna
  // los colores reales por paso del worker $07F4.
  'PALETTE_TRANSITION',
]);

/** Cues de trazabilidad ROM (macros/waits/animation/screen/audio…). */
const TRACE_CUES = new Set<PresentationCue['type']>([
  'MACRO',
  'ROM_MACRO',
  'ANIMATION_STATE',
  'WAIT_ANIMATION',
  'WAIT_ANIMATION_FRAME',
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
  'MULTI_ACTOR_SYNC',
  'AURA',
  'EFFECT',
  'HUD',
  'AUDIO',
]);

export class ProductionRomPresentationAdapter {
  private readonly pres: BattlePresentation;
  private readonly romDisplay: RomDisplayPresenter | null;
  private stats: ProductionRomPresentationStats;
  private currentScene: BattleScene = 'FIELD';
  /** P0.4R-B6B — contrato de salida enlazado (autoridad del teardown). */
  private exitBoundary: ActionExitBoundary | null = null;

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
      scenePrepares: 0,
      exitFieldReadyTick: null,
      exitFieldRestoredTick: null,
      exitResidualCues: 0,
      exitResidualTypes: [],
      exitDisplayReleases: 0,
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
    this.currentScene = 'FIELD';
  }

  get snapshot(): ProductionRomPresentationStats {
    return { ...this.stats, pendingReasons: [...this.stats.pendingReasons] };
  }

  /**
   * B7B2 — observabilidad del binding físico de slots en Production.
   * Espejo de la autoridad única (`ActionObjectRuntime`), no una métrica propia.
   */
  get actionObjectBinding(): ActionObjectBindingObservation | null {
    const fn = (this.pres as Partial<Pick<BattlePresentation, 'actionObjectBindingObservation'>>).actionObjectBindingObservation;
    return typeof fn === 'function' ? fn.call(this.pres) ?? null : null;
  }

  get cuesConsumed(): number {
    return this.stats.cuesConsumed;
  }

  /** Sincroniza el reloj GBC de la presentación (frame = f(tick, poseStartTick)). */
  sync(tick: number): void {
    this.pres.sync(tick);
    // P0.4R-B6B — el restore a FIELD lo manda el CONTRATO: se aplica al alcanzar
    // fieldReadyTick, sin depender de que exista un cue SCENE_LOAD RESTORE.
    const ready = this.exitBoundary?.fieldReadyTick ?? null;
    if (ready !== null && tick >= ready) this.applyFieldRestore(ready);
  }

  /**
   * Aplica el restore a FIELD ordenado por el contrato. Idempotente: sólo la
   * primera vez. Gobierna también el release del display ROM cuando el contrato
   * detecta display aún compuesto sin DISPLAY_CLEAR declarado (Support $00/$02).
   */
  private applyFieldRestore(tick: number): void {
    if (this.stats.exitFieldRestoredTick !== null) return;
    this.stats.exitFieldRestoredTick = tick;
    this.currentScene = 'FIELD';
    this.pres.setScene('FIELD');
    // B7B2 — FIELD restore limpia el binding: ningún slot conserva rol/lado.
    const clearBinding = (this.pres as Partial<Pick<BattlePresentation, 'clearActionObjectBinding'>>).clearActionObjectBinding;
    if (typeof clearBinding === 'function') clearBinding.call(this.pres);
    if (this.exitBoundary?.displayResidualAtField) {
      const release = (this.pres as Partial<Pick<BattlePresentation, 'releaseRomDisplayForField'>>).releaseRomDisplayForField;
      if (typeof release === 'function') {
        release.call(this.pres);
        this.stats.exitDisplayReleases++;
      } else {
        this.stats.pendingCues++;
        this.stats.pendingReasons.push('BattlePresentation.releaseRomDisplayForField missing');
      }
    }
  }

  /**
   * P0.4R-B6B — enlaza el contrato de salida. El adapter NO decide el teardown
   * por su cuenta: toma `fieldReadyTick` del contrato y verifica que su propio
   * restore a FIELD coincida. Los desvíos se registran, nunca se silencian.
   */
  bindExitBoundary(boundary: ActionExitBoundary): void {
    this.exitBoundary = boundary;
    this.stats.exitFieldReadyTick = boundary.fieldReadyTick;
  }

  /** Consume un cue ROM → efecto observable. Devuelve true si cambió Pixi. */
  consume(cue: PresentationCue): boolean {
    this.stats.cuesTotal++;
    let visible = false;

    // P0.4R-B6B — residuo en runtime: cualquier cue físico/FX que llegue DESPUÉS
    // del restore a FIELD significa que el teardown no limpió. Debe ser 0.
    if (this.stats.exitFieldRestoredTick !== null && cue.tick > this.stats.exitFieldRestoredTick && isExitResidualCue(cue.type)) {
      this.stats.exitResidualCues++;
      if (!this.stats.exitResidualTypes.includes(cue.type)) this.stats.exitResidualTypes.push(cue.type);
    }

    switch (cue.type) {
      // ── SEMÁNTICOS (buildTimeline: MOVE/GUARD + futuros cutovers) ──
      case 'SCENE': {
        this.currentScene = SCENE_MODE_TO_BATTLE_SCENE[cue.mode] ?? 'ACTION_DUEL';
        this.pres.setScene(this.currentScene, cue.background);
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
      case 'FIGHTER_VISIBILITY': {
        this.pres.setFighterVisibility(cue.role, cue.visible);
        // Static ROM films begin with an attacker-only shot. The verified
        // defender entrance cue is the scene boundary: once the target becomes
        // visible, the same action background is composed as a duel. No card
        // type or React state decides this transition.
        if (cue.role === 'TARGET' && cue.visible && this.currentScene === 'ACTION_SOLO') {
          this.currentScene = 'ACTION_DUEL';
          this.pres.setScene(this.currentScene);
          this.stats.sceneChanges++;
        }
        visible = true;
        break;
      }
      case 'ANIMATION_START': {
        // START_ANIMATION ($01) is a VM state transition, but it also carries
        // the physical sequence selected for this actor. Once the compiler has
        // proven that selector, route it through the same slot bridge as the
        // frame resolver. This keeps the first visible frame owned by ROM
        // instead of waiting for a later synthetic pose/frame cue.
        const setRomSeq = (this.pres as Partial<Pick<BattlePresentation, 'setRomSequenceForSlot'>>)
          .setRomSequenceForSlot;
        if (cue.resource != null && cue.sequence != null && typeof setRomSeq === 'function') {
          setRomSeq.call(this.pres, cue.slot, cue.resource, cue.sequence);
          this.stats.romSequenceBySlot[cue.slot] = {
            resource: cue.resource,
            sequence: cue.sequence,
          };
          visible = true;
        } else {
          // Unresolved selectors remain honest trace-only cues; do not invent
          // an animation or a fallback sequence at runtime.
          this.stats.traceCues++;
        }
        break;
      }
      case 'FIGHTER_POSITION': {
        this.pres.setFighterPosition(cue.side, cue.position);
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
        if (cue.action === 'FLASH_WHITE') {
          // White-screen entrance. Two ticks is the presentation policy;
          // exact hardware duration still requires independent ROM evidence.
          this.pres.flashWhite(2);
        } else {
          this.pres.camera(cue.action === 'IMPACT' ? 0.4 : 0.2);
        }
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
        // P0.4R-B5 — autoridad única del boundary: sceneLoadEffect()
        // (actionBoundary.ts). TACTICAL_TO_ACTION es PREPARACIÓN (gráficos VRAM
        // $8E00 + macros $19/$1A); la escena ACTION se entra en ACTION_READY.
        const effect = sceneLoadEffect(cue.mode);
        if (effect === 'PREPARE') {
          this.stats.scenePrepares++;
          break;
        }
        if (effect === 'RESTORE_FIELD') {
          this.applyFieldRestore(cue.tick);
          this.stats.sceneChanges++;
          visible = true;
          break;
        }
        this.currentScene = 'ACTION_SOLO';
        this.pres.setScene(this.currentScene);
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
      case 'ACTION_OBJECT_POSITION': {
        if (cue.x != null && cue.y != null) {
          this.pres.setActionObjectPosition(cue.slot, cue.x, cue.y);
          visible = true;
        } else {
          this.stats.traceCues++;
        }
        break;
      }
      case 'ACTION_OBJECT_MOTION': {
        this.pres.moveActionObject(cue.slot, cue.dxPerTick, cue.dyPerTick, cue.durationTicks);
        this.stats.motions++;
        visible = true;
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
        // Always forward the cue — physicalId is the canonical atlas key; the FighterActor
        // resolves texture via physicalId → file → pose fallback → invisible.
        if (cue.physicalId != null || cue.visualFrameId != null || cue.file) {
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

      case 'ACTION_OBJECT_STOP': {
        // P0 ANIMATION OWNERSHIP — ROM $08: el programa DESACTIVA/detiene el
        // track del ActionObject. No es un no-op de trazabilidad: el luchador
        // del slot congela su frame (playback off) hasta que otra cue/escena
        // lo reactive u oculte. Sin esto, un track terminado podía seguir
        // avanzando/loopeando por inercia fuera del programa ROM.
        const stop = (this.pres as Partial<Pick<BattlePresentation, 'stopActionObject'>>).stopActionObject;
        if (typeof stop === 'function') {
          stop.call(this.pres, cue.slot ?? 0);
          visible = true;
        } else {
          this.stats.pendingCues++;
          this.stats.pendingReasons.push('BattlePresentation.stopActionObject missing');
        }
        break;
      }
      case 'ACTION_OBJECT_BIND': {
        const bind = (this.pres as Partial<Pick<BattlePresentation, 'bindActionObject'>>).bindActionObject;
        if (typeof bind === 'function') {
          bind.call(this.pres, cue.slot as ActionObjectSlot, {
            role: cue.role,
            fighterSide: cue.fighterSide,
            // B7B2 — el contexto ROM viaja con la cue; el runtime lo convierte
            // en el binding coherente de ambos slots.
            ...(cue.context ? { context: cue.context } : {}),
            ...(cue.semantic ? { semantic: cue.semantic } : {}),
            tick: cue.tick,
          } as ActionObjectBinding);
          visible = true;
        } else {
          this.stats.pendingCues++;
          this.stats.pendingReasons.push('BattlePresentation.bindActionObject missing');
        }
        break;
      }
      case 'ACTION_OBJECT_UNBIND': {
        const unbind = (this.pres as Partial<Pick<BattlePresentation, 'unbindActionObject'>>).unbindActionObject;
        if (typeof unbind === 'function') {
          unbind.call(this.pres, cue.slot as ActionObjectSlot);
          visible = true;
        } else {
          this.stats.pendingCues++;
          this.stats.pendingReasons.push('BattlePresentation.unbindActionObject missing');
        }
        break;
      }
      default: {
        if (DISPLAY_CUES.has(cue.type)) {
          if (this.romDisplay) {
            this.romDisplay.consume(cue);
            this.stats.displayEffects++;
            if (cue.type === 'ROM_FX_WINDOW') this.stats.fxWindows++;
          } else {
            // P0.4R — nunca descartar en silencio un cue de display (BG_ASSEMBLY
            // incluido). Sin capa display es un PENDING explícito.
            this.stats.pendingCues++;
            this.stats.pendingReasons.push(`display cue ${cue.type} sin RomDisplayPresenter`);
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

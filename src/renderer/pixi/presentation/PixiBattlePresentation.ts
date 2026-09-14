// ═══════════════════════════════════════════════════════════
// DBZ LSW — PixiBattlePresentation (adaptador BattleTimeline → Pixi)
// ═══════════════════════════════════════════════════════════
// Implementa el contrato BattlePresentation sobre el BattleRenderer. El
// BattleTimeline NO conoce Pixi: un adaptador en la capa de integración mapea
// sus eventos (SHOT/ACTOR_POSE/TARGET_POSE/PROJECTILE/HIT_FRAME/CAMERA/
// FIELD_RETURN) a estos métodos. Cada método es determinista: el frame es
// consecuencia del tick GBC absoluto (renderer.tick).

import { Graphics, type Texture } from 'pixi.js';
import type { BattleSide } from '../../../data/facing';
import { facingFlip } from '../../../data/facing';
import { overworldUrl } from '../../../data/overworld';
import type { BattlePosition } from '../../../data/positions';
import type { BattleRenderer } from '../BattleRenderer';
import type { FighterActor } from '../actors/FighterActor';
import { ACTION_LEFT_X, ACTION_RIGHT_X, ACTION_SPECIAL_LEFT_X, ACTION_SPECIAL_RIGHT_X } from '../scenes/ActionScene';
import { ACTION_GROUND_Y, rushX, easeOutCubic } from '../systems/MotionSystem';
import type { BattlePresentation, BattleScene, RomMotionSegment } from './BattlePresentation';
import { positionFromSegments } from '../../../battle/romMotionMath';
import { resolveProjectileVisualMode, type ProjectileVisualMode } from './projectileVisual';
import { RomDisplayPresenter } from '../../../battle/romDisplay/RomDisplayPresenter';
import { RomDisplayLayer } from '../../../battle/romDisplay/RomDisplayLayer';
import { CameraPresenter } from './CameraPresenter';
import { ActionObjectRuntime, applyBindingCue, unapplyBindingCue, type ActionObjectBinding, type ActionObjectSlot } from '../../../battle/engine/presentation/ActionObjectRuntime';
import { ACTION_WORLD_SCALE } from '../config';

export interface PixiPresentationConfig {
  playerFormId: string;
  enemyFormId: string;
  overviewBackground: string;
  actionBackground: string;
  specialActionBackground?: string;
  playerPos: BattlePosition;
  enemyPos: BattlePosition;
  /**
   * Escala opcional del asset dentro del mundo nativo. El plano ACTION se
   * proyecta aparte mediante ACTION_WORLD_SCALE; el valor de producción es 1.
   */
  scale?: number;
}

export class PixiBattlePresentation implements BattlePresentation {
  private readonly renderer: BattleRenderer;
  private readonly cfg: PixiPresentationConfig;
  private readonly fighterScale: number;
  private readonly sceneTextures = new Map<string, Texture>();
  private playerTacticalPos: BattlePosition;
  private enemyTacticalPos: BattlePosition;

  private leftActor: FighterActor | null = null;
  private rightActor: FighterActor | null = null;
  private specialActionActive = false;
  /** Única autoridad slot lógico → participante físico durante una película. */
  private readonly actionObjects = new ActionObjectRuntime();

  get actionObjectSnapshot() {
    return this.actionObjects.snapshot();
  }

  bindActionObject(slot: ActionObjectSlot, binding: ActionObjectBinding): void {
    // B7B2 — misma autoridad que el gate (`applyBindingCue`). Con contexto ROM el
    // runtime resuelve los DOS roles desde el contexto; sin él, bind por slot.
    applyBindingCue(this.actionObjects, slot, binding);
  }

  unbindActionObject(slot: ActionObjectSlot): void {
    // B7B2 — UNBIND deja el slot realmente sin binding (rol y lado a null).
    unapplyBindingCue(this.actionObjects, slot);
  }

  actionObjectBindingObservation() {
    return this.actionObjects.bindingObservation();
  }

  /** B7B2 — limpieza del binding en el FIELD restore (B6 deja estado limpio). */
  clearActionObjectBinding(): void {
    this.actionObjects.resetBindingToField();
  }

  /**
   * B7B3 — visibilidad por PARTICIPANTE LIGADO: resuelve side → binding → slot y
   * el sprite refleja el estado físico del slot (`active && visible`), nunca el
   * bando. `$08 STOP_HIDE_OBJECT` gana: un inactive no revive.
   */
  setActionObjectVisibilityForParticipant(side: 'player' | 'enemy', visible: boolean): 0 | 1 | null {
    const slot = this.actionObjects.setVisibilityForBoundParticipant(side, visible);
    if (slot === null) return null;
    const state = this.actionObjects.state(slot);
    const sprite = this.actionObject(slot);
    if (sprite) sprite.visible = state.active && state.visible;
    return slot;
  }

  /**
   * B7B4 — orden de pintado físico de los ActionObject. Ordena SLOTS, nunca
   * bandos. El primer slot pintado queda DETRÁS en el contenedor (OAM: índice
   * menor = prioridad mayor = delante).
   */
  setActionObjectDrawOrder(order: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0'): void {
    this.actionObjects.setDrawOrder(order);
    const firstSlot: 0 | 1 = order === 'SLOT_0_THEN_1' ? 0 : 1;
    const secondSlot: 0 | 1 = firstSlot === 0 ? 1 : 0;
    const first = this.actionObject(firstSlot);
    const second = this.actionObject(secondSlot);
    this.renderer.sceneDirector.action.reorderFightersDrawnOrder(first, second);
  }

  private actionObject(slot: ActionObjectSlot): FighterActor | null {
    const binding = this.actionObjects.resolve(slot);
    if (!binding) return null;
    if (binding.role === 'TARGET') return this.target;
    if (binding.role === 'ACTOR' || binding.role === 'ACTOR_PRIMARY') return this.actor;
    if (binding.fighterSide === 'PLAYER') return this.leftActor;
    if (binding.fighterSide === 'ENEMY') return this.rightActor;
    return this.actor;
  }

  /** P0 ROM TICKS: devuelve el estado actual de ambos actores para diagnóstico. */
  inspectActors(): { left: FighterActor | null; right: FighterActor | null } {
    return { left: this.leftActor, right: this.rightActor };
  }

  setRomSequenceForSlot(slot: 0 | 1, resource: number, sequence: number): void {
    // P0 ANIMATION OWNERSHIP — slot mapping POR ROL (slot 0 = actor, slot 1 =
    // target), consistente con moveActionObject/setActionObjectPosition/
    // applyFrameOffset. El mapping fijo slot0→left/slot1→right rompía TODAS
    // las acciones del enemigo: la secuencia del actor (slot0) se aplicaba al
    // FighterActor del jugador y la del target (slot1) al del enemigo.
    const actor = this.actionObject(slot);
    if (actor && typeof (actor as any).setRomSequence === 'function') {
      (actor as any).setRomSequence(resource, sequence);
    }
  }

  setPhysicalFrameForSlot(slot: 0 | 1, cue: any): void {
    // Mismo mapeo por ROL que setRomSequenceForSlot (ver arriba).
    const actor = this.actionObject(slot);
    if (actor && typeof (actor as any).setPhysicalFrame === 'function') {
      (actor as any).setPhysicalFrame(cue);
    }
  }

  /** P0 ANIMATION OWNERSHIP — ROM $08: congela el track del slot (sin ocultar). */
  stopActionObject(slot: 0 | 1): void {
    const fighter = this.actionObject(slot);
    if (fighter && typeof (fighter as any).freezeTrack === 'function') {
      (fighter as any).freezeTrack();
    }
    this.actionObjects.stop(slot);
  }
  private attacker: BattleSide = 'left';
  private projectile: Graphics | null = null;
  private projectileMode: ProjectileVisualMode = 'special';
  private projectileSpawnTick: number | null = null;
  private projectileContactTick: number | null = null;
  private readonly whiteFlash: Graphics;
  private whiteFlashStartTick = -1;
  private whiteFlashDurationTicks = 0;

  // V7.8 — ROM display layer (separada de Fighter/FX/HUD).
  private readonly romDisplayPresenter: RomDisplayPresenter;
  private readonly romDisplayLayer: RomDisplayLayer;

  // P0 CAMERA PRESENTER — autoridad ÚNICA de cámara/pantalla.
  private readonly cameraPresenter: CameraPresenter;

  // Rush: movimiento del atacante calculado como f(tick − rushStartTick).
  private rushActive = false;
  private rushStartTick = 0;
  private rushDuration = 0;
  private rushFromX = 0;
  private rushToX = 0;

  // P0 SCENE-CAMERA — ROM discrete motion: position = start + dxPerTick * elapsed.
  // Replaces easeOutCubic rush for ROM-compiled cards.
  private romMotionActive = false;
  private romMotionTargetActor = true; // true = actor, false = target
  private romMotionStartTick = 0;
  private romMotionFromX = 0;
  private romMotionFromY = 0;
  private romMotionDxPerTick = 0;
  private romMotionDyPerTick = 0;
  private romMotionDuration = 0;
  private romMotionHoldTicks = 0;
  private romMotionDone = false;
  private romMotionSegments: RomMotionSegment[] | null = null;

  constructor(renderer: BattleRenderer, cfg: PixiPresentationConfig) {
    this.renderer = renderer;
    this.cfg = cfg;
    // La escala del mundo ya no se aplica a cada fighter. ACTION_SCENE escala
    // una sola vez el contenedor; 1 mantiene los frames ROM a tamaño nativo.
    this.fighterScale = cfg.scale ?? 1;
    this.playerTacticalPos = cfg.playerPos;
    this.enemyTacticalPos = cfg.enemyPos;
    this.romDisplayPresenter = new RomDisplayPresenter();
    // RomDisplayLayer dibuja la pantalla GBC a 1:1 y queda recortada al
    // viewport ACTION por su propia máscara. El padre ActionScene proyecta ×2.
    this.romDisplayLayer = new RomDisplayLayer(this.romDisplayPresenter, 1);
    this.cameraPresenter = new CameraPresenter();
    // Screen-space overlay: it hangs from app.stage, outside the camera/world,
    // so ROM screen motion cannot displace or crop the white transition.
    this.whiteFlash = new Graphics();
    this.whiteFlash.eventMode = 'none';
    this.whiteFlash.visible = false;
    this.renderer.app.stage.addChild(this.whiteFlash);
  }

  /** Carga fondos, overworld y luchadores; deja el plano en FIELD. */
  async init(): Promise<void> {
    const dir = this.renderer.sceneDirector;

    // Fondo, overworld y atlases en PARALELO: todos los fetch parten a la
    // vez (el navegador satura conexiones) en lugar de encadenarse.
    const pOwUrl = overworldUrl(this.cfg.playerFormId);
    const eOwUrl = overworldUrl(this.cfg.enemyFormId);
    const [overview, action, special, pOw, eOw, leftActor, rightActor] = await Promise.all([
      this.renderer.loadTexture(this.cfg.overviewBackground),
      this.renderer.loadTexture(this.cfg.actionBackground),
      this.cfg.specialActionBackground
        ? this.renderer.loadTexture(this.cfg.specialActionBackground)
        : Promise.resolve(null),
      pOwUrl ? this.renderer.loadTexture(pOwUrl) : Promise.resolve(null),
      eOwUrl ? this.renderer.loadTexture(eOwUrl) : Promise.resolve(null),
      this.renderer.addFighter(this.cfg.playerFormId, 'left', this.fighterScale),
      this.renderer.addFighter(this.cfg.enemyFormId, 'right', this.fighterScale),
    ]);

    dir.tactical.setBackground(overview);
    dir.action.setBackground(action);
    if (overview) this.sceneTextures.set(this.cfg.overviewBackground, overview);
    if (action) this.sceneTextures.set(this.cfg.actionBackground, action);
    if (special && this.cfg.specialActionBackground) {
      this.sceneTextures.set(this.cfg.specialActionBackground, special);
    }
    dir.tactical.setOverworld('left', pOw, this.cfg.playerPos, facingFlip(this.cfg.playerFormId, 'left'));
    dir.tactical.setOverworld('right', eOw, this.cfg.enemyPos, facingFlip(this.cfg.enemyFormId, 'right'));

    this.leftActor = leftActor;
    this.rightActor = rightActor;
    // M8.P0 — los dos actores se registran UNA sola vez (addChild una única
    // vez). A partir de aquí los roles cambian por setRoles, sin reparent.
    this.renderer.sceneDirector.action.setFighters(this.leftActor, this.rightActor);

    // V7.8 — ROM display layer: se añade sobre el action scene.
    this.renderer.sceneDirector.action.addChild(this.romDisplayLayer.view);

    this.renderer.sceneDirector.setScene('FIELD');
  }

  /** Fija quién ataca en este exchange (player → 'left', enemy → 'right').
   *  M8.P0 — SOLO cambia el ROL (setRoles): los nodos ya cuelgan de
   *  ActionScene; nunca removeChild/addChild (los parents son estables). */
  setAttacker(side: BattleSide): void {
    this.attacker = side;
    this.renderer.sceneDirector.action.setRoles(side);
  }

  /** V7.8 — ROM display presenter (para alimentar cues desde el handler). */
  get romPresenter(): RomDisplayPresenter {
    return this.romDisplayPresenter;
  }

  private get actor(): FighterActor | null {
    return this.attacker === 'left' ? this.leftActor : this.rightActor;
  }

  private get target(): FighterActor | null {
    return this.attacker === 'left' ? this.rightActor : this.leftActor;
  }

  setScene(scene: BattleScene, background?: string): void {
    if (scene === 'FIELD') this.specialActionActive = false;
    else if (background && background === this.cfg.specialActionBackground) this.specialActionActive = true;
    this.prepareScene(scene);
    const texture = background ? this.sceneTextures.get(background) : null;
    if (texture) {
      if (scene === 'FIELD') this.renderer.sceneDirector.tactical.setBackground(texture);
      else this.renderer.sceneDirector.action.setBackground(texture);
    }
    this.renderer.sceneDirector.setScene(scene);
    if (this.specialActionActive && scene !== 'FIELD') {
      this.leftActor?.setPos(ACTION_SPECIAL_LEFT_X, ACTION_GROUND_Y);
      this.rightActor?.setPos(ACTION_SPECIAL_RIGHT_X, ACTION_GROUND_Y);
    }
  }

  setFighterVisibility(role: 'ACTOR' | 'TARGET', visible: boolean): void {
    const fighter = role === 'ACTOR' ? this.actor : this.target;
    if (fighter) {
      fighter.visible = visible;
      // Visibility is a composition decision, never a playback trigger. A
      // track that the ROM has hidden must stop advancing until a later pose or
      // physical-frame cue explicitly starts it again.
      if (!visible && typeof (fighter as any).setPlaybackEnabled === 'function') {
        (fighter as any).setPlaybackEnabled(false);
      }
    }
  }

  setFighterPosition(side: 'player' | 'enemy', position: BattlePosition): void {
    if (side === 'player') this.playerTacticalPos = position;
    else this.enemyTacticalPos = position;
    this.updateTactical(this.playerTacticalPos, this.enemyTacticalPos);
  }

  setActionObjectPosition(slot: 0 | 1, x: number, y: number): void {
    const fighter = this.actionObject(slot);
    fighter?.setPos(x, y);
  }

  moveActionObject(slot: 0 | 1, dxPerTick: number, dyPerTick: number, durationTicks: number): void {
    this.cancelRush();
    const fighter = this.actionObject(slot);
    if (!fighter) return;
    this.romMotionActive = true;
    this.romMotionTargetActor = this.actionObjects.resolve(slot)?.role !== 'TARGET';
    this.romMotionStartTick = this.renderer.currentTick;
    this.romMotionFromX = fighter.x;
    this.romMotionFromY = fighter.y;
    this.romMotionDxPerTick = dxPerTick;
    this.romMotionDyPerTick = dyPerTick;
    this.romMotionDuration = Math.max(0, durationTicks);
    this.romMotionHoldTicks = 0;
    this.romMotionSegments = null;
    this.romMotionDone = false;
  }

  /** Refleja un cambio de posición táctica (MOVE) en el overworld del FIELD.
   *  El plano táctico debe mostrar el estado real del combate (gramática §0):
   *  recoloca los sprites overworld sin reinicializar el renderer. */
  updateTactical(playerPos: BattlePosition, enemyPos: BattlePosition): void {
    this.playerTacticalPos = playerPos;
    this.enemyTacticalPos = enemyPos;
    this.renderer.sceneDirector.tactical.setOverworldPosition('left', playerPos);
    this.renderer.sceneDirector.tactical.setOverworldPosition('right', enemyPos);
  }

  setActorPose(pose: string): void {
    this.actor?.setPose(pose, this.renderer.currentTick);
  }

  setTargetPose(pose: string): void {
    this.target?.setPose(pose, this.renderer.currentTick);
  }

  moveActor(durationTicks: number): void {
    const a = this.actor;
    if (!a) return;
    // P0 SCENE-CAMERA: Si hay ROM motion activo, no sobreescribir con legacy rush.
    if (this.romMotionActive) return;
    const fromX = this.renderer.sceneDirector.action.actorHomeX();
    const toX = this.renderer.sceneDirector.action.targetHomeX();
    const dir = toX > fromX ? 1 : -1;
    const endX = toX - dir * 34; // se detiene antes de solaparse con el rival
    this.rushActive = true;
    this.rushStartTick = this.renderer.currentTick;
    this.rushDuration = Math.max(1, Math.round(durationTicks));
    this.rushFromX = fromX;
    this.rushToX = endX;
    a.setPos(fromX, ACTION_GROUND_Y);
  }

  /** P0 SCENE-CAMERA — ROM discrete motion: dxPerTick * elapsed, no easing. */
  moveActorByRomMotion(deltaPx: number, durationTicks: number, holdTicks: number, segments?: RomMotionSegment[]): void {
    this.cancelRush(); // ROM motion supersedes legacy rush
    const a = this.actor;
    if (!a) return;
    this.romMotionActive = true;
    this.romMotionTargetActor = true;
    this.romMotionStartTick = this.renderer.currentTick;
    this.romMotionFromX = this.renderer.sceneDirector.action.actorHomeX();
    this.romMotionFromY = ACTION_GROUND_Y;
    this.romMotionDxPerTick = durationTicks > 0 ? deltaPx / durationTicks : 0;
    this.romMotionDyPerTick = 0;
    this.romMotionDuration = durationTicks;
    this.romMotionHoldTicks = holdTicks;
    this.romMotionSegments = segments && segments.length > 0 ? segments : null;
    this.romMotionDone = false;
    a.setPos(this.romMotionFromX, ACTION_GROUND_Y);
  }

  /** P0 SCENE-CAMERA — ROM discrete motion for target (non-actor motions). */
  moveTargetByRomMotion(deltaPx: number, durationTicks: number, holdTicks: number, segments?: RomMotionSegment[]): void {
    this.cancelRush();
    const t = this.target;
    if (!t) return;
    this.romMotionActive = true;
    this.romMotionTargetActor = false;
    this.romMotionStartTick = this.renderer.currentTick;
    this.romMotionFromX = this.renderer.sceneDirector.action.targetHomeX();
    this.romMotionFromY = ACTION_GROUND_Y;
    this.romMotionDxPerTick = durationTicks > 0 ? deltaPx / durationTicks : 0;
    this.romMotionDyPerTick = 0;
    this.romMotionDuration = durationTicks;
    this.romMotionHoldTicks = holdTicks;
    this.romMotionSegments = segments && segments.length > 0 ? segments : null;
    this.romMotionDone = false;
    t.setPos(this.romMotionFromX, ACTION_GROUND_Y);
  }

  /** P0 CAMERA PRESENTER — SCREEN_MOTION $0E: discrete screen displacement. */
  applyScreenMotion(dxPerTick: number, durationTicks: number, restore: boolean): void {
    this.cameraPresenter.applyScreenMotion(this.renderer.currentTick, dxPerTick, durationTicks, restore);
  }

  /** P0 CAMERA PRESENTER — SCREEN_RESTORE $0F: disable HBlank viewport, preserve C405/C406. */
  applyScreenRestore(): void {
    this.cameraPresenter.applyScreenRestore();
  }

  /** P0 CAMERA PRESENTER — SCREEN_PATH $11: unique ROM screen path program (18 pasos). */
  applyScreenPath(durationTicks: number): void {
    // X reflejado por lado: el lado físico lo deriva del atacante actual.
    const side: 'SIDE_1' | 'SIDE_2' = this.attacker === 'left' ? 'SIDE_1' : 'SIDE_2';
    this.cameraPresenter.applyScreenPath(this.renderer.currentTick, durationTicks, side);
  }

  spawnProjectile(kind: string, timing?: { spawnTick: number; contactTick: number }): void {
    this.clearProjectile();
    this.projectileSpawnTick = timing?.spawnTick ?? null;
    this.projectileContactTick = timing?.contactTick ?? null;
    // Importante: los PNG `beam_ray` recortados del sheet incluyen personaje
    // + rayo completo. No se pueden montar como proyectil independiente porque
    // duplican al luchador en ACTION/PROJECTILE. Hasta separar esos frames en
    // torso/beam reales, el proyectil del renderer vive aqui como shape
    // procedural sin personaje; el actor mantiene `beam_fire`.
    this.projectileMode = resolveProjectileVisualMode(kind);
    // Proyectiles procedurales: se dibujan sin escalar ni deformar PNGs.
    const g = new Graphics();
    this.renderer.sceneDirector.projectileLayer.addChild(g);
    this.projectile = g;
    this.setProjectileProgress(0);
  }

  setProjectileProgress(progress: number): void {
    if (!this.projectile) return;
    const fromX = this.renderer.sceneDirector.action.actorHomeX();
    const toX = this.renderer.sceneDirector.action.targetHomeX();
    const p = Math.max(0, Math.min(1, progress));
    this.drawProceduralProjectile(this.projectile, p, fromX, toX);
  }

  private drawProceduralProjectile(g: Graphics, progress: number, fromX: number, toX: number): void {
    const dir = this.attacker === 'left' ? 1 : -1;
    const y = ACTION_GROUND_Y - 40;
    const travelX = fromX + (toX - fromX) * progress;
    g.clear();
    if (this.projectileMode === 'ray') {
      const len = Math.max(2, Math.abs(toX - fromX) * progress);
      const h = this.projectileContactTick != null && this.projectileSpawnTick != null ? 5 : 4;
      g.position.set(fromX, y);
      g.rect(dir === 1 ? 0 : -len, -Math.floor(h / 2), len, h).fill(0x00ccff);
      g.rect(dir === 1 ? 0 : -len, -1, len, 2).fill(0xf0ffff);
      return;
    }
    g.position.set(travelX, y);
    if (this.projectileMode === 'ball') {
      g.circle(0, 0, 6).fill(0xffd040);
      g.circle(-2 * dir, -2, 3).fill(0xffffff);
      return;
    }
    if (this.projectileMode === 'disk') {
      g.ellipse(0, 0, 10, 3).fill(0xfff17a);
      g.ellipse(0, 0, 6, 1).fill(0xffffff);
      return;
    }
    if (this.projectileMode === 'sword') {
      g.poly([0, -2, 18 * dir, 0, 0, 2, -4 * dir, 0]).fill(0x8ffcff);
      return;
    }
    g.rect(-4, -4, 8, 8).fill(0xff8a40);
  }

  impact(): void {
    this.renderer.impactSystem.impact(this.renderer.currentTick, { hitstop: 2, flash: 4, shake: 6, mag: 0.4 });
  }

  camera(shake: number): void {
    this.renderer.impactSystem.shake(this.renderer.currentTick, shake);
  }

  flashWhite(durationTicks: number): void {
    this.whiteFlashStartTick = this.renderer.currentTick;
    this.whiteFlashDurationTicks = Math.max(1, Math.floor(durationTicks));
    this.syncWhiteFlash(this.renderer.currentTick);
  }

  private syncWhiteFlash(tick: number): void {
    const elapsed = tick - this.whiteFlashStartTick;
    const active = this.whiteFlashStartTick >= 0
      && elapsed >= 0
      && elapsed < this.whiteFlashDurationTicks;
    this.whiteFlash.clear();
    this.whiteFlash.visible = active;
    if (active) {
      this.whiteFlash.rect(0, 0, this.renderer.app.screen.width, this.renderer.app.screen.height).fill(0xffffff);
    }
  }

  returnToField(): void {
    this.specialActionActive = false;    this.whiteFlashStartTick = -1;
    this.syncWhiteFlash(this.renderer.currentTick);
    this.renderer.sceneDirector.setScene('FIELD');
    this.clearProjectile();
    this.cancelRush();
    this.cameraPresenter.reset();
    // `returnToField` puede ocurrir entre dos ticks del timeline. Restablece
    // también la transformación ya aplicada al world, evitando que un pan ROM
    // deje el FIELD fuera del viewport hasta el siguiente sync.
    this.resetWorldCamera();
    this.leftActor?.setFlash(0);
    this.rightActor?.setFlash(0);
    // P0 CLEANUP — baseline visual real: offsets/rom-track borrados ANTES de
    // reposar idle, para que ACTION N+1 no herede frame offset ni secuencia
    // residual de N. El idle de FIELD es un frame ESTÁTICO (playback off): el
    // avance solo lo reactiva una cue FIGHTER_POSE/animación del programa.
    this.leftActor?.resetRomTrackState();
    this.rightActor?.resetRomTrackState();
    this.leftActor?.setPose('idle', this.renderer.currentTick);
    this.rightActor?.setPose('idle', this.renderer.currentTick);
    this.leftActor?.freezeTrack();
    this.rightActor?.freezeTrack();
    this.leftActor?.setPos(ACTION_LEFT_X, ACTION_GROUND_Y);
    this.rightActor?.setPos(ACTION_RIGHT_X, ACTION_GROUND_Y);
  }

  /**
   * P0.4R-B6C — release del display ROM ordenado por el contrato de salida.
   * Se usa cuando el contrato detecta display aún compuesto al llegar a FIELD
   * sin DISPLAY_CLEAR declarado (caso canónico: Support $00/$02). No es un clear
   * sintético en la timeline ni una decisión autónoma del presenter.
   */
  releaseRomDisplayForField(): void {
    this.romDisplayPresenter.reset();
    this.romDisplayLayer.clear();
  }

  applyFrameOffset(offsetX: number, offsetY: number, slot: 0 | 1 = 0): void {
    // slot 0 = participante activo (actor), slot 1 = contraparte (target).
    // NUNCA aplicar siempre al luchador izquierdo: el actor puede ser el enemigo.
    const who = slot === 0 ? this.actor : this.target;
    who?.applyFrameOffset(offsetX, offsetY);
  }

  sync(tick: number): void {
    this.renderer.sync(tick);
    this.syncWhiteFlash(tick);

    // V7.8 — ROM display layer: sincroniza el estado del Presenter con Pixi.
    this.romDisplayLayer.sync(tick);

    // P0 CAMERA PRESENTER — camera authority computes final screen position.
    // ImpactSystem shake → transient offset, CameraPresenter adds ROM screen offset.
    const impactSnap = this.renderer.impactSystem.snapshot(this.renderer.currentTick);
    this.cameraPresenter.setTransientOffset(impactSnap.shakeX, impactSnap.shakeY);
    const cameraSnap = this.cameraPresenter.compute(this.renderer.currentTick);
    // CameraPresenter devuelve offsets en píxeles nativos ROM. Todo el mundo
    // (FIELD y ACTION) se proyecta ×2, por lo que la cámara debe usar la misma
    // conversión y nunca mezclarse con coordenadas lógicas de salida.
    this.renderer.world.position.set(
      cameraSnap.screenX * ACTION_WORLD_SCALE,
      cameraSnap.screenY * ACTION_WORLD_SCALE,
    );

    if (this.projectile && this.projectileSpawnTick != null && this.projectileContactTick != null) {
      const duration = Math.max(1, this.projectileContactTick - this.projectileSpawnTick);
      this.setProjectileProgress((this.renderer.currentTick - this.projectileSpawnTick) / duration);
    }
    // Rush: position = f(tick − rushStartTick) — determinista a cualquier Hz.
    // P0 SCENE-CAMERA: ROM discrete motion takes priority over legacy rush.
    if (this.romMotionActive) {
      const who = this.romMotionTargetActor ? this.actor : this.target;
      if (who) {
        const elapsed = this.renderer.currentTick - this.romMotionStartTick;
        if (!this.romMotionDone) {
          let x = this.romMotionFromX;
          let done = false;
          if (this.romMotionSegments) {
            // positionAtTick determinista sobre segmentos ROM discretos.
            const pos = positionFromSegments(this.romMotionSegments, elapsed);
            x = this.romMotionFromX + pos.x;
            done = pos.done;
          } else if (elapsed <= this.romMotionDuration) {
            // Fallback uniforme (sin segmentos): dxPerTick * elapsed.
            x = this.romMotionFromX + this.romMotionDxPerTick * elapsed;
          } else {
            x = this.romMotionFromX + this.romMotionDxPerTick * this.romMotionDuration;
            done = elapsed > this.romMotionDuration + this.romMotionHoldTicks;
          }
          const motionElapsed = Math.max(0, Math.min(elapsed, this.romMotionDuration));
          const y = this.romMotionFromY + this.romMotionDyPerTick * motionElapsed;
          who.setPos(Math.round(x), Math.round(y));
          if (done) {
            this.romMotionDone = true;
            this.romMotionActive = false;
          }
        }
      }
    } else if (this.rushActive) {
      const a = this.actor;
      if (a) {
        const p = this.rushDuration > 0
          ? Math.min(1, Math.max(0, (this.renderer.currentTick - this.rushStartTick) / this.rushDuration))
          : 1;
        const x = rushX({ start: this.rushFromX, end: this.rushToX, easing: easeOutCubic }, p);
        a.setPos(x, ACTION_GROUND_Y);
        if (p >= 1) this.rushActive = false;
      }
    }
    const snap = this.renderer.impactSystem.snapshot(this.renderer.currentTick);
    this.target?.setFlash(snap.flash);
    this.actor?.setFlash(0);
  }

  /** Vuelve a un estado inicial limpio (para replay determinista del timeline). */
  reset(): void {
    this.renderer.impactSystem.reset();
    this.renderer.sync(0);
    this.clearProjectile();
    this.cancelRush();
    this.cameraPresenter.reset();
    this.resetWorldCamera();
    this.whiteFlashStartTick = -1;
    this.whiteFlashDurationTicks = 0;
    this.whiteFlash.clear();
    this.whiteFlash.visible = false;
    this.leftActor?.setFlash(0);
    this.rightActor?.setFlash(0);
    this.leftActor?.resetRomTrackState();
    this.rightActor?.resetRomTrackState();
    this.leftActor?.setPose('idle', 0);
    this.rightActor?.setPose('idle', 0);
    this.leftActor?.freezeTrack();
    this.rightActor?.freezeTrack();
    this.leftActor?.setPos(ACTION_LEFT_X, ACTION_GROUND_Y);
    this.rightActor?.setPos(ACTION_RIGHT_X, ACTION_GROUND_Y);
    this.setAttacker(this.attacker);
    this.romDisplayPresenter.reset();
    this.romDisplayLayer.clear();
    this.renderer.sceneDirector.setScene('FIELD');
  }

  /** Snapshot determinista para verificación/depuración. */
  debugState(): {
    tick: number;
    scene: BattleScene;
    actor: { pose: string | null; frame: number; x: number; y: number; visible: boolean } | null;
    target: { pose: string | null; frame: number; x: number; y: number; visible: boolean } | null;
    romDisplay: RomDisplayPresenter['state'];
    camera: ReturnType<CameraPresenter['state']>;
  } {
    const a = this.actor;
    const t = this.target;
    return {
      tick: this.renderer.currentTick,
      scene: this.renderer.sceneDirector.scene,
      actor: a ? { pose: a.pose, frame: a.frameIndex, x: a.position.x, y: a.position.y, visible: a.visible } : null,
      target: t ? { pose: t.pose, frame: t.frameIndex, x: t.position.x, y: t.position.y, visible: t.visible } : null,
      romDisplay: this.romDisplayPresenter.state,
      camera: this.cameraPresenter.state(),
    };
  }

  private clearProjectile(): void {
    this.projectileMode = 'special';
    this.projectileSpawnTick = null;
    this.projectileContactTick = null;
    if (this.projectile) {
      this.renderer.sceneDirector.projectileLayer.removeChild(this.projectile);
      this.projectile.destroy({ texture: false });
      this.projectile = null;
    }
  }

  private resetWorldCamera(): void {
    this.renderer.world.position.set(0, 0);
  }

  private cancelRush(): void {
    this.rushActive = false;
    this.rushStartTick = 0;
    this.rushDuration = 0;
    this.rushFromX = 0;
    this.rushToX = 0;
    this.romMotionActive = false;
    this.romMotionDone = false;
    this.romMotionStartTick = 0;
    this.romMotionFromY = 0;
    this.romMotionDxPerTick = 0;
    this.romMotionDyPerTick = 0;
    this.romMotionDuration = 0;
    this.romMotionHoldTicks = 0;
    this.romMotionSegments = null;
  }

  /**
   * Cada plano tiene propiedad exclusiva de sus entidades:
   * ACTION_SOLO no muestra target, rush ni proyectil; ACTION_DUEL no muestra
   * proyectiles; PROJECTILE no arrastra un rush corporal anterior.
   */
  private prepareScene(scene: BattleScene): void {
    if (scene === 'FIELD') {
      this.whiteFlashStartTick = -1;
      this.syncWhiteFlash(this.renderer.currentTick);
      this.clearProjectile();
      this.cancelRush();
      this.leftActor?.setPos(ACTION_LEFT_X, ACTION_GROUND_Y);
      this.rightActor?.setPos(ACTION_RIGHT_X, ACTION_GROUND_Y);
      return;
    }

    if (scene === 'ACTION_SOLO') {
      this.clearProjectile();
      this.cancelRush();
      this.actor?.setPos(this.renderer.sceneDirector.action.actorHomeX(), ACTION_GROUND_Y);
      this.target?.setPos(this.renderer.sceneDirector.action.targetHomeX(), ACTION_GROUND_Y);
      return;
    }

    if (scene === 'DEFENDER_ACTION') {
      // M8.C2a — cámara en el DEFENSOR: sin proyectil ni rush residual;
      // ambos actores vuelven a su anchor cinematográfico local (la
      // preparación defensiva es local — NUNCA muta la posición táctica).
      this.clearProjectile();
      this.cancelRush();
      this.leftActor?.setPos(ACTION_LEFT_X, ACTION_GROUND_Y);
      this.rightActor?.setPos(ACTION_RIGHT_X, ACTION_GROUND_Y);
      return;
    }

    if (scene === 'ACTION_DUEL') {
      this.clearProjectile();
      return;
    }

    if (scene === 'PROJECTILE') {
      this.cancelRush();
      this.actor?.setPos(this.renderer.sceneDirector.action.actorHomeX(), ACTION_GROUND_Y);
      this.target?.setPos(this.renderer.sceneDirector.action.targetHomeX(), ACTION_GROUND_Y);
    }
  }
}

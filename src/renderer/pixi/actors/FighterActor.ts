// ═══════════════════════════════════════════════════════════
// DBZ LSW — FighterActor (luchador como nodo del scene graph Pixi)
// ═══════════════════════════════════════════════════════════
// Sustituye a <FighterSprite> (DOM + <img> + setInterval). Un FighterActor es
// un Container Pixi con un único Sprite anclado abajo-centro (ground line
// estable): al cambiar de frame, el personaje NO "respira" porque el ancla
// (0.5, 1) mantiene fijo el punto de apoyo y el centro horizontal.
//
// El frame mostrado es f(tick GBC ABSOLUTO − poseStartTick): determinista a
// 60/120/144/240 Hz. Nada de setInterval ni duraciones en ms.
//
// El flip respeta las reglas de FACING (facingFlip) y el caso especial
// move_back (espejo del ciclo de andar).

import { Container, Sprite, Texture } from 'pixi.js';
import { facingFlip, type BattleSide } from '../../../data/facing';
import { resolveCombatPose } from '../../../battle/spriteConfig';
import { currentFrame, detectTimingSource } from '../systems/SpriteAnimator';
import type { FormAtlas, PoseAnim } from '../assets/AtlasLoader';
import type { TimingSource } from '../../../battle/romTimedFrameInstance';

function resolvePose(atlas: FormAtlas, pose: string): string | null {
  return resolveCombatPose(pose, p => atlas.anims.has(p));
}

export class FighterActor extends Container {
  readonly formId: string;
  private readonly atlas: FormAtlas;
  private readonly sprite: Sprite;
  /** Overlay blanco para el flash de impacto (tinte aditivo). */
  private readonly flash: Sprite;
  private activePose: string | null = null;
  private anim: PoseAnim | null = null;
  private poseStartTick = 0;
  private lastFrameIndex = 0;
  private _timingSource: TimingSource = 'LEGACY_FPS';
  private _frameOffsetX = 0;
  private _frameOffsetY = 0;
  private baseFlip = 1;
  private scaleMag = 1;

  /** ROM sequence state per slot (for SPECIAL_HANDLER multi-actor: Purple Comet, P.Comet Z, etc.) */
  private romResource: number | null = null;
  private romSequence: number | null = null;

  constructor(atlas: FormAtlas, formId: string, side: BattleSide) {
    super();
    this.formId = formId;
    this.atlas = atlas;

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 1); // abajo-centro → ground line estable
    this.sprite.roundPixels = true;
    this.addChild(this.sprite);

    this.flash = new Sprite(Texture.WHITE);
    this.flash.anchor.set(0.5, 1);
    this.flash.width = atlas.maxW;
    this.flash.height = atlas.maxH;
    this.flash.blendMode = 'add';
    this.flash.visible = false;
    this.addChild(this.flash);

    this.baseFlip = facingFlip(formId, side);
    this.applyTransform();
    this.setPose('idle', 0);
  }

  /** Pose activa (resuelta con fallbacks) — para verificación/depuración. */
  get pose(): string | null {
    return this.activePose;
  }

  /** Índice de frame actual — para verificación frame-determinista. */
  get frameIndex(): number {
    return this.lastFrameIndex;
  }

  /** Fuente de timing: ROM_TICKS (durationTicks per frame) o LEGACY_FPS (uniform). */
  get timingSource(): TimingSource {
    return this._timingSource;
  }

  /** Aplica offset ROM-native al frame actual. Viene del MISMO frame record
   *  que durationTicks — nunca timing de ROM y offset de manifest. */
  applyFrameOffset(offsetX: number, offsetY: number): void {
    this._frameOffsetX = offsetX;
    this._frameOffsetY = offsetY;
    this.applyTransform();
  }

  /** Establece la secuencia ROM física para este actor/slot.
   *  Usado por ROM_PHYSICAL_FRAME para SPECIAL_HANDLER (Tail, V-Ball, Purple Comet, P.Comet Z).
   */
  setRomSequence(resource: number, sequence: number): void {
    this.romResource = resource;
    this.romSequence = sequence;
    // TODO: trigger SpriteAnimator / atlas lookup con (resource, sequence)
    // por ahora solo almacena el estado para que el resolver físico lo use
  }

  get currentRomSequence(): { resource: number; sequence: number } | null {
    if (this.romResource != null && this.romSequence != null) {
      return { resource: this.romResource, sequence: this.romSequence };
    }
    return null;
  }

  /** Direct physical frame from ROM_PHYSICAL_FRAME cue (exact ROM match, no pose fallback). */
  setPhysicalFrame(cue: {
    resource: number;
    sequence: number;
    frameIndex: number;
    visualFrameId?: number | null;
    file?: string | null;
    offsetX?: number | null;
    offsetY?: number | null;
    durationTicks?: number | null;
  }): void {
    this.romResource = cue.resource;
    this.romSequence = cue.sequence;
    this.lastFrameIndex = cue.frameIndex;

    if (cue.offsetX != null || cue.offsetY != null) {
      this._frameOffsetX = cue.offsetX ?? 0;
      this._frameOffsetY = cue.offsetY ?? 0;
    }

    // Prefer direct visualFrameId or file if provided by resolver
    const visualFrameKey = cue.visualFrameId != null ? String(cue.visualFrameId) : null;
    if (visualFrameKey != null && this.atlas.textures.has(visualFrameKey)) {
      this.sprite.texture = this.atlas.textures.get(visualFrameKey)!;
      this.sprite.visible = true;
      return;
    }
    if (cue.file && this.atlas.textures.has(cue.file)) {
      this.sprite.texture = this.atlas.textures.get(cue.file)!;
      this.sprite.visible = true;
      return;
    }

    // Fallback to the rom-aware key we already have
    const texKey = `${this.activePose}:${cue.frameIndex}:rom:${cue.resource}:${cue.sequence}`;
    const tex = this.atlas.textures.get(texKey) ?? this.atlas.textures.get(`${this.activePose}:${cue.frameIndex}`);
    if (tex) {
      this.sprite.texture = tex;
      this.sprite.visible = true;
    } else {
      this.sprite.visible = false;
    }
  }

  /** P0 ROM TICKS: devuelve el estado interno para diagnóstico en browser. */
  inspect(): {
    formId: string;
    pose: string | null;
    frameIndex: number;
    timingSource: TimingSource;
    poseStartTick: number;
    frameOffsetX: number;
    frameOffsetY: number;
    animFrames: number;
    animDurations: number[];
  } {
    return {
      formId: this.formId,
      pose: this.activePose,
      frameIndex: this.lastFrameIndex,
      timingSource: this._timingSource,
      poseStartTick: this.poseStartTick,
      frameOffsetX: this._frameOffsetX,
      frameOffsetY: this._frameOffsetY,
      animFrames: this.anim?.frames.length ?? 0,
      animDurations: this.anim?.frames.map(f => f.durationTicks ?? 0) ?? [],
    };
  }

  setFlip(side: BattleSide): void {
    this.baseFlip = facingFlip(this.formId, side);
    this.applyTransform();
  }

  /** Escala en píxeles (1 = 1:1 pixel nativo del asset). */
  setScale(multiplier: number): void {
    this.scaleMag = Math.abs(multiplier);
    this.applyTransform();
  }

  /** Posición lógica (px) del punto de apoyo (ground line). */
  setPos(x: number, y: number): void {
    this.position.set(x, y);
  }

  /** Tinte de flash: 0 = nada, 1 = blanco total (aditivo). */
  setFlash(intensity: number): void {
    const f = intensity <= 0 ? 0 : intensity;
    this.flash.visible = f > 0;
    this.flash.alpha = Math.min(1, f);
  }

  /** Nº de frames de una pose del atlas (0 si no existe). */
  poseFrameCount(pose: string): number {
    return this.atlas.anims.get(pose)?.frames.length ?? 0;
  }

  /** Textura del frame `index` de una pose (null si no existe). */
  getPoseTexture(pose: string, index = 0): Texture | null {
    return this.atlas.textures.get(`${pose}:${index}`) ?? null;
  }

  /** Cambia la pose en el tick absoluto `absTick` (reloj de la pose a cero).
   *  Detecta automáticamente ROM_TICKS vs LEGACY_FPS según durationTicks. */
  setPose(pose: string, absTick: number): void {
    const resolved = resolvePose(this.atlas, pose);
    this.activePose = resolved;
    this.anim = resolved ? (this.atlas.anims.get(resolved) ?? null) : null;
    this._timingSource = this.anim ? detectTimingSource(this.anim) : 'LEGACY_FPS';
    this.poseStartTick = absTick;
    this.applyTransform();
    this.applyFrame(Math.max(0, absTick - this.poseStartTick));
  }

  /** Sincroniza el frame al tick GBC absoluto (reloj ÚNICO, f(tick)). */
  sync(absTick: number): void {
    this.applyFrame(Math.max(0, absTick - this.poseStartTick));
  }

  private applyTransform(): void {
    const sign = this.activePose === 'move_back' ? -this.baseFlip : this.baseFlip;
    this.sprite.scale.set(this.scaleMag * sign, this.scaleMag);
    this.flash.scale.set(this.scaleMag, this.scaleMag);
    // ROM-native frame offset: applied alongside durationTicks from same record.
    // This offset shifts the sprite relative to its ground-line anchor position.
    this.sprite.x = this._frameOffsetX * sign;
    this.sprite.y = this._frameOffsetY;
  }

  private applyFrame(elapsedTicks: number): void {
    if (!this.anim || !this.activePose) {
      this.sprite.visible = false;
      this.lastFrameIndex = 0;
      return;
    }
    const state = currentFrame(this.anim, elapsedTicks);
    this.lastFrameIndex = state.frameIndex;

    // When romSequence is set (SPECIAL_HANDLER), the frame selection should prefer
    // the physical frame from (resource + sequence + frameIndex) over pose-only.
    // The cue already resolved the physicalId; here we keep the context for the resolver.
    const romCtx = this.currentRomSequence;
    const texKey = romCtx
      ? `${this.activePose}:${state.frameIndex}:rom:${romCtx.resource}:${romCtx.sequence}`
      : `${this.activePose}:${state.frameIndex}`;

    const tex = this.atlas.textures.get(texKey) ?? this.atlas.textures.get(`${this.activePose}:${state.frameIndex}`);
    if (!tex) {
      this.sprite.visible = false;
      return;
    }
    this.sprite.texture = tex;
    this.sprite.visible = true;
  }
}

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
import { currentFrame } from '../systems/SpriteAnimator';
import type { FormAtlas, PoseAnim } from '../assets/AtlasLoader';

// Espejo de POSE_FALLBACKS de main.tsx (se deduplicará al migrar la lógica de
// poses a un módulo compartido). Orden: pose → fallback → … → idle.
const POSE_FALLBACKS: Record<string, string[]> = {
  idle: ['idle'],
  move_front: ['move_front', 'move_back', 'attack_fwd', 'idle'],
  move_back: ['move_back', 'move_front', 'attack_fwd', 'idle'],
  guard: ['guard', 'idle'],
  attack_fwd: ['attack_fwd', 'move_front', 'idle'],
  attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  hurt: ['hurt', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'gather_power', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  gather_power: ['gather_power', 'beam_charge', 'guard', 'idle'],
};

function resolvePose(atlas: FormAtlas, pose: string): string | null {
  const fallbacks = POSE_FALLBACKS[pose] ?? [pose, 'idle'];
  for (const p of fallbacks) {
    if (atlas.anims.has(p)) return p;
  }
  return null;
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
  private baseFlip = 1;
  private scaleMag = 1;

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

  /** Cambia la pose en el tick absoluto `absTick` (reloj de la pose a cero). */
  setPose(pose: string, absTick: number): void {
    const resolved = resolvePose(this.atlas, pose);
    this.activePose = resolved;
    this.anim = resolved ? (this.atlas.anims.get(resolved) ?? null) : null;
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
  }

  private applyFrame(elapsedTicks: number): void {
    if (!this.anim || !this.activePose) {
      this.sprite.visible = false;
      this.lastFrameIndex = 0;
      return;
    }
    const state = currentFrame(this.anim, elapsedTicks);
    this.lastFrameIndex = state.frameIndex;
    const tex = this.atlas.textures.get(`${this.activePose}:${state.frameIndex}`);
    if (!tex) {
      this.sprite.visible = false;
      return;
    }
    this.sprite.texture = tex;
    this.sprite.visible = true;
  }
}

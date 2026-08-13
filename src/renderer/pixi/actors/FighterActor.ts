// ═══════════════════════════════════════════════════════════
// DBZ LSW — FighterActor (luchador como nodo del scene graph Pixi)
// ═══════════════════════════════════════════════════════════
// Sustituye a <FighterSprite> (DOM + <img> + setInterval). Un FighterActor es
// un Container Pixi con un único Sprite anclado abajo-centro (ground line
// estable): al cambiar de frame, el personaje NO "respira" porque el ancla
// (0.5, 1) mantiene fijo el punto de apoyo y el centro horizontal.
//
// El flip respeta las reglas de FACING (facingFlip) y el caso especial
// move_left (espejo del ciclo de andar).

import { Container, Sprite } from 'pixi.js';
import { facingFlip, type BattleSide } from '../../../data/facing';
import { currentFrame } from '../systems/SpriteAnimator';
import type { FormAtlas, PoseAnim } from '../assets/AtlasLoader';

// Espejo de POSE_FALLBACKS de main.tsx (se deduplicará al migrar la lógica de
// poses a un módulo compartido). Orden: pose → fallback → … → idle.
const POSE_FALLBACKS: Record<string, string[]> = {
  idle: ['idle'],
  move_right: ['move_right', 'move_left', 'attack_fwd', 'idle'],
  move_left: ['move_left', 'move_right', 'attack_fwd', 'idle'],
  guard: ['guard', 'idle'],
  attack_fwd: ['attack_fwd', 'move_right', 'idle'],
  attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  hurt: ['hurt', 'guard', 'idle'],
  beam_charge: ['beam_charge', 'power_up', 'guard', 'idle'],
  beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
  power_up: ['power_up', 'beam_charge', 'guard', 'idle'],
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
  private activePose: string | null = null;
  private anim: PoseAnim | null = null;
  private elapsedTicks = 0;
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

    this.baseFlip = facingFlip(formId, side);
    this.applyTransform();
    this.setPose('idle');
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

  /** Cambia la pose y reinicia su reloj GBC (frames desde cero). */
  setPose(pose: string): void {
    const resolved = resolvePose(this.atlas, pose);
    this.activePose = resolved;
    this.anim = resolved ? (this.atlas.anims.get(resolved) ?? null) : null;
    this.elapsedTicks = 0;
    this.applyTransform();
    this.applyFrame();
  }

  /** Avanza el reloj de la pose `ticks` frames GBC (reloj ÚNICO). */
  tick(ticks = 1): void {
    this.elapsedTicks += ticks;
    this.applyFrame();
  }

  private applyTransform(): void {
    const sign = this.activePose === 'move_left' ? -this.baseFlip : this.baseFlip;
    this.sprite.scale.set(this.scaleMag * sign, this.scaleMag);
  }

  private applyFrame(): void {
    if (!this.anim || !this.activePose) {
      this.sprite.visible = false;
      return;
    }
    const state = currentFrame(this.anim, this.elapsedTicks);
    const tex = this.atlas.textures.get(`${this.activePose}:${state.frameIndex}`);
    if (!tex) {
      this.sprite.visible = false;
      return;
    }
    this.sprite.texture = tex;
    this.sprite.visible = true;
  }
}

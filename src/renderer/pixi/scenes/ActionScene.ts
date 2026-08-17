// ═══════════════════════════════════════════════════════════
// DBZ LSW — ActionScene (vista de ACCIÓN: fondo action + luchadores grandes)
// ═══════════════════════════════════════════════════════════
// Plano ACTION_SOLO/ACTION_DUEL/PROJECTILE/IMPACT: fondo action (160×80 → 2×)
// + atacante y defensor grandes (FighterActor). Anchors/pivots por escenario y
// lado; separación ABSOLUTA entre posición táctica y posición cinematográfica:
// el luchador grande vive en coordenadas de ACTION, no en las del campo.

import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { FighterActor } from '../actors/FighterActor';
import { BG_SCALE, BATTLE_LOGICAL_W } from '../config';
import { ACTION_GROUND_Y } from '../systems/MotionSystem';

// Posiciones cinematográficas por lado (px lógicos, campo 320×160):
//   actor (izquierda)  → x ≈ 96
//   target (derecha)   → x ≈ 224
export const ACTION_ACTOR_X = 96;
export const ACTION_TARGET_X = 224;

export class ActionScene extends Container {
  private bg: Sprite | null = null;
  private actor: FighterActor | null = null;
  private target: FighterActor | null = null;
  private scene: 'ACTION_SOLO' | 'ACTION_DUEL' | 'ACTION_TEAM' | 'PROJECTILE' | 'IMPACT' = 'ACTION_DUEL';

  constructor() {
    super();
    this.visible = false;
  }

  setBackground(tex: Texture | null): void {
    if (this.bg) {
      this.removeChild(this.bg);
      this.bg.destroy({ texture: false });
      this.bg = null;
    }
    if (!tex) return;
    const s = new Sprite(tex);
    s.scale.set(BG_SCALE, BG_SCALE);
    s.roundPixels = true;
    this.bg = s;
    this.addChildAt(s, 0);
  }

  /** Coloca al atacante (o lo retira con null). */
  setActor(actor: FighterActor | null): void {
    if (this.actor) {
      this.removeChild(this.actor);
      this.actor = null;
    }
    if (actor) {
      this.actor = actor;
      actor.setPos(ACTION_ACTOR_X, ACTION_GROUND_Y);
      this.addChild(actor);
      this.applySceneVisibility();
    }
  }

  /** Coloca al defensor (o lo retira con null). */
  setTarget(target: FighterActor | null): void {
    if (this.target) {
      this.removeChild(this.target);
      this.target = null;
    }
    if (target) {
      this.target = target;
      target.setPos(ACTION_TARGET_X, ACTION_GROUND_Y);
      this.addChild(target);
      this.applySceneVisibility();
    }
  }

  setScene(scene: 'ACTION_SOLO' | 'ACTION_DUEL' | 'ACTION_TEAM' | 'PROJECTILE' | 'IMPACT'): void {
    this.scene = scene;
    this.applySceneVisibility();
  }

  getActor(): FighterActor | null {
    return this.actor;
  }

  getTarget(): FighterActor | null {
    return this.target;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  private applySceneVisibility(): void {
    if (this.actor) this.actor.visible = true;
    if (this.target) this.target.visible = this.scene !== 'ACTION_SOLO';
  }
}

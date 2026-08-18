// ═══════════════════════════════════════════════════════════
// DBZ LSW — ActionScene (vista de ACCIÓN: fondo action + luchadores grandes)
// ═══════════════════════════════════════════════════════════
// Plano ACTION_SOLO/ACTION_DUEL/PROJECTILE/IMPACT: fondo action (160×80 → 2×)
// + atacante y defensor grandes (FighterActor). Anchors/pivots por escenario y
// lado; separación ABSOLUTA entre posición táctica y posición cinematográfica:
// el luchador grande vive en coordenadas de ACTION, no en las del campo.
//
// M8.P0 — FIGHTER IDENTITY / SCENE OWNERSHIP:
//   Los dos FighterActor se añaden AL CONTAINER UNA SOLA VEZ (setFighters,
//   durante init). Cambiar quién ataca es SOLO un cambio de rol (setRoles):
//   NUNCA removeChild/addChild. ACTOR/TARGET son roles resueltos por getter
//   según el lado atacante — la identidad física de cada nodo permanece
//   estable durante toda la batalla (invariante: FighterActor count === 2).
//   Cambiar roles 1000 veces no reparenta ni duplica nodos.

import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { FighterActor } from '../actors/FighterActor';
import { BG_SCALE, BATTLE_LOGICAL_W } from '../config';
import { ACTION_GROUND_Y } from '../systems/MotionSystem';
import type { BattleSide } from '../../../data/facing';

// Posiciones cinematográficas por lado (px lógicos, campo 320×160):
//   left  (jugador) → x ≈ 96
//   right (enemigo) → x ≈ 224
export const ACTION_LEFT_X = 96;
export const ACTION_RIGHT_X = 224;
// Aliases de compatibilidad (consumidores previos)
export const ACTION_ACTOR_X = ACTION_LEFT_X;
export const ACTION_TARGET_X = ACTION_RIGHT_X;

export type ActionSceneMode = 'ACTION_SOLO' | 'ACTION_DUEL' | 'ACTION_TEAM' | 'PROJECTILE' | 'IMPACT';

export class ActionScene extends Container {
  private bg: Sprite | null = null;
  /** Identidad FIJA de cada lado — añadidos UNA vez (nunca se reparentan). */
  private leftFighter: FighterActor | null = null;
  private rightFighter: FighterActor | null = null;
  /** Rol semántico: quién ataca. actor/target se derivan por getter. */
  private attackerSide: BattleSide = 'left';
  private scene: ActionSceneMode = 'ACTION_DUEL';

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

  /**
   * M8.P0 — Registra los DOS luchadores de la batalla (UNA vez, durante
   * init). A partir de aquí la escena POSEE left/right fijos: cambiar roles
   * o planos jamás vuelve a tocar el parent. Si se llama dos veces con los
   * mismos actores, es no-op (idempotente).
   */
  setFighters(left: FighterActor | null, right: FighterActor | null): void {
    if (left && this.leftFighter !== left) {
      if (this.leftFighter) this.removeChild(this.leftFighter);
      this.leftFighter = left;
      left.setPos(ACTION_LEFT_X, ACTION_GROUND_Y);
      this.addChild(left);
    }
    if (right && this.rightFighter !== right) {
      if (this.rightFighter) this.removeChild(this.rightFighter);
      this.rightFighter = right;
      right.setPos(ACTION_RIGHT_X, ACTION_GROUND_Y);
      this.addChild(right);
    }
    this.applySceneVisibility();
  }

  /** M8.P0 — Cambia QUIÉN ataca (rol). NO toca parents: los nodos ya cuelgan
   *  de la escena; solo cambia la semántica actor/target y la visibilidad. */
  setRoles(attacker: BattleSide): void {
    this.attackerSide = attacker;
    this.applySceneVisibility();
  }

  /** M8.P0 — ACTOR = rol, no nodo: el luchador del lado atacante. */
  getActor(): FighterActor | null {
    return this.attackerSide === 'left' ? this.leftFighter : this.rightFighter;
  }

  /** M8.P0 — TARGET = rol, no nodo: el luchador del lado defensor. */
  getTarget(): FighterActor | null {
    return this.attackerSide === 'left' ? this.rightFighter : this.leftFighter;
  }

  /** Lado atacante actual (para depuración/auditoría). */
  get attacker(): BattleSide {
    return this.attackerSide;
  }

  /** Nº de FighterActor realmente colgados de esta escena (auditoría M8.P0). */
  get fighterCount(): number {
    return (this.leftFighter ? 1 : 0) + (this.rightFighter ? 1 : 0);
  }

  /** Parents estables (auditoría M8.P0 — invariante: nunca cambian). */
  get fighterParents(): Array<FighterActor | null> {
    return [this.leftFighter, this.rightFighter];
  }

  setScene(scene: ActionSceneMode): void {
    this.scene = scene;
    this.applySceneVisibility();
  }

  /** Posición canónica del actor según el lado (para rush/move cinematográfico). */
  actorHomeX(): number {
    return this.attackerSide === 'left' ? ACTION_LEFT_X : ACTION_RIGHT_X;
  }

  /** Posición canónica del target según el lado. */
  targetHomeX(): number {
    return this.attackerSide === 'left' ? ACTION_RIGHT_X : ACTION_LEFT_X;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  /** M8.P0 — Matriz de visibilidad canónica:
   *  ACTION_SOLO → solo el ACTOR grande visible (target oculto)
   *  ACTION_DUEL/PROJECTILE/IMPACT → ambos grandes visibles
   *  (el SceneDirector controla FIELD ↔ ACTION; aquí solo lo interno). */
  private applySceneVisibility(): void {
    const solo = this.scene === 'ACTION_SOLO';
    const actor = this.getActor();
    const target = this.getTarget();
    if (actor) actor.visible = true;
    if (target) target.visible = !solo;
  }
}

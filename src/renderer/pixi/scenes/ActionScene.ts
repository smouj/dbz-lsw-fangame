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
import { ACTION_NATIVE_H, ACTION_NATIVE_W, ACTION_WORLD_SCALE } from '../config';
import { ACTION_GROUND_Y } from '../systems/MotionSystem';
import type { BattleSide } from '../../../data/facing';

// Posiciones cinematográficas por lado (px nativos ROM, plano 160×80).
// El contenedor ActionScene aplica ACTION_WORLD_SCALE una sola vez al dibujar.
//   left  (jugador) → x 48
//   right (enemigo) → x 112
export const ACTION_LEFT_X = 48;
export const ACTION_RIGHT_X = 112;
/** Optical anchors for SPECIAL_ACTION: move each fighter toward screen
 * centre while preserving the normal ACTION composition. */
export const ACTION_SPECIAL_LEFT_X = 56;
export const ACTION_SPECIAL_RIGHT_X = 104;
// Aliases de compatibilidad (consumidores previos)
export const ACTION_ACTOR_X = ACTION_LEFT_X;
export const ACTION_TARGET_X = ACTION_RIGHT_X;

/**
 * P0.4R-B7B3 — alcance de `applySceneVisibility()`.
 *
 * ROM_PHYSICAL: PROHIBIDO. Una película ROM-backed deriva la visibilidad de
 *   `ActionObjectRuntime` (side → binding → slot → slot.visible). Ninguna rama
 *   por `scene` decide visibilidad.
 * LEGACY: permitido temporalmente hasta B7B5.
 *
 * Gate: `verify:defender-action-physical` exige 0 llamadas desde el path ROM.
 */
export const APPLY_SCENE_VISIBILITY_SCOPE = 'LEGACY_ONLY' as const;

export type ActionSceneMode = 'ACTION_SOLO' | 'ACTION_DUEL' | 'ACTION_TEAM' | 'PROJECTILE' | 'IMPACT' | 'DEFENDER_ACTION';

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
    // Todos los hijos (BG, actors, ROM display) permanecen en coordenadas
    // nativas 160×80; la proyección a 320×160 ocurre aquí, una sola vez.
    this.scale.set(ACTION_WORLD_SCALE);
    this.label = `action-scene-native-${ACTION_NATIVE_W}x${ACTION_NATIVE_H}`;
  }

  setBackground(tex: Texture | null): void {
    if (this.bg) {
      this.removeChild(this.bg);
      this.bg.destroy({ texture: false });
      this.bg = null;
    }
    if (!tex) return;
    const s = new Sprite(tex);
    // La escena ya está escalada ×2. No escalar el asset por separado.
    s.scale.set(1, 1);
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
  /**
   * P0.4R-B7B4 — orden de pintado físico.
   *
   * Demostrado (ROM_STATIC_VERIFIED): el loop bank_001:$4769 invoca el render de
   * objetos con el objeto del SLOT0 primero, siempre (la rama $CA39 conserva
   * slot0-primero cuando el índice físico alterna).
   *
   * Relación con la prioridad visible: en OAM de GBC el índice menor tiene MÁS
   * prioridad (se pinta encima), así que slot0 —pintado primero— queda DELANTE.
   * En Pixi "delante" = hijo POSTERIOR. Por eso el primer pintado se coloca
   * antes en el orden de hijos.
   *
   * Reordena los DOS nodos estables: nunca reparenta ni duplica.
   */
  reorderFightersDrawnOrder(firstDrawn: FighterActor | null, secondDrawn: FighterActor | null): void {
    if (!firstDrawn || !secondDrawn) return;
    if (!this.children.includes(firstDrawn) || !this.children.includes(secondDrawn)) return;
    // El BG y la capa ROM Display deben permanecer detrás de los fighters.
    // Reordenar desde el índice 0 (la implementación anterior) podía poner el
    // actor por debajo del fondo y hacer que desapareciera en una reacción.
    const firstIndex = this.children.indexOf(firstDrawn);
    const secondIndex = this.children.indexOf(secondDrawn);
    const fighterBaseIndex = this.bg ? 1 : 0;
    if (firstIndex === secondIndex) return;
    this.setChildIndex(firstDrawn, fighterBaseIndex);
    this.setChildIndex(secondDrawn, fighterBaseIndex + 1);
  }

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
  }

  /** M8.P0 — Cambia QUIÉN ataca (rol). NO toca parents: los nodos ya cuelgan
   *  de la escena; solo cambia la semántica actor/target.
   *
   *  P0.4R-B7B5 — ya NO toca visibilidad: en la ruta ROM-backed la visibilidad
   *  la resuelve exclusivamente el binding físico (ACTION_OBJECT_BIND → slot →
   *  ActionObjectRuntime.active/visible). Una decisión por escena aquí competiría
   *  con esa autoridad. */
  setRoles(attacker: BattleSide): void {
    this.attackerSide = attacker;
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

  /**
   * P0.4R-B7B5 — `applySceneVisibility()` ELIMINADO.
   *
   * Era la matriz de visibilidad por escena:
   *   ACTION_SOLO → solo el ACTOR visible · DEFENDER_ACTION → solo el DEFENSOR
   *
   * Retirado como autoridad: en la ruta ROM-backed la visibilidad la resuelve
   * `ACTION_OBJECT_BIND → slot físico → ActionObjectRuntime.active/visible`
   * (B7B3). Dejar aquí una decisión por escena —o un guard `if (romPhysical)`—
   * mantendría una API muerta visible invitando a regresiones.
   *
   * Barrera: una película ROM_PHYSICAL nunca gobierna visibilidad por escena
   * (`verify:defender-action-physical` exige 0).
   */
}

// ═══════════════════════════════════════════════════════════
// DBZ LSW — BattlePresentation (contrato presentación ↔ motor)
// ═══════════════════════════════════════════════════════════
// El BattleTimeline NO debe conocer Pixi. Emite eventos por tick; un adaptador
// (PixiBattlePresentation) los traduce a este contrato mínimo. Así el
// Development Studio puede implementar después Debug/Recording presentaciones
// sin contaminar la lógica del combate.
//
//   Battle Core → BattleTimeline → BattlePresentation → PixiBattlePresentation
//                                                            → BattleRenderer
//
// Todos los métodos son IMPERATIVOS y deterministas: el frame mostrado es
// consecuencia del tick GBC (nunca setInterval/CSS duration/AnimatedSprite.play).

export type BattleScene =
  | 'FIELD'        // vista táctica: overworld sprites + posiciones
  | 'ACTION_SOLO'  // un personaje grande (Gather/support)
  | 'DEFENDER_ACTION' // M8.C2a: cámara en el DEFENSOR (preparación defensiva
                     // visual: guard idle · move local · support FX). Los
                     // mismos FighterActor — nunca reparent ni nuevos nodos.
  | 'ACTION_DUEL'  // ambos grandes (melee/guard/counter/stage)
  | 'ACTION_TEAM'  // dos actores aliados / secuencia conjunta (spec V2 §2)
  | 'PROJECTILE'   // beam/proyectil: release → travel → contact
  | 'IMPACT';      // golpe/explosión/block (plano corto)

export interface BattlePresentation {
  /** Cambia el plano cinematográfico (mapea SHOT). */
  setScene(scene: BattleScene): void;

  /** Pose del ATACANTE (mapea ACTOR_POSE). */
  setActorPose(pose: string): void;

  /** Pose del DEFENSOR (mapea TARGET_POSE). */
  setTargetPose(pose: string): void;

  /**
   * Inicia el rush/lunge del atacante: se desplaza hacia el rival durante
   * `durationTicks` frames GBC. La posición se calcula en `sync()` como
   * f(tick − rushStartTick), NO por tween(durationMs). (mapea RUSH)
   */
  moveActor(durationTicks: number): void;

  /** Crea un proyectil/beam (mapea PROJECTILE spawn). */
  spawnProjectile(kind: string, timing?: { spawnTick: number; contactTick: number }): void;

  /** Avanza/retrocede el proyectil: progress ∈ [0,1] (mapea PROJECTILE travel). */
  setProjectileProgress(progress: number): void;

  /** Impacto: hitstop + flash + shake + pose hurt/guard + VFX (mapea HIT_FRAME). */
  impact(): void;

  /** Sacudida/zoom de cámara: intensidad 0..1 (mapea CAMERA). */
  camera(shake: number): void;

  /** Vuelve al plano FIELD (mapea FIELD_RETURN). */
  returnToField(): void;

  /**
   * Sincroniza la presentación al tick GBC ABSOLUTO `tick` (reloj único).
   * El frame mostrado es f(tick, poseStartTick) — determinista a cualquier Hz.
   */
  sync(tick: number): void;
}

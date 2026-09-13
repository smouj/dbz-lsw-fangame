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

import type { RomMotionSegment } from '../../../battle/romMotionMath';
import type { BattlePosition } from '../../../data/positions';
import type { ActionObjectBinding, ActionObjectSlot } from '../../../battle/engine/presentation/ActionObjectRuntime';

export type { RomMotionSegment };

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
  /** Aplica el binding ROM actual a un ActionObject lógico. */
  bindActionObject?(slot: ActionObjectSlot, binding: ActionObjectBinding): void;  /** Libera el binding ROM actual sin asumir un lado físico. */
  unbindActionObject?(slot: ActionObjectSlot): void;
  /**
   * P0.4R-B7B2 — observabilidad del binding físico de slots. Permite demostrar
   * en Production que slot0/slot1 son roles físicos, no bandos.
   */
  actionObjectBindingObservation?(): import('../../../battle/engine/presentation/ActionObjectRuntime').ActionObjectBindingObservation;
  setActionObjectVisibilityForParticipant?(side: 'player' | 'enemy', visible: boolean): 0 | 1 | null;
  /** B7B2 — limpieza del binding al volver a FIELD (B6). */
  clearActionObjectBinding?(): void;
  /** Cambia el plano cinematográfico (mapea SHOT). */
  setScene(scene: BattleScene, background?: string): void;

  /** Aplica visibilidad explícita del timeline al actor o target. */
  setFighterVisibility(role: 'ACTOR' | 'TARGET', visible: boolean): void;

  /** Proyecta una posición táctica verificada al lado indicado. */
  setFighterPosition(side: 'player' | 'enemy', position: BattlePosition): void;

  /** Posición física absoluta de un ActionObject ROM, cuando el cue aporta X/Y. */
  setActionObjectPosition(slot: 0 | 1, x: number, y: number): void;

  /** Movimiento físico de un ActionObject ROM gobernado por ticks. */
  moveActionObject(slot: 0 | 1, dxPerTick: number, dyPerTick: number, durationTicks: number): void;

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

  /** Destello blanco de pantalla completa gobernado por ticks ROM. */
  flashWhite(durationTicks: number): void;

  /** Vuelve al plano FIELD (mapea FIELD_RETURN). */
  returnToField(): void;
  /**
   * P0.4R-B6C — release del display ROM ordenado por el contrato de salida
   * (display aún compuesto sin DISPLAY_CLEAR declarado). El presenter no decide
   * este teardown por su cuenta: lo ejecuta cuando el contrato lo indica.
   */
  releaseRomDisplayForField?(): void;

  /**
   * Aplica offset ROM-native al frame actual (desde ROM_PHYSICAL_FRAME).
   * Los offsets (offsetX, offsetY) provienen del MISMO frame record ROM que
   * durationTicks — nunca se obtiene timing de ROM y offsets de manifest.
   *
   * `slot` es el ActionObject ROM (0 | 1): slot 0 = participante activo (actor),
   * slot 1 = contraparte (target). El adaptador NO debe dropear el slot: aplicar
   * el offset al actor equivocado es un bug real (frame ROM correcto sobre el
   * luchador erróneo). Default slot 0 (actor) por compat.
   */
  applyFrameOffset(offsetX: number, offsetY: number, slot?: 0 | 1): void;

  /**
   * P0 ANIMATION OWNERSHIP — Declara la secuencia ROM de un ActionObject.
   * Los slots se mapean por ROL (slot 0 = actor, slot 1 = target), igual que
   * moveActionObject/setActionObjectPosition/applyFrameOffset: un mapping por
   * lado FIJO (slot0→left) rompe las acciones del enemigo (el actor es right).
   * Solo registra el track: NUNCA arranca playback ni cambia visibilidad.
   * (SPECIAL_HANDLER multi-slot: Tail, V-Ball, Purple Comet, P.Comet Z.)
   */
  setRomSequenceForSlot(slot: 0 | 1, resource: number, sequence: number): void;

  /**
   * P0 ANIMATION OWNERSHIP — Detiene el track del ActionObject (ROM $08).
   * Congela el frame actual y desactiva el avance (playback off). Un STOP no
   * oculta por sí mismo: la visibilidad la gobierna la siguiente cue/escena.
   */
  stopActionObject(slot: 0 | 1): void;

  /**
   * P0 SCENE-CAMERA — Inicia el movimiento ROM discreto del actor.
   * El desplazamiento se calcula por tick GBC: position = start + Σ(segment.dxPerTick × ticks).
   * Si se pasa `segments` (multi-segmento, p.ej. RUSH +4×24+2×1, CHARA -1×2·-2×2…), se usa
   * positionAtTick(segments, elapsed); si no, fallback uniforme deltaPx/durationTicks.
   * Reemplaza moveActor/easeOutCubic para cards compiladas por ROM.
   * Si se llama, anula cualquier rush activo previo.
   */
  moveActorByRomMotion(deltaPx: number, durationTicks: number, holdTicks: number, segments?: RomMotionSegment[]): void;

  /**
   * P0 SCENE-CAMERA — Inicia el movimiento ROM discreto del target.
   * (CHARA_EXIT/ENTRY usan moveActorByRomMotion — el miembro activo es el actor.
   *  Este método queda para motions no-actor explícitos.)
   */
  moveTargetByRomMotion(deltaPx: number, durationTicks: number, holdTicks: number, segments?: RomMotionSegment[]): void;

  /**
   * P0 CAMERA PRESENTER — Aplica desplazamiento progresivo de pantalla
   * (SCREEN_MOTION $0E). dxPerTick * elapsed, discrete, no easing.
   */
  applyScreenMotion(dxPerTick: number, durationTicks: number, restore: boolean): void;

  /**
   * P0 CAMERA PRESENTER — Restaura pantalla a posición base visual
   * (SCREEN_RESTORE $0F). Desactiva viewport HBlank; no destruye C405/C406.
   */
  applyScreenRestore(): void;

  /**
   * P0 CAMERA PRESENTER — Ejecuta el único path de pantalla ROM
   * (SCREEN_PATH $11). No hay pathId en la ROM.
   */
  applyScreenPath(durationTicks: number): void;

  /**
   * Sincroniza la presentación al tick GBC ABSOLUTO `tick` (reloj único).
   * El frame mostrado es f(tick, poseStartTick) — determinista a cualquier Hz.
   */
  sync(tick: number): void;
}

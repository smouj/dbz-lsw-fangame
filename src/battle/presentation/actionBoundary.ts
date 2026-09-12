// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B5 — ACTION ENTRY BOUNDARY CONTRACT (autoridad ÚNICA)
// ═══════════════════════════════════════════════════════════════════════
// Un solo sitio decide:
//   · qué efecto tiene un SCENE_LOAD según su modo  → sceneLoadEffect()
//   · en qué tick entra realmente ACTION             → resolveActionEntryBoundary()
//
// Consumidores (no deben reimplementar la lógica):
//   · ProductionRomPresentationAdapter  → sceneLoadEffect()
//   · combatObservability (espejo)      → sceneLoadEffect()
//   · verify:combat-camera-film         → resolveActionEntryBoundary()
//   · verify:action-entry-boundary      → resolveActionEntryBoundary()
//
// Modelo ROM (§182/§205): TACTICAL → prepare (gráficos VRAM $8E00 + macros
// $19/$1A) → palette transition → ACTION. La entrada visual a ACTION NO es el
// inicio del timeline.
//
// Puro: sin Pixi, sin runtime, sin fs.
// ═══════════════════════════════════════════════════════════════════════
import type { BattleTimeline, PresentationCue } from '../engine/presentation/PresentationCue';

export type SceneLoadMode = 'TACTICAL_TO_ACTION' | 'ACTION_READY' | 'RESTORE_TACTICAL';

/** Efecto único de un SCENE_LOAD. Única autoridad para adapter y clasificador. */
export type SceneLoadEffect = 'PREPARE' | 'ENTER_ACTION' | 'RESTORE_FIELD';

export function sceneLoadEffect(mode: SceneLoadMode | string | undefined): SceneLoadEffect {
  if (mode === 'TACTICAL_TO_ACTION') return 'PREPARE';
  if (mode === 'ACTION_READY') return 'ENTER_ACTION';
  return 'RESTORE_FIELD';
}

export interface ActionEntryBoundary {
  /** Inicio del film (tick del timeline). NO es la entrada a ACTION. */
  filmStartTick: number;
  /** Tick de la fase de preparación (SCENE_LOAD TACTICAL_TO_ACTION), si existe. */
  tacticalExitTick: number | null;
  /** Primera transición de paleta del film. */
  paletteStartTick: number | null;
  /** Ensamblado de BG ROM ($19/$1A), si lo hay. */
  bgAssemblyTick: number | null;
  /** Última transición de paleta antes de la entrada a ACTION (el display queda listo). */
  displayReadyTick: number | null;
  /** Tick en el que la escena ACTION se hace visible. */
  actionEntryTick: number | null;
  /** Primer cue visible de actor (animación/visibilidad) en/tras la entrada. */
  firstActorVisibleTick: number | null;
  /** Cue que justifica la entrada (para trazabilidad/errores). */
  entryCueType: PresentationCue['type'] | null;
  /** true si el timeline no declara entrada explícita y se usó el fallback documentado. */
  usedLegacyFallback: boolean;
}

const ACTION_VISIBLE_CUES = new Set<PresentationCue['type']>(['ANIMATION_START', 'FIGHTER_VISIBILITY', 'ROM_PHYSICAL_FRAME', 'FIGHTER_POSE']);

/**
 * Deriva el boundary de entrada a ACTION de un timeline compilado.
 *
 * Regla: la entrada a ACTION es el SCENE_LOAD con efecto ENTER_ACTION
 * (mode ACTION_READY). Si el timeline no lo declara, se cae al SCENE_LOAD
 * TACTICAL_TO_ACTION y se marca `usedLegacyFallback = true` (deuda visible,
 * nunca silenciosa).
 */
export function resolveActionEntryBoundary(timeline: BattleTimeline): ActionEntryBoundary {
  const entries = [...timeline.entries].sort((a, b) => a.cue.tick - b.cue.tick);

  let tacticalExitTick: number | null = null;
  let actionEntryTick: number | null = null;
  let entryCueType: PresentationCue['type'] | null = null;
  let paletteStartTick: number | null = null;
  let bgAssemblyTick: number | null = null;
  let displayReadyTick: number | null = null;

  for (const entry of entries) {
    const cue = entry.cue;
    if (cue.type === 'SCENE_LOAD') {
      const effect = sceneLoadEffect(cue.mode);
      if (effect === 'PREPARE' && tacticalExitTick === null) tacticalExitTick = cue.tick;
      if (effect === 'ENTER_ACTION' && actionEntryTick === null) {
        actionEntryTick = cue.tick;
        entryCueType = cue.type;
        displayReadyTick = paletteStartTick; // se refina abajo con la última paleta previa
      }
    }
    if (cue.type === 'PALETTE_TRANSITION') {
      if (paletteStartTick === null) paletteStartTick = cue.tick;
      if (actionEntryTick !== null && cue.tick < actionEntryTick) displayReadyTick = cue.tick;
    }
    if (cue.type === 'BG_ASSEMBLY' && bgAssemblyTick === null) bgAssemblyTick = cue.tick;
  }

  const usedLegacyFallback = actionEntryTick === null && tacticalExitTick !== null;
  if (usedLegacyFallback) {
    actionEntryTick = tacticalExitTick;
    entryCueType = 'SCENE_LOAD';
  }

  let firstActorVisibleTick: number | null = null;
  if (actionEntryTick !== null) {
    const visible = entries.find(e => ACTION_VISIBLE_CUES.has(e.cue.type) && e.cue.tick >= actionEntryTick!);
    firstActorVisibleTick = visible?.cue.tick ?? null;
  }

  return {
    filmStartTick: timeline.startTick,
    tacticalExitTick,
    paletteStartTick,
    bgAssemblyTick,
    displayReadyTick,
    actionEntryTick,
    firstActorVisibleTick,
    entryCueType,
    usedLegacyFallback,
  };
}

/** Ticks del contrato en orden, para mensajes de gate. */
export function describeActionEntryBoundary(b: ActionEntryBoundary): string {
  const f = (v: number | null) => (v === null ? '—' : String(v));
  return `film=${f(b.filmStartTick)} prepare=${f(b.tacticalExitTick)} palette=${f(b.paletteStartTick)} bg=${f(b.bgAssemblyTick)} displayReady=${f(b.displayReadyTick)} ACTION=${f(b.actionEntryTick)} actor=${f(b.firstActorVisibleTick)}${b.usedLegacyFallback ? ' [LEGACY_FALLBACK]' : ''}`;
}

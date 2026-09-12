// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B6 — ACTION EXIT BOUNDARY CONTRACT (ACTION → FIELD)
// ═══════════════════════════════════════════════════════════════════════
// Autoridad ÚNICA de la salida. Reutiliza sceneLoadEffect() de B5 para decidir
// qué SCENE_LOAD devuelve a FIELD — no reimplementa esa regla.
//
// Secuencia ROM de salida:
//   fin físico del film → STOP/UNBIND ActionObjects → projectile/FX cleanup
//   → DISPLAY_CLEAR si el programa lo declara → palette restore
//   → screen restore → FIELD_READY → TACTICAL visible/controlable
//
// El caso Support $00/$02 NO debe recibir un DISPLAY_CLEAR sintético: el clear
// llega con el teardown de ACTION y el presenter no limpia por su cuenta.
//
// Puro: sin Pixi, sin runtime, sin fs.
// ═══════════════════════════════════════════════════════════════════════
import type { BattleTimeline, PresentationCue } from '../engine/presentation/PresentationCue';
import { sceneLoadEffect } from './actionBoundary';

/** Cues que representan contenido físico del film (deben terminar antes de FIELD). */
const PHYSICAL_CUES = new Set<PresentationCue['type']>([
  'ANIMATION_START',
  'ROM_PHYSICAL_FRAME',
  'APPLY_FRAME_DELTA',
  'ACTION_OBJECT_FRAME',
  'ACTION_OBJECT_FRAME_OFFSET',
  'ACTION_OBJECT_POSITION',
  'ACTION_OBJECT_MOTION',
  'ACTION_OBJECT_DRAW_ORDER',
  'FIGHTER_MOTION',
  'FIGHTER_POSE',
  'FIGHTER_POSITION',
  'FIGHTER_VISIBILITY',
  'IMPACT',
  'PROJECTILE',
  'EFFECT',
  'AURA',
]);

/** Cues de FX/efectos que deben quedar limpios al volver a FIELD. */
const FX_CUES = new Set<PresentationCue['type']>([
  'EFFECT',
  'FX_LOAD',
  'FX_AUX',
  'SUPPORT_FX',
  'DEFENSE_FX',
  'ROM_FX_WINDOW',
  'PROJECTILE',
]);

export interface ActionExitBoundary {
  /** Último cue de contenido físico del film. */
  lastPhysicalCueTick: number | null;
  /** Último STOP de ActionObject. */
  actionObjectsStoppedTick: number | null;
  /** Último UNBIND de ActionObject. */
  actionObjectsUnboundTick: number | null;
  /** Último cue de proyectil. */
  projectileClearedTick: number | null;
  /** Último cue de FX. */
  fxClearedTick: number | null;
  /** DISPLAY_CLEAR declarado por el programa (null si la familia no lo declara). */
  displayClearTick: number | null;
  /** Última transición/restore de paleta antes de FIELD. */
  paletteRestoreTick: number | null;
  /** SCREEN_RESTORE del viewport. */
  screenRestoreTick: number | null;
  /** Tick en el que la escena vuelve a FIELD. */
  fieldReadyTick: number | null;
  /**
   * Fin autoritativo del film según el contrato. Los consumidores (player)
   * NO deben calcular su propio end tick desde `timeline.endTick`.
   */
  filmEndTick: number;
  /**
   * P0.4R-B6B/B6C — true si al llegar a FIELD queda display ROM compuesto
   * (BG_ASSEMBLY/DISPLAY_COMPOSE/paleta) SIN un DISPLAY_CLEAR declarado antes.
   * En ese caso el release lo ordena el CONTRATO (no un cue sintético y no el
   * presenter por su cuenta). Caso canónico: Support $00/$02.
   */
  displayResidualAtField: boolean;
  /** Cues de salida que ocurren DESPUÉS de FIELD_READY → residuo (debe ser 0). */
  residualAfterField: PresentationCue['type'][];
  /** true si el timeline no declara RESTORE y se usó endTick como fallback. */
  usedLegacyFallback: boolean;
}

/**
 * Deriva el boundary de salida de un timeline compilado.
 * `fieldReadyTick` es el SCENE_LOAD con efecto RESTORE_FIELD (autoridad B5).
 */
export function resolveActionExitBoundary(timeline: BattleTimeline): ActionExitBoundary {
  const entries = [...timeline.entries].sort((a, b) => a.cue.tick - b.cue.tick);

  const maxTick = (filter: (t: PresentationCue['type']) => boolean): number | null => {
    let best: number | null = null;
    for (const e of entries) if (filter(e.cue.type) && (best === null || e.cue.tick > best)) best = e.cue.tick;
    return best;
  };
  const firstTick = (type: PresentationCue['type']): number | null => entries.find(e => e.cue.type === type)?.cue.tick ?? null;

  let fieldReadyTick: number | null = null;
  for (const e of entries) {
    if (e.cue.type === 'SCENE_LOAD' && sceneLoadEffect(e.cue.mode) === 'RESTORE_FIELD') {
      fieldReadyTick = e.cue.tick;
      break;
    }
  }
  const usedLegacyFallback = fieldReadyTick === null;
  if (fieldReadyTick === null) fieldReadyTick = timeline.endTick;

  const boundary: ActionExitBoundary = {
    lastPhysicalCueTick: maxTick(t => PHYSICAL_CUES.has(t)),
    actionObjectsStoppedTick: firstTick('ACTION_OBJECT_STOP'),
    actionObjectsUnboundTick: firstTick('ACTION_OBJECT_UNBIND'),
    projectileClearedTick: maxTick(t => t === 'PROJECTILE'),
    fxClearedTick: maxTick(t => FX_CUES.has(t)),
    displayClearTick: firstTick('DISPLAY_CLEAR'),
    paletteRestoreTick: maxTick(t => t === 'PALETTE_TRANSITION' || t === 'PALETTE_LOAD'),
    screenRestoreTick: firstTick('SCREEN_RESTORE'),
    fieldReadyTick,
    filmEndTick: Math.max(timeline.endTick, fieldReadyTick),
    displayResidualAtField: false,
    residualAfterField: [],
    usedLegacyFallback,
  };

  // Residuo: cualquier cue físico/FX que siga vivo tras FIELD.
  const residuals = new Set<PresentationCue['type']>();
  for (const e of entries) {
    if (e.cue.tick <= boundary.fieldReadyTick!) continue;
    if (e.cue.type === 'SCENE_LOAD') continue; // el propio RESTORE
    if (PHYSICAL_CUES.has(e.cue.type) || FX_CUES.has(e.cue.type)) residuals.add(e.cue.type);
  }
  boundary.residualAfterField = [...residuals];

  // Display residual: hubo composición de display y ningún DISPLAY_CLEAR la cerró
  // antes de FIELD → el release lo ordena el contrato.
  const composed = entries.some(e => DISPLAY_COMPOSE_CUES.has(e.cue.type));
  const cleared = boundary.displayClearTick !== null && boundary.displayClearTick <= boundary.fieldReadyTick!;
  boundary.displayResidualAtField = composed && !cleared;

  return boundary;
}

const DISPLAY_COMPOSE_CUES = new Set<PresentationCue['type']>([
  'BG_ASSEMBLY',
  'DISPLAY_COMPOSE',
  'PALETTE_LOAD',
  'PALETTE_TRANSITION',
]);

/** ¿El cue deja contenido vivo que FIELD debe haber limpiado? Autoridad única. */
export function isExitResidualCue(type: PresentationCue['type']): boolean {
  return PHYSICAL_CUES.has(type) || FX_CUES.has(type);
}

/** Ticks del contrato de salida en orden, para mensajes de gate. */
export function describeActionExitBoundary(b: ActionExitBoundary): string {
  const f = (v: number | null) => (v === null ? '—' : String(v));
  return `physicalEnd=${f(b.lastPhysicalCueTick)} stop=${f(b.actionObjectsStoppedTick)} unbind=${f(b.actionObjectsUnboundTick)} proj=${f(b.projectileClearedTick)} fx=${f(b.fxClearedTick)} displayClear=${f(b.displayClearTick)} palette=${f(b.paletteRestoreTick)} screen=${f(b.screenRestoreTick)} FIELD=${f(b.fieldReadyTick)} residual=[${b.residualAfterField.join(',')}]${b.usedLegacyFallback ? ' [LEGACY_FALLBACK]' : ''}`;
}

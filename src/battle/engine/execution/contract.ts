// ═══════════════════════════════════════════════════════════════════════
// M8 — EXECUTION CONTRACT (contrato común de ejecución de handlers ROM)
// ═══════════════════════════════════════════════════════════════════════
// Formaliza la ejecución de una técnica tal y como la ROM la gobierna:
// el handler (byte +05) reproduce secuencias del AnimationResource (byte
// +06) y cambia de estado cuando corresponde — TODOS los tiempos en ticks
// GBC reales, sin temporizadores inventados.
//
// TRES CAPAS SEPARADAS (nunca mezclar):
//   1. ROM raw        → frames [metasprite, durationTicks, ΔY, ΔX]
//   2. Handler        → máquina de estados del handler ($02/$05/$07/$0A/…)
//   3. Presentation   → carga/lanzamiento/proyectil/impacto/retorno (Pixi)
//
// PROVENANCE — cada dato declara su origen (crítico para no confundir lo
// inferido con lo canónico):
//   ROM_CONFIRMED        leído directamente de la ROM (frames/ticks)
//   HANDLER_INFERRED     deducido de la rutina del handler (estados)
//   PRESENTATION_DERIVED derivado de ROM+handler (eventos de presentación)
//   REMAKE_FALLBACK      decisión del remake sin evidencia ROM
// ═══════════════════════════════════════════════════════════════════════

/** Origen de cada dato — evita que lo inferido pase por canónico. */
export type Provenance =
  | 'ROM_CONFIRMED'
  | 'HANDLER_INFERRED'
  | 'PRESENTATION_DERIVED'
  | 'REMAKE_FALLBACK';

/** Fases del contrato común de ejecución (orden canónico). */
export type ExecutionPhase =
  | 'ACTION_BEGIN'          // entrada: el engine acepta la técnica
  | 'LOAD_RESOURCE'         // cargar AnimationResource + FX (handler)
  | 'SETUP_ACTOR'           // colocar actor / poses iniciales
  | 'CHARGE'                // windup / carga (el hold 60t vive aquí)
  | 'RELEASE'               // liberación del golpe/proyectil
  | 'PROJECTILE_TRAVEL'     // viaje del proyectil / aproximación
  | 'APPROACH'              // melee: acercamiento al objetivo
  | 'IMPACT'                // contacto del golpe
  | 'TARGET_REACTION'       // reacción del objetivo (hurt/flash)
  | 'RECOVERY'              // vuelta del actor a la pose neutral
  | 'RETURN_TO_TACTICAL';   // transición de vuelta al plano táctico

/** Evento de ejecución con tick absoluto y provenance. */
export interface ExecutionEvent {
  /** Tick GBC absoluto desde ACTION_BEGIN (59.7275 fps). */
  tick: number;
  phase: ExecutionPhase;
  /** Descripción legible del paso (para trazas y auditoría). */
  label: string;
  provenance: Provenance;
  /** Detalle extra: qué secuencia/frame del recurso reproduce. */
  detail?: string;
}

/** Un frame de la ROM ya resuelto a la fase que representa en el handler. */
export interface MappedFrame {
  /** Índice dentro de la secuencia (para trazas). */
  index: number;
  meta: number;
  ticks: number;
  dy: number;
  dx: number;
  /** Fase del contrato a la que el handler asigna este frame. */
  phase: ExecutionPhase;
  /** Tick absoluto de inicio del frame. */
  startTick: number;
  /** Tick absoluto de fin (exclusivo). */
  endTick: number;
}

/** Plan de ejecución completo de una técnica (compilado del profile ROM). */
export interface ExecutionPlan {
  /** Técnica ('Kamehameha'). */
  technique: string;
  /** Selector de handler (byte +05 de la tabla ROM). */
  handler: number;
  /** Recurso de animación (byte +06). */
  animationResource: number;
  /** Recurso FX (byte +07). */
  fxResource: number;
  /** Paleta FX (byte +08). */
  palette: number;
  /** Duración total en ticks GBC (secuencia principal del actor). */
  totalTicks: number;
  /** Frames mapeados por fase (handler semantics). */
  frames: MappedFrame[];
  /** Eventos de ejecución en orden cronológico. */
  events: ExecutionEvent[];
  /** Duración en ms a 59.7275 fps (solo presentación). */
  durationMs: number;
  /** Secuencias ALTERNATIVAS del recurso (variantes facing/posición). */
  variants: Array<{ index: number; totalTicks: number; frameCount: number }>;
}

/** Semántica de un frame: a qué fase del contrato pertenece. */
export type FrameSemantics =
  | 'idle'        // pose neutra / espera
  | 'charge'      // windup / carga (pre-release)
  | 'release'     // frame de liberación
  | 'travel'      // avance del cuerpo/proyectil
  | 'recoil';     // retroceso post-impacto

export const FRAME_SEMANTIC_NAMES: Record<FrameSemantics, string> = {
  idle: 'idle', charge: 'charge', release: 'release', travel: 'travel', recoil: 'recoil',
};

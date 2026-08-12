// ═══════════════════════════════════════════════════════════
// DBZ LSW — Manifiesto semántico de sprites (plan del usuario, punto 5-6)
// ═══════════════════════════════════════════════════════════
// Cada frame del manifiesto V5 tiene un SIGNIFICADO (idle, anticipation,
// rush, contact, guard, hit, release…) y una DURACIÓN por frame en ticks.
// Prohibido elegir PNG "que parece" en runtime: la tabla es
// acción → plano → sprite → frame → tick → evento.
//
// Los nombres de pose del manifiesto V5 (import-v5-sprites.mjs):
//   idle / move / guard / attack_fwd / attack_ud / hurt / beam_charge /
//   beam_fire / power_up
// Aquí los mapeamos a roles semánticos con duración por frame (HYPOTHESIS
// hasta captura ROM: las duraciones son de la comunidad/feeling, no del ROM).

export type SemanticFrame =
  | 'idle'          // pose neutral (también durante el QTE, como el GBC)
  | 'anticipation'  // windup: preparar el golpe/beam (HOLD largo)
  | 'rush'          // desplazamiento hacia el rival
  | 'contact'       // instante del golpe (HOLD corto: 1-2 ticks)
  | 'follow_through'// recovery tras el golpe
  | 'guard'         // bloqueando/parando
  | 'hit'           // recibiendo daño
  | 'charge'        // cargando ki (beam)
  | 'release'       // soltando el beam
  | 'power'         // aura de poder (Gather/transformación)
  | 'hurt_pose';    // derrotado

export interface FrameSpec {
  semantic: SemanticFrame;
  /** Duración en ticks GBC (null = indefinido/pose estática). */
  ticks: number | null;
  /** Nombre de pose V5 que lo sirve (con fallbacks en POSE_FALLBACKS). */
  pose: string;
}

// Duración por frame recomendada (punto 6 del plan):
//   preparación 5 · anticipación 3 · contacto 1-2 · HOLD impacto 2-3 · recovery 5
// En pixel art mantener frames es lo que da peso; repartir uniformemente N
// frames entre imágenes mata el golpe.
export const FRAME_DURATIONS: Record<SemanticFrame, number> = {
  idle: 6,
  anticipation: 5,
  rush: 3,
  contact: 2,
  follow_through: 5,
  guard: 6,
  hit: 4,
  charge: 5,
  release: 3,
  power: 6,
  hurt_pose: 8,
};

// Secuencias semánticas por acción (qué frames y en qué orden).
export interface SemanticSequence {
  action: string;
  frames: FrameSpec[];
}

// Secuencias canónicas — el orden importa: HOLD en anticipation y contact es
// lo que hace que el golpe "entre". Los nombres de pose son los del
// manifiesto V5; resolveManifestPose aplica fallbacks si faltan.
export const SEMANTIC_SEQUENCES: Record<string, SemanticSequence> = {
  punch: {
    action: 'punch',
    frames: [
      { semantic: 'anticipation', ticks: 5, pose: 'attack_fwd' },
      { semantic: 'contact', ticks: 2, pose: 'attack_fwd' },
      { semantic: 'follow_through', ticks: 5, pose: 'idle' },
    ],
  },
  beam: {
    action: 'beam',
    frames: [
      { semantic: 'charge', ticks: 8, pose: 'beam_charge' },
      { semantic: 'release', ticks: 3, pose: 'beam_fire' },
      { semantic: 'follow_through', ticks: 5, pose: 'idle' },
    ],
  },
  guard: {
    action: 'guard',
    frames: [
      { semantic: 'guard', ticks: 8, pose: 'guard' },
    ],
  },
  hurt: {
    action: 'hurt',
    frames: [
      { semantic: 'hit', ticks: 6, pose: 'hurt' },
    ],
  },
  powerUp: {
    action: 'powerUp',
    frames: [
      { semantic: 'power', ticks: 10, pose: 'power_up' },
    ],
  },
  idle: {
    action: 'idle',
    frames: [
      { semantic: 'idle', ticks: null, pose: 'idle' },
    ],
  },
};

/** Auditoría: dado un set de poses V5 disponibles, comprobar que la secuencia
 *  puede servirse. Devuelve los huecos (para el modo ?debugCinematics=1). */
export function auditSequence(availablePoses: Set<string>, sequence: SemanticSequence): string[] {
  const missing: string[] = [];
  for (const f of sequence.frames) {
    if (!availablePoses.has(f.pose)) missing.push(`${sequence.action}.${f.semantic} (${f.pose})`);
  }
  return missing;
}

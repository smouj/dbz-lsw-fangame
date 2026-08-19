// ═══════════════════════════════════════════════════════════════════════
// M8.F0 — GBC CINEMATIC GROUND TRUTH (formato de evidencia)
// ═══════════════════════════════════════════════════════════════════════
// NUNCA codificar cinematografía "que parece razonable" como canon GBC.
// Este módulo define el formato de EVIDENCIA: una secuencia observada en
// vídeo/ROM con su fuente, timestamps y beats. Hasta que una secuencia se
// registre aquí con fidelity >= VIDEO_VERIFIED, el Timeline NO puede
// reclamar que reproduce el GBC.
//
//   REGLAS (manual/ROM)     → qué puede ocurrir        (BattleEngine)
//   CINEMATOGRAFÍA (vídeo)  → cómo se ve realmente     (GbcCinematicCanon)
//   ARQUITECTURA REMAKE     → cómo lo reproducimos     (EventLog→Timeline→Pixi)
//
// Regla de fidelidad (guardrail F0):
//   FRAME_VERIFIED      → puede llamarse CANON
//   VIDEO_VERIFIED      → puede llamarse CANON
//   ROM_ASSET_VERIFIED  → asset canónico, timing NO necesariamente
//   MANUAL_VERIFIED     → regla canónica, visual NO necesariamente
//   INFERRED            → jamás etiquetar como GBC canonical
// ═══════════════════════════════════════════════════════════════════════

// ── Plano (SHOT): qué vemos. SEPARADO de quién protagoniza (FOCUS).
//    NO hay escenas físicas inventadas tipo "DEFENDER_ACTION": la cámara
//    GBC se describe como SHOT + FOCUS (F0.3).
export type GbcShot =
  | 'FIELD'        // overview táctico (overworld sprites + posiciones)
  | 'ACTION'       // plano de acción (fondo action + luchador(es) grandes)
  | 'ACTION_DUEL'  // ambos luchadores grandes visibles
  | 'SPECIAL';     // fondo especial (beam/limit/support)

// ── Foco (FOCUS): quién protagoniza el plano — rol, no nodo físico.
export type GbcFocus =
  | 'NONE'         // FIELD puro (sin luchador grande)
  | 'ACTOR'        // el atacante del exchange
  | 'TARGET'       // el defensor del exchange
  | 'DEFENDER';    // el defensor en preparación (guard/move/support)

// ── Transición entre planos (TRANSITION) — separada del plano.
export type GbcTransition =
  | 'NONE'         // corte directo
  | 'CUT'          // cambio instantáneo
  | 'FADE_BLACK'   // fundido a negro
  | 'FLASH_WHITE'  // destello blanco (impacto/beam)
  | 'FLASH_BLACK'; // destello negro (inicio de acción)

// ── Nivel de fidelidad de la evidencia (guardrail F0).
export type GbcFidelity =
  | 'FRAME_VERIFIED'      // frames verificados contra ROM frame a frame
  | 'VIDEO_VERIFIED'      // verificado en vídeo de gameplay
  | 'ROM_ASSET_VERIFIED'  // asset canónico; timing NO necesariamente
  | 'MANUAL_VERIFIED'     // regla canónica; visual NO necesariamente
  | 'INFERRED';           // provisional — JAMÁS etiquetar como canon GBC

/** Un beat cinematográfico: qué se ve, con qué pose, durante qué frames. */
export interface GbcCinematicBeat {
  shot: GbcShot;
  /** Transición DESDE el beat anterior (NONE en el primero). */
  transition: GbcTransition;
  /** Foco del plano (NONE en FIELD puro). */
  focus: GbcFocus;
  /** Rol del luchador grande (si hay) — resolvible a FighterActor. */
  role?: 'ACTOR' | 'TARGET';
  /** Pose SEMÁNTICA (canon V9: family/role/variant/sequenceIndex). */
  pose?: string;
  /** Frame GBC inicial (0 = inicio de la secuencia). */
  startFrame: number;
  /** Frame GBC final (inclusive). */
  endFrame: number;
  /** Nota de observación (opcional): qué se ve / cómo transiciona. */
  note?: string;
}

/** Una secuencia cinematográfica OBSERVADA (evidencia, no especulación). */
export interface GbcCinematicSequence {
  /** id estable de la secuencia (p.ej. 'exchange_guard_x', 'melee_hit_cont_punch'). */
  id: string;
  /** Familia cinematográfica (F0.5): stage · melee · beam · guard · move… */
  family:
    | 'stage' | 'melee' | 'beam' | 'guard' | 'move'
    | 'gather' | 'support_defense' | 'support_offense'
    | 'limit' | 'counter_stage' | 'ko';
  /** Evidencia: de dónde sale esto y con qué fidelidad. */
  evidence: {
    source: string;          // vídeo/longplay URL · ROM dump · manual
    timestampStart: string;  // HH:MM:SS
    timestampEnd: string;
    fidelity: GbcFidelity;
  };
  /** Beats observados, en orden, con frames GBC. */
  beats: GbcCinematicBeat[];
}

// ═══════════════════════════════════════════════════════════════════════
// REGISTRO — secuencias VERIFICADAS.
// ═══════════════════════════════════════════════════════════════════════
// Vacío a propósito (F0.1): todavía NO hay vídeo local. Cada entrada se
// añade SOLO tras observar gameplay real (longplay 6:23:11 + vídeos GameFAQs).
// Mientras tanto, todo lo que el Timeline reproduce es INFERRED — así está
// etiquetado en buildTimeline (fidelity 'INFERRED'), y el Dev Studio lo
// muestra. Nada aquí puede llamarse "canon GBC" hasta tener evidencia.
export const GBC_CINEMATIC_CANON: GbcCinematicSequence[] = [];

// ── Familias a investigar (F0.5) — orden de la gramática del combate ──
export const GBC_CINEMATIC_FAMILIES: ReadonlyArray<{ id: string; label: string; priority: number }> = [
  { id: 'stage', label: 'Stage Attack completo', priority: 1 },
  { id: 'melee', label: 'Melee HIT', priority: 2 },
  { id: 'melee', label: 'Melee MISS', priority: 3 },
  { id: 'melee', label: 'Melee knockback back', priority: 4 },
  { id: 'melee', label: 'Melee knockback up', priority: 5 },
  { id: 'melee', label: 'Melee knockback down', priority: 6 },
  { id: 'beam', label: 'Ray beam', priority: 7 },
  { id: 'beam', label: 'Ball beam', priority: 8 },
  { id: 'beam', label: 'Beam HIT', priority: 9 },
  { id: 'beam', label: 'Beam BLOCK', priority: 10 },
  { id: 'beam', label: 'Beam AVOID', priority: 11 },
  { id: 'guard', label: 'Guard', priority: 12 },
  { id: 'move', label: 'Move horizontal', priority: 13 },
  { id: 'move', label: 'Move vertical', priority: 14 },
  { id: 'gather', label: 'Gather Power', priority: 15 },
  { id: 'support_defense', label: 'Support defensivo', priority: 16 },
  { id: 'support_offense', label: 'Support ofensivo', priority: 17 },
  { id: 'limit', label: 'Limit', priority: 18 },
  { id: 'counter_stage', label: 'Counter Stage', priority: 19 },
  { id: 'ko', label: 'KO', priority: 20 },
];

/** Guardrail F0: solo ciertas fidelidades pueden llamarse CANON GBC. */
export function isGbcCanon(fidelity: GbcFidelity): boolean {
  return fidelity === 'FRAME_VERIFIED' || fidelity === 'VIDEO_VERIFIED';
}

/** Devuelve la secuencia verificada de una familia (o null si es INFERRED). */
export function verifiedSequence(id: string): GbcCinematicSequence | null {
  return GBC_CINEMATIC_CANON.find(s => s.id === id) ?? null;
}

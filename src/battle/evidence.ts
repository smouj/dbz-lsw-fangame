// ═══════════════════════════════════════════════════════════════════════
// EVIDENCE — marco de confianza de la fidelidad GBC (FIDELITY V10).
// Cada regla del combate debe etiquetarse con su nivel de evidencia.
// PROHIBIDO mezclar niveles: una suite llamada verify:gbc NO convierte una
// hipótesis en comportamiento del GBC.
//
// Niveles:
//   MANUAL_CONFIRMED   — lo dice explícitamente el manual del juego
//   ROM_CONFIRMED      — extraído de datos/código de la ROM
//   FRAME_VERIFIED     — medido fotograma a fotograma en el juego final
//   COMMUNITY_VERIFIED — medición repetida fiable (no ROM)
//   INFERRED           — deducido por comportamiento
//   HYPOTHESIS         — provisional
//   UNKNOWN            — no debe inventarse
// ═══════════════════════════════════════════════════════════════════════

export type EvidenceLevel =
  | 'MANUAL_CONFIRMED'
  | 'ROM_CONFIRMED'
  | 'FRAME_VERIFIED'
  | 'COMMUNITY_VERIFIED'
  | 'INFERRED'
  | 'HYPOTHESIS'
  | 'UNKNOWN';

export interface RuleEvidence {
  rule: string;
  level: EvidenceLevel;
  note: string;
}

/** Registro de evidencia de las reglas estructurales del combate. */
export const RULE_EVIDENCE: RuleEvidence[] = [
  {
    rule: 'Mazo Joint = 20 cartas configuradas (nunca filtrado por compatibilidad al crear)',
    level: 'MANUAL_CONFIRMED',
    note: 'El manual describe "exactly 20 Joint Cards"; la compatibilidad es de la habilidad/personaje y se aplica al mostrar (carta gris). CHARA recalcula.',
  },
  {
    rule: 'Mano inicial 3 · drawPile 17 · +1 robo por Attack Phase',
    level: 'COMMUNITY_VERIFIED',
    note: 'Guía RPGClassics; pendiente confirmación ROM (captura forense).',
  },
  {
    rule: 'El mazo NO se rebaraja al agotarse (discardPile no es segunda baraja)',
    level: 'COMMUNITY_VERIFIED',
    note: 'RPGClassics: "una vez robadas las 20, no robas más aunque el combate continúe". Contradice el reshuffle anterior. Pendiente ROM.',
  },
  {
    rule: '+3 CC al entrar en Attack Phase (solo el atacante)',
    level: 'MANUAL_CONFIRMED',
    note: 'Manual GBC USA; también: Stage Attack +1 CC por acierto.',
  },
  {
    rule: 'HAND CHECK: hasta 6 cartas transitorias, máx 5 persistentes; si sobran, el jugador ELIGE cuál descartar',
    level: 'MANUAL_CONFIRMED',
    note: 'GameFAQs (thegromer). Nunca slice automático.',
  },
  {
    rule: 'Los STAT STAGES (±STR/KI/SPD/GUARD) persisten HASTA EL FINAL de la batalla (máx ±3 niveles)',
    level: 'MANUAL_CONFIRMED',
    note: 'Transcripción del manual + comunidad (legendarysuperwarriors.wordpress.com #06): solo una carta específica (powerup_dispel/support_dispel) los anula. NO caducan por turnos.',
  },
  {
    rule: 'GATHER POWER tiene duración (FULL_POWER → HALF_POWER → NORMAL), estado APARTE de los StatStages',
    level: 'MANUAL_CONFIRMED',
    note: 'El poder del gather se desvanece; los stats de las Support Cards no.',
  },
  {
    rule: 'Ventana total del Stage Attack según distancia: más cerca = más tiempo (1.2–2.9s)',
    level: 'MANUAL_CONFIRMED',
    note: 'Manual + review 2002. Los extremos (B/B 1.2s · F/F 2.9s) confirmados; las MIXTAS (1.7/2.4) son HYPOTHESIS hasta medición.',
  },
  {
    rule: 'Stage fail → RECOVERY_PROMPT: A = BANK (conserva CC, daño parcial posible) · B = REPAIR (continúa)',
    level: 'MANUAL_CONFIRMED',
    note: 'Manual (icono en ACTION SCREEN) + comunidad. La fórmula del daño parcial y las ventanas A/B (≈0.4/0.15s) son HYPOTHESIS.',
  },
  {
    rule: 'Defense Phase: sin CHARA; JOINT/LIMIT solo Defense/Support; BASIC = Defense | Move',
    level: 'MANUAL_CONFIRMED',
    note: 'GameFAQs (thegromer). El defensor decide ANTES de la película.',
  },
  {
    rule: 'TACTICAL ↔ ACTION: CORTE DURO (sin fade/zoom/blur)',
    level: 'COMMUNITY_VERIFIED',
    note: 'Gramática de planos documentada (CINEMATIC_GRAMMAR); sin evidencia de transiciones modernas en el GBC.',
  },
  {
    rule: 'Timings cinematográficos por técnica (beam/melee templates actuales)',
    level: 'INFERRED',
    note: 'actionProfiles los etiqueta como scaffolding; cada técnica (Cont.Punch ≠ Kamehameha…) necesita medición frame-a-frame → FRAME_VERIFIED.',
  },
  {
    rule: 'Reloj del combate: ticks GBC a 59.7275 Hz (un frame = 70224 ciclos)',
    level: 'ROM_CONFIRMED',
    note: 'Especificación del hardware (mGBA/Open Game Boy Docs). Todo el ritmo de gameplay debe expresarse en ticks.',
  },
  {
    rule: 'Patrón general de la IA enemiga (ataques → gather → 5-stage → beam/damage)',
    level: 'COMMUNITY_VERIFIED',
    note: 'RPGClassics describe el patrón; la state machine exacta (variaciones por CC/distancia/cartas) es UNKNOWN.',
  },
  {
    rule: 'El resultado de defensa cambia la película (HIT/BLOCK/AVOID/ABSORB poses y FX distintos)',
    level: 'INFERRED',
    note: 'Estructura correcta en los perfiles; las ramas visuales concretas pendientes de implementar/medir.',
  },
];

/** Nivel de una regla por nombre (consulta rápida). */
export function evidenceFor(rule: string): RuleEvidence | undefined {
  return RULE_EVIDENCE.find(r => r.rule === rule);
}

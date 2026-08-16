// ═══════════════════════════════════════════════════════════
// DBZ LSW — Secuencias canónicas de Stage Attack
// ═══════════════════════════════════════════════════════════
// El Stage Attack del GBC muestra en el panel inferior una secuencia de
// inputs que el jugador debe replicar a tiempo: A/B = golpes, cruceta =
// desplazamiento. El número de inputs = número del stage (3S=3, 6S=6).
//
// En lugar de generar la secuencia con Math.random() (impredecible, nada que
// ver con el original), usamos un POOL FIJO de secuencias canónicas por nivel
// y rotamos por un contador determinista (round-robin). El pool respeta la
// gramática del manual GBC:
//   - 3 Stage: solo A/B (golpes puros)
//   - 4 Stage: 3 golpes + 1 dirección (final)
//   - 5 Stage: 3 golpes + 2 direcciones
//   - 6 Stage: 3 golpes + 3 direcciones (ritmo: golpes → desplazamiento)
// Las direcciones se limitan a un eje por slot (nunca diagonales: spec §24)
// y alternan para no repetir el mismo eje seguido (natural de pegar/avanzar).
//
// Cobertura: los pools están construidos para que la rotación no repita la
// misma secuencia hasta agotar el pool completo del nivel.

import type { StageKey } from './stageInputMap';

export type StageLevel = 3 | 4 | 5 | 6;

/** Pool canónico por nivel. Entradas más probables primero (manual GBC). */
export const STAGE_SEQUENCE_POOL: Record<StageLevel, StageKey[][]> = {
  3: [
    ['A', 'B', 'A'],
    ['B', 'A', 'B'],
    ['A', 'A', 'B'],
    ['B', 'B', 'A'],
    ['A', 'B', 'B'],
    ['B', 'A', 'A'],
  ],
  4: [
    ['A', 'B', 'A', 'UP'],
    ['B', 'A', 'B', 'DOWN'],
    ['A', 'A', 'B', 'LEFT'],
    ['B', 'B', 'A', 'RIGHT'],
    ['A', 'B', 'B', 'UP'],
    ['B', 'A', 'A', 'DOWN'],
  ],
  5: [
    ['A', 'B', 'A', 'UP', 'LEFT'],
    ['B', 'A', 'B', 'DOWN', 'RIGHT'],
    ['A', 'A', 'B', 'LEFT', 'DOWN'],
    ['B', 'B', 'A', 'RIGHT', 'UP'],
    ['A', 'B', 'B', 'UP', 'RIGHT'],
    ['B', 'A', 'A', 'DOWN', 'LEFT'],
  ],
  6: [
    ['A', 'B', 'A', 'UP', 'LEFT', 'DOWN'],
    ['B', 'A', 'B', 'DOWN', 'RIGHT', 'UP'],
    ['A', 'A', 'B', 'LEFT', 'DOWN', 'RIGHT'],
    ['B', 'B', 'A', 'RIGHT', 'UP', 'LEFT'],
    ['A', 'B', 'B', 'UP', 'RIGHT', 'DOWN'],
    ['B', 'A', 'A', 'DOWN', 'LEFT', 'UP'],
  ],
};

/** ¿La secuencia usa alguna dirección (UP/DOWN/LEFT/RIGHT)? */
export function hasDirections(seq: StageKey[]): boolean {
  return seq.some(k => k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT');
}

/**
 * Contador de rotación determinista por nivel (persistido en módulo).
 * `nextStageSequence(level)` devuelve la siguiente secuencia del pool en
 * round-robin: la misma carta usada dos veces seguidas NO repite patrón
 * hasta agotar el pool (6 variantes por nivel).
 */
const rotationCounters: Record<StageLevel, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };

export function nextStageSequence(level: StageLevel): StageKey[] {
  const pool = STAGE_SEQUENCE_POOL[level];
  const seq = pool[rotationCounters[level] % pool.length];
  rotationCounters[level] = (rotationCounters[level] + 1) % pool.length;
  return [...seq];
}

/** Reinicia el contador de rotación (útil para tests / determinismo). */
export function resetStageRotation(level?: StageLevel): void {
  if (level) rotationCounters[level] = 0;
  else for (const k of Object.keys(rotationCounters) as unknown as StageLevel[]) rotationCounters[k] = 0;
}

/** Pool completo para debugging/UI (Dev Studio). */
export function stageSequencePoolFor(level: StageLevel): StageKey[][] {
  return STAGE_SEQUENCE_POOL[level].map(s => [...s]);
}

// ═══════════════════════════════════════════════════════════════════════
// LIMIT LOADOUT — contrato canónico de configuración de Limits
// ═══════════════════════════════════════════════════════════════════════
// Fuente: corpus ROM §47 (COMBAT_MECHANICS_ROM_CONFIRMED.md) + R5 (2026-08-24).
//
// La ROM diferencia tres capas:
//   compatibilidad de carta   → qué puede equipar el personaje
//   configuración persistente → qué Limits tiene equipados (registro 16B:
//                               +8 capacidad · +9.. cartas equipadas)
//   battle block              → copia del loadout para esta batalla
//                               (+03..17 = 5 bytes físicos POR MIEMBRO)
//
// ⚠️ GUARDRAIL SEMÁNTICO (NO borrar):
//   battle block +03..17 = 5 BYTES DE ALMACENAMIENTO por miembro
//   ≠ 5 LIMITS EQUIPABLES.
//   NUNCA derivar limitCapacity del width físico 5 del battle block.
//   Capacidad real: NORMAL 3 · registros con 2 (corpus §47, verificado R5).
// ═══════════════════════════════════════════════════════════════════════

import { LIMIT_DEFAULTS, type CharacterDef } from './roster';

/**
 * Capacidad semántica de Limits de un personaje.
 *
 * Derivada de la fuente canónica (LIMIT_DEFAULTS — loadout del walkthrough
 * ROM por personaje): la longitud del loadout por defecto ES la capacidad
 * real del registro persistente (+8 capacity). El piso documentado en la
 * ROM es 2 ("existen registros cuya capacidad es 2", corpus §47) — los
 * loadouts con 1/0 entradas son registros parciales, no capacidad 1/0.
 *
 * NUNCA devuelve 5. El battle block reserva 5 bytes físicos por miembro
 * (+03..17) pero eso es almacenamiento, no capacidad equipable.
 */
export function getLimitCapacity(characterId: string): number {
  const defaults = LIMIT_DEFAULTS[characterId] ?? [];
  // piso 2 = mínimo documentado en la ROM (registros con capacidad 2)
  return Math.max(2, defaults.length);
}

/** Definición del loadout por defecto (cartas equipadas por el walkthrough). */
export function getLimitLoadoutDefinition(characterId: string): number[] {
  return LIMIT_DEFAULTS[characterId] ?? [];
}

/** ¿El personaje tiene límites por defecto? (para diagnósticos Dev). */
export function hasDefaultLimitLoadout(characterId: string): boolean {
  return (LIMIT_DEFAULTS[characterId] ?? []).length > 0;
}

// ─── Persistencia (localStorage — mismo contrato que roster.loadLimits) ───

const STORAGE_KEY = 'dbzlsw_limits';

function readAll(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

/** Limits equipados guardados por el jugador ([] si nunca configurados). */
export function loadEquippedLimits(characterId: string): number[] {
  const all = readAll();
  if (Array.isArray(all[characterId])) return all[characterId];
  return getLimitLoadoutDefinition(characterId);
}

/** Guarda los Limits equipados (recortados a la capacidad real). */
export function saveEquippedLimits(characterId: string, ids: number[]): void {
  const cap = getLimitCapacity(characterId);
  const trimmed = ids.slice(0, cap);
  const all = readAll();
  all[characterId] = trimmed;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

/** Capacidad por personaje (mapa derivado — para diagnósticos/verifiers). */
export function limitCapacityMap(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of Object.keys(LIMIT_DEFAULTS)) out[c] = getLimitCapacity(c);
  return out;
}

/** Normaliza un loadout a la capacidad real (slots vacíos → 0 = EMPTY válido). */
export function normalizeLoadout(characterId: string, ids: number[]): number[] {
  const cap = getLimitCapacity(characterId);
  const out = (ids ?? []).slice(0, cap);
  while (out.length < cap) out.push(0);
  return out;
}

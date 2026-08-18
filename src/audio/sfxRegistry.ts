// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — SFX Registry (efectos GBC reales extraídos de la ROM)
// Fuente: docs/audio/ (paquete DBZ_LSW_GBC_AUDIO_EXTRACTION_V1) +
// src/data/generated/sfxCatalog.generated.ts (npm run canon:sfx).
//
// REGLA DE NOMBRES: las claves son ESTABLES (gbc_sfx_000…084). El
// significado semántico (menu_confirm, punch_hit, beam_fire…) NO se asigna
// por intuición: la tabla SEMANTIC_HYPOTHESIS contiene candidatos marcados
// como HYPOTHESIS basados en EVIDENCIA de canal/duración/traza APU y en las
// acciones actuales del juego (src/audio/sfx.ts). La verificación definitiva
// requiere los CALL-SITES de la ROM (escrituras a RAM 0xC878) — pendiente.
// ═══════════════════════════════════════════════════════════════════════

import { SFX_BY_KEY, SFX_CATALOG, type SfxCatalogEntry } from '../data/generated/sfxCatalog.generated';

export type { SfxCatalogEntry };

/** URL del WAV de un SFX canónico (asset servido por el runtime). */
export function sfxUrl(key: string): string | undefined {
  const e = SFX_BY_KEY[key];
  return e ? `/assets/${e.file}` : undefined;
}

/** Nivel de evidencia del mapeo semántico. */
export type SfxFidelity =
  | 'CALLSITE_VERIFIED'   // verificado contra la escritura 0xC878 en la ROM
  | 'HYPOTHESIS'          // inferido de canal/duración/traza + acción actual
  | 'UNMAPPED';           // sin candidato

export interface SfxSemanticEntry {
  /** Acción del juego (nombre canónico del Sfx en src/audio/sfx.ts). */
  action: string;
  /** Candidato (clave estable) — null si sin candidato. */
  key: string | null;
  fidelity: SfxFidelity;
  /** Evidencia: canal y duración del candidato (del catálogo). */
  evidence?: string;
}

/**
 * Mapeo semántico HYPOTHESIS: cruza las acciones REALES del juego
 * (src/audio/sfx.ts) con los candidatos del catálogo por canal+duración.
 * NADA aquí es CALLSITE_VERIFIED todavía — es la base de trabajo para la
 * pasada forense sobre la ROM (buscar LD A,nn / LD (C878),A).
 */
export const SFX_SEMANTICS: SfxSemanticEntry[] = [
  // ── UI / menú ──
  { action: 'cursor',      key: 'gbc_sfx_000', fidelity: 'HYPOTHESIS', evidence: 'CH2 corto (32f≈0.54s) — blip de cursor' },
  { action: 'select',      key: 'gbc_sfx_001', fidelity: 'HYPOTHESIS', evidence: 'CH2 (34f≈0.57s) — confirmación corta' },
  { action: 'confirm',     key: 'gbc_sfx_002', fidelity: 'HYPOTHESIS', evidence: 'CH2 (67f≈1.12s) — doble tono' },
  { action: 'cancel',      key: 'gbc_sfx_003', fidelity: 'HYPOTHESIS', evidence: 'CH2 corto (13f≈0.22s) — blip grave' },
  { action: 'star',        key: 'gbc_sfx_010', fidelity: 'HYPOTHESIS', evidence: 'CH2 (26f≈0.44s) — chispa' },
  // ── cartas / robo ──
  { action: 'cardPlay',    key: 'gbc_sfx_008', fidelity: 'HYPOTHESIS', evidence: 'CH2 largo (81f≈1.36s, 99 escrituras) — carta' },
  { action: 'draw',        key: 'gbc_sfx_009', fidelity: 'HYPOTHESIS', evidence: 'CH4 (34f≈0.57s) — fricción de mazo' },
  // ── combate físico ──
  { action: 'punch',       key: 'gbc_sfx_004', fidelity: 'HYPOTHESIS', evidence: 'CH4 (100f≈1.67s) — impacto ruidoso' },
  { action: 'kick',        key: 'gbc_sfx_005', fidelity: 'HYPOTHESIS', evidence: 'CH4 (144f≈2.41s) — impacto largo' },
  { action: 'hit',         key: 'gbc_sfx_006', fidelity: 'HYPOTHESIS', evidence: 'CH4 corto (12f≈0.20s) — golpe seco' },
  { action: 'guard',       key: 'gbc_sfx_007', fidelity: 'HYPOTHESIS', evidence: 'CH4 corto (12f≈0.20s) — bloqueo' },
  { action: 'dodge',       key: 'gbc_sfx_009', fidelity: 'HYPOTHESIS', evidence: 'CH4 (34f≈0.57s) — whoosh' },
  // ── energía / beam ──
  { action: 'beam',        key: 'gbc_sfx_008', fidelity: 'HYPOTHESIS', evidence: 'CH2 sostenido largo — haz' },
  { action: 'beamCharge',  key: 'gbc_sfx_010', fidelity: 'HYPOTHESIS', evidence: 'CH2 (26f≈0.44s) — carga' },
  { action: 'explosion',   key: 'gbc_sfx_005', fidelity: 'HYPOTHESIS', evidence: 'CH4 largo (144f≈2.41s) — explosión' },
  { action: 'powerUp',     key: 'gbc_sfx_008', fidelity: 'HYPOTHESIS', evidence: 'CH2 ascendente largo — power up' },
  { action: 'transform',   key: 'gbc_sfx_008', fidelity: 'HYPOTHESIS', evidence: 'CH2 sostenido — transformación' },
  // ── QTE / turnos ──
  { action: 'qteCorrect',  key: 'gbc_sfx_001', fidelity: 'HYPOTHESIS', evidence: 'CH2 corto agudo — blip OK' },
  { action: 'qteFail',     key: 'gbc_sfx_003', fidelity: 'HYPOTHESIS', evidence: 'CH2 corto grave — buzz' },
  { action: 'turnChange',  key: 'gbc_sfx_002', fidelity: 'HYPOTHESIS', evidence: 'CH2 doble tono — campanilla' },
  { action: 'move',        key: 'gbc_sfx_009', fidelity: 'HYPOTHESIS', evidence: 'CH4 whoosh — dash' },
  { action: 'position',    key: 'gbc_sfx_000', fidelity: 'HYPOTHESIS', evidence: 'CH2 blip — marcador' },
  // ── fin de combate ──
  { action: 'victory',     key: 'gbc_sfx_011', fidelity: 'HYPOTHESIS', evidence: 'CH2 SUSTAINED/LOOP (único candidato loop) — fanfarria' },
  { action: 'defeat',      key: 'gbc_sfx_002', fidelity: 'HYPOTHESIS', evidence: 'CH2 descendente — derrota' },
];

export const SFX_SEMANTICS_BY_ACTION: Record<string, SfxSemanticEntry> =
  Object.fromEntries(SFX_SEMANTICS.map(s => [s.action, s]));

export { SFX_CATALOG, SFX_BY_KEY };

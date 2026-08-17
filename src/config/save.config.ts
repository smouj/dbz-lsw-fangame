// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración del sistema de guardado
// ═══════════════════════════════════════════════════════════

export interface SaveConfig {
  /** [CANON] Versión del esquema (debe coincidir con game.saveVersion). */
  saveVersion: number;
  /** [TUNABLE] Autoguardado. */
  autosave: boolean;
  /** [TUNABLE] Número de slots. */
  saveSlots: number;
  /** [TUNABLE] Copias de seguridad por slot. */
  backupSaves: number;
  /** [TUNABLE] Estrategia de migración: 'auto' | 'manual' | 'reject'. */
  migrationStrategy: 'auto' | 'manual' | 'reject';
  /** [TUNABLE] Comprimir saves (gzip). */
  compression: boolean;
}

export const SAVE_CONFIG: SaveConfig = {
  saveVersion: 4,
  autosave: true,
  saveSlots: 3,
  backupSaves: 1,
  migrationStrategy: 'auto',
  compression: true,
};

export function validateSaveConfig(c: SaveConfig, expectedVersion: number): string[] {
  const issues: string[] = [];
  if (c.saveVersion !== expectedVersion) issues.push(`saveVersion ${c.saveVersion} != game.saveVersion ${expectedVersion}`);
  if (c.saveSlots < 1) issues.push('saveSlots < 1');
  return issues;
}

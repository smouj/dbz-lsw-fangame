// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración global del juego (CANON LOCKED)
// Fuente única de verdad para identidad, versión y canonicidad.
// Los campos marcados [CANON] NO deben editarse desde Dev Studio:
// cambian reglas del juego original. Los [TUNABLE] son ajustables.
// ═══════════════════════════════════════════════════════════

export interface GameConfig {
  /** [CANON] Identificador interno / packageId. */
  id: string;
  /** [TUNABLE] Título mostrado (branding). */
  title: string;
  /** [TUNABLE] Versión semver del producto. */
  version: string;
  /** [TUNABLE] Número de build (incremental, lo fija el release). */
  build: number;
  /** [TUNABLE] Canal de release: development | preview | release. */
  channel: 'development' | 'preview' | 'release';
  /** [TUNABLE] Idioma por defecto. */
  defaultLocale: string;
  /** [TUNABLE] Idiomas soportados. */
  supportedLocales: string[];
  /** [CANON] Versión del esquema de saves (migraciones por versión). */
  saveVersion: number;
  /** [CANON] Versión del dataset de datos del juego (cards/stats). */
  dataVersion: number;
  /** [CANON] Versión del contenido (textos/historias). */
  contentVersion: number;
  /** [TUNABLE] Resolución mínima soportada (w,h). */
  minResolution: [number, number];
  /** [TUNABLE] Resolución por defecto (w,h). */
  defaultResolution: [number, number];
  /** [TUNABLE] Arrancar en pantalla completa. */
  fullscreenDefault: boolean;
  /** [CANON] Pixel-perfect: escalado entero + nearest-neighbor. */
  pixelPerfect: boolean;
  /** [TUNABLE] Características de debug visibles en DEV. */
  debugFeatures: boolean;
  /** [TUNABLE] Modo desarrollador (acceso a rutas dev). */
  developerMode: boolean;
}

export const GAME_CONFIG: GameConfig = {
  id: 'dbz-lsw-remake',
  title: 'DBZ Legendary Super Warriors Remake',
  version: '0.8.0',
  build: 142,
  channel: 'development',
  defaultLocale: 'es',
  supportedLocales: ['es', 'en'],
  saveVersion: 4,
  dataVersion: 12,
  contentVersion: 3,
  minResolution: [800, 600],
  defaultResolution: [1280, 720],
  fullscreenDefault: false,
  pixelPerfect: true,
  debugFeatures: true,
  developerMode: true,
};

/** Campos CANON LOCKED: el Dev Studio no permite editarlos. */
export const GAME_CANON_FIELDS = new Set<keyof GameConfig>([
  'id', 'saveVersion', 'dataVersion', 'contentVersion', 'pixelPerfect',
]);

export function validateGameConfig(c: GameConfig): string[] {
  const issues: string[] = [];
  if (!/^\d+\.\d+\.\d+/.test(c.version)) issues.push('version no es semver');
  if (c.build < 0) issues.push('build negativo');
  if (c.saveVersion < 1) issues.push('saveVersion < 1');
  if (!/^[a-z0-9-]+$/.test(c.id)) issues.push('id con caracteres inválidos');
  if (c.defaultResolution[0] < c.minResolution[0] || c.defaultResolution[1] < c.minResolution[1]) {
    issues.push('defaultResolution menor que minResolution');
  }
  return issues;
}

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Feature flags
// Todo flag DEV_ONLY debe quedar INACCESIBLE en producción
// (ver build/release.config.ts: devStudio/cheats/debugRoutes off).
// ═══════════════════════════════════════════════════════════

export interface FeatureFlags {
  /** [CANON] Modo historia disponible. */
  storyMode: boolean;
  /** [CANON] Modo batalla disponible. */
  battleMode: boolean;
  /** [DEV_ONLY] Dev Studio (se excluye del bundle en release). */
  devStudio: boolean;
  /** [TUNABLE] Galería de cartas. */
  cardGallery: boolean;
  /** [DEV_ONLY] Batalla de debug. */
  debugBattle: boolean;
  /** [DEV_ONLY] Inspector de animaciones. */
  animationInspector: boolean;
  /** [DEV_ONLY] Inspector de sprites. */
  spriteInspector: boolean;
  /** [DEV_ONLY] Cheats. */
  cheats: boolean;
  /** [DEV_ONLY] Contador de FPS. */
  fpsCounter: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  storyMode: true,
  battleMode: true,
  devStudio: true,
  cardGallery: true,
  debugBattle: true,
  animationInspector: true,
  spriteInspector: true,
  cheats: true,
  fpsCounter: true,
};

export const DEV_ONLY_FEATURES = new Set<keyof FeatureFlags>([
  'devStudio', 'debugBattle', 'animationInspector', 'spriteInspector', 'cheats', 'fpsCounter',
]);

/** Dev-ONLY activos: en release deben ser 0 (bloquea la build). */
export function activeDevOnly(f: FeatureFlags): (keyof FeatureFlags)[] {
  return [...DEV_ONLY_FEATURES].filter(k => f[k]);
}

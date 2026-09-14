// ═══════════════════════════════════════════════════════════
// DBZ LSW — Selección del renderer del master shot
// ═══════════════════════════════════════════════════════════
// Función PURA y sin dependencias de pixi.js: puede importarse desde
// main.tsx sin arrastrar el bundle de Pixi (esencial para el code-split).
// El componente pesado (BattlePixiStage) se carga con React.lazy, por lo que
// el corte a Pixi no aumenta el coste del menú principal. Pixi es la ruta de
// producción; DOM queda disponible únicamente mediante un fallback explícito
// para comparar o recuperar una regresión visual.

/** True cuando BattleScreen usa la presentación Pixi ROM. */
export function isPixiField(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  // Fallback de diagnóstico deliberadamente explícito. `renderer=dom` se
  // acepta como alias legible para enlaces/manuales antiguos.
  if (params.has('domField') || params.get('renderer') === 'dom') return false;
  // Conservamos ?pixiField=0 como interruptor reversible para herramientas y
  // enlaces históricos; cualquier otro valor (incluido el flag sin valor) es
  // Pixi activo. Sin parámetros, Pixi es el renderer de producción.
  if (params.has('pixiField')) return params.get('pixiField') !== '0';
  return true;
}

/** Deployment truth consumed by Dev Studio; keep in sync with BattleScreen wiring. */
export const BATTLE_PRESENTATION_DEPLOYMENT = {
  defaultRenderer: 'PIXI_ROM',
  pixiActivation: 'DEFAULT',
  pixiQuery: 'pixiField=1',
  domFallbackQuery: 'domField=1',
  domFallbackAlias: 'renderer=dom',
  pixiActiveByDefault: true,
  completionOwnership: 'ROUTE_SCOPED',
  romCompletionRoutes: ['PLAYER_STANDARD_DAMAGE', 'ENEMY_STANDARD_DAMAGE'],
  legacyCompletionFallback: true,
  timelineLiveSurface: 'RUNTIME_SANDBOX',
} as const;

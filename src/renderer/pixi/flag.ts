// ═══════════════════════════════════════════════════════════
// DBZ LSW — Flag del master shot Pixi (dev)
// ═══════════════════════════════════════════════════════════
// Función PURA y sin dependencias de pixi.js: puede importarse desde
// main.tsx sin arrastrar el bundle de Pixi (esencial para el code-split).
// El componente pesado (BattlePixiStage) se carga con React.lazy y solo
// cuando este flag está activo.

/** True si el master shot Pixi del campo está activado (dev flag `?pixiField=1`). */
export function isPixiField(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pixiField');
}

/** Deployment truth consumed by Dev Studio; keep in sync with BattleScreen wiring. */
export const BATTLE_PRESENTATION_DEPLOYMENT = {
  defaultRenderer: 'DOM_LEGACY',
  pixiActivation: 'DEV_QUERY_FLAG',
  pixiQuery: 'pixiField=1',
  completionOwnership: 'ROUTE_SCOPED',
  romCompletionRoutes: ['PLAYER_STANDARD_DAMAGE'],
  legacyCompletionFallback: true,
  timelineLiveSurface: 'RUNTIME_SANDBOX',
} as const;

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración de render (pixel-art GBC)
// Lógica separada de Resolución: Logical (cuadrícula del arte) /
// Render (escalado entero) / Viewport (ventana del navegador).
// ═══════════════════════════════════════════════════════════

export interface RendererConfig {
  /** [CANON] Resolución lógica del pixel-art (cuadrícula). Neo-GBC PC 16:9. */
  logicalResolution: [number, number];
  /** [TUNABLE] Escala entera por defecto (render = logical * scale). */
  renderScale: number;
  /** [CANON] Escalado entero (nunca fracciones: destroza el pixel art). */
  integerScaling: boolean;
  /** [CANON] Nearest-neighbor (nunca bilinear en el arte). */
  nearestNeighbor: boolean;
  /** [TUNABLE] Aspect ratio forzado o 'free'. */
  aspectRatio: '16:9' | '4:3' | 'free';
  /** [TUNABLE] Letterboxing cuando el viewport no coincide. */
  letterboxing: boolean;
  /** [TUNABLE] Comportamiento HiDPI (1 = nativo, 2 = force). */
  hiDpi: number;
  /** [TUNABLE] Pantalla completa al arrancar. */
  fullscreen: boolean;
  /** [TUNABLE] VSync. */
  vsync: boolean;
  /** [TUNABLE] Cap de FPS (0 = sin cap). */
  fpsCap: number;
  /** [TUNABLE] Ventana redimensionable. */
  resizable: boolean;
}

export const RENDERER_CONFIG: RendererConfig = {
  logicalResolution: [320, 180],
  renderScale: 4,
  integerScaling: true,
  nearestNeighbor: true,
  aspectRatio: '16:9',
  letterboxing: true,
  hiDpi: 1,
  fullscreen: false,
  vsync: true,
  fpsCap: 0,
  resizable: true,
};

export const RENDERER_CANON_FIELDS = new Set<keyof RendererConfig>([
  'logicalResolution', 'integerScaling', 'nearestNeighbor',
]);

export function validateRendererConfig(c: RendererConfig): string[] {
  const issues: string[] = [];
  if (c.logicalResolution[0] <= 0 || c.logicalResolution[1] <= 0) issues.push('resolución lógica inválida');
  if (c.renderScale < 1 || !Number.isInteger(c.renderScale)) issues.push('renderScale debe ser entero ≥ 1');
  return issues;
}

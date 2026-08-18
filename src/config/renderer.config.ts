// ═══════════════════════════════════════════════════════════
// DBZ LSW — Configuración de render (pixel-art GBC)
// Lógica separada de Resolución: Logical (cuadrícula del arte) /
// Render (escalado entero) / Viewport (ventana del navegador).
// ═══════════════════════════════════════════════════════════

export interface RendererConfig {
  /** [CANON] Resolución lógica del pixel-art (cuadrícula). Neo-GBC PC 16:9. */
  logicalResolution: [number, number];
  /** [CANON] Resolución de DISEÑO (referencia de layout DOM 16:9).
   * 1280×720 = la autoridad de diseño; la fuente de coordenadas gameplay
   * sigue siendo logicalResolution (320×180). */
  designResolution: [number, number];
  /** [CANON] Relación de aspecto obligatoria del GameViewport. */
  aspectRatio: '16:9' | '4:3' | 'free';
  /** [TUNABLE] Escala entera por defecto (render = logical * scale). */
  renderScale: number;
  /** [TUNABLE] Política de escala del render: integer-preferred (nunca
   * fracciones: destroza el pixel art). 320×180 × {2,3,4,5,6,8} =
   * {640×360, 960×540, 1280×720, 1600×900, 1920×1080, 2560×1440}. */
  pixelScalePolicy: 'integer-preferred';
  /** [CANON] Escalado entero (nunca fracciones). */
  integerScaling: boolean;
  /** [CANON] Nearest-neighbor (nunca bilinear en el arte). */
  nearestNeighbor: boolean;
  /** [TUNABLE] Letterboxing cuando el viewport no coincide. */
  letterboxing: boolean;
  /** [TUNABLE] GameViewport canónico 16:9 (R1-R5): cuando false, el
   * viewport ocupa toda la ventana (comportamiento legacy idéntico —
   * .game-viewport sigue siendo container, así que cqw/cqh ≡ vw/vh);
   * cuando true, se centra con barras y las unidades cq* son relativas
   * al juego, no al navegador. */
  canonicalViewport: boolean;
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
  designResolution: [1280, 720],
  aspectRatio: '16:9',
  renderScale: 4,
  pixelScalePolicy: 'integer-preferred',
  integerScaling: true,
  nearestNeighbor: true,
  // ═══ R5 ✅ ACTIVADO: el canon 16:9 es el CONTRATO runtime por defecto.
  // 1280×720 diseño / 320×180 lógica / 16:9 exacto con letterbox. Las
  // unidades cq* ya están migradas (R2) y el StageHudPanel compartido (R3).
  letterboxing: true,
  canonicalViewport: true,
  hiDpi: 1,
  fullscreen: false,
  vsync: true,
  fpsCap: 0,
  resizable: true,
};

export const RENDERER_CANON_FIELDS = new Set<keyof RendererConfig>([
  'logicalResolution', 'designResolution', 'aspectRatio', 'integerScaling', 'nearestNeighbor', 'pixelScalePolicy',
]);

export function validateRendererConfig(c: RendererConfig): string[] {
  const issues: string[] = [];
  if (c.logicalResolution[0] <= 0 || c.logicalResolution[1] <= 0) issues.push('resolución lógica inválida');
  if (c.renderScale < 1 || !Number.isInteger(c.renderScale)) issues.push('renderScale debe ser entero ≥ 1');
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════
// ROM MODE (spike) — romModePixiLayout
// ═══════════════════════════════════════════════════════════════════════
// Último tramo de la cadena: convierte una RomModeScene en nodos listos para
// dibujar. Es una función PURA (sin Pixi importado) para poder verificarla
// headless; el consumidor solo coloca cada nodo en su contenedor.
//
//   ROM OAM → escena → layout (x, y, scaleX, anchor, textureUrl) → Pixi dibuja
//
// Puntos clave que vienen de la ROM y NO decide este módulo:
//   - la posición (del OAM)
//   - la orientación (facing ← flipX de OAM)
// Lo que sí decide: cómo se ancla y se escala NUESTRO sprite en esa posición.
// ═══════════════════════════════════════════════════════════════════════

import type { RomModeScene, RomModeFighter } from './feedToScene';

export interface RomModePixiNode {
  role: 'ally' | 'enemy';
  /** Centro del sprite en el espacio de pantalla GBC (160×144). */
  x: number;
  y: number;
  /** Espejo horizontal: 1 = normal, -1 = espejado. Derivado del `facing` de la ROM. */
  scaleX: 1 | -1;
  scaleY: 1;
  /** Ancla centrada en la base del sprite (los luchadores se apoyan en el suelo). */
  anchor: { x: number; y: number };
  /** Nuestro sprite resuelto (puede faltar si el resolver no lo conoce). */
  textureUrl?: string;
  /** Paleta CGB que usa la ROM para este lado (0/1). Útil para tintar o depurar. */
  cgbPalette: number;
}

export interface RomModePixiLayout {
  tick: number;
  /** Tamaño del "mundo" en unidades GBC; el consumidor lo escala a su viewport. */
  world: { width: number; height: number };
  nodes: RomModePixiNode[];
}

/** Ancla por defecto: centro horizontal, base del sprite (pies en el suelo). */
export const DEFAULT_ANCHOR = { x: 0.5, y: 1 } as const;

function nodeFrom(f: RomModeFighter): RomModePixiNode {
  return {
    role: f.role,
    x: f.screenX,
    y: f.screenY,
    // `facing` sale del flip de OAM. Nuestro sprite base mira a la derecha.
    scaleX: f.facing === 'right' ? 1 : -1,
    scaleY: 1,
    anchor: { ...DEFAULT_ANCHOR },
    textureUrl: f.spriteUrl,
    cgbPalette: f.cgbPalette,
  };
}

export function sceneToPixiLayout(scene: RomModeScene): RomModePixiLayout {
  return {
    tick: scene.tick,
    world: { width: 160, height: 144 },
    nodes: scene.fighters.map(nodeFrom),
  };
}

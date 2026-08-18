// ═══════════════════════════════════════════════════════════════════════
// GameViewport — VIEWPORT CANÓNICO 16:9 de DBZ LSW Fangame (R1-R5).
// ═══════════════════════════════════════════════════════════════════════
// Todas las pantallas runtime (main menu, story, dialogue, battle, deck,
// characters, settings, versus, loading, dev studio) viven DENTRO de este
// rectángulo. El navegador solo aporta espacio disponible; la geometría
// interna se mide SIEMPRE contra el viewport del juego.
//
//   NAVEGADOR                        GAME VIEWPORT (16:9)
//   ┌──────────────────────┐         ┌──────────────────┐
//   │  ┌────────────────┐  │         │  lógica 320×180  │
//   │  │ GAME VIEWPORT  │  │         │  target 1280×720 │
//   │  └────────────────┘  │         │  cqw/cqh = % del │
//   └──────────────────────┘         │  JUEGO, no browser│
//                                    └──────────────────┘
//
// MIGRACIÓN RETROCOMPATIBLE: .game-viewport es SIEMPRE un container
// (container-type: size). Con canonicalViewport=false ocupa toda la ventana
// → cqw ≡ vw y cqh ≡ vh (resultado visual IDÉNTICO al legacy). Con
// canonicalViewport=true se centra con letterbox y las unidades cq* pasan
// a ser relativas al rectángulo del juego. La migración de vw/vh → cq* se
// puede hacer ANTES de activar el flag sin romper nada.
// ═══════════════════════════════════════════════════════════════════════

import { type ReactNode } from 'react';
import { RENDERER_CONFIG } from '../config/renderer.config';

export const GAME_LOGICAL_W = RENDERER_CONFIG.logicalResolution[0];   // 320
export const GAME_LOGICAL_H = RENDERER_CONFIG.logicalResolution[1];   // 180
export const GAME_DESIGN_W = RENDERER_CONFIG.designResolution[0];     // 1280
export const GAME_DESIGN_H = RENDERER_CONFIG.designResolution[1];     // 720
export const GAME_ASPECT = `${RENDERER_CONFIG.aspectRatio}` as const; // '16:9'

export interface GameViewportProps {
  children: ReactNode;
  /** Dev Studio: true → el viewport interno se comporta como preview
   * (se puede forzar tamaño de presets de prueba sin letterbox real). */
  previewMode?: boolean;
}

/**
 * Shell + Viewport canónico. Envuelve TODA la app runtime.
 */
export function GameViewport({ children, previewMode = false }: GameViewportProps) {
  const canonical = RENDERER_CONFIG.canonicalViewport || previewMode;
  return (
    <div className={`game-shell ${canonical ? 'canonical' : 'legacy'}`}
      data-aspect={GAME_ASPECT}
      data-design={`${GAME_DESIGN_W}x${GAME_DESIGN_H}`}
      data-logical={`${GAME_LOGICAL_W}x${GAME_LOGICAL_H}`}>
      <div className="game-viewport">
        {children}
      </div>
    </div>
  );
}

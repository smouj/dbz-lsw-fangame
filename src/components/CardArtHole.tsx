// ═══════════════════════════════════════════════════════════════════════
// CardArtHole — arte de carta centrado PERFECTAMENTE en el recuadro BLANCO
// interior del frame GBC.
//
// UNA sola fuente de verdad para JOINT (mano) · STAGE (BASIC) · LIMIT.
//
// El arte se rellena SOLO el recuadro blanco del frame (el hueco interior
// donde el GBC dibuja la ilustración) — NUNCA el máximo del botón.
//
// SIN FitArt: el navegador centra con object-fit: cover + object-position:
// center (los iconos card_XXX llenan su canvas 32×24 → sin redondeos a
// mano, sin 1px de error, centrado perfecto garantizado por el engine).
// ═══════════════════════════════════════════════════════════════════════
import { useFrameHole } from './FrameHole';

export function CardArtHole({ frameUrl, iconUrl, className }: {
  frameUrl: string | undefined;
  iconUrl: string | undefined;
  className?: string;
}) {
  const hole = useFrameHole(frameUrl);
  // Fallback: el recuadro blanco canónico (18,18 · 60×44) hasta medir
  const box = hole ?? { left: 18, top: 18, width: 60, height: 44 };
  return (
    <div className={`card-art ${className ?? ''}`}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
      {iconUrl
        ? <img src={iconUrl} alt="" className="card-art-img" draggable={false} />
        : <span className="card-icon-emoji">?</span>}
    </div>
  );
}

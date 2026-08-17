// ═══════════════════════════════════════════════════════════════════════
// CardArtHole — arte de carta posicionado EXACTAMENTE en el recuadro BLANCO
// interior del frame GBC.
//
// UNA sola fuente de verdad para JOINT (mano) · STAGE (BASIC) · LIMIT:
//   <CardArtHole frameUrl={...} iconUrl={...} />
//
// El arte se rellena SOLO el recuadro blanco del frame (el hueco interior
// donde el GBC dibuja la ilustración) — NUNCA el máximo del botón ni el
// bisel. La caja .card-art = recuadro blanco medido (60×44 en 18,18),
// overflow hidden; el FitArt escala el arte con un pequeño BLEED (+4px)
// para que cubra el blanco SIN dejar bordes, y el overflow recorta el
// exceso contra el marco.
// ═══════════════════════════════════════════════════════════════════════
import { FitArt } from './FitArt';
import { useFrameHole } from './FrameHole';

// Bleed del arte respecto al recuadro blanco: el arte se escala 4px más
// grande por lado para cubrir el blanco sin dejar bordes (el overflow
// hidden de .card-art recorta el exceso contra el marco del frame).
const BLEED = 4;

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
        ? <FitArt src={iconUrl} areaW={box.width + BLEED} areaH={box.height + BLEED} className="card-art-img" />
        : <span className="card-icon-emoji">?</span>}
    </div>
  );
}

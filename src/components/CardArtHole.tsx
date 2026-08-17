// ═══════════════════════════════════════════════════════════════════════
// CardArtHole — arte de carta posicionado EXACTAMENTE en el hueco real del
// frame GBC.
//
// UNA sola fuente de verdad para JOINT (mano) · STAGE (BASIC) · LIMIT:
//   <CardArtHole frameUrl={...} iconUrl={...} />
// mide el hueco interior del frame y coloca el arte (FitArt) dentro, SIN
// gap ni desplazamiento — sea cual sea el frame (los marcos varían 1px).
// ═══════════════════════════════════════════════════════════════════════
import { FitArt } from './FitArt';
import { useFrameHole } from './FrameHole';

export function CardArtHole({ frameUrl, iconUrl, className }: {
  frameUrl: string | undefined;
  iconUrl: string | undefined;
  className?: string;
}) {
  const hole = useFrameHole(frameUrl);
  // Fallback: la caja canónica (18,18 · 64×48) hasta que se mida el hueco
  const box = hole ?? { left: 18, top: 18, width: 64, height: 48 };
  return (
    <div className={`card-art ${className ?? ''}`}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
      {iconUrl
        ? <FitArt src={iconUrl} areaW={box.width} areaH={box.height} className="card-art-img" />
        : <span className="card-icon-emoji">?</span>}
    </div>
  );
}

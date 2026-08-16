// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Sprite Inspector
// Ver cualquier sprite con zoom nearest-neighbor, bbox del contenido
// opaco, porcentaje de transparencia y tamaño real (vía canvas).
// ═══════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { overworldUrl } from '../data/overworld';
import { COMBAT_REQUIRED_POSES, COMBAT_POSE_ORDER } from '../battle/spriteConfig';

interface FrameInfo {
  w: number; h: number;
  opaque: { x: number; y: number; w: number; h: number } | null;
  alphaPct: number;
}

export function SpritesModule() {
  const [formId, setFormId] = useState(Object.keys(FORMS)[0]);
  const [pose, setPose] = useState('idle');
  const [zoom, setZoom] = useState(4);
  const [showBbox, setShowBbox] = useState(true);
  const [info, setInfo] = useState<FrameInfo | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = FORMS[formId];
  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);
  // Poses del manifest (dinámico): incluye beam_ray/beam_ray_tip/gather_power
  // cuando existen. Las poses base SIEMPRE se listan primero (orden canónico).
  const [poses, setPoses] = useState<string[]>([...COMBAT_REQUIRED_POSES]);
  useEffect(() => {
    if (!manifestUrl) return;
    let cancelled = false;
    fetch(manifestUrl).then(r => r.ok ? r.json() : null).then((m: Record<string, unknown> | null) => {
      if (cancelled || !m) return;
      const known = COMBAT_POSE_ORDER.filter(p => Object.prototype.hasOwnProperty.call(m, p));
      const extras = Object.keys(m).filter(p => !COMBAT_POSE_ORDER.includes(p as typeof COMBAT_POSE_ORDER[number]));
      setPoses([...known, ...extras]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [manifestUrl]);
  // Si la pose seleccionada no existe en el manifest, volver a idle.
  useEffect(() => {
    if (poses.length > 0 && !poses.includes(pose)) setPose('idle');
  }, [poses, pose]);
  const src = dir ? spriteFrameUrl(formId, `${dir}_${pose}_00.png`) : undefined;
  const portrait = BATTLE_PORTRAITS[formId];
  const overworld = overworldUrl(formId);

  // Analizar el frame actual: tamaño real, bbox opaco, alpha
  useEffect(() => {
    if (!src) { setInfo(null); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      let minX = c.width, minY = c.height, maxX = -1, maxY = -1, transparent = 0;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const a = data[(y * c.width + x) * 4 + 3];
          if (a > 24) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          } else transparent++;
        }
      }
      const total = c.width * c.height;
      const opaque = maxX >= 0 ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
      setInfo({
        w: img.naturalWidth, h: img.naturalHeight,
        opaque,
        alphaPct: Math.round((transparent / total) * 100),
      });
      // dibujar el frame ampliado con bbox en el canvas de preview
      const cv = canvasRef.current;
      if (cv) {
        cv.width = img.naturalWidth * zoom;
        cv.height = img.naturalHeight * zoom;
        const cctx = cv.getContext('2d');
        if (cctx) {
          cctx.imageSmoothingEnabled = false;
          cctx.drawImage(img, 0, 0, cv.width, cv.height);
          if (showBbox && opaque) {
            cctx.strokeStyle = '#ffd700';
            cctx.lineWidth = 1;
            cctx.strokeRect(opaque.x * zoom, opaque.y * zoom, opaque.w * zoom, opaque.h * zoom);
          }
        }
      }
    };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, zoom, showBbox]);

  const frameLabel = useMemo(() => {
    if (!src) return null;
    const m = src.match(/([^/]+)\.png$/);
    return m ? m[1] : src;
  }, [src]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Sprite Inspector</h1>
        <p className="dev-sub">Frame real de la Sprite Database con análisis de alpha y bounding box.</p>
      </header>

      <div className="dev-sprites-layout">
        <div className="dev-sprite-controls">
          <label>Forma</label>
          <select value={formId} onChange={e => { setFormId(e.target.value); setPose('idle'); }}>
            {Object.keys(FORMS).map(fid => (
              <option key={fid} value={fid}>{FORMS[fid].character} / {FORMS[fid].form} ({fid})</option>
            ))}
          </select>

          <label>Pose</label>
          <div className="dev-pose-pills">
            {poses.map(p => (
              <button key={p} className={`dev-pose-pill ${pose === p ? 'active' : ''}`}
                disabled={!dir} onClick={() => setPose(p)}>{p}</button>
            ))}
          </div>

          <label>Zoom</label>
          <div className="dev-zoom-row">
            {[1, 2, 4, 8].map(z => (
              <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
            ))}
          </div>

          <label className="dev-check">
            <input type="checkbox" checked={showBbox} onChange={e => setShowBbox(e.target.checked)} />
            Bounding box (contenido opaco)
          </label>

          <div className="dev-sprite-meta">
            <div><span>frame</span><code>{frameLabel ?? '—'}</code></div>
            {info && (
              <>
                <div><span>size</span><code>{info.w} × {info.h}px</code></div>
                <div><span>bbox</span><code>{info.opaque ? `${info.opaque.x},${info.opaque.y} ${info.opaque.w}×${info.opaque.h}` : 'vacío'}</code></div>
                <div><span>alpha</span><code>{info.alphaPct}% transparente</code></div>
              </>
            )}
            <div><span>dir</span><code>{dir ?? '— (fallback sheet)'}</code></div>
          </div>
        </div>

        <div className="dev-sprite-preview">
          <div className="dev-checker-bg">
            <canvas ref={canvasRef} className="dev-sprite-canvas" />
            {!src && <div className="dev-empty">Sin sprite de combate para esta forma</div>}
          </div>
          <div className="dev-sprite-thumbs">
            <div className="dev-asset-frame small2"><img src={portrait} alt="" /></div>
            <div className="dev-asset-frame small2"><img src={overworld} alt="" /></div>
            <div className="dev-asset-frame small2">
              {manifestUrl
                ? <a className="dev-manifest-link" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json ↗</a>
                : <span className="dev-asset-missing">—</span>}
            </div>
            <div className="dev-asset-frame small2"><img src={src} alt="" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Animation Studio
// Timeline real de animaciones: reproduce una pose desde el
// manifest.json (fps/loop nativos del GBC) con play/pause/step,
// frame counter, playhead sobre la tira de frames y comparativa
// de renderizado nearest-neighbor (GBC) vs bilinear (escalado).
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';

interface ManifestFrame { name: string; file: string; w: number; h: number; }
interface ManifestPose { frame_count: number; fps: number; loop: boolean; frames: ManifestFrame[]; }
type Manifest = Record<string, ManifestPose>;

const FPS_CHOICES = [1, 3, 6, 7, 8, 10, 12, 15, 24, 30];

export function AnimationModule() {
  const [formId, setFormId] = useState('goku_base');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pose, setPose] = useState('idle');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fpsOverride, setFpsOverride] = useState<number | null>(null);
  const [loopOverride, setLoopOverride] = useState<boolean | null>(null);
  const [zoom, setZoom] = useState(4);
  const [smooth, setSmooth] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);

  // Cargar el manifest de la forma seleccionada
  useEffect(() => {
    let alive = true;
    setManifest(null); setLoadError(false); setFrame(0); setPlaying(false); setPose('idle');
    if (!manifestUrl) return;
    fetch(manifestUrl)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((m: Manifest) => { if (alive) setManifest(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [manifestUrl]);

  const poses = manifest ? Object.keys(manifest) : [];
  const poseData: ManifestPose | undefined = manifest ? manifest[pose] : undefined;
  const frames: ManifestFrame[] = poseData?.frames ?? [];
  const nFrames = frames.length;
  const nativeFps = poseData?.fps ?? 6;
  const nativeLoop = poseData?.loop ?? false;
  const fps = fpsOverride ?? nativeFps;
  const loop = loopOverride ?? nativeLoop;

  // Si la pose actual no existe en el manifest (formas con menos poses),
  // saltar a la primera disponible.
  useEffect(() => {
    if (manifest && poses.length > 0 && !manifest[pose]) setPose(poses[0]);
  }, [manifest, poses, pose]);

  // Red de seguridad: si el frame queda fuera de rango al cambiar de pose/forma,
  // reiniciar. (Durante el playback nunca sale de rango — el wrap es inline.)
  useEffect(() => {
    if (nFrames > 0 && frame >= nFrames) setFrame(0);
  }, [nFrames, frame]);

  // Playback por tiempo (requestAnimationFrame + avance por fps)
  // El wrap/stop se resuelve INLINE para no emitir nunca un frame fuera de rango.
  useEffect(() => {
    if (!playing || nFrames <= 1) return;
    let raf = 0;
    let last = performance.now();
    const step = 1000 / fps;
    const tick = (now: number) => {
      if (now - last >= step) {
        last = now;
        setFrame(f => {
          const next = f + 1;
          if (next < nFrames) return next;
          if (loop) return 0;
          return f; // hold en el último frame (el stop effect lo para)
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, nFrames, fps, loop]);

  // Secuencia sin loop: parar al llegar al último frame (reproduce una vez).
  useEffect(() => {
    if (!loop && playing && nFrames > 0 && frame >= nFrames - 1) setPlaying(false);
  }, [frame, nFrames, loop, playing]);

  // Dibujar el frame actual en el canvas (nearest o bilinear)
  useEffect(() => {
    const f = frames[frame];
    const cv = canvasRef.current;
    if (!f || !cv) { if (cv) { const c = cv.getContext('2d'); c?.clearRect(0, 0, cv.width, cv.height); } return; }
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current !== cv) return;
      cv.width = f.w * zoom;
      cv.height = f.h * zoom;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = smooth;
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
      }
    };
    img.src = spriteFrameUrl(formId, f.file);
  }, [frames, frame, zoom, smooth, formId]);

  const step = (d: number) => setFrame(f => {
    const next = f + d;
    if (next < 0) return loop ? nFrames - 1 : 0;
    if (next >= nFrames) return loop ? 0 : nFrames - 1;
    return next;
  });

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Animation Studio</h1>
        <p className="dev-sub">Timeline real desde <code>manifest.json</code> — fps/loop nativos del GBC, reproducibles y editables.</p>
      </header>

      {loadError && (
        <div className="dev-wip-banner">⚠ No se pudo cargar el manifest de esta forma.</div>
      )}

      <div className="dev-anim-layout">
        <div className="dev-sprite-controls">
          <label>Forma</label>
          <select value={formId} onChange={e => setFormId(e.target.value)}>
            {Object.keys(FORMS).map(fid => (
              <option key={fid} value={fid}>{FORMS[fid].character} / {FORMS[fid].form} ({fid})</option>
            ))}
          </select>

          <label>Pose</label>
          <div className="dev-pose-pills">
            {poses.map(p => (
              <button key={p} className={`dev-pose-pill ${pose === p ? 'active' : ''}`}
                disabled={!manifest} onClick={() => { setPose(p); setFrame(0); }}>{p}</button>
            ))}
            {!manifest && <span className="dev-dim">cargando…</span>}
          </div>

          <label>Zoom</label>
          <div className="dev-zoom-row">
            {[1, 2, 4, 8].map(z => (
              <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
            ))}
          </div>

          <label>fps</label>
          <div className="dev-pose-pills">
            <button className={`dev-pose-pill ${fpsOverride === null ? 'active' : ''}`}
              onClick={() => setFpsOverride(null)}>manifest ({nativeFps})</button>
            {FPS_CHOICES.map(f => (
              <button key={f} className={`dev-pose-pill ${fpsOverride === f ? 'active' : ''}`}
                onClick={() => setFpsOverride(f)}>{f}</button>
            ))}
          </div>

          <label className="dev-check">
            <input type="checkbox" checked={loop} onChange={e => setLoopOverride(e.target.checked)} />
            Loop {poseData ? `(manifest: ${nativeLoop ? 'on' : 'off'})` : ''}
          </label>

          <label className="dev-check">
            <input type="checkbox" checked={smooth} onChange={e => setSmooth(e.target.checked)} />
            Smooth (bilinear) vs nearest (GBC)
          </label>

          <div className="dev-sprite-meta">
            <div><span>dir</span><code>{dir ?? '— (sin V5)'}</code></div>
            <div><span>pose</span><code>{poseData ? `${pose} · ${nFrames} frames · ${nativeFps}fps` : '—'}</code></div>
          </div>
        </div>

        <div className="dev-anim-stage">
          <div className="dev-checker-bg">
            <canvas ref={canvasRef} className="dev-sprite-canvas" />
            {!manifest && !loadError && <div className="dev-empty">Cargando manifest…</div>}
            {manifest && nFrames === 0 && <div className="dev-empty">Pose sin frames</div>}
          </div>

          <div className="dev-anim-controls">
            <button className="dev-anim-btn" disabled={nFrames <= 1} onClick={() => setFrame(0)}>⏮</button>
            <button className="dev-anim-btn" disabled={nFrames <= 1} onClick={() => step(-1)}>◂</button>
            <button className="dev-anim-btn dev-anim-play" disabled={nFrames <= 1}
              onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶'}</button>
            <button className="dev-anim-btn" disabled={nFrames <= 1} onClick={() => step(1)}>▸</button>
            <button className="dev-anim-btn" disabled={nFrames <= 1} onClick={() => setFrame(nFrames - 1)}>⏭</button>
            <span className="dev-anim-counter">{nFrames > 0 ? `${frame + 1} / ${nFrames}` : '0 / 0'}</span>
          </div>

          <div className="dev-anim-timeline">
            {frames.map((f, i) => (
              <button key={f.file}
                className={`dev-anim-thumb ${i === frame ? 'active' : ''}`}
                onClick={() => setFrame(i)}
                title={f.name}>
                <img src={spriteFrameUrl(formId, f.file)} alt={f.name} />
                <span>{i}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

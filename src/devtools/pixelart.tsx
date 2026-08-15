// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Pixel Art Editor
// Pintor de píxeles profesional sobre los frames de combate:
// pincel / borrador / cuentagotas, paleta + selector de color,
// zoom, rejilla, undo/redo, guardar al proyecto o exportar PNG.
// La API de pintura es el propio Canvas 2D (pixel-perfect, sin deps).
// ═══════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import {
  type Manifest, type ManifestFrame,
  fetchManifest, saveToProject, dataUrlToBase64, downloadBlob, canvasToPngDataUrl,
} from './spriteEditing';

type Tool = 'pencil' | 'eraser' | 'picker' | 'colorEraser';

const PALETTE = [
  '#000000', '#ffffff', '#9ca1a8', '#5a5e66',
  '#f8d878', '#e8a050', '#d06830', '#a03828',
  '#4068c8', '#2848a0', '#183078',
  '#38a060', '#207040',
  '#8038a0', '#582878',
  '#f0f0f0', '#c0c0c0', '#808080', '#404040',
];

const ZOOMS = [2, 4, 8, 12, 16];

function hexToRgba(hex: string): [number, number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export function PixelArtModule() {
  const [formId, setFormId] = useState('goku_base');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [file, setFile] = useState<string>('');
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 30, h: 46 });
  const [newBlank, setNewBlank] = useState(false);
  const [newName, setNewName] = useState('custom_00');
  const [newW, setNewW] = useState(32);
  const [newH, setNewH] = useState(48);
  const [blankVersion, setBlankVersion] = useState(0);

  const [zoom, setZoom] = useState(8);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#d06830');
  const [grid, setGrid] = useState(true);

  // Borrador por color: referencia del color capturado al empezar el trazo
  const colorRef = useRef<[number, number, number] | null>(null);
  const COLOR_TOL = 48; // tolerancia RGB para coincidencia de color

  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const nativeRef = useRef<HTMLCanvasElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const undoRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const paintingRef = useRef(false);

  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);

  // Lista de frames disponibles (unión de todas las poses del manifest)
  const allFrames = useMemo<ManifestFrame[]>(() => {
    if (!manifest) return [];
    const seen = new Set<string>();
    const out: ManifestFrame[] = [];
    for (const p of Object.values(manifest)) {
      for (const f of p.frames) {
        if (!seen.has(f.file)) { seen.add(f.file); out.push(f); }
      }
    }
    return out;
  }, [manifest]);

  // Cargar manifest de la forma
  useEffect(() => {
    let alive = true;
    setManifest(null); setLoadError(false); setFile('');
    if (!manifestUrl || !dir) return;
    fetchManifest(manifestUrl, dir)
      .then(({ manifest: m }) => { if (alive) setManifest(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [manifestUrl, dir]);

  // Al cambiar de forma, seleccionar el primer frame disponible
  useEffect(() => {
    if (manifest && allFrames.length > 0) {
      const f = allFrames[0];
      setFile(f.file); setSize({ w: f.w, h: f.h }); setNewBlank(false);
    }
  }, [manifest, allFrames]);

  const nativeUrl = useMemo(() => {
    if (newBlank || !file || !formId) return null;
    return spriteFrameUrl(formId, file);
  }, [newBlank, file, formId]);

  // ─── Cargar imagen → canvas nativo ─────────────────────────
  useEffect(() => {
    const nc = nativeRef.current;
    if (!nc) return;
    clearUndo();
    setDirty(false);
    setStatus(null);

    if (newBlank) {
      nc.width = newW; nc.height = newH;
      setSize({ w: newW, h: newH });
      const ctx = nc.getContext('2d');
      ctx?.clearRect(0, 0, nc.width, nc.height);
      drawDisplay();
      return;
    }

    if (!nativeUrl) { nc.width = 0; nc.height = 0; drawDisplay(); return; }

    const img = new Image();
    img.onload = () => {
      nc.width = img.naturalWidth; nc.height = img.naturalHeight;
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
      const ctx = nc.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      drawDisplay();
    };
    img.onerror = () => { setStatus('⚠ No se pudo cargar el frame'); };
    img.src = `${nativeUrl}?t=${Date.now()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeUrl, newBlank, blankVersion, formId]);

  function clearUndo() { undoRef.current = []; redoRef.current = []; }

  function drawDisplay() {
    const nc = nativeRef.current, dc = displayRef.current;
    if (!nc || !dc) return;
    dc.width = Math.max(1, nc.width) * zoom;
    dc.height = Math.max(1, nc.height) * zoom;
    const ctx = dc.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dc.width, dc.height);
    if (nc.width > 0 && nc.height > 0) {
      ctx.drawImage(nc, 0, 0, dc.width, dc.height);
    }
    if (grid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= nc.width; x++) { ctx.moveTo(x * zoom + 0.5, 0); ctx.lineTo(x * zoom + 0.5, dc.height); }
      for (let y = 0; y <= nc.height; y++) { ctx.moveTo(0, y * zoom + 0.5); ctx.lineTo(dc.width, y * zoom + 0.5); }
      ctx.stroke();
    }
  }

  // Redibujar al cambiar zoom/rejilla
  useEffect(() => { drawDisplay(); }, [zoom, grid]);

  function snapshot() {
    const nc = nativeRef.current;
    if (!nc) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    undoRef.current.push(ctx.getImageData(0, 0, nc.width, nc.height));
    if (undoRef.current.length > 60) undoRef.current.shift();
    redoRef.current = [];
  }

  function undo() {
    const nc = nativeRef.current;
    if (!nc) return;
    const prev = undoRef.current.pop();
    if (!prev) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    redoRef.current.push(ctx.getImageData(0, 0, nc.width, nc.height));
    ctx.putImageData(prev, 0, 0);
    setDirty(true);
    drawDisplay();
  }

  function redo() {
    const nc = nativeRef.current;
    if (!nc) return;
    const next = redoRef.current.pop();
    if (!next) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    undoRef.current.push(ctx.getImageData(0, 0, nc.width, nc.height));
    ctx.putImageData(next, 0, 0);
    setDirty(true);
    drawDisplay();
  }

  const pixelFromEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const dc = displayRef.current;
    if (!dc) return null;
    const rect = dc.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / dc.width) / zoom);
    const y = Math.floor((e.clientY - rect.top) / (rect.height / dc.height) / zoom);
    const nc = nativeRef.current;
    if (!nc || x < 0 || y < 0 || x >= nc.width || y >= nc.height) return null;
    return { x, y };
  }, [zoom]);

  function paintAt(x: number, y: number) {
    const nc = nativeRef.current;
    if (!nc) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    if (tool === 'picker') {
      const d = ctx.getImageData(x, y, 1, 1).data;
      const hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      setColor(hex);
      return;
    }
    if (tool === 'eraser') {
      ctx.clearRect(x, y, 1, 1);
    } else if (tool === 'colorEraser') {
      // Solo borra píxeles del color capturado al iniciar el trazo
      const ref = colorRef.current;
      if (!ref) return;
      const d = ctx.getImageData(x, y, 1, 1).data;
      if (d[3] > 40 &&
          Math.abs(d[0] - ref[0]) <= COLOR_TOL &&
          Math.abs(d[1] - ref[1]) <= COLOR_TOL &&
          Math.abs(d[2] - ref[2]) <= COLOR_TOL) {
        ctx.clearRect(x, y, 1, 1);
      }
    } else {
      const [r, g, b, a] = hexToRgba(color);
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(x, y, 1, 1);
    }
    setDirty(true);
    drawDisplay();
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = pixelFromEvent(e);
    if (!p) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer sintético */ }
    paintingRef.current = true;
    if (tool === 'colorEraser') {
      // Capturar el color bajo el cursor como referencia del trazo
      const nc = nativeRef.current;
      const ctx = nc?.getContext('2d');
      if (nc && ctx) {
        const d = ctx.getImageData(p.x, p.y, 1, 1).data;
        colorRef.current = d[3] > 40 ? [d[0], d[1], d[2]] : null;
      }
    }
    snapshot();
    paintAt(p.x, p.y);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!paintingRef.current) return;
    const p = pixelFromEvent(e);
    if (!p) return;
    paintAt(p.x, p.y);
  }
  function onUp() { paintingRef.current = false; }

  function confirmNewBlank() {
    setNewBlank(true);
    setFile(newName ? `${newName}.png` : 'custom.png');
    setBlankVersion(v => v + 1);
    setStatus(null);
  }

  // ─── Flip (orientación) ────────────────────────────────────
  function flipHorizontal() {
    const nc = nativeRef.current;
    if (!nc) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    snapshot();
    const img = ctx.getImageData(0, 0, nc.width, nc.height);
    const d = img.data, w = nc.width, h = nc.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < Math.floor(w / 2); x++) {
        const a = (y * w + x) * 4, b = (y * w + (w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) { const t = d[a + k]; d[a + k] = d[b + k]; d[b + k] = t; }
      }
    }
    ctx.putImageData(img, 0, 0);
    setDirty(true);
    drawDisplay();
    setStatus('↔ Frame volteado horizontalmente');
  }

  function flipVertical() {
    const nc = nativeRef.current;
    if (!nc) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    snapshot();
    const img = ctx.getImageData(0, 0, nc.width, nc.height);
    const d = img.data, w = nc.width, h = nc.height;
    for (let y = 0; y < Math.floor(h / 2); y++) {
      for (let x = 0; x < w; x++) {
        const a = (y * w + x) * 4, b = ((h - 1 - y) * w + x) * 4;
        for (let k = 0; k < 4; k++) { const t = d[a + k]; d[a + k] = d[b + k]; d[b + k] = t; }
      }
    }
    ctx.putImageData(img, 0, 0);
    setDirty(true);
    drawDisplay();
    setStatus('↕ Frame volteado verticalmente');
  }

  // ─── Limpiar por color (todo el frame) ─────────────────────
  function eraseColorAll() {
    const nc = nativeRef.current;
    if (!nc) return;
    const ctx = nc.getContext('2d');
    if (!ctx) return;
    const [r, g, b] = hexToRgba(color);
    const img = ctx.getImageData(0, 0, nc.width, nc.height);
    const d = img.data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 40 &&
          Math.abs(d[i] - r) <= COLOR_TOL &&
          Math.abs(d[i + 1] - g) <= COLOR_TOL &&
          Math.abs(d[i + 2] - b) <= COLOR_TOL) {
        d[i + 3] = 0;
        n++;
      }
    }
    if (n > 0) {
      snapshot();
      ctx.putImageData(img, 0, 0);
      setDirty(true);
      drawDisplay();
      setStatus(`🧽 Borrados ${n} px del color ${color} (tolerancia ${COLOR_TOL})`);
    } else {
      setStatus(`Sin píxeles del color ${color} en este frame`);
    }
  }

  function selectExisting(f: string, w: number, h: number) {
    setNewBlank(false);
    setFile(f);
    setSize({ w, h });
    setStatus(null);
  }

  // ─── Guardar al proyecto / exportar ────────────────────────
  async function savePng() {
    const nc = nativeRef.current;
    if (!nc || !dir) return;
    const name = newBlank ? `${newName}.png` : (file || 'frame.png');
    try {
      const dataUrl = canvasToPngDataUrl(nc);
      await saveToProject(`sprites/${dir}/${name}`, dataUrlToBase64(dataUrl));
      setStatus(`✓ Guardado en sprites/${dir}/${name}`);
      setDirty(false);
      if (newBlank) { setNewBlank(false); setFile(name); }
    } catch (e) {
      setStatus(`⚠ Error al guardar: ${String(e)}`);
    }
  }

  function exportPng() {
    const nc = nativeRef.current;
    if (!nc) return;
    const name = newBlank ? `${newName}.png` : (file || 'frame.png');
    nc.toBlob(b => {
      if (b) downloadBlob(b, name);
    }, 'image/png');
    setStatus(`↓ Exportando ${name}`);
  }

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Pixel Art Editor</h1>
        <p className="dev-sub">Pinta / borra / corrige píxeles de los frames de combate. Guarda al proyecto o exporta PNG.</p>
      </header>

      {loadError && <div className="dev-wip-banner">⚠ No se pudo cargar el manifest de esta forma.</div>}

      <div className="dev-pixel-layout">
        <div className="dev-pixel-controls">
          <label>Forma</label>
          <select value={formId} onChange={e => setFormId(e.target.value)}>
            {Object.keys(FORMS).map(fid => (
              <option key={fid} value={fid}>{FORMS[fid].character} / {FORMS[fid].form} ({fid})</option>
            ))}
          </select>

          <label>Frame</label>
          <select value={newBlank ? '__blank' : file} onChange={e => {
            if (e.target.value === '__blank') { confirmNewBlank(); return; }
            const f = allFrames.find(x => x.file === e.target.value);
            if (f) selectExisting(f.file, f.w, f.h);
          }}>
            {allFrames.map(f => (
              <option key={f.file} value={f.file}>{f.file} ({f.w}×{f.h})</option>
            ))}
            <option value="__blank">＋ Nuevo frame en blanco…</option>
          </select>

          {newBlank && (
            <div className="dev-pixel-newblank">
              <label>Nombre (sin .png)</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} />
              <div className="dev-pixel-wh">
                <label>W <input type="number" min={1} max={256} value={newW} onChange={e => setNewW(Number(e.target.value))} /></label>
                <label>H <input type="number" min={1} max={256} value={newH} onChange={e => setNewH(Number(e.target.value))} /></label>
              </div>
              <button className="dev-btn" onClick={confirmNewBlank}>Crear lienzo</button>
            </div>
          )}

          <label>Herramienta</label>
          <div className="dev-tool-row">
            <button className={`dev-tool ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')} title="Pincel">🖊 Pincel</button>
            <button className={`dev-tool ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Borrador (transparente)">🧽 Borrar</button>
            <button className={`dev-tool ${tool === 'colorEraser' ? 'active' : ''}`} onClick={() => setTool('colorEraser')} title="Borrador por color: borra solo el color que capturas al clicar">🎯 Borrar color</button>
            <button className={`dev-tool ${tool === 'picker' ? 'active' : ''}`} onClick={() => setTool('picker')} title="Cuentagotas">💧 Tomar</button>
          </div>

          {tool === 'colorEraser' && (
            <div className="dev-tool-hint">
              🎯 Clic en un píxel: borra todos los del <strong>mismo color</strong> (tolerancia {COLOR_TOL}) al arrastrar.
              <br/>También puedes elegir el color en la paleta y usar <strong>Limpiar color</strong>.
            </div>
          )}

          <label>Color</label>
          <div className="dev-palette">
            {PALETTE.map(c => (
              <button key={c} className={`dev-swatch ${color.toLowerCase() === c ? 'active' : ''}`}
                style={{ background: c }} onClick={() => setColor(c)} title={c} />
            ))}
            <label className="dev-swatch dev-swatch-custom" title="Color personalizado">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            </label>
          </div>

          <label>Zoom</label>
          <div className="dev-zoom-row">
            {ZOOMS.map(z => (
              <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
            ))}
          </div>

          <label className="dev-check">
            <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} />
            Rejilla
          </label>

          <div className="dev-pixel-meta">
            <div><span>dir</span><code>{dir ?? '—'}</code></div>
            <div><span>frame</span><code>{file || '—'} · {size.w}×{size.h}</code></div>
            <div><span>estado</span><code>{dirty ? '● modificado' : 'sin cambios'}</code></div>
          </div>

          <div className="dev-pixel-actions">
            <button className="dev-btn dev-btn-primary" onClick={savePng} disabled={!file && !newBlank}>💾 Guardar al proyecto</button>
            <button className="dev-btn" onClick={exportPng} disabled={!file && !newBlank}>↓ Exportar PNG</button>
          </div>
          <div className="dev-pixel-actions dev-pixel-actions-secondary">
            <button className="dev-btn" onClick={flipHorizontal} disabled={!file && !newBlank} title="Voltear horizontalmente (cambiar orientación izquierda/derecha)">↔ Voltear H</button>
            <button className="dev-btn" onClick={flipVertical} disabled={!file && !newBlank} title="Voltear verticalmente">↕ Voltear V</button>
            <button className="dev-btn" onClick={eraseColorAll} disabled={!file && !newBlank} title={`Borrar todos los píxeles del color seleccionado (${color})`}>🧽 Limpiar color</button>
          </div>
          <p className="dev-hint">Pista: voltear cambia la orientación del frame (todos los sprites deben mirar a la derecha). Usa “Limpiar color” para quitar píxeles de color de fondo de golpe.</p>
        </div>

        <div className="dev-pixel-stage">
          <div className="dev-pixel-toolbar">
            <button className="dev-anim-btn" onClick={undo} disabled={undoRef.current.length === 0} title="Deshacer">↶</button>
            <button className="dev-anim-btn" onClick={redo} disabled={redoRef.current.length === 0} title="Rehacer">↷</button>
            <span className="dev-dim">clic + arrastrar para pintar · {tool === 'picker' ? 'clic para tomar color' : tool === 'eraser' ? 'borra a transparente' : tool === 'colorEraser' ? 'borra solo el color capturado' : 'pinta píxeles'}</span>
          </div>
          <div className="dev-checker-bg dev-pixel-canvas-wrap">
            <canvas
              ref={displayRef}
              className="dev-pixel-canvas"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
            />
            <canvas ref={nativeRef} style={{ display: 'none' }} />
          </div>
          {status && <div className="dev-pixel-status">{status}</div>}
        </div>
      </div>
    </div>
  );
}

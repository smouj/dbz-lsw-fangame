// ═══════════════════════════════════════════════════════════
// DBZ LSW — Dev Studio: SHEETS (revisión de sprites)
// Grid por personaje con TODOS los frames de combate + indicadores
// automáticos de problemas:
//   · ▣ rojo   = contenido tocando el borde del lienzo (recorte ajustado
//                o cabeza cortada — revisar con zoom).
//   · 🧽 cyan  = píxeles de color de fondo residuales (specks).
//   · ⧉        = frame duplicado byte a byte con otro (p.ej. move_front==
//                move_back, que es INTENCIONAL — el código espeja move_back).
// Click en un frame → inspector ampliado (zoom x8, bbox).
// ═══════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { clearOverride, fetchManifest, type ManifestFrame } from './spriteEditing';
import { poseSemantics, parseFrameName, POSE_ORDER } from './frameSemantics';
import { FormNavigator } from './FormNavigator';
import type { DevLinkedTarget } from './DevStudio';

const BG_COLORS = [
  [0, 183, 239], [211, 249, 188], [0, 255, 255], [0, 128, 96], [0, 248, 248],
];

interface FrameAnalysis {
  file: string;
  w: number; h: number;
  touchesEdge: boolean;      // contenido opaco en algún borde del lienzo
  touchTop: number;          // px opacos en el borde superior
  bgSpecks: number;          // px del color de fondo con alpha>0 (residuales)
  dupeOf: string | null;     // archivo con contenido idéntico (hash)
}

interface FrameUsage {
  pose: string;
  index: number;
  semantic: string;
}

export function SheetsModule({ target, onOpenInPixelArt }: {
  target?: DevLinkedTarget | null;
  onOpenInPixelArt?: (formId: string, file: string) => void;
}) {
  const [formId, setFormId] = useState('goku_base');
  const [frames, setFrames] = useState<FrameAnalysis[]>([]);
  const [frameUsages, setFrameUsages] = useState<Record<string, FrameUsage[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [zoom, setZoom] = useState(6);

  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);

  useEffect(() => {
    if (!target) return;
    setFormId(target.formId);
    if (target.file) setSelected(target.file);
  }, [target]);

  // Cargar manifest + analizar frames
  useEffect(() => {
    let alive = true;
    setFrames([]);
    setFrameUsages({});
    setSelected(target?.formId === formId ? target.file ?? null : null);
    if (!manifestUrl || !dir) return;
    setLoading(true);
    fetchManifest(manifestUrl, dir)
      .then(({ manifest, overridden: ov }) => {
        setOverridden(ov);
        if (!alive) return;
        // frames únicos del manifest (todas las poses)
        const seen = new Set<string>();
        const all: ManifestFrame[] = [];
        const usages: Record<string, FrameUsage[]> = {};
        for (const [pose, p] of Object.entries(manifest)) {
          const sem = poseSemantics(pose);
          for (let i = 0; i < p.frames.length; i++) {
            const f = p.frames[i];
            (usages[f.file] ||= []).push({ pose, index: i, semantic: sem.meaning });
            if (!seen.has(f.file)) { seen.add(f.file); all.push(f); }
          }
        }
        setFrameUsages(usages);
        // analizar cada frame en canvas
        const results: FrameAnalysis[] = [];
        const hashMap: Record<string, string> = {};
        let pending = all.length;
        if (pending === 0) { setFrames([]); setLoading(false); return; }
        for (const f of all) {
          const url = spriteFrameUrl(formId, f.file);
          const img = new Image();
          img.onload = () => {
            if (!alive) return;
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            let touches = false, top = 0, specks = 0;
            let hash = '';
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const data = ctx.getImageData(0, 0, c.width, c.height).data;
              const w = c.width, h = c.height;
              // hash aproximado (muestreo cada 4px) para detectar duplicados
              const parts: string[] = [];
              for (let y = 0; y < h; y += 2) {
                for (let x = 0; x < w; x += 2) {
                  const i = (y * w + x) * 4;
                  const a = data[i + 3];
                  if (a > 40) {
                    parts.push(`${x},${y},${data[i]},${data[i+1]},${data[i+2]}`);
                    if (y === 0) top++;
                    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
                    // specks de fondo
                    for (const [br, bg, bb] of BG_COLORS) {
                      if (data[i] === br && data[i+1] === bg && data[i+2] === bb) { specks++; break; }
                    }
                  }
                }
              }
              hash = parts.join('|');
            }
            results.push({ file: f.file, w: f.w, h: f.h, touchesEdge: touches, touchTop: top, bgSpecks: specks, dupeOf: null });
            hashMap[f.file] = hash;
            pending--;
            if (pending === 0) {
              // detectar duplicados por hash
              const byHash: Record<string, string[]> = {};
              for (const [file, hsh] of Object.entries(hashMap)) {
                (byHash[hsh] ||= []).push(file);
              }
              for (const r of results) {
                const group = byHash[hashMap[r.file]] || [];
                if (group.length > 1) r.dupeOf = group.find(g => g !== r.file) || null;
              }
              setFrames(results.sort((a, b) => a.file.localeCompare(b.file)));
              setSelected(prev => prev ?? results.find(r => r.file.includes('_idle_'))?.file ?? results[0]?.file ?? null);
              setLoading(false);
            }
          };
          img.onerror = () => {
            if (!alive) return;
            results.push({ file: f.file, w: f.w, h: f.h, touchesEdge: false, touchTop: 0, bgSpecks: 0, dupeOf: null });
            hashMap[f.file] = '';
            pending--;
            if (pending === 0) {
              setFrames(results.sort((a, b) => a.file.localeCompare(b.file)));
              setSelected(prev => prev ?? results.find(r => r.file.includes('_idle_'))?.file ?? results[0]?.file ?? null);
              setLoading(false);
            }
          };
          img.src = url;
        }
      })
      .catch(() => { if (alive) { setLoading(false); } });
    return () => { alive = false; };
  }, [manifestUrl, dir, formId, target]);

  const problemCount = useMemo(() => frames.filter(f => f.bgSpecks > 0 || (f.touchesEdge && f.touchTop > 3)).length, [frames]);

  // Agrupar por pose (semántica): pose -> frames, en orden canónico
  const groups = useMemo(() => {
    const byPose = new Map<string, FrameAnalysis[]>();
    for (const f of frames) {
      const { pose } = parseFrameName(f.file, dir ?? '');
      const arr = byPose.get(pose) ?? [];
      arr.push(f);
      byPose.set(pose, arr);
    }
    const poseOrder = POSE_ORDER as readonly string[];
    const order = [...POSE_ORDER, ...Array.from(byPose.keys()).filter(p => !poseOrder.includes(p))];
    return order.filter(p => byPose.has(p)).map(p => ({ pose: p, sem: poseSemantics(p), frames: byPose.get(p)! }));
  }, [frames, dir]);

  const selFrame = frames.find(f => f.file === selected) || null;
  const selUsages = selFrame ? frameUsages[selFrame.file] ?? [] : [];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Sheets — Revisión de sprites</h1>
        <p className="dev-sub">
          Todos los frames de combate de la forma seleccionada, con detección automática de problemas.
        </p>
      </header>

      <div className="dev-navigator-wrap">
        <FormNavigator formId={formId} onChange={setFormId} />
      </div>

      <div className="dev-sheets-controls">
        {dir && <span className="dev-sheets-dir">/assets/sprites/{dir}</span>}
        <label>Zoom</label>
        <div className="dev-zoom-row">
          {[4, 6, 8, 12].map(z => (
            <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
          ))}
        </div>
        <span className="dev-sheets-count">{frames.length} frames · {problemCount} con avisos</span>
        <div className="dev-sheets-legend">
          <span><i className="dev-dot dev-dot-edge" />borde</span>
          <span><i className="dev-dot dev-dot-speck" />specks</span>
          <span><i className="dev-dot dev-dot-dupe" />duplicado</span>
        </div>
      </div>

      {loading && <div className="dev-module-loading">Analizando frames…</div>}

      <div className="dev-sheets-layout">
        <div className="dev-sheets-scroll">
          {groups.map(g => (
            <div key={g.pose} className="dev-pose-group">
              <div className={`dev-pose-group-head cat-${g.sem.category.toLowerCase()}`}>
                <span className="dev-pose-group-name">{g.pose}</span>
                <span className="dev-pose-group-cat">{g.sem.category}</span>
                <span className="dev-pose-group-meaning">{g.sem.meaning}</span>
              </div>
              <div className="dev-sheets-grid" role="list" aria-label={`${g.pose} sprite frames`}>
                {g.frames.map(f => (
                  <button
                    key={f.file}
                    className={`dev-sheet-cell ${selected === f.file ? 'active' : ''} ${f.touchesEdge && f.touchTop > 3 ? 'edge' : ''} ${f.bgSpecks > 0 ? 'speck' : ''} ${f.dupeOf ? 'dupe' : ''}`}
                    onClick={() => setSelected(f.file)}
                    aria-label={`${g.pose}: ${f.file}, ${f.w} by ${f.h}`}
                    title={`${f.file}\n${f.w}×${f.h} · ${g.sem.meaning}\n${f.touchesEdge ? '⚠ toca borde' : ''}${f.bgSpecks ? `\n${f.bgSpecks} specks` : ''}${f.dupeOf ? `\n⧉ duplicado de ${f.dupeOf}` : ''}`}
                  >
                    <span className="dev-sheet-thumb">
                      <img
                        src={spriteFrameUrl(formId, f.file)}
                        alt={f.file}
                        width={f.w} height={f.h}
                        style={{ width: f.w * 2, height: f.h * 2 }}
                      />
                    </span>
                    <span className="dev-sheet-name">{f.file.replace(`${dir}_`, '').replace('.png', '')}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="dev-sheets-inspector">
          {selFrame ? (() => {
            const { pose } = parseFrameName(selFrame.file, dir ?? '');
            const sem = poseSemantics(pose);
            return (
              <>
                <h3>{selFrame.file} <small>{selFrame.w}×{selFrame.h}px</small></h3>
                <div className={`dev-pose-group-head cat-${sem.category.toLowerCase()}`}>
                  <span className="dev-pose-group-name">{pose}</span>
                  <span className="dev-pose-group-cat">{sem.category}</span>
                </div>
                <p className="dev-sheet-sem-meaning">{sem.meaning}</p>
                <div className="dev-sheet-sem-used">
                  <strong>Usado por:</strong>
                  <ul>{sem.usedBy.map(u => <li key={u}>{u}</li>)}</ul>
                </div>
                {selUsages.length > 0 && (
                  <div className="dev-sheet-sem-used">
                    <strong>Usos reales en manifest:</strong>
                    <ul>
                      {selUsages.map(u => (
                        <li key={`${u.pose}-${u.index}`}>
                          <code>{u.pose}[{u.index}]</code> · {u.semantic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="dev-checker-bg">
                  <img
                    src={spriteFrameUrl(formId, selFrame.file)}
                    alt={selFrame.file}
                    style={{ imageRendering: 'pixelated', width: selFrame.w * zoom, height: selFrame.h * zoom }}
                  />
                </div>
                <code className="dev-manifest-path">{spriteFrameUrl(formId, selFrame.file)}</code>
                <div className="dev-sheet-details">
                  <div className={selFrame.touchesEdge && selFrame.touchTop > 3 ? 'warn' : 'ok'}>
                    {selFrame.touchesEdge && selFrame.touchTop > 3
                      ? `⚠ Contenido tocando el borde superior (${selFrame.touchTop} px) — posible cabeza cortada`
                      : '✓ Sin contenido pegado al borde superior'}
                  </div>
                  <div className={selFrame.bgSpecks > 0 ? 'warn' : 'ok'}>
                    {selFrame.bgSpecks > 0
                      ? `${selFrame.bgSpecks} píxeles de color de fondo (specks) — límpialos en Pixel Art`
                      : '✓ Sin specks de color de fondo'}
                  </div>
                  <div className={selFrame.dupeOf ? 'info' : 'ok'}>
                    {selFrame.dupeOf
                      ? `⧉ Contenido idéntico a ${selFrame.dupeOf} — normal si es move_front/move_back (el juego espeja move_back)`
                      : '✓ Frame único'}
                  </div>
                </div>
                <div className="dev-sheets-actions">
                  <button className="dev-btn" onClick={() => onOpenInPixelArt?.(formId, selFrame.file)}>
                    Abrir en Pixel Art →
                  </button>
                </div>
              </>
            );
          })() : (
            <div className="dev-empty">Selecciona un frame para inspeccionarlo</div>
          )}
        </div>
      </div>
    </div>
  );
}

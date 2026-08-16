// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Animation Studio (editor de frames y animaciones)
// Reproduce una pose desde manifest.json (fps/loop nativos) y
// permite EDITAR: reordenar/quitar/añadir frames, añadir/quitar
// poses, editar fps/loop, y guardar al proyecto o exportar JSON.
// ═══════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import { FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { CARDS } from '../data/cards';
import { actionSemanticsForCard } from '../battle/actionProfiles';
import { COMBAT_REQUIRED_POSES, POSE_FALLBACKS, combatPoseMeta } from '../battle/spriteConfig';
import {
  type Manifest, type ManifestFrame, type ManifestPose,
  fetchManifest, saveOverride, clearOverride, saveToProject,
  downloadJson, moveFrame, removeFrame, addFrame, setFps, setLoop,
} from './spriteEditing';

const FPS_CHOICES = [1, 3, 6, 7, 8, 10, 12, 15, 24, 30];
const POSE_RUNTIME_DEFAULTS: Record<string, { fps: number; loop: boolean; note: string }> = {
  idle: { fps: 3, loop: true, note: 'hold táctico estable' },
  move_front: { fps: 6, loop: true, note: 'ciclo de avance' },
  move_back: { fps: 6, loop: true, note: 'mismo ciclo espejado en runtime' },
  guard: { fps: 6, loop: false, note: 'entrada/hold corto de defensa' },
  attack_fwd: { fps: 5, loop: false, note: 'windup -> contacto -> recover frontal' },
  attack_ud: { fps: 5, loop: false, note: 'windup -> contacto -> recover vertical' },
  hurt: { fps: 6, loop: false, note: 'reacción no-loop' },
  beam_charge: { fps: 7, loop: false, note: 'carga previa al release' },
  beam_fire: { fps: 8, loop: false, note: 'release del beam' },
  beam_ray: { fps: 7, loop: false, note: 'FX autónomo de rayo' },
  beam_ray_tip: { fps: 7, loop: false, note: 'punta/impacto del rayo' },
  gather_power: { fps: 6, loop: true, note: 'preparación/aura compartida' },
  power_up: { fps: 6, loop: true, note: 'aura/transformación' },
};

function frameOrderKey(file: string): number {
  return Number(file.match(/_(\d+)\.png$/i)?.[1] ?? 0);
}

function sortFrames(frames: ManifestFrame[]): ManifestFrame[] {
  return [...frames].sort((a, b) => frameOrderKey(a.file) - frameOrderKey(b.file) || a.file.localeCompare(b.file));
}

function poseMeta(pose: string) {
  return combatPoseMeta(pose);
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function AnimationModule() {
  const [formId, setFormId] = useState('goku_base');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pose, setPose] = useState('idle');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(4);
  const [smooth, setSmooth] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Edición
  const [newPoseName, setNewPoseName] = useState('');
  const [addCopy, setAddCopy] = useState('');
  const [addFile, setAddFile] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);
  const form = FORMS[formId];
  const characterId = form?.character ?? formId;

  // Cargar el manifest (base + override en localStorage)
  useEffect(() => {
    let alive = true;
    setManifest(null); setOverridden(false); setLoadError(false); setFrame(0); setPlaying(false); setPose('idle'); setStatus(null);
    if (!manifestUrl || !dir) return;
    fetchManifest(manifestUrl, dir)
      .then(({ manifest: m, overridden: o }) => { if (alive) { setManifest(m); setOverridden(o); } })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [manifestUrl, dir]);

  const poses = manifest ? Object.keys(manifest) : [];
  const poseData: ManifestPose | undefined = manifest ? manifest[pose] : undefined;
  const frames: ManifestFrame[] = poseData?.frames ?? [];
  const nFrames = frames.length;
  const fps = poseData?.fps ?? 6;
  const loop = poseData?.loop ?? false;

  // Unión de todos los frames del manifest (para copiar/añadir)
  const allFrames = useMemo<ManifestFrame[]>(() => {
    if (!manifest) return [];
    const seen = new Set<string>();
    const out: ManifestFrame[] = [];
    for (const p of Object.values(manifest)) {
      for (const f of p.frames) if (!seen.has(f.file)) { seen.add(f.file); out.push(f); }
    }
    return out;
  }, [manifest]);

  // ─── Mutación del manifest de trabajo + persistencia local ──
  function mutate(fn: (m: Manifest) => Manifest) {
    if (!dir) return;
    setManifest(m => {
      if (!m) return m;
      const next = fn(m);
      saveOverride(dir, next);
      return next;
    });
    setStatus(null);
  }

  function updatePose(pid: string, fn: (p: ManifestPose) => ManifestPose) {
    mutate(m => {
      const p = m[pid];
      if (!p) return m;
      return { ...m, [pid]: fn(p) };
    });
  }

  function move(i: number, dirn: number) {
    updatePose(pose, p => moveFrame(p, i, i + dirn));
    setFrame(Math.max(0, Math.min(nFrames - 1, i + dirn)));
  }
  function remove(i: number) {
    updatePose(pose, p => removeFrame(p, i));
    setFrame(0);
  }
  function addExisting(f: ManifestFrame) {
    updatePose(pose, p => addFrame(p, { ...f }));
  }
  function addByFile() {
    const file = addFile.trim();
    if (!file) return;
    const known = allFrames.find(f => f.file === file);
    const name = file.replace(/\.png$/i, '');
    const frame: ManifestFrame = known
      ? { name: known.name, file, w: known.w, h: known.h }
      : { name, file, w: 32, h: 48 };
    updatePose(pose, p => addFrame(p, frame));
    setAddFile('');
  }
  function addPose() {
    const name = newPoseName.trim();
    if (!name || !manifest || manifest[name]) return;
    mutate(m => ({ ...m, [name]: { frame_count: 0, fps: 6, loop: true, frames: [] } }));
    setPose(name); setFrame(0); setNewPoseName('');
  }
  function removePose(pid: string) {
    mutate(m => {
      const next = { ...m };
      delete next[pid];
      return next;
    });
    if (pid === pose) setPose(Object.keys(manifest ?? {})[0] ?? '');
  }

  function repairPoseContract() {
    const defaults = POSE_RUNTIME_DEFAULTS[pose];
    updatePose(pose, p => ({
      ...p,
      frames: sortFrames(p.frames),
      frame_count: p.frames.length,
      fps: defaults?.fps ?? p.fps,
      loop: defaults?.loop ?? p.loop,
    }));
    setFrame(0);
    setStatus(`✓ ${pose} reparado: orden numérico + contrato ${defaults ? `${defaults.fps}fps/${defaults.loop ? 'loop' : 'no-loop'}` : 'custom'}`);
  }

  // ─── Guardar / exportar / reset ────────────────────────────
  async function saveManifest() {
    if (!manifest || !dir) return;
    try {
      await saveToProject(`sprites/${dir}/manifest.json`, b64(JSON.stringify(manifest, null, 2)));
      clearOverride(dir);
      setOverridden(false);
      setStatus(`✓ manifest.json guardado en sprites/${dir}/`);
    } catch (e) {
      setStatus(`⚠ Error al guardar: ${String(e)}`);
    }
  }
  function exportManifest() {
    if (!manifest) return;
    downloadJson('manifest.json', manifest);
    setStatus('↓ Exportando manifest.json');
  }
  function resetManifest() {
    if (!dir) return;
    clearOverride(dir);
    fetchManifest(manifestUrl!, dir).then(({ manifest: m, overridden: o }) => {
      setManifest(m); setOverridden(o); setStatus('↺ Restaurado el manifest original');
    });
  }

  // Si la pose actual no existe, saltar a la primera disponible
  useEffect(() => {
    if (manifest && poses.length > 0 && !manifest[pose]) setPose(poses[0]);
  }, [manifest, poses, pose]);

  // Red de seguridad del frame
  useEffect(() => {
    if (nFrames > 0 && frame >= nFrames) setFrame(0);
  }, [nFrames, frame]);

  // Bounds (max W/H) para anclar el canvas
  const bounds = useMemo(() => {
    if (!manifest) return { maxW: 0, maxH: 0 };
    let maxW = 0, maxH = 0;
    for (const p of Object.values(manifest)) {
      for (const f of p.frames) { if (f.w > maxW) maxW = f.w; if (f.h > maxH) maxH = f.h; }
    }
    return { maxW, maxH };
  }, [manifest]);

  // Playback por tiempo
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
          return f;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, nFrames, fps, loop]);

  useEffect(() => {
    if (!loop && playing && nFrames > 0 && frame >= nFrames - 1) setPlaying(false);
  }, [frame, nFrames, loop, playing]);

  // Dibujar frame en canvas
  useEffect(() => {
    const f = frames[frame];
    const cv = canvasRef.current;
    if (!f || !cv) { if (cv) { cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height); } return; }
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current !== cv) return;
      const cw = Math.max(bounds.maxW, f.w) * zoom;
      const ch = Math.max(bounds.maxH, f.h) * zoom;
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = smooth;
        const dx = Math.round((bounds.maxW - f.w) / 2 * zoom);
        const dy = Math.round((bounds.maxH - f.h) * zoom);
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, f.w * zoom, f.h * zoom);
      }
    };
    img.src = `${spriteFrameUrl(formId, f.file)}?t=${Date.now()}`;
  }, [frames, frame, zoom, smooth, formId, bounds]);

  const step = (d: number) => setFrame(f => {
    const next = f + d;
    if (next < 0) return loop ? nFrames - 1 : 0;
    if (next >= nFrames) return loop ? 0 : nFrames - 1;
    return next;
  });
  const actionCards = CARDS
    .filter(c => (c.type === 'damage' || c.type === 'beam' || c.type === 'command') && (!c.compatible || c.compatible.includes(characterId)))
    .map(c => ({
      ...c,
      semantics: actionSemanticsForCard(c),
    }));
  const stageCards = actionCards.filter(c => c.type === 'command');
  const meleeCards = actionCards.filter(c => c.type === 'damage');
  const beamCards = actionCards.filter(c => c.type === 'beam');
  const runtimePrepFallback = POSE_FALLBACKS.gather_power ?? ['gather_power'];
  const poseDefault = POSE_RUNTIME_DEFAULTS[pose];
  const orderOk = frames.every((f, i, arr) => i === 0 || frameOrderKey(arr[i - 1].file) <= frameOrderKey(f.file));
  const countOk = poseData ? poseData.frame_count === frames.length : true;
  const contractOk = !poseDefault || (poseDefault.fps === fps && poseDefault.loop === loop);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Animation Studio</h1>
        <p className="dev-sub">Edita los conjuntos de frames de cada animación (orden, fps, loop) y guarda el manifest.</p>
        {overridden && <span className="dev-badge">overrides locales activos</span>}
      </header>

      {loadError && <div className="dev-wip-banner">⚠ No se pudo cargar el manifest de esta forma.</div>}

      <div className="dev-anim-layout">
        <div className="dev-sprite-controls">
          <label>Forma</label>
          <select value={formId} onChange={e => setFormId(e.target.value)}>
            {Object.keys(FORMS).map(fid => (
              <option key={fid} value={fid}>{FORMS[fid].character} / {FORMS[fid].form} ({fid})</option>
            ))}
          </select>

          <label>Pose (animación/acción)</label>
          <div className="dev-pose-pills">
            {poses.map(p => (
              <span key={p} className="dev-pose-pill-wrap">
                <button className={`dev-pose-pill ${pose === p ? 'active' : ''}`}
                  disabled={!manifest} onClick={() => { setPose(p); setFrame(0); }}>
                  <span>{poseMeta(p).label}</span>
                  <small>{poseMeta(p).group}</small>
                </button>
                <button className="dev-pose-x" title={`Quitar pose ${p}`} onClick={() => removePose(p)}>✕</button>
              </span>
            ))}
            {!manifest && <span className="dev-dim">cargando…</span>}
          </div>
          <div className="dev-action-map">
            <strong>{poseMeta(pose).label}</strong>
            <span>{poseMeta(pose).gameplay}</span>
            <code>{pose}</code>
          </div>
          <div className={`dev-action-map ${orderOk && countOk && contractOk ? 'ok' : 'warn'}`}>
            <strong>Contrato de secuencia</strong>
            <span>
              {poseDefault
                ? `${poseDefault.note} · esperado ${poseDefault.fps}fps · ${poseDefault.loop ? 'loop' : 'no-loop'}`
                : 'pose custom sin contrato cerrado'}
            </span>
            <span>
              Orden {orderOk ? 'OK' : 'desordenado'} · frame_count {countOk ? 'OK' : `${poseData?.frame_count} != ${frames.length}`} · timing {contractOk ? 'OK' : 'requiere ajuste'}
            </span>
            <button className="dev-btn" disabled={!poseData} onClick={repairPoseContract}>Reparar pose</button>
          </div>
          <div className="dev-action-map">
            <strong>Runtime contract</strong>
            <span>Required: {COMBAT_REQUIRED_POSES.join(' · ')}</span>
            <span>Action prep: {runtimePrepFallback.join(' -> ')}</span>
            <code>{dir ? `public/assets/sprites/${dir}/manifest.json` : 'sin manifest de build'}</code>
          </div>
          <div className="dev-action-card-map">
            <ActionCardGroup title="Stage" cards={stageCards} />
            <ActionCardGroup title="Melee" cards={meleeCards} />
            <ActionCardGroup title="Beam" cards={beamCards} />
          </div>
          <div className="dev-pose-add">
            <input placeholder="nueva pose (ej: taunt)" value={newPoseName} onChange={e => setNewPoseName(e.target.value)} />
            <button className="dev-btn" onClick={addPose} disabled={!manifest}>＋ Pose</button>
          </div>

          <label>Zoom</label>
          <div className="dev-zoom-row">
            {[1, 2, 4, 8].map(z => (
              <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
            ))}
          </div>

          <label>fps (editable)</label>
          <div className="dev-pose-pills">
            {FPS_CHOICES.map(f => (
              <button key={f} className={`dev-pose-pill ${fps === f ? 'active' : ''}`}
                disabled={!poseData} onClick={() => updatePose(pose, p => setFps(p, f))}>{f}</button>
            ))}
          </div>

          <label className="dev-check">
            <input type="checkbox" checked={loop} disabled={!poseData} onChange={e => updatePose(pose, p => setLoop(p, e.target.checked))} />
            Loop
          </label>

          <label className="dev-check">
            <input type="checkbox" checked={smooth} onChange={e => setSmooth(e.target.checked)} />
            Smooth (bilinear) vs nearest (GBC)
          </label>

          <label>Editar frames de esta pose</label>
          <div className="dev-frame-edit">
            <div className="dev-frame-edit-row">
              <select value={addCopy} onChange={e => setAddCopy(e.target.value)}>
                <option value="">＋ copiar frame existente…</option>
                {allFrames.map(f => (
                  <option key={f.file} value={f.file}>{f.file} ({f.w}×{f.h})</option>
                ))}
              </select>
              <button className="dev-btn" disabled={!addCopy} onClick={() => { const f = allFrames.find(x => x.file === addCopy); if (f) { addExisting(f); setAddCopy(''); } }}>＋</button>
            </div>
            <div className="dev-frame-edit-row">
              <input placeholder="por archivo (ej: pose_03.png)" value={addFile} onChange={e => setAddFile(e.target.value)} />
              <button className="dev-btn" disabled={!addFile.trim()} onClick={addByFile}>＋</button>
            </div>
            <p className="dev-hint">Crea frames nuevos desde Pixel Art Editor y añádelos aquí por nombre de archivo.</p>
          </div>

          <div className="dev-sprite-meta">
            <div><span>dir</span><code>{dir ?? '— (sin V5)'}</code></div>
            <div><span>pose</span><code>{poseData ? `${pose} · ${nFrames} frames · ${fps}fps` : '—'}</code></div>
            <div><span>canvas</span><code>{bounds.maxW}×{bounds.maxH} (anclado abajo-centro)</code></div>
          </div>

          <div className="dev-pixel-actions">
            <button className="dev-btn dev-btn-primary" onClick={saveManifest} disabled={!manifest}>💾 Guardar manifest</button>
            <button className="dev-btn" onClick={exportManifest} disabled={!manifest}>↓ Exportar JSON</button>
            <button className="dev-btn" onClick={resetManifest} disabled={!manifest}>↺ Reset</button>
          </div>
        </div>

        <div className="dev-anim-stage">
          <div className="dev-checker-bg">
            <canvas ref={canvasRef} className="dev-sprite-canvas" />
            {!manifest && !loadError && <div className="dev-empty">Cargando manifest…</div>}
            {manifest && nFrames === 0 && <div className="dev-empty">Pose sin frames — añade alguno desde la izquierda</div>}
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
              <div key={i} className={`dev-anim-thumb-wrap ${i === frame ? 'active' : ''}`}>
                <div className="dev-anim-thumb" onClick={() => setFrame(i)} title={f.name}>
                  <img src={`${spriteFrameUrl(formId, f.file)}?t=${Date.now()}`} alt={f.name} />
                </div>
                <div className="dev-anim-thumb-ops">
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Mover izquierda">◂</button>
                  <button onClick={() => move(i, 1)} disabled={i === nFrames - 1} title="Mover derecha">▸</button>
                  <button onClick={() => remove(i)} title="Quitar frame">✕</button>
                </div>
                <span className="dev-anim-thumb-idx">{i}</span>
              </div>
            ))}
          </div>

          {status && <div className="dev-pixel-status">{status}</div>}
        </div>
      </div>
    </div>
  );
}

function ActionCardGroup({ title, cards }: { title: string; cards: { id: number; name: string; semantics: ReturnType<typeof actionSemanticsForCard> }[] }) {
  return (
    <div className="dev-action-card-group">
      <span>{title}</span>
      <div>
        {cards.length === 0
          ? <em>—</em>
          : cards.slice(0, 8).map(c => (
            <code
              key={c.id}
              className={c.semantics.scope === 'unique' ? 'unique' : ''}
              title={`${c.name}: ${c.semantics.animation} / ${c.semantics.visual} / ${c.semantics.scope}`}
            >
              {c.name}<small>{c.semantics.visual}</small>
            </code>
          ))}
        {cards.length > 8 && <em>+{cards.length - 8}</em>}
      </div>
    </div>
  );
}

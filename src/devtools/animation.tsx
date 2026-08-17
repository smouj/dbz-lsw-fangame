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
import { COMBAT_REQUIRED_POSES, POSE_FALLBACKS, combatPoseMeta, resolvePoseFrameSequence } from '../battle/spriteConfig';
import { FormNavigator } from './FormNavigator';
import {
  type Manifest, type ManifestFrame, type ManifestPose,
  fetchManifest, saveOverride, clearOverride, saveToProject,
  downloadJson, moveFrame, removeFrame, addFrame, setFps, setLoop,
} from './spriteEditing';
import type { DevLinkedTarget } from './DevStudio';

const FPS_CHOICES = [1, 3, 6, 7, 8, 10, 12, 15, 24, 30];
const POSE_RUNTIME_DEFAULTS: Record<string, { fps: number; loop: boolean; note: string }> = {
  idle: { fps: 3, loop: true, note: 'hold táctico estable' },
  move_front: { fps: 6, loop: true, note: 'ciclo de avance' },
  move_back: { fps: 6, loop: true, note: 'ciclo espejo de move_front en runtime' },
  guard: { fps: 6, loop: false, note: 'entrada/hold corto de defensa' },
  attack_fwd: { fps: 5, loop: false, note: 'windup -> contacto -> recover frontal' },
  attack_ud: { fps: 5, loop: false, note: 'windup -> contacto -> recover vertical' },
  punch_right: { fps: 7, loop: false, note: 'idle -> punetazo derecho -> recover' },
  punch_left: { fps: 7, loop: false, note: 'idle -> punetazo izquierdo / follow-up' },
  kick_right: { fps: 7, loop: false, note: 'idle -> patada derecha -> recover' },
  hurt: { fps: 6, loop: false, note: 'reacción no-loop' },
  knockback_back: { fps: 7, loop: false, note: 'reaccion desplazada hacia atras' },
  knockback_up: { fps: 7, loop: false, note: 'reaccion lanzada hacia arriba' },
  knockback_down: { fps: 7, loop: false, note: 'reaccion derribada hacia abajo' },
  beam_guard: { fps: 6, loop: false, note: 'parada de beam / manos juntas' },
  evade: { fps: 10, loop: false, note: 'afterimage / esquiva rapida' },
  beam_charge: { fps: 7, loop: false, note: 'carga previa al release' },
  beam_fire: { fps: 8, loop: false, note: 'release del beam' },
  beam_ray: { fps: 7, loop: false, note: 'FX autónomo de rayo' },
  beam_ray_tip: { fps: 7, loop: false, note: 'punta/impacto del rayo' },
  gather_power: { fps: 6, loop: true, note: 'preparación/aura compartida' },
  power_up: { fps: 10, loop: true, note: 'aura/transformación (parpadeo rápido — haz emergiendo)' },
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

export function AnimationModule({ target }: { target?: DevLinkedTarget | null }) {
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

  // Drag & drop: paleta de sprites -> línea de tiempo
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!target) return;
    setFormId(target.formId);
    if (target.pose) {
      setPose(target.pose);
      setFrame(0);
    }
  }, [target, formId]);

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

  // ─── Drag & drop (paleta -> timeline) ───────────────────
  function onPaletteDragStart(e: React.DragEvent, f: ManifestFrame, srcFormId: string) {
    // Guardamos la descripción del frame en el payload del drag
    e.dataTransfer.setData('application/x-dbzlsw-frame', JSON.stringify({ formId: srcFormId, frame: f }));
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onTimelineDragOver(e: React.DragEvent, index?: number) {
    if (!e.dataTransfer.types.includes('application/x-dbzlsw-frame')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropIndex(index === undefined ? nFrames : index);
    setDragOver(true);
  }

  function onTimelineDragLeave(e: React.DragEvent) {
    // Solo salir si realmente abandonamos la línea de tiempo
    const rt = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    if (x < rt.left || x > rt.right || y < rt.top || y > rt.bottom) {
      setDropIndex(null);
      setDragOver(false);
    }
  }

  function onTimelineDrop(e: React.DragEvent, index?: number) {
    e.preventDefault();
    setDropIndex(null);
    setDragOver(false);
    const raw = e.dataTransfer.getData('application/x-dbzlsw-frame');
    if (!raw) return;
    try {
      const { formId: srcFormId, frame: f } = JSON.parse(raw) as { formId: string; frame: ManifestFrame };
      if (srcFormId === formId) {
        // Mismo personaje: insertar el frame en la posición soltada
        updatePose(pose, p => addFrame(p, { ...f }, index));
        setStatus(`✓ Frame ${f.file} insertado en la posición ${index ?? nFrames}`);
      } else {
        setStatus(`⚠ Los frames de ${srcFormId} no se pueden arrastrar a ${formId}: pertenecen a otro personaje/form. Usa “copiar frame existente” dentro de la misma forma.`);
      }
    } catch {
      setStatus('⚠ Drop inválido');
    }
  }

  function onTimelineDropEnd() {
    setDropIndex(null);
    setDragOver(false);
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

  function repairAllCombatContracts() {
    mutate(m => {
      const next: Manifest = { ...m };
      for (const [pid, p] of Object.entries(m)) {
        const defaults = POSE_RUNTIME_DEFAULTS[pid];
        next[pid] = {
          ...p,
          frames: sortFrames(p.frames),
          frame_count: p.frames.length,
          fps: defaults?.fps ?? p.fps,
          loop: defaults?.loop ?? p.loop,
        };
      }
      return next;
    });
    setFrame(0);
    setStatus('✓ Todas las poses del manifest: orden numerico + frame_count + contratos runtime conocidos');
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
  const mirroredPoseNote = pose === 'move_back'
    ? 'move_back puede compartir frames con move_front: el runtime lo espeja con facing/scaleX.'
    : null;

  // Secuencia runtime compuesta (contrato V1): move = [idle, paso]; punch/kick/knockback/
  // beam_guard/evade = frames heredados de attack/hurt/guard sin inventar PNGs.
  const hasFile = (file: string) => allFrames.some(f => f.file === file);
  const sequencePreview = dir
    ? resolvePoseFrameSequence(pose, dir, hasFile)
    : [];
  const isComposite = pose === 'move_front' || pose === 'move_back' || pose === 'punch_right'
    || pose === 'punch_left' || pose === 'kick_right' || pose === 'knockback_back'
    || pose === 'knockback_up' || pose === 'knockback_down' || pose === 'beam_guard'
    || pose === 'evade' || pose === 'gather_power' || pose === 'power_up';

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Animation Studio</h1>
        <p className="dev-sub">Edita los conjuntos de frames de cada animación (orden, fps, loop) y guarda el manifest.</p>
        {overridden && (
          <span className="dev-badge">
            overrides locales activos{' '}
            <button className="dev-btn dev-btn-mini" onClick={() => { clearOverride(dir!); setOverridden(false); window.location.reload(); }}>
              limpiar
            </button>
          </span>
        )}
      </header>

      {loadError && <div className="dev-wip-banner">⚠ No se pudo cargar el manifest de esta forma.</div>}

      <div className="dev-navigator-wrap">
        <FormNavigator formId={formId} onChange={fid => { setFormId(fid); setPose('idle'); setFrame(0); }} />
      </div>

      <div className="dev-anim-layout">
        <div className="dev-sprite-controls">
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
            <button className="dev-btn" disabled={!manifest} onClick={repairAllCombatContracts}>Reparar manifest</button>
            {mirroredPoseNote && <span>{mirroredPoseNote}</span>}
          </div>
          {isComposite && (
            <div className="dev-action-map">
              <strong>Secuencia runtime compuesta</strong>
              <span>Esta pose no tiene PNG propios: el runtime la compone con frames físicos reales.</span>
              <code>{sequencePreview.length > 0 ? sequencePreview.join(' → ') : '— sin frames disponibles (fallback a idle)'}</code>
            </div>
          )}
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

          <label>Paleta de sprites (arrastra a la línea de tiempo)</label>
          <SpritePalette
            formId={formId}
            activePose={pose}
            onDragStart={onPaletteDragStart}
            onPickFrame={(f, targetPose) => {
              // Click rápido: insertar en la pose activa al final
              if (targetPose === pose) {
                addExisting(f);
                setStatus(`✓ ${f.file} añadido a ${pose}`);
              } else {
                updatePose(targetPose, p => addFrame(p, { ...f }));
                setPose(targetPose);
                setStatus(`✓ ${f.file} añadido a ${targetPose}`);
              }
            }}
          />

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

          <div
            className={`dev-anim-timeline ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => onTimelineDragOver(e, nFrames)}
            onDragLeave={onTimelineDragLeave}
            onDrop={e => onTimelineDrop(e, nFrames)}
            onDragEnd={onTimelineDropEnd}
          >
            {frames.map((f, i) => (
              <div key={i} className={`dev-anim-thumb-wrap ${i === frame ? 'active' : ''} ${dropIndex === i ? 'drop-target' : ''}`}>
                {dropIndex === i && <div className="dev-drop-marker" />}
                <div className="dev-anim-thumb" onClick={() => setFrame(i)} title={f.name}
                  onDragOver={e => onTimelineDragOver(e, i)}
                  onDragLeave={onTimelineDragLeave}
                  onDrop={e => onTimelineDrop(e, i)}>
                  <img src={`${spriteFrameUrl(formId, f.file)}?t=${Date.now()}`} alt={f.name} draggable={false} />
                </div>
                <div className="dev-anim-thumb-ops">
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Mover izquierda">◂</button>
                  <button onClick={() => move(i, 1)} disabled={i === nFrames - 1} title="Mover derecha">▸</button>
                  <button onClick={() => remove(i)} title="Quitar frame">✕</button>
                </div>
                <span className="dev-anim-thumb-idx">{i}</span>
              </div>
            ))}
            {dropIndex === nFrames && <div className="dev-drop-marker end" />}
            {nFrames === 0 && (
              <div className="dev-timeline-empty" onDragOver={e => onTimelineDragOver(e, 0)} onDrop={e => onTimelineDrop(e, 0)}>
                Suelta aquí los frames de la paleta para empezar la secuencia
              </div>
            )}
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

// ─── Paleta de sprites (drag & drop a la línea de tiempo) ───
// Muestra TODOS los frames del manifest de la forma activa, agrupados por
// pose, como miniaturas arrastrables. Soltar un frame en la línea de tiempo
// lo inserta en la posición indicada (o al final). Click rápido = añadir al
// final de la pose activa (o a la pose del grupo si es otra).
function SpritePalette({ formId, activePose, onDragStart, onPickFrame }: {
  formId: string;
  activePose: string;
  onDragStart: (e: React.DragEvent, f: ManifestFrame, srcFormId: string) => void;
  onPickFrame: (f: ManifestFrame, targetPose: string) => void;
}) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const dir = spriteDirFor(formId);
  const url = spriteManifestUrl(formId);

  useEffect(() => {
    let alive = true;
    setManifest(null);
    if (!url || !dir) return;
    fetchManifest(url, dir).then(({ manifest: m }) => { if (alive) setManifest(m); }).catch(() => { /* sin paleta */ });
    return () => { alive = false; };
  }, [url, dir]);

  const groups = useMemo(() => {
    if (!manifest) return [];
    return Object.entries(manifest)
      .map(([pid, p]) => ({ pid, frames: (p.frames ?? []) as ManifestFrame[] }))
      .filter(g => g.frames.length > 0);
  }, [manifest]);

  if (!manifest) {
    return <div className="dev-palette-empty">Cargando paleta…</div>;
  }

  return (
    <div className="dev-sprite-palette">
      {groups.length === 0 && <div className="dev-palette-empty">Sin frames en este manifest.</div>}
      {groups.map(g => (
        <div key={g.pid} className={`dev-palette-group ${g.pid === activePose ? 'active' : ''}`}>
          <div className="dev-palette-group-head">
            <span>{poseMeta(g.pid).label}</span>
            <code>{g.pid} · {g.frames.length}</code>
          </div>
          <div className="dev-palette-frames">
            {g.frames.map((f, i) => (
              <img
                key={`${g.pid}-${i}`}
                className="dev-palette-frame"
                src={`${spriteFrameUrl(formId, f.file)}?t=${Date.now()}`}
                alt={f.file}
                title={`${f.file} (${f.w}×${f.h}) — arrastra a la línea de tiempo`}
                draggable
                onDragStart={e => onDragStart(e, f, formId)}
                onClick={() => onPickFrame(f, g.pid)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

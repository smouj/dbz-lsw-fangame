// ═══════════════════════════════════════════════════════════════════════
// FormPreview — PREVIEW CENTRAL del Character Studio (M8.F0).
// Sprite grande de la forma en la pose seleccionada, con:
//   · pills de poses (COMBAT_POSE_ORDER) + nº de frames físicos reales
//     (del análisis del manifest — misma fuente que el FrameBrowser)
//   · selector de frame dentro de la pose (si tiene varios)
//   · mini-grid de TODOS los frames de la pose (exposición clara)
//   · checkerboard de transparencia
//   · cadena beam (charge → fire → ray → tip) cuando la pose es de beam
// Toda la fuente es el manifest de la forma — NUNCA tablas locales.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { spriteFrameUrl } from '../data/spriteManifest';
import { COMBAT_POSE_ORDER, resolvePoseFrameSequence } from '../battle/spriteConfig';
import { poseSemantics } from './frameSemantics';
import { SPRITE_CANON } from '../data/generated/spriteCanon.generated';
import type { FrameAnalysis } from './frameAnalysis';

interface Props {
  formId: string;
  /** dir del manifest (para resolver archivos). */
  dir: string | undefined;
  /** Análisis del manifest (frames reales con poses) — fuente de conteos. */
  analysis: { frames: FrameAnalysis[]; loading: boolean };
}

const BEAM_CHAIN = ['beam_charge', 'beam_fire', 'beam_ray', 'beam_ray_tip'];

export function FormPreview({ formId, dir, analysis }: Props) {
  const [pose, setPose] = useState('idle');
  const [frameIdx, setFrameIdx] = useState(0);

  // Set de archivos reales del manifest (para available()).
  const fileSet = useMemo(() => {
    const s = new Set<string>();
    for (const f of analysis.frames) s.add(f.file);
    return s;
  }, [analysis.frames]);

  // Frames de la pose activa con FALLBACKS (resolvePoseFrameSequence — la
  // MISMA fuente que el runtime y el grid de poses: beam_fire sin PNG propio
  // cae a beam_charge, knockback_down a hurt…). Antes filtraba por prefijo
  // del archivo y las poses con fallback salían vacías en el preview.
  const poseFiles = useMemo(() => {
    if (!dir) return [];
    const available = (file: string) => fileSet.has(file);
    return resolvePoseFrameSequence(pose, dir, available);
  }, [dir, pose, fileSet]);

  // Conteo por pose (para las pills) — con los MISMOS fallbacks.
  const counts = useMemo(() => {
    if (!dir) return new Map<string, number>();
    const available = (file: string) => fileSet.has(file);
    const m = new Map<string, number>();
    for (const p of COMBAT_POSE_ORDER) {
      m.set(p, resolvePoseFrameSequence(p, dir, available).length);
    }
    return m;
  }, [dir, fileSet]);

  const idx = Math.min(frameIdx, Math.max(0, poseFiles.length - 1));
  const current = poseFiles[idx] ?? null;
  const src = current ? spriteFrameUrl(formId, current) : undefined;
  const sem = poseSemantics(pose);

  const canonFormId = dir ?? formId;
  const canonForm = SPRITE_CANON.forms.find(f => f.form === canonFormId);
  const canonFrames = useMemo(
    () => (canonForm?.frames ?? []).filter(f => f.runtimePoses.includes(pose)),
    [canonForm, pose],
  );
  const canonFamilies = [...new Set(canonFrames.map(f => f.family))];
  const isBeam = pose.startsWith('beam_') || pose === 'beam_ray' || pose === 'beam_ray_tip';

  return (
    <div className="dev-form-preview">
      <div className="dev-form-preview-head">
        <h3 className="dev-form-col-title">Preview</h3>
      </div>

      {/* Sprite grande */}
      <div className="dev-preview-stage">
        <div className="dev-checker-bg">
          {src ? (
            <img src={src} alt={pose} className="dev-preview-sprite" draggable={false} />
          ) : (
            <span className="dev-preview-empty">— sin frame físico —</span>
          )}
        </div>
        <div className="dev-preview-caption">
          <code>{pose}</code>
          {current && <em>{current}</em>}
          <span className="dev-tag">{poseFiles.length} frame{poseFiles.length !== 1 ? 's' : ''}</span>
          {canonFamilies.length > 0 && <span className="dev-tag ok">canon: {canonFamilies.join(', ')}</span>}
          {analysis.loading && <span className="dev-hint">(cargando manifest…)</span>}
        </div>
      </div>

      {/* Pills de poses (canon) */}
      <div className="dev-preview-pills">
        {COMBAT_POSE_ORDER.map(p => (
          <button key={p} className={`dev-pose-pill ${p === pose ? 'active' : ''}`}
            onClick={() => { setPose(p); setFrameIdx(0); }}
            title={`${poseSemantics(p).meaning} — ${counts.get(p) ?? 0} frames`}>
            {p} <em>{counts.get(p) ?? 0}</em>
          </button>
        ))}
      </div>

      {/* Frames de la pose activa (exposición) */}
      {poseFiles.length > 1 && (
        <div className="dev-preview-frames">
          {poseFiles.map((f, i) => (
            <button key={f} className={`dev-preview-frame ${i === idx ? 'active' : ''}`}
              onClick={() => setFrameIdx(i)} title={f}>
              <img src={spriteFrameUrl(formId, f)} alt={f} draggable={false} />
              <span>{f.replace(/^.*?_/, '').replace('.png', '')}</span>
            </button>
          ))}
        </div>
      )}

      {/* Cadena beam (si aplica) */}
      {isBeam && (
        <div className="dev-preview-beamchain">
          <span className="dev-preview-beamchain-label">Cadena beam:</span>
          {BEAM_CHAIN.map(b => (
            <button key={b} className={`dev-preview-beamlink ${b === pose ? 'active' : ''}`}
              onClick={() => { setPose(b); setFrameIdx(0); }}
              title={`${poseSemantics(b).meaning} — ${counts.get(b) ?? 0} frames`}>
              {b} <em>{counts.get(b) ?? 0}</em>
            </button>
          ))}
        </div>
      )}

      <p className="dev-preview-sem">{sem.category} — {sem.meaning}</p>
    </div>
  );
}

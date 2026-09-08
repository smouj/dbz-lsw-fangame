// ═══════════════════════════════════════════════════════════════════════
// FormPreview — PREVIEW CENTRAL del Character Studio (M8.F0).
// Sprite grande de la forma en la pose seleccionada, con:
//   · pills de poses (COMBAT_POSE_ORDER) + nº de frames físicos reales
//     (del análisis del manifest — misma fuente que el FrameBrowser)
//   · selector de frame dentro de la pose (si tiene varios)
//   · mini-grid de TODOS los frames de la pose (exposición clara)
//   · checkerboard de transparencia
//   · cadena beam (charge → fire → ray → tip) cuando la pose es de beam
// El selector consume el mapa de frames reconciliado con ROM. El manifest
// solo queda como índice físico del corpus, nunca como una lista visual
// alternativa ni como generador de nombres de archivo.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { COMBAT_POSE_ORDER } from '../battle/spriteConfig';
import { poseSemantics } from './frameSemantics';
import { resolveCharacterVisualSequence } from '../battle/characterFrameMap';
import { romPhysicalNeutralPreview, romPhysicalPreviewSequence } from './romPhysicalPreview';
import type { FrameAnalysis } from './frameAnalysis';

interface Props {
  formId: string;
  /** Análisis del manifest (frames reales con poses) — fuente de conteos. */
  analysis: { frames: FrameAnalysis[]; loading: boolean };
  /** Pose controlada (opcional — si se pasa, el padre controla la pose activa). */
  pose?: string;
  /** Callback al cambiar de pose (pills / beam chain). */
  onPoseChange?: (pose: string) => void;
}

const BEAM_CHAIN = ['beam_charge', 'beam_fire', 'beam_ray', 'beam_ray_tip'];

export function FormPreview({ formId, analysis, pose: poseProp, onPoseChange }: Props) {
  const [poseLocal, setPoseLocal] = useState('idle');
  const pose = poseProp ?? poseLocal;
  const setPose = (p: string) => {
    if (poseProp !== undefined) onPoseChange?.(p);
    setPoseLocal(p);
    setFrameIdx(0);
  };
  const [frameIdx, setFrameIdx] = useState(0);

  const sequence = useMemo(
    () => resolveCharacterVisualSequence({ formId, semanticRole: pose }),
    [formId, pose],
  );
  // The visual inspector must not promote a fallback/composite PNG to ROM
  // truth. Those cases remain visible as an explicit zero-frame state.
  const poseFrames = useMemo(() => {
    if (pose === 'idle') {
      const neutral = romPhysicalNeutralPreview(formId);
      if (neutral) return [neutral];
    }
    return romPhysicalPreviewSequence(sequence);
  }, [formId, pose, sequence]);
  const sequenceIsRenderable = poseFrames.length > 0;

  // Conteo por pose desde el mismo mapa ROM que el preview.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of COMBAT_POSE_ORDER) {
      if (p === 'idle' && romPhysicalNeutralPreview(formId)) {
        m.set(p, 1);
        continue;
      }
      const resolved = resolveCharacterVisualSequence({ formId, semanticRole: p });
      m.set(p, romPhysicalPreviewSequence(resolved).length);
    }
    return m;
  }, [formId]);

  const idx = Math.min(frameIdx, Math.max(0, poseFrames.length - 1));
  const current = poseFrames[idx] ?? null;
  const sem = poseSemantics(pose);

  const isBeam = pose.startsWith('beam_') || pose === 'beam_ray' || pose === 'beam_ray_tip';

  return (
    <div className="dev-form-preview">
      <div className="dev-form-preview-head">
        <h3 className="dev-form-col-title">Preview</h3>
      </div>

      {/* Sprite grande */}
      <div className="dev-preview-stage">
        <div className="dev-checker-bg">
          {current ? (
            <img src={current.url} alt={pose} className="dev-preview-sprite" draggable={false} />
          ) : (
            <span className="dev-preview-empty">— sin frame ROM físico reconciliado —</span>
          )}
        </div>
        <div className="dev-preview-caption">
          <code>{pose}</code>
          {current && <em>{current.file}</em>}
          <span className="dev-tag">{poseFrames.length} frame{poseFrames.length !== 1 ? 's' : ''}</span>
          <span className={`dev-tag ${sequenceIsRenderable ? 'ok' : 'bad'}`}>{sequenceIsRenderable ? 'ROM_PHYSICAL' : 'ROM PENDING'}</span>
          <span className="dev-tag">{current?.provenance === 'ROM_NEUTRAL_STATIC' ? 'ROM_STATIC_HIGH_CONFIDENCE' : sequence.classification}</span>
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
      {poseFrames.length > 1 && (
        <div className="dev-preview-frames">
          {poseFrames.map((f, i) => (
            <button key={`${f.physicalId}-${i}`} className={`dev-preview-frame ${i === idx ? 'active' : ''}`}
              onClick={() => setFrameIdx(i)} title={f.physicalId}>
              <img src={f.url} alt={f.physicalId} draggable={false} />
              <span>{f.physicalId}</span>
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

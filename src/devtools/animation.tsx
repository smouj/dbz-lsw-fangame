// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Animation Studio (WIP)
// Timeline de animaciones: pose/frame/fps. Esqueleto — la base de
// sprites ya está en Sprite Inspector; aquí irá el editor de timeline.
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl } from '../data/spriteManifest';

const POSES = ['idle', 'move', 'guard', 'attack_fwd', 'attack_ud', 'hurt', 'beam_charge', 'beam_fire', 'power_up'];

export function AnimationModule() {
  const [formId, setFormId] = useState('goku_base');
  const dir = spriteDirFor(formId);
  const manifestUrl = spriteManifestUrl(formId);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Animation Studio</h1>
        <p className="dev-sub">Timeline editor de animaciones — <strong>WIP</strong> (esqueleto).</p>
      </header>

      <div className="dev-wip-banner">
        ⚠ En desarrollo. El visor de frames por pose ya funciona en <em>Sprite Inspector</em>;
        aquí se añadirá el timeline (play/step/fps/loop) y la comparativa GBC ↔ remake.
      </div>

      <div className="dev-anim-layout">
        <div className="dev-sprite-controls">
          <label>Forma</label>
          <select value={formId} onChange={e => setFormId(e.target.value)}>
            {Object.keys(FORMS).map(fid => (
              <option key={fid} value={fid}>{FORMS[fid].character} / {FORMS[fid].form} ({fid})</option>
            ))}
          </select>

          <label>Manifest</label>
          <code className="dev-manifest-path">{manifestUrl ?? '— sin dir V5'}</code>
        </div>

        <div className="dev-pose-table">
          <h3>Poses disponibles</h3>
          {POSES.map(pose => (
            <div key={pose} className="dev-pose-row">
              <span className="dev-pose-name">{pose}</span>
              <span className="dev-pose-status">{dir ? '✓ dir V5' : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

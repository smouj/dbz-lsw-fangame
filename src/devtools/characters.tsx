// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio
// Personaje → formas → stats con selector de nivel + assets.
// Usa las MISMAS funciones del juego (statAtLevel, sheetUrl, etc.)
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { overworldUrl } from '../data/overworld';
import { characterName } from '../data/storyPanels';

const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

export function CharactersModule() {
  const [charId, setCharId] = useState(CHARACTERS[0]?.id ?? 'goku');
  const [formId, setFormId] = useState(CHARACTERS[0]?.forms[0] ?? 'goku_base');
  const [level, setLevel] = useState(50);

  const char = CHARACTERS.find(c => c.id === charId) ?? CHARACTERS[0];
  const form = getForm(formId) ?? getForm(char.forms[0])!;
  const spriteDir = spriteDirFor(form.id);
  const manifestUrl = spriteManifestUrl(form.id);
  const idleUrl = idleSpriteUrl(form) ?? (spriteDir ? spriteFrameUrl(form.id, `${spriteDir}_idle_00.png`) : undefined);
  const portrait = BATTLE_PORTRAITS[form.id];

  const selectChar = (id: string) => {
    setCharId(id);
    const c = CHARACTERS.find(x => x.id === id);
    if (c) { setFormId(c.forms[0]); }
  };

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Character Studio</h1>
        <p className="dev-sub">Ficha por forma con estadísticas reales a cualquier nivel (curvas ROM).</p>
      </header>

      <div className="dev-chars-layout">
        {/* Lista de personajes */}
        <div className="dev-char-list">
          {CHARACTERS.map(c => (
            <button key={c.id} className={`dev-char-chip ${c.id === charId ? 'active' : ''}`}
              onClick={() => selectChar(c.id)}>
              <span className="dev-char-name">{c.name}</span>
              <span className="dev-char-forms">{c.forms.length}</span>
            </button>
          ))}
        </div>

        {/* Detalle */}
        <div className="dev-char-detail">
          <div className="dev-char-head">
            <div className="dev-char-portrait">
              {portrait && <img src={portrait} alt="" />}
            </div>
            <div className="dev-char-id">
              <h2>{char.name}</h2>
              <div className="dev-char-meta">
                <span className="dev-tag">Saga {char.saga}</span>
                <span className="dev-tag">Tier {char.tier}/5</span>
                <span className="dev-tag">{char.forms.length} formas</span>
              </div>
            </div>
          </div>

          {/* Selector de forma */}
          <div className="dev-form-tabs">
            {char.forms.map(fid => {
              const f = getForm(fid);
              return (
                <button key={fid} className={`dev-form-tab ${fid === formId ? 'active' : ''}`}
                  onClick={() => setFormId(fid)}>
                  {f?.form ?? fid}
                </button>
              );
            })}
          </div>

          <div className="dev-form-info">
            <div className="dev-form-id-row">
              <code>{form.id}</code>
              {form.tier && <span className="dev-tag">tier {form.tier}</span>}
              {form.sheet && <span className="dev-tag">{form.sheet}</span>}
              {spriteDir && <span className="dev-tag ok">sprite dir: {spriteDir}</span>}
              {!spriteDir && <span className="dev-tag bad">sin dir animado</span>}
            </div>

            {/* Selector de nivel + stats */}
            <div className="dev-level-row">
              <span className="dev-level-label">Level</span>
              <input type="range" min={1} max={100} value={level}
                onChange={e => setLevel(Number(e.target.value))} className="dev-range" />
              <span className="dev-level-value">{level}</span>
            </div>

            <div className="dev-stats-grid">
              {STATS.map(s => {
                const base = form[s.key];
                const val = statAtLevel(form, level, s.key);
                const growth = form.curves ? (form.curves[s.key][3] - base) : 0;
                const pct = Math.min(100, (val / Math.max(1, form.curves ? form.curves[s.key][3] : val)) * 100);
                return (
                  <div key={s.key} className="dev-stat">
                    <div className="dev-stat-head">
                      <span style={{ color: s.color }}>{s.label}</span>
                      <strong>{val}</strong>
                      <small>base {base}</small>
                    </div>
                    <div className="dev-stat-bar"><div style={{ width: `${pct}%`, background: s.color }} /></div>
                    <div className="dev-stat-growth">+{growth} @100</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assets */}
          <div className="dev-assets">
            <h3>Assets</h3>
            <div className="dev-asset-grid">
              <AssetCell label="Portrait" src={portrait} />
              <AssetCell label="Overworld" src={overworldUrl(form.id)} />
              <AssetCell label="Idle (sheet)" src={idleUrl} />
              <AssetCell label="Sheet" src={form.sheet ? sheetUrl(form) : undefined} wide />
              {manifestUrl && (
                <div className="dev-asset-cell">
                  <div className="dev-asset-frame">
                    <a className="dev-manifest-link" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json ↗</a>
                  </div>
                  <div className="dev-asset-label">Manifest (combate)</div>
                </div>
              )}
            </div>
            {spriteDir && (
              <div className="dev-poses-section">
                <h3>Poses (combate)</h3>
                <div className="dev-pose-grid">
                  {(['idle', 'move_front', 'move_back', 'guard', 'attack_fwd', 'attack_ud', 'hurt', 'beam_charge', 'beam_fire'] as const).map(p => (
                    <AssetCell key={p} label={p} src={spriteFrameUrl(form.id, `${spriteDir}_${p}_00.png`)} small />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetCell({ label, src, wide, small }: { label: string; src?: string; wide?: boolean; small?: boolean }) {
  return (
    <div className={`dev-asset-cell ${wide ? 'wide' : ''} ${small ? 'small' : ''}`}>
      <div className="dev-asset-frame">
        {src ? <img src={src} alt={label} loading="lazy" /> : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">{label}</div>
    </div>
  );
}

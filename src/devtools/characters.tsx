// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio
// Personaje → formas → stats con selector de nivel + assets.
// Usa las MISMAS funciones del juego (statAtLevel, sheetUrl, etc.)
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from '../data/battleOverworld';
import { characterName } from '../data/storyPanels';
import { COMBAT_POSE_ORDER, COMBAT_REQUIRED_POSES } from '../battle/spriteConfig';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';

const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

export function CharactersModule({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const [charId, setCharId] = useState(CHARACTERS[0]?.id ?? 'goku');
  const [formId, setFormId] = useState(CHARACTERS[0]?.forms[0] ?? 'goku_base');
  const [level, setLevel] = useState(50);

  const char = CHARACTERS.find(c => c.id === charId) ?? CHARACTERS[0];
  const form = getForm(formId) ?? getForm(char.forms[0])!;
  const spriteDir = spriteDirFor(form.id);
  const manifestUrl = spriteManifestUrl(form.id);
  const idleUrl = spriteDir ? spriteFrameUrl(form.id, `${spriteDir}_idle_00.png`) : idleSpriteUrl(form);
  const battleOwIdle = battleOverworldActorUrl(form.id, 'idle');
  const battleOwPower = battleOverworldActorUrl(form.id, 'gather_power_pose');
  // Aura: SOLO si el manifest real tiene la entrada (verificación HEAD).
  // Si no existe, undefined → PowerUpCell muestra la pose sin aura (nunca
  // icono roto/cyan).
  const [battleOwAura, setBattleOwAura] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    battleOverworldAuraUrlAsync(form.id).then(url => { if (!cancelled) setBattleOwAura(url); });
    return () => { cancelled = true; };
  }, [form.id]);
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
            <div className="dev-linked-actions">
              <button className="dev-btn" disabled={!spriteDir} onClick={() => onOpenModule?.('animation', { formId: form.id, pose: 'idle' })}>Abrir Animation</button>
              <button className="dev-btn" disabled={!spriteDir} onClick={() => onOpenModule?.('sprites', { formId: form.id, pose: 'idle' })}>Abrir Sprites</button>
              <button className="dev-btn" disabled={!spriteDir} onClick={() => onOpenModule?.('sheets', { formId: form.id })}>Abrir Sheets</button>
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
              <AssetCell label="Idle (combat)" src={idleUrl} />
              <AssetCell label="Battle OW idle" src={battleOwIdle} />
              <PowerUpCell poseSrc={battleOwPower} auraSrc={battleOwAura} />
              {spriteDir
                ? <CombatSheetCell formId={form.id} spriteDir={spriteDir} />
                : <AssetCell label="Combat sheet" src={undefined} wide />}
              {form.sheet && <AssetCell label="ROM sheet ref" src={sheetUrl(form)} wide />}
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
                  {COMBAT_REQUIRED_POSES.map(p => (
                    <AssetCell key={p} label={p} src={spriteFrameUrl(form.id, `${spriteDir}_${p}_00.png`)} small />
                  ))}
                </div>
                <div className="dev-semantic-pose-row">{COMBAT_POSE_ORDER.join(' · ')}</div>
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

function CombatSheetCell({ formId, spriteDir }: { formId: string; spriteDir: string }) {
  return (
    <div className="dev-asset-cell wide combat-sheet">
      <div className="dev-asset-frame">
        <div className="dev-combat-sheet-grid">
          {COMBAT_REQUIRED_POSES.map(pose => (
            <div key={pose} className="dev-combat-sheet-frame" title={pose}>
              <img src={spriteFrameUrl(formId, `${spriteDir}_${pose}_00.png`)} alt={pose} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
      <div className="dev-asset-label">Combat sheet ({spriteDir})</div>
    </div>
  );
}

function PowerUpCell({ poseSrc, auraSrc }: { poseSrc?: string; auraSrc?: string }) {
  return (
    <div className="dev-asset-cell">
      <div className="dev-asset-frame dev-powerup-frame">
        {poseSrc ? (
          <>
            {auraSrc && <img src={auraSrc} alt="" className="dev-powerup-aura" loading="lazy" />}
            <img src={poseSrc} alt="Battle OW power up" className="dev-powerup-actor" loading="lazy" />
          </>
        ) : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">Battle OW power</div>
    </div>
  );
}

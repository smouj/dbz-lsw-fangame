// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio
// Personaje → formas → stats con selector de nivel + assets.
// Usa las MISMAS funciones del juego (statAtLevel, sheetUrl, etc.)
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl, spritePoseFrameUrl } from '../data/spriteManifest';
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
  // Battle overworld: si no hay extraído (solo 24 formas), fallback al chibi
  // *_ow.png del overworld táctico (existe para los 48) — así Gohan/Trunks/
  // Goten/Cell... muestran su overworld en vez de celda vacía.
  const owFallback = overworldUrl(form.id);
  const battleOwIdle = battleOverworldActorUrl(form.id, 'idle') ?? owFallback;
  const battleOwPower = battleOverworldActorUrl(form.id, 'gather_power_pose') ?? owFallback;
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
                    <PoseCell key={p} formId={form.id} pose={p} small />
                  ))}
                </div>
                <div className="dev-semantic-pose-row">{COMBAT_POSE_ORDER.join(' · ')}</div>
              </div>
            )}
            {form.sheet && <AtomicFrames sheet={form.sheet} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Frames atómicos V9 (sheet canónico) ───────────────────────────
// Recorta cada frame del atomic_sheet.png servido (/assets/sheets/<sheet>.png)
// usando las coordenadas de /assets/sheets/<sheet>.json (generadas desde el
// catálogo V9) y los agrupa por bucket semántico. Es la visualización del
// sheet PERFECTO del personaje: los frames atómicos tal cual salen del V9.

interface AtomicFrameMeta { file: string; bucket: string; alias: string; x: number; y: number; w: number; h: number; }
interface AtomicSheetMeta {
  sheet: string; dir: string; columns: number; rows: number;
  cell_width: number; cell_height: number; frame_count: number;
  buckets: string[]; frames: AtomicFrameMeta[];
}

const BUCKET_LABELS: Record<string, string> = {
  overworld_actor_or_pose: 'Overworld (chibi)',
  battle_aura_tile: 'Aura tile (power)',
  battle_aura_actor_composite: 'Composite (power-up)',
  aura_support: 'Aura SUPPORT (azul)',
  aura: 'Aura (power+support)',
  character_plus_aura_or_burst: 'Power-up (personaje + aura)',
  character_plus_effect: 'Power-up (personaje + efecto)',
  idle_or_stance: 'Idle / stance',
  movement_or_attack_pose: 'Movement / attack',
  orbs_rings_bursts: 'Ciclo aura (orbs/burst)',
  projectiles_beams: 'Beams / proyectiles',
  projectile_orb_small: 'Orbes (small)',
  speedlines: 'Speedlines',
  nonbody_misc: 'FX misc',
  actor_downed_or_special_pose: 'Downed / special',
  downed_or_hurt: 'Downed / hurt',
  fixed_only: 'Fixed-only (bridge)',
  multi_evidence_projectiles_beams_orbs_rings_bursts_character_plus_aura_or_burst: 'Beam + aura (multi-evidence)',
  multi_evidence_projectiles_beams_orbs_rings_bursts: 'Beam + orbs (multi-evidence)',
  multi_evidence_projectiles_beams_character_plus_aura_or_burst: 'Beam + power-up (multi-evidence)',
  multi_evidence_orbs_rings_bursts_projectiles_beams: 'Orbs + beam (multi-evidence)',
  multi_evidence_movement_or_attack_pose_orbs_rings_bursts_projectiles_beams: 'Move + orbs + beam',
  multi_evidence_character_plus_aura_or_burst_movement_or_attack_pose: 'Power-up + move',
  multi_evidence_character_plus_aura_or_burst_orbs_rings_bursts: 'Power-up + orbs',
  multi_evidence_movement_or_attack_pose_character_plus_aura_or_burst_projectiles_beams: 'Move + power-up + beam',
  multi_evidence_projectiles_beams_character_plus_aura_or_burst_movement_or_attack_pose: 'Beam + power-up + move',
  multi_evidence_projectiles_beams_movement_or_attack_pose_orbs_rings_bursts: 'Beam + move + orbs',
  multi_evidence_movement_or_attack_pose_projectiles_beams_character_plus_aura_or_burst: 'Move + beam + power-up',
  multi_evidence_orbs_rings_bursts_movement_or_attack_pose_projectiles_beams: 'Orbs + move + beam',
  multi_evidence_movement_or_attack_pose_orbs_rings_bursts: 'Move + orbs',
  multi_evidence_character_plus_aura_or_burst_movement_or_attack_pose_character_plus_effect: 'Power-up + move + FX',
  multi_evidence_movement_or_attack_pose_character_plus_aura_or_burst: 'Move + power-up',
};

function AtomicFrames({ sheet }: { sheet: string }) {
  const [meta, setMeta] = useState<AtomicSheetMeta | null>(null);
  const [sheetImg, setSheetImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    setMeta(null);
    setSheetImg(null);
    const jsonUrl = `/assets/sheets/${sheet.replace('.png', '.json')}?t=${Date.now()}`;
    fetch(jsonUrl).then(r => r.ok ? r.json() : null).then((m: AtomicSheetMeta | null) => {
      if (!alive || !m) return;
      setMeta(m);
      const img = new Image();
      img.onload = () => { if (alive) setSheetImg(img); };
      img.src = `/assets/sheets/${sheet}?t=${Date.now()}`;
    }).catch(() => {});
    return () => { alive = false; };
  }, [sheet]);
  if (!meta) return null;
  const groups = new Map<string, AtomicFrameMeta[]>();
  for (const f of meta.frames) {
    const g = groups.get(f.bucket) ?? [];
    g.push(f);
    groups.set(f.bucket, g);
  }
  return (
    <div className="dev-atomic-section">
      <h3>Frames atómicos V9 <span className="dev-atomic-count">({meta.frame_count} frames · {meta.sheet} · atomic_sheet {meta.cell_width}×{meta.cell_height})</span></h3>
      {[...groups.entries()].map(([bucket, frames]) => (
        <div key={bucket} className="dev-atomic-bucket">
          <div className="dev-atomic-bucket-head">
            <span className="dev-atomic-bucket-name">{BUCKET_LABELS[bucket] ?? bucket}</span>
            <span className="dev-atomic-bucket-cat">{frames.length} frames</span>
          </div>
          <div className="dev-atomic-grid">
            {frames.map(f => (
              <div key={f.file} className="dev-atomic-cell" title={`${f.file} · ${f.alias}`}>
                {sheetImg && <FrameCanvas img={sheetImg} f={f} />}
                <span className="dev-atomic-file">{f.file.replace('.png', '')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FrameCanvas({ img, f, zoom = 3 }: { img: HTMLImageElement; f: AtomicFrameMeta; zoom?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = f.w * zoom;
    c.height = f.h * zoom;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w * zoom, f.h * zoom);
  }, [img, f, zoom]);
  return <canvas ref={ref} className="dev-atomic-canvas" />;
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

/**
 * Celda de pose resuelta contra el manifest REAL (igual que el runtime).
 * Evita URLs rotas: beam_fire sin PNG físico cae a beam_charge (fallback),
 * y las poses compuestas muestran su primer frame real.
 */
function PoseCell({ formId, pose, small }: { formId: string; pose: string; small?: boolean }) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    spritePoseFrameUrl(formId, pose, 0).then(url => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [formId, pose]);
  return <AssetCell label={pose} src={src} small={small} />;
}

function CombatSheetCell({ formId, spriteDir }: { formId: string; spriteDir: string }) {
  const [manifestPoses, setManifestPoses] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    spriteManifestUrl(formId)
      ? fetch(spriteManifestUrl(formId)!).then(r => r.ok ? r.json() : null).then((m: Record<string, { frames?: unknown[] }> | null) => {
        if (alive && m) {
          const poses = Object.entries(m)
            .filter(([, spec]) => Array.isArray(spec?.frames) && spec.frames!.length > 0)
            .map(([pid]) => pid);
          setManifestPoses(poses);
        }
      }).catch(() => {})
      : undefined;
    return () => { alive = false; };
  }, [formId]);
  const poses = manifestPoses && manifestPoses.length > 0 ? manifestPoses : COMBAT_REQUIRED_POSES;
  return (
    <div className="dev-asset-cell wide combat-sheet">
      <div className="dev-asset-frame">
        <div className="dev-combat-sheet-grid">
          {poses.map(pose => (
            <div key={pose} className="dev-combat-sheet-frame" title={pose}>
              <PoseCell formId={formId} pose={pose} />
            </div>
          ))}
        </div>
      </div>
      <div className="dev-asset-label">Combat sheet ({spriteDir}) — {poses.length} poses</div>
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

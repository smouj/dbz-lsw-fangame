// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio (REESCRITURA COMPLETA)
// ─────────────────────────────────────────────────────────────────────────
// Vista única de personaje: lista → detalle → secciones jerarquizadas.
//
//   · Sidebar: personajes del roster (vertical, sticky)
//   · Header: retrato + nombre (editable inline) + tags de la forma
//   · Tabs: formas del personaje (nombres editables inline)
//   · Primario: Preview (FormPreview controlado) + Stats/nivel (2 col)
//   · Assets: portrait · overworld · idle · battle OW · power · sheet
//   · Poses: biblioteca semántica (grupos) — click ⇒ actualiza el preview
//   · Frames: browser por pose con inspector (bbox/alpha/specks/dupes)
//   · Ataques: cartas → pose cinematográfica (colapsable, cerrado)
//   · V9: frames atómicos del sheet (colapsable, cerrado)
//
// REGLA DE ORO: todos los hooks ANTES de cualquier return condicional.
// (Dos bugs de "Rendered more hooks than during the previous render" se
// corrigieron moviendo useState/useMemo al inicio de los componentes.)
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl, LIMIT_DEFAULTS,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl, _spriteManifestInternals } from '../data/spriteManifest';
import { CARDS, getCard, CARD_COLORS, CARD_TYPE_NAMES } from '../data/cards';
import { cardBattlePose, cardUsableBy } from '../battle/cardPoses';
import { resolveCombatPose } from '../battle/spriteConfig';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { MINI_PORTRAITS, MENU_PORTRAITS } from '../data/icons';
import { STORY_PORTRAITS, storyPortraitUrl } from '../data/storyPortraits';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from '../data/battleOverworld';
import { characterName } from '../data/storyPanels';
import { COMBAT_POSE_ORDER, COMBAT_REQUIRED_POSES } from '../battle/spriteConfig';
import { useSheetAnalysis, groupFramesByPose, type FrameAnalysis } from './frameAnalysis';
import { getCharacterAssetBundle, resolveBundlePoses, type CombatPoseAsset } from '../data/characterAssets';
import { poseSemantics, parseFrameName } from './frameSemantics';
import { FormPreview } from './FormPreview';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';

// ═══ Constantes ─────────────────────────────────────────────────────────
const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

const NAMES_KEY = 'dbzlsw:char-names';
const FRAME_OVERRIDES_KEY = 'dbzlsw:frame-overrides';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

// ═══ InlineName — nombre editable con persistencia ──────────────────────
function InlineName({ value, onCommit, className }: {
  value: string; onCommit: (v: string) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [editing, value]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onCommit(v);
    setEditing(false);
  };

  if (editing) {
    return (
      <input ref={ref} className={`dev-inline-input ${className ?? ''}`} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        aria-label="Editar nombre" />
    );
  }
  return (
    <span className={`dev-inline-name ${className ?? ''}`} title="Clic para editar"
      onClick={e => { e.stopPropagation(); setEditing(true); }}>
      {value}
      <span className="dev-inline-edit-icon" aria-hidden>✎</span>
    </span>
  );
}

// ═══ CollapsibleSection ─────────────────────────────────────────────────
function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`dev-char-block dev-collapsible ${open ? 'open' : ''}`}>
      <button className="dev-collapsible-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="dev-collapsible-title">{title}</span>
        <span className="dev-collapsible-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="dev-collapsible-body">{children}</div>}
    </section>
  );
}

// ═══ Módulo principal ───────────────────────────────────────────────────
export function CharactersModule({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const [charId, setCharId] = useState(CHARACTERS[0]?.id ?? 'goku');
  const [formId, setFormId] = useState(CHARACTERS[0]?.forms[0] ?? 'goku_base');
  const [level, setLevel] = useState(50);
  const [previewPose, setPreviewPose] = useState('idle');
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(() => loadJson(NAMES_KEY, {}));

  useEffect(() => {
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(nameOverrides)); } catch { /* noop */ }
  }, [nameOverrides]);

  const displayName = (id: string, fallback: string) => nameOverrides[id] ?? fallback;
  const char = CHARACTERS.find(c => c.id === charId) ?? CHARACTERS[0];
  const form = getForm(formId) ?? getForm(char.forms[0])!;
  const spriteDir = spriteDirFor(form.id);
  const manifestUrl = spriteManifestUrl(form.id);
  const idleUrl = spriteDir ? spriteFrameUrl(form.id, `${spriteDir}_idle_00.png`) : idleSpriteUrl(form);
  const owFallback = overworldUrl(form.id);
  const battleOwIdle = battleOverworldActorUrl(form.id, 'idle') ?? owFallback;
  const battleOwPower = battleOverworldActorUrl(form.id, 'gather_power_pose') ?? owFallback;

  const [battleOwAura, setBattleOwAura] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    battleOverworldAuraUrlAsync(form.id).then(url => { if (!cancelled) setBattleOwAura(url); });
    return () => { cancelled = true; };
  }, [form.id]);

  const portrait = BATTLE_PORTRAITS[form.id];
  const analysis = useSheetAnalysis(form.id, spriteDir);

  const selectChar = (id: string) => {
    setCharId(id);
    const c = CHARACTERS.find(x => x.id === id);
    if (c) setFormId(c.forms[0]);
  };

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Character Studio</h1>
        <p className="dev-sub">
          Stats ROM · assets · poses de combate · browser de frames — manifests OUT_frames, fuente única.
        </p>
      </header>

      <div className="dev-chars-layout">
        {/* ── Sidebar: personajes ── */}
        <div className="dev-char-list">
          {CHARACTERS.map(c => (
            <button key={c.id} className={`dev-char-chip ${c.id === charId ? 'active' : ''}`}
              onClick={() => selectChar(c.id)}>
              <span className="dev-char-name">{displayName(c.id, c.name)}</span>
              <span className="dev-char-forms">{c.forms.length}</span>
            </button>
          ))}
        </div>

        {/* ── Detalle ── */}
        <div className="dev-char-detail">
          {/* Header del personaje */}
          <div className="dev-char-head">
            <div className="dev-char-portrait">
              {portrait && <img src={portrait} alt="" />}
            </div>
            <div className="dev-char-id">
              <h2>
                <InlineName value={displayName(char.id, char.name)}
                  onCommit={v => setNameOverrides(o => ({ ...o, [char.id]: v }))} />
              </h2>
              <div className="dev-char-meta">
                <span className="dev-tag">Saga {char.saga}</span>
                <span className="dev-tag">Tier {char.tier}/5</span>
                <span className="dev-tag">{char.forms.length} formas</span>
                <span className={`dev-tag ${spriteDir ? 'ok' : 'bad'}`}>{spriteDir ? `sprite: ${spriteDir}` : 'sin dir animado'}</span>
              </div>
              <div className="dev-linked-actions">
                <button className="dev-btn" disabled={!spriteDir}
                  onClick={() => onOpenModule?.('animation', { formId: form.id, pose: 'idle' })}>
                  Abrir Animation →
                </button>
              </div>
            </div>
          </div>

          {/* Tabs de formas */}
          <div className="dev-form-tabs">
            {char.forms.map(fid => {
              const f = getForm(fid);
              return (
                <button key={fid} className={`dev-form-tab ${fid === formId ? 'active' : ''}`}
                  onClick={() => setFormId(fid)}>
                  <InlineName value={displayName(fid, f?.form ?? fid)}
                    onCommit={v => setNameOverrides(o => ({ ...o, [fid]: v }))} />
                </button>
              );
            })}
          </div>

          {/* SECCIÓN 1 — Preview + Stats (2 columnas) */}
          <section className="dev-char-block dev-primary-block">
            <div className="dev-primary-grid">
              <FormPreview formId={form.id} dir={spriteDir} analysis={analysis}
                pose={previewPose} onPoseChange={setPreviewPose} />
              <div className="dev-primary-stats">
                <div className="dev-form-preview-head">
                  <h3 className="dev-form-col-title">Stats</h3>
                  <span className="dev-tag">ROM</span>
                </div>
                <div className="dev-form-id-row">
                  <code>{form.id}</code>
                  {form.tier && <span className="dev-tag">tier {form.tier}</span>}
                  {form.sheet && <span className="dev-tag">{form.sheet}</span>}
                  <span className={`dev-tag ${spriteDir ? 'ok' : 'bad'}`}>{spriteDir ? 'manifest ✓' : 'sin manifest'}</span>
                  <span className={`dev-tag ${portrait ? 'ok' : 'bad'}`}>{portrait ? 'portrait ✓' : 'sin portrait'}</span>
                  {manifestUrl && (
                    <a className="dev-manifest-link" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json ↗</a>
                  )}
                </div>
                <div className="dev-level-row">
                  <span className="dev-level-label">Level</span>
                  <input type="range" min={1} max={100} value={level}
                    onChange={e => setLevel(Number(e.target.value))} className="dev-range" />
                  <span className="dev-level-value">{level}</span>
                </div>
                <div className="dev-stats-grid dev-stats-compact">
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
            </div>
          </section>

          {/* SECCIÓN 2 — Assets de la forma */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Assets de la forma</h3>
            <div className="dev-asset-grid dev-assets-horizontal">
              <AssetCell label="Portrait" src={portrait} />
              <AssetCell label="Overworld" src={overworldUrl(form.id)} />
              <AssetCell label="Idle (combate)" src={idleUrl} />
              <AssetCell label="Battle OW idle" src={battleOwIdle} />
              <PowerUpCell poseSrc={battleOwPower} auraSrc={battleOwAura} />
              {form.sheet && <AssetCell label="ROM sheet ref" src={sheetUrl(form)} wide />}
            </div>
            <div className="dev-poses-section dev-retratos">
              <h3>Retratos del personaje</h3>
              <div className="dev-retratos-grid">
                <AssetCell label="Battle (forma)" src={BATTLE_PORTRAITS[form.id]} small />
                <AssetCell label="Mini" src={MINI_PORTRAITS[char.id]} small />
                <AssetCell label="Menú" src={MENU_PORTRAITS[char.id]} small />
                <StoryPortraitsGrid charId={form.character} formId={form.id} />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3 — Poses de combate (biblioteca semántica) */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Poses de combate — canon completo</h3>
            <AllPosesGrid formId={form.id} activePose={previewPose} onPoseSelect={setPreviewPose} />
          </section>

          {/* SECCIÓN 4 — Frames del manifest */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">
              Frames del manifest
              <span className="dev-sheets-count">{analysis.frames.length} · {analysis.problemCount} avisos</span>
            </h3>
            {analysis.overridden && (
              <div className="dev-wip-banner">
                Overrides locales activos — los frames pueden diferir de los manifests OUT_frames.{' '}
                <button className="dev-btn" onClick={analysis.clearOverrideLocal}>Limpiar override</button>
              </div>
            )}
            <FrameBrowser formId={form.id} analysis={analysis} dir={spriteDir} />
          </section>

          {/* SECCIÓN 5 — Ataques (colapsable, cerrado) */}
          <CollapsibleSection title="Ataques disponibles — cartas → pose cinematográfica" defaultOpen={false}>
            <CharacterAttacks charId={char.id} formId={form.id} />
          </CollapsibleSection>

          {/* SECCIÓN 6 — Frames por pose (colapsable, cerrado) */}
          {form.sheet && (
            <CollapsibleSection title="Frames por pose (OUT_frames)" defaultOpen={false}>
              <AtomicFrames sheet={form.sheet} formId={form.id} />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ FrameBrowser — pose → grid de frames → inspector ──────────────────
function FrameBrowser({ formId, analysis, dir }: {
  formId: string;
  analysis: ReturnType<typeof useSheetAnalysis>;
  dir: string | undefined;
}) {
  const [pose, setPose] = useState('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);

  const groups = groupFramesByPose(analysis.frames, dir);
  const activeGroup = groups.find(g => g.pose === pose) ?? groups[0];

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.pose === pose)) setPose('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.frames]);

  const selFrame = analysis.frames.find(f => f.file === selected) ?? null;
  const selUsages = selFrame ? (analysis.usages[selFrame.file] ?? []) : [];

  return (
    <div className="dev-frames">
      {/* Pose pills con conteo */}
      <div className="dev-pose-pills dev-frames-pills">
        {groups.map(g => (
          <button key={g.pose} className={`dev-pose-pill ${g.pose === pose ? 'active' : ''}`}
            onClick={() => { setPose(g.pose); setSelected(g.frames[0]?.file ?? null); }}
            title={`${g.sem.meaning} — ${g.frames.length} frames`}>
            {g.pose} <em>{g.frames.length}</em>
          </button>
        ))}
        {groups.length === 0 && <span className="dev-hint">Sin frames en el manifest (carga…)</span>}
      </div>

      {/* Grid de frames de la pose activa */}
      {activeGroup && (
        <div className="dev-pose-group">
          <div className={`dev-pose-group-head cat-${activeGroup.sem.category.toLowerCase()}`}>
            <span className="dev-pose-group-name">{activeGroup.pose}</span>
            <span className="dev-pose-group-cat">{activeGroup.sem.category}</span>
            <span className="dev-pose-group-meaning">{activeGroup.sem.meaning}</span>
          </div>
          <div className="dev-sheets-grid" role="list" aria-label={`${activeGroup.pose} sprite frames`}>
            {activeGroup.frames.map(f => (
              <button key={f.file}
                className={`dev-sheet-cell ${selected === f.file ? 'active' : ''} ${f.touchesEdge && f.touchTop > 3 ? 'edge' : ''} ${f.bgSpecks > 0 ? 'speck' : ''} ${f.dupeOf ? 'dupe' : ''}`}
                onClick={() => setSelected(f.file)}
                title={`${f.file}\n${f.w}×${f.h} · ${activeGroup.sem.meaning}\n${f.touchesEdge ? '⚠ toca borde' : ''}${f.bgSpecks ? `\n${f.bgSpecks} specks` : ''}${f.dupeOf ? `\n⧉ duplicado de ${f.dupeOf}` : ''}`}>
                <span className="dev-sheet-thumb">
                  <img src={spriteFrameUrl(formId, f.file)} alt={f.file}
                    width={f.w} height={f.h} style={{ width: f.w * 2, height: f.h * 2 }} />
                </span>
                <span className="dev-sheet-name">{f.file.replace(`${dir ?? ''}_`, '').replace('.png', '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inspector */}
      {selFrame ? (() => {
        const { pose: fpose } = parseFrameName(selFrame.file, dir ?? '');
        const sem = poseSemantics(fpose);
        return (
          <div className="dev-sheets-inspector dev-frames-inspector">
            <div className="dev-sheets-zoom">
              <label>Zoom</label>
              <div className="dev-zoom-row">
                {[2, 4, 6, 8, 12].map(z => (
                  <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
                ))}
              </div>
            </div>
            <h3>{selFrame.file} <small>{selFrame.w}×{selFrame.h}px · {selFrame.alphaPct}% alpha</small></h3>
            <div className={`dev-pose-group-head cat-${sem.category.toLowerCase()}`}>
              <span className="dev-pose-group-name">{fpose}</span>
              <span className="dev-pose-group-cat">{sem.category}</span>
            </div>
            <p className="dev-sheet-sem-meaning">{sem.meaning}</p>
            <div className="dev-checker-bg">
              <FrameZoom imgSrc={spriteFrameUrl(formId, selFrame.file)} w={selFrame.w} h={selFrame.h} zoom={zoom} bbox={selFrame.opaque} />
            </div>
            <div className="dev-sheet-details">
              <div className={selFrame.touchesEdge && selFrame.touchTop > 3 ? 'warn' : 'ok'}>
                {selFrame.touchesEdge && selFrame.touchTop > 3
                  ? `⚠ Contenido tocando el borde superior (${selFrame.touchTop} px) — posible cabeza cortada`
                  : '✓ Sin contenido pegado al borde superior'}
              </div>
              <div className={selFrame.bgSpecks > 0 ? 'warn' : 'ok'}>
                {selFrame.bgSpecks > 0 ? `${selFrame.bgSpecks} specks de color de fondo` : '✓ Sin specks'}
              </div>
              <div className={selFrame.dupeOf ? 'info' : 'ok'}>
                {selFrame.dupeOf ? `⧉ Contenido idéntico a ${selFrame.dupeOf}` : '✓ Frame único'}
              </div>
            </div>
            {selUsages.length > 0 && (
              <div className="dev-sheet-sem-used">
                <strong>Usos reales en manifest:</strong>
                <ul>
                  {selUsages.map(u => (
                    <li key={`${u.pose}-${u.index}`}><code>{u.pose}[{u.index}]</code> · {u.semantic}</li>
                  ))}
                </ul>
              </div>
            )}
            <code className="dev-manifest-path">{spriteFrameUrl(formId, selFrame.file)}</code>
          </div>
        );
      })() : (
        <div className="dev-empty">Selecciona un frame para inspeccionarlo</div>
      )}
    </div>
  );
}

// ═══ FrameZoom — canvas ampliado con bbox dorado ────────────────────────
function FrameZoom({ imgSrc, w, h, zoom, bbox }: {
  imgSrc: string; w: number; h: number; zoom: number; bbox: FrameAnalysis['opaque'];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const img = new Image();
    img.onload = () => {
      cv.width = w * zoom;
      cv.height = h * zoom;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if (bbox) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bbox.x * zoom, bbox.y * zoom, bbox.w * zoom, bbox.h * zoom);
      }
    };
    img.src = imgSrc;
  }, [imgSrc, w, h, zoom, bbox]);
  return <canvas ref={ref} className="dev-sprite-canvas" />;
}

// ═══ Ataques — canon cartas → pose → beam chain ────────────────────────
const EFFECT_LABELS: Record<string, string> = {
  damage: 'Daño', damage_pierce: 'Daño perforante', damage_special: 'Daño especial',
  damage_support: 'Daño + soporte', beam: 'Rayo', beam_team: 'Rayo equipo', beam_suicide: 'Rayo sacrificio',
  beam_varhp: 'Rayo vida', heal_25pct: 'Cura 25%', heal_strong: 'Cura fuerte', heal_light: 'Cura leve',
  life_drain: 'Drenar vida', knockdown_dmg: 'Derribo + daño', knockdown_min: 'Derribo',
  gamebomb: 'Bomba de juego', candy: 'Convertir en caramelo', naughty_book: 'Libro pervertido',
  ohko_lowacc: 'OHKO baja acc', android_kill: 'Matar androide',
  avoid_beam: 'Esquivar rayo', avoid_damage: 'Esquivar daño', avoid_damage_taiyoken: 'Esquivar (Taiyoken)',
  reduce_damage: 'Reducir daño', absorb_beam: 'Absorber rayo', beam_shield: 'Escudo rayo',
  damage_shield: 'Escudo daño', command_cancel: 'Cancelar comando',
};

const CARD_TYPE_ORDER: Array<{ type: string; label: string }> = [
  { type: 'beam', label: 'Rayo (beam)' },
  { type: 'damage', label: 'Daño físico' },
  { type: 'command', label: 'Comando' },
  { type: 'support', label: 'Soporte' },
  { type: 'defense', label: 'Defensa' },
  { type: 'special', label: 'Especial' },
];

type ManifestShape = Record<string, { frames?: Array<{ file?: string }> }>;

function CharacterAttacks({ charId, formId }: { charId: string; formId: string }) {
  const [manifest, setManifest] = useState<ManifestShape | null>(null);
  useEffect(() => {
    let alive = true;
    _spriteManifestInternals.loadManifestFor(formId).then(m => {
      if (alive) setManifest(m as ManifestShape | null);
    });
    return () => { alive = false; };
  }, [formId]);

  const limitIds = LIMIT_DEFAULTS[charId] ?? [];
  const limitCards = limitIds.map(id => getCard(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const usable = CARDS.filter(c => cardUsableBy(c, charId));
  const usableIds = new Set(usable.map(c => c.id));
  const deckCards = usable.filter(c => !limitIds.includes(c.id));

  const poseFrames = (pose: string): number => {
    if (!manifest) return 0;
    const resolved = resolveCombatPose(pose, p => (manifest[p]?.frames?.length ?? 0) > 0);
    if (!resolved) return 0;
    return manifest[resolved]?.frames?.length ?? 0;
  };

  const CardRow = ({ card, isLimit }: { card: NonNullable<ReturnType<typeof getCard>>; isLimit: boolean }) => {
    const pose = cardBattlePose(card);
    const poseFx = card.type === 'beam' ? 'beam_fire' : null;
    const n = poseFrames(pose);
    const color = CARD_COLORS[card.type];
    const beamChain = card.type === 'beam' ? ['beam_charge', 'beam_fire', 'beam_ray', 'beam_ray_tip'] : [];
    return (
      <div className="dev-attack-card" style={{ borderLeftColor: color }}>
        <span className="dev-attack-id">{String(card.id).padStart(2, '0')}</span>
        <span className="dev-attack-name" style={{ color }}>{card.name}</span>
        <span className="dev-attack-type">{CARD_TYPE_NAMES[card.type]}</span>
        <span className="dev-attack-effect" title={card.description ?? ''}>{EFFECT_LABELS[card.effect] ?? card.effect}</span>
        <span className="dev-attack-stat">CC {card.cc}</span>
        <span className="dev-attack-stat">ATK {card.atk}</span>
        {isLimit && <span className="dev-tag ok">LIMIT</span>}
        <span className={`dev-attack-pose ${n === 0 ? 'bad' : ''}`} title="Pose que dispara la carta en combate (canon cardBattlePose)">
          ▶ {pose}{poseFx ? ` → ${poseFx}` : ''}
          <em>{n > 0 ? `${n} frames` : 'sin frames en manifest'}</em>
        </span>
        {beamChain.length > 0 && (
          <span className="dev-attack-beamchain" title="Cadena visual del beam (OUT_frames: charge→fire→ray→tip)">
            {beamChain.map(b => {
              const bn = poseFrames(b);
              const resolved = resolveCombatPose(b, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
              const firstFile = resolved && manifest?.[resolved]?.frames
                ? manifest[resolved]?.frames?.[0]
                : null;
              const thumb = resolved && firstFile && typeof firstFile === 'object' && firstFile && 'file' in firstFile
                ? spriteFrameUrl(formId, String((firstFile as { file: string }).file))
                : undefined;
              return (
                <span key={b} className={`dev-attack-beamlink ${bn === 0 ? 'no-frame' : ''}`} title={`${b} — ${bn} frames`}>
                  {thumb ? <img src={thumb} alt={b} draggable={false} /> : <span className="dev-attack-beamdot">•</span>}
                  <em>{b.replace('beam_', '')}</em>
                </span>
              );
            })}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="dev-attacks">
      <div className="dev-attacks-summary">
        <span className="dev-tag ok">{limitCards.length} LIMIT</span>
        <span className="dev-tag">{usableIds.size} cartas usables</span>
        <span className="dev-tag">{deckCards.length} en mazo</span>
      </div>
      {limitCards.length > 0 && (
        <div className="dev-attack-group">
          <div className="dev-attack-group-head">Ataques LIMIT (firma del personaje)</div>
          {limitCards.map(c => <CardRow key={c.id} card={c} isLimit />)}
        </div>
      )}
      {CARD_TYPE_ORDER.map(({ type, label }) => {
        const cards = deckCards.filter(c => c.type === type);
        if (cards.length === 0) return null;
        return (
          <div key={type} className="dev-attack-group">
            <div className="dev-attack-group-head">{label} <em>{cards.length}</em></div>
            {cards.map(c => <CardRow key={c.id} card={c} isLimit={false} />)}
          </div>
        );
      })}
      {deckCards.filter(c => !CARD_TYPE_ORDER.some(g => g.type === c.type)).length > 0 && (
        <div className="dev-attack-group">
          <div className="dev-attack-group-head">Otras</div>
          {deckCards.filter(c => !CARD_TYPE_ORDER.some(g => g.type === c.type)).map(c => <CardRow key={c.id} card={c} isLimit={false} />)}
        </div>
      )}
    </div>
  );
}

// ═══ Frames atómicos V9 (sheet canónico) ───────────────────────────────
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
};

const FAMILY_LABELS: Record<string, string> = {
  idle: 'Base', ready: 'Base', movement: 'Movement', defense: 'Defense',
  melee: 'Melee', beam: 'Beam', power: 'Power', reaction: 'Reaction',
  effect: 'Effects', projectile: 'Projectiles', overworld: 'Overworld',
};
const STATUS_TAG: Record<string, string> = {
  CANONICAL: 'ok', RUNTIME_VERIFIED: 'ok', ASSET_VERIFIED: '', UNCLASSIFIED: 'bad', INFERRED: '',
};

function AtomicFrames({ sheet, formId }: { sheet: string; formId?: string }) {
  const [meta, setMeta] = useState<AtomicSheetMeta | null>(null);
  const [sheetImg, setSheetImg] = useState<HTMLImageElement | null>(null);
  // Fuente: manifest REAL de OUT_frames (public/assets/sprites/<dir>/manifest.json)
  const dir = formId ? (spriteDirFor(formId) ?? formId) : null;
  useEffect(() => {
    let alive = true;
    setMeta(null);
    setSheetImg(null);
    if (!dir) return;
    fetch(`/assets/sprites/${dir}/manifest.json?t=${Date.now()}`)
      .then(r => (r.ok ? r.json() : null))
      .then((m: Record<string, { frame_count?: number; fps?: number; loop?: boolean; frames?: Array<{ file: string; w: number; h: number }> }> | null) => {
        if (!alive || !m) return;
        // construir meta desde el manifest: cada pose es un bucket
        const frames: AtomicFrameMeta[] = [];
        const buckets: string[] = [];
        for (const [pose, spec] of Object.entries(m)) {
          const fl = spec?.frames ?? [];
          if (!fl.length) continue;
          buckets.push(pose);
          fl.forEach((fm, i) => {
            frames.push({
              file: fm.file,
              bucket: pose,
              alias: `${pose} ${i}`, x: i, y: 0, w: fm.w, h: fm.h,
            });
          });
        }
        setMeta({
          sheet: sheet.replace('.png', ''), dir: dir, columns: 4, rows: 0,
          cell_width: 32, cell_height: 32, frame_count: frames.length,
          buckets, frames,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [sheet, dir]);
  if (!meta) return null;

  const formDir = meta.dir;
  // agrupar por pose (bucket) directamente del manifest — sin canon V9
  type RG = { role: string; status: string; frames: AtomicFrameMeta[] };
  const famGroups = new Map<string, RG[]>();
  const unclassified: AtomicFrameMeta[] = [];
  for (const f of meta.frames) {
    const bucket = f.bucket;
    if (!bucket) { unclassified.push(f); continue; }
    let roles = famGroups.get(bucket);
    if (!roles) { roles = []; famGroups.set(bucket, roles); }
    let rg = roles.find(r => r.role === bucket);
    if (!rg) { rg = { role: bucket, status: 'ASSET_VERIFIED', frames: [] }; roles.push(rg); }
    rg.frames.push(f);
  }

  return (
    <div className="dev-atomic-section">
      <h3>Frames por pose — OUT_frames <span className="dev-atomic-count">({meta.frame_count} frames · {meta.dir})</span></h3>
      {[...famGroups.entries()].map(([family, roles]) => (
        <div key={family} className="dev-atomic-bucket">
          <div className="dev-atomic-bucket-head">
            <span className="dev-atomic-bucket-name">{BUCKET_LABELS[family] ?? family}</span>
            <span className="dev-atomic-bucket-cat">{roles.reduce((n, r) => n + r.frames.length, 0)} frames</span>
          </div>
          {roles.map(rg => (
            <div key={rg.role} className="dev-atomic-role">
              <div className="dev-atomic-role-head">
                <span className="dev-atomic-role-name">{rg.role}</span>
                <span className="dev-tag ok">{rg.status}</span>
                <span className="dev-atomic-bucket-cat">{rg.frames.length}</span>
              </div>
              <div className="dev-atomic-grid">
                {rg.frames.map(f => {
                  const label = f.file.replace('.png', '');
                  return (
                    <div key={f.file} className="dev-atomic-cell" title={`${f.file}`}>
                      <img src={`/assets/sprites/${formDir}/${f.file}`} alt={f.file} style={{ imageRendering: 'pixelated', width: f.w * 1.5, height: f.h * 1.5 }} />
                      <span className="dev-atomic-file">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      {unclassified.length > 0 && (
        <div className="dev-atomic-bucket">
          <div className="dev-atomic-bucket-head">
            <span className="dev-atomic-bucket-name">Unclassified</span>
            <span className="dev-tag bad">UNKNOWN</span>
            <span className="dev-atomic-bucket-cat">{unclassified.length} frames sin evidencia</span>
          </div>
          <div className="dev-atomic-grid">
            {unclassified.map(f => (
              <div key={f.file} className="dev-atomic-cell" title={`${f.file} · ${f.alias}`}>
                {sheetImg && <FrameCanvas img={sheetImg} f={f} />}
                <span className="dev-atomic-file">{f.file.replace('.png', '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

// ═══ Assets ════════════════════════════════════════════════════════════
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

// ═══ Bibliotecas de poses (COMBAT_POSE_ORDER con fallback trazable) ═══
const POSE_GROUPS: Array<{ key: string; label: string; poses: string[] }> = [
  { key: 'base', label: 'Base', poses: ['idle'] },
  { key: 'movement', label: 'Movement', poses: ['move_front', 'move_back'] },
  { key: 'defense', label: 'Defense', poses: ['guard', 'beam_guard', 'evade'] },
  { key: 'melee', label: 'Melee', poses: ['attack_fwd', 'attack_ud', 'punch_right', 'punch_left', 'kick_right'] },
  { key: 'reaction', label: 'Reaction', poses: ['hurt', 'knockback_back', 'knockback_up', 'knockback_down'] },
  { key: 'beam', label: 'Energy', poses: ['beam_charge', 'beam_fire', 'beam_ray', 'beam_ray_tip'] },
  { key: 'power', label: 'Power / Support', poses: ['gather_power', 'power_up', 'aura_power', 'aura_support'] },
];

function AllPosesGrid({ formId, activePose, onPoseSelect }: {
  formId: string;
  activePose?: string;
  onPoseSelect?: (pose: string) => void;
}) {
  // ── Hooks: TODOS antes de cualquier return ──
  const [poses, setPoses] = useState<CombatPoseAsset[] | null>(null);
  const [manifest, setManifest] = useState<ManifestShape | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<{ pose: string; index: number; file: string } | null>(null);
  const [replacing, setReplacing] = useState<{ pose: string; index: number; file: string } | null>(null);
  const [candidate, setCandidate] = useState<string | null>(null);
  const [frameOverrides, setFrameOverrides] = useState<Record<string, string>>(() => loadJson(FRAME_OVERRIDES_KEY, {}));

  useEffect(() => {
    try { localStorage.setItem(FRAME_OVERRIDES_KEY, JSON.stringify(frameOverrides)); } catch { /* noop */ }
  }, [frameOverrides]);

  useEffect(() => {
    let alive = true;
    const bundle = getCharacterAssetBundle(getForm(formId)?.character ?? 'goku', formId);
    resolveBundlePoses(bundle).then(ps => { if (alive) setPoses(ps); });
    _spriteManifestInternals.loadManifestFor(formId).then(m => {
      if (alive) setManifest(m as ManifestShape | null);
    });
    return () => { alive = false; };
  }, [formId]);

  // Todos los archivos físicos del manifest (para el picker de reemplazo)
  const allFiles = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ file: string; pose: string }> = [];
    if (manifest) {
      for (const [pose, m] of Object.entries(manifest)) {
        for (const f of (m?.frames ?? [])) {
          if (f.file && !seen.has(f.file)) { seen.add(f.file); out.push({ file: f.file, pose }); }
        }
      }
    }
    return out;
  }, [manifest]);

  if (!poses) return <div className="dev-hint">Resolviendo poses del canon…</div>;

  const resolved = poses.filter(p => p.url);
  const missing = poses.filter(p => !p.url);

  const poseFrames = (pose: string): string[] => {
    const resolvedPose = resolveCombatPose(pose, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
    if (!resolvedPose || !manifest?.[resolvedPose]?.frames) return [];
    return manifest[resolvedPose].frames.map(f => f.file ?? '').filter(Boolean);
  };
  const prefix = (pose: string): string => {
    const resolvedPose = resolveCombatPose(pose, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
    return resolvedPose ?? pose;
  };

  const overrideKey = (pose: string, index: number) => `${pose}:${index}`;
  const appliedFile = (pose: string, index: number, original: string) =>
    frameOverrides[overrideKey(pose, index)] ?? original;

  const applyReplacement = () => {
    if (!replacing || !candidate) return;
    setFrameOverrides(o => ({ ...o, [overrideKey(replacing.pose, replacing.index)]: candidate }));
    setReplacing(null);
    setCandidate(null);
  };
  const clearReplacement = (pose: string, index: number) => {
    setFrameOverrides(o => {
      const n = { ...o };
      delete n[overrideKey(pose, index)];
      return n;
    });
    if (replacing && replacing.pose === pose && replacing.index === index) {
      setReplacing(null); setCandidate(null);
    }
  };

  return (
    <div className="dev-poses-section">
      <h3>Poses de combate — canon completo ({resolved.length}/{poses.length} con frame físico)
        {Object.keys(frameOverrides).length > 0 && (
          <span className="dev-override-count">
            {Object.keys(frameOverrides).length} frame(s) reemplazado(s)
            <button className="dev-btn dev-btn-mini" onClick={() => setFrameOverrides({})}>limpiar todos</button>
          </span>
        )}
      </h3>

      <div className="dev-pose-library">
        {POSE_GROUPS.map(g => {
          const groupPoses = g.poses
            .map(pid => poses.find(p => p.pose === pid))
            .filter((p): p is CombatPoseAsset => !!p);
          if (groupPoses.length === 0) return null;
          return (
            <div key={g.key} className="dev-pose-group-block">
              <div className="dev-pose-group-label">{g.label}</div>
              <div className="dev-pose-grid dev-pose-grid-frames">
                {groupPoses.map(p => {
                  const frames = poseFrames(p.pose);
                  const resolvedPose = prefix(p.pose);
                  // Fuente real: manifest OUT_frames (sin canon V9)
                  const canonLabel = frames.length > 0 ? `${p.pose}/${frames.length}f` : 'sin frame';
                  const hasOverride = frames.some((_, i) => frameOverrides[overrideKey(p.pose, i)]);
                  const isActive = activePose === p.pose;
                  return (
                    <div key={p.pose} className={`dev-pose-card ${p.url ? '' : 'no-frame'} ${hasOverride ? 'has-override' : ''} ${isActive ? 'pose-active' : ''}`}
                      title={`${p.pose}${p.fallback.length > 0 ? ` → ${p.fallback.join(' → ')}` : ''} · ${p.group}${isActive ? '\n(pose activa en el preview)' : ''}`}>
                      <div className="dev-pose-card-head">
                        <button className="dev-pose-card-name-btn" onClick={() => onPoseSelect?.(p.pose)} title="Mostrar en el preview">
                          <span className="dev-pose-card-name">{p.pose}{hasOverride && <em className="dev-override-badge">edit</em>}</span>
                          <span className="dev-pose-card-preview">▶</span>
                        </button>
                        <span className={`dev-tag ${frames.length > 0 ? 'ok' : 'bad'}`}>{canonLabel}</span>
                        <span className="dev-pose-card-count">{frames.length} frames</span>
                      </div>
                      <div className="dev-pose-card-frames">
                        {frames.length > 0 ? frames.map((f, i) => {
                          const file = appliedFile(p.pose, i, f);
                          const overridden = file !== f;
                          return (
                            <button key={`${f}-${i}`} className={`dev-pose-card-frame ${selectedFrame?.file === f && selectedFrame.index === i && selectedFrame.pose === p.pose ? 'selected' : ''} ${overridden ? 'overridden' : ''}`}
                              onClick={() => setSelectedFrame(selectedFrame?.file === f && selectedFrame.index === i && selectedFrame.pose === p.pose ? null : { pose: p.pose, index: i, file: f })}
                              title={`${f} · frame ${i} de ${resolvedPose}${overridden ? `\n⚠ reemplazado por ${file}` : ''}\nClic para inspeccionar / reemplazar`}>
                              <img src={spriteFrameUrl(formId, file)} alt={`${p.pose}_${i}`} loading="lazy" />
                              <span className="dev-pose-card-frame-name">{file.replace(/^.*?_/, '').replace('.png', '')}</span>
                            </button>
                          );
                        }) : (
                          <span className="dev-asset-missing">— sin frames físicos —</span>
                        )}
                      </div>

                      {selectedFrame && selectedFrame.pose === p.pose && (
                        <div className="dev-frame-inspector">
                          <div className="dev-frame-inspector-head">
                            <span className="dev-frame-inspector-file">{appliedFile(selectedFrame.pose, selectedFrame.index, selectedFrame.file)}</span>
                            <button className="dev-btn dev-btn-mini" onClick={() => setSelectedFrame(null)}>✕</button>
                          </div>
                          <div className="dev-frame-inspector-preview">
                            <div className="dev-checker-bg">
                              <img src={spriteFrameUrl(formId, appliedFile(selectedFrame.pose, selectedFrame.index, selectedFrame.file))} alt="Frame inspector"
                                style={{ imageRendering: 'pixelated' }} />
                            </div>
                          </div>
                          <div className="dev-frame-inspector-meta">
                            <span>Pose: <b>{selectedFrame.pose}</b></span>
                            <span>Frame #{selectedFrame.index}</span>
                            <span>Archivo: <code>{appliedFile(selectedFrame.pose, selectedFrame.index, selectedFrame.file)}</code></span>
                          </div>
                          <div className="dev-frame-actions">
                            {frameOverrides[overrideKey(selectedFrame.pose, selectedFrame.index)] ? (
                              <button className="dev-btn dev-btn-mini" onClick={() => clearReplacement(selectedFrame.pose, selectedFrame.index)}>↩ Restaurar original</button>
                            ) : (
                              <button className="dev-btn dev-btn-mini"
                                onClick={() => { setReplacing(selectedFrame); setCandidate(null); }}>⇄ Reemplazar frame…</button>
                            )}
                          </div>
                        </div>
                      )}

                      {p.fallback.length > 0 && (
                        <div className="dev-pose-fallback-row">fallback: {p.fallback.join(' → ')} → <b>{p.resolvedPose}</b></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Picker de reemplazo — comparación antes/después */}
      {replacing && (
        <div className="dev-replace-overlay">
          <div className="dev-replace-panel">
            <div className="dev-replace-head">
              <span>Reemplazar frame — <code>{replacing.pose}[{replacing.index}]</code></span>
              <button className="dev-btn dev-btn-mini" onClick={() => { setReplacing(null); setCandidate(null); }}>✕</button>
            </div>
            <div className="dev-replace-compare">
              <div className="dev-replace-side">
                <div className="dev-replace-side-label">Actual</div>
                <div className="dev-checker-bg dev-replace-img">
                  <img src={spriteFrameUrl(formId, appliedFile(replacing.pose, replacing.index, replacing.file))} alt="Frame actual" style={{ imageRendering: 'pixelated' }} />
                </div>
                <code className="dev-replace-file">{appliedFile(replacing.pose, replacing.index, replacing.file)}</code>
              </div>
              <div className="dev-replace-arrow">→</div>
              <div className="dev-replace-side">
                <div className="dev-replace-side-label">Reemplazo{candidate ? '' : ' (elige abajo)'}</div>
                <div className="dev-checker-bg dev-replace-img">
                  {candidate
                    ? <img src={spriteFrameUrl(formId, candidate)} alt="Frame candidato" style={{ imageRendering: 'pixelated' }} />
                    : <span className="dev-asset-missing">—</span>}
                </div>
                <code className="dev-replace-file">{candidate ?? '—'}</code>
              </div>
            </div>
            <div className="dev-replace-actions">
              <button className="dev-btn dev-btn-mini" disabled={!candidate} onClick={applyReplacement}>✓ Aplicar reemplazo</button>
              {candidate && (
                <button className="dev-btn dev-btn-mini" onClick={() => setCandidate(null)}>Limpiar selección</button>
              )}
            </div>
            <div className="dev-replace-picker">
              <div className="dev-replace-picker-title">Todos los frames del manifest ({allFiles.length})</div>
              <div className="dev-replace-grid">
                {allFiles.map(({ file, pose }) => (
                  <button key={file} className={`dev-replace-opt ${candidate === file ? 'selected' : ''} ${appliedFile(replacing.pose, replacing.index, replacing.file) === file ? 'current' : ''}`}
                    onClick={() => setCandidate(file)}
                    title={`${file} (pose ${pose})`}>
                    <img src={spriteFrameUrl(formId, file)} alt={file} loading="lazy" style={{ imageRendering: 'pixelated' }} />
                    <span>{file.replace(/^.*?_/, '').replace('.png', '')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dev-semantic-pose-row">{COMBAT_POSE_ORDER.join(' · ')}</div>
      <div className="dev-pose-legend">
        <span className="dev-pose-legend-title">Qué dispara cada pose (canon cartas):</span>
        <span><b>beam_charge / beam_fire</b> ← cartas beam (Kamehameha, Masenko…)</span>
        <span><b>attack_fwd / punch / kick</b> ← cartas damage y command</span>
        <span><b>guard / evade / beam_guard</b> ← cartas defense</span>
        <span><b>gather_power / power_up / aura_*</b> ← soporte y GATHER (aura overlay)</span>
        <span className="dev-pose-fx-note"><b>beam_ray / beam_ray_tip</b> ← referencias de sheet del proyectil (FX), no poses de personaje — por eso no tienen frame físico propio</span>
        <span><b>move_front / move_back</b> ← comando MOVE</span>
        <span><b>hurt / knockback</b> ← recibir daño (defensor)</span>
      </div>
      {missing.length > 0 && (
        <p className="dev-hint">Sin frame físico (el runtime usa fallback o no existe en esta forma): {missing.map(m => m.pose).join(', ')}</p>
      )}
    </div>
  );
}

// ═══ Retratos de story del personaje ═══════════════════════════════════
function StoryPortraitsGrid({ charId, formId }: { charId: string; formId: string }) {
  const entry = STORY_PORTRAITS[charId];
  const urls = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ src: string; label: string }> = [];
    const push = (url: string | undefined, label: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ src: url, label });
    };
    if (entry) {
      push(entry.base, 'story base');
      for (const [k, v] of Object.entries(entry.emotions ?? {})) push(v, `story ${k}`);
      for (const [k, v] of Object.entries(entry.forms ?? {})) push(v, `story ${k}`);
    }
    push(storyPortraitUrl(charId, formId), 'story forma actual');
    return out;
  }, [entry, charId, formId]);

  if (urls.length === 0) return <span className="dev-hint">Sin retratos de story mapeados para {charId}</span>;
  return (
    <div className="dev-story-portraits">
      {urls.map((u: { src: string; label: string }) => <AssetCell key={u.label} label={u.label} src={u.src} small />)}
    </div>
  );
}

export { characterName };

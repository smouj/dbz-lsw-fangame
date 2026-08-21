// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio (REESCRITURA COMPLETA)
// ─────────────────────────────────────────────────────────────────────────
// Vista única de personaje: lista → detalle → secciones jerarquizadas.
//
//   · Sidebar: personajes del roster (vertical, sticky)
//   · Header: retrato + nombre (editable inline) + tags de la forma
//   · Tabs: formas del personaje (nombres editables inline)
//   · Sheet: Preview (FormPreview controlado) + Stats/nivel (2 col)
//   · Assets: portrait · overworld · idle · battle OW · power · sheet
//   · Retratos: battle · menú · story (grid verificada)
//   · Frames: browser por pose con inspector (bbox/alpha/specks/dupes)
//     + reemplazo de frames (override local o guardar en disco)
//
// REGLA DE ORO: todos los hooks ANTES de cualquier return condicional.
// (Dos bugs de "Rendered more hooks than during the previous render" se
// corrigieron moviendo useState/useMemo al inicio de los componentes.)
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl, LIMIT_DEFAULTS,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { MENU_PORTRAITS } from '../data/icons';
import { STORY_PORTRAITS, storyPortraitUrl } from '../data/storyPortraits';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from '../data/battleOverworld';
import { characterName } from '../data/storyPanels';
import { useSheetAnalysis, groupFramesByPose, type FrameAnalysis } from './frameAnalysis';
import { poseSemantics, parseFrameName } from './frameSemantics';
import { FormPreview } from './FormPreview';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';

// ═══ Escritura real a disco (middleware /__dev/write) ──────────────────
async function frameDataUrl(rel: string): Promise<string> {
  const r = await fetch(`/assets/${rel}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`lectura ${rel}: HTTP ${r.status}`);
  const blob = await r.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function writeAssetToDisk(rel: string, dataUrl: string): Promise<void> {
  const r = await fetch('/__dev/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rel, data: dataUrl.split(',')[1] ?? dataUrl }),
  });
  if (!r.ok) throw new Error(`escritura ${rel}: HTTP ${r.status} ${await r.text()}`);
}

// ═══ Constantes ─────────────────────────────────────────────────────────
const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

const NAMES_KEY = 'dbzlsw:char-names';

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
                  {spriteDir && (
                    <button className="dev-btn dev-btn-mini"
                      title="Abrir la carpeta física del sprite en Asset Explorer"
                      onClick={() => onOpenModule?.('assets', { formId: form.id })}>📁 carpeta</button>
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

          {/* SECCIÓN 2 — Assets de la forma + Retratos */}
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
                <AssetCell label="Menú" src={MENU_PORTRAITS[char.id]} small />
                <StoryPortraitsGrid charId={form.character} formId={form.id} />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3 — Frames del manifest (browser por pose + reemplazo) */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">
              Frames del manifest
              <span className="dev-sheets-count">{analysis.frames.length} frames · {analysis.problemCount} avisos</span>
            </h3>
            {analysis.overridden && (
              <div className="dev-wip-banner">
                Overrides locales activos — los frames pueden diferir de los manifests OUT_frames.{' '}
                <button className="dev-btn" onClick={analysis.clearOverrideLocal}>Limpiar override</button>
              </div>
            )}
            <FrameBrowser formId={form.id} analysis={analysis} dir={spriteDir} />
          </section>
        </div>
      </div>
    </div>
  );
}

// ═══ FrameBrowser — pose → grid de frames → inspector + reemplazo ──────
const FRAME_OVERRIDES_KEY = 'dbzlsw-frame-overrides-v2';

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FRAME_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch { return {}; }
}

function FrameBrowser({ formId, analysis, dir }: {
  formId: string;
  analysis: ReturnType<typeof useSheetAnalysis>;
  dir: string | undefined;
}) {
  const [pose, setPose] = useState('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);
  const [overrides, setOverrides] = useState<Record<string, string>>(loadOverrides);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(FRAME_OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* noop */ }
  }, [overrides]);

  const groups = groupFramesByPose(analysis.frames, dir);
  const activeGroup = groups.find(g => g.pose === pose) ?? groups[0];

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.pose === pose)) setPose('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.frames]);

  const selFrame = analysis.frames.find(f => f.file === selected) ?? null;
  const selUsages = selFrame ? (analysis.usages[selFrame.file] ?? []) : [];

  // Todos los archivos del manifest (para el picker de reemplazo)
  const allFiles = useMemo(() => {
    const seen = new Set<string>();
    for (const f of analysis.frames) {
      if (!seen.has(f.file)) seen.add(f.file);
    }
    return [...seen];
  }, [analysis.frames]);

  const appliedFile = (file: string) => overrides[file] ?? file;
  const hasOverride = selFrame ? overrides[selFrame.file] !== undefined : false;

  const applyReplacement = () => {
    if (!selFrame || !candidate) return;
    setOverrides(o => ({ ...o, [selFrame.file]: candidate }));
    setReplacing(null);
    setCandidate(null);
  };

  const clearReplacement = () => {
    if (!selFrame) return;
    setOverrides(o => {
      const n = { ...o };
      delete n[selFrame.file];
      return n;
    });
    setReplacing(null);
    setCandidate(null);
  };

  const saveToDisk = async () => {
    if (!selFrame || !dir) return;
    const original = selFrame.file;
    const replacement = overrides[original];
    if (!replacement || replacement === original) return;
    if (!confirm(`Sobrescribir en disco:\nsprites/${dir}/${original}\ncon el contenido de:\nsprites/${dir}/${replacement}\n\nEsto afecta a TODAS las poses que usan ese frame.`)) return;
    try {
      const dataUrl = await frameDataUrl(`sprites/${dir}/${replacement}`);
      await writeAssetToDisk(`sprites/${dir}/${original}`, dataUrl);
      clearReplacement();
      alert('✓ Guardado en disco. Recarga el juego para ver el cambio (el manifest no cambia).');
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

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
            {activeGroup.frames.map(f => {
              const overridden = overrides[f.file] !== undefined;
              return (
                <button key={f.file}
                  className={`dev-sheet-cell ${selected === f.file ? 'active' : ''} ${f.touchesEdge && f.touchTop > 3 ? 'edge' : ''} ${f.bgSpecks > 0 ? 'speck' : ''} ${f.dupeOf ? 'dupe' : ''} ${overridden ? 'has-override' : ''}`}
                  onClick={() => setSelected(f.file)}
                  title={`${f.file}${overridden ? `\n⚠ reemplazado por ${overrides[f.file]}` : ''}\n${f.w}×${f.h} · ${activeGroup.sem.meaning}\n${f.touchesEdge ? '⚠ toca borde' : ''}${f.bgSpecks ? `\n${f.bgSpecks} specks` : ''}${f.dupeOf ? `\n⧉ duplicado de ${f.dupeOf}` : ''}`}>
                  <span className="dev-sheet-thumb">
                    <img src={spriteFrameUrl(formId, appliedFile(f.file))} alt={f.file} loading="lazy" decoding="async"
                      width={f.w} height={f.h} style={{ width: f.w * 2, height: f.h * 2, imageRendering: 'pixelated' }} />
                  </span>
                  <span className="dev-sheet-name">{f.file.replace(`${dir ?? ''}_`, '').replace('.png', '')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspector */}
      {selFrame ? (() => {
        const { pose: fpose } = parseFrameName(selFrame.file, dir ?? '');
        const sem = poseSemantics(fpose);
        const shownFile = appliedFile(selFrame.file);
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
            <h3>{shownFile} <small>{selFrame.w}×{selFrame.h}px · {selFrame.alphaPct}% alpha</small></h3>
            <div className={`dev-pose-group-head cat-${sem.category.toLowerCase()}`}>
              <span className="dev-pose-group-name">{fpose}</span>
              <span className="dev-pose-group-cat">{sem.category}</span>
            </div>
            <p className="dev-sheet-sem-meaning">{sem.meaning}</p>
            <div className="dev-checker-bg">
              <FrameZoom imgSrc={spriteFrameUrl(formId, shownFile)} w={selFrame.w} h={selFrame.h} zoom={zoom} bbox={selFrame.opaque} />
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
            <code className="dev-manifest-path">sprites/{dir}/{shownFile}</code>

            {/* Acciones de reemplazo */}
            <div className="dev-frame-actions">
              {hasOverride ? (
                <>
                  <button className="dev-btn dev-btn-mini dev-btn-danger" onClick={clearReplacement}>↩ Restaurar original</button>
                  <button className="dev-btn dev-btn-mini" onClick={saveToDisk}>💾 Guardar en disco</button>
                </>
              ) : (
                <button className="dev-btn dev-btn-mini"
                  onClick={() => { setReplacing(selFrame.file); setCandidate(null); }}>⇄ Reemplazar frame…</button>
              )}
            </div>

            {/* Picker de reemplazo */}
            {replacing === selFrame.file && (
              <div className="dev-replace-inline">
                <div className="dev-replace-picker-title">
                  Todos los frames del manifest ({allFiles.length})
                  <span className="dev-hint"> elige uno para {selFrame.file}</span>
                </div>
                <div className="dev-replace-grid">
                  {allFiles.map(file => (
                    <button key={file} className={`dev-replace-opt ${candidate === file ? 'selected' : ''} ${file === selFrame.file ? 'current' : ''}`}
                      onClick={() => setCandidate(file)}
                      title={`${file} (reemplaza a ${selFrame.file})`}>
                      <img src={spriteFrameUrl(formId, file)} alt={file} loading="lazy" decoding="async" style={{ imageRendering: 'pixelated' }} />
                      <span>{file.replace(/^.*?_/, '').replace('.png', '')}</span>
                    </button>
                  ))}
                </div>
                <div className="dev-replace-actions">
                  <button className="dev-btn dev-btn-mini" disabled={!candidate} onClick={applyReplacement}>✓ Aplicar reemplazo</button>
                  <button className="dev-btn dev-btn-mini" onClick={() => setReplacing(null)}>Cancelar</button>
                </div>
              </div>
            )}
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

// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Asset Explorer
// ─────────────────────────────────────────────────────────────────────────
// Navegación real de carpetas de public/assets (sprites, portraits, …),
// con mapeo forma → frames, validación de huérfanos/rotos y edición real
// de frames (subir/reemplazar PNG en disco vía middleware /__dev/write).
//
//   · Tab CARPETAS: navega el árbol de assets como un file browser.
//     Cada PNG se previsualiza; clic → inspector (ruta copiable, tamaño,
//     acciones: reemplazar con upload / abrir en pestaña nueva).
//   · Tab MAPEO: tabla forma → dir de sprites → manifest → poses → frames,
//     con enlaces a Character Studio y a la carpeta física.
//   · Tab VALIDACIÓN: por forma, archivos en disco no referenciados por el
//     manifest (huérfanos) y refs del manifest sin archivo (rotos).
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHARACTERS, FORMS } from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl, _spriteManifestInternals } from '../data/spriteManifest';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { MENU_PORTRAITS } from '../data/icons';
import { STORY_PORTRAITS } from '../data/storyPortraits';
import { overworldUrl } from '../data/overworld';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';

// ═══ API del middleware dev ────────────────────────────────────────────
interface ListEntry { name: string; size: number; mtime: number; }
interface ListResult { rel: string; dirs: string[]; files: ListEntry[]; }

async function listDir(rel: string): Promise<ListResult> {
  const r = await fetch(`/__dev/list?dir=${encodeURIComponent(rel)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`list ${rel}: HTTP ${r.status}`);
  return r.json();
}

async function writeAsset(rel: string, dataUrl: string): Promise<void> {
  const r = await fetch('/__dev/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rel, data: dataUrl.split(',')[1] ?? dataUrl }),
  });
  if (!r.ok) throw new Error(`write ${rel}: HTTP ${r.status} ${await r.text()}`);
}

async function deleteAsset(rel: string): Promise<void> {
  const r = await fetch('/__dev/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rel }),
  });
  if (!r.ok) throw new Error(`delete ${rel}: HTTP ${r.status} ${await r.text()}`);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function imgUrl(rel: string, mtime?: number): string {
  return `/assets/${rel}${mtime ? `?t=${Math.round(mtime)}` : ''}`;
}

// ═══ JsonPreview — muestra el contenido de un manifest.json ────────────
function JsonPreview({ rel }: { rel: string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setText(null);
    setErr(null);
    fetch(`/assets/${rel}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(t => { if (alive) setText(t); })
      .catch(e => { if (alive) setErr(String(e)); });
    return () => { alive = false; };
  }, [rel]);
  if (err) return <pre className="dev-assets-json-preview dev-error">{err}</pre>;
  if (text === null) return <div className="dev-hint">Cargando {rel}…</div>;
  let pretty = text;
  try { pretty = JSON.stringify(JSON.parse(text), null, 1); } catch { /* noop */ }
  return <pre className="dev-assets-json-preview">{pretty}</pre>;
}

// ═══ Módulo principal ──────────────────────────────────────────────────
export function AssetsModule({ onOpenModule, target }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
  target?: DevLinkedTarget | null;
}) {
  const [tab, setTab] = useState<'folders' | 'mapping' | 'validate'>('folders');
  // Si venimos de Character Studio con un formId, abrir directamente su carpeta
  const initialDir = useMemo(() => {
    if (!target?.formId) return '';
    const dir = spriteDirFor(target.formId);
    return dir ? `sprites/${dir}` : '';
  }, [target]);
  const [forcedDir, setForcedDir] = useState<string | null>(null);
  const effectiveDir = forcedDir ?? initialDir;
  const [dirNonce, setDirNonce] = useState(0);
  useEffect(() => {
    if (effectiveDir) setDirNonce(n => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDir]);
  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Asset Explorer</h1>
        <p className="dev-sub">
          Carpetas físicas de <code>public/assets</code> · mapeo forma → frames · validación de huérfanos y rotos.
        </p>
      </header>
      <div className="dev-tabs">
        <button className={`dev-tab ${tab === 'folders' ? 'active' : ''}`} onClick={() => setTab('folders')}>Carpetas</button>
        <button className={`dev-tab ${tab === 'mapping' ? 'active' : ''}`} onClick={() => setTab('mapping')}>Mapeo por forma</button>
        <button className={`dev-tab ${tab === 'validate' ? 'active' : ''}`} onClick={() => setTab('validate')}>Validación</button>
      </div>
      {tab === 'folders' && <FolderBrowser key={`${effectiveDir}-${dirNonce}`} initialDir={effectiveDir} onOpenModule={onOpenModule} />}
      {tab === 'mapping' && <MappingTable onOpenModule={onOpenModule} />}
      {tab === 'validate' && <ValidationPanel onOpenModule={onOpenModule} />}
    </div>
  );
}

// ═══ Tab CARPETAS — file browser sobre public/assets ───────────────────
function FolderBrowser({ initialDir, onOpenModule }: {
  initialDir?: string;
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const [cwd, setCwd] = useState(initialDir ?? '');
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ListEntry | null>(null);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await listDir(dir);
      setData(d);
      setSelected(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(cwd); }, [cwd, refresh]);

  const crumbs = useMemo(() => {
    const parts = cwd ? cwd.split('/') : [];
    const out: Array<{ label: string; rel: string }> = [{ label: 'assets', rel: '' }];
    let acc = '';
    for (const p of parts) { acc = acc ? `${acc}/${p}` : p; out.push({ label: p, rel: acc }); }
    return out;
  }, [cwd]);

  const files = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    return q ? data.files.filter(f => f.name.toLowerCase().includes(q)) : data.files;
  }, [data, filter]);

  const openDirFromForm = (dir: string) => { setCwd(`sprites/${dir}`); };

  const onUpload = async (file: File | null) => {
    if (!file || !cwd) return;
    const rel = `${cwd}/${file.name}`;
    if (!/\.png$/.test(rel)) { alert('Solo se permite subir PNG'); return; }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await writeAsset(rel, dataUrl);
      await refresh(cwd);
    } catch (e) {
      alert(`Error al subir: ${e}`);
    } finally {
      setUploading(false);
    }
  };

  const onReplace = async (file: File | null, entry: ListEntry) => {
    if (!file || !cwd) return;
    const rel = `${cwd}/${entry.name}`;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await writeAsset(rel, dataUrl);
      await refresh(cwd);
    } catch (e) {
      alert(`Error al reemplazar: ${e}`);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (entry: ListEntry) => {
    if (!confirm(`¿Borrar ${cwd}/${entry.name}?`)) return;
    try {
      await deleteAsset(`${cwd}/${entry.name}`);
      await refresh(cwd);
    } catch (e) {
      alert(`Error al borrar: ${e}`);
    }
  };

  const copyPath = (rel: string) => {
    navigator.clipboard?.writeText(rel).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="dev-assets">
      {/* Breadcrumb */}
      <div className="dev-assets-crumbs">
        {crumbs.map((c, i) => (
          <span key={c.rel}>
            {i > 0 && <span className="dev-assets-sep">/</span>}
            <button className="dev-assets-crumb" onClick={() => setCwd(c.rel)}>{c.label}</button>
          </span>
        ))}
        <span className="dev-assets-count">{data ? `${data.dirs.length} carpetas · ${data.files.length} archivos` : ''}</span>
      </div>

      {/* Toolbar */}
      <div className="dev-assets-toolbar">
        <input className="dev-input dev-assets-filter" placeholder="Filtrar archivos…" value={filter}
          onChange={e => setFilter(e.target.value)} />
        <button className="dev-btn" disabled={!cwd || uploading} onClick={() => document.getElementById('dev-upload-input')?.click()}>
          {uploading ? 'Subiendo…' : '⬆ Subir PNG'}
        </button>
        <input id="dev-upload-input" type="file" accept="image/png" hidden
          onChange={e => { onUpload(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        <button className="dev-btn" onClick={() => refresh(cwd)}>⟳ Recargar</button>
        {copied && <span className="dev-assets-copied">✓ copiado</span>}
      </div>

      {error && <div className="dev-error">{error}</div>}
      {loading && <div className="dev-hint">Cargando…</div>}

      {/* Carpetas hijas */}
      {data && data.dirs.length > 0 && (
        <div className="dev-assets-dirs">
          {data.dirs.map(d => (
            <button key={d} className="dev-assets-dir" onClick={() => setCwd(cwd ? `${cwd}/${d}` : d)} title={`Abrir ${d}/`}>
              <span className="dev-assets-dir-icon">📁</span>
              <span>{d}</span>
            </button>
          ))}
        </div>
      )}

      {/* Archivos */}
      {data && files.length > 0 && (
        <div className="dev-sheets-grid" role="list" aria-label="Archivos de assets">
          {files.map(f => (
            <button key={f.name}
              className={`dev-sheet-cell ${selected?.name === f.name ? 'active' : ''} ${f.name.endsWith('.json') ? 'json' : ''}`}
              onClick={() => setSelected(selected?.name === f.name ? null : f)}
              title={`${f.name}\n${fmtSize(f.size)}`}>
              <span className="dev-sheet-thumb">
                {f.name.endsWith('.png')
                  ? <img src={imgUrl(cwd ? `${cwd}/${f.name}` : f.name, f.mtime)} alt={f.name} loading="lazy"
                      style={{ imageRendering: 'pixelated', maxWidth: 64, maxHeight: 64 }} />
                  : <span className="dev-assets-json-icon">{'{ }'}</span>}
              </span>
              <span className="dev-sheet-name">{f.name.replace(/\.png$|\.json$/, '')}</span>
            </button>
          ))}
        </div>
      )}
      {data && files.length === 0 && <div className="dev-empty">Carpeta vacía</div>}

      {/* Inspector de archivo */}
      {selected && (
        <div className="dev-sheets-inspector">
          <div className="dev-frame-inspector-head">
            <span className="dev-frame-inspector-file">
              <code>{cwd ? `${cwd}/${selected.name}` : selected.name}</code>
            </span>
            <span className="dev-assets-meta">{fmtSize(selected.size)}</span>
            <button className="dev-btn dev-btn-mini" onClick={() => setSelected(null)}>✕</button>
          </div>
          {selected.name.endsWith('.png') ? (
            <div className="dev-checker-bg dev-assets-preview">
              <img src={imgUrl(cwd ? `${cwd}/${selected.name}` : selected.name, selected.mtime)}
                alt={selected.name} style={{ imageRendering: 'pixelated' }} />
            </div>
          ) : (
            <JsonPreview rel={cwd ? `${cwd}/${selected.name}` : selected.name} />
          )}
          <div className="dev-assets-actions">
            <button className="dev-btn dev-btn-mini" onClick={() => copyPath(cwd ? `${cwd}/${selected.name}` : selected.name)}>
              ⧉ Copiar ruta
            </button>
            <button className="dev-btn dev-btn-mini"
              onClick={() => window.open(`/assets/${cwd ? `${cwd}/` : ''}${selected.name}`, '_blank')}>
              ↗ Abrir
            </button>
            {selected.name.endsWith('.png') && (
              <>
                <button className="dev-btn dev-btn-mini" onClick={() => document.getElementById('dev-replace-input')?.click()}>
                  ⇄ Reemplazar…
                </button>
                <input id="dev-replace-input" type="file" accept="image/png" hidden
                  onChange={e => { onReplace(e.target.files?.[0] ?? null, selected); e.target.value = ''; }} />
              </>
            )}
            <button className="dev-btn dev-btn-mini dev-btn-danger" onClick={() => onDelete(selected)}>🗑 Borrar</button>
          </div>
          {/* Atajo: si es un sprite de personaje, abrir en Character Studio */}
          {selected.name.endsWith('.png') && cwd.startsWith('sprites/') && (
            <div className="dev-assets-hint">
              <button className="dev-btn dev-btn-mini"
                onClick={() => onOpenModule?.('characters', { formId: cwd.split('/')[1], pose: 'idle' })}>
                Abrir {cwd.split('/')[1]} en Character Studio →
              </button>
            </div>
          )}
        </div>
      )}
      {!selected && cwd === '' && (
        <div className="dev-assets-root-hint">
          <p>Raíz de <code>public/assets</code>. Navega a <b>sprites/&lt;forma&gt;</b> para ver los frames de un personaje,
          a <b>portraits/story</b> para los retratos de historia, o <b>portraits/battle</b> para los de combate.</p>
          <p>Desde <b>Mapeo por forma</b> puedes saltar directo a la carpeta de cualquier forma.</p>
        </div>
      )}
    </div>
  );
}

// ═══ Tab MAPEO — forma → dir → manifest → poses → frames ──────────────
interface ManifestShape2 { frames?: Array<{ file?: string }>; }

interface ManifestSummary {
  formId: string;
  dir: string | undefined;
  manifestOk: boolean;
  poseCount: number;
  frameCount: number;
  portraitBattle: string | undefined;
  portraitMenu: string | undefined;
  storyCount: number;
  overworld: string | undefined;
  error?: string;
}

function useAllManifestSummaries(): { summaries: ManifestSummary[]; loading: boolean } {
  const [summaries, setSummaries] = useState<ManifestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const forms = Object.keys(FORMS);
    const dirFor = new Map(forms.map(id => [id, spriteDirFor(id)]));
    Promise.all(forms.map(async id => {
      const dir = dirFor.get(id);
      const base: ManifestSummary = {
        formId: id, dir, manifestOk: false, poseCount: 0, frameCount: 0,
        portraitBattle: BATTLE_PORTRAITS[id], portraitMenu: undefined, storyCount: 0, overworld: overworldUrl(id),
      };
      const char = CHARACTERS.find(c => c.id === id) ?? CHARACTERS.find(c => c.forms.includes(id));
      base.portraitMenu = char ? MENU_PORTRAITS[char.id] : undefined;
      base.storyCount = char ? Object.keys(STORY_PORTRAITS[char.id] ?? {}).length : 0;
      if (!dir) return base;
      try {
        const m = await _spriteManifestInternals.loadManifestFor(id) as Record<string, ManifestShape2> | null;
        const poses = Object.entries(m ?? {}).filter(([, v]) => (v?.frames?.length ?? 0) > 0);
        base.manifestOk = !!m;
        base.poseCount = poses.length;
        base.frameCount = poses.reduce((n, [, v]) => n + (v?.frames?.length ?? 0), 0);
      } catch (e) {
        base.error = String(e);
      }
      return base;
    })).then(rs => { if (alive) { setSummaries(rs); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  return { summaries, loading };
}

function MappingTable({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const { summaries, loading } = useAllManifestSummaries();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? summaries.filter(s => s.formId.includes(query)) : summaries;
  }, [summaries, q]);

  return (
    <div className="dev-assets">
      <div className="dev-assets-toolbar">
        <input className="dev-input dev-assets-filter" placeholder="Filtrar forma…" value={q} onChange={e => setQ(e.target.value)} />
        <span className="dev-assets-count">{loading ? 'Cargando…' : `${summaries.length} formas`}</span>
      </div>
      {loading && <div className="dev-hint">Leyendo manifests…</div>}
      {!loading && (
        <table className="dev-map-table">
          <thead>
            <tr>
              <th>Forma</th>
              <th>Dir sprites</th>
              <th>Manifest</th>
              <th>Poses</th>
              <th>Frames</th>
              <th>Portraits B/M/S</th>
              <th>Overworld</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.formId}>
                <td><code>{s.formId}</code></td>
                <td>{s.dir ? <code>{s.dir}</code> : <span className="dev-tag bad">sin dir</span>}</td>
                <td>
                  {s.manifestOk
                    ? <span className="dev-tag ok">✓</span>
                    : <span className="dev-tag bad">✕</span>}
                </td>
                <td>{s.poseCount}</td>
                <td>{s.frameCount}</td>
                <td>
                  <span className={`dev-dot ${s.portraitBattle ? 'ok' : 'bad'}`} title={s.portraitBattle ? 'battle ✓' : 'battle ✕'} />
                  <span className={`dev-dot ${s.portraitMenu ? 'ok' : 'bad'}`} title={s.portraitMenu ? 'menú ✓' : 'menú ✕'} />
                  <span className={`dev-dot ${s.storyCount > 0 ? 'ok' : 'bad'}`} title={`story ${s.storyCount}`} />
                </td>
                <td>{s.overworld ? <span className="dev-tag ok">✓</span> : <span className="dev-tag bad">✕</span>}</td>
                <td className="dev-map-actions">
                  <button className="dev-btn dev-btn-mini"
                    onClick={() => onOpenModule?.('characters', { formId: s.formId, pose: 'idle' })}>Studio</button>
                  {s.dir && (
                    <button className="dev-btn dev-btn-mini"
                      onClick={() => window.open(`/?dev=1#dev/assets`, '_blank')}
                      title="Abrir carpeta (navega en la pestaña Carpetas)">📁</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="dev-assets-root-hint">
        <p><b>Manifest</b>: <code>public/assets/sprites/&lt;dir&gt;/manifest.json</code> — fuente única del runtime.
        <b> Poses</b> = poses con ≥1 frame. <b>Frames</b> = frames físicos referenciados.</p>
      </div>
    </div>
  );
}

// ═══ Tab VALIDACIÓN — huérfanos y rotos por forma ──────────────────────
interface FormValidation {
  formId: string;
  dir: string | undefined;
  orphanFiles: string[];
  brokenRefs: string[];
  missingManifest: boolean;
}

function useValidation(): { rows: FormValidation[]; loading: boolean; refresh: () => void } {
  const [rows, setRows] = useState<FormValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const forms = Object.keys(FORMS);
    Promise.all(forms.map(async id => {
      const dir = spriteDirFor(id);
      const row: FormValidation = { formId: id, dir, orphanFiles: [], brokenRefs: [], missingManifest: false };
      if (!dir) return row;
      try {
        const [list, manifestRaw] = await Promise.all([
          listDir(`sprites/${dir}`).catch(() => null),
          _spriteManifestInternals.loadManifestFor(id).catch(() => null),
        ]);
        const manifest = manifestRaw as Record<string, ManifestShape2> | null;
        if (!manifest) { row.missingManifest = true; return row; }
        const refs = new Set<string>();
        for (const [, v] of Object.entries(manifest)) {
          for (const f of (v?.frames ?? [])) {
            if (f.file) { refs.add(f.file); row.brokenRefs.push(f.file); }
          }
        }
        const disk = new Set((list?.files ?? []).filter(f => f.name.endsWith('.png')).map(f => f.name));
        row.brokenRefs = [...refs].filter(f => !disk.has(f));
        row.orphanFiles = [...disk].filter(f => !refs.has(f));
      } catch (e) {
        row.brokenRefs = [`error: ${e}`];
      }
      return row;
    })).then(rs => { if (alive) { setRows(rs); setLoading(false); } });
    return () => { alive = false; };
  }, [nonce]);

  return { rows, loading, refresh };
}

function ValidationPanel({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const { rows, loading, refresh } = useValidation();
  const [filter, setFilter] = useState<'all' | 'issues'>('issues');

  const visible = useMemo(() => {
    const withIssues = rows.filter(r => r.orphanFiles.length > 0 || r.brokenRefs.length > 0 || r.missingManifest);
    return filter === 'all' ? rows : withIssues;
  }, [rows, filter]);

  const deleteOrphan = async (row: FormValidation, file: string) => {
    if (!row.dir) return;
    if (!confirm(`¿Borrar huérfano ${row.dir}/${file}?`)) return;
    try {
      await deleteAsset(`sprites/${row.dir}/${file}`);
      refresh();
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const issues = rows.filter(r => r.orphanFiles.length > 0 || r.brokenRefs.length > 0 || r.missingManifest).length;

  return (
    <div className="dev-assets">
      <div className="dev-assets-toolbar">
        <div className="dev-tabs dev-tabs-inline">
          <button className={`dev-tab ${filter === 'issues' ? 'active' : ''}`} onClick={() => setFilter('issues')}>
            Con problemas ({issues})
          </button>
          <button className={`dev-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Todas ({rows.length})
          </button>
        </div>
        <button className="dev-btn" onClick={refresh}>⟳ Re-validar</button>
      </div>
      {loading && <div className="dev-hint">Validando manifests contra disco…</div>}
      {!loading && visible.length === 0 && <div className="dev-empty">✓ Sin problemas: todos los frames referenciados existen y no hay huérfanos</div>}
      {!loading && visible.map(r => {
        const bad = r.orphanFiles.length > 0 || r.brokenRefs.length > 0 || r.missingManifest;
        return (
          <div key={r.formId} className={`dev-validate-form ${bad ? 'bad' : 'ok'}`}>
            <div className="dev-validate-head">
              <code>{r.formId}</code>
              {r.dir && <span className="dev-tag">sprites/{r.dir}</span>}
              {r.missingManifest && <span className="dev-tag bad">SIN MANIFEST</span>}
              <span className={`dev-tag ${bad ? 'bad' : 'ok'}`}>{bad ? 'problemas' : '✓ ok'}</span>
              {r.dir && (
                <button className="dev-btn dev-btn-mini"
                  onClick={() => onOpenModule?.('characters', { formId: r.formId, pose: 'idle' })}>Studio →</button>
              )}
            </div>
            {r.brokenRefs.length > 0 && (
              <div className="dev-validate-section">
                <span className="dev-validate-label bad">🔴 {r.brokenRefs.length} refs rotas (manifest → archivo inexistente):</span>
                <div className="dev-validate-files">
                  {r.brokenRefs.map(f => <code key={f}>{f}</code>)}
                </div>
              </div>
            )}
            {r.orphanFiles.length > 0 && (
              <div className="dev-validate-section">
                <span className="dev-validate-label warn">🟡 {r.orphanFiles.length} huérfanos en disco (no referenciados):</span>
                <div className="dev-validate-files">
                  {r.orphanFiles.map(f => (
                    <span key={f} className="dev-validate-orphan">
                      <code>{f}</code>
                      <button className="dev-btn dev-btn-mini" onClick={() => deleteOrphan(r, f)}>🗑</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="dev-assets-root-hint">
        <p><b>Rota</b>: el manifest referencia un archivo que no está en disco (rompería el render).
        <b> Huérfano</b>: el archivo existe pero ninguna pose lo usa (basura que infla el paquete).
        Puedes borrar huérfanos con 🗑 (la acción escribe en disco).</p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Code2, FileCode2, LayoutPanelLeft, Search } from 'lucide-react';
import type { DevModuleDef } from './DevStudio';

const sourceModules = import.meta.glob('../**/*.{ts,tsx,css,json,md}', {
  query: '?raw',
  import: 'default',
});

const PRIORITY_PATHS = [
  '../devtools/DevStudio.tsx',
  '../devtools/dashboard.tsx',
  '../devtools/characters.tsx',
  '../devtools/cards.tsx',
  '../devtools/animationStudio.tsx',
  '../devtools/romdisplay2/index.tsx',
  '../components/setup/CharacterRoll.tsx',
  '../components/setup/TeamSetup.tsx',
  '../battle/productionFrameResolver.ts',
  '../data/generated/romPhysicalCorpus.generated.ts',
  '../styles.css',
];

function nicePath(path: string): string {
  return path.replace(/^\.\.\//, 'src/');
}

function pathScore(path: string): number {
  const priority = PRIORITY_PATHS.indexOf(path);
  if (priority >= 0) return priority;
  if (path.includes('/devtools/')) return 100;
  if (path.includes('/components/setup/')) return 200;
  if (path.includes('/battle/')) return 300;
  if (path.includes('/data/')) return 400;
  if (path.endsWith('styles.css')) return 500;
  return 900;
}

function groupForPath(path: string): string {
  if (path.includes('/devtools/')) return 'Dev Studio';
  if (path.includes('/components/setup/')) return 'Game Setup';
  if (path.includes('/battle/')) return 'Battle Runtime';
  if (path.includes('/data/generated/')) return 'Generated Data';
  if (path.includes('/data/')) return 'Game Data';
  if (path.endsWith('styles.css')) return 'Styles';
  return 'Source';
}

export function WorkspaceModule({ modules }: { modules: readonly DevModuleDef[] }) {
  const files = useMemo(() => Object.keys(sourceModules)
    .sort((a, b) => pathScore(a) - pathScore(b) || nicePath(a).localeCompare(nicePath(b))), []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(files[0] ?? '');
  const [content, setContent] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files.slice(0, 180);
    return files.filter(path => nicePath(path).toLowerCase().includes(q)).slice(0, 180);
  }, [files, query]);

  useEffect(() => {
    let alive = true;
    if (!selected) return;
    setLoading(true);
    sourceModules[selected]?.()
      .then(raw => {
        if (!alive) return;
        const text = String(raw);
        setContent(text);
        setDraft(text);
      })
      .catch(error => {
        if (!alive) return;
        const text = `No se pudo cargar ${nicePath(selected)}\n\n${String(error)}`;
        setContent(text);
        setDraft(text);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selected]);

  const groupedPanels = useMemo(() => {
    const groups = new Map<string, DevModuleDef[]>();
    for (const mod of modules) groups.set(mod.group, [...(groups.get(mod.group) ?? []), mod]);
    return [...groups.entries()];
  }, [modules]);

  const dirty = draft !== content;

  return (
    <div className="dev-panel dev-workspace">
      <section className="dev-workspace-top">
        <div>
          <h1><Code2 size={18} /> Workspace</h1>
          <p>Fuente local del Dev Studio, setup y runtime. El editor es scratch local para revisar cambios antes de aplicarlos en el repo.</p>
        </div>
        <div className="dev-workspace-status">
          <span>{files.length} source files</span>
          <span>{modules.length} dev panels</span>
          <span className={dirty ? 'dirty' : 'clean'}>{dirty ? 'draft modified' : 'synced'}</span>
        </div>
      </section>

      <section className="dev-workspace-layout">
        <aside className="dev-workspace-files">
          <label className="dev-workspace-search">
            <Search size={14} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar archivo..." />
          </label>
          <div className="dev-workspace-file-list">
            {filtered.map(path => (
              <button
                key={path}
                className={`dev-workspace-file ${selected === path ? 'active' : ''}`}
                onClick={() => setSelected(path)}
                title={nicePath(path)}
              >
                <FileCode2 size={13} />
                <span>{nicePath(path)}</span>
                <small>{groupForPath(path)}</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="dev-workspace-editor">
          <div className="dev-workspace-editor-head">
            <div>
              <strong>{selected ? nicePath(selected) : 'Sin archivo'}</strong>
              <small>{loading ? 'cargando...' : `${draft.split('\n').length} lines`}</small>
            </div>
            <button className="dev-btn" type="button" onClick={() => setDraft(content)} disabled={!dirty}>Reset draft</button>
          </div>
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            spellCheck={false}
            className="dev-workspace-code"
          />
        </main>

        <aside className="dev-workspace-panels">
          <h2><LayoutPanelLeft size={15} /> Dev Panels</h2>
          {groupedPanels.map(([group, items]) => (
            <div className="dev-workspace-panel-group" key={group}>
              <h3>{group}</h3>
              {items.map(item => (
                <div className="dev-workspace-panel-row" key={item.id}>
                  <strong>{item.label}</strong>
                  <code>#dev/{item.id}</code>
                  <span>{item.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}

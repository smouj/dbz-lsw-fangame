import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, BookOpen, CheckCircle2, ExternalLink, FileCode2,
  FolderOpen, Gamepad2, GitBranch, Github, Hammer, HardDrive, Monitor,
  Play, RefreshCw, Server, ShieldCheck, Swords, Terminal, TestTube2,
  Wrench,
} from 'lucide-react';
import './systemHub.css';

type HubDestination =
  | 'dashboard' | 'validation' | 'workspace' | 'characters' | 'animation-studio'
  | 'romdisplay' | 'assets' | 'lab' | 'timeline' | 'combat' | 'positions'
  | 'hud' | 'cards' | 'research' | 'gameconfig';

type NativeAction =
  | 'open-repo' | 'open-rom-research' | 'open-traces' | 'open-docs'
  | 'open-scripts' | 'open-memory' | 'open-builds' | 'open-github'
  | 'open-devstudio' | 'open-game' | 'open-terminal' | 'open-vscode'
  | 'open-wsl' | 'start-dev' | 'typecheck' | 'tests' | 'build'
  | 'verify-ci' | 'verify-presentation' | 'verify-full-battle'
  | 'verify-physical' | 'verify-beam' | 'git-status' | 'git-fetch';

type NativeBridge = {
  core?: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
};

type StatusMap = Record<string, string>;

const REPO_STORAGE_KEY = 'dbzlsw_devhub_repo';

function bridge(): NativeBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TAURI__?: NativeBridge }).__TAURI__;
}

function nativeAvailable(): boolean {
  return typeof bridge()?.core?.invoke === 'function';
}

function parseProbe(lines: string[]): StatusMap {
  return Object.fromEntries(lines.map(line => {
    const index = line.indexOf('=');
    return index < 0 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
  }));
}

function statusTone(value?: string): 'ok' | 'warn' | 'muted' {
  if (!value) return 'muted';
  if (['clean', 'online', 'available', 'true'].includes(value)) return 'ok';
  if (['dirty', 'offline', 'not-found', 'false'].includes(value)) return 'warn';
  return 'muted';
}

interface SystemHubModuleProps {
  onNavigate: (id: HubDestination) => void;
}

interface QuickAction {
  label: string;
  desc: string;
  action: NativeAction;
  icon: typeof FolderOpen;
  emphasis?: boolean;
}

const OPEN_ACTIONS: QuickAction[] = [
  { label: 'Repositorio', desc: 'Abrir el root del proyecto en Explorer', action: 'open-repo', icon: FolderOpen, emphasis: true },
  { label: 'VS Code', desc: 'Abrir dbz-lsw-fangame directamente en VS Code', action: 'open-vscode', icon: FileCode2 },
  { label: 'Terminal', desc: 'PowerShell situado en el repo', action: 'open-terminal', icon: Terminal },
  { label: 'ROM Research', desc: 'Herramientas y decompilación ROM', action: 'open-rom-research', icon: HardDrive },
  { label: 'Trace Fixtures', desc: 'Capturas y fixtures ROM reproducibles', action: 'open-traces', icon: Activity },
  { label: 'Docs ROM', desc: 'Documentación técnica y auditorías', action: 'open-docs', icon: BookOpen },
  { label: 'Scripts', desc: 'Verifiers, generators y tooling', action: 'open-scripts', icon: Wrench },
  { label: 'Builds Tauri', desc: 'Instaladores y bundles de escritorio', action: 'open-builds', icon: Hammer },
];

const VERIFY_ACTIONS: QuickAction[] = [
  { label: 'Verify CI', desc: 'Gate completo del proyecto', action: 'verify-ci', icon: ShieldCheck, emphasis: true },
  { label: 'TypeScript', desc: 'tsc --noEmit', action: 'typecheck', icon: FileCode2 },
  { label: 'Tests', desc: 'Vitest completo', action: 'tests', icon: TestTube2 },
  { label: 'Production Build', desc: 'vite build', action: 'build', icon: Hammer },
  { label: 'Presentation', desc: 'Contrato de presentación ROM → Pixi', action: 'verify-presentation', icon: Monitor },
  { label: 'Full Battle E2E', desc: 'Bucle completo de combate', action: 'verify-full-battle', icon: Swords },
  { label: 'Physical Corpus', desc: '4.553 physical IDs / corpus ROM', action: 'verify-physical', icon: HardDrive },
  { label: 'Beam Trace', desc: 'Fixtures SCX/SCY y programa raster', action: 'verify-beam', icon: Activity },
];

const INTERNAL_TOOLS: Array<{ id: HubDestination; label: string; desc: string; icon: typeof Gamepad2 }> = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Estado real de fidelidad, blockers y cobertura', icon: Activity },
  { id: 'validation', label: 'Validation', desc: 'Integridad del proyecto y verdad visible', icon: CheckCircle2 },
  { id: 'workspace', label: 'Workspace', desc: 'Código, paneles y navegación de trabajo', icon: FileCode2 },
  { id: 'animation-studio', label: 'Animation Studio', desc: 'Frames físicos y ticks GBC', icon: Monitor },
  { id: 'romdisplay', label: 'ROM Display', desc: 'Paletas, Fighter OBJ, FX y Support', icon: HardDrive },
  { id: 'lab', label: 'Combat Lab', desc: 'Renderer Pixi y combate real en vivo', icon: Swords },
  { id: 'hud', label: 'HUD', desc: 'Overview/Action y composición de batalla', icon: Gamepad2 },
  { id: 'research', label: 'Research', desc: 'Fuentes, ROM y evidencias verificadas', icon: BookOpen },
];

export function SystemHubModule({ onNavigate }: SystemHubModuleProps) {
  const [repoPath, setRepoPath] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(REPO_STORAGE_KEY) ?? '';
  });
  const [status, setStatus] = useState<StatusMap>({});
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isNative = nativeAvailable();

  const invoke = useCallback(async <T,>(command: string, args?: Record<string, unknown>): Promise<T> => {
    const fn = bridge()?.core?.invoke;
    if (!fn) throw new Error('Esta acción requiere DBZ LSW Dev Hub instalado con Tauri.');
    return fn<T>(command, args);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      if (!nativeAvailable()) {
        setStatus({ devServer: 'browser', workingTree: 'n/a' });
        setMessage('Vista web: los módulos Dev funcionan, pero las acciones del sistema requieren el Dev Hub Tauri.');
        return;
      }
      const lines = await invoke<string[]>('devhub_probe', { repoPath: repoPath.trim() || null });
      const next = parseProbe(lines);
      setStatus(next);
      if (next.repo && next.repo !== repoPath) {
        setRepoPath(next.repo);
        window.localStorage.setItem(REPO_STORAGE_KEY, next.repo);
      }
      setMessage('Entorno actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRefreshing(false);
    }
  }, [invoke, repoPath]);

  useEffect(() => { void refresh(); }, []); // only initial auto-detection

  const runAction = async (action: NativeAction) => {
    setRunning(action);
    setError('');
    try {
      if (!isNative) {
        if (action === 'open-github') window.open('https://github.com/smouj/dbz-lsw-fangame', '_blank', 'noopener,noreferrer');
        else if (action === 'open-devstudio') window.open('http://localhost:5178/#dev/dashboard', '_blank', 'noopener,noreferrer');
        else if (action === 'open-game') window.open('http://localhost:5178/', '_blank', 'noopener,noreferrer');
        else throw new Error('Instala/ejecuta el flavor Tauri DBZ LSW Dev Hub para usar acciones del sistema.');
        return;
      }
      const result = await invoke<string>('devhub_action', { action, repoPath: repoPath.trim() || null });
      setMessage(result);
      if (action === 'git-fetch' || action === 'start-dev') window.setTimeout(() => { void refresh(); }, 1200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(null);
    }
  };

  const saveRepo = () => {
    window.localStorage.setItem(REPO_STORAGE_KEY, repoPath.trim());
    void refresh();
  };

  const health = useMemo(() => [
    { label: 'Git', value: status.workingTree ?? '—', detail: `${status.branch ?? '—'} · ${status.head ?? '--------'}`, tone: statusTone(status.workingTree), icon: GitBranch },
    { label: 'Origin', value: status.divergence ?? '—', detail: status.originHead ? `origin/main ${status.originHead}` : 'sin lectura', tone: status.divergence === '0 / 0' ? 'ok' as const : 'muted' as const, icon: Github },
    { label: 'Dev server', value: status.devServer ?? '—', detail: 'localhost:5178', tone: statusTone(status.devServer), icon: Server },
    { label: 'Toolchain', value: status.node ?? '—', detail: `npm ${status.npm ?? '—'} · ${status.rustc ?? 'rustc —'}`, tone: status.node && status.node !== 'not-found' ? 'ok' as const : 'warn' as const, icon: Monitor },
  ], [status]);

  return (
    <section className="system-hub" aria-label="DBZ LSW System Hub">
      <header className="hub-hero">
        <div>
          <div className="hub-eyebrow"><span className={`hub-live-dot ${isNative ? 'online' : ''}`} /> DBZ LSW DEVELOPMENT SYSTEM</div>
          <h1>System Hub</h1>
          <p>Un único centro para localizar entornos, abrir herramientas, ejecutar gates y entrar en cualquier módulo del proyecto.</p>
        </div>
        <div className="hub-hero-actions">
          <span className={`hub-native-pill ${isNative ? 'native' : ''}`}>{isNative ? 'TAURI NATIVE' : 'WEB MODE'}</span>
          <button className="hub-icon-button" type="button" onClick={() => void refresh()} disabled={refreshing} title="Actualizar entorno">
            <RefreshCw size={17} className={refreshing ? 'hub-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="hub-repo-bar">
        <div className="hub-repo-copy">
          <strong>Repositorio activo</strong>
          <span>Se autodetecta; puedes fijar otra copia local sin cambiar el código.</span>
        </div>
        <input value={repoPath} onChange={event => setRepoPath(event.target.value)} placeholder="D:\\CodexProjects\\dbz-lsw-fangame" spellCheck={false} />
        <button type="button" onClick={saveRepo}>Usar ruta</button>
      </div>

      {(message || error) && (
        <div className={`hub-notice ${error ? 'error' : 'ok'}`}>
          {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{error || message}</span>
        </div>
      )}

      <div className="hub-health-grid">
        {health.map(item => {
          const Icon = item.icon;
          return (
            <article className={`hub-health-card ${item.tone}`} key={item.label}>
              <div className="hub-health-icon"><Icon size={18} /></div>
              <div><small>{item.label}</small><strong>{item.value}</strong><span>{item.detail}</span></div>
            </article>
          );
        })}
      </div>

      <div className="hub-section-heading">
        <div><small>ENTORNOS</small><h2>Arranque y sincronización</h2></div>
      </div>
      <div className="hub-environment-grid">
        <button type="button" className="hub-environment primary" onClick={() => void runAction('start-dev')} disabled={running === 'start-dev'}>
          <Play size={20} /><span><strong>Dev Server</strong><small>Levanta Vite en :5178 en una terminal dedicada</small></span>
        </button>
        <button type="button" className="hub-environment" onClick={() => void runAction('open-wsl')}>
          <Terminal size={20} /><span><strong>WSL Workspace</strong><small>Abre la copia Linux de desarrollo</small></span>
        </button>
        <button type="button" className="hub-environment" onClick={() => void runAction('git-status')}>
          <GitBranch size={20} /><span><strong>Estado Git</strong><small>Branch, cambios y últimos commits</small></span>
        </button>
        <button type="button" className="hub-environment" onClick={() => void runAction('git-fetch')}>
          <RefreshCw size={20} /><span><strong>Fetch origin</strong><small>Actualiza refs sin merge/reset automático</small></span>
        </button>
        <button type="button" className="hub-environment" onClick={() => void runAction('open-github')}>
          <Github size={20} /><span><strong>GitHub</strong><small>smouj/dbz-lsw-fangame</small></span><ExternalLink size={15} />
        </button>
        <button type="button" className="hub-environment" onClick={() => void runAction('open-game')}>
          <Gamepad2 size={20} /><span><strong>Juego local</strong><small>Abre la build servida en navegador</small></span><ExternalLink size={15} />
        </button>
      </div>

      <div className="hub-columns">
        <section className="hub-panel">
          <div className="hub-section-heading compact"><div><small>FILESYSTEM</small><h2>Abrir y localizar</h2></div></div>
          <div className="hub-action-list">
            {OPEN_ACTIONS.map(item => {
              const Icon = item.icon;
              return (
                <button type="button" className={item.emphasis ? 'emphasis' : ''} key={item.action} onClick={() => void runAction(item.action)}>
                  <span className="hub-action-icon"><Icon size={17} /></span>
                  <span><strong>{item.label}</strong><small>{item.desc}</small></span>
                  <ExternalLink size={14} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="hub-panel">
          <div className="hub-section-heading compact"><div><small>QUALITY GATES</small><h2>Verificar y construir</h2></div></div>
          <div className="hub-action-list">
            {VERIFY_ACTIONS.map(item => {
              const Icon = item.icon;
              return (
                <button type="button" className={item.emphasis ? 'emphasis' : ''} key={item.action} onClick={() => void runAction(item.action)} disabled={running === item.action}>
                  <span className="hub-action-icon"><Icon size={17} /></span>
                  <span><strong>{item.label}</strong><small>{item.desc}</small></span>
                  <Play size={14} />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="hub-section-heading">
        <div><small>DEVELOPMENT STUDIO</small><h2>Herramientas internas</h2></div>
        <button type="button" className="hub-text-button" onClick={() => void runAction('open-devstudio')}>Abrir en navegador <ExternalLink size={13} /></button>
      </div>
      <div className="hub-tools-grid">
        {INTERNAL_TOOLS.map(item => {
          const Icon = item.icon;
          return (
            <button type="button" key={item.id} onClick={() => onNavigate(item.id)}>
              <Icon size={19} />
              <span><strong>{item.label}</strong><small>{item.desc}</small></span>
            </button>
          );
        })}
      </div>

      <footer className="hub-footer">
        <span><CheckCircle2 size={14} /> Acciones nativas whitelisteadas: no existe shell arbitrario desde la UI.</span>
        <span>{status.repo ? status.repo : 'Repo pendiente de detectar'}</span>
      </footer>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// DBZ LSW — DEVELOPMENT STUDIO
// Herramienta interna de producción (ruta #dev)
// Inspeccionar / validar / previsualizar el juego sin tocar código.
// NO forma parte del flujo público de producción.
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  Activity, ArrowLeft, Brush, CheckCircle2,
  Film, Gamepad2, Gauge, Grid2X2, LayoutDashboard,
  Search, Swords, TableProperties, Users, Music, Rocket, type LucideIcon,
} from 'lucide-react';
import { DashboardModule } from './dashboard';
import { CharactersModule } from './characters';
import { CardsModule } from './cards';
import { PositionsModule } from './positions';
import { ValidationModule } from './validation';
import { StoryModule } from './story';
import { ResearchModule } from './research';
import MusicModule from './music';
import GameConfigModule from './gameconfig';
import { AnimationModule } from './animation';
import { LabModule } from './lab';
import { PixelArtModule } from './pixelart';
import { HudModule } from './hud';
import { FacingModule } from './facing';
import { TimelineModule } from './timeline';
import { CombatContractModule } from './combat';
import { AssetsModule } from './assets';

export type DevModuleId =
  | 'dashboard' | 'characters' | 'cards' | 'animation'
  | 'pixelart' | 'hud' | 'facing' | 'assets'
  | 'lab' | 'story' | 'validation' | 'research' | 'music' | 'gameconfig' | 'positions'
  | 'combat' | 'timeline';

interface DevModuleDef {
  id: DevModuleId;
  label: string;
  icon: LucideIcon;
  desc: string;
  group: string;
}

export const DEV_MODULES: DevModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Estado de producción y contadores', group: 'Visor' },
  { id: 'characters', label: 'Characters', icon: Users, desc: 'Personajes, formas, stats y crecimiento', group: 'Personajes' },
  { id: 'cards', label: 'Cards', icon: TableProperties, desc: 'Base de datos de las 125 cartas', group: 'Personajes' },
  { id: 'animation', label: 'Animation', icon: Film, desc: 'Timeline real + editor de frames/animaciones', group: 'Personajes' },
  { id: 'pixelart', label: 'Pixel Art', icon: Brush, desc: 'Editor de píxeles: pinta/borra/corrige frames', group: 'Personajes' },
  { id: 'facing', label: 'Facing', icon: Activity, desc: 'Orientación de chibis overworld: voltea y guarda', group: 'Personajes' },
  { id: 'assets', label: 'Assets', icon: Search, desc: 'Explorador de carpetas: sprites, frames, mapeo y validación', group: 'Personajes' },
  { id: 'hud', label: 'HUD', icon: Gauge, desc: 'Visualizador del gameplay + editor del tema HUD', group: 'Combate' },
  { id: 'lab', label: 'Combat Lab', icon: Swords, desc: 'Combate real + renderer Pixi en vivo + secuencias deterministas', group: 'Combate' },
  { id: 'positions', label: 'Positions', icon: Grid2X2, desc: 'Laboratorio de posiciones Air/Ground x Front/Back', group: 'Combate' },
  { id: 'combat', label: 'Combat Contract', icon: Swords, desc: 'Esquemas del contrato + simulador del combate con el Engine real', group: 'Combate' },
  { id: 'timeline', label: 'Timeline (M7)', icon: Film, desc: 'Presentation Adapter: EventLog → cues visuales en ticks GBC', group: 'Combate' },
  { id: 'story', label: 'Story', icon: Gamepad2, desc: 'Capítulos, viñetas y mazos de jefes', group: 'Mundo' },
  { id: 'validation', label: 'Validation', icon: CheckCircle2, desc: 'Integridad de datos y cobertura', group: 'Mundo' },
  { id: 'research', label: 'Research', icon: Search, desc: 'ROM / manual / fuentes', group: 'Mundo' },
  { id: 'music', label: 'Música', icon: Music, desc: 'BSO del juego: player y mapeo de contexto', group: 'Mundo' },
  { id: 'gameconfig', label: 'Game Config & Build', icon: Rocket, desc: 'Centro de control: config, validación y release', group: 'Producción' },
];

const DEV_MODULE_STORAGE_KEY = 'dbzlsw_dev_module';

function storedModule(): DevModuleId | null {
  if (typeof window === 'undefined') return null;
  const id = window.localStorage.getItem(DEV_MODULE_STORAGE_KEY) as DevModuleId | null;
  return id && DEV_MODULES.some(d => d.id === id) ? id : null;
}

export { isDevRoute } from './route';

// Módulo desde el hash: '#dev/sheets' → 'sheets'
function moduleFromHash(): DevModuleId | null {
  if (typeof window === 'undefined') return null;
  const m = /^#dev\/([a-zA-Z]+)/.exec(window.location.hash);
  if (!m) return null;
  const id = m[1] as DevModuleId;
  return DEV_MODULES.some(d => d.id === id) ? id : null;
}

function initialModule(): DevModuleId {
  if (typeof window === 'undefined') return 'dashboard';
  const hashModule = moduleFromHash();
  if (hashModule) return hashModule;
  const isPlainDevQuery = new URLSearchParams(window.location.search).has('dev')
    && (window.location.hash === '' || window.location.hash === '#dev');
  if (isPlainDevQuery) return 'dashboard';
  return storedModule() ?? 'dashboard';
}

// Puente Sheets → Pixel Art: frame concreto que abrir en el editor
export interface PixelArtTarget {
  formId: string;
  file: string;
  nonce: number; // cambia en cada petición para re-disparar el efecto
}

export interface DevLinkedTarget {
  formId: string;
  pose?: string;
  file?: string;
  nonce: number;
}

import type { DevStudioProps } from './DevStudioTypes';
export function DevStudio({ onExit, onLaunchBattle }: DevStudioProps) {
  const [module, setModule] = useState<DevModuleId>(() => initialModule());
  const [pixelTarget, setPixelTarget] = useState<PixelArtTarget | null>(null);
  const [linkedTarget, setLinkedTarget] = useState<DevLinkedTarget | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  // ═══ HEADER FIJO PERMANENTE (JS, sin condiciones) ═══
  // El header de cada página (.dev-header) NUNCA se desplaza con el
  // scroll — ni siquiera un píxel. En lugar de sticky (que algunos
  // navegadores/pestañas ignoran), el header sale del flujo del panel
  // con position:fixed calculado en runtime (coordenadas reales del
  // main + padding) y el panel compensa con padding-top permanente.
  // No hay scroll listener: el header está fijo desde el primer frame.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const header = main.querySelector<HTMLElement>('.dev-header');
    if (!header) return;

    const apply = () => {
      const mr = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;
      const hh = header.offsetHeight;
      header.style.position = 'fixed';
      header.style.left = `${mr.left + padLeft}px`;
      header.style.top = `${mr.top + padTop}px`;
      header.style.width = `${mr.width - padLeft - padRight}px`;
      header.style.zIndex = '60';
      header.classList.add('dev-header-fixed');
      // Compensación PERMANENTE: el contenido del panel nunca queda oculto
      const panel = main.querySelector<HTMLElement>('.dev-panel');
      if (panel) panel.style.paddingTop = `${hh + 8}px`;
    };

    apply();
    // Re-aplicar tras layout (imágenes) y resize
    const t1 = setTimeout(apply, 120);
    const t2 = setTimeout(apply, 500);
    window.addEventListener('resize', apply);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', apply);
      const panel = main.querySelector<HTMLElement>('.dev-panel');
      if (panel) panel.style.paddingTop = '';
      header.classList.remove('dev-header-fixed');
    };
  }, [module]);

  // Sincronizar hash ↔ módulo (navegación profunda + botones del sidebar)
  useEffect(() => {
    const onHash = () => {
      const m = moduleFromHash();
      if (m) setModule(m);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id: DevModuleId) => {
    setModule(id);
    try {
      window.localStorage.setItem(DEV_MODULE_STORAGE_KEY, id);
      // Actualizar el hash sin perder el modo dev
      const url = new URL(window.location.href);
      url.hash = `#dev/${id}`;
      window.history.replaceState(null, '', url.toString());
    } catch { /* noop */ }
  };

  // Abrir un frame de Sheets en el Pixel Art (cambia módulo + objetivo)
  const openInPixelArt = (formId: string, file: string) => {
    setPixelTarget({ formId, file, nonce: Date.now() });
    navigate('pixelart');
  };

  const openLinkedModule = (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => {
    setLinkedTarget({ ...target, nonce: Date.now() });
    navigate(id);
  };

  const goHome = () => {
    try { window.location.hash = ''; } catch { /* noop */ }
    onExit();
  };

  return (
    <div className="devstudio">
      <aside className="dev-sidebar">
        <div className="dev-logo">
          <img className="dev-logo-img" src="/logo-128.png" alt="" />
          <div className="dev-logo-text">
            <strong>DBZ LSW</strong>
            <small>Development Studio</small>
          </div>
        </div>
        <nav className="dev-nav">
          {DEV_MODULES.map((m, i) => {
            const Icon = m.icon;
            const prev = i > 0 ? DEV_MODULES[i - 1] : null;
            return (
              <div key={m.id} className="dev-nav-entry">
              {prev && prev.group !== m.group && <div className="dev-nav-group">{m.group}</div>}
              {i === 0 && <div className="dev-nav-group">{m.group}</div>}
              <button key={m.id}
                className={`dev-nav-item ${module === m.id ? 'active' : ''}`}
                onClick={() => navigate(m.id)}
                title={m.desc}
                aria-label={`${m.label}: ${m.desc}`}>
                <Icon className="dev-nav-icon" size={16} strokeWidth={1.8} />
                <span className="dev-nav-label">{m.label}</span>
              </button>
              </div>
            );
          })}
        </nav>
        <div className="dev-sidebar-foot">
          <button className="dev-exit" onClick={goHome}><ArrowLeft size={15} /> Volver al juego</button>
        </div>
      </aside>
      <main className="dev-main" ref={mainRef}>
        <div className="dev-module">
          {module === 'dashboard' && <DashboardModule onNavigate={navigate} />}
          {module === 'characters' && <CharactersModule onOpenModule={openLinkedModule} />}
          {module === 'cards' && <CardsModule />}
          {module === 'animation' && <AnimationModule target={linkedTarget} />}
          {module === 'pixelart' && <PixelArtModule target={pixelTarget} />}
          {module === 'facing' && <FacingModule />}
          {module === 'assets' && <AssetsModule target={linkedTarget} onOpenModule={openLinkedModule} />}
          {module === 'hud' && <HudModule />}
          {module === 'lab' && <LabModule onLaunchBattle={onLaunchBattle} />}
          {module === 'positions' && <PositionsModule />}
          {module === 'combat' && <CombatContractModule />}
          {module === 'timeline' && <TimelineModule />}
          {module === 'story' && <StoryModule />}
          {module === 'validation' && <ValidationModule />}
          {module === 'research' && <ResearchModule />}
          {module === 'music' && <MusicModule />}
          {module === 'gameconfig' && <GameConfigModule />}
        </div>
      </main>
    </div>
  );
}

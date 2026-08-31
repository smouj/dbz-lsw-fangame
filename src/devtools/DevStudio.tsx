// ═══════════════════════════════════════════════════════════
// DBZ LSW — DEVELOPMENT STUDIO
// Herramienta interna de producción (ruta #dev)
// Inspeccionar / validar / previsualizar el juego sin tocar código.
// NO forma parte del flujo público de producción.
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  Activity, ArrowLeft, Brush, CheckCircle2,
  Film, FolderCode, Gamepad2, Gauge, Grid2X2, LayoutDashboard,
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
import { AnimationStudioModule } from './animationStudio';
import { LabModule } from './lab';
import { PixelArtModule } from './pixelart';
import { HudModule } from './hud';
import { FacingModule } from './facing';
import { TimelineModule } from './timeline';
import { CombatContractModule } from './combat';
import { AssetsModule } from './assets';
import { RomDisplayLab } from './romdisplay2';
import { TeamBuilderModule } from './teamBuilder';
import { DeckBuilderModule } from './deckBuilder';
import { WorkspaceModule } from './workspace';

export type DevModuleId =
  | 'dashboard' | 'characters' | 'cards' | 'animation'
  | 'pixelart' | 'hud' | 'facing' | 'assets'
  | 'lab' | 'story' | 'validation' | 'research' | 'music' | 'gameconfig' | 'positions'
  | 'combat' | 'timeline' | 'romdisplay' | 'animation-studio'
  | 'team-builder' | 'deck-builder' | 'workspace';

export interface DevModuleDef {
  id: DevModuleId;
  label: string;
  icon: LucideIcon;
  desc: string;
  group: string;
}

export const DEV_MODULES: DevModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Estado real: ROM physical, producción, legacy y blockers', group: 'Overview' },
  { id: 'validation', label: 'Validation', icon: CheckCircle2, desc: 'Integridad de datos y cobertura visible', group: 'Overview' },
  { id: 'workspace', label: 'Workspace', icon: FolderCode, desc: 'Explorador de código, paneles Dev y scratch editor local', group: 'Overview' },

  { id: 'characters', label: 'Characters', icon: Users, desc: 'Formas, assets y frames físicos ROM por personaje', group: 'ROM & Assets' },
  { id: 'animation-studio', label: 'Animation Studio', icon: Film, desc: 'ROM ↔ current asset ↔ production, ticks GBC', group: 'ROM & Assets' },
  { id: 'romdisplay', label: 'ROM Display', icon: Grid2X2, desc: 'ROM inspection, palettes, Fighter OBJ, FX y Support', group: 'ROM & Assets' },
  { id: 'assets', label: 'Assets', icon: Search, desc: 'Explorador de assets, sprites y manifests', group: 'ROM & Assets' },
  { id: 'facing', label: 'Facing', icon: Activity, desc: 'Orientación de chibis overworld', group: 'ROM & Assets' },

  { id: 'lab', label: 'Combat Lab', icon: Swords, desc: 'Combate real + renderer Pixi en vivo', group: 'Runtime' },
  { id: 'timeline', label: 'Timeline', icon: Film, desc: 'EventLog → cues visuales en ticks GBC', group: 'Runtime' },
  { id: 'combat', label: 'Combat Contract', icon: Swords, desc: 'Contrato y simulador del Engine real', group: 'Runtime' },
  { id: 'positions', label: 'Positions', icon: Grid2X2, desc: 'Laboratorio de posiciones Air/Ground x Front/Back', group: 'Runtime' },
  { id: 'hud', label: 'HUD', icon: Gauge, desc: 'Visualizador y editor del tema HUD', group: 'Runtime' },

  { id: 'cards', label: 'Cards', icon: TableProperties, desc: 'Base de datos ROM de las 125 cartas', group: 'Data' },
  { id: 'animation', label: 'Animation', icon: Film, desc: 'Editor de frames/animaciones legacy y runtime', group: 'Data' },
  { id: 'story', label: 'Story', icon: Gamepad2, desc: 'Capítulos, viñetas y mazos de jefes', group: 'Data' },
  { id: 'music', label: 'Music', icon: Music, desc: 'BSO del juego y mapeo de contexto', group: 'Data' },

  { id: 'pixelart', label: 'Pixel Art', icon: Brush, desc: 'Editor de píxeles para frames y correcciones', group: 'Tools' },
  { id: 'research', label: 'Research', icon: Search, desc: 'ROM, manual y fuentes verificadas', group: 'Tools' },
  { id: 'gameconfig', label: 'Game Config', icon: Rocket, desc: 'Centro de control: config, validación y release', group: 'Tools' },
  { id: 'team-builder', label: 'Team Builder', icon: Users, desc: 'Character Roll, Details y Limits', group: 'Tools' },
  { id: 'deck-builder', label: 'Deck Builder', icon: TableProperties, desc: 'Joint Deck workshop', group: 'Tools' },
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
  const m = /^#dev\/([a-zA-Z-]+)/.exec(window.location.hash);
  if (!m) return null;
  const id = m[1] as DevModuleId;
  return DEV_MODULES.some(d => d.id === id) ? id : null;
}

function initialModule(): DevModuleId {
  if (typeof window === 'undefined') return 'dashboard';
  const hashModule = moduleFromHash();
  if (hashModule) return hashModule;
  if (window.location.hash === '#dev') return 'dashboard';
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
  const [navOpen, setNavOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => { setCompact(query.matches); setNavOpen(false); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // ═══ HEADERS ELIMINADOS (decisión del usuario) ═══
  // Los .dev-header están ocultos con display:none (ver styles.css).
  // Nada que fijar, nada que scrollear — el panel arranca directo.
  const mainRef = useRef<HTMLElement | null>(null);

  // Sincronizar hash ↔ módulo (navegación profunda + botones del sidebar)
  useEffect(() => {
    const onHash = () => {
      const m = moduleFromHash();
      if (m) setModule(m);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const active = document.querySelector('.dev-nav-item.active');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    mainRef.current?.querySelector('.dev-module')?.scrollTo({ top: 0, left: 0 });
  }, [module]);

  const navigate = (id: DevModuleId) => {
    setModule(id);
    setNavOpen(false);
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
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('dev');
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    } catch { /* noop */ }
    onExit();
  };

  return (
    <div className={`devstudio${navOpen ? ' dev-nav-open' : ''}`} onKeyDown={event => {
      if (event.key === 'Escape' && navOpen) { event.preventDefault(); setNavOpen(false); }
    }}>
      <div className="dev-mobile-bar">
        <button type="button" aria-expanded={navOpen} aria-controls="dev-navigation" onClick={() => setNavOpen(open => !open)}>☰ Módulos</button>
        <strong>{DEV_MODULES.find(item => item.id === module)?.label}</strong>
        <button type="button" onClick={goHome} aria-label="Volver al juego"><ArrowLeft size={20} /></button>
      </div>
      {navOpen && <button type="button" className="dev-nav-backdrop" aria-label="Cerrar navegación" onClick={() => setNavOpen(false)} />}
      <aside className="dev-sidebar" id="dev-navigation" inert={compact && !navOpen}>
        <div className="dev-logo">
          <img className="dev-logo-img" src="/logo-128.png" alt="" />
          <div className="dev-logo-text">
            <strong>DBZ LSW</strong>
            <small>Development Studio</small>
          </div>
        </div>
        <nav className="dev-nav" aria-label="Módulos del Dev Studio">
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
                aria-current={module === m.id ? 'page' : undefined}
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
      <main className="dev-main" ref={mainRef} inert={compact && navOpen}>
        {/* Slot FIJO del header: fuera del flujo de scroll. El useEffect
            mueve aquí el .dev-header de cada módulo (que vive dentro del
            panel scrolleable). El header NO puede desplazarse porque NO
            está dentro del contenedor que scrollea. */}
        <div className="dev-header-slot" />
        <div className="dev-module" data-module={module}>
          {module === 'dashboard' && <DashboardModule onNavigate={navigate} />}
          {module === 'characters' && <CharactersModule onOpenModule={openLinkedModule} />}
          {module === 'cards' && <CardsModule />}
          {module === 'animation' && <AnimationModule target={linkedTarget} />}
          {module === 'animation-studio' && <AnimationStudioModule />}
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
          {module === 'romdisplay' && <RomDisplayLab />}
          {module === 'music' && <MusicModule />}
          {module === 'gameconfig' && <GameConfigModule />}
          {module === 'team-builder' && <TeamBuilderModule />}
          {module === 'deck-builder' && <DeckBuilderModule />}
          {module === 'workspace' && <WorkspaceModule modules={DEV_MODULES} />}
        </div>
      </main>
    </div>
  );
}

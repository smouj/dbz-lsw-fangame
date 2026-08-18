// ═══════════════════════════════════════════════════════════
// DBZ LSW — DEVELOPMENT STUDIO
// Herramienta interna de producción (ruta #dev)
// Inspeccionar / validar / previsualizar el juego sin tocar código.
// NO forma parte del flujo público de producción.
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  Activity, ArrowLeft, Boxes, Brush, CheckCircle2,
  Film, Gamepad2, Gauge, Grid2X2, Images, LayoutDashboard,
  Search, Swords, TableProperties, Users, Music, Rocket, type LucideIcon,
} from 'lucide-react';
import { DashboardModule } from './dashboard';
import { CharactersModule } from './characters';
import { CardsModule } from './cards';
import { SpritesModule } from './sprites';
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
import { SheetsModule } from './sheets';
import { TimelineModule } from './timeline';

export type DevModuleId =
  | 'dashboard' | 'characters' | 'cards' | 'sprites' | 'animation'
  | 'pixelart' | 'hud' | 'facing' | 'sheets'
  | 'lab' | 'story' | 'validation' | 'research' | 'music' | 'gameconfig' | 'positions'
  | 'timeline';

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
  { id: 'sprites', label: 'Sprites', icon: Images, desc: 'Inspector de sprites (frame, bbox, alpha)', group: 'Personajes' },
  { id: 'sheets', label: 'Sheets', icon: Boxes, desc: 'Revisión de sheets: todos los frames con detección de problemas', group: 'Personajes' },
  { id: 'animation', label: 'Animation', icon: Film, desc: 'Timeline real + editor de frames/animaciones', group: 'Personajes' },
  { id: 'pixelart', label: 'Pixel Art', icon: Brush, desc: 'Editor de píxeles: pinta/borra/corrige frames', group: 'Personajes' },
  { id: 'facing', label: 'Facing', icon: Activity, desc: 'Orientación de chibis overworld: voltea y guarda', group: 'Personajes' },
  { id: 'hud', label: 'HUD', icon: Gauge, desc: 'Visualizador del gameplay + editor del tema HUD', group: 'Combate' },
  { id: 'lab', label: 'Combat Lab', icon: Swords, desc: 'Combate real + renderer Pixi en vivo + secuencias deterministas', group: 'Combate' },
  { id: 'positions', label: 'Positions', icon: Grid2X2, desc: 'Laboratorio de posiciones Air/Ground x Front/Back', group: 'Combate' },
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
      <main className="dev-main">
        <div className="dev-module">
          {module === 'dashboard' && <DashboardModule onNavigate={navigate} />}
          {module === 'characters' && <CharactersModule onOpenModule={openLinkedModule} />}
          {module === 'cards' && <CardsModule />}
          {module === 'sprites' && <SpritesModule target={linkedTarget} />}
          {module === 'sheets' && <SheetsModule target={linkedTarget} onOpenInPixelArt={openInPixelArt} />}
          {module === 'animation' && <AnimationModule target={linkedTarget} />}
          {module === 'pixelart' && <PixelArtModule target={pixelTarget} />}
          {module === 'facing' && <FacingModule />}
          {module === 'hud' && <HudModule />}
          {module === 'lab' && <LabModule onLaunchBattle={onLaunchBattle} />}
          {module === 'positions' && <PositionsModule />}
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

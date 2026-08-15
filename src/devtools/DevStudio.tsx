// ═══════════════════════════════════════════════════════════
// DBZ LSW — DEVELOPMENT STUDIO
// Herramienta interna de producción (ruta #dev)
// Inspeccionar / validar / previsualizar el juego sin tocar código.
// NO forma parte del flujo público de producción.
// ═══════════════════════════════════════════════════════════
import { useState, lazy, Suspense } from 'react';
import { DashboardModule } from './dashboard';
import { CharactersModule } from './characters';
import { CardsModule } from './cards';
import { SpritesModule } from './sprites';
import { PositionsModule } from './positions';
import { ValidationModule } from './validation';
import { BattleLabModule } from './battlelab';
import { StoryModule } from './story';
import { ResearchModule } from './research';
import { AnimationModule } from './animation';
import { PixelArtModule } from './pixelart';
import { HudModule } from './hud';
import { FacingModule } from './facing';
// Los módulos Pixi se cargan bajo demanda (code-split): pixi.js (~790KB) solo
// se descarga al abrir el Pixi Lab / Pixi Seq, no en el bundle principal.
const PixiModule = lazy(() => import('./pixi').then((m) => ({ default: m.PixiModule })));
const PixiSequenceModule = lazy(() => import('./pixiSequence').then((m) => ({ default: m.PixiSequenceModule })));

export type DevModuleId =
  | 'dashboard' | 'characters' | 'cards' | 'sprites' | 'animation'
  | 'pixelart' | 'hud' | 'facing'
  | 'battlelab' | 'story' | 'validation' | 'research' | 'positions'
  | 'pixi' | 'pixiSequence';

interface DevModuleDef {
  id: DevModuleId;
  label: string;
  icon: string;
  desc: string;
}

export const DEV_MODULES: DevModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧', desc: 'Estado de producción y contadores' },
  { id: 'characters', label: 'Characters', icon: '☺', desc: 'Personajes, formas, stats y crecimiento' },
  { id: 'cards', label: 'Cards', icon: '🂠', desc: 'Base de datos de las 125 cartas' },
  { id: 'sprites', label: 'Sprites', icon: '▦', desc: 'Inspector de sprites (frame, bbox, alpha)' },
  { id: 'animation', label: 'Animation', icon: '▶', desc: 'Timeline real + editor de frames/animaciones (fps/loop/orden)' },
  { id: 'pixelart', label: 'Pixel Art', icon: '✎', desc: 'Editor de píxeles: pinta/borra/corrige frames y guarda al proyecto' },
  { id: 'facing', label: 'Facing', icon: '↔', desc: 'Orientación de chibis overworld: voltea y guarda (todos a la derecha)' },
  { id: 'hud', label: 'HUD', icon: '▤', desc: 'Visualizador del gameplay + editor del tema HUD (colores/escala/tipografía)' },
  { id: 'battlelab', label: 'Battle Lab', icon: '⚔', desc: 'Combate instantáneo real (Versus/Historia) + depurador' },
  { id: 'positions', label: 'Positions', icon: '⇄', desc: 'Laboratorio de posiciones Air/Ground × Front/Back' },
  { id: 'story', label: 'Story', icon: '▤', desc: 'Capítulos, viñetas y mazos de jefes' },
  { id: 'validation', label: 'Validation', icon: '✔', desc: 'Integridad de datos y cobertura' },
  { id: 'research', label: 'Research', icon: '≣', desc: 'ROM / manual / fuentes' },
  { id: 'pixi', label: 'Pixi Lab', icon: '🎬', desc: 'Renderer PixiJS 8 + reloj GBC único (prueba del motor gráfico)' },
  { id: 'pixiSequence', label: 'Pixi Seq', icon: '🎞️', desc: 'Pipeline BattleTimeline→Presentación + frame-determinismo (Stage Attack)' },
];

export function isDevRoute(): boolean {
  return typeof window !== 'undefined' && (
    window.location.hash === '#dev'
    || window.location.hash.startsWith('#dev/')
    || new URLSearchParams(window.location.search).has('dev')
  );
}

export function DevStudio({ onExit, onLaunchBattle }: {
  onExit: () => void;
  onLaunchBattle?: (playerFormId: string, enemyFormId: string, chapter: number | null) => void;
}) {
  const [module, setModule] = useState<DevModuleId>('dashboard');

  const goHome = () => {
    try { window.location.hash = ''; } catch { /* noop */ }
    onExit();
  };

  return (
    <div className="devstudio">
      <aside className="dev-sidebar">
        <div className="dev-logo">
          <span className="dev-logo-badge">DEV</span>
          <div className="dev-logo-text">
            <strong>DBZ LSW</strong>
            <small>Development Studio</small>
          </div>
        </div>
        <nav className="dev-nav">
          {DEV_MODULES.map(m => (
            <button key={m.id}
              className={`dev-nav-item ${module === m.id ? 'active' : ''}`}
              onClick={() => setModule(m.id)}
              title={m.desc}>
              <span className="dev-nav-icon">{m.icon}</span>
              <span className="dev-nav-label">{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="dev-sidebar-foot">
          <button className="dev-exit" onClick={goHome}>← Volver al juego</button>
        </div>
      </aside>
      <main className="dev-main">
        <div className="dev-module">
          {module === 'dashboard' && <DashboardModule onNavigate={setModule} />}
          {module === 'characters' && <CharactersModule />}
          {module === 'cards' && <CardsModule />}
          {module === 'sprites' && <SpritesModule />}
          {module === 'animation' && <AnimationModule />}
          {module === 'pixelart' && <PixelArtModule />}
          {module === 'facing' && <FacingModule />}
          {module === 'hud' && <HudModule />}
          {module === 'battlelab' && <BattleLabModule onLaunchBattle={onLaunchBattle} />}
          {module === 'positions' && <PositionsModule />}
          {module === 'story' && <StoryModule />}
          {module === 'validation' && <ValidationModule />}
          {module === 'research' && <ResearchModule />}
          {module === 'pixi' && <Suspense fallback={<div className="dev-module-loading">Cargando Pixi…</div>}><PixiModule /></Suspense>}
          {module === 'pixiSequence' && <Suspense fallback={<div className="dev-module-loading">Cargando Pixi Seq…</div>}><PixiSequenceModule /></Suspense>}
        </div>
      </main>
    </div>
  );
}

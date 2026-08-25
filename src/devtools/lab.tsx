// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Combat Lab (canónico)
// Unifica los 3 laboratorios de combate en UNA página:
//   1. Batalla real  (lógica + depurador)   ← antes Battle Lab
//   2. Renderer Pixi (presentación en vivo) ← antes Pixi Lab
//   3. Secuencias    (timeline determinista)← antes Pixi Seq
// Tabs internos con unmount limpio: cada módulo crea/destruye su
// renderer al cambiar de tab (cleanups de useEffect).
// ═══════════════════════════════════════════════════════════
import { useState } from 'react';
import { Swords, Clapperboard, Sparkles, Activity } from 'lucide-react';
import { BattleLabModule } from './battlelab';
import { PixiModule } from './pixi';
import { PixiSequenceModule } from './pixiSequence';
import { ActionTraceInspector } from './actionTraceInspector';

type LabTab = 'battle' | 'renderer' | 'sequence' | 'trace';

const TABS: { id: LabTab; label: string; icon: typeof Swords; desc: string }[] = [
  { id: 'battle', label: 'Batalla real', icon: Swords, desc: 'Lanza el motor de combate completo (Versus / Historia) con depurador' },
  { id: 'renderer', label: 'Renderer Pixi', icon: Clapperboard, desc: 'Presentación del combate en vivo: escenas, posiciones, poses, reloj GBC' },
  { id: 'sequence', label: 'Secuencias', icon: Sparkles, desc: 'Pipeline BattleTimeline → presentación determinista' },
  { id: 'trace', label: 'Trace Inspector', icon: Activity, desc: 'Acción golden → rol → frame → ROM → clasificación → fallback' },
];

export function LabModule({ onLaunchBattle }: {
  onLaunchBattle?: (playerFormId: string, enemyFormId: string, chapter: number | null) => void;
}) {
  const [tab, setTab] = useState<LabTab>('battle');
  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Combat Lab</h1>
        <p className="dev-sub">Laboratorio único de combate: batalla real · renderer Pixi en vivo · secuencias deterministas.</p>
      </header>

      <div className="dev-lab-tabs" role="tablist">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`dev-lab-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)} title={t.desc}>
              <Icon size={14} strokeWidth={1.8} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="dev-lab-body">
        {tab === 'battle' && <BattleLabModule embedded onLaunchBattle={onLaunchBattle} />}
        {tab === 'renderer' && <PixiModule />}
        {tab === 'sequence' && <PixiSequenceModule />}
        {tab === 'trace' && <ActionTraceInspector />}
      </div>
    </div>
  );
}

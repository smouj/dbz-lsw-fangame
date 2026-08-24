// ROM Display Lab 2.0 — herramienta central de inspección ROM ↔ assets ↔ runtime.
// Tabs: FIGHTERS · ACTIONS · OFFENSIVE FX · SUPPORT · DEFENSE · PALETTES.
// Principio: la ROM identifica QUÉ frame/secuencia/duración/offset/paleta;
// Canonical_Frames_Official proporciona el PNG limpio; el manifest dice cómo
// lo consume el runtime. Ningún fallback se etiqueta ROM_PHYSICAL; ningún
// UNRESOLVED se oculta (PENDING explícito siempre).
import { useState } from 'react';
import { FightersTab } from './fightersTab';
import { ActionsTab } from './actionsTab';
import { OffensiveFxTab } from './fxTab';
import { SupportTab } from './supportTab';
import { DefenseTab } from './defenseTab';
import { PalettesTab } from './palettesTab';

type LabTab = 'fighters' | 'actions' | 'fx' | 'support' | 'defense' | 'palettes';

const TABS: { id: LabTab; label: string }[] = [
  { id: 'fighters', label: 'FIGHTERS' },
  { id: 'actions', label: 'ACTIONS' },
  { id: 'fx', label: 'OFFENSIVE FX' },
  { id: 'support', label: 'SUPPORT' },
  { id: 'defense', label: 'DEFENSE' },
  { id: 'palettes', label: 'PALETTES' },
];

export function RomDisplayLab() {
  const [tab, setTab] = useState<LabTab>('fighters');
  const [globalForm, setGlobalForm] = useState<string | null>(null);
  const [globalCard, setGlobalCard] = useState<number | null>(null);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>ROM Display Lab 2.0</h1>
        <p className="dev-sub">
          ROM PHYSICAL TRUTH → CANONICAL ASSET → RUNTIME PIXI. La ROM identifica QUÉ frame / secuencia / duración /
          offset / paleta; <code>Canonical_Frames_Official</code> da el PNG limpio; el manifest dice cómo lo consume el
          runtime. Sin fallbacks etiquetados como físicos; sin UNRESOLVED ocultos.
        </p>
      </header>

      <nav style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #2a3a4a', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? '#2a4a6a' : '#141c2a',
              color: tab === t.id ? '#fff' : '#9fb8d0',
              border: tab === t.id ? '1px solid #4a7aaa' : '1px solid #2a3a4a',
              borderRadius: 4, padding: '3px 12px', cursor: 'pointer', fontSize: 13,
            }}>
            {t.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: 4 }}>
        {tab === 'fighters' && <FightersTab initialForm={globalForm} onFormChange={setGlobalForm} />}
        {tab === 'actions' && <ActionsTab initialCardId={globalCard} onCardChange={setGlobalCard} />}
        {tab === 'fx' && <OffensiveFxTab />}
        {tab === 'support' && <SupportTab />}
        {tab === 'defense' && <DefenseTab />}
        {tab === 'palettes' && <PalettesTab />}
      </div>
    </div>
  );
}

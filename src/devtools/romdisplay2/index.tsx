// ROM Display Lab 2.0 — herramienta central de inspección ROM ↔ assets ↔ runtime.
// Tabs: FIGHTERS · SPRITE ATLAS · ACTIONS · OFFENSIVE FX · SUPPORT · DEFENSE · PALETTES.
// Principio: ROM_PHYSICAL es la autoridad para Fighter physical frames.
// Canonical_Frames_Official queda como corpus histórico/remake-source hasta
// reconciliación P0.3C. Ningún fallback se etiqueta ROM_PHYSICAL; ningún
// UNRESOLVED se oculta (PENDING explícito siempre).
import { useState } from 'react';
import { FightersTab } from './fightersTab';
import { ActionsTab } from './actionsTab';
import { OffensiveFxTab } from './fxTab';
import { SupportTab } from './supportTab';
import { DefenseTab } from './defenseTab';
import { PalettesTab } from './palettesTab';
import { ProvenanceTab } from './provenanceTab';
import { AssetsTab } from './assetsTab';
import { SpriteAtlasTab } from './spriteAtlasTab';

type LabTab = 'fighters' | 'sprite-atlas' | 'actions' | 'fx' | 'support' | 'defense' | 'palettes' | 'provenance' | 'assets';

const TABS: { id: LabTab; label: string }[] = [
  { id: 'fighters', label: 'FIGHTERS' },
  { id: 'sprite-atlas', label: 'ROM SPRITE ATLAS' },
  { id: 'actions', label: 'ACTIONS' },
  { id: 'fx', label: 'OFFENSIVE FX' },
  { id: 'support', label: 'SUPPORT' },
  { id: 'defense', label: 'DEFENSE' },
  { id: 'palettes', label: 'PALETTES' },
  { id: 'provenance', label: 'PROVENANCE' },
  { id: 'assets', label: 'ASSETS' },
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
          ROM PHYSICAL TRUTH → ROM physical corpus → runtime mapping. La ROM identifica QUÉ frame / secuencia / duración /
          offset / paleta y el corpus <code>rom-physical.manifest.json</code> conserva PNG físico + provenance.
          <code>Canonical_Frames_Official</code> es histórico/remake-source hasta P0.3C; sin fallbacks etiquetados como físicos.
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
        {tab === 'sprite-atlas' && <SpriteAtlasTab />}
        {tab === 'actions' && <ActionsTab initialCardId={globalCard} onCardChange={setGlobalCard} />}
        {tab === 'fx' && <OffensiveFxTab />}
        {tab === 'support' && <SupportTab />}
        {tab === 'defense' && <DefenseTab />}
        {tab === 'palettes' && <PalettesTab />}
        {tab === 'provenance' && <ProvenanceTab />}
        {tab === 'assets' && (
          <AssetsTab onNavigate={(next, opts) => {
            if (opts.cardId != null) setGlobalCard(opts.cardId);
            if (next === 'actions' || next === 'fighters' || next === 'palettes' || next === 'fx') setTab(next);
          }} />
        )}
      </div>
    </div>
  );
}

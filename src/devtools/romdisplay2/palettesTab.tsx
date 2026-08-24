// ROM Display Lab 2.1 — tab PALETTES (provenance correction).
// Tabla física REAL: ROM_FIGHTER_PALETTES (Bank30:$6E00 + visualProfileKey*8,
// 4 colores CGB × 16 bits BGR555 → RGB, ROM_STATIC_VERIFIED — generado desde
// la ROM, sin interpolación). Plus: FX palettes del manifest v4 y las 4
// documentadas en investigación. Nada inventado.
import { useMemo, useState } from 'react';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../../data/generated/romSupportPhysicalVisuals.generated';
import { ROM_FIGHTER_PALETTES } from '../../data/generated/romFighterPalettes.generated';
import { Mono, SectionTitle } from './common';

const DOCUMENTED: { byte: number; label: string; colors: string[]; source: string }[] = [
  { byte: 0x33, label: 'Gather Power', colors: ['#FFFFFF', '#F6A452', '#F6CDA4', '#FF8300'], source: 'ROM lote 2 — FX Bank68:$1A → VRAM $8800, paleta $33' },
  { byte: 0x31, label: 'CHARA / default presentation', colors: ['#FF9090', '#FF6A6A', '#C84A5A', '#801020'], source: 'ROM lote 5 — CHARA paleta $31 (rojo/rosa); default CC15_PRESENTATION_STATE' },
  { byte: 0x2C, label: 'Kamehameha beam', colors: ['#FFFFFF', '#8AD8FF', '#2070D8', '#002880'], source: 'ROM lote 2/7 — Kamehameha pal $2C, audio $0C' },
  { byte: 0x2F, label: 'FX común (offensive)', colors: ['#FFFFFF', '#FFD0A0', '#D87830', '#401800'], source: 'research-v4-fx — palettes FX (generated_fx_assets)' },
];

export function PalettesTab() {
  const [filter, setFilter] = useState<'all' | 'fighter' | 'support'>('all');
  const distribution = useMemo(() => {
    const map = new Map<number, { count: number; cards: number[] }>();
    for (const [id, v] of Object.entries(ROM_SUPPORT_PHYSICAL_VISUALS)) {
      const b = v.palette.cardPaletteByte;
      const e = map.get(b) ?? { count: 0, cards: [] };
      e.count++;
      e.cards.push(Number(id));
      map.set(b, e);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {(['all', 'fighter', 'support'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? '#2a4a6a' : '#141c2a', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
            {f === 'all' ? 'TODAS' : f === 'fighter' ? 'FIGHTER (ROM física)' : 'SUPPORT (bytes)'}
          </button>
        ))}
      </div>

      {(filter === 'all' || filter === 'fighter') && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>ROM PHYSICAL PALETTE TABLE — fighters (Bank30:$6E00 + visualProfileKey×8, ROM_STATIC_VERIFIED)</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ROM_FIGHTER_PALETTES.map((p) => (
              <div key={p.key} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 8, background: '#141c2a', minWidth: 150 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <Mono>key 0x{p.key.toString(16).padStart(2, '0')}</Mono> <span style={{ opacity: 0.55, fontSize: 10 }}>BGR555</span>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {p.colors.map((c, i) => (
                    <div key={i} style={{ width: 26, height: 26, background: c, border: '1px solid #444', borderRadius: 3 }} title={`${c} · ${p.bgr555[i]}`} />
                  ))}
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4, fontFamily: 'monospace' }}>{p.bgr555.join(' ')}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>consumer: fighter palette profile</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.55 }}>
            {ROM_FIGHTER_PALETTES.length} paletas leídas directamente de la ROM (BGR555 → RGB sin interpolación). El índice del perfil visual del
            personaje selecciona la entrada; el graphicsBank físico es $31 + key.
          </div>
        </div>
      )}

      {(filter === 'all' || filter === 'support') && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>PALETAS DOCUMENTADAS EN INVESTIGACIÓN</SectionTitle>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {DOCUMENTED.map((p) => (
              <div key={p.byte} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 10, background: '#141c2a' }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <Mono>${p.byte.toString(16).padStart(2, '0')}</Mono> — {p.label}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.colors.map((c, i) => (
                    <div key={i} style={{ width: 34, height: 34, background: c, border: '1px solid #444', borderRadius: 3 }} title={c} />
                  ))}
                </div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6, maxWidth: 260 }}>{p.source}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filter !== 'fighter' && (
        <div>
          <SectionTitle>DISTRIBUCIÓN DE BYTES DE PALETA — 48 cartas Support (ROM_STATIC_VERIFIED)</SectionTitle>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {distribution.map(([byte, e]) => (
              <div key={byte} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 8, background: '#141c2a', minWidth: 120 }}>
                <div style={{ fontSize: 14 }}><Mono>${byte.toString(16).padStart(2, '0')}</Mono> <span style={{ opacity: 0.6 }}>×{e.count}</span></div>
                <div style={{ fontSize: 10, opacity: 0.6, maxHeight: 60, overflowY: 'auto' }}>{e.cards.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

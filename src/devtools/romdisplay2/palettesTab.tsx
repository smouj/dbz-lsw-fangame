// ROM Display — PALETTES.
// Fuente única: ROM_CGB_PALETTE_TABLE, extraída byte a byte de la ROM USA.
// Las vistas Fighter/Beam son bindings hacia esa tabla, no paletas paralelas.
import { useMemo, useState } from 'react';
import { ROM_CGB_PALETTE_TABLE, ROM_CGB_PALETTE_TABLE_META } from '../../data/generated/romCgbPaletteTable.generated';
import { ROM_FIGHTER_PALETTE_BINDINGS } from '../../data/generated/romFighterPaletteBindings.generated';
import { ROM_OFFENSIVE_FX_PALETTE_BINDINGS } from '../../data/generated/romOffensiveFxPaletteBindings.generated';
import { Mono, SectionTitle } from './common';

type Filter = 'table' | 'fighters' | 'beam';

function paletteAt(index: number) {
  return ROM_CGB_PALETTE_TABLE[index] ?? null;
}

function swatches(index: number, transparentZero = false) {
  const palette = paletteAt(index);
  if (!palette) return null;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {palette.hexRaw.map((color, i) => (
        <div
          key={i}
          title={`${i === 0 && transparentZero ? 'OBJ transparent · ' : ''}${color} · ${palette.bgr555Hex[i]} · raw ${palette.rawBytesHex[i * 2]} ${palette.rawBytesHex[i * 2 + 1]}`}
          style={{
            width: 26,
            height: 26,
            border: '1px solid #44546a',
            borderRadius: 3,
            background: i === 0 && transparentZero
              ? 'repeating-linear-gradient(45deg, #1a2230 0 4px, #2c3646 4px 8px)'
              : color,
            boxShadow: i === 0 && transparentZero ? `inset 0 0 0 2px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function PalettesTab() {
  const [filter, setFilter] = useState<Filter>('table');
  const usedFighterIndices = useMemo<Set<number>>(() => new Set(ROM_FIGHTER_PALETTE_BINDINGS.map(binding => binding.paletteIndex)), []);
  const usedBeamIndices = useMemo<Set<number>>(() => new Set(ROM_OFFENSIVE_FX_PALETTE_BINDINGS.map(binding => binding.paletteIndex)), []);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {([
          ['table', 'CGB TABLE 256'],
          ['fighters', 'FIGHTER BINDINGS'],
          ['beam', 'BEAM FX BINDINGS'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{ background: filter === id ? '#2a4a6a' : '#141c2a', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}
          >
            {label}
          </button>
        ))}
      </div>

      {filter === 'table' && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>ROM CGB PALETTE TABLE — Bank30:$6E00, 256×8 bytes</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))', gap: 8 }}>
            {ROM_CGB_PALETTE_TABLE.map((p) => (
              <div key={p.index} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 8, background: '#141c2a', minWidth: 0 }}>
                <div style={{ fontSize: 12, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Mono>{p.indexHex}</Mono>
                  <span style={{ opacity: 0.55, fontSize: 10 }}>{usedFighterIndices.has(p.index) ? 'FIGHTER' : usedBeamIndices.has(p.index) ? 'BEAM' : 'ROM'}</span>
                </div>
                {swatches(p.index, false)}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, fontFamily: 'monospace' }}>{p.rawBytesHex.join(' ')}</div>
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'monospace' }}>{p.cpuAddressHex} → {p.fileOffsetHex}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
            {ROM_CGB_PALETTE_TABLE.length} entries · {ROM_CGB_PALETTE_TABLE_META.totalBytes} bytes · offset formula <Mono>{ROM_CGB_PALETTE_TABLE_META.offsetFormula}</Mono> · filtered {ROM_CGB_PALETTE_TABLE_META.filteredEntries}
          </div>
        </div>
      )}

      {filter === 'fighters' && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle>FIGHTER PALETTE BINDINGS — form → actorVisualProfileKey → table[index]</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
            {ROM_FIGHTER_PALETTE_BINDINGS.map((binding) => (
              <div key={binding.formId} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 8, background: '#141c2a', minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 5 }}>{binding.formId}</div>
                {swatches(binding.paletteIndex, true)}
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 5, fontFamily: 'monospace' }}>
                  profile {binding.actorVisualProfileKeyHex} · gfx {binding.graphicsBankHex} · palette {binding.paletteIndexHex}
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'monospace' }}>{binding.paletteCpuAddressHex} → {binding.paletteFileOffsetHex}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filter === 'beam' && (
        <div>
          <SectionTitle>OFFENSIVE FX PALETTE BINDINGS — card ROM table → FX palette index</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {ROM_OFFENSIVE_FX_PALETTE_BINDINGS.map((binding) => (
              <div key={binding.cardId} style={{ border: '1px solid #2a4a6a', borderRadius: 6, padding: 8, background: '#141c2a', minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 5 }}>#{binding.cardId} {binding.name}</div>
                {swatches(binding.paletteIndex, false)}
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 5, fontFamily: 'monospace' }}>
                  handler {binding.handlerHex} · actor {binding.animationResourceHex} · FX {binding.fxResourceHex} · pal {binding.paletteIndexHex}
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, fontFamily: 'monospace' }}>{binding.paletteCpuAddressHex} → {binding.paletteFileOffsetHex}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

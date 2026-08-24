// ROM Display Lab 2.0 — tab OFFENSIVE FX.
// Los Beam usan físicamente BG tiles (no OBJ fighters): graphics + maps
// SIDE1/SIDE2 (20×32 tiles), el handler selecciona ventanas (prefix/result).
// Manifest real de research-v4-fx: fx → palette → prefixRows/resultRows →
// cartas asociadas. Sin paletas/ventanas inventadas: todo sale del manifest.
import { useEffect, useMemo, useState } from 'react';
import { FieldRow, Mono, SectionTitle, useImage } from './common';

interface FxPair {
  fxResource: number;
  fxHex: string;
  palette: number;
  paletteHex: string;
  prefixOperand: number;
  prefixRows: number[];
  resultOperand: number;
  resultRows: number[];
  cards: { cardId: number; name: string; category: string; handler: string }[];
}

const FX_BASE = '/docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/generated_fx_assets';
const SUFFIXES = ['prefix', 'result'] as const;
const SIDES = ['side1', 'side2'] as const;

function fxKey(fx: number): string {
  return `fx_${fx.toString(16).padStart(2, '0')}`;
}
function palKey(pal: number): string {
  return `palette_${pal.toString(16).padStart(2, '0').toUpperCase()}`;
}

export function OffensiveFxTab() {
  const [pairs, setPairs] = useState<FxPair[]>([]);
  const [fxIdx, setFxIdx] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let alive = true;
    fetch(`${FX_BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!alive || !m?.pairs) return;
        setPairs(m.pairs as FxPair[]);
      })
      .catch(() => { /* sin manifest */ });
    return () => { alive = false; };
  }, []);

  const pair: FxPair | null = pairs[fxIdx] ?? null;
  const images = useMemo(() => {
    if (!pair) return null;
    const base = `${FX_BASE}/${fxKey(pair.fxResource)}/${palKey(pair.palette)}`;
    const out: Record<string, string> = {};
    for (const side of SIDES) {
      for (const suf of SUFFIXES) {
        out[`${side}_${suf}`] = `${base}/${side}_${suf}_map256x64.png`;
      }
    }
    return out;
  }, [pair]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#cfe3ff' }}>FXResource</label>
        <select value={fxIdx} onChange={(e) => setFxIdx(Number(e.target.value))} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
          {pairs.map((p, i) => <option key={i} value={i}>{p.fxHex} · palette {p.paletteHex} · {p.cards.length} card(s)</option>)}
        </select>
        {[1, 2, 4].map((z) => (
          <button key={z} onClick={() => setZoom(z)} style={{ background: z === zoom ? '#2a4a6a' : '#1a2434', border: '1px solid #2a4a6a', color: '#cfe3ff', borderRadius: 3, cursor: 'pointer' }}>{z}×</button>
        ))}
        {!pair && <span style={{ opacity: 0.6, fontSize: 13 }}>cargando manifest FX…</span>}
      </div>

      {pair && images && (
        <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 320 }}>
            <SectionTitle>ROM TILEMAP — ventanas del handler</SectionTitle>
            {SIDES.map((side) => (
              <div key={side} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>{side.toUpperCase()} — full map 256×64 (20×32 tiles)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SUFFIXES.map((suf) => {
                    const url = images[`${side}_${suf}`];
                    const rows = suf === 'prefix' ? pair.prefixRows : pair.resultRows;
                    return (
                      <div key={suf}>
                        <img src={url} alt={`${side} ${suf}`} style={{ imageRendering: 'pixelated', border: '1px solid #555', width: 256 * zoom }} />
                        <div style={{ fontSize: 11, opacity: 0.75 }}>
                          <Mono>{suf}</Mono> · operand {suf === 'prefix' ? pair.prefixOperand : pair.resultOperand} · rows {rows.join('–')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.55 }}>
              Nota: los maps se muestran completos; la ventana visible del handler son las filas prefix/result indicadas (SCX/SCY en runtime).
            </div>
          </div>

          <div style={{ minWidth: 280 }}>
            <SectionTitle>PERFIL ROM</SectionTitle>
            <FieldRow label="FXResource" value={<Mono>{pair.fxHex}</Mono>} />
            <FieldRow label="palette" value={<Mono>{pair.paletteHex}</Mono>} />
            <FieldRow label="prefix operand" value={<Mono>{pair.prefixOperand}</Mono>} />
            <FieldRow label="prefix rows" value={<Mono>{pair.prefixRows.join('–')}</Mono>} />
            <FieldRow label="result operand" value={<Mono>{pair.resultOperand}</Mono>} />
            <FieldRow label="result rows" value={<Mono>{pair.resultRows.join('–')}</Mono>} />
            <div style={{ marginTop: 8 }}>
              <SectionTitle>CARTAS ASOCIADAS ({pair.cards.length})</SectionTitle>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {pair.cards.map((c) => (
                  <div key={c.cardId} style={{ fontSize: 12, padding: '1px 0' }}>
                    <Mono>#{c.cardId}</Mono> {c.name} · <span style={{ opacity: 0.6 }}>{c.category} handler {c.handler}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55 }}>
              RUNTIME PIXI: los beams se proyectan con ENTITY_PROJECTILE / BEAM_RAY / SCREEN_FX según handler — el tilemap BG es la verdad física; el
              runtime elige la representación por clase de proyección (no es un OBJ de fighter).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

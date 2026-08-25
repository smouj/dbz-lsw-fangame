// ROM Display Lab 2.0 — tab OFFENSIVE FX.
// Los Beam usan físicamente BG tiles (no OBJ fighters): graphics + maps
// SIDE1/SIDE2 (20×32 tiles), el handler selecciona ventanas (prefix/result).
// Corpus P0.1A: fx → palette → SIDE1/SIDE2 prefix/result → cartas asociadas.
// Sin paletas/ventanas inventadas: todo sale del espejo /assets/rom-fx.
import { useEffect, useMemo, useState } from 'react';
import { FieldRow, Mono, SectionTitle, useImage } from './common';
import { ROM_FX_CORPUS_SUMMARY } from '../../data/generated/romFxCorpus.generated';
import { romFxWindowRuntimeSummary } from '../../battle/romFxWindow';

interface FxPair {
  physicalId: string;
  fxResource: number;
  fxHex: string;
  paletteIndex: number;
  paletteHex: string;
  metadata: string;
  images: string[];
  cards: { cardId: number; name: string; category: string; handler: string }[];
  consumingCards: { cardId: number; name: string; category: string; handler: string }[];
  errors: string[];
}

const FX_BASE = '/assets/rom-fx';

export function OffensiveFxTab() {
  const [pairs, setPairs] = useState<FxPair[]>([]);
  const [fxIdx, setFxIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const runtime = romFxWindowRuntimeSummary();

  useEffect(() => {
    let alive = true;
    fetch(`${FX_BASE}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!alive || !m?.bundles) return;
        setPairs((m.bundles as FxPair[]).map(bundle => ({
          ...bundle,
          cards: bundle.consumingCards ?? bundle.cards ?? [],
        })));
      })
      .catch(() => { /* sin manifest */ });
    return () => { alive = false; };
  }, []);

  const pair: FxPair | null = pairs[fxIdx] ?? null;
  const images = useMemo(() => {
    if (!pair) return null;
    return {
      side1_prefix: `${FX_BASE}/${pair.images.find(image => image.endsWith('side-1-prefix.png'))}`,
      side1_result: `${FX_BASE}/${pair.images.find(image => image.endsWith('side-1-result.png'))}`,
      side2_prefix: `${FX_BASE}/${pair.images.find(image => image.endsWith('side-2-prefix.png'))}`,
      side2_result: `${FX_BASE}/${pair.images.find(image => image.endsWith('side-2-result.png'))}`,
    };
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
            <SectionTitle>P0.1A OFFENSIVE FX — ROM BG TILEMAP</SectionTitle>
            {(['side1', 'side2'] as const).map((side) => (
              <div key={side} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>{side.toUpperCase()} — full map 256×64 (20×32 tiles)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['prefix', 'result'] as const).map((suf) => {
                    const url = images[`${side}_${suf}`];
                    return (
                      <div key={suf}>
                        <img src={url} alt={`${side} ${suf}`} style={{ imageRendering: 'pixelated', border: '1px solid #555', width: 256 * zoom }} />
                        <div style={{ fontSize: 11, opacity: 0.75 }}>
                          <Mono>{suf}</Mono> · ROM physical review render
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
            <FieldRow label="physicalId" value={<Mono>{pair.physicalId}</Mono>} />
            <FieldRow label="FXResource" value={<Mono>{pair.fxHex}</Mono>} />
            <FieldRow label="palette" value={<Mono>{pair.paletteHex}</Mono>} />
            <FieldRow label="status" value={<Mono>{pair.errors.length ? 'ERROR' : 'ROM_PHYSICAL_REVIEW'}</Mono>} />
            <FieldRow label="runtime" value={<Mono>ROM_FX_WINDOW STATIC_COMPLETE {runtime.staticComplete}/28 · COMPLETE {runtime.complete}/28</Mono>} />
            <FieldRow label="corpus" value={<Mono>{ROM_FX_CORPUS_SUMMARY.totals.offensiveFxResources}/28 FX · {ROM_FX_CORPUS_SUMMARY.totals.sidePhaseRenders} renders</Mono>} />
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
              RUNTIME PIXI: P0.1B emite ROM_FX_WINDOW static-complete (film ROM probado); SCX/SCY/timing/cleanup siguen pendientes antes de marcar ROM_FX_WINDOW_COMPLETE.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

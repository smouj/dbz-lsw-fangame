// ROM Display Lab 2.0 — tab ASSETS (Dev ROM Asset Explorer).
//
// Punto de entrada TRANSVERSAL: cruza la matriz B8 generada con los SSOT
// existentes (icons, spriteManifest, rom-bg, provenance) para mostrar qué
// consume Production de verdad.
//
// Disciplina (P0.4R-B8 / B6E):
//   · NO mantiene una tabla manual: importa el bridge generado.
//   · NO hay fallback de asset. Si falta un PNG generado se dice
//     GENERATED_ASSET_MISSING con resource + comando. Nunca una imagen parecida,
//     ni un BG $19 en lugar de $1A, ni un placeholder que parezca válido.
//   · La fidelidad B8 y la disponibilidad material del preview son DOS estados
//     distintos: una ruta puede seguir VERIFIED aunque el PNG no esté generado.
import { useMemo, useState } from 'react';
import {
  PRODUCTION_VISUAL_MATRIX_ROWS,
  PRODUCTION_VISUAL_MATRIX_COUNTS,
  PRODUCTION_VISUAL_MATRIX_GENERATED_AT,
  type VisualMatrixRow,
  type MatrixFidelity,
} from './productionVisualMatrix.generated';
import { SectionTitle, Mono, FieldRow } from './common';
import { cardIconUrl } from '../../data/icons';

const STATE_COLOR: Record<MatrixFidelity, string> = {
  VERIFIED: '#5ad86a',
  PENDING: '#e0b93c',
  DEFERRED_TO_TRACE: '#8a9bb0',
};

type StatusFilter = 'ALL' | MatrixFidelity;
type TypeFilter = 'ALL' | 'Card' | 'Fighter' | 'BG' | 'Palette' | 'FX' | 'Camera';

const TYPES: TypeFilter[] = ['ALL', 'Card', 'Fighter', 'BG', 'Palette', 'FX', 'Camera'];

function rowHasType(r: VisualMatrixRow, t: TypeFilter): boolean {
  switch (t) {
    case 'ALL': return true;
    case 'Card': return r.cardId !== null;
    case 'Fighter': return r.firstPhysicalId !== null || r.slots !== '—';
    case 'BG': return r.bg !== '—' && r.bg !== 'none';
    case 'Palette': return r.palette !== '—';
    case 'FX': return r.fx !== '—';
    case 'Camera': return r.camera !== '—';
  }
}

/** Preview de un asset REAL: distingue fidelidad de disponibilidad material. */
function AssetPreview({ label, url, zoom = 4, missingCmd }: {
  label: string; url: string | null; zoom?: number; missingCmd?: string;
}) {
  const [state, setState] = useState<'IDLE' | 'LOADING' | 'OK' | 'MISSING'>(url ? 'LOADING' : 'MISSING');
  if (!url) {
    return (
      <div style={{ border: '1px dashed #6a4a2a', background: '#241a12', borderRadius: 6, padding: 8 }}>
        <Mono dim>{label}</Mono>
        <div style={{ color: '#e0a35c', fontSize: 12, marginTop: 4 }}>
          <b>GENERATED_ASSET_MISSING</b>
          <div style={{ color: '#c9a06a' }}>{missingCmd ? `→ ${missingCmd}` : 'sin recurso declarado'}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ border: '1px solid #2a3a4a', background: '#101820', borderRadius: 6, padding: 8 }}>
      <Mono dim>{label}</Mono>
      <div style={{ marginTop: 4 }}>
        {state === 'MISSING' ? (
          <div style={{ color: '#e0a35c', fontSize: 12 }}>
            <b>GENERATED_ASSET_MISSING</b>
            <div style={{ color: '#c9a06a', wordBreak: 'break-all' }}>{url}</div>
            {missingCmd && <div style={{ color: '#c9a06a' }}>→ {missingCmd}</div>}
          </div>
        ) : (
          <img
            src={url}
            alt={label}
            onLoad={() => setState('OK')}
            onError={() => setState('MISSING')}
            style={{
              imageRendering: 'pixelated',
              width: `auto`,
              maxWidth: '100%',
              transform: `scale(${Math.min(zoom, 6)})`,
              transformOrigin: 'top left',
              display: 'block',
            }}
          />
        )}
      </div>
    </div>
  );
}

export function AssetsTab({ onNavigate }: {
  onNavigate?: (tab: 'actions' | 'fighters' | 'palettes' | 'fx', opts: { cardId?: number | null }) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [selected, setSelected] = useState<VisualMatrixRow | null>(PRODUCTION_VISUAL_MATRIX_ROWS[0] ?? null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTION_VISUAL_MATRIX_ROWS.filter(r => {
      if (status !== 'ALL' && r.fidelity !== status) return false;
      if (!rowHasType(r, type)) return false;
      if (!q) return true;
      return `${r.family} ${r.handler} ${r.note}`.toLowerCase().includes(q);
    });
  }, [query, status, type]);

  const badge = (label: string, value: number, color?: string) => (
    <span style={{
      border: `1px solid ${color ?? '#2a3a4a'}`, color: color ?? '#9fb8d0',
      borderRadius: 999, padding: '2px 10px', fontSize: 12,
    }}>{label} <b>{value}</b></span>
  );

  const btn = (active: boolean) => ({
    background: active ? '#2a4a6a' : '#141c2a',
    color: active ? '#fff' : '#9fb8d0',
    border: `1px solid ${active ? '#4a7aaa' : '#2a3a4a'}`,
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12,
  } as const);

  const sel = selected;
  const iconUrl = sel?.cardId != null ? cardIconUrl(sel.cardId) ?? null : null;
  // BG real: convención de build:rom-bg-assembly. Si el PNG no está generado, el
  // preview lo dice explícitamente — la fila sigue siendo VERIFIED en B8.
  const bgUrl = sel && /^\$1[9A]$/.test(sel.bg) && /^[0-9a-f]{2}$/i.test(sel.palette.replace(/[^0-9a-f]/gi, '').slice(0, 2))
    ? `/assets/rom-bg/bg${sel.bg.replace('$', '').toLowerCase()}-p${sel.palette.replace(/[^0-9a-f]/gi, '').slice(0, 2)}.png`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
      <SectionTitle>ROM ASSET EXPLORER</SectionTitle>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {badge('VERIFIED', PRODUCTION_VISUAL_MATRIX_COUNTS.verified, STATE_COLOR.VERIFIED)}
        {badge('PENDING', PRODUCTION_VISUAL_MATRIX_COUNTS.pending, STATE_COLOR.PENDING)}
        {badge('DEFERRED', PRODUCTION_VISUAL_MATRIX_COUNTS.deferred, STATE_COLOR.DEFERRED_TO_TRACE)}
        {badge('families', PRODUCTION_VISUAL_MATRIX_COUNTS.familiesCovered)}
        <span style={{ flex: 1 }} />
        <Mono dim>generated {PRODUCTION_VISUAL_MATRIX_GENERATED_AT}</Mono>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search family / handler / note…"
          style={{ background: '#101820', color: '#d7e6f5', border: '1px solid #2a3a4a', borderRadius: 4, padding: '4px 8px', minWidth: 240 }}
        />
        <span style={{ display: 'flex', gap: 4 }}>
          {(['ALL', 'VERIFIED', 'PENDING', 'DEFERRED_TO_TRACE'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatus(s)} style={btn(status === s)}>{s === 'DEFERRED_TO_TRACE' ? 'DEFERRED' : s}</button>
          ))}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          {TYPES.map(t => <button key={t} onClick={() => setType(t)} style={btn(type === t)}>{t}</button>)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 340px) 1fr', gap: 10 }}>
        {/* ── Lista ── */}
        <div style={{ border: '1px solid #2a3a4a', borderRadius: 6, overflow: 'hidden' }}>
          {rows.map(r => (
            <button key={r.family} onClick={() => setSelected(r)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                background: sel?.family === r.family ? '#1b2a3a' : '#101820',
                color: '#d7e6f5', border: 'none', borderBottom: '1px solid #1d2a36', padding: '6px 10px',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{r.family}</span>
                <span style={{ color: STATE_COLOR[r.fidelity], fontSize: 11 }}>{r.fidelity === 'DEFERRED_TO_TRACE' ? 'DEFERRED' : r.fidelity}</span>
              </div>
              <Mono dim>{r.handler}{r.cardId != null ? ` · card ${r.cardId}` : ''}</Mono>
            </button>
          ))}
          {rows.length === 0 && <div style={{ padding: 10 }}><Mono dim>sin resultados</Mono></div>}
        </div>

        {/* ── Inspector ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!sel && <Mono dim>selecciona una familia</Mono>}
          {sel && (
            <>
              <div style={{ border: '1px solid #2a3a4a', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>{sel.family}</h3>
                  <span style={{ color: STATE_COLOR[sel.fidelity], fontWeight: 700 }}>{sel.fidelity}</span>
                </div>
                <FieldRow label="Handler" value={sel.handler} />
                <FieldRow label="Binding" value={sel.binding ?? '—'} />
                <FieldRow label="Slots" value={sel.slots} />
                <FieldRow label="physicalId" value={sel.firstPhysicalId ?? '—'} />
                <FieldRow label="Film" value={`entry ${sel.entryTick ?? '—'} · impact ${sel.impactTick ?? '—'} · exit ${sel.exitTick ?? '—'}`} />
                <FieldRow label="Draw order" value={sel.drawOrder} />
                <FieldRow label="Production" value={`residual ${sel.residual} · status ${sel.fidelity}`} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                <AssetPreview label={`Card icon${sel.cardId != null ? ` #${sel.cardId}` : ''}`} url={iconUrl} zoom={4} />
                <AssetPreview label={`BG ${sel.bg}`} url={bgUrl} zoom={3} missingCmd="npm run build:rom-bg-assembly" />
              </div>

              <div style={{ border: '1px solid #2a3a4a', borderRadius: 6, padding: 10 }}>
                <SectionTitle>Provenance</SectionTitle>
                <FieldRow label="Note" value={sel.note || '—'} />
                <FieldRow label="BG" value={sel.bg} />
                <FieldRow label="Palette" value={sel.palette} />
                <FieldRow label="FX" value={sel.fx} />
                <FieldRow label="Camera" value={sel.camera} />
                <FieldRow label="Visibility" value={sel.visibility} />
                <p style={{ color: '#8a9bb0', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                  La fidelidad B8 y la disponibilidad material del PNG son estados distintos:
                  esta fila puede seguir <b>{sel.fidelity}</b> aunque el asset generado no exista todavía.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={btn(false)} onClick={() => onNavigate?.('actions', { cardId: sel.cardId })}>→ ACTIONS</button>
                <button style={btn(false)} onClick={() => onNavigate?.('fighters', { cardId: sel.cardId })}>→ FIGHTERS</button>
                <button style={btn(false)} onClick={() => onNavigate?.('palettes', { cardId: sel.cardId })}>→ PALETTES</button>
                <button style={btn(false)} onClick={() => onNavigate?.('fx', { cardId: sel.cardId })}>→ OFFENSIVE FX</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

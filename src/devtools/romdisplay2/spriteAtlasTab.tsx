// ROM Sprite Atlas — physical frame catalog.
// The catalog is ROM_PHYSICAL only.  The PNG is a materialized render of the
// ROM tiles; it is never used to decide identity, sequence or palette.
import { useEffect, useMemo, useState } from 'react';
import { ROM_FIGHTER_FORM_IDENTITY } from '../../data/generated/romFighterFormIdentity.generated';
import { ROM_CGB_PALETTE_TABLE } from '../../data/generated/romCgbPaletteTable.generated';
import {
  enrichRomSpriteAtlasForm,
  romSpriteAtlasExport,
  romSpriteAtlasForForm,
  romSpriteAtlasMetrics,
  ROM_SPRITE_ATLAS_FORMS,
  type RomSpriteAtlasForm,
  type RomSpriteAtlasFrame,
  type AtlasPaletteMode,
} from './romSpriteAtlas';
import { FieldRow, Mono, SectionTitle } from './common';

type AtlasView = 'physical' | 'animation';

interface ProvenanceFrame {
  physicalId: string;
  width?: number;
  height?: number;
  originX?: number;
  originY?: number;
  originInTrimX?: number;
  originInTrimY?: number;
  palette?: { paletteIndex?: number; cpuAddressHex?: string };
  rawBounds?: { originX?: number; originY?: number };
  rawImageFile?: string;
  metasprite?: { provenance?: { anchorX?: number; anchorY?: number } };
}

const identityByForm = new Map<string, (typeof ROM_FIGHTER_FORM_IDENTITY)[number]>(ROM_FIGHTER_FORM_IDENTITY.map(row => [row.formId, row]));
const paletteByIndex = new Map(ROM_CGB_PALETTE_TABLE.map(palette => [palette.index, palette]));

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#2a4a6a' : '#141c2a',
    color: active ? '#fff' : '#b7cbe0',
    border: `1px solid ${active ? '#5b8fc7' : '#2a3a4a'}`,
    borderRadius: 4,
    padding: '5px 9px',
    cursor: 'pointer',
    fontSize: 12,
  };
}

function FrameImage({ formId, frame, paletteMode = 'rom' }: { formId: string; frame: RomSpriteAtlasFrame; paletteMode?: AtlasPaletteMode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');
  const file = paletteMode === 'raw' ? frame.rawImageFile : frame.file;
  const url = file ? `/assets/sprites/${formId}/${file}` : '';
  const modeLabel = paletteMode === 'raw' ? 'RAW 2BPP' : paletteMode === 'grayscale' ? 'GRAYSCALE' : 'ROM PALETTE';
  return (
    <div style={{ minHeight: 100, display: 'grid', placeItems: 'center', background: 'repeating-conic-gradient(#15202b 0 25%, #101820 0 50%) 0 / 12px 12px', borderRadius: 4, overflow: 'hidden' }}>
      {status === 'missing' || !url ? (
        <Mono dim>GENERATED_ASSET_MISSING · {modeLabel}</Mono>
      ) : (
        <img
          src={url}
          alt={`${frame.physicalId} ${modeLabel} ROM physical frame`}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('missing')}
          style={{ maxWidth: '100%', maxHeight: 112, imageRendering: 'pixelated', objectFit: 'contain', opacity: status === 'loading' ? 0.35 : 1, filter: paletteMode === 'grayscale' ? 'grayscale(1)' : undefined }}
        />
      )}
    </div>
  );
}

function FrameCard({ formId, frame, selected, onSelect, paletteMode }: { formId: string; frame: RomSpriteAtlasFrame; selected: boolean; onSelect: () => void; paletteMode: AtlasPaletteMode }) {
  return (
    <button onClick={onSelect} style={{ textAlign: 'left', cursor: 'pointer', color: '#d7e6f5', background: selected ? '#1d344b' : '#101820', border: `1px solid ${selected ? '#70a8e4' : '#2a3a4a'}`, borderRadius: 5, padding: 6, minWidth: 0 }}>
      <FrameImage formId={formId} frame={frame} paletteMode={paletteMode} />
      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        <Mono>{frame.physicalId.slice(0, 19)}…</Mono>
        <span style={{ color: '#7CFC00', fontSize: 10 }}>ROM</span>
      </div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>VF {frame.visualFrameId} · uses {frame.usageCount}</div>
    </button>
  );
}

function Inspector({ form, frame, paletteMode }: { form: RomSpriteAtlasForm; frame: RomSpriteAtlasFrame | null; paletteMode: AtlasPaletteMode }) {
  if (!frame) return <div style={{ padding: 12 }}><Mono dim>Selecciona un frame físico ROM.</Mono></div>;
  const palette = frame.paletteId == null ? null : paletteByIndex.get(frame.paletteId);
  return (
    <div style={{ border: '1px solid #2a3a4a', borderRadius: 6, padding: 10, background: '#111b26' }}>
      <SectionTitle>PHYSICAL FRAME INSPECTOR</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 180px) 1fr', gap: 10, alignItems: 'start' }}>
        <div>
          <FrameImage formId={form.formId} frame={frame} paletteMode={paletteMode} />
          <Mono dim>{frame.file}</Mono>
        </div>
        <div>
          <FieldRow label="physicalId" value={<Mono>{frame.physicalId}</Mono>} status="EXACT" />
          <FieldRow label="visualFrameId" value={<Mono>{frame.visualFrameId}</Mono>} status="EXACT" />
          <FieldRow label="resource" value={<Mono>{frame.resourceId == null ? '—' : `$${frame.resourceId.toString(16).padStart(2, '0')}`}</Mono>} />
          <FieldRow label="profile / bank" value={<Mono>p${frame.actorVisualProfileKey.toString(16).padStart(2, '0')} · ${frame.graphicsBank === 0 ? '—' : `$${frame.graphicsBank.toString(16).padStart(2, '0')}`}</Mono>} status="EXACT" />
          <FieldRow label="native bounds" value={<Mono>{frame.width == null ? 'loading provenance…' : `${frame.width}×${frame.height}px`}</Mono>} />
          <FieldRow label="origin / anchor" value={<Mono>{frame.originX == null ? '—' : `${frame.originX},${frame.originY} / ${frame.anchorX ?? '—'},${frame.anchorY ?? '—'}`}</Mono>} />
          <FieldRow label="palette" value={<Mono>{palette ? `${palette.indexHex} · ${palette.cpuAddressHex}` : `ROM index ${frame.paletteId ?? '—'}`}</Mono>} status={palette ? 'EXACT' : 'UNRESOLVED'} />
          <FieldRow label="raw 2bpp" value={<Mono>{frame.rawImageFile ?? '—'}</Mono>} status={frame.rawImageFile ? 'EXACT' : 'GENERATED_ASSET_MISSING'} />
          <FieldRow label="usage" value={<Mono>{frame.usageCount} mapped timeline occurrences</Mono>} />
        </div>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
        <FieldRow label="metasprite hash" value={<Mono>{frame.metaspriteHash}</Mono>} />
        <FieldRow label="graphics hash" value={<Mono>{frame.graphicsHash}</Mono>} />
        <FieldRow label="provenance hash" value={<Mono>{frame.sourceProvenanceHash}</Mono>} />
        <FieldRow label="trimmed pixel hash" value={<Mono>{frame.trimmedPixelHash}</Mono>} />
      </div>
      {frame.uses.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #24384a', paddingTop: 7 }}>
          <Mono>ANIMATION MAP · resource → sequence → frame</Mono>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {frame.uses.map(use => <span key={`${use.resourceId}-${use.sequence}-${use.frameIndex}`} style={{ border: '1px solid #37516a', borderRadius: 3, padding: '2px 5px', fontSize: 10, color: '#c8def3' }}>${use.resourceId.toString(16).padStart(2, '0')} / S{use.sequence} / F{use.frameIndex} · {use.durationTicks}t</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function SpriteAtlasTab() {
  const [formId, setFormId] = useState(ROM_SPRITE_ATLAS_FORMS[0]?.formId ?? '');
  const [view, setView] = useState<AtlasView>('physical');
  const [paletteMode, setPaletteMode] = useState<AtlasPaletteMode>('rom');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<RomSpriteAtlasForm | null>(() => romSpriteAtlasForForm(formId));
  const [provenanceState, setProvenanceState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    const next = romSpriteAtlasForForm(formId);
    setForm(next);
    setSelectedId(next?.frames[0]?.physicalId ?? null);
    setProvenanceState('loading');
    if (!next) return;
    let alive = true;
    fetch(`/assets/sprites/${formId}/provenance.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<{ frames?: ProvenanceFrame[] }> : Promise.reject(new Error(String(response.status))))
      .then(data => { if (alive && next) { setForm(enrichRomSpriteAtlasForm(next, data.frames ?? [])); setProvenanceState('ready'); } })
      .catch(() => { if (alive) setProvenanceState('missing'); });
    return () => { alive = false; };
  }, [formId]);

  const metrics = useMemo(() => romSpriteAtlasMetrics(), []);
  const frames = useMemo(() => {
    if (!form) return [];
    const normalized = query.trim().toLowerCase();
    return form.frames.filter(frame => !normalized || `${frame.physicalId} ${frame.resourceId ?? ''} ${frame.visualFrameId}`.toLowerCase().includes(normalized));
  }, [form, query]);
  const selected = form?.frames.find(frame => frame.physicalId === selectedId) ?? null;

  const download = () => {
    if (!form) return;
    const blob = new Blob([JSON.stringify(romSpriteAtlasExport(form), null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${form.formId}-atlas.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <SectionTitle>ROM SPRITE ATLAS · PHYSICAL FRAME CATALOG</SectionTitle>
        <p style={{ margin: 0, color: '#9fb8d0', fontSize: 12, lineHeight: 1.45 }}>
          Catálogo generado desde <Mono>ROM_PHYSICAL_CORPUS_SUMMARY</Mono>. Cada identidad procede de metasprite + bloques gráficos + tiles + geometría + paleta ROM; la imagen solo materializa ese frame para inspección.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ color: '#cfe3ff', fontSize: 12 }}>FORM</label>
        <select value={formId} onChange={event => setFormId(event.target.value)} style={{ background: '#141c2a', color: '#d7e6f5', border: '1px solid #2a4a6a', borderRadius: 4, padding: 5, minWidth: 190 }}>
          {ROM_SPRITE_ATLAS_FORMS.map(item => <option key={item.formId} value={item.formId}>{item.formId} · {item.runtimeFormLabel}</option>)}
        </select>
        <button style={buttonStyle(view === 'physical')} onClick={() => setView('physical')}>PHYSICAL ATLAS</button>
        <button style={buttonStyle(view === 'animation')} onClick={() => setView('animation')}>ANIMATION MAP</button>
        <span style={{ color: '#9fb8d0', fontSize: 11, marginLeft: 4 }}>PALETTE</span>
        {([['rom', 'ROM PALETTE'], ['raw', 'RAW 2BPP'], ['grayscale', 'GRAYSCALE']] as const).map(([mode, label]) => <button key={mode} style={buttonStyle(paletteMode === mode)} onClick={() => setPaletteMode(mode)}>{label}</button>)}
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="physicalId / resource / VF…" style={{ marginLeft: 'auto', background: '#101820', color: '#d7e6f5', border: '1px solid #2a3a4a', borderRadius: 4, padding: '5px 8px', minWidth: 190 }} />
        <button style={buttonStyle(false)} onClick={download} disabled={!form}>DOWNLOAD ATLAS.JSON</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          ['FORMS', metrics.forms], ['PHYSICAL FRAMES', form?.uniquePhysicalFrames ?? 0], ['ALIASES', metrics.duplicateAliases], ['MAPPED USAGES', form?.mappedUsages ?? 0], ['PALETTES', metrics.palettes], ['UNRESOLVED', form?.unresolvedFrames ?? 0],
        ].map(([label, value]) => <span key={label} style={{ border: '1px solid #2a3a4a', borderRadius: 999, padding: '3px 9px', fontSize: 11, color: label === 'UNRESOLVED' && value ? '#ffb070' : '#b7cbe0' }}><b>{value}</b> {label}</span>)}
        <span style={{ color: provenanceState === 'ready' ? '#7CFC00' : '#e0b93c', fontSize: 11, alignSelf: 'center' }}>{provenanceState === 'ready' ? 'PROVENANCE LOADED' : provenanceState === 'missing' ? 'GENERATED_ASSET_MISSING · provenance.json' : 'LOADING ROM PROVENANCE…'}</span>
      </div>

      {form && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 420px)', gap: 10, alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: 6, color: '#9fb8d0', fontSize: 11 }}>{view === 'physical' ? 'UNIQUE PHYSICAL IDENTITIES · sin duplicados por form' : 'RESOURCE → SEQUENCE → TIMELINE · usos sobre el mismo frame físico'}</div>
          {view === 'physical' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(142px, 1fr))', gap: 7 }}>
              {frames.map(frame => <FrameCard key={frame.physicalId} formId={form.formId} frame={frame} paletteMode={paletteMode} selected={frame.physicalId === selectedId} onSelect={() => setSelectedId(frame.physicalId)} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...new Set(frames.flatMap(frame => frame.uses.map(use => `${use.resourceId}:${use.sequence}`)))].map(key => {
                const [resource, sequence] = key.split(':').map(Number);
                const sequenceFrames = frames.filter(frame => frame.uses.some(use => use.resourceId === resource && use.sequence === sequence));
                return <div key={key} style={{ border: '1px solid #2a3a4a', borderRadius: 5, padding: 7 }}><Mono>${resource.toString(16).padStart(2, '0')} · SEQUENCE {sequence}</Mono><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6, marginTop: 6 }}>{sequenceFrames.map(frame => <FrameCard key={frame.physicalId} formId={form.formId} frame={frame} paletteMode={paletteMode} selected={frame.physicalId === selectedId} onSelect={() => setSelectedId(frame.physicalId)} />)}</div></div>;
              })}
            </div>
          )}
          {frames.length === 0 && <div style={{ border: '1px dashed #6a4a2a', borderRadius: 5, padding: 14 }}><Mono dim>sin frames ROM para este filtro</Mono></div>}
        </div>
        <Inspector form={form} frame={selected} paletteMode={paletteMode} />
      </div>}
      <div style={{ borderTop: '1px solid #233548', paddingTop: 7, color: '#768da4', fontSize: 11 }}>
        Fuente: ROM sha256 <Mono>{'bd1df5d6653be9e262f96db3bcdd7bb8…'}</Mono> · form/profile <Mono>{identityByForm.get(formId)?.actorVisualProfileKey ?? '—'}</Mono> · no legacy manifest / no manual PNG authority.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio (REESCRITURA COMPLETA)
// ─────────────────────────────────────────────────────────────────────────
// Vista única de personaje: lista → detalle → secciones jerarquizadas.
//
//   · Sidebar: personajes del roster (vertical, sticky)
//   · Header: retrato + nombre (editable inline) + tags de la forma
//   · Tabs: formas del personaje (nombres editables inline)
//   · Sheet: Preview (FormPreview controlado) + Stats/nivel (2 col)
//   · Assets: portrait · overworld · idle · battle OW · power · sheet
//   · Retratos: battle · menú · story (grid verificada)
//   · Frames: browser por pose con inspector (bbox/alpha/specks/dupes)
//     + reemplazo de frames (override local o guardar en disco)
//
// REGLA DE ORO: todos los hooks ANTES de cualquier return condicional.
// (Dos bugs de "Rendered more hooks than during the previous render" se
// corrigieron moviendo useState/useMemo al inicio de los componentes.)
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import {
  FORMS, ROM_ORDERED_CHARACTERS, getForm, statAtLevel, sheetUrl, idleSpriteUrl, LIMIT_DEFAULTS,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl } from '../data/spriteManifest';
import { CARDS, type CardDef, type CardType, CARD_COLORS } from '../data/cards';
import { romCardData } from '../data/romCardData';
import {
  bindingsForForm,
  type CharacterFrameBinding,
  type FrameMapping,
} from '../battle/characterFrameMap';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { MENU_PORTRAITS } from '../data/icons';
import { STORY_PORTRAITS, storyPortraitUrl } from '../data/storyPortraits';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from '../data/battleOverworld';
import { characterName } from '../data/storyPanels';
import { useSheetAnalysis, groupFramesByPose, type FrameAnalysis } from './frameAnalysis';
import { poseSemantics, parseFrameName } from './frameSemantics';
import { FormPreview } from './FormPreview';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';
import { romBeamConsumersForFormResource } from '../battle/romSequenceSelectors';
import { getBindingForCard, getConsumersForResource, getBindingSummary, type RomActionSequenceBinding, type RomActionAnimationTrack } from '../data/romActionSequenceBinding';
import { getRomSequenceRegistry } from '../data/romSequenceRegistry';
import { ROM_FIGHTER_FORM_IDENTITY } from '../data/generated/romFighterFormIdentity.generated';
import { catalogAnimationBank, catalogResourceBase } from '../data/generated/romAnimationResourceBase.generated';

// ═══ Escritura real a disco (middleware /__dev/write) ──────────────────
async function frameDataUrl(rel: string): Promise<string> {
  const r = await fetch(`/assets/${rel}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`lectura ${rel}: HTTP ${r.status}`);
  const blob = await r.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function writeAssetToDisk(rel: string, dataUrl: string): Promise<void> {
  const r = await fetch('/__dev/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rel, data: dataUrl.split(',')[1] ?? dataUrl }),
  });
  if (!r.ok) throw new Error(`escritura ${rel}: HTTP ${r.status} ${await r.text()}`);
}

// ═══ Constantes ─────────────────────────────────────────────────────────
const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

const NAMES_KEY = 'dbzlsw:char-names';
const REPORTED_FRAMES_KEY = 'dbzlsw:reported-frames';

type ReportedFrame = {
  physicalId: string;
  formId: string;
  timestamp: number;
  provenance: Record<string, unknown>;
  symptom: string;
  note: string;
};

function useReportedFrames() {
  const [reported, setReported] = useState<ReportedFrame[]>(() => loadJson(REPORTED_FRAMES_KEY, [] as ReportedFrame[]));
  useEffect(() => { try { localStorage.setItem(REPORTED_FRAMES_KEY, JSON.stringify(reported)); } catch { /* noop */ } }, [reported]);
  const toggle = (physicalId: string, formId: string, provenance: Record<string, unknown>) => {
    setReported(prev => {
      const idx = prev.findIndex(f => f.physicalId === physicalId);
      if (idx >= 0) return prev.filter((_, i) => i !== idx); // unmark
      return [...prev, { physicalId, formId, timestamp: Date.now(), provenance, symptom: '', note: '' }];
    });
  };
  const isReported = (physicalId: string) => reported.some(f => f.physicalId === physicalId);
  const clear = () => setReported([]);
  return { reported, toggle, isReported, clear };
}

const ReportedFramesContext = createContext<ReturnType<typeof useReportedFrames>>({ reported: [], toggle: () => {}, isReported: () => false, clear: () => {} });

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

interface RomPhysicalFrame {
  physicalId: string;
  file: string;
  rawCanvasFile?: string;
  resourceId: number;
  resourceHex: string;
  visualFrameId: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  originInTrimX?: number;
  originInTrimY?: number;
  trim?: { x: number; y: number; w: number; h: number; originInTrim?: { x: number; y: number } };
  palette: { bgr555: string[]; colors: string[] };
  actorVisualProfileKey?: number;
  graphicsBank?: number;
  metasprite?: { pieces?: unknown[]; provenance?: { tableAddress?: number; entryAddress?: number; pieceAddress?: number; count?: number } };
  graphics?: { blockCount?: number; provenance?: { tableAddress?: number; entryAddress?: number; layoutAddress?: number } };
  sourceProvenance?: {
    metaspriteHash?: string;
    graphicsTableHash?: string;
    graphicsHash?: string;
    sourceProvenanceHash?: string;
  };
  occurrences: Array<{
    sequence: number;
    frameIndex: number;
    durationTicks: number;
    offsetX: number;
    offsetY: number;
    rawOffsetX: number;
    rawOffsetY: number;
    frameAddress?: number;
  }>;
}

interface RomPhysicalProvenance {
  source: string;
  schemaVersion: number;
  offsetEncoding: string;
  formProfile: {
    actorVisualProfileKey: number;
    graphicsBank: number;
    paletteRaw: string[];
    paletteAddress: string;
  };
  transparentFrameRecords?: Array<{
    resourceHex: string;
    sequence: number;
    frameIndex: number;
    visualFrameId: number;
    physicalRender: 'EMPTY_NOT_PROMOTED';
  }>;
  frames: RomPhysicalFrame[];
}

interface RomPhysicalSequence {
  resource: number;
  sequence: number;
  frames: Array<{
    file: string;
    physicalId: string;
    frameIndex: number;
    visualFrameId: number;
    durationTicks: number;
    offsetX: number;
    offsetY: number;
    rawOffsetX: number;
    rawOffsetY: number;
    originX: number;
    originY: number;
    originInTrimX?: number;
    originInTrimY?: number;
    rawCanvasFile?: string;
  }>;
}

interface RomPhysicalManifest {
  source: string;
  schemaVersion: number;
  offsetEncoding: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  transparentFrameRecords?: RomPhysicalProvenance['transparentFrameRecords'];
  sequences: Record<string, RomPhysicalSequence>;
}

interface RomFighterIdentityRow {
  formId: string;
  romFormIdHex: string;
  romRecordBankHex: string;
  romRecordCpuAddressHex: string;
  romRecordFileOffsetHex: string;
  rawRecordHex: string[];
  actorVisualProfileKeyHex: string;
  graphicsBankHex: string;
  paletteIndexHex: string;
  paletteCpuAddressHex: string;
  paletteFileOffsetHex: string;
  mappingStatus: string;
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function hexAddr(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `0x${value.toString(16).padStart(4, '0')}` : '—';
}

function romAddr(bank: number | null | undefined, address: number | null | undefined): string {
  return typeof bank === 'number' && typeof address === 'number'
    ? `$${hex(bank)}:${address.toString(16).padStart(4, '0')}`
    : '—';
}

function frameOccurrenceLabel(frame: Pick<RomPhysicalFrame, 'occurrences'>): string {
  const first = frame.occurrences[0];
  if (!first) return '—';
  return `seq ${first.sequence} · frame ${first.frameIndex} · ${first.durationTicks}t`;
}

function physicalFrameProvenance(frame: RomPhysicalFrame, formId: string): Record<string, string | number> {
  const animationBank = catalogAnimationBank(frame.resourceId);
  const resourceBase = catalogResourceBase(frame.resourceId);
  const first = frame.occurrences[0];
  const metaspriteEntry = frame.metasprite?.provenance?.entryAddress;
  const graphicsEntry = frame.graphics?.provenance?.entryAddress ?? frame.graphics?.provenance?.layoutAddress;
  return {
    physicalId: frame.physicalId,
    form: formId,
    profileKey: frame.actorVisualProfileKey == null ? '—' : `0x${hex(frame.actorVisualProfileKey)}`,
    graphicsBank: frame.graphicsBank == null ? '—' : `0x${hex(frame.graphicsBank)}`,
    animationBank: animationBank == null ? '—' : `0x${hex(animationBank)}`,
    resourceBase: hexAddr(resourceBase),
    resourceId: frame.resourceHex,
    sequence: first?.sequence ?? '—',
    frameIndex: first?.frameIndex ?? '—',
    VFID: `0x${hex(frame.visualFrameId)}`,
    frameRecordAddress: resourceBase != null && first?.frameAddress != null ? romAddr(animationBank, resourceBase + first.frameAddress) : '—',
    metaspriteAddress: resourceBase != null && metaspriteEntry != null ? romAddr(animationBank, resourceBase + metaspriteEntry) : '—',
    graphicsDescriptorAddress: resourceBase != null && graphicsEntry != null ? romAddr(animationBank, resourceBase + graphicsEntry) : '—',
    metaspriteLocalAddress: hexAddr(metaspriteEntry),
    graphicsDescriptorLocalAddress: hexAddr(graphicsEntry),
    pieces: frame.metasprite?.pieces?.length ?? '—',
    graphicsBlocks: frame.graphics?.blockCount ?? '—',
    metaspriteHash: frame.sourceProvenance?.metaspriteHash ?? '—',
    graphicsHash: frame.sourceProvenance?.graphicsHash ?? '—',
    sourceProvenanceHash: frame.sourceProvenance?.sourceProvenanceHash ?? '—',
  };
}

function copyText(text: string): void {
  // Save button reference before clipboard (focus may shift)
  const btn = document.activeElement as HTMLElement | null;
  const flash = (msg: string) => {
    if (!btn) return;
    const orig = btn.textContent ?? '';
    btn.textContent = msg;
    btn.style.color = '#4ade80';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1400);
  };

  // Try Clipboard API first (requires HTTPS or localhost secure context)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => flash('✓ Copied')).catch(() => {
      fallbackCopy(text); flash('✓ Copied');
    });
    return;
  }
  // Fallback: textarea + execCommand (works in HTTP)
  fallbackCopy(text);
  flash('✓ Copied');
}

function fallbackCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function copySequenceFrameProvenance(formId: string, seq: RomPhysicalSequence, frame: RomPhysicalSequence['frames'][number]): void {
  const animationBank = catalogAnimationBank(seq.resource);
  const resourceBase = catalogResourceBase(seq.resource);
  copyText(JSON.stringify({
    physicalId: frame.physicalId,
    form: formId,
    animationBank: animationBank == null ? '—' : `0x${hex(animationBank)}`,
    resourceBase: hexAddr(resourceBase),
    resourceId: `0x${hex(seq.resource)}`,
    sequence: seq.sequence,
    frameIndex: frame.frameIndex,
    VFID: `0x${hex(frame.visualFrameId)}`,
    durationTicks: frame.durationTicks,
    offsetX: frame.offsetX,
    offsetY: frame.offsetY,
    rawOffsetX: frame.rawOffsetX,
    rawOffsetY: frame.rawOffsetY,
  }, null, 2));
}

function PhysicalFrameProvenanceTools({ frame, formId, compact = false }: { frame: RomPhysicalFrame; formId: string; compact?: boolean }) {
  const { toggle, isReported } = useContext(ReportedFramesContext);
  const provenance = physicalFrameProvenance(frame, formId);
  const reported = isReported(frame.physicalId);
  const copyPhysicalId = () => copyText(frame.physicalId);
  const copyProvenance = () => copyText(JSON.stringify(provenance, null, 2));
  const toggleReport = () => toggle(frame.physicalId, formId, provenance as Record<string, unknown>);
  return (
    <div className={`dev-rom-provenance-tools ${compact ? 'compact' : ''}`}>
      <div className="dev-rom-provenance-line">
        <code>{frame.physicalId}</code>
        <button className="dev-btn dev-btn-mini" onClick={copyPhysicalId}>COPY PHYSICAL ID</button>
        <button className="dev-btn dev-btn-mini" onClick={copyProvenance}>COPY PROVENANCE</button>
        <button className={`dev-btn dev-btn-mini ${reported ? 'dev-btn-reported' : ''}`} onClick={toggleReport}>
          {reported ? '✗ UNMARK' : '⚑ REPORT'}
        </button>
      </div>
      <div className="dev-rom-provenance-grid">
        <span><strong>form</strong>{formId}</span>
        <span><strong>profileKey</strong>{provenance.profileKey}</span>
        <span><strong>graphicsBank</strong>{provenance.graphicsBank}</span>
        <span><strong>animationBank</strong>{provenance.animationBank}</span>
        <span><strong>resourceBase</strong>{provenance.resourceBase}</span>
        <span><strong>resourceId</strong>{provenance.resourceId}</span>
        <span><strong>sequence</strong>{provenance.sequence}</span>
        <span><strong>frameIndex</strong>{provenance.frameIndex}</span>
        <span><strong>VFID</strong>{provenance.VFID}</span>
        <span><strong>frame record</strong>{provenance.frameRecordAddress}</span>
        <span><strong>metasprite</strong>{provenance.metaspriteAddress}</span>
        <span><strong>graphics descriptor</strong>{provenance.graphicsDescriptorAddress}</span>
      </div>
    </div>
  );
}

type RomFighterIdentity = typeof ROM_FIGHTER_FORM_IDENTITY[number];

const ROM_IDENTITY_BY_FORM: Map<string, RomFighterIdentity> = new Map(
  ROM_FIGHTER_FORM_IDENTITY.map(row => [row.formId, row]),
);

// ═══ F-MAP helpers (Character Studio ↔ characterFrameMap) ═══════════════
const MAPPING_LABEL: Record<FrameMapping, string> = {
  ROM_EXACT: 'ROM_EXACT',
  ROM_PHASE: 'ROM_PHASE',
  CANONICAL_PHYSICAL: 'CANONICAL_PHYSICAL',
  SHARED_PHYSICAL: 'SHARED_PHYSICAL',
  COMPOSITE: 'COMPOSITE',
  FALLBACK: 'FALLBACK',
  REFERENCE_FX: 'REFERENCE_FX',
  UNRESOLVED: 'UNRESOLVED',
};

const MAPPING_TONE: Record<FrameMapping, string> = {
  ROM_EXACT: 'ok', ROM_PHASE: 'info', CANONICAL_PHYSICAL: 'ok', SHARED_PHYSICAL: 'info',
  COMPOSITE: 'info', FALLBACK: 'bad', REFERENCE_FX: 'info', UNRESOLVED: 'warn',
};

const RELATION_LABEL: Record<string, string> = {
  BYTE_EXACT: 'BYTE_EXACT', PIXEL_EXACT: 'PIXEL_EXACT',
  VISIBLE_PIXEL_EXACT: 'VISIBLE_PIXEL_EXACT', NO_MATCH: 'NO_MATCH',
};

/** Cartas usables por un personaje (compatible incluye al personaje, o compatible undefined). */
function cardsForCharacter(charId: string): CardDef[] {
  return CARDS.filter(c => {
    if (c.notCompatible?.includes(charId)) return false;
    if (c.compatible === undefined) return true;
    return c.compatible.includes(charId);
  });
}

// ═══ InlineName — nombre editable con persistencia ──────────────────────
function InlineName({ value, onCommit, className }: {
  value: string; onCommit: (v: string) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [editing, value]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onCommit(v);
    setEditing(false);
  };

  if (editing) {
    return (
      <input ref={ref} className={`dev-inline-input ${className ?? ''}`} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        aria-label="Editar nombre" />
    );
  }
  return (
    <span className={`dev-inline-name ${className ?? ''}`} title="Clic para editar"
      onClick={e => { e.stopPropagation(); setEditing(true); }}>
      {value}
      <span className="dev-inline-edit-icon" aria-hidden>✎</span>
    </span>
  );
}

// ═══ Módulo principal ───────────────────────────────────────────────────
export function CharactersModule({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const reportedFrames = useReportedFrames();
  const [charId, setCharId] = useState(ROM_ORDERED_CHARACTERS[0]?.id ?? 'gohan_kid');
  const [formId, setFormId] = useState(ROM_ORDERED_CHARACTERS[0]?.forms[0] ?? 'gohan_young');
  const [level, setLevel] = useState(50);
  const [previewPose, setPreviewPose] = useState('idle');
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(() => loadJson(NAMES_KEY, {}));

  useEffect(() => {
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(nameOverrides)); } catch { /* noop */ }
  }, [nameOverrides]);

  const displayName = (id: string, fallback: string) => nameOverrides[id] ?? fallback;
  const char = ROM_ORDERED_CHARACTERS.find(c => c.id === charId) ?? ROM_ORDERED_CHARACTERS[0];
  const form = getForm(formId) ?? getForm(char.forms[0])!;
  const spriteDir = spriteDirFor(form.id);
  const manifestUrl = spriteManifestUrl(form.id);
  const idleUrl = spriteDir ? spriteFrameUrl(form.id, `${spriteDir}_idle_00.png`) : idleSpriteUrl(form);
  const owFallback = overworldUrl(form.id);
  const battleOwIdle = battleOverworldActorUrl(form.id, 'idle') ?? owFallback;
  const battleOwPower = battleOverworldActorUrl(form.id, 'gather_power_pose') ?? owFallback;

  const [battleOwAura, setBattleOwAura] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    battleOverworldAuraUrlAsync(form.id).then(url => { if (!cancelled) setBattleOwAura(url); });
    return () => { cancelled = true; };
  }, [form.id]);

  const portrait = BATTLE_PORTRAITS[form.id];
  const analysis = useSheetAnalysis(form.id, spriteDir);

  const selectChar = (id: string) => {
    setCharId(id);
    const c = ROM_ORDERED_CHARACTERS.find(x => x.id === id);
    if (c) setFormId(c.forms[0]);
  };

  return (
    <ReportedFramesContext.Provider value={reportedFrames}>
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Character Studio</h1>
        <p className="dev-sub">
          Stats ROM · assets · poses de combate · ROM physical corpus · legacy assets de referencia.
        </p>
      </header>

      <div className="dev-chars-layout">
        {/* ── Sidebar: personajes ── */}
        <div className="dev-char-list">
          {ROM_ORDERED_CHARACTERS.map(c => (
            <button key={c.id} className={`dev-char-chip ${c.id === charId ? 'active' : ''}`}
              onClick={() => selectChar(c.id)}>
              <span className="dev-char-name">{displayName(c.id, c.name)}</span>
              <span className="dev-char-forms">{c.forms.length}</span>
            </button>
          ))}
        </div>

        {/* ── Banner de frames reportados ── */}
        {reportedFrames.reported.length > 0 && (
          <div className="dev-reported-banner">
            <strong>⚑ {reportedFrames.reported.length} frame{reportedFrames.reported.length !== 1 ? 's' : ''} reported</strong>
            {' '}
            <button className="dev-btn dev-btn-mini dev-btn-danger" onClick={reportedFrames.clear}>Clear all</button>
            <div className="dev-reported-list">
              {reportedFrames.reported.map(f => (
                <span key={f.physicalId} className="dev-reported-chip">
                  {f.formId}/{f.physicalId.slice(0, 20)}…
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Detalle ── */}
        <div className="dev-char-detail">
          {/* Header del personaje */}
          <div className="dev-char-head">
            <div className="dev-char-portrait">
              {portrait && <img src={portrait} alt="" />}
            </div>
            <div className="dev-char-id">
              <h2>
                <InlineName value={displayName(char.id, char.name)}
                  onCommit={v => setNameOverrides(o => ({ ...o, [char.id]: v }))} />
              </h2>
              <div className="dev-char-meta">
                <span className="dev-tag">Saga {char.saga}</span>
                <span className="dev-tag">Tier {char.tier}/5</span>
                <span className="dev-tag">{char.forms.length} formas</span>
                <span className={`dev-tag ${spriteDir ? 'ok' : 'bad'}`}>{spriteDir ? `sprite: ${spriteDir}` : 'sin dir animado'}</span>
              </div>
              <div className="dev-linked-actions">
                <button className="dev-btn" disabled={!spriteDir}
                  onClick={() => onOpenModule?.('animation', { formId: form.id, pose: 'idle' })}>
                  Abrir Animation →
                </button>
              </div>
            </div>
          </div>

          {/* Tabs de formas */}
          <div className="dev-form-tabs">
            {char.forms.map(fid => {
              const f = getForm(fid);
              return (
                <button key={fid} className={`dev-form-tab ${fid === formId ? 'active' : ''}`}
                  onClick={() => setFormId(fid)}>
                  <InlineName value={displayName(fid, f?.form ?? fid)}
                    onCommit={v => setNameOverrides(o => ({ ...o, [fid]: v }))} />
                </button>
              );
            })}
          </div>

          {/* SECCIÓN 1 — Preview + Stats (2 columnas) */}
          <section className="dev-char-block dev-primary-block">
            <div className="dev-primary-grid">
              <FormPreview formId={form.id} dir={spriteDir} analysis={analysis}
                pose={previewPose} onPoseChange={setPreviewPose} />
              <div className="dev-primary-stats">
                <div className="dev-form-preview-head">
                  <h3 className="dev-form-col-title">Stats</h3>
                  <span className="dev-tag">ROM</span>
                </div>
                <div className="dev-form-id-row">
                  <code>{form.id}</code>
                  {form.tier && <span className="dev-tag">tier {form.tier}</span>}
                  {form.sheet && <span className="dev-tag">{form.sheet}</span>}
                  <span className={`dev-tag ${spriteDir ? 'ok' : 'bad'}`}>{spriteDir ? 'manifest ✓' : 'sin manifest'}</span>
                  <span className={`dev-tag ${portrait ? 'ok' : 'bad'}`}>{portrait ? 'portrait ✓' : 'sin portrait'}</span>
                  {manifestUrl && (
                    <a className="dev-manifest-link" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json ↗</a>
                  )}
                  {spriteDir && (
                    <button className="dev-btn dev-btn-mini"
                      title="Abrir la carpeta física del sprite en Asset Explorer"
                      onClick={() => onOpenModule?.('assets', { formId: form.id })}>📁 carpeta</button>
                  )}
                </div>
                <div className="dev-level-row">
                  <span className="dev-level-label">Level</span>
                  <input type="range" min={1} max={100} value={level}
                    onChange={e => setLevel(Number(e.target.value))} className="dev-range" />
                  <span className="dev-level-value">{level}</span>
                </div>
                <div className="dev-stats-grid dev-stats-compact">
                  {STATS.map(s => {
                    const base = form[s.key];
                    const val = statAtLevel(form, level, s.key);
                    const growth = form.curves ? (form.curves[s.key][3] - base) : 0;
                    const pct = Math.min(100, (val / Math.max(1, form.curves ? form.curves[s.key][3] : val)) * 100);
                    return (
                      <div key={s.key} className="dev-stat">
                        <div className="dev-stat-head">
                          <span style={{ color: s.color }}>{s.label}</span>
                          <strong>{val}</strong>
                          <small>base {base}</small>
                        </div>
                        <div className="dev-stat-bar"><div style={{ width: `${pct}%`, background: s.color }} /></div>
                        <div className="dev-stat-growth">+{growth} @100</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2 — Assets de la forma + Retratos */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Assets de la forma</h3>
            <div className="dev-asset-grid dev-assets-horizontal">
              <AssetCell label="Portrait" src={portrait} />
              <AssetCell label="Overworld" src={overworldUrl(form.id)} />
              <AssetCell label="Idle (combate)" src={idleUrl} />
              <AssetCell label="Battle OW idle" src={battleOwIdle} />
              <PowerUpCell poseSrc={battleOwPower} auraSrc={battleOwAura} />
              {form.sheet && <AssetCell label="ROM sheet ref" src={sheetUrl(form)} wide />}
            </div>
            <div className="dev-poses-section dev-retratos">
              <h3>Retratos del personaje</h3>
              <div className="dev-retratos-grid">
                <AssetCell label="Battle (forma)" src={BATTLE_PORTRAITS[form.id]} small />
                <AssetCell label="Menú" src={MENU_PORTRAITS[char.id]} small />
                <StoryPortraitsGrid charId={form.character} formId={form.id} />
              </div>
            </div>
          </section>

          <RomPhysicalFighterPanel formId={form.id} onOpenModule={onOpenModule} />

          {/* SECCIÓN 2.5 — ROM Actions: binding card → handler → track → sequence */}
          <RomActionsPanel formId={form.id} />

          {/* SECCIÓN 2.7 — ROM Canon Manifest: action → physicalId mapping */}
          <RomCanonManifestPanel formId={form.id} />

          {/* SECCIÓN 3 — Legacy User Manifest (REFERENCE ONLY, not ROM authority) */}
          <section className="dev-char-block dev-legacy-section">
            <h3 className="dev-char-block-title">
              Legacy User Manifest
              <span className="dev-tag warn">REFERENCE ONLY · NOT ROM PHYSICAL</span>
              <span className="dev-sheets-count">{analysis.frames.length} frames · {analysis.problemCount} avisos</span>
            </h3>
            {analysis.overridden && (
              <div className="dev-wip-banner">
                Overrides locales activos — los frames pueden diferir de los manifests OUT_frames.{' '}
                <button className="dev-btn" onClick={analysis.clearOverrideLocal}>Limpiar override</button>
              </div>
            )}
            <FrameBrowser formId={form.id} analysis={analysis} dir={spriteDir} />
          </section>

          {/* SECCIÓN 4 — Physical Map (F-MAP: ROM + canonical + manifest) */}
          <CharacterPhysicalMap formId={form.id} />
        </div>
      </div>
    </div>
    </ReportedFramesContext.Provider>
  );
}

function RomPhysicalFighterPanel({ formId, onOpenModule }: {
  formId: string;
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const dir = spriteDirFor(formId);
  const [manifest, setManifest] = useState<RomPhysicalManifest | null>(null);
  const [provenance, setProvenance] = useState<RomPhysicalProvenance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSeq, setOpenSeq] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setManifest(null);
    setProvenance(null);
    setError(null);
    if (!dir) {
      setError('Sin directorio runtime para esta forma.');
      return () => { cancelled = true; };
    }
    Promise.all([
      fetch(`/assets/sprites/${dir}/rom-physical.manifest.json`, { cache: 'no-store' }),
      fetch(`/assets/sprites/${dir}/provenance.json`, { cache: 'no-store' }),
    ]).then(async ([manifestResponse, provenanceResponse]) => {
      if (!manifestResponse.ok || !provenanceResponse.ok) {
        throw new Error(`ROM physical no disponible (${manifestResponse.status}/${provenanceResponse.status})`);
      }
      const nextManifest = await manifestResponse.json() as RomPhysicalManifest;
      const nextProvenance = await provenanceResponse.json() as RomPhysicalProvenance;
      if (!cancelled) {
        setManifest(nextManifest);
        setProvenance(nextProvenance);
        const firstSeq = Object.keys(nextManifest.sequences)[0] ?? null;
        setOpenSeq(firstSeq);
      }
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => { cancelled = true; };
  }, [dir]);

  const sequences = useMemo(() => manifest
    ? Object.entries(manifest.sequences).sort(([, a], [, b]) => a.resource - b.resource || a.sequence - b.sequence)
    : [], [manifest]);
  const selectedConsumers = useMemo(() => {
    const map = new Map<string, ReturnType<typeof romBeamConsumersForFormResource>>();
    for (const [, seq] of sequences) {
      const consumers = romBeamConsumersForFormResource(formId, seq.resource).filter(consumer => consumer.sequence === seq.sequence);
      if (consumers.length > 0) map.set(`${seq.resource}:${seq.sequence}`, consumers);
    }
    return map;
  }, [formId, sequences]);
  const selectedSequences = sequences.filter(([, seq]) => selectedConsumers.has(`${seq.resource}:${seq.sequence}`));
  const researchSequences = sequences.filter(([, seq]) => !selectedConsumers.has(`${seq.resource}:${seq.sequence}`));
  const frames = provenance?.frames ?? [];
  const resources = [...new Set(sequences.map(([, seq]) => `$${hex(seq.resource)}`))];
  const identity = ROM_FIGHTER_FORM_IDENTITY.find(row => row.formId === formId) as RomFighterIdentityRow | undefined;
  const identityVerified = identity?.mappingStatus === 'ROM_RECORD_VERIFIED' || identity?.mappingStatus === 'ROM_IDENTITY_VERIFIED';

  return (
    <section className="dev-char-block dev-rom-physical-panel">
      <div className="dev-fmap-head">
        <h3 className="dev-char-block-title">
          ROM Physical Fighter Frames
          <span className="dev-sheets-count">
            {provenance ? `${frames.length} physical IDs · ${frames.reduce((total, frame) => total + frame.occurrences.length, 0)} frame instances` : 'loading'}
          </span>
        </h3>
        <div className="dev-fmap-summary">
          <span className="dev-tag ok">ROM CANON</span>
          <span className="dev-tag">SOURCE: ROM BYTES</span>
          {manifest && <span className="dev-tag">schema {manifest.schemaVersion}/{manifest.offsetEncoding}</span>}
          {identity && <span className={`dev-tag ${identityVerified ? 'ok' : 'warn'}`}>{identity.mappingStatus}</span>}
          {manifest && <span className="dev-tag">profile 0x{hex(manifest.actorVisualProfileKey)}</span>}
          {manifest && <span className="dev-tag">graphics bank 0x{hex(manifest.graphicsBank)}</span>}
          {provenance?.transparentFrameRecords?.length ? <span className="dev-tag warn">{provenance.transparentFrameRecords.length} EMPTY_NOT_PROMOTED</span> : null}
          {resources.map(resource => <span key={resource} className="dev-tag">{resource}</span>)}
        </div>
      </div>

      {error && <div className="dev-wip-banner">ROM physical: {error}</div>}
      {!error && !manifest && <div className="dev-hint">Cargando corpus físico ROM…</div>}

      {manifest && provenance && (
        <>
          <div className="dev-rom-identity-grid">
            <div><strong>FORM</strong><code>{formId}</code></div>
            <div><strong>ROM form record</strong><code>{identity ? `${identity.romRecordBankHex}:${identity.romRecordCpuAddressHex} / ${identity.romRecordFileOffsetHex}` : '—'}</code></div>
            <div><strong>ROM form id</strong><code>{identity?.romFormIdHex ?? '—'}</code></div>
            <div><strong>identity status</strong><code>{identity?.mappingStatus ?? 'UNVERIFIED_PHYSICAL'}</code></div>
            <div><strong>actorVisualProfileKey</strong><code>0x{hex(manifest.actorVisualProfileKey)}</code></div>
            <div><strong>graphicsBank</strong><code>0x{hex(manifest.graphicsBank)}</code></div>
            <div><strong>palette index</strong><code>{identity?.paletteIndexHex ?? `0x${hex(manifest.actorVisualProfileKey)}`}</code></div>
            <div><strong>palette address</strong><code>{identity ? `${identity.paletteCpuAddressHex} / ${identity.paletteFileOffsetHex}` : provenance.formProfile.paletteAddress}</code></div>
            <div><strong>raw record</strong><code>{identity?.rawRecordHex.join(' ') ?? '—'}</code></div>
            <div><strong>palette</strong><code>{provenance.formProfile.paletteRaw.join(' ')}</code></div>
            <div><strong>source</strong><code>{provenance.source}</code></div>
            <div><strong>display facing</strong><code>ROM raw + right-facing preview</code></div>
            <div><strong>empty frame records</strong><code>{provenance.transparentFrameRecords?.length ?? 0} PRESENT / NOT_PROMOTED</code></div>
          </div>

          <div className="dev-rom-physical-actions">
            <button className="dev-btn" onClick={() => onOpenModule?.('animation', { formId })}>Open Animation</button>
            <button className="dev-btn" onClick={() => onOpenModule?.('assets', { formId })}>Open Assets</button>
            <button className="dev-btn" onClick={() => onOpenModule?.('romdisplay', { formId })}>Open ROM Display</button>
          </div>

          <h4 className="dev-rom-subtitle">Promoted Physical PNGs</h4>
          <div className="dev-hint">PROMOTED PHYSICAL PNGS are visible render outputs only. Transparent ROM frame records remain tracked as EMPTY_NOT_PROMOTED evidence.</div>
          <div className="dev-rom-physical-grid">
            {frames.map(frame => (
              <div key={frame.physicalId} className="dev-rom-frame-card">
                <div className="dev-rom-frame-img-pair">
                  <div className="dev-rom-frame-img">
                    <span>TRIMMED ROM</span>
                    <img src={`/assets/sprites/${dir}/${frame.file}`} alt={`${frame.physicalId} trimmed physical`} loading="lazy" />
                  </div>
                  {frame.rawCanvasFile && (
                    <div className="dev-rom-frame-img raw">
                      <span>RAW CANVAS</span>
                      <img src={`/assets/sprites/${dir}/${frame.rawCanvasFile}`} alt={`${frame.physicalId} raw canvas`} loading="lazy" />
                    </div>
                  )}
                  <div className="dev-rom-frame-img canonical">
                    <span>CANONICAL DISPLAY</span>
                    <img className="dev-rom-facing-right" src={`/assets/sprites/${dir}/${frame.file}`} alt={`${frame.physicalId} right-facing display`} loading="lazy" />
                  </div>
                </div>
                <PhysicalFrameProvenanceTools frame={frame} formId={formId} />
                <span>{frame.resourceHex} · vf ${hex(frame.visualFrameId)} · {frame.width}×{frame.height}</span>
                <span>uses {frame.occurrences.length} · trim {frame.trim?.x ?? frame.originX},{frame.trim?.y ?? frame.originY} · origin {frame.originInTrimX ?? '—'},{frame.originInTrimY ?? '—'}</span>
                <span>{frameOccurrenceLabel(frame)} · pieces {frame.metasprite?.pieces?.length ?? '—'} · blocks {frame.graphics?.blockCount ?? '—'}</span>
                <span>palette {frame.palette?.bgr555?.join(' ') ?? '—'}</span>
              </div>
            ))}
          </div>

          <h4 className="dev-rom-subtitle">ROM Selected Sequences — CANONICAL / ACTION-REACHABLE</h4>
          {selectedSequences.length === 0 && (
            <div className="dev-wip-banner">No selected sequence is proven for this form/resource set yet. Frames below are research-only until a ROM selector/consumer proves them.</div>
          )}
          <div className="dev-rom-sequence-list">
            {selectedSequences.map(([key, seq]) => (
              <RomSequenceBlock key={key} sequenceKey={key} seq={seq} dir={dir ?? ''} open={openSeq === key}
                onToggle={() => setOpenSeq(openSeq === key ? null : key)}
                consumers={selectedConsumers.get(`${seq.resource}:${seq.sequence}`) ?? []}
                formId={formId} />
            ))}
          </div>

          <h4 className="dev-rom-subtitle">All Resource Sequences — RESEARCH ONLY / NOT RUNTIME CANON</h4>
          <div className="dev-wip-banner">RESEARCH — NOT RUNTIME CANON. These frames may exist as ROM physical evidence but do not prove that this form/action selects them at runtime.</div>
          <div className="dev-rom-sequence-list">
            {researchSequences.map(([key, seq]) => (
              <RomSequenceBlock key={key} sequenceKey={key} seq={seq} dir={dir ?? ''} open={openSeq === key}
                onToggle={() => setOpenSeq(openSeq === key ? null : key)}
                consumers={[]}
                formId={formId} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RomSequenceBlock({ sequenceKey, seq, dir, open, onToggle, consumers, formId }: {
  sequenceKey: string;
  seq: RomPhysicalSequence;
  dir: string;
  open: boolean;
  onToggle: () => void;
  consumers: ReturnType<typeof romBeamConsumersForFormResource>;
  formId: string;
}) {
  const totalTicks = seq.frames.reduce((total, frame) => total + frame.durationTicks, 0);
  return (
    <div className={`dev-rom-sequence ${consumers.length > 0 ? 'selected' : 'research'}`}>
      <button className="dev-rom-sequence-head" onClick={onToggle}>
        <code>resource ${hex(seq.resource)} · seq {seq.sequence}</code>
        <span>{seq.frames.length} frames · {totalTicks} ticks GBC</span>
        {consumers.length > 0
          ? <span className="dev-tag ok">ROM SELECTED BY CARD</span>
          : <span className="dev-tag warn">RESEARCH ONLY</span>}
      </button>
      {consumers.length > 0 && (
        <div className="dev-rom-consumer-row">
          {consumers.slice(0, 8).map(consumer => (
            <span key={`${consumer.cardId}-${consumer.sequence}`} className="dev-tag">
              #{consumer.cardId} {consumer.cardName}
            </span>
          ))}
          {consumers.length > 8 && <span className="dev-tag">+{consumers.length - 8}</span>}
        </div>
      )}
      {open && (
        <div className="dev-rom-sequence-frames">
          {seq.frames.map(frame => (
            <div key={`${sequenceKey}-${frame.frameIndex}`} className="dev-rom-frame-card compact">
              <div className="dev-rom-frame-img-pair">
                <div className="dev-rom-frame-img">
                  <span>TRIMMED</span>
                  <img src={`/assets/sprites/${dir}/${frame.file}`} alt={`${frame.physicalId} trimmed physical`} loading="lazy" />
                </div>
                <div className="dev-rom-frame-img canonical">
                  <span>DISPLAY</span>
                  <img className="dev-rom-facing-right" src={`/assets/sprites/${dir}/${frame.file}`} alt={`${frame.physicalId} right-facing display`} loading="lazy" />
                </div>
              </div>
              <code>f{frame.frameIndex} · vf ${hex(frame.visualFrameId)}</code>
              <span>{frame.durationTicks}t · dx {frame.offsetX} dy {frame.offsetY}</span>
              <span>{frame.physicalId}</span>
              <div className="dev-rom-provenance-line compact">
                <button className="dev-btn dev-btn-mini" onClick={() => copyText(frame.physicalId)}>COPY PHYSICAL ID</button>
                <button className="dev-btn dev-btn-mini" onClick={() => copySequenceFrameProvenance(formId, seq, frame)}>COPY PROVENANCE</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ RomActionsPanel — ROM Action Sequence Bindings for a form ═══

function hex2(v: number): string {
  return `$0x${v.toString(16).padStart(2, '0')}`;
}

function cardUsesForm(cardName: string, formIndex: number): boolean {
  const d = romCardData(cardName);
  if (!d) return false;
  const byteIndex = Math.floor(formIndex / 8);
  const bitIndex = formIndex % 8;
  const byteVal = parseInt(d.mask.substring(byteIndex * 2, byteIndex * 2 + 2), 16);
  return (byteVal & (1 << bitIndex)) !== 0;
}

function statusIcon(status: string): string {
  switch (status) {
    case 'PHYSICAL_RESOURCE_FULLY_CLOSED': return '✅';
    case 'FRAME_STREAM_CLOSED': return '⚠️';
    case 'NO_ANIMATION_RESOURCE': return '⬜';
    default: return '❓';
  }
}

function RomActionsPanel({ formId }: { formId: string }) {
  // Card compatibility masks are keyed by ROM form order, not JS object/roster order.
  const formIndex = useMemo(() => {
    const identity = ROM_IDENTITY_BY_FORM.get(formId);
    return identity ? identity.romFormId - 1 : -1;
  }, [formId]);
  if (formIndex < 0) return null;

  // Get all cards this form can use
  const formCards = useMemo(() => {
    return CARDS.filter(c => {
      const d = romCardData(c.name);
      if (!d) return false;
      return cardUsesForm(c.name, formIndex);
    });
  }, [formIndex]);

  // Get bindings for each card
  const cardBindings = useMemo(() => {
    const result: Array<{ card: typeof CARDS[number]; binding: RomActionSequenceBinding }> = [];
    for (const card of formCards) {
      const binding = getBindingForCard(card.id);
      if (binding) result.push({ card, binding });
    }
    return result;
  }, [formCards]);

  // Filter to cards with actor animation resources
  const actionCards = useMemo(() => {
    return cardBindings.filter(({ binding }) =>
      binding.tracks.some(t => t.trackId === 'actor' && t.resourceId != null)
    );
  }, [cardBindings]);

  const [expanded, setExpanded] = useState<number | null>(null);
  const summary = getBindingSummary();

  // Registry for physical frame lookup
  const registry = useMemo(() => getRomSequenceRegistry(), []);

  if (actionCards.length === 0) {
    return (
      <section className="dev-char-block dev-rom-physical-panel">
        <h3 className="dev-char-block-title">ROM Actions
          <span className="dev-sheets-count">no actor animation for this form</span>
        </h3>
      </section>
    );
  }

  return (
    <section className="dev-char-block dev-rom-physical-panel">
      <div className="dev-fmap-head">
        <h3 className="dev-char-block-title">
          ROM Actions
          <span className="dev-sheets-count">{actionCards.length} actions with actor animation</span>
        </h3>
        <div className="dev-fmap-summary">
          <span className="dev-tag">{formId}</span>
          <span className="dev-tag">{formCards.length} compatible cards</span>
          <span className="dev-tag ok">{actionCards.filter(({ binding }) => binding.tracks.some(t => t.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED')).length} fully closed</span>
          <span className="dev-tag warn">{actionCards.filter(({ binding }) => binding.tracks.some(t => t.physicalStatus === 'FRAME_STREAM_CLOSED')).length} frame stream only</span>
        </div>
      </div>

      <div className="dev-rom-action-list">
        {actionCards.map(({ card, binding }) => {
          const actorTrack = binding.tracks.find(t => t.trackId === 'actor');
          if (!actorTrack || actorTrack.resourceId == null) return null;

          const regEntry = registry.find(r => r.resourceId === actorTrack.resourceId);
          const isExpanded = expanded === card.id;
          const icon = statusIcon(actorTrack.physicalStatus);

          return (
            <div key={card.id} className="dev-rom-sequence">
              <button className="dev-rom-sequence-head" onClick={() => setExpanded(isExpanded ? null : card.id)}>
                <code>{icon} {card.name}</code>
                <span>
                  {actorTrack.resourceId != null ? hex2(actorTrack.resourceId) : '—'}
                  {' · '}
                  handler {binding.execution.handlerHex}
                  {' · '}
                  {actorTrack.sequences.length} seq
                  {' · '}
                  {actorTrack.totalFrames} frames
                  {' · '}
                  {actorTrack.totalTicks} ticks
                </span>
                <span className={`dev-tag ${actorTrack.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED' ? 'ok' : actorTrack.physicalStatus === 'FRAME_STREAM_CLOSED' ? 'warn' : ''}`}>
                  {actorTrack.physicalStatus === 'PHYSICAL_RESOURCE_FULLY_CLOSED' ? 'ROM PHYSICAL' : actorTrack.physicalStatus === 'FRAME_STREAM_CLOSED' ? 'FRAME STREAM' : 'PENDING'}
                </span>
              </button>

              {/* Track summary */}
              <div className="dev-rom-consumer-row">
                {binding.tracks.map(track => (
                  <span key={track.trackId} className="dev-tag">
                    {track.trackId === 'actor' ? '🎭' : track.trackId === 'fx' ? '✨' : '🔄'}
                    {' '}{track.label}
                    {track.resourceId != null ? ` ${hex2(track.resourceId)}` : ''}
                  </span>
                ))}
                {binding.resultBranches.length > 0 && (
                  <span className="dev-tag">
                    → {binding.resultBranches.join(' / ')}
                  </span>
                )}
              </div>

              {/* Selector info */}
              <div className="dev-rom-consumer-row">
                <span className="dev-tag">
                  selector: {actorTrack.selector.kind}
                </span>
                {actorTrack.selector.value != null && (
                  <span className="dev-tag">seq {actorTrack.selector.value}</span>
                )}
              </div>

              {/* Expanded: show sequence details */}
              {isExpanded && regEntry && (
                <div className="dev-rom-sequence-frames">
                  {regEntry.sequences.map((seq, si) => (
                    <div key={si} className="dev-rom-frame-card compact">
                      <div><strong>Seq {si}</strong> · addr 0x{seq.address.toString(16)} · {seq.frames.length} frames · {seq.totalTicks} ticks</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                        {seq.frames.map((frame, fi) => (
                          <div key={fi} style={{
                            padding: '2px 4px',
                            fontSize: '10px',
                            background: frame.linkageResolved ? '#1a3a1a' : '#3a1a1a',
                            border: '1px solid #333',
                            borderRadius: '3px',
                          }}>
                            f{fi} vf${hex(frame.visualFrameId)} {frame.durationTicks}t
                            {frame.linkageResolved && <span style={{ color: '#8f8' }}> ●</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Used by: cards that share this resource */}
                  {(() => {
                    const consumers = getConsumersForResource(actorTrack.resourceId!);
                    if (consumers.length === 0) return null;
                    return (
                      <div style={{ marginTop: '8px', padding: '4px 8px', background: '#1a1a2e', borderRadius: '4px' }}>
                        <strong>Used by:</strong>
                        {consumers.map(c => (
                          <span key={`${c.cardId}-${c.trackId}`} className="dev-tag" style={{ marginLeft: '4px' }}>
                            #{c.cardId} {c.cardName}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* FX track info */}
                  {binding.fxResourceId != null && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#aaa' }}>
                      FX: resource {hex2(binding.fxResourceId)} · palette {binding.fxPaletteId != null ? hex2(binding.fxPaletteId) : '—'} (separate from actor)
                    </div>
                  )}
                </div>
              )}

              {/* Expanded but no registry data */}
              {isExpanded && !regEntry && (
                <div className="dev-rom-sequence-frames">
                  <div style={{ padding: '8px', color: '#888', fontSize: '12px' }}>
                    Resource {hex2(actorTrack.resourceId)} not yet decoded into RomSequenceRegistry.
                    {actorTrack.physicalStatus === 'FRAME_STREAM_CLOSED' && ' Frame stream available but metasprite linkage PENDING.'}
                    {actorTrack.physicalStatus === 'NO_ANIMATION_RESOURCE' && ' Awaiting decode.'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══ FrameBrowser — pose → grid de frames → inspector + reemplazo ──────
const FRAME_OVERRIDES_KEY = 'dbzlsw-frame-overrides-v2';

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FRAME_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch { return {}; }
}

// ═══ RomCanonManifestPanel — ROM Canon Manifest: action → sequence → frame → physicalId ═══
// This panel shows the ROM-derived semantic mapping for the selected form.
// It consumes ONLY RomFighterIdentityRegistry + RomSequenceRegistry + RomActionSequenceBinding.
// No useSheetAnalysis, no spriteFrameUrl, no legacy manifest.

function RomCanonManifestPanel({ formId }: { formId: string }) {
  const identity = ROM_FIGHTER_FORM_IDENTITY.find(row => row.formId === formId);
  const profileKey = identity?.actorVisualProfileKey ?? -1;
  const graphicsBank = identity?.graphicsBank ?? -1;

  const registry = useMemo(() => getRomSequenceRegistry(), []);

  // Get the rom-physical manifest for this form to map ROM sequence instances to physical frames.
  const dir = spriteDirFor(formId);
  const [physManifest, setPhysManifest] = useState<RomPhysicalManifest | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!dir) { setPhysManifest(null); return; }
    fetch(`/assets/sprites/${dir}/rom-physical.manifest.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setPhysManifest(data as RomPhysicalManifest); })
      .catch(() => { if (!cancelled) setPhysManifest(null); });
    return () => { cancelled = true; };
  }, [dir]);

  // Build resource/sequence/frame → frame details lookup from rom-physical manifest.
  const physFrameMap = useMemo(() => {
    const map = new Map<string, { physicalId: string; file: string; visualFrameId: number }>();
    if (!physManifest) return map;
    for (const seq of Object.values(physManifest.sequences)) {
      for (const frame of seq.frames) {
        map.set(`${seq.resource}:${seq.sequence}:${frame.frameIndex}`, {
          physicalId: frame.physicalId,
          file: frame.file,
          visualFrameId: frame.visualFrameId,
        });
      }
    }
    return map;
  }, [physManifest]);

  // Collect unique actions for this form from bindings
  const actionsForForm = useMemo(() => {
    const seen = new Map<string, { cardName: string; handlerFamily: string; resourceId: number | null; trackId: string }>();
    const formCards = CARDS.filter(c => {
      const compatible = c.compatible ?? c.notCompatible;
      return compatible?.includes(formId);
    });
    for (const card of formCards) {
      const binding = getBindingForCard(card.id);
      if (!binding) continue;
      for (const track of binding.tracks) {
        const key = `${track.resourceId ?? 'none'}:${track.trackId}`;
        if (!seen.has(key)) {
          seen.set(key, {
            cardName: card.name,
            handlerFamily: binding.execution.family,
            resourceId: track.resourceId,
            trackId: track.trackId,
          });
        }
      }
    }
    return [...seen.values()];
  }, [formId]);

  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  if (!identity) {
    return <section className="dev-char-block dev-rom-physical-panel">
      <h3 className="dev-char-block-title">ROM Canon Manifest</h3>
      <div className="dev-wip-banner">No ROM identity for {formId}</div>
    </section>;
  }

  return (
    <section className="dev-char-block dev-rom-physical-panel">
      <div className="dev-fmap-head">
        <h3 className="dev-char-block-title">
          ROM Canon Manifest
          <span className="dev-tag ok">ROM_DERIVED</span>
          <span className="dev-sheets-count">
            {actionsForForm.length} actions · profile 0x{hex(profileKey)} · bank 0x{hex(graphicsBank)}
          </span>
        </h3>
      </div>
      <div className="dev-rom-identity-grid">
        <div><strong>FORM</strong><code>{formId}</code></div>
        <div><strong>profileKey</strong><code>0x{hex(profileKey)}</code></div>
        <div><strong>graphicsBank</strong><code>0x{hex(graphicsBank)}</code></div>
        <div><strong>identity</strong><code>{identity.mappingStatus}</code></div>
      </div>

      <h4 className="dev-rom-subtitle">Actions → Sequences → Physical Frames</h4>
      <div className="dev-rom-action-list">
        {actionsForForm.map(action => {
          const resourceEntry = registry.find(e => e.resourceId === action.resourceId);
          const status = resourceEntry?.status ?? 'NO_ANIMATION_RESOURCE';
          const sequences = resourceEntry?.sequences ?? [];
          const isExpanded = expandedAction === `${action.resourceId ?? 'none'}:${action.trackId}`;

          return (
            <div key={`${action.resourceId ?? 'none'}:${action.trackId}`} className="dev-rom-sequence">
              <button className="dev-rom-sequence-head" onClick={() => setExpandedAction(isExpanded ? null : `${action.resourceId ?? 'none'}:${action.trackId}`)}>
                <code>{action.cardName}</code>
                <span>{action.handlerFamily} · {action.trackId} · ${hex(action.resourceId ?? 0xFF)}</span>
                <span className={`dev-tag ${status === 'PHYSICAL_RESOURCE_FULLY_CLOSED' ? 'ok' : status === 'FRAME_STREAM_CLOSED' ? 'warn' : 'err'}`}>
                  {status}
                </span>
              </button>
              {isExpanded && (
                <div className="dev-rom-sequence-frames">
                  {sequences.map((seq, seqIndex) => (
                    <div key={`seq-${seq.address}`} className="dev-rom-frame-card compact">
                      <div><strong>Seq {seqIndex} · addr 0x{seq.address.toString(16)} ({seq.frames.length} frames, {seq.totalTicks} ticks)</strong></div>
                      {seq.frames.map(frame => {
                        const phys = physFrameMap.get(`${action.resourceId}:${seqIndex}:${frame.frameIndex}`);
                        return (
                          <div key={`f-${frame.frameIndex}`} className="dev-rom-frame-mini">
                            {phys ? (
                              <img
                                src={`/assets/sprites/${dir}/${phys.file}`}
                                alt={`vf${frame.visualFrameId}`}
                                loading="lazy"
                                style={{ imageRendering: 'pixelated', width: 48, height: 48, objectFit: 'contain' }}
                              />
                            ) : (
                              <span className="dev-tag err">UNRESOLVED</span>
                            )}
                            <span className="dev-rom-frame-label">
                              f{frame.frameIndex} · vf${hex(frame.visualFrameId)} · {frame.durationTicks}t
                              {phys && <code className="dev-rom-pid">{phys.physicalId}</code>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="dev-rom-physical-actions" style={{ marginTop: 8 }}>
        <span className="dev-tag">SOURCE: RomFighterIdentityRegistry + RomSequenceRegistry + RomActionSequenceBinding</span>
        <span className="dev-tag">NO useSheetAnalysis · NO spriteFrameUrl · NO legacy manifest</span>
      </div>
    </section>
  );
}

function FrameBrowser({ formId, analysis, dir }: {
  formId: string;
  analysis: ReturnType<typeof useSheetAnalysis>;
  dir: string | undefined;
}) {
  const [pose, setPose] = useState('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);
  const [overrides, setOverrides] = useState<Record<string, string>>(loadOverrides);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(FRAME_OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* noop */ }
  }, [overrides]);

  const groups = groupFramesByPose(analysis.frames, dir, analysis.usages);
  const activeGroup = groups.find(g => g.pose === pose) ?? groups[0];

  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.pose === pose)) setPose('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.frames]);

  const selFrame = analysis.frames.find(f => f.file === selected) ?? null;
  const selUsages = selFrame ? (analysis.usages[selFrame.file] ?? []) : [];

  // Todos los archivos del manifest (para el picker de reemplazo)
  const allFiles = useMemo(() => {
    const seen = new Set<string>();
    for (const f of analysis.frames) {
      if (!seen.has(f.file)) seen.add(f.file);
    }
    return [...seen];
  }, [analysis.frames]);

  const appliedFile = (file: string) => overrides[file] ?? file;
  const hasOverride = selFrame ? overrides[selFrame.file] !== undefined : false;

  const applyReplacement = () => {
    if (!selFrame || !candidate) return;
    setOverrides(o => ({ ...o, [selFrame.file]: candidate }));
    setReplacing(null);
    setCandidate(null);
  };

  const clearReplacement = () => {
    if (!selFrame) return;
    setOverrides(o => {
      const n = { ...o };
      delete n[selFrame.file];
      return n;
    });
    setReplacing(null);
    setCandidate(null);
  };

  const saveToDisk = async () => {
    if (!selFrame || !dir) return;
    const original = selFrame.file;
    const replacement = overrides[original];
    if (!replacement || replacement === original) return;
    if (!confirm(`Sobrescribir en disco:\nsprites/${dir}/${original}\ncon el contenido de:\nsprites/${dir}/${replacement}\n\nEsto afecta a TODAS las poses que usan ese frame.`)) return;
    try {
      const dataUrl = await frameDataUrl(`sprites/${dir}/${replacement}`);
      await writeAssetToDisk(`sprites/${dir}/${original}`, dataUrl);
      clearReplacement();
      alert('✓ Guardado en disco. Recarga el juego para ver el cambio (el manifest no cambia).');
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  return (
    <div className="dev-frames">
      {/* Pose pills con conteo */}
      <div className="dev-pose-pills dev-frames-pills">
        {groups.map(g => (
          <button key={g.pose} className={`dev-pose-pill ${g.pose === pose ? 'active' : ''}`}
            onClick={() => { setPose(g.pose); setSelected(g.frames[0]?.file ?? null); }}
            title={`${g.sem.meaning} — ${g.frames.length} frames`}>
            {g.pose} <em>{g.frames.length}</em>
          </button>
        ))}
        {groups.length === 0 && <span className="dev-hint">Sin frames en el manifest (carga…)</span>}
      </div>

      {/* Grid de frames de la pose activa */}
      {activeGroup && (
        <div className="dev-pose-group">
          <div className={`dev-pose-group-head cat-${activeGroup.sem.category.toLowerCase()}`}>
            <span className="dev-pose-group-name">{activeGroup.pose}</span>
            <span className="dev-pose-group-cat">{activeGroup.sem.category}</span>
            <span className="dev-pose-group-meaning">{activeGroup.sem.meaning}</span>
          </div>
          <div className="dev-sheets-grid" role="list" aria-label={`${activeGroup.pose} sprite frames`}>
            {activeGroup.frames.map(f => {
              const overridden = overrides[f.file] !== undefined;
              return (
                <button key={f.file}
                  className={`dev-sheet-cell ${selected === f.file ? 'active' : ''} ${f.touchesEdge && f.touchTop > 3 ? 'edge' : ''} ${f.bgSpecks > 0 ? 'speck' : ''} ${f.dupeOf ? 'dupe' : ''} ${overridden ? 'has-override' : ''}`}
                  onClick={() => setSelected(f.file)}
                  title={`${f.file}${overridden ? `\n⚠ reemplazado por ${overrides[f.file]}` : ''}\n${f.w}×${f.h} · ${activeGroup.sem.meaning}\n${f.touchesEdge ? '⚠ toca borde' : ''}${f.bgSpecks ? `\n${f.bgSpecks} specks` : ''}${f.dupeOf ? `\n⧉ duplicado de ${f.dupeOf}` : ''}`}>
                  <span className="dev-sheet-thumb">
                    <img src={spriteFrameUrl(formId, appliedFile(f.file))} alt={f.file} loading="lazy" decoding="async"
                      width={f.w} height={f.h} style={{ width: f.w * 2, height: f.h * 2, imageRendering: 'pixelated' }} />
                  </span>
                  <span className="dev-sheet-name">{f.file.replace(`${dir ?? ''}_`, '').replace('.png', '')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspector */}
      {selFrame ? (() => {
        const { pose: fpose } = parseFrameName(selFrame.file, dir ?? '');
        const sem = poseSemantics(fpose);
        const shownFile = appliedFile(selFrame.file);
        return (
          <div className="dev-sheets-inspector dev-frames-inspector">
            <div className="dev-sheets-zoom">
              <label>Zoom</label>
              <div className="dev-zoom-row">
                {[2, 4, 6, 8, 12].map(z => (
                  <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
                ))}
              </div>
            </div>
            <h3>{shownFile} <small>{selFrame.w}×{selFrame.h}px · {selFrame.alphaPct}% alpha</small></h3>
            <div className={`dev-pose-group-head cat-${sem.category.toLowerCase()}`}>
              <span className="dev-pose-group-name">{fpose}</span>
              <span className="dev-pose-group-cat">{sem.category}</span>
            </div>
            <p className="dev-sheet-sem-meaning">{sem.meaning}</p>
            <div className="dev-checker-bg">
              <FrameZoom imgSrc={spriteFrameUrl(formId, shownFile)} w={selFrame.w} h={selFrame.h} zoom={zoom} bbox={selFrame.opaque} />
            </div>
            <div className="dev-sheet-details">
              <div className={selFrame.touchesEdge && selFrame.touchTop > 3 ? 'warn' : 'ok'}>
                {selFrame.touchesEdge && selFrame.touchTop > 3
                  ? `⚠ Contenido tocando el borde superior (${selFrame.touchTop} px) — posible cabeza cortada`
                  : '✓ Sin contenido pegado al borde superior'}
              </div>
              <div className={selFrame.bgSpecks > 0 ? 'warn' : 'ok'}>
                {selFrame.bgSpecks > 0 ? `${selFrame.bgSpecks} specks de color de fondo` : '✓ Sin specks'}
              </div>
              <div className={selFrame.dupeOf ? 'info' : 'ok'}>
                {selFrame.dupeOf ? `⧉ Contenido idéntico a ${selFrame.dupeOf}` : '✓ Frame único'}
              </div>
            </div>
            {selUsages.length > 0 && (
              <div className="dev-sheet-sem-used">
                <strong>Usos reales en manifest:</strong>
                <ul>
                  {selUsages.map(u => (
                    <li key={`${u.pose}-${u.index}`}><code>{u.pose}[{u.index}]</code> · {u.semantic}</li>
                  ))}
                </ul>
              </div>
            )}
            <code className="dev-manifest-path">sprites/{dir}/{shownFile}</code>

            {/* Acciones de reemplazo */}
            <div className="dev-frame-actions">
              {hasOverride ? (
                <>
                  <button className="dev-btn dev-btn-mini dev-btn-danger" onClick={clearReplacement}>↩ Restaurar original</button>
                  <button className="dev-btn dev-btn-mini" onClick={saveToDisk}>💾 Guardar en disco</button>
                </>
              ) : (
                <button className="dev-btn dev-btn-mini"
                  onClick={() => { setReplacing(selFrame.file); setCandidate(null); }}>⇄ Reemplazar frame…</button>
              )}
            </div>

            {/* Picker de reemplazo */}
            {replacing === selFrame.file && (
              <div className="dev-replace-inline">
                <div className="dev-replace-picker-title">
                  Todos los frames del manifest ({allFiles.length})
                  <span className="dev-hint"> elige uno para {selFrame.file}</span>
                </div>
                <div className="dev-replace-grid">
                  {allFiles.map(file => (
                    <button key={file} className={`dev-replace-opt ${candidate === file ? 'selected' : ''} ${file === selFrame.file ? 'current' : ''}`}
                      onClick={() => setCandidate(file)}
                      title={`${file} (reemplaza a ${selFrame.file})`}>
                      <img src={spriteFrameUrl(formId, file)} alt={file} loading="lazy" decoding="async" style={{ imageRendering: 'pixelated' }} />
                      <span>{file.replace(/^.*?_/, '').replace('.png', '')}</span>
                    </button>
                  ))}
                </div>
                <div className="dev-replace-actions">
                  <button className="dev-btn dev-btn-mini" disabled={!candidate} onClick={applyReplacement}>✓ Aplicar reemplazo</button>
                  <button className="dev-btn dev-btn-mini" onClick={() => setReplacing(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        <div className="dev-empty">Selecciona un frame para inspeccionarlo</div>
      )}
    </div>
  );
}

// ═══ FrameZoom — canvas ampliado con bbox dorado ────────────────────────
function FrameZoom({ imgSrc, w, h, zoom, bbox }: {
  imgSrc: string; w: number; h: number; zoom: number; bbox: FrameAnalysis['opaque'];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const img = new Image();
    img.onload = () => {
      cv.width = w * zoom;
      cv.height = h * zoom;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if (bbox) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bbox.x * zoom, bbox.y * zoom, bbox.w * zoom, bbox.h * zoom);
      }
    };
    img.src = imgSrc;
  }, [imgSrc, w, h, zoom, bbox]);
  return <canvas ref={ref} className="dev-sprite-canvas" />;
}

// ═══ Assets ════════════════════════════════════════════════════════════
function AssetCell({ label, src, wide, small }: { label: string; src?: string; wide?: boolean; small?: boolean }) {
  return (
    <div className={`dev-asset-cell ${wide ? 'wide' : ''} ${small ? 'small' : ''}`}>
      <div className="dev-asset-frame">
        {src ? <img src={src} alt={label} loading="lazy" /> : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">{label}</div>
    </div>
  );
}

function PowerUpCell({ poseSrc, auraSrc }: { poseSrc?: string; auraSrc?: string }) {
  return (
    <div className="dev-asset-cell">
      <div className="dev-asset-frame dev-powerup-frame">
        {poseSrc ? (
          <>
            {auraSrc && <img src={auraSrc} alt="" className="dev-powerup-aura" loading="lazy" />}
            <img src={poseSrc} alt="Battle OW power up" className="dev-powerup-actor" loading="lazy" />
          </>
        ) : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">Battle OW power</div>
    </div>
  );
}

// ═══ Retratos de story del personaje ═══════════════════════════════════
function StoryPortraitsGrid({ charId, formId }: { charId: string; formId: string }) {
  const entry = STORY_PORTRAITS[charId];
  const urls = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ src: string; label: string }> = [];
    const push = (url: string | undefined, label: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ src: url, label });
    };
    if (entry) {
      push(entry.base, 'story base');
      for (const [k, v] of Object.entries(entry.emotions ?? {})) push(v, `story ${k}`);
      for (const [k, v] of Object.entries(entry.forms ?? {})) push(v, `story ${k}`);
    }
    push(storyPortraitUrl(charId, formId), 'story forma actual');
    return out;
  }, [entry, charId, formId]);

  if (urls.length === 0) return <span className="dev-hint">Sin retratos de story mapeados para {charId}</span>;
  return (
    <div className="dev-story-portraits">
      {urls.map((u: { src: string; label: string }) => <AssetCell key={u.label} label={u.label} src={u.src} small />)}
    </div>
  );
}

export { characterName };

// ═══════════════════════════════════════════════════════════════════════
// CharacterPhysicalMap — F-MAP wiring (P0.2)
// ─────────────────────────────────────────────────────────────────────────
// Expone el registry characterFrameMap para UNA forma, organizado como:
// PHYSICAL (ROM + canonical + manifest + classification) / SEMANTIC (rol +
// familia física) / CONSUMERS (cartas compatibles) / PROVENANCE (evidence).
// Sin datos inventados: todo sale de characterFrameMap y CARDS.
// ═══════════════════════════════════════════════════════════════════════

function romSummary(b: CharacterFrameBinding): string {
  if (!b.rom) return '—';
  const r = b.rom;
  return `res $${r.animationResource.toString(16).padStart(2, '0')} · seq ${r.sequenceIndex} · fr ${r.frameIndex} · vf $${r.visualFrameId.toString(16).padStart(2, '0')}`;
}

function romIdentitySummary(b: CharacterFrameBinding): string {
  if (b.romIdentity) return b.romIdentity;
  if (b.rom) return romSummary(b);
  return '—';
}

function romCanonicalSummary(b: CharacterFrameBinding): string {
  if (b.romPhysicalId) return b.romPhysicalId;
  if (b.romPhysicalSourceIds.length > 0) return `${b.romPhysicalSourceIds.length} physical sources`;
  if (b.canonicalId) return b.canonicalId;
  return '—';
}

function dominantMapping(arr: CharacterFrameBinding[]): FrameMapping {
  const order: FrameMapping[] = ['ROM_EXACT', 'ROM_PHASE', 'CANONICAL_PHYSICAL', 'SHARED_PHYSICAL', 'COMPOSITE', 'REFERENCE_FX', 'FALLBACK', 'UNRESOLVED'];
  for (const m of order) if (arr.some(b => b.mapping === m)) return m;
  return 'UNRESOLVED';
}

function groupBindingsByRole(bindings: CharacterFrameBinding[]): Array<{ role: string; bindings: CharacterFrameBinding[]; classification: FrameMapping }> {
  const map = new Map<string, CharacterFrameBinding[]>();
  for (const b of bindings) {
    const arr = map.get(b.semanticRole) ?? [];
    arr.push(b);
    map.set(b.semanticRole, arr);
  }
  return [...map.entries()].map(([role, arr]) => ({ role, bindings: arr, classification: dominantMapping(arr) }));
}

export function CharacterPhysicalMap({ formId }: { formId: string }) {
  const bindings = useMemo(() => bindingsForForm(formId), [formId]);
  const form = getForm(formId);
  const character = form?.character ?? '';
  const groups = useMemo(() => groupBindingsByRole(bindings), [bindings]);
  const [open, setOpen] = useState<string | null>(null);

  const byMapping = useMemo(() => {
    const acc: Record<FrameMapping, number> = { ROM_EXACT: 0, ROM_PHASE: 0, CANONICAL_PHYSICAL: 0, SHARED_PHYSICAL: 0, COMPOSITE: 0, FALLBACK: 0, REFERENCE_FX: 0, UNRESOLVED: 0 };
    for (const b of bindings) acc[b.mapping]++;
    return acc;
  }, [bindings]);

  const consumers = useMemo(() => {
    const list = cardsForCharacter(character);
    const byType = new Map<CardType, CardDef[]>();
    for (const c of list) {
      const arr = byType.get(c.type) ?? [];
      arr.push(c);
      byType.set(c.type, arr);
    }
    return { list, byType };
  }, [character]);

  return (
    <section className="dev-char-block">
      <div className="dev-fmap-head">
        <h3 className="dev-char-block-title">
          Physical Map
          <span className="dev-sheets-count">{bindings.length} bindings · {groups.length} roles</span>
        </h3>
        <div className="dev-fmap-summary">
          {(Object.keys(MAPPING_LABEL) as FrameMapping[]).map(m => (
            <span key={m} className={`dev-tag dev-fmap-${MAPPING_TONE[m]}`}>{MAPPING_LABEL[m]}: {byMapping[m]}</span>
          ))}
        </div>
      </div>

      {bindings.length === 0 ? (
        <div className="dev-hint">Sin dir animado para {formId} — no hay bindings físicos.</div>
      ) : (
        <div className="dev-fmap-table">
          <div className="dev-fmap-row dev-fmap-thead">
            <span>Semantic role</span><span>Classification</span><span>ROM identity</span><span>Canonical</span><span>Frames</span>
          </div>
          {groups.map(g => {
            const first = g.bindings[0];
            const identityCount = g.bindings.filter(b => b.romIdentity).length;
            const physicalCount = g.bindings.filter(b => b.romPhysicalId || b.romPhysicalSourceIds.length > 0).length;
            const isOpen = open === g.role;
            return (
              <div key={g.role} className="dev-fmap-group">
                <button className={`dev-fmap-row ${isOpen ? 'open' : ''}`} onClick={() => setOpen(isOpen ? null : g.role)}>
                  <span className="dev-fmap-role">
                    <code>{g.role}</code>
                    {first?.physicalFamily && first.physicalFamily !== g.role && (
                      <small className="dev-fmap-family">phys: {first.physicalFamily}</small>
                    )}
                  </span>
                  <span className={`dev-tag dev-fmap-${MAPPING_TONE[g.classification]}`}>{MAPPING_LABEL[g.classification]}</span>
                  <span className="dev-fmap-rom">
                    {identityCount > 0 ? <code>{romIdentitySummary(first)}</code> : <span className="dev-hint">—</span>}
                    {identityCount > 1 && <small>+{identityCount - 1}</small>}
                  </span>
                  <span className="dev-fmap-canon">
                    {physicalCount > 0 ? <code>{romCanonicalSummary(first)}</code> : <span className="dev-hint">—</span>}
                    {physicalCount > 1 && <small>+{physicalCount - 1}</small>}
                  </span>
                  <span className="dev-fmap-count">{g.bindings.length}</span>
                </button>
                {isOpen && (
                  <div className="dev-fmap-detail">
                    {g.bindings.map(b => (
                      <div key={`${b.manifestIndex}:${b.file}`} className="dev-fmap-binding">
                        <div className="dev-fmap-binding-head">
                          <code className="dev-fmap-file">{b.file}</code>
                          <span className={`dev-tag dev-fmap-${MAPPING_TONE[b.mapping]}`}>{MAPPING_LABEL[b.mapping]}</span>
                          {b.sharedForm && <span className="dev-tag">RUNTIME_SHARED</span>}
                          {b.sharedFile && <span className="dev-tag">file-shared</span>}
                        </div>
                        <div className="dev-fmap-binding-grid">
                          <div><strong>ROM</strong> {romSummary(b)}</div>
                          <div><strong>ROM identity</strong> {b.romIdentity ?? '—'}</div>
                          <div><strong>duration</strong> {b.rom ? `${b.rom.durationTicks}t` : '—'}</div>
                          <div><strong>offset</strong> {b.rom ? `x ${b.rom.offsetX} · y ${b.rom.offsetY}` : '—'}</div>
                          <div><strong>physicalId</strong> {b.romPhysicalId ?? '—'}</div>
                          <div><strong>physical sources</strong> {b.romPhysicalSourceIds.length > 0 ? b.romPhysicalSourceIds.join(', ') : '—'}</div>
                          <div><strong>canonical</strong> {b.canonicalId ?? '—'}{b.canonicalRelation ? ` (${RELATION_LABEL[b.canonicalRelation] ?? b.canonicalRelation})` : ''}</div>
                          <div><strong>phys family</strong> {b.physicalFamily ?? '—'}</div>
                          <div><strong>size</strong> {b.w}×{b.h}</div>
                        </div>
                        {b.evidence.length > 0 && (
                          <ul className="dev-fmap-evidence">{b.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h3 className="dev-char-block-title">Consumers <span className="dev-sheets-count">{consumers.list.length} cards</span></h3>
      {consumers.list.length === 0 ? (
        <div className="dev-hint">Sin cartas compatibles con {character || formId}.</div>
      ) : (
        <div className="dev-fmap-consumers">
          {[...consumers.byType.entries()].map(([type, cards]) => (
            <div key={type} className="dev-fmap-consumer-group">
              <span className="dev-fmap-consumer-type" style={{ background: CARD_COLORS[type] }}>{type}</span>
              <div className="dev-fmap-consumer-cards">
                {cards.map(c => (
                  <span key={c.id} className="dev-tag" title={c.effect}>{c.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

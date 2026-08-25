// ROM Display Lab 2.1 — tab FIGHTERS (provenance correction).
// Dos submodos SIN catalog-v9 (V9 obsoleto como autoridad):
//  - MANIFEST POSE: mundo semántico del remake (pose → PNG canónico → runtime).
//    La columna ROM PHYSICAL solo aparece con mapping demostrado
//    (PHYSICAL_FRAME_RECONCILIATION: ROM frame ↔ manifest file).
//  - ROM ANIMATION: mundo físico ROM (AnimationResource → sequence → frame
//    [metasprite, durationTicks, offsetY, offsetX]) con playback ROM real
//    (59.7275 Hz ≈ 16.7427 ms/tick) aplicando offsets.
// Evidencia estática ROM (research-v3, ROM_STATIC_VERIFIED):
//    actorVisualProfileKey · graphicsBank = $31 + key · palette Bank30:$6E00+key*8
// PENDING_ROM_TRACE SOLO para: semantic slot binding / ACTOR_HOME /
//    TARGET_HOME / CONTACT_POINT / semantic absolute anchors.
import { useEffect, useMemo, useState } from 'react';
import { MANIFEST_FRAME_INDEX, type ManifestFrameRecord } from '../../data/generated/manifestFrameIndex.generated';
import { ANIMATION_RESOURCE_CATALOG, animationResourceById } from '../../battle/animationResources';
import { PHYSICAL_FRAME_RECONCILIATION } from '../../battle/physicalFrameReconciliation';
import { ROM_CGB_PALETTE_TABLE } from '../../data/generated/romCgbPaletteTable.generated';
import { FieldRow, Hex, MappingPill, Mono, PixelCanvas, SectionTitle, ZoomControls, useImage, type MappingStatus, type SpriteBackground } from './common';

interface PoseInfo { pose: string; frames: ManifestFrameRecord[]; fps: number; loop: boolean; }
interface PhysicalManifestFrame {
  file: string;
  rawCanvasFile?: string;
  physicalId: string;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  rawOffsetX: number;
  rawOffsetY: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  originInTrimX?: number;
  originInTrimY?: number;
}

interface PhysicalManifestSequence {
  resource: number;
  sequence: number;
  frames: PhysicalManifestFrame[];
}

interface PhysicalManifest {
  source: string;
  schemaVersion: number;
  physicalRendererSchema?: number;
  offsetEncoding: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
  sequences: Record<string, PhysicalManifestSequence>;
}

interface PhysicalProvenanceFrame {
  physicalId: string;
  rawCanvasFile?: string;
  width: number;
  height: number;
  originX: number;
  originY: number;
  originInTrimX?: number;
  originInTrimY?: number;
  trim?: { x: number; y: number; w: number; h: number; originInTrim?: { x: number; y: number } };
  palette?: { raw?: number[]; bgr555: string[]; colors: string[]; transparentIndex?: number; color0Transparent?: boolean; displayTransform?: string };
  metasprite?: { pieces?: unknown[]; provenance?: Record<string, number> };
  graphics?: { blockCount?: number; provenance?: Record<string, number> };
}

interface PhysicalProvenance {
  source: string;
  formProfile: { actorVisualProfileKey: number; graphicsBank: number; paletteRaw: string[]; paletteAddress: string };
  frames: PhysicalProvenanceFrame[];
}

const FORM_IDS = Array.from(new Set(MANIFEST_FRAME_INDEX.map((r) => r.formId))).sort();
const RESOURCE_IDS = ANIMATION_RESOURCE_CATALOG.map((e) => e.resourceId).sort((a, b) => a - b);
const TICK_MS = 1000 / 59.7275; // ≈ 16.7427 ms/tick — reloj GBC real

type SubMode = 'manifest' | 'rom';

/** Mapping demostrado ROM frame ↔ manifest file (sin V9). */
function mappingForFile(file: string | null): { status: MappingStatus; detail: string } {
  if (!file) return { status: 'UNRESOLVED', detail: 'sin frame' };
  for (const res of PHYSICAL_FRAME_RECONCILIATION) {
    for (const f of res.frames) {
      if (f.assetMapping.sampleFiles.includes(file)) {
        return { status: f.assetMapping.status as MappingStatus, detail: `${res.resourceHex} seq${f.sequenceIndex} F${f.frameIndex} · ${f.assetMapping.reason}` };
      }
    }
  }
  return { status: 'UNRESOLVED', detail: 'sin correspondencia física demostrada en PHYSICAL_FRAME_RECONCILIATION' };
}

function paletteForKey(key: number) {
  return ROM_CGB_PALETTE_TABLE.find((p) => p.index === key) ?? null;
}

export function FightersTab({ initialForm, onFormChange }: { initialForm: string | null; onFormChange?: (form: string) => void }) {
  const [mode, setMode] = useState<SubMode>('rom');
  // ── MANIFEST POSE ──
  const [formId, setFormId] = useState<string>(initialForm && FORM_IDS.includes(initialForm) ? initialForm : FORM_IDS[0] ?? '');
  const [poses, setPoses] = useState<PoseInfo[]>([]);
  const [pose, setPose] = useState<string>('');
  const [frameIdx, setFrameIdx] = useState(0);
  const [playingRemake, setPlayingRemake] = useState(false);
  const [loop, setLoop] = useState(true);
  // ── ROM ANIMATION ──
  const [resourceId, setResourceId] = useState<number>(RESOURCE_IDS[0] ?? 3);
  const [seqIdx, setSeqIdx] = useState(0);
  const [romFrameIdx, setRomFrameIdx] = useState(0);
  const [playingRom, setPlayingRom] = useState(false);
  const [paletteKey, setPaletteKey] = useState<number>(ROM_CGB_PALETTE_TABLE[0]?.index ?? 0);
  const [zoom, setZoom] = useState(3);
  const [background, setBackground] = useState<SpriteBackground>('checker');
  const [grid, setGrid] = useState(false);
  const [physicalManifest, setPhysicalManifest] = useState<PhysicalManifest | null>(null);
  const [physicalProvenance, setPhysicalProvenance] = useState<PhysicalProvenance | null>(null);
  const [physicalError, setPhysicalError] = useState<string | null>(null);

  // carga del manifest del form (poses reales + fps)
  useEffect(() => {
    let alive = true;
    setPoses([]);
    setPose('');
    fetch(`/assets/sprites/${formId}/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!alive || !m) return;
        const list: PoseInfo[] = Object.entries(m as Record<string, { frame_count: number; fps: number; loop: boolean; frames: { file: string; w: number; h: number }[] }>)
          .map(([name, info]) => ({
            pose: name,
            fps: info.fps ?? 4,
            loop: info.loop ?? true,
            frames: info.frames.map((f, i) => ({ formId, dir: formId, pose: name, index: i, file: f.file, name: f.file.replace(/\.png$/i, ''), w: f.w, h: f.h })),
          }));
        if (alive) {
          setPoses(list);
          if (list.length > 0) setPose(list[0].pose);
        }
      })
      .catch(() => { /* form sin manifest */ });
    return () => { alive = false; };
  }, [formId]);

  useEffect(() => {
    let alive = true;
    setPhysicalManifest(null);
    setPhysicalProvenance(null);
    setPhysicalError(null);
    Promise.all([
      fetch(`/assets/sprites/${formId}/rom-physical.manifest.json`, { cache: 'no-store' }),
      fetch(`/assets/sprites/${formId}/provenance.json`, { cache: 'no-store' }),
    ]).then(async ([manifestResponse, provenanceResponse]) => {
      if (!manifestResponse.ok || !provenanceResponse.ok) {
        throw new Error(`ROM_PHYSICAL no disponible para ${formId} (${manifestResponse.status}/${provenanceResponse.status})`);
      }
      const manifest = await manifestResponse.json() as PhysicalManifest;
      const provenance = await provenanceResponse.json() as PhysicalProvenance;
      if (!alive) return;
      setPhysicalManifest(manifest);
      setPhysicalProvenance(provenance);
      const firstSequence = Object.values(manifest.sequences).sort((a, b) => a.resource - b.resource || a.sequence - b.sequence)[0];
      if (firstSequence) {
        setResourceId(firstSequence.resource);
        setSeqIdx(firstSequence.sequence);
        setRomFrameIdx(0);
      }
    }).catch(error => {
      if (alive) setPhysicalError(error instanceof Error ? error.message : String(error));
    });
    return () => { alive = false; };
  }, [formId]);

  const poseInfo = poses.find((p) => p.pose === pose) ?? null;
  const frame: ManifestFrameRecord | null = poseInfo?.frames[frameIdx] ?? null;
  const imgUrl = frame ? `/assets/sprites/${frame.dir}/${frame.file}` : null;
  const img = useImage(imgUrl);

  useEffect(() => { setFrameIdx(0); }, [pose, formId]);

  // playback REMAKE (manifest fps)
  useEffect(() => {
    if (!playingRemake || !poseInfo || poseInfo.frames.length === 0) return;
    const ms = Math.max(40, Math.round(1000 / poseInfo.fps));
    const id = setInterval(() => {
      setFrameIdx((i) => {
        if (i + 1 < poseInfo.frames.length) return i + 1;
        if (loop) return 0;
        setPlayingRemake(false);
        return i;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playingRemake, poseInfo, loop]);

  const selectForm = (f: string) => {
    setFormId(f);
    onFormChange?.(f);
  };

  const mapping = mappingForFile(frame?.file ?? null);

  // ── ROM ANIMATION: resource del catálogo (sequences decodificadas) ──
  const romResource = useMemo(() => animationResourceById(resourceId), [resourceId]);
  const romSeq = romResource?.sequences[seqIdx] ?? null;
  const romFrame = romSeq?.frames[romFrameIdx] ?? null;
  const physicalSequences = useMemo(() => physicalManifest
    ? Object.values(physicalManifest.sequences).sort((a, b) => a.resource - b.resource || a.sequence - b.sequence)
    : [], [physicalManifest]);
  const physicalResourceIds = useMemo(() => [...new Set(physicalSequences.map(seq => seq.resource))], [physicalSequences]);
  const physicalSeq = useMemo(() => physicalSequences.find(seq => seq.resource === resourceId && seq.sequence === seqIdx) ?? null, [physicalSequences, resourceId, seqIdx]);
  const physicalFrame = physicalSeq?.frames[romFrameIdx] ?? null;
  const physicalFrameMeta = useMemo(() => physicalProvenance?.frames.find(frame => frame.physicalId === physicalFrame?.physicalId) ?? null, [physicalProvenance, physicalFrame]);
  const romFrameFile = physicalFrame?.file ?? null;
  const rawCanvasFile = physicalFrameMeta?.rawCanvasFile ?? physicalFrame?.rawCanvasFile ?? null;
  const romImg = useImage(romFrameFile ? `/assets/sprites/${formId}/${romFrameFile}` : null);
  const rawCanvasImg = useImage(rawCanvasFile ? `/assets/sprites/${formId}/${rawCanvasFile}` : null);
  const romMapping = physicalFrame
    ? { status: 'EXACT' as MappingStatus, detail: `${physicalFrame.physicalId} · ${romFrameFile} · ROM_PHYSICAL_FIGHTERS` }
    : { status: 'UNRESOLVED' as MappingStatus, detail: physicalError ?? 'sin PNG físico ROM para este resource/sequence/frame' };

  // playback ROM: durationTicks reales (16.7427 ms/tick)
  useEffect(() => {
    const playbackFrames = physicalSeq?.frames ?? romSeq?.frames ?? [];
    if (!playingRom || playbackFrames.length === 0) return;
    const f = playbackFrames[romFrameIdx];
    const ms = Math.max(16, Math.round((f?.durationTicks ?? 8) * TICK_MS));
    const id = setTimeout(() => {
      setRomFrameIdx((i) => {
        if (i + 1 < playbackFrames.length) return i + 1;
        setPlayingRom(false);
        return i;
      });
    }, ms);
    return () => clearTimeout(id);
  }, [playingRom, romSeq, physicalSeq, romFrameIdx]);

  const pal = paletteForKey(paletteKey);
  const playbackFrames = physicalSeq?.frames ?? romSeq?.frames ?? [];
  const romFrameTotalTicks = playbackFrames.reduce((s, f) => s + f.durationTicks, 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#cfe3ff' }}>VIEW</label>
        {(['manifest', 'rom'] as SubMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            style={{ background: mode === m ? '#2a4a6a' : '#141c2a', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
            {m === 'manifest' ? 'MANIFEST POSE' : 'ROM ANIMATION'}
          </button>
        ))}
      </div>

      {mode === 'manifest' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 12px 8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#cfe3ff' }}>CHARACTER / FORM</label>
            <select value={formId} onChange={(e) => selectForm(e.target.value)} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3, maxWidth: 260 }}>
              {FORM_IDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <label style={{ fontSize: 13, color: '#cfe3ff' }}>POSE</label>
            <select value={pose} onChange={(e) => setPose(e.target.value)} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
              {poses.map((p) => <option key={p.pose} value={p.pose}>{p.pose} ({p.frames.length}f @{p.fps}fps{!p.loop ? ' · no-loop' : ''})</option>)}
            </select>
            <span style={{ fontSize: 12, opacity: 0.7 }}>mundo semántico del remake — la pose NO es necesariamente una secuencia ROM</span>
          </div>
          {!poseInfo && <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>Sin manifest para {formId} (o cargando…).</div>}
          {poseInfo && (
            <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
              <div>
                <SectionTitle>CANONICAL ASSET</SectionTitle>
                <PixelCanvas img={img} zoom={zoom} background={background} grid={grid} showBaseline />
                <ZoomControls zoom={zoom} setZoom={setZoom} background={background} setBackground={setBackground} grid={grid} setGrid={setGrid} />
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {frame ? <Mono>{frame.file}</Mono> : '—'} · {frame?.w}×{frame?.h}px
                </div>
              </div>
              <div style={{ minWidth: 300, maxWidth: 440 }}>
                <SectionTitle>ROM PHYSICAL (solo mapping demostrado)</SectionTitle>
                <FieldRow label="frame ROM↔manifest" value={<Mono>{mapping.detail}</Mono>} status={mapping.status} />
                <FieldRow label="visualProfileKey" value={<Mono>Bank11 character/form record byte+1 (research-v3 §3)</Mono>} status="EXACT" />
                <FieldRow label="graphicsBank" value={<Mono>$31 + visualProfileKey (Bank00:$367F)</Mono>} status="EXACT" />
                <FieldRow label="palette profile" value={<Mono>Bank30:$6E00 + key×8 (research-v3 §4)</Mono>} status="EXACT" />
                <FieldRow label="AnimationResource" value={<Mono dim>por técnica — ver ROM ANIMATION / ACTIONS</Mono>} />
                <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, borderTop: '1px solid #2a3a4a', paddingTop: 6 }}>
                  V9 (catalog-v9) eliminado como autoridad. La correspondencia física ROM↔manifest se calcula con
                  PHYSICAL_FRAME_RECONCILIATION; sin evidencia → UNRESOLVED, nunca EXACT.
                </div>
              </div>
              <div style={{ minWidth: 260 }}>
                <SectionTitle>RUNTIME PIXI (REMAKE playback)</SectionTitle>
                <FieldRow label="pose" value={<Mono>{pose}</Mono>} status={mapping.status === 'UNRESOLVED' ? 'RUNTIME' : mapping.status} />
                <FieldRow label="timing" value={<Mono>{poseInfo.fps}fps (manifest, REMAKE_CANON)</Mono>} />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setFrameIdx(0); setPlayingRemake(false); }}>|◀</button>
                  <button onClick={() => setFrameIdx((i) => Math.max(0, i - 1))}>◀</button>
                  <button onClick={() => setPlayingRemake((p) => !p)}>{playingRemake ? '❚❚' : '▶ PLAY'}</button>
                  <button onClick={() => setFrameIdx((i) => Math.min(poseInfo.frames.length - 1, i + 1))}>▶</button>
                  <label style={{ fontSize: 12 }}><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> LOOP</label>
                </div>
                <div style={{ marginTop: 6 }}>
                  <input type="range" min={0} max={Math.max(0, poseInfo.frames.length - 1)} value={Math.min(frameIdx, poseInfo.frames.length - 1)}
                    onChange={(e) => { setFrameIdx(Number(e.target.value)); setPlayingRemake(false); }} style={{ width: 220 }} />
                  <span style={{ fontSize: 12, marginLeft: 8 }}><Mono>F{Math.min(frameIdx, poseInfo.frames.length - 1)}/{poseInfo.frames.length - 1}</Mono></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'rom' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 12px 8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#cfe3ff' }}>ANIMATION RESOURCE</label>
            <select value={resourceId} onChange={(e) => { setResourceId(Number(e.target.value)); setSeqIdx(0); setRomFrameIdx(0); setPlayingRom(false); }}
              style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
              {(physicalResourceIds.length ? physicalResourceIds : RESOURCE_IDS).map((id) => {
                const e = animationResourceById(id);
                return <option key={id} value={id}>${id.toString(16).padStart(2, '0')} · {e?.sequenceCount} seq · {e?.physicalFrameCount} frames · {e?.totalTicks}t</option>;
              })}
            </select>
            {(physicalSequences.length > 0 || romResource) && (
              <select value={seqIdx} onChange={(e) => { setSeqIdx(Number(e.target.value)); setRomFrameIdx(0); setPlayingRom(false); }}
                style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
                {(physicalSequences.filter(seq => seq.resource === resourceId).length
                  ? physicalSequences.filter(seq => seq.resource === resourceId)
                  : romResource?.sequences.map((s, i) => ({ resource: resourceId, sequence: i, frames: s.frames as unknown as PhysicalManifestFrame[] })) ?? []
                ).map((s) => <option key={s.sequence} value={s.sequence}>sequence {s.sequence} · {s.frames.length}f</option>)}
              </select>
            )}
            <label style={{ fontSize: 13, color: '#cfe3ff' }}>PALETTE KEY</label>
            <select value={paletteKey} onChange={(e) => setPaletteKey(Number(e.target.value))} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
              {ROM_CGB_PALETTE_TABLE.map((p) => <option key={p.index} value={p.index}>{p.indexHex} · {p.cpuAddressHex}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
            <div>
              <SectionTitle>TRIMMED PHYSICAL (ROM tiles)</SectionTitle>
              <PixelCanvas img={romImg} zoom={zoom} background={background} grid={grid} showBaseline />
              <ZoomControls zoom={zoom} setZoom={setZoom} background={background} setBackground={setBackground} grid={grid} setGrid={setGrid} />
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                {romFrameFile ? <Mono>{romFrameFile}</Mono> : <Mono dim>{physicalError ?? 'sin PNG físico para este frame'}</Mono>}
              </div>
              {romFrameFile && (
                <div style={{ marginTop: 12 }}>
                  <SectionTitle>CANONICAL DISPLAY (right-facing preview)</SectionTitle>
                  <div className="dev-rom-display-preview">
                    <img className="dev-rom-facing-right" src={`/assets/sprites/${formId}/${romFrameFile}`} alt="right-facing physical display preview" />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                    The PNG remains ROM raw/trimmed; this preview applies runtime facing only for display.
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <SectionTitle>RAW CANVAS / ORIGIN</SectionTitle>
                <PixelCanvas img={rawCanvasImg} zoom={1} background="transparent" grid={false} maxWidth={320} />
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {rawCanvasFile ? <Mono>{rawCanvasFile}</Mono> : <Mono dim>sin raw canvas exportado</Mono>}
                </div>
              </div>
            </div>
            <div style={{ minWidth: 320 }}>
              <SectionTitle>ROM PHYSICAL (ROM_STATIC_VERIFIED)</SectionTitle>
              {(romFrame || physicalFrame) && (
                <>
                  <FieldRow label="physicalId" value={<Mono>{physicalFrame?.physicalId ?? '—'}</Mono>} status={physicalFrame ? 'EXACT' : 'UNRESOLVED'} />
                  <FieldRow label="visualFrameId" value={<Mono>{(physicalFrame?.visualFrameId ?? romFrame?.visualFrameId ?? 0)} (0x{(physicalFrame?.visualFrameId ?? romFrame?.visualFrameId ?? 0).toString(16).padStart(2, '0')})</Mono>} status="EXACT" />
                  <FieldRow label="durationTicks" value={<Mono>{(physicalFrame?.durationTicks ?? romFrame?.durationTicks ?? 0)}t ≈ {((physicalFrame?.durationTicks ?? romFrame?.durationTicks ?? 0) * TICK_MS).toFixed(1)}ms</Mono>} status="EXACT" />
                  <FieldRow label="offsetY / offsetX" value={<Mono>{physicalFrame?.offsetY ?? romFrame?.offsetY ?? '—'} / {physicalFrame?.offsetX ?? romFrame?.offsetX ?? '—'}</Mono>} status="EXACT" />
                  <FieldRow label="raw offsets" value={<Mono>dy {physicalFrame?.rawOffsetY ?? romFrame?.raw?.[2] ?? '—'} · dx {physicalFrame?.rawOffsetX ?? romFrame?.raw?.[3] ?? '—'}</Mono>} />
                </>
              )}
              <FieldRow label="sequence" value={<Mono>{physicalSeq ? `${physicalSeq.sequence} · ${physicalSeq.frames.length}f · ${physicalSeq.frames.reduce((sum, frame) => sum + frame.durationTicks, 0)}t total` : romSeq ? `${seqIdx} · ${romSeq.frames.length}f · ${romSeq.totalTicks}t total` : '—'}</Mono>} status={physicalSeq ? 'EXACT' : 'UNRESOLVED'} />
              <FieldRow label="profile / graphics" value={<Mono>{physicalManifest ? `p$${physicalManifest.actorVisualProfileKey.toString(16).padStart(2, '0')} · bank $${physicalManifest.graphicsBank.toString(16).padStart(2, '0')}` : '$31 + visualProfileKey'}</Mono>} status="EXACT" />
              {physicalFrameMeta && (
                <>
                  <FieldRow label="trim bounds" value={<Mono>{physicalFrameMeta.trim ? `x ${physicalFrameMeta.trim.x} y ${physicalFrameMeta.trim.y} w ${physicalFrameMeta.trim.w} h ${physicalFrameMeta.trim.h}` : `${physicalFrameMeta.originX},${physicalFrameMeta.originY} ${physicalFrameMeta.width}x${physicalFrameMeta.height}`}</Mono>} status="EXACT" />
                  <FieldRow label="originInTrim" value={<Mono>{physicalFrameMeta.originInTrimX ?? physicalFrameMeta.trim?.originInTrim?.x ?? '—'}, {physicalFrameMeta.originInTrimY ?? physicalFrameMeta.trim?.originInTrim?.y ?? '—'}</Mono>} status="EXACT" />
                  <FieldRow label="pieces / blocks" value={<Mono>{physicalFrameMeta.metasprite?.pieces?.length ?? '—'} pieces · {physicalFrameMeta.graphics?.blockCount ?? '—'} blocks</Mono>} status="EXACT" />
                </>
              )}
              <FieldRow label="palette (fighter)" value={(physicalFrameMeta?.palette ?? pal) ? (
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {(physicalFrameMeta?.palette?.colors ?? pal?.hexRaw ?? []).map((c, i) => <span key={i} style={{ width: 16, height: 16, background: i === 0 ? 'transparent' : c, border: '1px solid #444', borderRadius: 2 }} title={i === 0 ? `${c} · OBJ transparent index` : c} />)}
                  <Mono dim>{(physicalFrameMeta?.palette?.bgr555 ?? pal?.bgr555Hex ?? []).join(' ')} · color0 alpha</Mono>
                </span>
              ) : <Mono dim>—</Mono>} status="EXACT" />
              <FieldRow label="frame↔manifest" value={<Mono>{romMapping.detail}</Mono>} status={romMapping.status} />
              <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
                Esta vista lee ROM_PHYSICAL_FIGHTERS: trimmed PNG para assets y raw canvas para verificar origen/piezas. No usa V9 ni el crop del manifest como geometría ROM.
              </div>
            </div>
            <div style={{ minWidth: 260 }}>
              <SectionTitle>ROM PLAYBACK (durationTicks reales)</SectionTitle>
              <FieldRow label="clock" value={<Mono>59.7275 Hz ≈ 16.7427 ms/tick</Mono>} />
              <FieldRow label="sequence total" value={<Mono>{romFrameTotalTicks}t ≈ {(romFrameTotalTicks * TICK_MS / 1000).toFixed(2)}s</Mono>} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setRomFrameIdx(0); setPlayingRom(false); }}>|◀</button>
                <button onClick={() => setPlayingRom((p) => !p)}>{playingRom ? '❚❚' : '▶ PLAY (ROM)'}</button>
                  <span style={{ fontSize: 12 }}><Mono>F{romFrameIdx}/{Math.max(0, playbackFrames.length - 1)}</Mono></span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
                {playbackFrames.map((f, i) => (
                  <div key={i} title={`F${i}: ${f.durationTicks}t (${(f.durationTicks * TICK_MS).toFixed(0)}ms) dy=${f.offsetY} dx=${f.offsetX}`}
                    onClick={() => { setRomFrameIdx(i); setPlayingRom(false); }}
                    style={{ width: 14, background: i === romFrameIdx ? '#7CFC00' : '#2a4a6a', height: Math.max(6, Math.min(40, f.durationTicks * 2)), cursor: 'pointer', borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                {playbackFrames.map((f, i) => (
                  <span key={i} style={{ marginRight: 8 }}><Mono>F{i} {f.durationTicks}t</Mono></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

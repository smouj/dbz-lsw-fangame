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
import { ROM_FIGHTER_PALETTES } from '../../data/generated/romFighterPalettes.generated';
import { FieldRow, Hex, MappingPill, Mono, PixelCanvas, SectionTitle, ZoomControls, useImage, type MappingStatus, type SpriteBackground } from './common';

interface PoseInfo { pose: string; frames: ManifestFrameRecord[]; fps: number; loop: boolean; }

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
  return ROM_FIGHTER_PALETTES.find((p) => p.key === key) ?? null;
}

export function FightersTab({ initialForm, onFormChange }: { initialForm: string | null; onFormChange?: (form: string) => void }) {
  const [mode, setMode] = useState<SubMode>('manifest');
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
  const [paletteKey, setPaletteKey] = useState<number>(ROM_FIGHTER_PALETTES[0]?.key ?? 2);
  const [zoom, setZoom] = useState(3);
  const [background, setBackground] = useState<SpriteBackground>('checker');
  const [grid, setGrid] = useState(false);

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
  const romFrameFile = useMemo(() => {
    if (!romFrame || !romResource) return null;
    // mapping demostrado del frame físico → manifest file
    for (const res of PHYSICAL_FRAME_RECONCILIATION) {
      if (res.resourceId !== resourceId) continue;
      const f = res.frames.find((x) => x.sequenceIndex === seqIdx && x.frameIndex === romFrameIdx);
      if (f?.assetMapping.sampleFiles[0]) return f.assetMapping.sampleFiles[0];
    }
    return null;
  }, [romResource, resourceId, seqIdx, romFrameIdx, romFrame]);
  const romImg = useImage(romFrameFile ? `/assets/sprites/${romFrameFile.split('/')[0]}/${romFrameFile.split('/').pop()}` : null);
  const romMapping = romFrameFile ? mappingForFile(romFrameFile) : { status: 'UNRESOLVED' as MappingStatus, detail: 'sin asset mapeado — frame físico sin correspondencia demostrada' };

  // playback ROM: durationTicks reales (16.7427 ms/tick)
  useEffect(() => {
    if (!playingRom || !romSeq || romSeq.frames.length === 0) return;
    const f = romSeq.frames[romFrameIdx];
    const ms = Math.max(16, Math.round((f?.durationTicks ?? 8) * TICK_MS));
    const id = setTimeout(() => {
      setRomFrameIdx((i) => {
        if (i + 1 < romSeq.frames.length) return i + 1;
        setPlayingRom(false);
        return i;
      });
    }, ms);
    return () => clearTimeout(id);
  }, [playingRom, romSeq, romFrameIdx]);

  const pal = paletteForKey(paletteKey);
  const romFrameTotalTicks = romSeq ? romSeq.frames.reduce((s, f) => s + f.durationTicks, 0) : 0;

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
              {RESOURCE_IDS.map((id) => {
                const e = animationResourceById(id);
                return <option key={id} value={id}>${id.toString(16).padStart(2, '0')} · {e?.sequenceCount} seq · {e?.physicalFrameCount} frames · {e?.totalTicks}t</option>;
              })}
            </select>
            {romResource && (
              <select value={seqIdx} onChange={(e) => { setSeqIdx(Number(e.target.value)); setRomFrameIdx(0); setPlayingRom(false); }}
                style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
                {romResource.sequences.map((s, i) => <option key={i} value={i}>sequence {i} · {s.frames.length}f · {s.totalTicks}t</option>)}
              </select>
            )}
            <label style={{ fontSize: 13, color: '#cfe3ff' }}>PALETTE KEY</label>
            <select value={paletteKey} onChange={(e) => setPaletteKey(Number(e.target.value))} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3 }}>
              {ROM_FIGHTER_PALETTES.map((p) => <option key={p.key} value={p.key}>0x{p.key.toString(16).padStart(2, '0')}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
            <div>
              <SectionTitle>ROM FRAME (asset mapeado + timing ROM)</SectionTitle>
              <PixelCanvas img={romImg} zoom={zoom} background={background} grid={grid} showBaseline />
              <ZoomControls zoom={zoom} setZoom={setZoom} background={background} setBackground={setBackground} grid={grid} setGrid={setGrid} />
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                {romFrameFile ? <Mono>{romFrameFile}</Mono> : <Mono dim>sin asset mapeado para este frame físico</Mono>}
              </div>
            </div>
            <div style={{ minWidth: 320 }}>
              <SectionTitle>ROM PHYSICAL (ROM_STATIC_VERIFIED)</SectionTitle>
              {romFrame && (
                <>
                  <FieldRow label="visualFrameId (metasprite idx)" value={<Mono>{romFrame.visualFrameId} (0x{romFrame.visualFrameId.toString(16).padStart(2, '0')})</Mono>} status="EXACT" />
                  <FieldRow label="durationTicks" value={<Mono>{romFrame.durationTicks}t ≈ {(romFrame.durationTicks * TICK_MS).toFixed(1)}ms</Mono>} status="EXACT" />
                  <FieldRow label="offsetY / offsetX" value={<Mono>{romFrame.offsetY} / {romFrame.offsetX}</Mono>} status="EXACT" />
                  <FieldRow label="raw record" value={<Mono>[{romFrame.raw.join(', ')}]</Mono>} />
                </>
              )}
              <FieldRow label="sequence" value={<Mono>{romSeq ? `${seqIdx} · ${romSeq.frames.length}f · ${romSeq.totalTicks}t total` : '—'}</Mono>} status="EXACT" />
              <FieldRow label="graphicsBank" value={<Mono>$31 + visualProfileKey</Mono>} status="EXACT" />
              <FieldRow label="palette (key)" value={pal ? (
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {pal.colors.map((c, i) => <span key={i} style={{ width: 16, height: 16, background: c, border: '1px solid #444', borderRadius: 2 }} title={c} />)}
                  <Mono dim>{pal.bgr555.join(' ')}</Mono>
                </span>
              ) : <Mono dim>—</Mono>} status="EXACT" />
              <FieldRow label="frame↔manifest" value={<Mono>{romMapping.detail}</Mono>} status={romMapping.status} />
              <div style={{ marginTop: 8, fontSize: 11, opacity: 0.55 }}>
                El sprite físico desde tiles (metasprite → 2bpp → BGR555) está pendiente de reextracción del pipeline v3 (datos no presentes en el repo);
                el frame se muestra con el asset canónico mapeado y el timing/offsets ROM reales.
              </div>
            </div>
            <div style={{ minWidth: 260 }}>
              <SectionTitle>ROM PLAYBACK (durationTicks reales)</SectionTitle>
              <FieldRow label="clock" value={<Mono>59.7275 Hz ≈ 16.7427 ms/tick</Mono>} />
              <FieldRow label="sequence total" value={<Mono>{romFrameTotalTicks}t ≈ {(romFrameTotalTicks * TICK_MS / 1000).toFixed(2)}s</Mono>} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setRomFrameIdx(0); setPlayingRom(false); }}>|◀</button>
                <button onClick={() => setPlayingRom((p) => !p)}>{playingRom ? '❚❚' : '▶ PLAY (ROM)'}</button>
                <span style={{ fontSize: 12 }}><Mono>F{romFrameIdx}/{Math.max(0, (romSeq?.frames.length ?? 1) - 1)}</Mono></span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
                {(romSeq?.frames ?? []).map((f, i) => (
                  <div key={i} title={`F${i}: ${f.durationTicks}t (${(f.durationTicks * TICK_MS).toFixed(0)}ms) dy=${f.offsetY} dx=${f.offsetX}`}
                    onClick={() => { setRomFrameIdx(i); setPlayingRom(false); }}
                    style={{ width: 14, background: i === romFrameIdx ? '#7CFC00' : '#2a4a6a', height: Math.max(6, Math.min(40, f.durationTicks * 2)), cursor: 'pointer', borderRadius: 2 }} />
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                {romSeq?.frames.map((f, i) => (
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

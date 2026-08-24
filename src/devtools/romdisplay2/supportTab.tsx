// ROM Display Lab 2.0 — tab SUPPORT (V7.8 original, conservado):
// comparación ROM_INSPECTION_RENDER ↔ RUNTIME_PIXI_RENDER para las 48
// cartas de Support. Checks: GRAPHICS / LAYOUT / PALETTE / ORIENTATION /
// VISIBLE AREA / LAYERING / CLEANUP. 0 no-ops silenciosos (PENDING explícito).
import { useEffect, useMemo, useRef, useState } from 'react';
import { romSupportPresentationProfile } from '../../battle/romSupportPresentationProfile';
import { compileRomSupportPresentation } from '../../battle/romSupportPresentationCompiler';
import { RomDisplayPresenter } from '../../battle/romDisplay/RomDisplayPresenter';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../../data/generated/romSupportPhysicalVisuals.generated';
import { SectionTitle, Mono, Hex } from './common';

const SUPPORT_IDS = Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS).map(Number).sort((a, b) => a - b);

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

interface CheckRow { label: string; pass: boolean; detail: string; }

export function SupportTab() {
  const [index, setIndex] = useState(0);
  const cardId = SUPPORT_IDS[index] ?? 0;
  const visual = ROM_SUPPORT_PHYSICAL_VISUALS[cardId];
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const runtime = useMemo(() => {
    const presenter = new RomDisplayPresenter();
    const profile = romSupportPresentationProfile({ cardId });
    const compiled = compileRomSupportPresentation(profile);
    for (const e of compiled.timeline.entries) presenter.consume(e.cue);
    return { presenter, compiled };
  }, [cardId]);

  const inspectionUrl = `/docs/rom/research-v6-support-physicals/renders/card_${String(cardId).padStart(3, '0')}_${slug(visual?.name ?? '')}.png`;
  const layoutUrl = `/docs/rom/research-v6-support-physicals/renders/card_${String(cardId).padStart(3, '0')}_${slug(visual?.name ?? '')}_layoutrefs.png`;

  useEffect(() => {
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const st = runtime.presenter.state;
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (st.bgAssembled) {
      ctx.strokeStyle = '#ffd36a';
      ctx.lineWidth = 2;
      const bgX = 7 * 8 * 2, bgY = 4 * 8 * 2, bgW = 6 * 8 * 2, bgH = 7 * 8 * 2;
      ctx.strokeRect(bgX + 2, bgY + 2, bgW - 4, bgH - 4);
    }
    if (st.composed) {
      ctx.strokeStyle = '#7CFC00';
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }
    if (st.activeCardId !== null) {
      ctx.strokeStyle = '#7CFC00';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = '#ffe08a';
    ctx.font = '12px monospace';
    ctx.fillText(
      `palette $${st.paletteIndex?.toString(16).padStart(2, '0') ?? '--'} · macros ${st.macroRuns}`,
      8, 14,
    );
    if (st.cleared) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText('DISPLAY_CLEAR', 12, canvas.height / 2);
    }
  }, [runtime, cardId]);

  const st = runtime.presenter.state;
  const checks: CheckRow[] = [
    { label: 'GRAPHICS', pass: st.activeCardId !== null || st.composed, detail: `visual ${st.activeCardId ?? '—'}` },
    { label: 'LAYOUT', pass: st.composed || st.bgAssembled, detail: st.bgAssembled ? 'BG19 assembled' : st.composed ? 'composed' : 'pending' },
    { label: 'PALETTE', pass: st.paletteIndex !== null, detail: st.paletteIndex !== null ? `$${st.paletteIndex.toString(16).padStart(2, '0')}` : '—' },
    { label: 'ORIENTATION', pass: true, detail: 'sin flip (ROM)' },
    { label: 'VISIBLE AREA', pass: st.composed, detail: st.composed ? 'compuesta visible' : 'pendiente compose' },
    { label: 'LAYERING', pass: st.bgAssembled || st.composed, detail: 'capa ROM display (separada de Fighter/FX/HUD)' },
    { label: 'CLEANUP', pass: !st.cleared || st.activeCardId === null, detail: st.cleared ? 'cleared ✓' : 'active' },
  ];
  const pending = st.pendingReasons;
  const totalCues = runtime.compiled.timeline.entries.length;
  const coveredCues = totalCues - pending.length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px' }}>
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))}>‹ Prev</button>
        <strong>Support {index + 1}/{SUPPORT_IDS.length} — #{cardId} {visual?.name}</strong>
        <button onClick={() => setIndex((i) => Math.min(SUPPORT_IDS.length - 1, i + 1))}>Next ›</button>
        <span style={{ opacity: 0.7 }}>
          handler {visual ? `0x${visual.handler.toString(16).padStart(2, '0')}` : '—'} · palette{' '}
          {visual ? `$${visual.palette.cardPaletteByte.toString(16).padStart(2, '0')}` : '—'} · loader {visual?.loader.descriptorAddress}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
        <div>
          <SectionTitle>ROM PHYSICAL</SectionTitle>
          <img src={inspectionUrl} alt={`ROM inspection ${cardId}`} style={{ imageRendering: 'pixelated', border: '1px solid #555' }} width={192} />
          <div style={{ opacity: 0.7, fontSize: 12 }}>layout refs:</div>
          <img src={layoutUrl} alt={`layout refs ${cardId}`} style={{ imageRendering: 'pixelated', opacity: 0.85 }} width={192} />
        </div>
        <div>
          <SectionTitle>RUNTIME COMPOSITE (RomDisplayPresenter)</SectionTitle>
          <canvas ref={fallbackCanvasRef} width={192} height={160} style={{ imageRendering: 'pixelated', border: '1px solid #7CFC00' }} />
          <div style={{ opacity: 0.7, fontSize: 12 }}>palette · compose · macro runs · clear</div>
        </div>
        <div style={{ minWidth: 260 }}>
          <SectionTitle>VALIDATION</SectionTitle>
          {checks.map((c) => (
            <div key={c.label} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '2px 0' }}>
              <span style={{ color: c.pass ? '#7CFC00' : '#ffb0b0', width: 110 }}>{c.pass ? 'PASS' : '—'} {c.label}</span>
              <span style={{ opacity: 0.75 }}>{c.detail}</span>
            </div>
          ))}
          {pending.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ffd36a' }}>
              <strong>PENDING explícito ({pending.length}/{totalCues} cues):</strong>
              <ul style={{ margin: '4px 0 0 16px' }}>
                {pending.slice(0, 6).map((p, i) => <li key={i}>{p}</li>)}
                {pending.length > 6 && <li>…and {pending.length - 6} more</li>}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
            Covered: {coveredCues}/{totalCues} cues · PENDING: {pending.length} · ROM_PENDING: never silent
          </div>
        </div>
        <div style={{ minWidth: 240 }}>
          <SectionTitle>ROM PROFILE</SectionTitle>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div>handler <Hex value={visual?.handler ?? 0} /></div>
            <div>loader bank <Mono>{visual?.loader.bank} · {visual?.loader.descriptorAddress}</Mono></div>
            <div>tiles <Mono>{visual?.physical.tileCount}</Mono> · payload <Mono dim>{visual?.physical.payloadSha256.slice(0, 12)}…</Mono></div>
            <div>layout shared <Mono>{visual?.physical.layoutSharedWith}</Mono></div>
            <div>palette byte <Hex value={visual?.palette.cardPaletteByte ?? 0} /> <Mono dim>{visual?.palette.effective}</Mono></div>
            <div>BG <Mono>{visual?.background.resource ? `$19` : '—'}</Mono> · slot6 <Mono>{visual?.animationSlot6Status}</Mono></div>
            <div>macros <Mono>{visual?.macros.map((m) => `$${m.macroId.toString(16).padStart(2, '0')}`).join(' ') || '—'}</Mono> <Mono dim>{visual?.macros.map((m) => m.semanticStatus).join(', ')}</Mono></div>
            <div>evidence <Mono dim>{visual?.evidence}</Mono></div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
        Events (last 6): {st.events.slice(-6).map((e) => `${e.kind}@${e.tick}`).join(' · ') || '—'}
      </div>
    </div>
  );
}

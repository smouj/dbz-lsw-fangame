// ROM Display Lab 2.0 — tab ACTIONS.
// CARD + ACTOR + OUTCOME → RomActionExecutionDescriptor →
// RomPresentationProfile (program con ticks ROM reales) → scrubber.
// El runtime Pixi consume vía cardBattlePose (pose real); el presenter
// completo solo existe para SUPPORT — el resto se etiqueta honestamente.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CARDS, getCard, type CardDef } from '../../data/cards';
import { romPresentationProfileForCard } from '../../battle/romPresentationProfiles';
import { romActionExecutionDescriptorForCard } from '../../battle/romActionExecutionDescriptors';
import { cardBattlePose } from '../../battle/cardPoses';
import { romSupportPresentationProfile } from '../../battle/romSupportPresentationProfile';
import { compileRomSupportPresentation } from '../../battle/romSupportPresentationCompiler';
import { RomDisplayPresenter } from '../../battle/romDisplay/RomDisplayPresenter';
import { animationResourceById } from '../../battle/animationResources';
import { FieldRow, Hex, MappingPill, Mono, SectionTitle, type MappingStatus } from './common';

const ALL_CARD_IDS = CARDS.map((c) => c.id).sort((a, b) => a - b);

const STEP_COLORS: Record<string, string> = {
  SCENE_LOAD: '#a0d0ff',
  PRESENTATION_MACRO: '#d9a0ff',
  ROM_MOTION: '#ffe08a',
  START_ANIMATION: '#7CFC00',
  WAIT: '#8ab0c8',
  WAIT_ANIMATION_FRAME: '#8ab0c8',
  SPAWN_FX: '#ffb0b0',
  AUDIO_SCRIPT: '#ffd36a',
  SCREEN_MOTION: '#ff9e6a',
  BRANCH_RESULT: '#7CFC00',
  PENDING_STATIC_DECODE: '#ff8080',
  PENDING_ROM_TRACE: '#ff8080',
  NONE: '#888',
};

export function ActionsTab({ initialCardId, onCardChange }: { initialCardId: number | null; onCardChange?: (id: number) => void }) {
  const [cardId, setCardId] = useState<number>(initialCardId && ALL_CARD_IDS.includes(initialCardId) ? initialCardId : ALL_CARD_IDS[0]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  const card: CardDef | null = useMemo(() => getCard(cardId) ?? null, [cardId]);
  const profile = useMemo(() => (card ? romPresentationProfileForCard(card) : null), [card]);
  const descriptor = useMemo(() => (card ? romActionExecutionDescriptorForCard(card) : null), [card]);

  const maxTick = useMemo(() => {
    if (!profile) return 0;
    return profile.program.reduce((m, s) => Math.max(m, (s.tick ?? 0) + (s.durationTicks ?? 0)), 0);
  }, [profile]);

  // playback a velocidad real: 1 tick GBC ≈ 16.74ms
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTick((t) => {
        if (t >= maxTick) { setPlaying(false); return t; }
        return t + 1;
      });
    }, 16.74);
    return () => clearInterval(id);
  }, [playing, maxTick]);

  // presenter real para SUPPORT (compilador + cues)
  const supportRuntime = useMemo(() => {
    if (!card || (profile && profile.kind !== 'SUPPORT_OR_FIELD_EFFECT' && profile.kind !== 'NONE')) return null;
    try {
      const presenter = new RomDisplayPresenter();
      const compiled = compileRomSupportPresentation(romSupportPresentationProfile({ cardId }));
      for (const e of compiled.timeline.entries) presenter.consume(e.cue);
      return { presenter, compiled };
    } catch {
      return null;
    }
  }, [card, cardId, profile]);

  const selectCard = (id: number) => {
    setCardId(id);
    setTick(0);
    setPlaying(false);
    onCardChange?.(id);
  };

  const currentStepIdx = useMemo(() => {
    if (!profile) return -1;
    let idx = -1;
    for (let i = 0; i < profile.program.length; i++) {
      if ((profile.program[i].tick ?? 0) <= tick) idx = i;
    }
    return idx;
  }, [profile, tick]);

  const runtimePose = card ? cardBattlePose(card) : null;
  const compatible = card?.compatible?.length ? card.compatible : ['universal (sin restricción)'];

  // AnimationResource real del card (catálogo decodificado — ROM_STATIC_VERIFIED)
  const animResId = profile?.dependencies.animationResource ?? null;
  const animRes = useMemo(() => (animResId !== null ? animationResourceById(animResId) ?? null : null), [animResId]);
  const animTotalTicks = animRes ? animRes.sequences.reduce((s, seq) => Math.max(s, seq.totalTicks), 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#cfe3ff' }}>CARD</label>
        <select value={cardId} onChange={(e) => selectCard(Number(e.target.value))} style={{ background: '#1a2434', color: '#cfe3ff', border: '1px solid #2a4a6a', borderRadius: 3, maxWidth: 300 }}>
          {ALL_CARD_IDS.map((id) => {
            const c = getCard(id);
            return <option key={id} value={id}>#{id} {c?.name} ({c?.type})</option>;
          })}
        </select>
        <span style={{ opacity: 0.8, fontSize: 13 }}>
          <Mono>handler {profile?.execution.handlerHex}</Mono> · <Mono>kind {profile?.kind}</Mono> · <Mono>worker {profile?.execution.worker?.label ?? '—'}</Mono>
        </span>
      </div>

      {card && profile && (
        <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
          {/* ── ROM EXECUTION DESCRIPTOR + PROFILE ── */}
          <div style={{ minWidth: 320, maxWidth: 460 }}>
            <SectionTitle>ROM PROFILE <MappingPill status={profile.completion.static === 'COMPLETE' ? 'EXACT' : 'FALLBACK'} label={profile.completion.static === 'COMPLETE' ? 'ROM_CONFIRMED' : 'PARTIAL'} /></SectionTitle>
            <FieldRow label="handler" value={<Mono>{profile.execution.handlerHex} → {profile.execution.worker?.label ?? '—'}</Mono>} />
            <FieldRow label="family" value={<Mono>{profile.execution.family}</Mono>} />
            <FieldRow label="AnimationResource" value={<Mono>{profile.dependencies.animationResourceHex ?? '—'}</Mono>} />
            <FieldRow label="FXResource" value={<Mono>{profile.dependencies.fxResourceHex ?? '—'}</Mono>} />
            <FieldRow label="palette" value={<Mono>{profile.dependencies.paletteHex ?? '—'}</Mono>} />
            <FieldRow label="completion.static" value={<Mono>{profile.completion.static}</Mono>} status={profile.completion.static === 'COMPLETE' ? 'EXACT' : 'FALLBACK'} />
            <FieldRow label="completion.dynamic" value={<Mono>{profile.completion.dynamic}</Mono>} status={profile.completion.dynamic === 'NOT_REQUIRED' ? 'EXACT' : 'UNRESOLVED'} />
            {profile.completion.pending.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#ffb0b0' }}>
                <strong>PENDING:</strong> {profile.completion.pending.slice(0, 5).join(' · ')}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <SectionTitle>RESULT BRANCHES</SectionTitle>
              {descriptor?.result.branches.map((b, i) => (
                <div key={i} style={{ fontSize: 12, padding: '1px 0' }}>
                  <Mono>{b.family}</Mono> → macro <Mono>{b.macroHex ?? '—'}</Mono> <span style={{ opacity: 0.6 }}>{b.condition} · {b.source}</span>
                </div>
              )) ?? <div style={{ fontSize: 12, opacity: 0.6 }}>sin branches</div>}
            </div>
            <div style={{ marginTop: 8 }}>
              <SectionTitle>ACTOR → SEQUENCE</SectionTitle>
              <FieldRow label="compatible" value={<Mono>{compatible.join(', ')}</Mono>} />
              {animRes ? (
                <>
                  <FieldRow label="AnimationResource" value={<Mono>{animRes.resourceHex} · {animRes.sequenceCount} seq · {animRes.physicalFrameCount}f · {animRes.totalTicks}t</Mono>} status="EXACT" />
                  <FieldRow label="sequences (real)" value={<Mono>{animRes.sequences.map((s, i) => `S${i}:${s.frames.length}f/${s.totalTicks}t`).join('  ')}</Mono>} status="EXACT" />
                  <FieldRow label="resolved per actor" value={<Mono dim>selector table (v3 §353): la forma decide la secuencia — resolución form→seq UNRESOLVED salvo evidencia (p.ej. key $16 → seq 0, v3 §332)</Mono>} status="UNRESOLVED" />
                </>
              ) : (
                <FieldRow label="AnimationResource" value={<Mono dim>—</Mono>} />
              )}
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, borderTop: '1px solid #2a3a4a', paddingTop: 6 }}>
                ⚠️ Guardrail: un WAIT del programa (p.ej. 60t) es UN BEAT concreto, no la duración total de la
                acción. La duración total de la secuencia de animación es {animRes ? <Mono>{animTotalTicks}t</Mono> : '—'} (catálogo).
              </div>
            </div>
          </div>

          {/* ── PROGRAM (scrubber por ticks ROM reales) ── */}
          <div style={{ minWidth: 420, flex: 1 }}>
            <SectionTitle>ROM PRESENTATION PROGRAM — scrubber por ticks</SectionTitle>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { setTick(0); setPlaying(false); }}>|◀</button>
              <button onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚' : '▶ PLAY'}</button>
              <input type="range" min={0} max={maxTick} value={tick} onChange={(e) => { setTick(Number(e.target.value)); setPlaying(false); }} style={{ width: 300 }} />
              <Mono>tick {tick}/{maxTick}</Mono>
            </div>
            <div style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto', border: '1px solid #223', borderRadius: 4 }}>
              {profile.program.map((s, i) => {
                const active = i === currentStepIdx;
                const col = STEP_COLORS[s.kind] ?? '#aaa';
                const t0 = s.tick ?? 0;
                const t1 = t0 + (s.durationTicks ?? 0);
                return (
                  <div key={s.id} style={{
                    display: 'flex', gap: 8, fontSize: 12, padding: '2px 8px', fontFamily: 'monospace',
                    background: active ? 'rgba(124,252,0,0.10)' : undefined,
                    borderLeft: active ? `3px solid ${col}` : '3px solid transparent',
                  }} onClick={() => setTick(t0)}>
                    <span style={{ width: 90, color: col, flexShrink: 0 }}>{s.kind}</span>
                    <span style={{ width: 70, opacity: 0.7 }}>{t0}–{t1}t</span>
                    <span style={{ opacity: 0.95, flex: 1 }}>{s.label}</span>
                    {s.macroHex && <span style={{ color: '#d9a0ff' }}>{s.macroHex}</span>}
                    {s.resourceHex && <span style={{ color: '#a0d0ff' }}>{s.resourceHex}</span>}
                    {s.frame !== null && <span style={{ color: '#7CFC00' }}>F{s.frame}</span>}
                    {s.evidence !== 'ROM_STATIC_VERIFIED' && s.evidence && <span style={{ color: '#ff8080', opacity: 0.9 }}>{s.evidence}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RUNTIME PIXI ── */}
          <div style={{ minWidth: 240 }}>
            <SectionTitle>RUNTIME PIXI</SectionTitle>
            <FieldRow label="pose (cardBattlePose)" value={<Mono>{runtimePose}</Mono>} status={runtimePose ? 'RUNTIME' : 'UNRESOLVED'} />
            {supportRuntime ? (
              <>
                <FieldRow label="presenter" value={<Mono>RomDisplayPresenter (support)</Mono>} status="EXACT" />
                <FieldRow label="cues" value={<Mono>{supportRuntime.compiled.timeline.entries.length}</Mono>} />
                <FieldRow label="pending" value={<Mono>{supportRuntime.presenter.state.pendingReasons.length}</Mono>} status={supportRuntime.presenter.state.pendingReasons.length === 0 ? 'EXACT' : 'UNRESOLVED'} />
              </>
            ) : (
              <FieldRow label="presenter" value={<Mono dim>support-only (STANDARD_ATTACK → runtime consume pose vía actionProfiles)</Mono>} status="FALLBACK" />
            )}
            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55 }}>
              La cobertura runtime (pose jugable) NO equivale a correspondencia física ROM. Los ticks/offsets/macros de arriba son los ROM reales
              (durationTicks del profile); la película Pixi completa para STANDARD_ATTACK está en el pipeline de cinematografía (PENDING).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

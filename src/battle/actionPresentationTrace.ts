// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ACTION PRESENTATION TRACE (P0.4)
// ═══════════════════════════════════════════════════════════════════════
// Demuestra QUÉ termina mostrando realmente una acción de producción.
//
// Cadena completa, sin re-implementar gameplay (LAB_DUP = 0):
//   BattleRuntime (producción) → EventLog → PresentationCue[]
//   → pose/sequence resolver (producción) → manifest frame → Pixi.
//
// El tracer NO simula nada: consume el MISMO BattleRuntime, el MISMO
// compilador de cues y los MISMOS resolvers que producción. Produce:
//   - samples  : stream SEMÁNTICO legado (scene/pose/target/fx por tick)
//   - romFrames: stream FÍSICO ROM (recurso → seq → frame → vf → manifest)
// Ambos relojes se muestran por separado (no se falsea su alineación).
// ═══════════════════════════════════════════════════════════════════════

import {
  runGoldenAction,
  GOLDEN_ACTIONS,
  type GoldenActionId,
} from './combatTrace';
import {
  resolveCharacterVisualSequence,
  type FrameMapping,
  type ResolvedVisualSequence,
} from './characterFrameMap';
import { spriteDirFor } from '../data/spriteManifest';
import { resolvePoseFrameSequence } from './spriteConfig';
import { romFrameView, tickBoundaries } from './animationStudio';
import { getCard } from '../data/cards';
import { romPresentationProfileForCard } from './romPresentationProfiles';
import { romPresentationTimelineForCard } from './romPresentationForCard';
import { animationResourceById } from './animationResources';

// ─── Modelo ─────────────────────────────────────────────────────────────

/** Estado físico del frame realmente mostrado (5-way, deriva del F-MAP 7-way). */
export type PhysicalVisualStatus = 'PHYSICAL' | 'COMPOSITE' | 'FALLBACK' | 'REFERENCE_FX' | 'UNRESOLVED';

export interface FighterVisualTrace {
  side: 'LEFT' | 'RIGHT';
  formId: string;
  requestedPose?: string;
  resolvedPose?: string;
  sequenceIndex?: number;
  frameIndex?: number;
  file?: string;
  physicalStatus: PhysicalVisualStatus;
  mapping: FrameMapping;
  canonicalId?: string;
  sourceResource?: number;
  sourceSequence?: number;
  visualFrameId?: number;
  offsetX?: number;
  offsetY?: number;
  fallbackReason?: string;
}

export interface ActionPresentationTraceSample {
  tick: number;
  scene: string;
  actor: FighterVisualTrace | null;
  target: FighterVisualTrace | null;
  fx: string[];
  palette?: string;
  camera?: string;
  engineEvent?: string;
  romCue?: string;
  activeCueIds: string[];
}

/** Un frame FÍSICO del stream ROM (recurso → secuencia → frame → vf → manifest). */
export interface RomFrameSample {
  absoluteTick: number;
  resourceId: number;
  resourceHex: string;
  sequenceIndex: number;
  frameIndex: number;
  visualFrameId: number;
  durationTicks: number;
  actor: FighterVisualTrace;
}

export interface ActionPresentationTrace {
  traceId: string;
  presetId: GoldenActionId;
  label: string;
  gameplay: {
    startTick: number;
    endTick?: number;
    attacker: string;
    defender: string;
    cardId: number | null;
    cardName: string | null;
    command: string;
    handler?: number;
    outcome?: string;
  };
  presentation: {
    source: 'ROM' | 'LEGACY' | 'REMAKE_FALLBACK' | 'MIXED';
    profileId?: string;
    generatedCueCount: number;
    consumedCueCount: number;
  };
  samples: ActionPresentationTraceSample[];
  romFrames: RomFrameSample[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function physicalStatusOf(mapping: FrameMapping | null): PhysicalVisualStatus {
  switch (mapping) {
    case 'ROM_EXACT':
    case 'CANONICAL_PHYSICAL':
    case 'SHARED_PHYSICAL': return 'PHYSICAL';
    case 'COMPOSITE': return 'COMPOSITE';
    case 'FALLBACK': return 'FALLBACK';
    case 'REFERENCE_FX': return 'REFERENCE_FX';
    case 'UNRESOLVED':
    default: return 'UNRESOLVED';
  }
}

function legacyFallbackReason(seq: ResolvedVisualSequence, cardFallback: string | null): string | undefined {
  switch (seq.source) {
    case 'ROM_DERIVED': return undefined;
    case 'FALLBACK': return 'NO_FRAMES_FOR_POSE';
    case 'COMPOSITE': return 'COMPOSITE:REUSES_OTHER_FAMILY';
    case 'UNRESOLVED': return cardFallback ?? 'UNRESOLVED:NO_ROM_NO_CANONICAL';
    default: return undefined;
  }
}

/** Resuelve el visual de un Fighter por la VÍA LEGACY (FIGHTER_POSE). */
export function resolveLegacyFighterVisual(
  formId: string,
  pose: string,
  side: 'LEFT' | 'RIGHT',
  cardFallback: string | null,
): FighterVisualTrace {
  const dir = spriteDirFor(formId);
  const seq = resolveCharacterVisualSequence({ formId, semanticRole: pose });
  const available = new Set<string>(seq.bindings.map(b => b.file));
  const productionFrames = dir ? resolvePoseFrameSequence(pose, dir, f => available.has(f)) : [];
  const first = seq.bindings[0];
  const rom = first?.rom;
  return {
    side,
    formId,
    requestedPose: pose,
    resolvedPose: productionFrames.length > 0 ? pose : undefined,
    file: productionFrames[0] ?? first?.file,
    physicalStatus: physicalStatusOf(seq.classification),
    mapping: seq.classification,
    canonicalId: first?.canonicalId ?? undefined,
    sourceResource: rom?.animationResource,
    sourceSequence: rom?.sequenceIndex,
    visualFrameId: rom?.visualFrameId,
    offsetX: rom?.offsetX,
    offsetY: rom?.offsetY,
    fallbackReason: legacyFallbackReason(seq, cardFallback),
  };
}

/** Resuelve el visual de un Fighter por la VÍA ROM (frame del recurso). */
export function resolveRomFighterVisual(
  formId: string,
  resourceId: number,
  sequenceIndex: number,
  frameIndex: number,
  side: 'LEFT' | 'RIGHT',
): FighterVisualTrace | null {
  const v = romFrameView(formId, resourceId, sequenceIndex, frameIndex);
  if (!v) return null;
  const binding = v.fmap?.bindings.find(b => b.manifestIndex === v.manifestIndex) ?? v.fmap?.bindings[0];
  return {
    side,
    formId,
    requestedPose: v.manifestPose ?? undefined,
    resolvedPose: v.manifestPose ?? undefined,
    sequenceIndex,
    frameIndex,
    file: binding?.file ?? (v.productionFrames[0] ?? undefined),
    physicalStatus: physicalStatusOf(v.classification),
    mapping: v.classification ?? 'UNRESOLVED',
    canonicalId: binding?.canonicalId ?? undefined,
    sourceResource: resourceId,
    sourceSequence: sequenceIndex,
    visualFrameId: v.visualFrameId,
    offsetX: v.offsetX,
    offsetY: v.offsetY,
    fallbackReason: v.classification === 'UNRESOLVED' ? 'UNRESOLVED:NO_ROM_NO_CANONICAL' : undefined,
  };
}

// ─── Tracer ─────────────────────────────────────────────────────────────

/**
 * Traza UNA acción golden hasta el frame mostrado. Consume el runtime REAL
 * (runGoldenAction → BattleRuntime) + el stream de cues legado + el stream
 * ROM. No re-implementa gameplay (LAB_GAMEPLAY_IMPLEMENTATION_DUPLICATION = 0).
 */
export function traceActionPresentation(id: GoldenActionId): ActionPresentationTrace {
  const trace = runGoldenAction(id);
  const preset = GOLDEN_ACTIONS.find(p => p.id === id) ?? GOLDEN_ACTIONS[0];
  const cardFallback = trace.cardTrace?.fallbackReason ?? null;

  const source = trace.cardTrace?.presentationSource ?? 'LEGACY';
  const profileId = trace.romFamily ?? undefined;

  const formFor = (side: 'player' | 'enemy') => side === 'player' ? preset.playerFormId : preset.enemyFormId;

  // ── Stream SEMÁNTICO legado (scene/pose/target/fx por tick) ──
  const samples: ActionPresentationTraceSample[] = [];
  let currentActor: FighterVisualTrace | null = null;
  let currentTarget: FighterVisualTrace | null = null;
  let currentScene = 'FIELD';
  let currentCamera: string | undefined;
  const currentFx = new Map<string, string>();

  interface Row { tick: number; kind: 'engine' | 'cue'; engineEvent?: string; romCue?: string; }
  const rows: Row[] = [];
  for (const e of trace.engineEvents) rows.push({ tick: e.tick, kind: 'engine', engineEvent: `${e.type}${e.detail ? ` ${e.detail}` : ''}` });
  for (const c of trace.legacyCues) rows.push({ tick: c.tick, kind: 'cue', romCue: c.type });
  rows.sort((a, b) => a.tick - b.tick);

  for (const r of rows) {
    for (const c of trace.legacyCues.filter(x => x.tick === r.tick)) {
      if (c.type === 'SCENE') currentScene = c.detail || currentScene;
      if (c.type === 'CAMERA') currentCamera = c.detail || currentCamera;
      if (c.type === 'AURA' || c.type === 'EFFECT' || c.type === 'PROJECTILE') {
        if (c.detail) currentFx.set(`${c.type}:${c.detail}`, c.detail);
      }
      if (c.type === 'FIGHTER_POSE' && c.pose) {
        const fv = resolveLegacyFighterVisual(
          formFor(c.side ?? 'player'),
          c.pose,
          c.side === trace.attacker ? 'LEFT' : 'RIGHT',
          cardFallback,
        );
        if (c.role === 'ACTOR') currentActor = fv;
        else if (c.role === 'TARGET') currentTarget = fv;
      }
    }
    samples.push({
      tick: r.tick,
      scene: currentScene,
      actor: currentActor,
      target: currentTarget,
      fx: [...currentFx.values()],
      camera: currentCamera,
      engineEvent: r.engineEvent,
      romCue: r.romCue,
      activeCueIds: trace.legacyCues.filter(x => x.tick === r.tick).map(x => `${x.tick}:${x.type}`),
    });
  }

  // ── Stream FÍSICO ROM (recurso → seq → frame, ticks absolutos acumulados) ──
  const romFrames = collectRomFrames(preset, trace);

  return {
    traceId: `${id}:${preset.seed}`,
    presetId: id,
    label: preset.label,
    gameplay: {
      startTick: trace.engineEvents[0]?.tick ?? 0,
      endTick: trace.engineEvents[trace.engineEvents.length - 1]?.tick,
      attacker: preset.playerFormId,
      defender: preset.enemyFormId,
      cardId: preset.cardId,
      cardName: trace.cardName,
      command: preset.command?.type ?? (preset.cardId != null ? 'PLAY_CARD' : 'NONE'),
      handler: trace.cardTrace?.handler,
      outcome: trace.engineOutcome,
    },
    presentation: {
      source,
      profileId,
      generatedCueCount: trace.cardTrace?.cuesGenerated ?? trace.legacyCues.length,
      consumedCueCount: trace.cardTrace?.cuesConsumed ?? trace.legacyCues.length,
    },
    samples,
    romFrames,
  };
}

/** Frames FÍSICOS ROM del actor (ticks absolutos acumulados entre secuencias). */
function collectRomFrames(
  preset: (typeof GOLDEN_ACTIONS)[number],
  trace: ReturnType<typeof runGoldenAction>,
): RomFrameSample[] {
  if (preset.cardId == null || !trace.romBacked) return [];
  const card = getCard(preset.cardId);
  if (!card) return [];
  const profile = romPresentationProfileForCard(card);
  const resourceId = profile.dependencies.animationResource;
  if (resourceId == null) return [];
  // SEGMENTO SOLO por rutas que conducen una animación del ACTOR. Una ruta
  // ROM sin ANIMATION_START/ROM_PHYSICAL_FRAME (DEFENSE_RULE: la defensa la
  // consume la ofensiva entrante §62-65 — el recurso de la fila pertenece al
  // slot8 ofensivo, no a un actor atacando) no produce frames físicos del
  // actor: exigirlos sería un falso positivo. El stream visible de esas rutas
  // son los cues (DEFENSE_FX → pose guard/evade/idle) del stream semántico.
  const route = romPresentationTimelineForCard(card, 'player', preset.playerFormId);
  const drivesActorAnimation = route?.timeline.entries.some(
    (en) => en.cue.type === 'ANIMATION_START' || en.cue.type === 'ROM_PHYSICAL_FRAME',
  ) ?? false;
  if (!drivesActorAnimation) return [];
  const catalog = animationResourceById(resourceId);
  if (!catalog) return [];

  const out: RomFrameSample[] = [];
  let acc = 0;
  for (let si = 0; si < catalog.sequences.length; si++) {
    const bounds = tickBoundaries(resourceId, si);
    for (let fi = 0; fi < bounds.length; fi++) {
      const fv = resolveRomFighterVisual(preset.playerFormId, resourceId, si, fi, 'LEFT');
      if (!fv) continue;
      out.push({
        absoluteTick: acc + bounds[fi].startTick,
        resourceId,
        resourceHex: profile.dependencies.animationResourceHex ?? `$${resourceId.toString(16).padStart(2, '0')}`,
        sequenceIndex: si,
        frameIndex: fi,
        visualFrameId: fv.visualFrameId ?? 0,
        durationTicks: bounds[fi].durationTicks,
        actor: fv,
      });
    }
    acc += sequenceTotalTicksOf(resourceId, si);
  }
  return out;
}

function sequenceTotalTicksOf(resourceId: number, sequenceIndex: number): number {
  const bounds = tickBoundaries(resourceId, sequenceIndex);
  return bounds.length ? bounds[bounds.length - 1].endTick : 0;
}

/** Resumen de trazas para el Lab (conteos + alarmas). */
export function actionPresentationTraceSummary() {
  return GOLDEN_ACTIONS.map(p => {
    const t = traceActionPresentation(p.id);
    const alarms: string[] = [];
    if (t.presentation.source !== 'ROM' && t.presentation.source !== 'LEGACY') alarms.push(t.presentation.source);
    if (t.presentation.source === 'ROM' && t.presentation.generatedCueCount !== t.presentation.consumedCueCount) alarms.push('GENERATED!=CONSUMED');
    let unActor = false, unTarget = false;
    for (const s of t.samples) {
      if (s.actor?.physicalStatus === 'UNRESOLVED') unActor = true;
      if (s.target?.physicalStatus === 'UNRESOLVED') unTarget = true;
    }
    for (const rf of t.romFrames) {
      if (rf.actor.physicalStatus === 'UNRESOLVED') unActor = true;
    }
    return {
      id: p.id,
      label: p.label,
      source: t.presentation.source,
      sampleCount: t.samples.length,
      romFrameCount: t.romFrames.length,
      unresolvedActors: unActor,
      unresolvedTargets: unTarget,
      alarms,
    };
  });
}

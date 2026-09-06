// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — COMBAT OBSERVABILITY (DEV-COMBAT-OBSERVABILITY)
// ═══════════════════════════════════════════════════════════════════════
// Capa PURA de observabilidad del combate real. Sin React, sin Pixi, sin
// DOM, sin timers. Se ejecuta headless y alimenta:
//   Combat Lab  → REAL MATCH inspector
//   Timeline    → pistas paralelas (Engine / ROM / Production / …)
//   verify:combat-observability  → gate determinista
//
// Responde a la pregunta crítica del cutover:
//   "¿esta carta está realmente funcionando por ROM en producción, o cae
//    a LEGACY / se queda a medias?"
//
// REGLAS (honestidad, nunca inventar):
//   - generated = cue presente en el timeline ROM compilado (no PENDING).
//   - consumed  = cue enrutado a un destino concreto (Pixi visible ·
//                 RomDisplayPresenter · trazabilidad registrada).
//   - dropped   = cue ROM_PENDING o no reconocido (generado pero sin
//                 destino real). Incluye PENDING_STATIC_DECODE.
//   - noVisibleEffect = consumido como trazabilidad (macro/waits/motion
//                 registrado) pero sin cambio visible en Pixi.
//   - proceduralGraphics = el timeline emite PROJECTILE procedural.
//
// La clasificación de cues es ESPEJO del ProductionRomPresentationAdapter
// (mismo switch). verify:combat-observability cruza ambos para garantizar
// que no divergen.
// ═══════════════════════════════════════════════════════════════════════

import { CARDS, type CardDef } from '../data/cards';
import type { BattleSide } from './engine/state/BattleState';
import type { PresentationCue } from './engine/presentation/PresentationCue';
import { romPresentationTimelineForCard } from './romPresentationForCard';
import { romPresentationProfileForCard, type RomPresentationProfileKind } from './romPresentationProfiles';
import { romActionExecutionDescriptorForCard } from './romActionExecutionDescriptors';

/** Fuente de presentación de una acción en producción (canary C1.0). */
export type PresentationSourceKind = 'ROM' | 'LEGACY' | 'REMAKE_FALLBACK' | 'MIXED';

/** Verdad final por carta (grade estricto): ¿gobernada por ROM limpia o visible por LEGACY? */
export type FinalSource = 'ROM_BACKED_STRICT' | 'LEGACY_VISIBLE';

/** Resultado agregado del trace de una acción (Action Trace Inspector). */
export type TraceResult = 'ROM_CLEAN' | 'ROM_PARTIAL' | 'LEGACY' | 'MIXED' | 'FAIL';

/** Destino concreto de un cue (espejo del adapter). */
export type CueDestination = 'VISIBLE' | 'DISPLAY' | 'TRACE' | 'PENDING' | 'UNHANDLED';

export interface CueClassification {
  destination: CueDestination;
  /** Cambió Pixi (scene/pose/proyectil/impacto/cámara/scene_load/result). */
  visible: boolean;
  /** Enrutado a RomDisplayPresenter (Support/Defense). */
  display: boolean;
  /** Registrado como trazabilidad (macros/waits/motion/FX resource). */
  trace: boolean;
  /** Generado pero sin destino real (ROM_PENDING o no reconocido). */
  dropped: boolean;
  /** Consumido pero sin efecto visible (trazabilidad pura). */
  noVisibleEffect: boolean;
  /** Etiqueta humana del efecto (para el inspector). */
  effect: string;
}

/** Cues que cambian Pixi directamente (visible). */
const VISIBLE_CUES = new Set<PresentationCue['type']>([
  'SCENE',
  'FIGHTER_POSE',
  'PROJECTILE',
  'CAMERA',
  'IMPACT',
  'SCENE_LOAD',
  'ROM_RESULT_BRANCH',
  'FIGHTER_VISIBILITY',
  // DEFENSE_FX: el adapter la consume con pose visible (case propio que
  // intercede ANTES del ruteo DISPLAY — guard/evade/idle por resultado CA53).
  // Espejo exacto: si el case del adapter cambiara, este set diverge y el
  // verifier lo detecta.
  'DEFENSE_FX',
]);

/** Cues de display Support/Defense → RomDisplayPresenter. */
const DISPLAY_CUES = new Set<PresentationCue['type']>([
  'SUPPORT_VISUAL_LOAD',
  'PALETTE_LOAD',
  'BG_ASSEMBLY',
  'DISPLAY_COMPOSE',
  'SUPPORT_MACRO',
  'DISPLAY_CLEAR',
  'SUPPORT_FX',
  'ROM_FX_WINDOW',
]);

/** Cues de trazabilidad ROM (macros/waits/animation/screen/audio…). */
const TRACE_CUES = new Set<PresentationCue['type']>([
  'MACRO',
  'ROM_MACRO',
  'PALETTE_TRANSITION',
  'ANIMATION_START',
  'ANIMATION_STATE',
  'WAIT_ANIMATION',
  'WAIT_ANIMATION_FRAME',
  'ACTION_OBJECT_POSITION',
  'ACTION_OBJECT_MOTION',
  'APPLY_FRAME_DELTA',
  'FX_AUX',
  'SCENE_CONFIGURE',
  'ROM_SFX',
  'ROM_AUDIO_SCRIPT',
  'ROM_WAIT',
  'ACTION_OBJECT_BIND',
  'ACTION_OBJECT_UNBIND',
  'ACTION_OBJECT_DRAW_ORDER',
  'ACTION_OBJECT_FRAME',
  'ACTION_OBJECT_FRAME_OFFSET',
  'ACTION_OBJECT_STOP',
  'MULTI_ACTOR_SYNC',
  'FIGHTER_POSITION',
  'AURA',
  'EFFECT',
  'HUD',
  'AUDIO',
  'ROM_PHYSICAL_FRAME',
  // FX_LOAD se registra como trazabilidad (no proyectil procedural).
  'FX_LOAD',
]);

const CONSUMED_CONTROL_CUES = new Set<PresentationCue['type']>([
  'FIGHTER_MOTION',
  'SCREEN_MOTION',
  'SCREEN_RESTORE',
  'SCREEN_PATH',
]);

function effectLabel(cue: PresentationCue): string {
  const c = cue as PresentationCue & Record<string, unknown>;
  switch (cue.type) {
    case 'SCENE': return `scene → ${String(c.mode ?? '?')}`;
    case 'SCENE_LOAD': return `scene_load → ${String(c.mode ?? '?')}`;
    case 'FIGHTER_POSE': return `pose ${String(c.role ?? '?')} ${String(c.pose ?? '?')}`;
    case 'PROJECTILE': return `projectile ${String(c.action ?? '?')} ${String(c.kind ?? '?')}`;
    case 'CAMERA': return `camera ${String(c.action ?? '?')}`;
    case 'IMPACT': return `impact ${String(c.outcome ?? '?')}`;
    case 'ROM_RESULT_BRANCH': return `result branch ${String(c.selectedFamily ?? 'PENDING')}`;
    case 'FIGHTER_MOTION': return `motion ${String(c.kind ?? '?')} ${String(c.deltaPx ?? 0)}px/${String(c.durationTicks ?? 0)}t`;
    case 'FX_LOAD': return `fx $${String(c.resource ?? '—').toString()} pal $${String(c.palette ?? '—').toString()}`;
    case 'ROM_FX_WINDOW': return `fx window ${String(c.physicalId ?? '?')} ${String(c.phase ?? '?')} ${String(c.sourceMap ?? '?')}`;
    case 'ROM_PENDING': return `PENDING: ${String(c.reason ?? '?')} (${String(c.boundary ?? 'STATIC')})`;
    default: return `${cue.type}`;
  }
}

/**
 * Clasifica un cue ROM en su destino concreto. ESPEJO EXACTO del
 * ProductionRomPresentationAdapter.consume() — si este switch cambia,
 * verify:combat-observability detecta la divergencia.
 */
export function classifyRomCue(cue: PresentationCue): CueClassification {
  const base: CueClassification = {
    destination: 'UNHANDLED',
    visible: false,
    display: false,
    trace: false,
    dropped: false,
    noVisibleEffect: false,
    effect: effectLabel(cue),
  };

  if (VISIBLE_CUES.has(cue.type)) {
    return { ...base, destination: 'VISIBLE', visible: true };
  }
  if (cue.type === 'ROM_PHYSICAL_FRAME') {
    return { ...base, destination: 'TRACE', visible: true, trace: true };
  }
  if (DISPLAY_CUES.has(cue.type)) {
    return { ...base, destination: 'DISPLAY', display: true };
  }
  if (CONSUMED_CONTROL_CUES.has(cue.type)) {
    return { ...base, destination: 'TRACE' };
  }
  if (TRACE_CUES.has(cue.type)) {
    return { ...base, destination: 'TRACE', trace: true, noVisibleEffect: true };
  }
  if (cue.type === 'ROM_PENDING') {
    return { ...base, destination: 'PENDING', dropped: true };
  }
  return { ...base, destination: 'UNHANDLED', dropped: true };
}

/** Si un cue genera un proyectil/easing procedural (ban C1.0). */
export function isProceduralCue(cue: PresentationCue): boolean {
  return cue.type === 'PROJECTILE';
}

export interface CueTrace {
  /** Tick de presentación GBC (cue.tick). */
  tick: number;
  type: PresentationCue['type'];
  classification: CueClassification;
  /** Identidad estable para correlación generated/consumed. */
  traceId: string;
  /** Provenance física del cue (visualFrameId para ACTION_OBJECT_FRAME). */
  visualFrameId: number | null;
  /** Fidelidad del perfil que originó el cue. */
  fidelity: string;
}

export interface CardActionTrace {
  cardId: number;
  cardName: string;
  kind: RomPresentationProfileKind;
  handler: number;
  handlerHex: string;
  // ROM descriptor / profile / compiler
  descriptorPresent: boolean;
  profileStatic: 'COMPLETE' | 'PARTIAL';
  profileDynamic: 'NOT_REQUIRED' | 'PENDING_ROM_TRACE';
  /** ¿El bridge enruta esta carta por ROM? (route != null). */
  romBacked: boolean;
  // cues agregados
  cuesGenerated: number;
  cuesConsumed: number;
  cuesVisible: number;
  cuesDisplay: number;
  cuesTrace: number;
  cuesPending: number;
  cuesDropped: number;
  cuesNoVisibleEffect: number;
  proceduralGraphics: boolean;
  // source
  presentationSource: PresentationSourceKind;
  finalSource: FinalSource;
  fallbackReason: string | null;
  traceResult: TraceResult;
  cues: CueTrace[];
}

/**
 * Trace estático (headless) de UNA carta: compila su timeline ROM y
 * clasifica cada cue contra el destino de producción. Es la respuesta
 * "¿esta carta está en ROM production?" sin ejecutar una partida.
 */
export function traceCardAction(card: CardDef, side: BattleSide = 'player', actorFormId?: string | null): CardActionTrace {
  const profile = romPresentationProfileForCard(card);
  const descriptor = romActionExecutionDescriptorForCard(card);
  const route = romPresentationTimelineForCard(card, side, actorFormId ?? null);

  const cues: CueTrace[] = [];
  let generated = 0;
  let consumed = 0;
  let visible = 0;
  let display = 0;
  let trace = 0;
  let pending = 0;
  let dropped = 0;
  let noVisibleEffect = 0;
  let proceduralGraphics = false;

  if (route) {
    route.timeline.entries.forEach((en, index) => {
      const cue = en.cue;
      const cls = classifyRomCue(cue);
      const traceId = `${index}:${cue.type}:${cue.tick}:${en.sourceEvent}`;
      if (cue.type !== 'ROM_PENDING') generated++;
      if (cls.destination !== 'PENDING' && cls.destination !== 'UNHANDLED') consumed++;
      if (cls.visible) visible++;
      if (cls.display) display++;
      if (cls.trace) trace++;
      if (cls.dropped) dropped++;
      if (cls.noVisibleEffect) noVisibleEffect++;
      if (isProceduralCue(cue)) proceduralGraphics = true;
      if (cue.type === 'ROM_PENDING') pending++;
      cues.push({
        tick: cue.tick,
        type: cue.type,
        classification: cls,
        traceId,
        visualFrameId: cue.type === 'ACTION_OBJECT_FRAME' || cue.type === 'ROM_PHYSICAL_FRAME'
          ? (cue as { visualFrameId?: number | null }).visualFrameId ?? null
          : null,
        fidelity: en.fidelity,
      });
    });
  }

  const romBacked = route != null;
  const presentationSource: PresentationSourceKind = !romBacked
    ? 'LEGACY'
    : visible === 0
      ? 'REMAKE_FALLBACK'
      : (dropped > 0 || proceduralGraphics)
        ? 'MIXED'
        : 'ROM';
  const finalSource: FinalSource = presentationSource === 'ROM' ? 'ROM_BACKED_STRICT' : 'LEGACY_VISIBLE';

  let fallbackReason: string | null = null;
  if (!romBacked) {
    fallbackReason = profile.kind === 'NONE'
      ? 'NO_ROM_PRESENTATION_PROGRAM'
      : profile.kind === 'UNKNOWN_HANDLER'
        ? 'HANDLER_UNPROVEN'
        : `BRIDGE_NOT_ELIGIBLE:${profile.kind}`;
  } else if (presentationSource === 'REMAKE_FALLBACK') {
    fallbackReason = 'NO_VISIBLE_EFFECT:COMPILED_WITHOUT_RENDER';
  } else if (dropped > 0) {
    fallbackReason = `PENDING_CUES:${dropped}`;
  } else if (proceduralGraphics) {
    fallbackReason = 'PROCEDURAL_PROJECTILE';
  }

  const traceResult: TraceResult = presentationSource === 'ROM'
    ? 'ROM_CLEAN'
    : presentationSource === 'MIXED'
      ? 'ROM_PARTIAL'
      : presentationSource === 'REMAKE_FALLBACK'
        ? 'FAIL'
        : 'LEGACY';

  return {
    cardId: card.id,
    cardName: card.name,
    kind: profile.kind,
    handler: descriptor.execution.handler,
    handlerHex: descriptor.execution.handlerHex,
    descriptorPresent: true, // ROM_ACTION_EXECUTION_DESCRIPTORS cubre las 125 cartas.
    profileStatic: profile.completion.static,
    profileDynamic: profile.completion.dynamic,
    romBacked,
    cuesGenerated: generated,
    cuesConsumed: consumed,
    cuesVisible: visible,
    cuesDisplay: display,
    cuesTrace: trace,
    cuesPending: pending,
    cuesDropped: dropped,
    cuesNoVisibleEffect: noVisibleEffect,
    proceduralGraphics,
    presentationSource,
    finalSource,
    fallbackReason,
    traceResult,
    cues,
  };
}

export interface ObservabilitySummary {
  total: number;
  /** Cartas enrutadas por el bridge ROM (route != null). */
  romBacked: number;
  /** Cartas ROM_CLEAN (sin cues dropped ni proyectil procedural). */
  romBackedStrict: number;
  legacyVisible: number;
  romClean: number;
  romPartial: number;
  legacy: number;
  remakeFallback: number;
  fail: number;
  totalCuesGenerated: number;
  totalCuesConsumed: number;
  totalCuesDropped: number;
  totalCuesNoVisibleEffect: number;
  proceduralCards: number;
}

/** Agregado honesto sobre las 125 cartas (el osciloscopio, no el contador). */
export function combatObservabilitySummary(): ObservabilitySummary {
  const s: ObservabilitySummary = {
    total: 0, romBacked: 0, romBackedStrict: 0, legacyVisible: 0, romClean: 0,
    romPartial: 0, legacy: 0, remakeFallback: 0, fail: 0,
    totalCuesGenerated: 0, totalCuesConsumed: 0, totalCuesDropped: 0,
    totalCuesNoVisibleEffect: 0, proceduralCards: 0,
  };
  for (const card of CARDS) {
    const t = traceCardAction(card);
    s.total++;
    if (t.romBacked) s.romBacked++;
    if (t.finalSource === 'ROM_BACKED_STRICT') s.romBackedStrict++;
    else s.legacyVisible++;
    switch (t.traceResult) {
      case 'ROM_CLEAN': s.romClean++; break;
      case 'ROM_PARTIAL': s.romPartial++; break;
      case 'LEGACY': s.legacy++; break;
      case 'MIXED': break;
      case 'FAIL': s.fail++; break;
    }
    if (t.presentationSource === 'REMAKE_FALLBACK') s.remakeFallback++;
    s.totalCuesGenerated += t.cuesGenerated;
    s.totalCuesConsumed += t.cuesConsumed;
    s.totalCuesDropped += t.cuesDropped;
    s.totalCuesNoVisibleEffect += t.cuesNoVisibleEffect;
    if (t.proceduralGraphics) s.proceduralCards++;
  }
  return s;
}

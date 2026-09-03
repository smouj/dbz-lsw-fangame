// ═══════════════════════════════════════════════════════════════════════
// M7 — Presentation Adapter: BattleEventEnvelope[] → BattleTimeline.
// ═══════════════════════════════════════════════════════════════════════
// PURO: 0 React · 0 DOM · 0 Pixi · 0 timers de pared · 0 mutaciones de
// gameplay. Consumible desde Node (headless) — misma entrada ⇒ mismo
// timeline, sin importar 30/60/144 FPS ni la forma de alimentar el reloj.
//
// Fuentes (jerarquía de fidelidad):
//   1. FRAME_VERIFIED (aún sin perfiles así)
//   2. perfil firma (actionProfiles — INFERRED hoy)
//   3. familia canónica (animationCanon)
//   4. fallback runtime
// El timeline conserva profileId + fidelity por cue.
//
// DOS TIEMPOS:
//   logicalTick     → cuándo ocurrió el hecho (del BattleEvent).
//   cue.tick        → cuándo se MUESTRA (presentación): la secuencia de una
//                     acción se ancla a ACTION_STARTED + frames del canon.
//   logicalTick NUNCA se modifica para fingir que el daño ocurrió tarde.
// ═══════════════════════════════════════════════════════════════════════

import { canonForAction } from '../../animationCanon';
import { resolveActionProfileById, type ActionProfileSpec } from '../../actionProfiles';
import { compileBeamFamilyRuntimeCutover } from '../../beamBaseRomCutover';
import { compileStandardDamageRuntimeCutover } from '../../standardDamageRomCutover';
import { compileSupportRomRuntimeCutover } from '../../supportRomCutover';
import { compileDefenseRomRuntimeCutover, defenseCardForChoice } from '../../defenseRomCutover';
import { STAGE_PREP_BEATS, STAGE_PREP_TICKS } from '../clock/clock';
import { ROM_CHARA_EXIT_MOTION, ROM_CHARA_ENTRY_MOTION, ROM_RUSH_MOTION, CHARA_SWITCH_PRE_WAIT_TICKS, type RomDiscreteMotion } from '../rom/romDescriptors';
import { segmentsTotalTicks, segmentsNetDelta, type RomMotionSegment } from '../../romMotionMath';
import type { ProjectileVisualKind } from '../../actionProfiles';
import type { BattleEvent, BattleActionDescriptor } from '../events/BattleEvent';
import type { BattleEventEnvelope } from '../events/EventLog';
import type { BattleSide } from '../state/BattleState';
import type { BattlePosition } from '../../../data/positions';
import { POSITION_DATA } from '../../../data/positions';
import {
  type BattleTimeline,
  type BattleSceneMode,
  type FighterRole,
  type PresentationCue,
  type TimelineEntry,
} from './PresentationCue';

export interface BattlePresentationContext {
  playerFormId: string;
  enemyFormId: string;
  overviewBackground: string;
  actionBackground: string;
  specialActionBackground?: string;
}

export interface PresentationInput {
  events: BattleEventEnvelope[];
  context: BattlePresentationContext;
}

interface ActionState {
  side: BattleSide;
  action: BattleActionDescriptor;
  canon: ReturnType<typeof canonForAction>;
  /** Perfil firma de la acción (p.ej. cont_punch → punch_right/knockback_back). */
  profile: ActionProfileSpec | null;
  startTick: number;
  /** Stage (kind command): ticks de preparación antes del QTE interactivo. */
  prepTicks: number | null;
  /**
   * Stage — tick del evento que TERMINÓ la ventana interactiva
   * (QTE_COMPLETED / QTE_FAILED / QTE_TIMEOUT / QTE_COUNTER_RESOLVED).
   * La resolución cinematográfica se ANCLA aquí (nunca a ACTION_STARTED):
   * la duración real del QTE es variable y no puede derivarse del inicio.
   */
  stageResolvedTick: number | null;
  /** Stage — anchor real usado por la resolución (para HUD de daño). */
  stageResolveAnchor: number | null;
  /** Esta acción ya obtuvo su timeline principal desde el compiler ROM. */
  romBackedProfileFamily?: 'STANDARD_DAMAGE' | 'BEAM_BASE' | 'BEAM_FAMILY' | 'SUPPORT_SPECIAL';
}

/** Duración por defecto de una pose (ticks GBC) hasta el siguiente beat. */
const POSE_HOLD = 8;

/** Segmentos de motion CHARA reflejados según el lado (mirrorBySide §176). */
function charaMotionSegments(motion: RomDiscreteMotion, side: BattleSide): RomMotionSegment[] {
  const mirror = motion.mirrorBySide && side === 'enemy';
  return motion.segments.map(s => ({
    dxPerTick: mirror ? -s.dxPerTick : s.dxPerTick,
    dyPerTick: mirror ? -s.dyPerTick : s.dyPerTick,
    ticks: s.ticks,
  }));
}

export function buildPresentationTimeline(input: PresentationInput): BattleTimeline {
  const { events, context } = input;
  const out: TimelineEntry[] = [];
  let activeAction: ActionState | null = null;
  /** M8.C2a — lado que comprometió defensa (DEFENSE_COMMITTED). Mientras esté
   *  activo, GUARD_STARTED NO emite pose inmediata: la guardia visual ocurre
   *  en el CONTACTO del ataque (ATTACK_HIT) — contrato C2a §7 (guard idle →
   *  block en contacto). Se limpia al retornar a OVERVIEW. */
  let defenseSide: BattleSide | null = null;
  /** Paso 3 (RESCUE) — elección COMPLETA cuando la defensa comprometida es una
   *  carta keyed por DEFENSE_ROM_RULES. El timeline ROM de la carta (family
   *  DEFENSE_RULE: DEFENSE_FX + ROM_WAIT/ROM_PENDING/SUPPORT_MACRO) se emite en
   *  el CONTACTO del ataque entrante (compileDefenseRomRuntimeCutover escanea el
   *  mismo EventLog desde el commit); la guardia genérica del ATTACK_HIT no se
   *  duplica cuando esta carta gobierna la pose del defensor. */
  let defenseCard: { side: BattleSide; cardId: number } | null = null;

  const other = (side: BattleSide): BattleSide => (side === 'player' ? 'enemy' : 'player');

  const add = (cue: PresentationCue, src: { event: BattleEvent; tick: number }, profileId: string | null = null, fidelity = 'NONE') => {
    out.push({ cue, logicalTick: src.tick, sourceEvent: src.event.type, profileId, fidelity });
  };

  for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
    const env = events[eventIndex];
    const e = env.event;
    switch (e.type) {
      // ── ACCIÓN: entra la vista ACTION, secuencia del canon, vuelta ──
      case 'ACTION_STARTED': {
        const canon = canonForAction(e.action);
        const profile = resolveActionProfileById(e.action.id);
        activeAction = { side: e.side, action: e.action, canon, profile, startTick: env.tick, prepTicks: null, stageResolvedTick: null, stageResolveAnchor: null };
        const actorFormId = e.side === 'player' ? context.playerFormId : context.enemyFormId;
        const romCutover = compileStandardDamageRuntimeCutover(events, eventIndex, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } }, actorFormId);
        if (romCutover) {
          activeAction.romBackedProfileFamily = 'STANDARD_DAMAGE';
          out.push(...romCutover.timeline.entries);
          break;
        }
        const beamBaseCutover = compileBeamFamilyRuntimeCutover(events, eventIndex, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } }, actorFormId);
        if (beamBaseCutover) {
          activeAction.romBackedProfileFamily = beamBaseCutover.profile.kind === 'BEAM_BASE' ? 'BEAM_BASE' : 'BEAM_FAMILY';
          out.push(...beamBaseCutover.timeline.entries);
          break;
        }
        const supportCutover = compileSupportRomRuntimeCutover(events, eventIndex, env as BattleEventEnvelope & { event: { type: 'ACTION_STARTED' } });
        if (supportCutover) {
          activeAction.romBackedProfileFamily = 'SUPPORT_SPECIAL';
          out.push(...supportCutover.timeline.entries);
          break;
        }
        const target = other(e.side);
        const mode: BattleSceneMode = e.side === 'player' ? 'PLAYER_ACTION' : 'ENEMY_ACTION';
        const special = e.action.visual === 'special' || e.action.kind === 'support';
        const bg = special && context.specialActionBackground ? context.specialActionBackground : context.actionBackground;
        // Stage: la escena dura hasta la RESOLUCIÓN (variable), no totalFrames.
        // durationTicks es informativo: la SCENE ACTION_DUEL de la resolución
        // corta antes si el QTE termina pronto (el renderer sigue el orden).
        const sceneDuration = e.action.kind === 'command'
          ? STAGE_PREP_TICKS + 240
          : canon.totalFrames;
        add({ type: 'SCENE', tick: env.tick, durationTicks: sceneDuration, mode: special ? 'SPECIAL_ACTION' : mode, background: bg }, env, e.action.id, e.action.fidelity);
        // M8.F0 — transición de ENTRADA verificada: el GBC usa FLASH_WHITE
        // (pantalla blanca) o CUT — NO fade negro (video: Purple Comet).
        if (canon.entrance === 'FLASH_WHITE') {
          add({ type: 'CAMERA', tick: env.tick, action: 'FLASH_WHITE' }, env, e.action.id, e.action.fidelity);
        } else {
          add({ type: 'CAMERA', tick: env.tick, action: 'CUT' }, env, e.action.id, e.action.fidelity);
        }
        add({ type: 'FIGHTER_VISIBILITY', tick: env.tick, role: 'ACTOR', side: e.side, visible: true }, env, e.action.id, e.action.fidelity);
        // M8.F0 — el defensor NO está visible al inicio (atacante SOLO):
        // entra en canon.defenderIn (verificado en video). Para acciones sin
        // defensor (support/gather/guard/move) defenderIn=0 → visible.
        add({ type: 'FIGHTER_VISIBILITY', tick: env.tick, role: 'TARGET', side: target, visible: canon.defenderIn === 0 }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env, e.action.id, e.action.fidelity);
        // Beats del canon (actor). Para STAGE (kind command) NO se emiten aquí:
        // las poses las controlan STAGE_PREP_STARTED (preparación) y la
        // resolución al completar el QTE (ATTACK_HIT con tick lógico real).
        if (e.action.kind !== 'command') {
          // M8.C2 — GRAMÁTICA MELEE por PERFIL FIRMA (no canon genérico):
          // la firma (p.ej. cont_punch → punch_right · rising_kick →
          // kick_right · dunk_shot → punch_left) gobierna las poses de
          // ataque; el canon solo aporta el armazón temporal. Así el
          // timeline distingue knockback_back/up/down sin hardcodes.
          const beats = profile?.actor?.beats?.length ? profile.actor.beats : canon.actor;
          for (let i = 0; i < beats.length; i++) {
            const b = beats[i];
            const next = beats[i + 1];
            const dur = next ? Math.max(1, next.frame - b.frame) : POSE_HOLD;
            add({ type: 'FIGHTER_POSE', tick: env.tick + b.frame, durationTicks: dur, role: 'ACTOR', side: e.side, pose: b.pose }, env, e.action.id, e.action.fidelity);
            // CANON DE PLANOS: el APPROACH (pose move_front) cambia al plano
            // ACTION_DUEL — el actor llega al plano del rival y el target se
            // hace visible (el contacto ocurre ahí, no en el plano del actor).
            if (b.pose === 'move_front') {
              add({ type: 'SCENE', tick: env.tick + b.frame, durationTicks: Math.max(1, canon.totalFrames - b.frame), mode: 'ACTION_DUEL', background: context.actionBackground }, env, e.action.id, e.action.fidelity);
              add({ type: 'FIGHTER_VISIBILITY', tick: env.tick + b.frame, role: 'TARGET', side: target, visible: true }, env, e.action.id, e.action.fidelity);
              add({ type: 'CAMERA', tick: env.tick + b.frame, action: 'TRACK' }, env, e.action.id, e.action.fidelity);
            }
          }
          // M8.F0 — el defensor entra en canon.defenderIn (verificado en
          // vídeo: atacante SOLO primero, defensor aparece cuando el ataque
          // viaja). Se emite una sola vez si no lo hizo ya el move_front.
          if (canon.defenderIn > 0) {
            const alreadyShown = beats.some(b => b.pose === 'move_front' && b.frame <= canon.defenderIn);
            if (!alreadyShown) {
              add({ type: 'FIGHTER_VISIBILITY', tick: env.tick + canon.defenderIn, role: 'TARGET', side: target, visible: true }, env, e.action.id, e.action.fidelity);
            }
          }
          // APPROACH (rush) del perfil: si la firma declara un rush con
          // startFrame propio, emite el approach explícito (ACTION_DUEL +
          // move_front) en ese frame — el plano cambia cuando el actor corre.
          if (profile?.rush) {
            const rushFrame = profile.rush.startFrame;
            if (rushFrame > 0 && !beats.some(b => b.pose === 'move_front')) {
              add({ type: 'SCENE', tick: env.tick + rushFrame, durationTicks: Math.max(1, canon.totalFrames - rushFrame), mode: 'ACTION_DUEL', background: context.actionBackground }, env, e.action.id, e.action.fidelity);
              add({ type: 'FIGHTER_VISIBILITY', tick: env.tick + rushFrame, role: 'TARGET', side: target, visible: true }, env, e.action.id, e.action.fidelity);
              add({ type: 'CAMERA', tick: env.tick + rushFrame, action: 'TRACK' }, env, e.action.id, e.action.fidelity);
              add({ type: 'FIGHTER_POSE', tick: env.tick + rushFrame, durationTicks: Math.min(6, profile.rush.duration), role: 'ACTOR', side: e.side, pose: 'move_front' }, env, e.action.id, e.action.fidelity);
            }
          }
        }
        // Aura como CAPA (gather/beam/support) — desde la preparación hasta el contacto
        if (canon.aura !== 'none') {
          const startFrame = canon.actor.find(b => b.pose === 'gather_power' || b.pose === 'power_up')?.frame ?? 0;
          const endFrame = canon.contactFrame > 0 ? canon.contactFrame : canon.totalFrames - 12;
          add({ type: 'AURA', tick: env.tick + startFrame, durationTicks: Math.max(1, endFrame - startFrame), role: 'ACTOR', side: e.side, variant: canon.aura, visible: true }, env, e.action.id, e.action.fidelity);
          add({ type: 'AURA', tick: env.tick + Math.max(endFrame, startFrame + 1), durationTicks: 1, role: 'ACTOR', side: e.side, variant: canon.aura, visible: false }, env, e.action.id, e.action.fidelity);
        }
        // Proyectil (beam/onda/esfera/disco/espada)
        const beamVisuals: BattleActionDescriptor['visual'][] = ['ray', 'wave', 'ball', 'disk', 'sword', 'special'];
        if (beamVisuals.includes(e.action.visual)) {
          const fireBeat = canon.actor.find(b => b.pose === 'beam_fire');
          const spawnTick = fireBeat ? env.tick + fireBeat.frame : env.tick + Math.max(0, canon.contactFrame - 24);
          const contactTick = env.tick + canon.contactFrame;
          add({ type: 'PROJECTILE', tick: spawnTick, kind: e.action.visual as ProjectileVisualKind, action: 'spawn', from: e.side, to: target }, env, e.action.id, e.action.fidelity);
          add({ type: 'PROJECTILE', tick: spawnTick + Math.floor((contactTick - spawnTick) / 2), kind: e.action.visual as ProjectileVisualKind, action: 'travel', from: e.side, to: target }, env, e.action.id, e.action.fidelity);
          add({ type: 'PROJECTILE', tick: contactTick, kind: e.action.visual as ProjectileVisualKind, action: 'impact', from: e.side, to: target }, env, e.action.id, e.action.fidelity);
        }
        // Vuelta al plano táctico — SOLO para acciones sin QTE interactivo.
        // Para STAGE (kind command) el retorno lo emite la RESOLUCIÓN
        // (anclada a QTE_COMPLETED/FAILED/TIMEOUT/COUNTER_RESOLVED), porque
        // la duración del QTE es variable y no se conoce en ACTION_STARTED.
        if (e.action.kind !== 'command') {
          add({ type: 'SCENE', tick: env.tick + canon.totalFrames, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env, e.action.id, e.action.fidelity);
          add({ type: 'FIGHTER_VISIBILITY', tick: env.tick + canon.totalFrames, role: 'TARGET', side: target, visible: true }, env, e.action.id, e.action.fidelity);
          add({ type: 'FIGHTER_POSE', tick: env.tick + canon.totalFrames, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env, e.action.id, e.action.fidelity);
          add({ type: 'CAMERA', tick: env.tick + canon.totalFrames, action: 'RESET' }, env, e.action.id, e.action.fidelity);
          // M8.C2a — el exchange cerró: la frontera defensiva expira.
          defenseSide = null;
          defenseCard = null;
        }
        break;
      }
      case 'ACTION_RESOLVED': {
        // Si no hay secuencia activa (resolución sin ACTION_STARTED previo):
        // garantiza el retorno a OVERVIEW.
        if (!activeAction) {
          add({ type: 'SCENE', tick: env.tick, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env);
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env);
        }
        break;
      }

      // ── RESULTADO DEL ATAQUE: event-driven, nunca mirar HP ──
      case 'ATTACK_HIT': {
        if (activeAction?.romBackedProfileFamily && e.source === activeAction.side) {
          break;
        }
        const stage = activeAction && activeAction.action.kind === 'command' ? activeAction : null;
        // Stage: cualquier golpe mientras una acción command está activa
        // (el acierto del actor tras QTE_COMPLETED, o el contraataque del
        // rival tras QTE_FAILED/TIMEOUT). La resolución se ANCLA al evento
        // que cerró la ventana interactiva y avanza HACIA DELANTE — nunca
        // antes del QTE.
        const isStageHit = !!stage;
        if (isStageHit) {
          // anchor: para el acierto del ACTOR, el tick en que terminó la
          // ventana interactiva (QTE_COMPLETED); para el contraataque, el
          // tick real del golpe (QTE_COUNTER_RESOLVED).
          const anchor = e.source === stage.side
            ? (stage.stageResolvedTick ?? env.tick)
            : env.tick;
          stage.stageResolveAnchor = anchor;
          const r = (off: number) => anchor + off;
          const { action, fidelity } = profileOf(stage);
          // BLOQUE C (RESOLUCIÓN) — precinemática fija → interacción variable
          // → resolución cinematográfica: ACTION_DUEL >= resultado del QTE,
          // APPROACH > ACTION_DUEL, STRIKE > APPROACH, IMPACT > STRIKE,
          // OVERVIEW > IMPACT.
          add({ type: 'SCENE', tick: r(0), durationTicks: 40, mode: 'ACTION_DUEL', background: context.actionBackground }, env, action, fidelity);
          add({ type: 'FIGHTER_VISIBILITY', tick: r(0), role: 'TARGET', side: e.target, visible: true }, env, action, fidelity);
          // M8.F1 — APPROACH REAL: el actor CORRE hacia el plano del rival con
          // el motion ROM exacto (ROM_RUSH_MOTION +98px/25t, macro $1C) mientras
          // hace la pose move_front. Antes solo se emitía la pose sin
          // desplazamiento — el personaje cambiaba de frame pero no se movía.
          {
            const segs = charaMotionSegments(ROM_RUSH_MOTION, e.source);
            add({ type: 'FIGHTER_MOTION', tick: r(0), durationTicks: segmentsTotalTicks(segs), side: e.source, kind: 'RUSH', deltaPx: segmentsNetDelta(segs).x, holdTicks: 0, segments: segs }, env, action, fidelity);
          }
          add({ type: 'FIGHTER_POSE', tick: r(8), durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'move_front' }, env, action, fidelity);   // approach
          add({ type: 'CAMERA', tick: r(8), action: 'TRACK' }, env, action, fidelity);
          add({ type: 'FIGHTER_POSE', tick: r(14), durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'idle' }, env, action, fidelity);        // stop + idle
          add({ type: 'FIGHTER_POSE', tick: r(20), durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'attack_fwd' }, env, action, fidelity);  // strike
          add({ type: 'IMPACT', tick: r(26), side: e.target, outcome: e.outcome }, env, action, fidelity);
          add({ type: 'FIGHTER_POSE', tick: r(26), durationTicks: 10, role: 'TARGET', side: e.target, pose: e.outcome === 'block' ? 'guard' : e.outcome === 'guard' ? 'evade' : 'knockback_back' }, env, action, fidelity);
          add({ type: 'CAMERA', tick: r(26), action: 'IMPACT' }, env, action, fidelity);
          add({ type: 'AUDIO', tick: r(26), cue: e.outcome === 'hit' ? 'hit' : e.outcome === 'block' ? 'block' : 'guard' }, env, action, fidelity);
          add({ type: 'FIGHTER_POSE', tick: r(34), durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'idle' }, env, action, fidelity);        // recovery
          // M8.F1 — RETORNO: el actor vuelve a su plano con el motion ROM
          // inverso (el RUSH lo llevó al plano del rival; OVERVIEW espera al
          // actor en su home). Simetría exacta del approach.
          {
            const segs = charaMotionSegments(ROM_RUSH_MOTION, e.source).map(seg => ({ ...seg, dxPerTick: -seg.dxPerTick }));
            add({ type: 'FIGHTER_MOTION', tick: r(34), durationTicks: segmentsTotalTicks(segs), side: e.source, kind: 'RUSH', deltaPx: -segmentsNetDelta(charaMotionSegments(ROM_RUSH_MOTION, e.source)).x, holdTicks: 0, segments: segs }, env, action, fidelity);
          }
          add({ type: 'SCENE', tick: r(40), durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env, action, fidelity);
          add({ type: 'FIGHTER_VISIBILITY', tick: r(40), role: 'TARGET', side: e.target, visible: true }, env, action, fidelity);
          add({ type: 'CAMERA', tick: r(40), action: 'RESET' }, env, action, fidelity);
          defenseSide = null; // M8.C2a — el exchange cerró (frontera defensiva expira)
          defenseCard = null;
          break;
        }
        // Resto de acciones (melee/beam sin QTE): el impacto se ancla al beat
        // de contacto del canon (secuencia fija desde ACTION_STARTED).
        const contactTick = activeAction && e.source === activeAction.side
          ? activeAction.startTick + activeAction.canon.contactFrame
          : env.tick;
        const { action, fidelity } = profileOf(activeAction);
        add({ type: 'IMPACT', tick: contactTick, side: e.target, outcome: e.outcome }, env, action, fidelity);
        add({ type: 'FIGHTER_VISIBILITY', tick: contactTick, role: 'TARGET', side: e.target, visible: true }, env, action, fidelity);
        // M8.C2 — REACCIÓN por PERFIL FIRMA: hit → targetPose del perfil
        // (cont_punch→knockback_back · rising_kick→knockback_up ·
        // dunk_shot→knockback_down); block → guard; guard → evade. El
        // strike del ACTOR usa el strikePose del perfil (no attack_fwd
        // genérico) para conservar la fidelidad de la familia.
        const profileTargetPose = activeAction?.profile?.impact?.targetPose;
        // M8.C2a — con defensa comprometida, la reacción del defensor es
        // guard (melee) o beam_guard (beam) — la guardia se presenta AQUÍ,
        // en el contacto (contrato §7). Sin defensa: reacción legacy por
        // perfil/outcome.
        const defending = defenseSide === e.target;
        // Paso 3 (RESCUE) — defensa con carta keyed por DEFENSE_ROM_RULES: la
        // pose del defensor la gobierna el cue DEFENSE_FX de su timeline ROM
        // (emitido en este mismo contacto por DEFENSE_COMMITTED → cutover). No
        // se duplica la guardia genérica: la pose sale de la regla CA83 (§62-64:
        // AVOIDED→evade · NULLIFIED/ATTENUATED/ABSORBED→guard ·
        // COMMAND_CANCELLED→idle), no de un guard/beam_guard inferido.
        const romDefenseGovernsPose = defending && defenseCard?.side === e.target;
        const isBeamAttack = !!activeAction && ['ray', 'wave', 'ball', 'disk', 'sword', 'special'].includes(activeAction.action.visual);
        const reactionPose = defending
          ? (isBeamAttack ? 'beam_guard' : 'guard')
          : e.outcome === 'block' ? 'guard'
          : e.outcome === 'guard' ? 'evade'
          : (profileTargetPose ?? 'knockback_back');
        const strikePose = e.outcome === 'hit'
          ? (activeAction?.profile?.actor?.beats?.find(b => b.pose !== 'idle' && b.pose !== 'move_front')?.pose ?? 'attack_fwd')
          : 'attack_fwd';
        if (!romDefenseGovernsPose) {
          add({ type: 'FIGHTER_POSE', tick: contactTick, durationTicks: 10, role: 'TARGET', side: e.target, pose: reactionPose }, env, action, fidelity);
        }
        add({ type: 'FIGHTER_POSE', tick: contactTick, durationTicks: 10, role: 'ACTOR', side: e.source, pose: strikePose }, env, action, fidelity);
        add({ type: 'CAMERA', tick: contactTick, action: 'IMPACT' }, env, action, fidelity);
        add({ type: 'AUDIO', tick: contactTick, cue: e.outcome === 'hit' ? 'hit' : e.outcome === 'block' ? 'block' : 'guard' }, env, action, fidelity);
        break;
      }
      case 'ATTACK_MISSED': {
        if (activeAction?.romBackedProfileFamily && e.source === activeAction.side) {
          break;
        }
        add({ type: 'IMPACT', tick: env.tick, side: e.target, outcome: 'miss' }, env);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'TARGET', side: e.target, pose: 'evade' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'dodge' }, env);
        break;
      }
      case 'DAMAGE_APPLIED': {
        if (e.amount > 0) {
          // Stage: el número de daño se ancla al IMPACTO visual de la
          // resolución (anchor + 26), no al tick lógico del evento — el HP
          // ya mutó en el Engine, pero la presentación lo muestra al golpear.
          const stageAnchor = activeAction?.action.kind === 'command' && activeAction.stageResolveAnchor != null
            ? activeAction.stageResolveAnchor + 26
            : env.tick;
          add({ type: 'HUD', tick: stageAnchor, kind: 'damage_number', side: e.target, value: e.amount }, env);
        }
        break;
      }
      case 'FIGHTER_DEFEATED': {
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: 20, role: 'TARGET', side: e.side, pose: 'hurt' }, env);
        add({ type: 'HUD', tick: env.tick, kind: 'message', value: 'K.O.' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'ko' }, env);
        break;
      }

      // ── QTE / COUNTER (timeline propio; la UI del QTE consulta deadlines) ──
      case 'STAGE_PREP_STARTED': {
        // Preparación canónica: idle → estira brazos (gather_power) → encoge
        // (beam_charge) → idle final. El HUD Stage se ve VACÍO (preparing).
        if (activeAction) activeAction.prepTicks = e.prepTicks;
        for (const b of STAGE_PREP_BEATS) {
          add({ type: 'FIGHTER_POSE', tick: env.tick + b.frame, durationTicks: 6, role: 'ACTOR', side: e.side, pose: b.pose }, env, 'stage_prep', 'INFERRED');
        }
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: 'preparing' }, env, 'stage_prep', 'INFERRED');
        break;
      }
      case 'QTE_STARTED': {
        // El reloj abrió la ventana: inputs visibles + cronómetro (AQUÍ).
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: `level ${e.level} inputs` }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'cardPlay' }, env);
        break;
      }
      case 'QTE_INPUT_RESOLVED': {
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: e.success ? `ok ${e.indexAfter}` : 'wrong' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: e.success ? 'qteOk' : 'qteFail' }, env);
        break;
      }
      case 'QTE_COMPLETED': {
        // La ventana interactiva TERMINÓ: la resolución se ancla aquí.
        if (activeAction) activeAction.stageResolvedTick = env.tick;
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: 'completed' }, env);
        break;
      }
      case 'QTE_FAILED': {
        // La ventana interactiva TERMINÓ (fallo → contraataque del rival).
        if (activeAction) activeAction.stageResolvedTick = env.tick;
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: 'failed' }, env);
        break;
      }
      case 'QTE_TIMEOUT': {
        // La ventana de inputs expiró → termina la interacción (counter).
        if (activeAction) activeAction.stageResolvedTick = env.tick;
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: `timeout ${e.window}` }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'qteFail' }, env);
        break;
      }
      case 'QTE_COUNTER_STARTED': {
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: 'counter' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'counter' }, env);
        break;
      }
      case 'QTE_COUNTER_RESOLVED': {
        if (activeAction) activeAction.stageResolvedTick = env.tick;
        if (e.action === 'DEFEND') {
          // Defensa contra el contraataque → guardia activa y retorno al
          // plano táctico (resolución anclada aquí, no en ACTION_STARTED).
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: 'player', pose: 'guard' }, env);
          add({ type: 'AUDIO', tick: env.tick, cue: 'guard' }, env);
          add({ type: 'SCENE', tick: env.tick + 12, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env);
          add({ type: 'FIGHTER_POSE', tick: env.tick + 12, durationTicks: POSE_HOLD, role: 'ACTOR', side: 'player', pose: 'idle' }, env);
          add({ type: 'CAMERA', tick: env.tick + 12, action: 'RESET' }, env);
        } else if (e.action === 'CONTINUE') {
          // Reparar y continuar: la ventana interactiva se REABRE (la
          // resolución vendrá al terminar de verdad). Actor vuelve a idle.
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: 'player', pose: 'idle' }, env);
        }
        // TIMEOUT: el contraataque conectó — la resolución la emite el
        // ATTACK_HIT del rival (anclado al tick de este evento).
        break;
      }

      // ── DEFENSAS / MOVIMIENTO / GATHER (overview) ──
      case 'DEFENSE_COMMITTED': {
        // M8.C2a — frontera defensiva: el jugador comprometió UNA elección
        // (GUARD | MOVE | CARD). La presentación entra en DEFENDER_ACTION
        // (cámara en el defensor) con la PREPARACIÓN defensiva; la defensa
        // visual efectiva (guard/beam_guard) ocurre en el CONTACTO con el
        // ataque enemigo (ATTACK_HIT), NO al elegir. El plano NO crea ni
        // reparenta actores: los mismos FighterActor cambian de visibilidad.
        const defender = e.side;
        defenseSide = defender;
        // Paso 3 (RESCUE) — carta defensiva con regla ROM (§62 DEFENSE_ROM_RULES):
        // se guarda la elección COMPLETA; su timeline ROM (family DEFENSE_RULE)
        // se ancla al ATTACK_HIT entrante del mismo exchange (abajo), no aquí.
        let romBackedDefense = false;
        if (e.choice.type === 'CARD') {
          const romCard = defenseCardForChoice(e.choice);
          if (romCard) {
            defenseCard = { side: defender, cardId: romCard.id };
            romBackedDefense = true;
            // Emisión en el contacto: si el EventLog ya contiene la resolución
            // del ataque entrante (dispatch posterior del BattleRuntime), el
            // cutover la encuentra y emite DEFENSE_FX & co. anclados a ese tick.
            // Si aún no está (primer rebuild tras el commit), devuelve null y el
            // rebuild que añada el ATTACK_HIT lo emitirá (log acumulativo, M7).
            const romDefense = compileDefenseRomRuntimeCutover(
              events,
              eventIndex,
              env as BattleEventEnvelope & { event: { type: 'DEFENSE_COMMITTED' } },
            );
            if (romDefense) {
              out.push(...romDefense.timeline.entries);
            }
          }
        }
        const prepPose =
          e.choice.type === 'GUARD' ? 'idle'
          : e.choice.type === 'MOVE' ? (e.choice.axis === 'HORIZONTAL' ? 'move_front' : 'move_back')
          : 'idle';
        // Prep breve (12 ticks) antes de que el atacante pueda entrar.
        add({ type: 'SCENE', tick: env.tick, durationTicks: 12, mode: 'DEFENDER_ACTION', background: context.actionBackground }, env, 'defense_prep', 'INFERRED');
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: 10, role: 'TARGET', side: defender, pose: prepPose }, env, 'defense_prep', 'INFERRED');
        // Carta defensiva/support SIN regla ROM: FX previo legacy INFERRED antes
        // del contacto (C2a §9). Las keyed por DEFENSE_ROM_RULES NO emiten el
        // aura inventada: su programa ROM (DEFENSE_FX en el contacto) la
        // sustituye con evidencia (§62-64: ZERO DAMAGE no implica la misma
        // reacción visual — la pose sale de la regla CA83, no de un aura genérica).
        if (e.choice.type === 'CARD' && !romBackedDefense) {
          add({ type: 'AURA', tick: env.tick, durationTicks: 10, role: 'TARGET', side: defender, variant: 'support', visible: true }, env, 'defense_prep', 'INFERRED');
        }
        add({ type: 'AUDIO', tick: env.tick, cue: e.choice.type === 'MOVE' ? 'step' : 'guard' }, env, 'defense_prep', 'INFERRED');
        break;
      }
      case 'GUARD_STARTED': {
        // M8.C2a — con defensa comprometida, la pose guard NO se emite aquí:
        // la guardia se presenta en el contacto del ataque (ATTACK_HIT).
        // Sin defensa comprometida (p.ej. cartas defensivas en medio de un
        // ataque enemigo), se mantiene la pose inmediata legacy.
        if (defenseSide !== e.side) {
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'TARGET', side: e.side, pose: e.guard === 'avoid_beam' ? 'beam_guard' : 'guard' }, env);
          add({ type: 'AUDIO', tick: env.tick, cue: 'guard' }, env);
        }
        break;
      }
      case 'POSITION_CHANGED': {
        add({ type: 'FIGHTER_POSITION', tick: env.tick, role: 'TARGET', side: e.side, position: e.to }, env);
        const fromDepth = POSITION_DATA[e.from].depth;
        const toDepth = POSITION_DATA[e.to].depth;
        if (e.axis === 'HORIZONTAL') {
          const pose = toDepth === 'FRONT' && fromDepth === 'BACK' ? 'move_front' : 'move_back';
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'TARGET', side: e.side, pose }, env);
        }
        add({ type: 'AUDIO', tick: env.tick, cue: 'step' }, env);
        break;
      }
      case 'GATHER_STARTED': {
        const canon = canonForAction({ id: 'gather_power', label: 'Gather Power', kind: 'gather', visual: 'power', fidelity: 'INFERRED' });
        activeAction = { side: e.side, action: { id: 'gather_power', label: 'Gather Power', kind: 'gather', visual: 'power', fidelity: 'INFERRED' }, canon, profile: null, startTick: env.tick, prepTicks: null, stageResolvedTick: null, stageResolveAnchor: null };
        add({ type: 'SCENE', tick: env.tick, durationTicks: canon.totalFrames, mode: e.side === 'player' ? 'PLAYER_ACTION' : 'ENEMY_ACTION', background: context.actionBackground }, env);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: canon.totalFrames - 12, role: 'ACTOR', side: e.side, pose: 'gather_power' }, env);
        add({ type: 'AURA', tick: env.tick, durationTicks: canon.totalFrames - 12, role: 'ACTOR', side: e.side, variant: 'power', visible: true }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'powerUp' }, env);
        add({ type: 'SCENE', tick: env.tick + canon.totalFrames, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env);
        break;
      }

      // ── CHARACTER SWITCH (M8.CHARA — ROM §176-178) ──
      // El Engine emite el ciclo semántico; la presentación traduce a motion:
      //   STARTED   → WAIT 20 → CHARA_EXIT (43t)
      //   COMMITTED → CHARA_ENTRY (32t)
      //   COMPLETED → cleanup (idle).
      // El commit visual queda ENTRE $27 y $28 (§178): el miembro no cambia
      // visible antes de terminar los 43t de salida.
      case 'CHARACTER_SWITCH_STARTED': {
        const segs = charaMotionSegments(ROM_CHARA_EXIT_MOTION, e.side);
        add({
          type: 'FIGHTER_MOTION',
          tick: env.tick + CHARA_SWITCH_PRE_WAIT_TICKS,
          durationTicks: segmentsTotalTicks(segs),
          side: e.side,
          kind: 'CHARA_EXIT',
          deltaPx: segmentsNetDelta(segs).x,
          holdTicks: 0,
          segments: segs,
        }, env, 'chara_switch', 'ROM_EXACT');
        break;
      }
      case 'CHARACTER_SWITCH_COMMITTED': {
        const segs = charaMotionSegments(ROM_CHARA_ENTRY_MOTION, e.side);
        add({
          type: 'FIGHTER_MOTION',
          tick: env.tick,
          durationTicks: segmentsTotalTicks(segs),
          side: e.side,
          kind: 'CHARA_ENTRY',
          deltaPx: segmentsNetDelta(segs).x,
          holdTicks: 0,
          segments: segs,
        }, env, 'chara_switch', 'ROM_EXACT');
        break;
      }
      case 'CHARACTER_SWITCH_COMPLETED': {
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env, 'chara_switch', 'ROM_EXACT');
        break;
      }

      // ── HUD / AUDIO básicos ──
      case 'CC_SPENT':
      case 'CC_GAINED': {
        add({ type: 'HUD', tick: env.tick, kind: 'cc', side: e.side, value: e.after }, env);
        break;
      }
      case 'CARD_PLAYED': {
        add({ type: 'AUDIO', tick: env.tick, cue: 'cardPlay' }, env);
        break;
      }
      case 'PHASE_CHANGED': {
        add({ type: 'HUD', tick: env.tick, kind: 'phase', value: e.to }, env);
        break;
      }
      default:
        break;
    }
  }

  // Orden estable por tick de presentación (mismo input → mismo orden).
  out.sort((a, b) => a.cue.tick - b.cue.tick || 0);

  // Dedupe de cues idénticos y ADYACENTES en el mismo tick (p. ej. doble
  // SCENE OVERVIEW al cerrar la acción + ACTION_RESOLVED).
  const deduped: TimelineEntry[] = [];
  for (const entry of out) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.cue.tick === entry.cue.tick && JSON.stringify(prev.cue) === JSON.stringify(entry.cue)) continue;
    deduped.push(entry);
  }

  const startTick = deduped.length > 0 ? deduped[0].cue.tick : (events[0]?.tick ?? 0);
  const endTick = deduped.length > 0 ? deduped[deduped.length - 1].cue.tick : startTick;
  return { startTick, endTick, entries: deduped };
}

function profileOf(action: ActionState | null): { action: string | null; fidelity: string } {
  return action ? { action: action.action.id, fidelity: action.action.fidelity } : { action: null, fidelity: 'NONE' };
}

/**
 * Resolución de orientación (facing V9): todos los sprites canónicos miran
 * a la DERECHA. El actor mira al target: jugador (izquierda) → scaleX 1 ·
 * enemigo (derecha) → scaleX −1. Nunca assets duplicados para izquierda.
 */
export function resolveFacing(actor: BattleSide): { actorScaleX: number; targetScaleX: number } {
  return { actorScaleX: actor === 'player' ? 1 : -1, targetScaleX: actor === 'player' ? -1 : 1 };
}

export type { BattlePosition };

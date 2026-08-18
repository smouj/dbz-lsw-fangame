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
import { STAGE_PREP_BEATS } from '../clock/clock';
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
  startTick: number;
  /** Stage (kind command): ticks de preparación antes del QTE interactivo. */
  prepTicks: number | null;
}

/** Duración por defecto de una pose (ticks GBC) hasta el siguiente beat. */
const POSE_HOLD = 8;

export function buildPresentationTimeline(input: PresentationInput): BattleTimeline {
  const { events, context } = input;
  const out: TimelineEntry[] = [];
  let activeAction: ActionState | null = null;

  const other = (side: BattleSide): BattleSide => (side === 'player' ? 'enemy' : 'player');

  const add = (cue: PresentationCue, src: { event: BattleEvent; tick: number }, profileId: string | null = null, fidelity = 'NONE') => {
    out.push({ cue, logicalTick: src.tick, sourceEvent: src.event.type, profileId, fidelity });
  };

  for (const env of events) {
    const e = env.event;
    switch (e.type) {
      // ── ACCIÓN: entra la vista ACTION, secuencia del canon, vuelta ──
      case 'ACTION_STARTED': {
        const canon = canonForAction(e.action);
        activeAction = { side: e.side, action: e.action, canon, startTick: env.tick, prepTicks: null };
        const target = other(e.side);
        const mode: BattleSceneMode = e.side === 'player' ? 'PLAYER_ACTION' : 'ENEMY_ACTION';
        const special = e.action.visual === 'special' || e.action.kind === 'support';
        const bg = special && context.specialActionBackground ? context.specialActionBackground : context.actionBackground;
        add({ type: 'SCENE', tick: env.tick, durationTicks: canon.totalFrames, mode: special ? 'SPECIAL_ACTION' : mode, background: bg }, env, e.action.id, e.action.fidelity);
        add({ type: 'CAMERA', tick: env.tick, action: 'CUT' }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_VISIBILITY', tick: env.tick, role: 'ACTOR', side: e.side, visible: true }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_VISIBILITY', tick: env.tick, role: 'TARGET', side: target, visible: false }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env, e.action.id, e.action.fidelity);
        // Beats del canon (actor). Para STAGE (kind command) NO se emiten aquí:
        // las poses las controlan STAGE_PREP_STARTED (preparación) y la
        // resolución al completar el QTE (ATTACK_HIT con tick lógico real).
        if (e.action.kind !== 'command') {
          for (let i = 0; i < canon.actor.length; i++) {
            const b = canon.actor[i];
            const next = canon.actor[i + 1];
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
        // Vuelta al plano táctico
        add({ type: 'SCENE', tick: env.tick + canon.totalFrames, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_VISIBILITY', tick: env.tick + canon.totalFrames, role: 'TARGET', side: target, visible: true }, env, e.action.id, e.action.fidelity);
        add({ type: 'FIGHTER_POSE', tick: env.tick + canon.totalFrames, durationTicks: POSE_HOLD, role: 'ACTOR', side: e.side, pose: 'idle' }, env, e.action.id, e.action.fidelity);
        add({ type: 'CAMERA', tick: env.tick + canon.totalFrames, action: 'RESET' }, env, e.action.id, e.action.fidelity);
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
        // El impacto del ACTOR se ancla al beat de contacto del canon de su
        // acción (para beam/melee); para STAGE (QTE interactivo en medio) se
        // ancla al tick LÓGICO del evento (cuando se completó el QTE).
        const isStage = activeAction?.action.kind === 'command' && e.source === activeAction.side;
        const contactTick = activeAction && e.source === activeAction.side && !isStage
          ? activeAction.startTick + activeAction.canon.contactFrame
          : env.tick;
        const { action, fidelity } = profileOf(activeAction);
        add({ type: 'IMPACT', tick: contactTick, side: e.target, outcome: e.outcome }, env, action, fidelity);
        add({ type: 'FIGHTER_VISIBILITY', tick: contactTick, role: 'TARGET', side: e.target, visible: true }, env, action, fidelity);
        const pose = e.outcome === 'block' ? 'guard' : e.outcome === 'guard' ? 'evade' : 'knockback_back';
        add({ type: 'FIGHTER_POSE', tick: contactTick, durationTicks: 10, role: 'TARGET', side: e.target, pose }, env, action, fidelity);
        // Stage: la RESOLUTION CINEMATIC — el actor AVANZA al plano del rival
        // (fade → ACTION_DUEL), se para enfrente y golpea en el tick real.
        if (isStage) {
          add({ type: 'SCENE', tick: contactTick - 20, durationTicks: 30, mode: 'ACTION_DUEL', background: context.actionBackground }, env, action, fidelity);
          add({ type: 'FIGHTER_VISIBILITY', tick: contactTick - 20, role: 'TARGET', side: e.target, visible: true }, env, action, fidelity);
          add({ type: 'FIGHTER_POSE', tick: contactTick - 14, durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'move_front' }, env, action, fidelity); // approach animado
          add({ type: 'FIGHTER_POSE', tick: contactTick - 6, durationTicks: 6, role: 'ACTOR', side: e.source, pose: 'idle' }, env, action, fidelity);   // stop + idle
          add({ type: 'FIGHTER_POSE', tick: contactTick, durationTicks: 10, role: 'ACTOR', side: e.source, pose: 'attack_fwd' }, env, action, fidelity); // golpe
        }
        add({ type: 'CAMERA', tick: contactTick, action: 'IMPACT' }, env, action, fidelity);
        add({ type: 'AUDIO', tick: contactTick, cue: e.outcome === 'hit' ? 'hit' : e.outcome === 'block' ? 'block' : 'guard' }, env, action, fidelity);
        break;
      }
      case 'ATTACK_MISSED': {
        add({ type: 'IMPACT', tick: env.tick, side: e.target, outcome: 'miss' }, env);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'TARGET', side: e.target, pose: 'evade' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'dodge' }, env);
        break;
      }
      case 'DAMAGE_APPLIED': {
        if (e.amount > 0) {
          add({ type: 'HUD', tick: env.tick, kind: 'damage_number', side: e.target, value: e.amount }, env);
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
      case 'QTE_FAILED': {
        add({ type: 'HUD', tick: env.tick, kind: 'qte', value: 'failed' }, env);
        break;
      }
      case 'QTE_TIMEOUT': {
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
        if (e.action === 'DEFEND') {
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: 'player', pose: 'guard' }, env);
          add({ type: 'AUDIO', tick: env.tick, cue: 'guard' }, env);
        } else if (e.action === 'CONTINUE') {
          add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'ACTOR', side: 'player', pose: 'idle' }, env);
        }
        break;
      }

      // ── DEFENSAS / MOVIMIENTO / GATHER (overview) ──
      case 'GUARD_STARTED': {
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: POSE_HOLD, role: 'TARGET', side: e.side, pose: e.guard === 'avoid_beam' ? 'beam_guard' : 'guard' }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'guard' }, env);
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
        activeAction = { side: e.side, action: { id: 'gather_power', label: 'Gather Power', kind: 'gather', visual: 'power', fidelity: 'INFERRED' }, canon, startTick: env.tick, prepTicks: null };
        add({ type: 'SCENE', tick: env.tick, durationTicks: canon.totalFrames, mode: e.side === 'player' ? 'PLAYER_ACTION' : 'ENEMY_ACTION', background: context.actionBackground }, env);
        add({ type: 'FIGHTER_POSE', tick: env.tick, durationTicks: canon.totalFrames - 12, role: 'ACTOR', side: e.side, pose: 'gather_power' }, env);
        add({ type: 'AURA', tick: env.tick, durationTicks: canon.totalFrames - 12, role: 'ACTOR', side: e.side, variant: 'power', visible: true }, env);
        add({ type: 'AUDIO', tick: env.tick, cue: 'powerUp' }, env);
        add({ type: 'SCENE', tick: env.tick + canon.totalFrames, durationTicks: 1, mode: 'OVERVIEW', background: context.overviewBackground }, env);
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

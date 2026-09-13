// ═══════════════════════════════════════════════════════════════════════
// STANDARD_DAMAGE result splice — macros Bank30 $2F/$30/$31
// ═══════════════════════════════════════════════════════════════════════
// P0 ROM PRESENTATION → PIXI EXACT CONSUMPTION:
// El tramo de RESULTADO de la película STANDARD_DAMAGE debe reproducir los
// macros físicos ROM (romStandardDamageResultPhysical), NO una secuencia
// inventada:
//
//   $2F HIT:             slot0 actor resource seq1 → WAIT_FRAME 2
//                        slot1 target Bank61:$4030 seq $0D → seq $19
//   $30 MISS:            slot0 actor resource seq1 → WAIT_FRAME 2
//                        slot1 target Bank61:$5E20 (slot7) seq $13
//   $31 SPECIAL_DEFENSE: slot0 actor resource seq1 → WAIT_FRAME 2
//                        slot1 target Bank61:$5E20 (slot7) seq $14
//
// El actor (slot0) arranca su seq1 en el tick del branch y el macro espera a
// que llegue al frame 2; desde ese boundary el target (slot1) reproduce su(s)
// secuencia(s) Bank61. AMBOS tracks corren concurrentes (el VM no detiene al
// actor): las cues salen con tick absoluto y el renderer muestra la del tick.
// Al terminar el track más largo: APPLY_FRAME_DELTA + STOP slot0/slot1 +
// RESTORE_TACTICAL. El cleanup se ancla al FINAL VISUAL REAL de la película,
// nunca al tick del branch ni del daño lógico.
//
// Los frames del TARGET se resuelven con targetFormId (form del defensor):
// el target jamás debe mostrar los sprites del ACTOR. Con familia conocida la
// estructura temporal se conserva siempre; si el corpus físico no tiene el
// frame del form, la cue sale UNRESOLVED (nunca se fabrica una correspondencia).
// ═══════════════════════════════════════════════════════════════════════

import type { BattleTimeline, PresentationCue, TimelineEntry } from './engine/presentation/PresentationCue';
import { actionObjectBindingInstructions } from './romActionObject';
import {
  ROM_BANK61_ANIMATION_CORE,
  ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES,
} from '../data/generated/romAnimationCore.generated';
import { animationResourceById } from './animationResources';
import { resolveProductionFrame, resolveStageProductionFrame } from './productionFrameResolver';
import {
  standardDamageResultPhysical,
  type RomStandardDamagePhysicalBranch,
} from './romStandardDamageResultPhysical';

export interface StandardDamageResultSpliceOptions {
  /** Timeline compilada del profile STANDARD_DAMAGE (con ROM_RESULT_BRANCH). */
  timeline: BattleTimeline;
  /** Resource de animación de la carta (descriptor slot6 — actor). */
  actorAnimationResource: number;
  branch: RomStandardDamagePhysicalBranch;
  actorFormId: string | null;
  targetFormId: string | null;
  /** B7B1 — lado del ATACANTE (autor del film). */
  attackerSide?: 'player' | 'enemy';
  /** B7B1 — lado del DEFENSOR. */
  defenderSide?: 'player' | 'enemy';
}

function frameCueBase(
  tick: number,
  slot: 0 | 1,
  meta: { logicalTick: number; sourceEvent: string; profileId: string | null; fidelity: string },
): Pick<TimelineEntry, 'logicalTick' | 'sourceEvent' | 'profileId' | 'fidelity'> {
  return {
    logicalTick: meta.logicalTick,
    sourceEvent: meta.sourceEvent,
    profileId: meta.profileId,
    fidelity: meta.fidelity,
  };
}

function coreIndexForBase(resourceBase: number): number | null {
  const index = ROM_BANK61_ANIMATION_CORE_RESOURCE_BASES.findIndex(base => base === resourceBase);
  return index >= 0 ? index : null;
}

/**
 * Reemplaza el tramo posterior al ROM_RESULT_BRANCH de una película
 * STANDARD_DAMAGE por la coreografía física del macro ROM de la rama.
 */
export function spliceStandardDamageResult(input: StandardDamageResultSpliceOptions): BattleTimeline {
  const { timeline, actorAnimationResource, branch, actorFormId, targetFormId } = input;
  const entries = timeline.entries;
  const branchIndex = entries.findIndex(entry => entry.cue.type === 'ROM_RESULT_BRANCH');
  if (branchIndex < 0) return timeline;

  const branchEntry = entries[branchIndex];
  const branchCue = branchEntry.cue as Extract<PresentationCue, { type: 'ROM_RESULT_BRANCH' }>;
  const branchTick = branchCue.tick;
  // El splice pertenece a la MISMA película de la carta (mismo profileId /
  // logicalTick / sourceEvent que el cue del branch): los gates que filtran
  // por profile rom-card-N cuentan el film completo.
  const meta = {
    logicalTick: branchEntry.logicalTick,
    sourceEvent: branchEntry.sourceEvent,
    profileId: branchEntry.profileId,
    fidelity: branchEntry.fidelity,
  };
  const head = entries.slice(0, branchIndex + 1);

  const result = standardDamageResultPhysical(branch);
  const actorSeq = animationResourceById(actorAnimationResource)?.sequences[result.actor.sequence];
  if (!actorSeq || actorSeq.frames.length === 0) {
    // Sin frames decodificados de la seq1 del actor no hay boundary temporal
    // demostrado: conserva la película compilada (nunca inventar timing).
    return timeline;
  }

  // ── B7B1 — binding FÍSICO de slots (binder ROM £6708, contexto OFFENSE).
  // Va al INICIO del film: el binder ROM establece los slots cuando arranca la
  // acción, así que las cues de visibilidad (posteriores) siempre lo resuelven.
  // No lo decide quién ejecuta la carta: slot0 = ATTACKER, slot1 = DEFENDER.
  const filmStartTick = entries[0]?.cue.tick ?? branchTick;
  const bindEntries: TimelineEntry[] = [];
  if (input.attackerSide && input.defenderSide) {
    for (const b of actionObjectBindingInstructions('OFFENSE', {
      attacker: input.attackerSide,
      defender: input.defenderSide,
    })) {
      bindEntries.push({
        ...frameCueBase(filmStartTick, b.slot, meta),
        cue: {
          type: 'ACTION_OBJECT_BIND',
          tick: filmStartTick,
          slot: b.slot,
          role: b.role,
          fighterSide: b.fighterSide,
          context: 'OFFENSE',
          semantic: b.semantic,
        },
      });
    }
  }
  const out: TimelineEntry[] = [...bindEntries, ...head];

  // ── Draw order — ROM_STATIC_VERIFIED (B7B4): la ROM pinta SIEMPRE el objeto
  // del slot0 antes que el del slot1. `$CA39` es el registro del participante
  // ligado a slot0 y la rama bank_001:$4769 conserva slot0-primero cuando el
  // índice físico alterna. NO es `$CA39 == 2 → SLOT_0_THEN_1`.
  // Detalle: ACTION_OBJECT_DRAW_ORDER_AUTHORITY (romActionObject.ts).
  out.push({
    ...frameCueBase(branchTick, 0, meta),
    cue: { type: 'ACTION_OBJECT_DRAW_ORDER', tick: branchTick, order: 'SLOT_0_THEN_1' },
  });

  // ── slot0 (actor): seq1 de la carta, con su estructura de frames ──
  out.push({
    ...frameCueBase(branchTick, 0, meta),
    cue: { type: 'ANIMATION_START', tick: branchTick, slot: 0, resource: actorAnimationResource, sequence: result.actor.sequence },
  });
  const actorDurations: number[] = [];
  {
    let tick = branchTick;
    for (let frameIndex = 0; frameIndex < actorSeq.frames.length; frameIndex++) {
      const binding = resolveProductionFrame({
        formId: actorFormId ?? '',
        animationResource: actorAnimationResource,
        sequenceSelector: result.actor.sequence,
        frameIndex,
      });
      const duration = Math.max(1, binding.durationTicks ?? actorSeq.frames[frameIndex].durationTicks ?? 1);
      actorDurations.push(duration);
      out.push({
        ...frameCueBase(tick, 0, meta),
        cue: {
          type: 'ROM_PHYSICAL_FRAME',
          tick,
          slot: 0,
          formId: actorFormId ?? 'ROM_ACTOR_FORM_PENDING',
          resource: actorAnimationResource,
          sequence: result.actor.sequence,
          frameIndex,
          source: binding.source,
          physicalId: binding.physicalId,
          frameInstanceId: binding.frameInstanceId,
          file: binding.file,
          durationTicks: binding.durationTicks,
          offsetX: binding.offsetX,
          offsetY: binding.offsetY,
          rawOffsetX: binding.rawOffsetX,
          rawOffsetY: binding.rawOffsetY,
          visualFrameId: binding.visualFrameId,
          evidence: binding.evidence,
          fallbackReason: binding.fallbackReason,
        },
      });
      tick += duration;
    }
  }
  const actorEndTick = branchTick + actorDurations.reduce((sum, d) => sum + d, 0);

  // ── WAIT_FRAME 2: el target arranca en el boundary del frame 2 del actor ──
  const waitFrame = Math.min(2, actorDurations.length);
  const targetStartTick = branchTick + actorDurations.slice(0, waitFrame).reduce((sum, d) => sum + d, 0);
  out.push({
    ...frameCueBase(branchTick, 0, meta),
    cue: { type: 'WAIT_ANIMATION_FRAME', tick: branchTick, slot: 0, frame: waitFrame },
  });

  // ── slot1 (target): secuencias Bank61 fijas de la rama ──
  let cursor = targetStartTick;
  for (const targetSeq of result.target) {
    const coreIndex = coreIndexForBase(targetSeq.resourceBase);
    const coreSeq = coreIndex != null
      ? ROM_BANK61_ANIMATION_CORE[coreIndex]?.sequences.find(seq => seq.selector === targetSeq.sequence)
      : null;
    const frames = coreSeq?.frames ?? [];
    if (frames.length === 0) continue;
    out.push({
      ...frameCueBase(cursor, 1, meta),
      cue: {
        type: 'ANIMATION_START',
        tick: cursor,
        slot: 1,
        resource: coreIndex ?? -1,
        sequence: targetSeq.sequence,
      },
    });
    for (const frame of frames) {
      const binding = resolveStageProductionFrame({
        formId: targetFormId ?? '',
        resourceIndex: coreIndex ?? -1,
        animationBank: 0x61,
        resourceBase: targetSeq.resourceBase,
        sequenceSelector: targetSeq.sequence,
        frameIndex: frame.frameIndex,
        visualFrameId: frame.visualFrameId,
        durationTicks: frame.durationTicks,
        offsetX: frame.offsetX,
        offsetY: frame.offsetY,
      });
      const resolved = binding?.source === 'ROM_PHYSICAL' ? binding : null;
      out.push({
        ...frameCueBase(cursor, 1, meta),
        cue: {
          type: 'ROM_PHYSICAL_FRAME',
          tick: cursor,
          slot: 1,
          formId: targetFormId ?? 'ROM_STANDARD_DAMAGE_TARGET_FORM_PENDING',
          resource: coreIndex ?? -1,
          sequence: targetSeq.sequence,
          frameIndex: frame.frameIndex,
          source: resolved?.source ?? 'UNRESOLVED',
          physicalId: resolved?.physicalId ?? null,
          frameInstanceId: resolved?.frameInstanceId ?? `bank61-r${coreIndex}-s${targetSeq.sequence}-f${frame.frameIndex}`,
          file: resolved?.file ?? null,
          durationTicks: resolved?.durationTicks ?? frame.durationTicks,
          offsetX: resolved?.offsetX ?? frame.offsetX,
          offsetY: resolved?.offsetY ?? frame.offsetY,
          rawOffsetX: frame.offsetX < 0 ? frame.offsetX + 256 : frame.offsetX,
          rawOffsetY: frame.offsetY < 0 ? frame.offsetY + 256 : frame.offsetY,
          visualFrameId: frame.visualFrameId,
          evidence: [
            'ROM_STANDARD_DAMAGE_RESULT_BANK61',
            `bank=0x61`,
            `resourceBase=0x${targetSeq.resourceBase.toString(16)}`,
            `resourceIndex=${coreIndex}`,
            `sequence=${targetSeq.sequence}`,
            `frame=${frame.frameIndex}`,
            `branch=${branch}`,
            ...(resolved?.evidence ?? []),
          ],
          fallbackReason: resolved?.fallbackReason ?? null,
        },
      });
      cursor += Math.max(1, frame.durationTicks);
    }
  }

  // ── Cleanup anclado al final visual real (P0.13) ──
  const endTick = Math.max(actorEndTick, cursor);
  out.push({ ...frameCueBase(endTick, 0, meta), cue: { type: 'APPLY_FRAME_DELTA', tick: endTick, slot: 0 } });
  out.push({ ...frameCueBase(endTick, 0, meta), cue: { type: 'ACTION_OBJECT_STOP', tick: endTick, slot: 0 } });
  out.push({ ...frameCueBase(endTick, 1, meta), cue: { type: 'ACTION_OBJECT_STOP', tick: endTick, slot: 1 } });
  out.push({
    ...frameCueBase(endTick, 0, meta),
    cue: { type: 'SCENE_LOAD', tick: endTick, vramLoad: '$8E00', mode: 'RESTORE_TACTICAL' },
  });

  return { ...timeline, startTick: timeline.startTick, endTick, entries: out };
}

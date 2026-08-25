// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ACTION TRACE INSPECTOR (P0.4)
// ═══════════════════════════════════════════════════════════════════════
// Cierra la cadena de observabilidad hasta el FRAME:
//
//   rol semántico (FIGHTER_POSE)
//     → secuencia física resuelta (resolveCharacterVisualSequence)
//     → frame real (manifest file)
//     → frame ROM (visualFrameId / metasprite)
//     → clasificación (F-MAP 7-way)
//     → razón de fallback (si cae fuera de ROM)
//
// PURO, determinista, sin React/Pixi/DOM. Alimenta el Combat Lab
// (Action Trace Inspector) y verify:combat-observability.
// ═══════════════════════════════════════════════════════════════════════

import {
  runGoldenAction,
  GOLDEN_ACTIONS,
  type GoldenActionId,
  type RuntimeActionTrace,
  type PoseCueRef,
} from './combatTrace';
import {
  resolveCharacterVisualSequence,
  type ResolvedVisualSequence,
  type FrameMapping,
} from './characterFrameMap';
import type { BattleSide } from './engine/state/BattleState';
import { getCard } from '../data/cards';
import { romPresentationProfileForCard } from './romPresentationProfiles';
import { animationResourceById } from './animationResources';
import { romFrameView } from './animationStudio';

/** Un escalón de la cadena rol → frame → ROM → clasificación → fallback. */
export interface FrameChainStep {
  tick: number;
  role: string;
  side: BattleSide;
  /** Pose canónica (nombre de pose del manifest). */
  pose: string;
  /** Forma física que reproduce el rol en ese lado. */
  formId: string;
  sequence: ResolvedVisualSequence;
  /** Razón de fallback (null si la pose se resuelve ROM/EXACT/CANONICAL). */
  fallbackReason: string | null;
}

export interface ActionTraceInspection {
  presetId: GoldenActionId;
  label: string;
  trace: RuntimeActionTrace;
  chains: FrameChainStep[];
  /** Cadena ROM (solo cartas ROM-backed): recurso → poses de manifest → F-MAP. */
  romChain: RomResourceChain[];
}

/** Un recurso ROM de la carta y las poses de manifest a las que mapea. */
export interface RomResourceChain {
  resourceId: number;
  resourceHex: string;
  sourceTechnique: string | null;
  sequenceCount: number;
  frameCount: number;
  /** Poses de manifest distintas que el recurso alimenta (con su F-MAP). */
  poses: Array<{ pose: string; index: number | null; classification: FrameMapping; source: string; romFrames: number }>;
}

/** Razón de fallback de una pose resuelta (honesta, nunca inventa). */
function fallbackReasonFor(seq: ResolvedVisualSequence, cardFallback: string | null): string | null {
  switch (seq.source) {
    case 'ROM_DERIVED': return null;
    case 'FALLBACK': return 'NO_FRAMES_FOR_POSE';
    case 'COMPOSITE': return 'COMPOSITE:REUSES_OTHER_FAMILY';
    case 'CANONICAL': return null; // SHARED_PHYSICAL / CANONICAL_PHYSICAL no es fallback
    case 'REFERENCE_FX': return null; // FX legítimo, no fallback
    case 'UNRESOLVED': return cardFallback ?? 'UNRESOLVED:NO_ROM_NO_CANONICAL';
    default: return null;
  }
}

/**
 * Inspecciona UNA golden action hasta el nivel de frame. Cada FIGHTER_POSE
 * del timeline legado se resuelve contra el F-MAP con su forma física
 * (attacker → playerFormId, defender → enemyFormId). Para cartas ROM-backed
 * añade la cadena ROM (recurso → poses de manifest → clasificación).
 */
export function inspectGoldenAction(id: GoldenActionId): ActionTraceInspection {
  const trace = runGoldenAction(id);
  const preset = GOLDEN_ACTIONS.find(p => p.id === id) ?? GOLDEN_ACTIONS[0];
  const cardFallback = trace.cardTrace?.fallbackReason ?? null;

  const seen = new Set<string>();
  const chains: FrameChainStep[] = [];
  for (const cue of trace.poseCues) {
    const formId = cue.side === 'player' ? preset.playerFormId : preset.enemyFormId;
    const key = `${cue.side}:${cue.pose}`;
    // Dedupe por (side, pose): una secuencia física es la unidad de inspección.
    if (seen.has(key)) continue;
    seen.add(key);
    const sequence = resolveCharacterVisualSequence({ formId, semanticRole: cue.pose });
    chains.push({
      tick: cue.tick,
      role: cue.role,
      side: cue.side,
      pose: cue.pose,
      formId,
      sequence,
      fallbackReason: fallbackReasonFor(sequence, cardFallback),
    });
  }

  // Cadena ROM: solo para cartas con recurso de animación ROM-backed.
  const romChain: RomResourceChain[] = [];
  if (preset.cardId != null) {
    const card = getCard(preset.cardId);
    if (card && trace.romBacked) {
      const profile = romPresentationProfileForCard(card);
      const resourceId = profile.dependencies.animationResource;
      if (resourceId != null) {
        const catalog = animationResourceById(resourceId);
        // Only push romChain when the catalog is decoded and has frames.
        // romBacked=true means a compiled route exists, but an empty catalog
        // (resource not yet decoded) should not produce an empty romChain entry.
        if (catalog && catalog.sequences.length > 0) {
        const poseMap = new Map<string, { pose: string; index: number | null; classification: FrameMapping; source: string; romFrames: number }>();
        let frameCount = 0;
          for (let si = 0; si < catalog.sequences.length; si++) {
            const seq = catalog.sequences[si];
            for (let fi = 0; fi < seq.frames.length; fi++) {
              frameCount++;
              const v = romFrameView(preset.playerFormId, resourceId, si, fi);
              if (v?.manifestPose) {
                const entry = poseMap.get(v.manifestPose);
                if (entry) {
                  entry.romFrames++;
                } else {
                  poseMap.set(v.manifestPose, {
                    pose: v.manifestPose,
                    index: v.manifestIndex,
                    classification: v.classification ?? 'UNRESOLVED',
                    source: v.fmap?.source ?? 'UNRESOLVED',
                    romFrames: 1,
                  });
                }
              }
            }
          }
        romChain.push({
          resourceId,
          resourceHex: profile.dependencies.animationResourceHex ?? `$${resourceId.toString(16).padStart(2, '0')}`,
          sourceTechnique: catalog?.sourceTechnique ?? null,
          sequenceCount: catalog?.sequences.length ?? 0,
          frameCount,
          poses: [...poseMap.values()],
        });
        } // end if (catalog && catalog.sequences.length > 0)
      }
    }
  }

  return { presetId: id, label: preset.label, trace, chains, romChain };
}

/** Lista de acciones golden con conteo de cadenas + fallbacks (para el Lab). */
export function goldenActionInspectorSummary() {
  return GOLDEN_ACTIONS.map(p => {
    const { chains } = inspectGoldenAction(p.id);
    return {
      id: p.id,
      label: p.label,
      chainCount: chains.length,
      fallbackCount: chains.filter(c => c.fallbackReason != null).length,
      unresolvedPoses: chains.filter(c => c.sequence.classification === 'UNRESOLVED').map(c => c.pose),
    };
  });
}

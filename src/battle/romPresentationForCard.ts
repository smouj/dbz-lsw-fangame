// ═══════════════════════════════════════════════════════════════════════
// C1.0 — romPresentationForCard
// ═══════════════════════════════════════════════════════════════════════
// Punto de entrada card-level para el puente de producción: dado un CardDef
// (sin BattleEventLog — la lógica de batalla ya resolvió el resultado antes),
// compila el timeline ROM de su presentación. Devuelve ruta para las familias
// con programa ROM maduro (BEAM/STANDARD/PROJECTILE/SPECIAL_HANDLER) y Support
// especial por su propio compilador SUPPORT_SPECIAL. El resto → null
// → el llamador cae a LEGACY (fallback honesto).
//
// NO resuelve el outcome (outcome plumbing pendiente — directiva C1.0 §5):
// el canary demuestra la secuencia visible (scene/motion/FX), no la rama de
// resultado (HIT/MISS/SPECIAL), que se enrutará cuando el Engine exponga el
// resultado autoritativo.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../data/cards';
import type { BattleSide } from './engine/state/BattleState';
import type { BattleTimeline } from './engine/presentation/PresentationCue';
import { romPresentationProfileForCard, type RomPresentationProfile } from './romPresentationProfiles';
import { compileRomPresentationProfile } from './romPresentationCompiler';
import { resolveRomSequenceSelector } from './romSequenceSelectors';
import { romStagePresentationForCard } from './romStagePresentation';
import { supportSpecialCutover } from './supportRomCutover';

export type RomPresentationRouteKind = 'BEAM_BASE' | 'STANDARD_DAMAGE' | 'BEAM_VARIANT' | 'PROJECTILE_SCROLL' | 'SPECIAL_HANDLER' | 'SUPPORT_SPECIAL' | 'STAGE_COMMAND';

const BRIDGE_ELIGIBLE_KINDS: ReadonlySet<RomPresentationProfile['kind']> = new Set([
  'BEAM_BASE',
  'STANDARD_DAMAGE',
  'BEAM_VARIANT',
  'PROJECTILE_SCROLL',
  'SPECIAL_HANDLER',
]);

export interface RomPresentationRoute {
  cardId: number;
  kind: RomPresentationRouteKind;
  profile: RomPresentationProfile;
  timeline: BattleTimeline;
  pendingCues: number;
}

export function romPresentationTimelineForCard(
  card: CardDef,
  side: BattleSide,
  actorFormId?: string | null,
): RomPresentationRoute | null {
  const profile = romPresentationProfileForCard(card);
  const stage = romStagePresentationForCard({
    card,
    side,
    actorFormId: actorFormId ?? null,
    startTick: 0,
  });
  if (stage) {
    return {
      cardId: card.id,
      kind: 'STAGE_COMMAND',
      profile,
      timeline: stage.timeline,
      pendingCues: stage.pendingCues,
    };
  }

  // Support especial ($0B/$0D/$0F) usa su propio compilador (V7.3). Gana SIEMPRE
  // sobre el bridge genérico: hay cards de soporte que comparten handler con un
  // special de ataque (p.ej. $0B/$0D) y cuyo profile.kind es SPECIAL_HANDLER,
  // pero su presentación correcta es SUPPORT_SPECIAL, no la ruta de ataque.
  const support = supportSpecialCutover(card.id, {});
  if (support) {
    return {
      cardId: card.id,
      kind: 'SUPPORT_SPECIAL',
      profile,
      timeline: support.timeline,
      pendingCues: support.timeline.entries.filter(en => en.cue.type === 'ROM_PENDING').length,
    };
  }
  if (!BRIDGE_ELIGIBLE_KINDS.has(profile.kind)) {
    return null;
  }
  const selector = resolveRomSequenceSelector({
    cardId: card.id,
    formId: actorFormId ?? null,
    animationResource: profile.dependencies.animationResource,
  });

  const compiled = compileRomPresentationProfile(profile, {
    startTick: 0,
    actorSide: side,
    actorFormId: actorFormId ?? null,
    sequenceSelector: selector.sequence,
    sourceEvent: 'ACTION_STARTED',
    selectedResultFamily: null,
    selectedResultSourceEvent: null,
  });

  const pendingCues = compiled.timeline.entries.filter(en => en.cue.type === 'ROM_PENDING').length;
  const unresolvedPhysical = compiled.timeline.entries.some(en =>
    en.cue.type === 'ROM_PHYSICAL_FRAME' && en.cue.source === 'UNRESOLVED'
  );
  if (unresolvedPhysical) {
    return null;
  }

  return {
    cardId: card.id,
    kind: profile.kind as RomPresentationRouteKind,
    profile,
    timeline: compiled.timeline,
    pendingCues,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// C1.0 — romPresentationForCard
// ═══════════════════════════════════════════════════════════════════════
// Punto de entrada card-level para el puente de producción: dado un CardDef
// (sin BattleEventLog — la lógica de batalla ya resolvió el resultado antes),
// compila el timeline ROM de su presentación. Solo devuelve ruta para las
// familias con programa ROM maduro (BEAM_BASE $02 · STANDARD_DAMAGE $0A) y
// Support especial por su propio compilador SUPPORT_SPECIAL. El resto → null
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
import { supportSpecialCutover } from './supportRomCutover';

export type RomPresentationRouteKind = 'BEAM_BASE' | 'STANDARD_DAMAGE' | 'BEAM_VARIANT' | 'PROJECTILE_SCROLL' | 'SUPPORT_SPECIAL';

const BRIDGE_ELIGIBLE_KINDS: ReadonlySet<RomPresentationProfile['kind']> = new Set([
  'BEAM_BASE',
  'STANDARD_DAMAGE',
  'BEAM_VARIANT',
  'PROJECTILE_SCROLL',
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
  if (!BRIDGE_ELIGIBLE_KINDS.has(profile.kind)) {
    // Support especial ($0B/$0D/$0F) usa su propio compilador (V7.3).
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

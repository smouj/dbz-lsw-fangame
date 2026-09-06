// ═══════════════════════════════════════════════════════════════════════
// C1.0 — romPresentationForCard
// ═══════════════════════════════════════════════════════════════════════
// Punto de entrada card-level para el puente de producción: dado un CardDef
// (sin BattleEventLog — la lógica de batalla ya resolvió el resultado antes),
// compila el timeline ROM de su presentación. Devuelve ruta para las familias
// con programa ROM maduro (BEAM/STANDARD/PROJECTILE/SPECIAL_HANDLER), Support
// especial por su propio compilador SUPPORT_SPECIAL (V7.3) y las 11 Defense
// Cards por su cutover DEFENSE_RULE (V7.7, §62 DEFENSE_ROM_RULES). El resto → null
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
import { supportSpecialCutover, supportFieldEffectCutover } from './supportRomCutover';
import { compileDefenseRomCutover } from './defenseRomCutover';
import { actionDescriptorForCard } from './engine/commands/buildActionDescriptor';
import { withStaticDefenderEntrance } from './staticActionVisibility';

export type RomPresentationRouteKind = 'BEAM_BASE' | 'STANDARD_DAMAGE' | 'BEAM_VARIANT' | 'PROJECTILE_SCROLL' | 'SPECIAL_HANDLER' | 'SUPPORT_SPECIAL' | 'SUPPORT_FIELD_EFFECT' | 'DEFENSE_RULE' | 'STAGE_COMMAND';

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
      timeline: withStaticDefenderEntrance(stage.timeline, actionDescriptorForCard(card), side),
      pendingCues: stage.pendingCues,
    };
  }

  // Support worker ($0B/$0D/$0F) usa su propio compilador (V7.3). Gana SIEMPRE
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
      pendingCues: support.pendingCues,
    };
  }
  // Support field-effect ($00/$02, V8): compilación plana del profile V6.8
  // (BG $19 + HOLD120). Mismo criterio honesto que el worker: las cards
  // type 'support' comparten handler con beams ($02) pero NUNCA enrutan por
  // el bridge de ataque (guardrail §205 beamBaseRomCutover). Las Defense
  // Cards con DEFENSE_ROM_RULES se excluyen en la elegibilidad (van por
  // DEFENSE_RULE, §62). #9 "Special Card" (type special, kind NONE) queda
  // LEGACY por el mismo criterio (no es type 'support').
  const fieldEffect = supportFieldEffectCutover(card.id);
  if (fieldEffect) {
    return {
      cardId: card.id,
      kind: 'SUPPORT_FIELD_EFFECT',
      profile,
      timeline: fieldEffect.timeline,
      pendingCues: fieldEffect.pendingCues,
    };
  }
  // Defense (§62 DEFENSE_ROM_RULES): las 11 Defense Cards enrutan por su cutover
  // (V7.7) ANTES del bridge genérico — su profile.kind es DEFENSE_RULE (no
  // elegible por el bridge) y su presentación NO es una acción de ataque: la
  // ofensiva entrante la consume (CA83 → CA53). El timeline sale del perfil
  // V7.6 (DEFENSE_FX 30t + ROM_WAIT/ROM_PENDING/SUPPORT_MACRO según slot8).
  // Criterio honesto (análogo al bridge con unresolvedPhysical): si el perfil
  // dependiera de frames físicos UNRESOLVED no se inventaría ruta — las cues
  // de defensa no contienen ROM_PHYSICAL_FRAME, así que compilan siempre; los
  // ROM_PENDING se cuentan y se reportan (nunca se silencian).
  const defense = compileDefenseRomCutover(card.id, { side });
  if (defense) {
    return {
      cardId: card.id,
      kind: 'DEFENSE_RULE',
      profile,
      timeline: defense.timeline,
      pendingCues: defense.pendingCues,
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
  const timeline = ['STANDARD_DAMAGE', 'BEAM_BASE', 'BEAM_VARIANT', 'PROJECTILE_SCROLL'].includes(profile.kind)
    ? withStaticDefenderEntrance(compiled.timeline, actionDescriptorForCard(card), side)
    : compiled.timeline;

  const pendingCues = timeline.entries.filter(en => en.cue.type === 'ROM_PENDING').length;
  const unresolvedPhysical = timeline.entries.some(en =>
    en.cue.type === 'ROM_PHYSICAL_FRAME' && en.cue.source === 'UNRESOLVED'
  );
  if (unresolvedPhysical) {
    return null;
  }

  return {
    cardId: card.id,
    kind: profile.kind as RomPresentationRouteKind,
    profile,
    timeline,
    pendingCues,
  };
}

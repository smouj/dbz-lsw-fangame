// ═══════════════════════════════════════════════════════════════════════
// M4 — buildActionDescriptor: describe QUÉ acción empezó/resolvió.
// ═══════════════════════════════════════════════════════════════════════
// Datos planos y serializables para ACTION_STARTED / ACTION_RESOLVED.
// Se construye desde la carta REAL (catálogo) y el registro de perfiles
// firma — nunca desde nombres escritos a mano en la presentación.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../../../data/cards';
import { resolveActionProfile, actionSemanticsForCard } from '../../actionProfiles';
import type { BattleActionDescriptor } from '../events/BattleEvent';

/** Descriptor de una carta jugada (stage/damage/beam/support). */
export function actionDescriptorForCard(card: CardDef | null): BattleActionDescriptor {
  if (!card) {
    return { id: 'unknown', label: 'Unknown', kind: 'damage', visual: 'rush', fidelity: 'PLACEHOLDER' };
  }
  const profile = resolveActionProfile(card.name);
  const sem = actionSemanticsForCard(card);
  const kind: BattleActionDescriptor['kind'] =
    sem.animation === 'stage' ? 'command'
    : sem.animation === 'melee' ? 'damage'
    : sem.animation === 'beam' ? 'beam'
    : 'support';
  return {
    id: profile?.id ?? `generic_${sem.animation}`,
    label: card.name,
    kind,
    visual: sem.visual,
    fidelity: profile?.fidelity ?? 'INFERRED',
  };
}

/** Descriptor de un Stage Attack básico (3 o 4 niveles). */
export function actionDescriptorForStage(level: 3 | 4): BattleActionDescriptor {
  return {
    id: `stage_${level}`,
    label: `${level} Stage Attack`,
    kind: 'command',
    visual: 'rush',
    fidelity: 'INFERRED',
  };
}

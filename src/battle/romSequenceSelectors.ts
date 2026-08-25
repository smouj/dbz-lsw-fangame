// ═══════════════════════════════════════════════════════════════════════
// ROM sequence selector resolution.
// ═══════════════════════════════════════════════════════════════════════
// No fallback to seq0: when the ROM selector is not proven, callers must
// surface an explicit unresolved/pending state instead of drawing a fake
// physical sequence.
// ═══════════════════════════════════════════════════════════════════════

import { ROM_BEAM_SEQUENCE_SELECTORS } from '../data/generated/romBeamSequenceSelectors.generated';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../data/generated/romPhysicalCorpus.generated';

export type RomSequenceSelectorEvidence =
  | 'BEAM_ACTOR_SELECTOR_TABLE_V4'
  | 'UNRESOLVED';

export interface RomSequenceSelectorResult {
  sequence: number | null;
  actorVisualProfileKey: number | null;
  evidence: RomSequenceSelectorEvidence;
  detail: string;
}

function formProfileKey(formId: string): number | null {
  return ROM_PHYSICAL_CORPUS_SUMMARY.forms.find(form => form.formId === formId)?.actorVisualProfileKey ?? null;
}

export function resolveRomSequenceSelector(input: {
  cardId: number;
  formId: string | null;
  animationResource: number | null;
}): RomSequenceSelectorResult {
  if (!input.formId) {
    return { sequence: null, actorVisualProfileKey: null, evidence: 'UNRESOLVED', detail: 'actor form is not known' };
  }
  if (input.animationResource == null) {
    return { sequence: null, actorVisualProfileKey: null, evidence: 'UNRESOLVED', detail: 'card has no actor AnimationResource' };
  }
  const key = formProfileKey(input.formId);
  if (key == null) {
    return { sequence: null, actorVisualProfileKey: null, evidence: 'UNRESOLVED', detail: `form ${input.formId} has no ROM physical profile` };
  }

  const row = ROM_BEAM_SEQUENCE_SELECTORS.find(selector =>
    selector.cardId === input.cardId &&
    selector.actorVisualProfileKey === key &&
    selector.animationResource === input.animationResource);
  if (row) {
    return {
      sequence: row.sequence,
      actorVisualProfileKey: key,
      evidence: 'BEAM_ACTOR_SELECTOR_TABLE_V4',
      detail: `card ${input.cardId} profile 0x${key.toString(16).padStart(2, '0')} -> seq ${row.sequence}`,
    };
  }

  return {
    sequence: null,
    actorVisualProfileKey: key,
    evidence: 'UNRESOLVED',
    detail: `no ROM selector row for card ${input.cardId}, resource 0x${input.animationResource.toString(16).padStart(2, '0')}, profile 0x${key.toString(16).padStart(2, '0')}`,
  };
}

export function romBeamConsumersForFormResource(formId: string, resourceId: number): Array<{
  cardId: number;
  cardName: string;
  sequence: number;
  actorVisualProfileKey: number;
  evidence: string;
}> {
  const key = formProfileKey(formId);
  if (key == null) return [];
  return ROM_BEAM_SEQUENCE_SELECTORS
    .filter(row => row.actorVisualProfileKey === key && row.animationResource === resourceId)
    .map(row => ({
      cardId: row.cardId,
      cardName: row.cardName,
      sequence: row.sequence,
      actorVisualProfileKey: row.actorVisualProfileKey,
      evidence: row.evidence,
    }));
}

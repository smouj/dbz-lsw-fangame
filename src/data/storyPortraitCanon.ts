// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CANONICAL PORTRAIT RESOLVER
// ═══════════════════════════════════════════════════════════════════════
// Story ROM authority is numeric portrait selection ($2B78 / Bank $6B:$7226).
// The PNG names used by the remake are semantic aliases downstream of that
// physical system. This resolver therefore preserves requested character/form
// identity and exposes provenance instead of silently substituting another form.
// ═══════════════════════════════════════════════════════════════════════

import { BATTLE_PORTRAITS } from './battlePortraits';
import {
  storyPortraitForRosterForm,
  storyPortraitUrl,
  type PortraitEmotion,
} from './storyPortraits';

export type StoryPortraitMatch =
  | 'EXACT_PHYSICAL'
  | 'BATTLE_EXACT'
  | 'SAME_IDENTITY_FALLBACK'
  | 'UNAVAILABLE';

export type StoryPortraitBindingEvidence =
  | 'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING'
  | 'ROM_EXTRACTED_BATTLE_ASSET_EXACT_FORM'
  | 'SEMANTIC_SAME_IDENTITY_FALLBACK'
  | 'UNAVAILABLE';

/** Legacy constant retained for callers that refer specifically to Story assets. */
export const STORY_PORTRAIT_BINDING_EVIDENCE: StoryPortraitBindingEvidence =
  'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING';

export interface StoryPortraitResolution {
  url?: string;
  match: StoryPortraitMatch;
  source: 'story' | 'battle' | 'none';
  evidence: StoryPortraitBindingEvidence;
  requestedCharacterId: string;
  requestedFormId?: string;
  resolvedIdentity?: string;
  resolvedFormId?: string;
  reason: string;
}

export interface StoryPortraitResolveOptions {
  /**
   * Exact Battle portrait of the same playable form is preferred over showing
   * another Story transformation. Default true.
   */
  allowBattleExact?: boolean;
  /** Same-character/base fallback. Never crosses to another character/form. */
  allowSameIdentityFallback?: boolean;
}

function token(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s-]+/g, '_');
}

function semanticRosterForm(characterId: string, formId?: string): string | undefined {
  const character = token(characterId);
  const form = token(formId);

  if (BATTLE_PORTRAITS[character]) return character;
  if (form && BATTLE_PORTRAITS[form]) return form;

  if (character === 'goku') {
    if (form === 'ssj3' || form === 'super_saiyan_3') return 'goku_ssj3';
    if (form === 'ssj2' || form === 'super_saiyan_2') return 'goku_ssj2';
    if (form === 'ssj' || form === 'super_saiyan') return 'goku_ssj';
    if (!form || form === 'base' || form === 'normal') return 'goku_base';
  }

  if (character === 'vegeta') {
    if (form === 'majin') return 'vegeta_majin';
    if (form === 'ssj' || form === 'super_saiyan') return 'vegeta_ssj';
    if (!form || form === 'base' || form === 'normal') return 'vegeta_base';
  }

  if (character === 'gohan' || character === 'gohan_kid' || character === 'gohan_young') {
    if (form === 'ssj2' || form === 'super_saiyan_2') return 'gohan_young_ssj2';
    if (form === 'ssj' || form === 'super_saiyan') return 'gohan_young_ssj';
    if (!form || form === 'base' || form === 'normal' || form === 'young') return 'gohan_young';
  }

  if (character === 'gohan_adult') {
    if (form === 'ultimate') return 'gohan_adult_ultimate';
    if (form === 'ssj2' || form === 'super_saiyan_2') return 'gohan_adult_ssj2';
    if (form === 'ssj' || form === 'super_saiyan') return 'gohan_adult_ssj';
  }

  if (character === 'trunks_kid') {
    if (form === 'ssj' || form === 'kid_ssj' || form === 'super_saiyan') return 'trunks_kid_ssj';
    return 'trunks_kid';
  }
  if (character === 'trunks_future' || character === 'trunks') {
    if (form === 'ssj' || form === 'future_ssj' || form === 'super_saiyan') return 'trunks_ssj';
    return 'trunks_future';
  }

  if (character === 'goten') {
    if (form === 'ssj' || form === 'super_saiyan') return 'goten_ssj';
    return 'goten_base';
  }
  if (character === 'gotenks') {
    if (form === 'ssj3' || form === 'super_saiyan_3') return 'gotenks_ssj3';
    if (form === 'ssj' || form === 'super_saiyan') return 'gotenks_ssj';
  }

  if (character === 'piccolo') {
    if (form === 'kami') return 'piccolo_kami';
    if (form === 'evil') return 'piccolo_evil';
    return 'piccolo_base';
  }

  if (character === 'cell_imperfect') return 'cell_imperfect';
  if (character === 'cell_semi' || character === 'cell_semi_perfect') return 'cell_semi';
  if (character === 'cell' || character === 'cell_perfect') return 'cell_perfect';

  if (character === 'ginyu_goku') return 'ginyu_goku';
  if (character === 'ginyu') return 'ginyu';

  if (character === 'buu' || character === 'buu_base' || character === 'fat_buu') return 'buu_base';
  if (character === 'buu_super' || character === 'super_buu' || character === 'majin_buu') return 'buu_super';
  if (character === 'buu_gotenks') return 'buu_gotenks';
  if (character === 'buu_gohan') return 'buu_gohan';
  if (character === 'buu_kid' || character === 'kid_buu') return 'buu_kid';

  return undefined;
}

function exactStoryResolution(
  characterId: string,
  formId: string | undefined,
  emotion: PortraitEmotion | undefined,
): StoryPortraitResolution | undefined {
  const rosterForm = semanticRosterForm(characterId, formId);
  if (rosterForm) {
    const url = storyPortraitForRosterForm(rosterForm, emotion);
    if (url) {
      return {
        url,
        match: 'EXACT_PHYSICAL',
        source: 'story',
        evidence: 'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING',
        requestedCharacterId: characterId,
        requestedFormId: formId,
        resolvedIdentity: token(characterId),
        resolvedFormId: rosterForm,
        reason: `Verified physical Story portrait for exact roster form ${rosterForm}.`,
      };
    }
  }

  const url = storyPortraitUrl(characterId, formId, emotion);
  if (!url) return undefined;
  return {
    url,
    match: 'EXACT_PHYSICAL',
    source: 'story',
    evidence: 'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING',
    requestedCharacterId: characterId,
    requestedFormId: formId,
    resolvedIdentity: token(characterId),
    resolvedFormId: rosterForm,
    reason: formId
      ? 'Verified Story asset matches the requested semantic identity/form.'
      : 'Verified Story asset matches the requested semantic identity.',
  };
}

export function resolveCanonicalStoryPortrait(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
  options: StoryPortraitResolveOptions = {},
): StoryPortraitResolution {
  const exactStory = exactStoryResolution(characterId, formId, emotion);
  if (exactStory) return exactStory;

  const rosterForm = semanticRosterForm(characterId, formId);
  if ((options.allowBattleExact ?? true) && rosterForm) {
    const battle = BATTLE_PORTRAITS[rosterForm];
    if (battle) {
      return {
        url: battle,
        match: 'BATTLE_EXACT',
        source: 'battle',
        evidence: 'ROM_EXTRACTED_BATTLE_ASSET_EXACT_FORM',
        requestedCharacterId: characterId,
        requestedFormId: formId,
        resolvedIdentity: token(characterId),
        resolvedFormId: rosterForm,
        reason: `No dedicated Story portrait exists for ${rosterForm}; using the exact Battle portrait of the same form.`,
      };
    }
  }

  if (options.allowSameIdentityFallback) {
    const fallback = storyPortraitUrl(characterId, undefined, emotion);
    if (fallback) {
      return {
        url: fallback,
        match: 'SAME_IDENTITY_FALLBACK',
        source: 'story',
        evidence: 'SEMANTIC_SAME_IDENTITY_FALLBACK',
        requestedCharacterId: characterId,
        requestedFormId: formId,
        resolvedIdentity: token(characterId),
        reason: 'No exact form portrait exists; caller explicitly allowed same-identity Story fallback.',
      };
    }
  }

  return {
    match: 'UNAVAILABLE',
    source: 'none',
    evidence: 'UNAVAILABLE',
    requestedCharacterId: characterId,
    requestedFormId: formId,
    resolvedIdentity: token(characterId),
    resolvedFormId: rosterForm,
    reason: rosterForm
      ? `No exact Story/Battle portrait could be resolved for ${rosterForm}.`
      : 'No physically verified portrait mapping exists for the requested identity.',
  };
}

/** Compatibility wrapper for existing Story UI consumers. */
export function canonicalStoryPortraitUrl(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  return resolveCanonicalStoryPortrait(characterId, formId, emotion).url;
}

export function hasCanonicalStoryPortrait(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): boolean {
  return resolveCanonicalStoryPortrait(characterId, formId, emotion).match !== 'UNAVAILABLE';
}

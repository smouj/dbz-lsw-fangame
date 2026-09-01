import { BATTLE_PORTRAITS } from './battlePortraits';
import { resolveSpeakerPortraitAsset } from './speakerPortraits';
import { storyPortraitForRosterForm } from './storyPortraits';

export type RosterPortraitSource = 'story' | 'battle' | 'menu' | 'none';
export type RosterPortraitFidelity = 'EXACT_FORM' | 'IDENTITY_FALLBACK' | 'UNAVAILABLE';

export interface RosterPortraitAsset {
  url?: string;
  source: RosterPortraitSource;
  fidelity: RosterPortraitFidelity;
  requestedCharacterId: string;
  requestedFormId: string;
  reason: string;
}

/**
 * Canonical portrait policy for roster/setup cards:
 * 1. verified Story portrait of this exact form;
 * 2. exact Battle portrait of this same form;
 * 3. identity-only fallback only for non-roster/unknown identities;
 * 4. never show another transformation as if it were exact.
 */
export function rosterPortraitAsset(characterId: string, formId: string): RosterPortraitAsset {
  const story = storyPortraitForRosterForm(formId);
  if (story) {
    return {
      url: story,
      source: 'story',
      fidelity: 'EXACT_FORM',
      requestedCharacterId: characterId,
      requestedFormId: formId,
      reason: `Verified physical Story portrait for exact form ${formId}.`,
    };
  }

  const battle = BATTLE_PORTRAITS[formId];
  if (battle) {
    return {
      url: battle,
      source: 'battle',
      fidelity: 'EXACT_FORM',
      requestedCharacterId: characterId,
      requestedFormId: formId,
      reason: `No dedicated Story portrait exists; using exact Battle portrait for ${formId}.`,
    };
  }

  const fallback = resolveSpeakerPortraitAsset(characterId);
  if (fallback.url) {
    return {
      url: fallback.url,
      source: fallback.source,
      fidelity: 'IDENTITY_FALLBACK',
      requestedCharacterId: characterId,
      requestedFormId: formId,
      reason: `No exact form portrait exists for ${formId}; using identity-only fallback for ${characterId}.`,
    };
  }

  return {
    source: 'none',
    fidelity: 'UNAVAILABLE',
    requestedCharacterId: characterId,
    requestedFormId: formId,
    reason: `No verified portrait exists for ${characterId}/${formId}.`,
  };
}

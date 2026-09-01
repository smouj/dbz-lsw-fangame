import { BATTLE_PORTRAITS } from './battlePortraits';
import { resolveSpeakerPortrait } from './speakerPortraits';
import { storyPortraitForRosterForm } from './storyPortraits';

export type RosterPortraitSource = 'story' | 'battle' | 'menu';

export interface RosterPortraitAsset {
  url?: string;
  source: RosterPortraitSource;
}

/**
 * Portrait policy for roster/setup cards:
 * 1. a physically verified Story portrait of this exact form;
 * 2. the exact 32×24 Battle portrait for the form;
 * 3. the canonical speaker/menu fallback for identities outside the roster.
 *
 * This prevents a missing Story variant (SSJ2/SSJ3, absorptions, etc.) from
 * being presented as a different transformation in character selection UI.
 */
export function rosterPortraitAsset(characterId: string, formId: string): RosterPortraitAsset {
  const story = storyPortraitForRosterForm(formId);
  if (story) return { url: story, source: 'story' };

  const battle = BATTLE_PORTRAITS[formId];
  if (battle) return { url: battle, source: 'battle' };

  return { url: resolveSpeakerPortrait(characterId, formId), source: 'menu' };
}

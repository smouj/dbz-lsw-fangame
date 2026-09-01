import {
  resolveBattlePortraitStrict,
  resolveMenuPortrait,
  resolveStoryPortraitStrict,
  type BattlePortraitResolution,
  type MenuPortraitResolution,
  type StoryPortraitResolution,
} from './portraitResolvers';

/**
 * Dev/diagnostic aggregate only. Production must ask a domain-specific resolver
 * directly; this object never chooses one portrait on behalf of a consumer.
 */
export interface RosterPortraitDiagnostics {
  characterId: string;
  formId: string;
  story: StoryPortraitResolution;
  battle: BattlePortraitResolution;
  menu: MenuPortraitResolution;
}

export function rosterPortraitDiagnostics(
  characterId: string,
  formId: string,
): RosterPortraitDiagnostics {
  return {
    characterId,
    formId,
    story: resolveStoryPortraitStrict(characterId, formId),
    battle: resolveBattlePortraitStrict(formId),
    menu: resolveMenuPortrait(characterId),
  };
}

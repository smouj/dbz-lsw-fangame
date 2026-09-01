// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — SPEAKER PORTRAIT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════
// Dialogue and Stage/QTE share this resolver. Exact form identity always wins:
// Story exact → Battle exact same form → menu identity only when no explicit
// form-specific physical portrait is required.
// ═══════════════════════════════════════════════════════════════════════

import {
  resolveCanonicalStoryPortrait,
  type StoryPortraitMatch,
} from './storyPortraitCanon';
import { MENU_PORTRAITS } from './icons';

export type SpeakerPortraitSource = 'story' | 'battle' | 'menu' | 'none';

export interface SpeakerPortraitAsset {
  url?: string;
  source: SpeakerPortraitSource;
  match: StoryPortraitMatch | 'MENU_IDENTITY';
  requestedCharacterId: string;
  requestedFormId?: string;
  reason: string;
}

export function resolveSpeakerPortraitAsset(
  charId: string,
  formId?: string,
): SpeakerPortraitAsset {
  const physical = resolveCanonicalStoryPortrait(charId, formId);
  if (physical.url) {
    return {
      url: physical.url,
      source: physical.source,
      match: physical.match,
      requestedCharacterId: charId,
      requestedFormId: formId,
      reason: physical.reason,
    };
  }

  // Menu portraits are identity-level artwork, not form evidence. They are safe
  // only when no explicit form was requested (NPC/speaker identity fallback).
  if (!formId) {
    const menu = MENU_PORTRAITS[charId];
    if (menu) {
      return {
        url: menu,
        source: 'menu',
        match: 'MENU_IDENTITY',
        requestedCharacterId: charId,
        reason: 'No Story/Battle form was requested; using canonical menu identity portrait.',
      };
    }
  }

  return {
    source: 'none',
    match: 'UNAVAILABLE',
    requestedCharacterId: charId,
    requestedFormId: formId,
    reason: physical.reason,
  };
}

/** Compatibility wrapper for existing UI consumers. */
export function resolveSpeakerPortrait(charId: string, formId?: string): string | undefined {
  return resolveSpeakerPortraitAsset(charId, formId).url;
}

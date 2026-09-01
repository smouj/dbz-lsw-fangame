// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CANONICAL STORY PORTRAIT RESOLVER
// ═══════════════════════════════════════════════════════════════════════
// Production Story is domain-strict. A requested form may fall back to another
// expression of that same exact form, but never to another transformation and
// never to Battle/Menu assets.
// ═══════════════════════════════════════════════════════════════════════

import { resolveStoryPortraitStrict } from './portraitResolvers';
import type { PortraitEmotion } from './storyPortraits';

export type StoryPortraitBindingEvidence = 'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING';
export const STORY_PORTRAIT_BINDING_EVIDENCE: StoryPortraitBindingEvidence =
  'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING';

/**
 * Backwards-compatible Story-only URL surface for narrative projection.
 * Missing exact forms deliberately return undefined.
 */
export function canonicalStoryPortraitUrl(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  return resolveStoryPortraitStrict(characterId, formId, emotion).url;
}

export function hasCanonicalStoryPortrait(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): boolean {
  return resolveStoryPortraitStrict(characterId, formId, emotion).status !== 'MISSING';
}

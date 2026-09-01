// ═══════════════════════════════════════════════════════════════════════
// Story speaker portraits — PRODUCTION STORY DOMAIN ONLY
// ═══════════════════════════════════════════════════════════════════════
// This resolver is intentionally Story-only. Stage/QTE and Battle consumers
// must use resolveBattlePortraitStrict() instead.
//
// Contract:
//   Story -> Story only
//   expression fallback -> same requested form only
//   missing form -> MISSING/undefined, never Battle/Menu
// ═══════════════════════════════════════════════════════════════════════

import { resolveStoryPortraitStrict } from './portraitResolvers';
import type { PortraitEmotion } from './storyPortraits';

export function resolveSpeakerPortrait(
  charId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  return resolveStoryPortraitStrict(charId, formId, emotion).url;
}

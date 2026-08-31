// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CANONICAL STORY PORTRAIT RESOLVER
// ═══════════════════════════════════════════════════════════════════════
// Story dialogue portraits are physical GBC assets already extracted under
// public/assets/portraits/story/. This resolver fixes semantic form identity
// before delegating to storyPortraits.ts.
//
// It MUST NOT fabricate a portrait for a form that is absent from the physical
// corpus. Example: the verified Story portrait corpus has no dedicated Future
// Trunks SSJ portrait and no Goku SSJ3 Story portrait; those cases deliberately
// fall back to the closest verified physical Story portrait.
// ═══════════════════════════════════════════════════════════════════════

import { storyPortraitUrl, type PortraitEmotion } from './storyPortraits';

export type StoryPortraitBindingEvidence = 'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING';
export const STORY_PORTRAIT_BINDING_EVIDENCE: StoryPortraitBindingEvidence =
  'ROM_EXTRACTED_ASSET_SEMANTIC_BINDING';

const ROOT = '/assets/portraits/story';

function absolute(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? url : `/${url}`;
}

function token(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s-]+/g, '_');
}

function isAdultGohan(character: string, form: string): boolean {
  return character === 'gohan_adult' || form.includes('adult') || form.includes('ultimate');
}

/**
 * Resolves the exact physical Story portrait family for a dialogue speaker.
 * Character/form identity wins over generic emotion fallback.
 */
export function canonicalStoryPortraitUrl(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  const character = token(characterId);
  const form = token(formId);

  // ── Trunks identity ─────────────────────────────────────────────────
  // Do not allow trunks_kid to collapse to the Future Trunks base portrait.
  if (character === 'trunks_kid' || form.includes('kid')) {
    return emotion === 'surprised'
      ? `${ROOT}/trunks_kid_02.png`
      : `${ROOT}/trunks_kid_01.png`;
  }
  if (character === 'trunks_future') {
    // The physical 137-portrait corpus has no dedicated Future Trunks SSJ face.
    return absolute(storyPortraitUrl('trunks', undefined, emotion));
  }

  // ── Gohan age/form identity ─────────────────────────────────────────
  if (character === 'gohan_adult' || (character === 'gohan' && isAdultGohan(character, form))) {
    if (form.includes('ssj') || form.includes('super_saiyan')) {
      return `${ROOT}/gohan_adult_ssj.png`;
    }
    if (form.includes('ultimate')) return `${ROOT}/gohan_adult_03.png`;
    // Adult portrait variants exist, but their facial semantics are not all
    // encoded in the current metadata. Prefer verified adult identity over a
    // semantically guessed young-Gohan emotion.
    return `${ROOT}/gohan_adult_01.png`;
  }
  if (character === 'gohan_kid') {
    return absolute(storyPortraitUrl('gohan', formId, emotion));
  }

  // ── Majin Vegeta ────────────────────────────────────────────────────
  // storyPortraits.ts historically pointed "majin" at gohan_adult_ssj.png.
  // Use the two physical Majin Vegeta Story portraits that actually exist.
  if (character === 'vegeta' && form.includes('majin')) {
    return emotion === 'angry' || emotion === 'screaming'
      ? `${ROOT}/majin_vegeta_02.png`
      : `${ROOT}/majin_vegeta_01.png`;
  }

  // ── Explicit Buu identities ─────────────────────────────────────────
  if (character === 'buu' || character === 'buu_base' || character === 'fat_buu') {
    return emotion === 'angry'
      ? `${ROOT}/majin_buu_02.png`
      : `${ROOT}/majin_buu_01.png`;
  }
  if (character === 'buu_kid' || character === 'kid_buu') return `${ROOT}/kid_buu.png`;
  if (character === 'buu_super' || character === 'majin_buu') {
    if (form.includes('gohan')) return `${ROOT}/super_buu_gohan_03.png`;
    return emotion === 'angry'
      ? `${ROOT}/super_buu_02.png`
      : `${ROOT}/super_buu_01.png`;
  }

  // ── Cell form identity ──────────────────────────────────────────────
  if (character === 'cell_imperfect') return `${ROOT}/cell_imperfect.png`;
  if (character === 'cell_semi' || character === 'cell_semi_perfect') return `${ROOT}/cell_semi_perfect.png`;
  if (character === 'cell_perfect') return absolute(storyPortraitUrl('cell', undefined, emotion));

  // ── Generic verified resolver ───────────────────────────────────────
  const alias: Record<string, string> = {
    gohan_young: 'gohan',
    trunks: 'trunks',
    android_20_dr_gero: 'android_20',
    mr_satan: 'hercule',
    buu_gohan: 'majin_buu',
    buu_gotenks: 'majin_buu',
  };
  return absolute(storyPortraitUrl(alias[character] ?? character, formId, emotion));
}

export function hasCanonicalStoryPortrait(
  characterId: string,
  formId?: string,
  emotion?: PortraitEmotion,
): boolean {
  return Boolean(canonicalStoryPortraitUrl(characterId, formId, emotion));
}

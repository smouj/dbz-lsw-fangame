import { describe, expect, it } from 'vitest';
import { resolveStoryPortraitStrict } from './portraitResolvers';
import { storyPortraitForRosterForm } from './storyPortraits';

describe('roster story portrait identity', () => {
  it('resolves Cell forms to their own physical portraits', () => {
    expect(resolveStoryPortraitStrict('cell', 'cell_imperfect').url).toContain('/cell_imperfect.png');
    expect(resolveStoryPortraitStrict('cell', 'cell_semi').url).toContain('/cell_semi_perfect.png');
    expect(resolveStoryPortraitStrict('cell', 'cell_perfect').url).toContain('/cell_perfect_01.png');
  });

  it('resolves Ginyu in Goku body and Buu absorption forms explicitly', () => {
    expect(resolveStoryPortraitStrict('ginyu', 'ginyu_goku').url).toContain('/captain_ginyu_goku_body.png');
    expect(resolveStoryPortraitStrict('buu', 'buu_gohan').url).toContain('/super_buu_gohan_03.png');
    expect(resolveStoryPortraitStrict('buu', 'buu_kid').url).toContain('/kid_buu.png');
  });

  it('does not claim a different transformation is an exact Story portrait', () => {
    expect(resolveStoryPortraitStrict('goku', 'goku_ssj3').status).toBe('MISSING');
    expect(resolveStoryPortraitStrict('gohan_adult', 'gohan_adult_ssj2').status).toBe('MISSING');
    expect(resolveStoryPortraitStrict('gotenks', 'gotenks_ssj').status).toBe('MISSING');
    expect(storyPortraitForRosterForm('goku_ssj3')).toBeUndefined();
    expect(storyPortraitForRosterForm('gohan_adult_ssj2')).toBeUndefined();
    expect(storyPortraitForRosterForm('gotenks_ssj')).toBeUndefined();
  });

  it('keeps verified exact Story form assets available to roster UI', () => {
    expect(resolveStoryPortraitStrict('gohan_young', 'gohan_young_ssj2').url).toContain('/gohan_young_ssj2_01.png');
    expect(resolveStoryPortraitStrict('vegeta', 'vegeta_majin').url).toContain('/majin_vegeta_01.png');
    expect(resolveStoryPortraitStrict('gotenks', 'gotenks_ssj3').url).toContain('/gotenks_ssj3.png');
  });

  it('keeps expression fallback on the same exact form', () => {
    const resolved = resolveStoryPortraitStrict('cell', 'cell_perfect', 'angry');
    expect(resolved.status).toBe('EXPRESSION_FALLBACK');
    expect(resolved.requestedFormId).toBe('cell_perfect');
    expect(resolved.resolvedFormId).toBe('cell_perfect');
    expect(resolved.resolvedExpression).toBe('normal');
  });
});

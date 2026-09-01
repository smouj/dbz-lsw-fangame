import { describe, expect, it } from 'vitest';
import { storyPortraitForRosterForm, storyPortraitUrl } from './storyPortraits';

describe('roster story portrait identity', () => {
  it('resolves Cell forms to their own physical portraits', () => {
    expect(storyPortraitUrl('cell', 'cell_imperfect')).toContain('/cell_imperfect.png');
    expect(storyPortraitUrl('cell', 'cell_semi')).toContain('/cell_semi_perfect.png');
    expect(storyPortraitUrl('cell', 'cell_perfect')).toContain('/cell_perfect_01.png');
  });

  it('resolves Ginyu in Goku body and Buu absorption forms explicitly', () => {
    expect(storyPortraitUrl('ginyu', 'ginyu_goku')).toContain('/captain_ginyu_goku_body.png');
    expect(storyPortraitUrl('buu', 'buu_gohan')).toContain('/super_buu_gohan_03.png');
    expect(storyPortraitUrl('buu', 'buu_kid')).toContain('/kid_buu.png');
  });

  it('does not claim a different transformation is an exact Story portrait', () => {
    expect(storyPortraitForRosterForm('goku_ssj3')).toBeUndefined();
    expect(storyPortraitForRosterForm('gohan_adult_ssj2')).toBeUndefined();
    expect(storyPortraitForRosterForm('gotenks_ssj')).toBeUndefined();
  });

  it('keeps verified exact Story form assets available to roster UI', () => {
    expect(storyPortraitForRosterForm('gohan_young_ssj2')).toContain('/gohan_young_ssj2_01.png');
    expect(storyPortraitForRosterForm('vegeta_majin')).toContain('/majin_vegeta_01.png');
    expect(storyPortraitForRosterForm('gotenks_ssj3')).toContain('/gotenks_ssj3.png');
  });
});

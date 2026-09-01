import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './roster';
import { rosterPortraitAsset } from './rosterPortraits';

describe('roster portrait policy', () => {
  it('resolves every playable form to a real portrait asset', () => {
    for (const character of CHARACTERS) {
      for (const formId of character.forms) {
        const portrait = rosterPortraitAsset(character.id, formId);
        expect(portrait.url, `${character.id}/${formId}`).toMatch(/^\/assets\/portraits\//);
      }
    }
  });

  it('uses exact Battle portraits when the Story corpus lacks that form', () => {
    for (const [characterId, formId] of [
      ['goku', 'goku_ssj3'],
      ['gohan_adult', 'gohan_adult_ssj2'],
      ['gotenks', 'gotenks_ssj'],
      ['buu', 'buu_gotenks'],
      ['piccolo', 'piccolo_evil'],
    ]) {
      const portrait = rosterPortraitAsset(characterId, formId);
      expect(portrait.source, formId).toBe('battle');
      expect(portrait.url, formId).toContain(`/battle/${formId === 'gohan_adult_ssj2' ? 'gohan_adult_ssj2' : formId}.png`);
    }
  });

  it('prefers exact Story portraits when they exist', () => {
    expect(rosterPortraitAsset('cell', 'cell_imperfect')).toMatchObject({ source: 'story' });
    expect(rosterPortraitAsset('ginyu', 'ginyu_goku')).toMatchObject({ source: 'story' });
    expect(rosterPortraitAsset('buu', 'buu_gohan')).toMatchObject({ source: 'story' });
  });
});

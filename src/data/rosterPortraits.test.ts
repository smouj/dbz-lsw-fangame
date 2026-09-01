import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './roster';
import {
  resolveBattlePortraitStrict,
  resolveStoryPortraitStrict,
} from './portraitResolvers';
import { rosterPortraitDiagnostics } from './rosterPortraits';

describe('portrait domain isolation', () => {
  it('resolves every playable Battle form only through the Battle domain', () => {
    for (const character of CHARACTERS) {
      for (const formId of character.forms) {
        const portrait = resolveBattlePortraitStrict(formId);
        expect(portrait.domain).toBe('battle');
        expect(portrait.status, `${character.id}/${formId}`).toBe('EXACT');
        expect(portrait.resolvedFormId).toBe(formId);
        expect(portrait.url, `${character.id}/${formId}`).toMatch(/^\/assets\/portraits\/battle\//);
      }
    }
  });

  it('keeps missing Story forms missing instead of substituting another transformation', () => {
    for (const [characterId, formId] of [
      ['goku', 'goku_ssj3'],
      ['gohan_adult', 'gohan_adult_ssj2'],
      ['gotenks', 'gotenks_ssj'],
      ['buu', 'buu_gotenks'],
      ['piccolo', 'piccolo_evil'],
    ]) {
      const portrait = resolveStoryPortraitStrict(characterId, formId);
      expect(portrait.domain).toBe('story');
      expect(portrait.status, formId).toBe('MISSING');
      expect(portrait.url, formId).toBeUndefined();
      expect(portrait.resolvedFormId, formId).toBeUndefined();
    }
  });

  it('allows expression fallback only within the exact same Story form', () => {
    const portrait = resolveStoryPortraitStrict('cell', 'cell_perfect', 'angry');
    expect(portrait.domain).toBe('story');
    expect(portrait.status).toBe('EXPRESSION_FALLBACK');
    expect(portrait.requestedFormId).toBe('cell_perfect');
    expect(portrait.resolvedFormId).toBe('cell_perfect');
    expect(portrait.resolvedExpression).toBe('normal');
    expect(portrait.url).toContain('/story/cell_perfect_01.png');
  });

  it('exposes Story, Battle and Menu as separate diagnostic columns without choosing a source', () => {
    const diagnostics = rosterPortraitDiagnostics('goku', 'goku_ssj3');
    expect(diagnostics.story.status).toBe('MISSING');
    expect(diagnostics.battle.status).toBe('EXACT');
    expect(diagnostics.menu.domain).toBe('menu');
    expect(diagnostics).not.toHaveProperty('source');
    expect(diagnostics).not.toHaveProperty('url');
  });
});

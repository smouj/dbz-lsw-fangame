import { describe, expect, it } from 'vitest';
import { resolveVersusBattleSetup } from './versusBattleSetup';
import type { TeamMember, TeamSetupResult } from './teamSetupTypes';

function member(characterId: string, formId: string, limits: number[], jointDeck: number[]): TeamMember {
  return { characterId, formId, limits, jointDeck };
}

describe('resolveVersusBattleSetup', () => {
  it('preserves the selected player primary, deck, limits and reserve', () => {
    const primary = member('gohan_kid', 'gohan_young', [18, 0, 0], Array(20).fill(1));
    const reserve = member('goku', 'goku_base', [12, 13, 14], Array(20).fill(2));
    const setup: TeamSetupResult = { member: reserve, team: [primary, reserve] };

    const result = resolveVersusBattleSetup(setup, [member('piccolo', 'piccolo_base', [], [])]);

    expect(result.playerFormId).toBe('gohan_young');
    expect(result.playerDeck).toEqual(primary.jointDeck);
    expect(result.playerLimits).toEqual(primary.limits);
    expect(result.playerReserve).toEqual(reserve);
  });

  it('maps the second selected rival into the runtime reserve', () => {
    const primary = member('gohan_kid', 'gohan_young', [18], Array(20).fill(1));
    const rivalOne = member('piccolo', 'piccolo_base', [], []);
    const rivalTwo = member('goku', 'goku_base', [], []);

    const result = resolveVersusBattleSetup({ member: primary, team: [primary] }, [rivalOne, rivalTwo]);

    expect(result.enemyFormId).toBe('piccolo_base');
    expect(result.rivalReserve?.formId).toBe('goku_base');
    expect(result.rivalTeam).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import type { StandardDamageRuntimeCutover } from './standardDamageRomCutover';
import {
  createDamageVisualProjection,
  projectedHp,
  revealDamageVisualProjection,
} from './damageVisualProjection';

function cutover(outcome: 'HIT' | 'MISS' | 'SPECIAL_DEFENSE'): StandardDamageRuntimeCutover {
  return {
    actionId: `7:enemy:5:${outcome}`,
    actionSequence: 7,
    card: { id: 5, name: 'Cont.Punch', type: 'damage', effect: 'damage', atk: 9, acc: 100, cc: 0, rarity: 1 },
    profile: { cardId: 5, kind: 'STANDARD_DAMAGE', execution: { bank: 3, handler: 10, pointer: 0 }, sequence: [] },
    outcome: { family: outcome, sourceEvent: outcome === 'MISS' ? 'ATTACK_MISSED' : 'ATTACK_HIT' },
    timeline: { startTick: 0, endTick: 0, entries: [] },
  } as unknown as StandardDamageRuntimeCutover;
}

describe('DamageVisualProjection', () => {
  it.each([
    ['HIT', 80, 61],
    ['MISS', 80, 80],
    ['SPECIAL_DEFENSE', 80, 75],
  ] as const)('keeps %s at beforeHp until reveal and then exposes Runtime HP', (outcome, beforeHp, afterHp) => {
    const projection = createDamageVisualProjection(cutover(outcome), 'player', beforeHp, afterHp)!;

    expect(projectedHp('player', afterHp, projection)).toBe(beforeHp);
    expect(projectedHp('enemy', 42, projection)).toBe(42);
    expect(projectedHp('player', afterHp, revealDamageVisualProjection(projection))).toBe(afterHp);
  });

  it('is immutable and keeps action identity for replay protection', () => {
    const projection = createDamageVisualProjection(cutover('HIT'), 'player', 80, 61)!;
    const revealed = revealDamageVisualProjection(projection);

    expect(projection.revealed).toBe(false);
    expect(revealed).not.toBe(projection);
    expect(revealed.actionId).toBe(projection.actionId);
    expect(revealDamageVisualProjection(revealed)).toBe(revealed);
  });
});

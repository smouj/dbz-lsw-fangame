import { describe, expect, it } from 'vitest';
import { BattleRuntime } from './BattleRuntime';
import { createInitialBattleState } from '../engine/state/createInitialBattleState';
import { BattlePosition } from '../../data/positions';

function runtimeWithReserves() {
  const deck = { drawPile: [], hand: [], discardPile: [] };
  const state = createInitialBattleState({
    playerFormId: 'gohan_young', playerName: 'Gohan Kid', playerForm: 'Kid', playerLevel: 1,
    playerMaxHp: 80, playerHp: 0, playerStr: 7, playerKi: 12, playerSpd: 6, playerMaxCc: 99, playerCc: 10,
    enemyFormId: 'piccolo_base', enemyName: 'Piccolo', enemyForm: 'Normal', enemyLevel: 1,
    enemyMaxHp: 85, enemyHp: 0, enemyStr: 9, enemyKi: 14, enemySpd: 5, enemyMaxCc: 99, enemyCc: 10,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck, enemyDeck: deck, playerLimits: [], playerFighterLimits: [],
    player2: {
      id: 'goku_base', name: 'Goku', form: 'Normal', level: 1, maxHp: 90, hp: 90,
      str: 10, ki: 10, spd: 10, maxCc: 99, cc: 10, battlePos: BattlePosition.DOWN_BACK,
      powerWindowCounter: 0, limits: [],
    },
    enemy2: {
      id: 'krillin_base', name: 'Krillin', form: 'Base', level: 1, maxHp: 70, hp: 70,
      str: 6, ki: 8, spd: 9, maxCc: 99, cc: 10, battlePos: BattlePosition.DOWN_BACK,
      powerWindowCounter: 0, limits: [],
    },
    firstAttacker: 'player', seed: 42,
  });
  return new BattleRuntime({ state, context: {
    playerFormId: 'gohan_young', enemyFormId: 'piccolo_base',
    overviewBackground: '', actionBackground: '', specialActionBackground: '',
  }});
}

describe('BattleRuntime team reserve promotion', () => {
  it('promotes and consumes both player and enemy reserves after KO', () => {
    const runtime = runtimeWithReserves();
    expect(runtime.promoteDefeatedReserve('player')?.id).toBe('goku_base');
    expect(runtime.state.player.id).toBe('goku_base');
    expect(runtime.state.player2).toBeNull();
    expect(runtime.presentationInput().context.playerFormId).toBe('goku_base');

    expect(runtime.promoteDefeatedReserve('enemy')?.id).toBe('krillin_base');
    expect(runtime.state.enemy.id).toBe('krillin_base');
    expect(runtime.state.enemy2).toBeNull();
    expect(runtime.presentationInput().context.enemyFormId).toBe('krillin_base');
  });

  it('does not promote while the active fighter is alive', () => {
    const runtime = runtimeWithReserves();
    runtime.state = { ...runtime.state, player: { ...runtime.state.player, hp: 1 } };
    expect(runtime.promoteDefeatedReserve('player')).toBeNull();
    expect(runtime.state.player2?.id).toBe('goku_base');
  });
});

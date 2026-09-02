import { isLoadoutResolved, resolveEnemyLoadout } from '../../data/enemyLoadouts';
import type { TeamMember, TeamSetupResult } from './teamSetupTypes';

export interface VersusBattleSetup {
  playerTeam: TeamMember[];
  playerFormId: string;
  playerDeck: number[];
  playerLimits: number[];
  playerReserve: TeamMember | null;
  rivalTeam: TeamMember[];
  enemyFormId: string;
  rivalReserve: TeamMember | null;
}

/** Converts both setup columns into the complete 1v1/2v2 battle handoff. */
export function resolveVersusBattleSetup(
  playerSetup: TeamSetupResult,
  selectedRivals: TeamMember[],
): VersusBattleSetup {
  const playerTeam = playerSetup.team.length > 0 ? playerSetup.team : [playerSetup.member];
  const primaryPlayer = playerTeam[0];
  const rivalTeam = selectedRivals.map(member => {
    const preset = resolveEnemyLoadout(member.formId);
    return isLoadoutResolved(preset)
      ? { ...member, limits: preset.limits, jointDeck: preset.deck }
      : { ...member };
  });

  return {
    playerTeam,
    playerFormId: primaryPlayer.formId,
    playerDeck: primaryPlayer.jointDeck,
    playerLimits: primaryPlayer.limits,
    playerReserve: playerTeam[1] ?? null,
    rivalTeam,
    enemyFormId: rivalTeam[0]?.formId ?? 'piccolo_base',
    rivalReserve: rivalTeam[1] ?? null,
  };
}

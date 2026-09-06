import { canonForAction } from './animationCanon';
import type { BattleActionDescriptor } from './engine/events/BattleEvent';
import type { BattleTimeline, TimelineEntry } from './engine/presentation/PresentationCue';
import type { BattleSide } from './engine/state/BattleState';

const oppositeSide = (side: BattleSide): BattleSide => side === 'player' ? 'enemy' : 'player';

/**
 * Adds the verified attacker-only → duel visibility boundary to static ROM
 * films. This is presentation-only: it reads the action canon and never
 * changes BattleState, outcome, damage or the authoritative clock.
 */
export function withStaticDefenderEntrance(
  timeline: BattleTimeline,
  action: BattleActionDescriptor,
  actorSide: BattleSide,
): BattleTimeline {
  const defenderIn = canonForAction(action).defenderIn;
  const template = timeline.entries[0];
  if (!template || defenderIn <= 0) return timeline;

  const targetSide = oppositeSide(actorSide);
  const visibility: TimelineEntry[] = [
    {
      ...template,
      cue: { type: 'FIGHTER_VISIBILITY', tick: timeline.startTick, role: 'ACTOR', side: actorSide, visible: true },
    },
    {
      ...template,
      cue: { type: 'FIGHTER_VISIBILITY', tick: timeline.startTick, role: 'TARGET', side: targetSide, visible: false },
    },
    {
      ...template,
      cue: {
        type: 'FIGHTER_VISIBILITY',
        tick: timeline.startTick + defenderIn,
        role: 'TARGET',
        side: targetSide,
        visible: true,
      },
    },
  ];

  const entries = [...timeline.entries, ...visibility].sort((a, b) => a.cue.tick - b.cue.tick);
  return {
    ...timeline,
    endTick: Math.max(timeline.endTick, timeline.startTick + defenderIn),
    entries,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// useRivalSetupState — estado del Rival Team (espejo de useTeamSetupState)
// ═══════════════════════════════════════════════════════════════════════
// Capa de CONFIGURACIÓN: NO muta BattleState. Produce rival team en el
// confirm → BattleConfig → BattleRuntime. Misma interfaz que el player
// team pero sin edición de decks/limits (la IA usa deck genérico).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';
import { ROM_ORDERED_CHARACTERS, getCharacter, getForm } from '../../data/roster';
import { baseFormIdOf, makeMember } from './setupLogic';
import type { TeamMember, TeamSetupState, TeamSetupResult } from './teamSetupTypes';

export interface UseRivalSetupStateArgs {
  /** Forma inicial del rival (por defecto piccolo_base). */
  initialFormId?: string;
}

export function useRivalSetupState({ initialFormId = 'piccolo_base' }: UseRivalSetupStateArgs) {
  const initialChar = getForm(initialFormId)?.character ?? 'piccolo';

  const [state, setState] = useState<TeamSetupState>(() => {
    const member = makeMember(initialChar, initialFormId, []);
    return { members: [member], activeMember: 0, selectedCharacter: initialChar };
  });

  const active = state.members[state.activeMember];

  const updateActive = useCallback((fn: (m: TeamMember) => TeamMember) => {
    setState(s => ({
      ...s,
      members: s.members.map((m, i) => (i === s.activeMember ? fn(m) : m)),
    }));
  }, []);

  const selectCharacter = useCallback((characterId: string) => {
    setState(s => {
      const char = getCharacter(characterId);
      if (!char) return s;
      const cur = s.members[s.activeMember];
      const sameChar = cur.characterId === characterId;
      const formId = sameChar && getForm(cur.formId) ? cur.formId : char.forms[0];
      return {
        ...s,
        selectedCharacter: characterId,
        members: s.members.map((m, i) => i === s.activeMember
          ? { ...m, characterId, formId }
          : m),
      };
    });
  }, []);

  const selectForm = useCallback((formId: string) => {
    updateActive(m => {
      const form = getForm(formId);
      if (!form) return m;
      return { ...m, formId, characterId: form.character };
    });
    setState(s => ({ ...s, selectedCharacter: getForm(formId)?.character ?? s.selectedCharacter }));
  }, [updateActive]);

  const setActiveMember = useCallback((i: number) => {
    setState(s => {
      if (i < 0 || i >= s.members.length) return s;
      return { ...s, activeMember: i, selectedCharacter: s.members[i].characterId };
    });
  }, []);

  const addMember = useCallback(() => {
    setState(s => {
      if (s.members.length >= 2) return s; // Battle: máx 2 rivales (GBC 2v2)
      const next = s.members.length;
      const char = ROM_ORDERED_CHARACTERS[next % ROM_ORDERED_CHARACTERS.length];
      const m = makeMember(char.id, baseFormIdOf(char.id), []);
      return { ...s, members: [...s.members, m], activeMember: next, selectedCharacter: char.id };
    });
  }, []);

  const removeMember = useCallback((i: number) => {
    setState(s => {
      if (s.members.length <= 1 || i < 0 || i >= s.members.length) return s;
      const members = s.members.filter((_, idx) => idx !== i);
      const activeMember = Math.min(s.activeMember, members.length - 1);
      return { ...s, members, activeMember, selectedCharacter: members[activeMember].characterId };
    });
  }, []);

  const result = useMemo((): TeamSetupResult => ({
    member: state.members[0],
    team: state.members,
  }), [state.members]);

  const deckValid = true; // Rival deck is always valid (IA uses generic)

  return {
    state,
    active,
    result,
    deckValid,
    selectCharacter,
    selectForm,
    setActiveMember,
    addMember,
    removeMember,
  };
}
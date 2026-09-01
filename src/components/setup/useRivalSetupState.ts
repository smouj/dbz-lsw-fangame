// ═══════════════════════════════════════════════════════════════════════
// useRivalSetupState — estado del Rival Team (CPU preset, READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════
// Capa de CONFIGURACIÓN: NO muta BattleState.
// Rival = SELECTABLE (choose opponent), INSPECTABLE (see limits/deck),
// NOT EDITABLE (CPU uses ROM preset).
// Limits & Deck come from resolveEnemyLoadout() — canonical ROM data.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';
import { ROM_ORDERED_CHARACTERS, getCharacter, getForm } from '../../data/roster';
import { getLimitCapacity } from '../../data/limitLoadout';
import { resolveEnemyLoadout, isLoadoutResolved } from '../../data/enemyLoadouts';
import { baseFormIdOf, makeMember } from './setupLogic';
import type { TeamMember, TeamSetupState, TeamSetupResult } from './teamSetupTypes';

export interface UseRivalSetupStateArgs {
  /** Forma inicial del rival (por defecto piccolo_base). */
  initialFormId?: string;
}

/** Load ROM preset limits/deck into a TeamMember from resolveEnemyLoadout. */
function applyRomPreset(member: TeamMember): TeamMember {
  const preset = resolveEnemyLoadout(member.formId);
  if (isLoadoutResolved(preset)) {
    return {
      ...member,
      limits: preset.limits,
      jointDeck: preset.deck,
      deckId: `cpu-${preset.formId}`,
    };
  }
  // UNRESOLVED: keep whatever defaults makeMember gave
  return member;
}

export function useRivalSetupState({ initialFormId = 'piccolo_base' }: UseRivalSetupStateArgs) {
  const initialChar = getForm(initialFormId)?.character ?? 'piccolo';

  const [state, setState] = useState<TeamSetupState>(() => {
    const member = applyRomPreset(makeMember(initialChar, initialFormId, []));
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
      // Apply ROM preset for the new form
      const updated = applyRomPreset({ ...cur, characterId, formId });
      return {
        ...s,
        selectedCharacter: characterId,
        members: s.members.map((m, i) => i === s.activeMember ? updated : m),
      };
    });
  }, []);

  const selectForm = useCallback((formId: string) => {
    setState(s => {
      const form = getForm(formId);
      if (!form) return s;
      const cur = s.members[s.activeMember];
      // Apply ROM preset for the new form
      const updated = applyRomPreset({ ...cur, formId, characterId: form.character });
      return {
        ...s,
        members: s.members.map((m, i) => i === s.activeMember ? updated : m),
        selectedCharacter: form.character,
      };
    });
  }, []);

  const setActiveMember = useCallback((i: number) => {
    setState(s => {
      if (i < 0 || i >= s.members.length) return s;
      return { ...s, activeMember: i, selectedCharacter: s.members[i].characterId };
    });
  }, []);

  const addMember = useCallback(() => {
    setState(s => {
      if (s.members.length >= 2) return s; // Battle: máx 2 rivales (GBC 2v2)
      // Rival can use any form — no unlock gate
      const used = new Set(s.members.map(m => m.characterId));
      const char = ROM_ORDERED_CHARACTERS.find(c => !used.has(c.id)) ?? ROM_ORDERED_CHARACTERS[0];
      const member = applyRomPreset(makeMember(char.id, baseFormIdOf(char.id), []));
      const next = s.members.length;
      return { ...s, members: [...s.members, member], activeMember: next, selectedCharacter: char.id };
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

  // ── Limits y Deck: READ-ONLY for rival ──
  // These callbacks exist for interface compatibility but are no-ops
  // because rival limits/deck come from ROM presets.
  // The UI disables editing when rivalActive=true.
  const equipLimit = useCallback((_slot: number, _cardId: number) => {
    // NO-OP: rival limits are ROM-prescribed, not player-editable
  }, []);

  const clearLimitSlot = useCallback((_slot: number) => {
    // NO-OP: rival limits are ROM-prescribed, not player-editable
  }, []);

  const assignDeck = useCallback((_deckId: string, _cards: number[]) => {
    // NO-OP: rival deck is ROM-prescribed, not player-editable
  }, []);

  const result = useMemo((): TeamSetupResult => ({
    member: state.members[0],
    team: state.members,
  }), [state.members]);

  const deckValid = true; // Rival deck is always valid (ROM preset)

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
    equipLimit,
    clearLimitSlot,
    assignDeck,
  };
}
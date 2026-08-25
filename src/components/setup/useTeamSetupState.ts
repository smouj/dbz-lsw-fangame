// ═══════════════════════════════════════════════════════════════════════
// useTeamSetupState — estado del Team Setup (capa de configuración)
// ═══════════════════════════════════════════════════════════════════════
// Puramente UI: NO muta BattleState, NO toca CC/power window/fase.
// Produce TeamSetupResult en el confirm → BattleConfig → BattleRuntime.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';
import { ROM_ORDERED_CHARACTERS, getCharacter, getForm } from '../../data/roster';
import { getLimitCapacity, normalizeLoadout } from '../../data/limitLoadout';
import { DECK_SIZE, getCard } from '../../data/cards';
import { cardUsableByCharacter } from '../../data/cardCompatibility';
import { cleanLimitsFor, defaultJointDeck, makeMember } from './setupLogic';
import type { TeamMember, TeamSetupResult, TeamSetupState } from './teamSetupTypes';

export interface UseTeamSetupStateArgs {
  /** Deck guardado del jugador (loadDeck()) para el default. */
  fallbackDeck: number[];
  /** ¿Empezar con el personaje por defecto (Gohan Kid)? */
  initialCharacterId?: string;
}

export function useTeamSetupState({ fallbackDeck, initialCharacterId }: UseTeamSetupStateArgs) {  const firstChar = initialCharacterId && getCharacter(initialCharacterId)
    ? initialCharacterId
    : (ROM_ORDERED_CHARACTERS[0]?.id ?? 'gohan_kid');
  const firstForm = getCharacter(firstChar)?.forms[0] ?? 'goku_base';

  const [state, setState] = useState<TeamSetupState>(() => ({
    members: [makeMember(firstChar, firstForm, fallbackDeck)],
    activeMember: 0,
    selectedCharacter: firstChar,
  }));

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
      // Conservar el deck si el personaje no cambia; si cambia, revalidar
      // compatibilidad (nunca sustitución oculta: los limits incompatibles
      // se limpian de forma explícita).
      const sameChar = cur.characterId === characterId;
      const formId = sameChar && getForm(cur.formId) ? cur.formId : char.forms[0];
      const limits = sameChar ? cur.limits : cleanLimitsFor(characterId, cur.limits);
      const deck = sameChar ? cur.jointDeck : defaultJointDeck(characterId, cur.jointDeck);
      return {
        ...s,
        selectedCharacter: characterId,
        members: s.members.map((m, i) => i === s.activeMember
          ? { characterId, formId, limits, jointDeck: deck }
          : m),
      };
    });
  }, []);

  const selectForm = useCallback((formId: string) => {
    updateActive(m => {
      const form = getForm(formId);
      if (!form) return m;
      const limits = cleanLimitsFor(form.character, m.limits);
      return { ...m, formId, characterId: form.character, limits };
    });
    setState(s => ({ ...s, selectedCharacter: getForm(formId)?.character ?? s.selectedCharacter }));
  }, [updateActive]);

  const equipLimit = useCallback((slot: number, cardId: number) => {
    updateActive(m => {
      const cap = getLimitCapacity(m.characterId);
      if (slot < 0 || slot >= cap) return m;
      const card = getCard(cardId);
      if (!card || !cardUsableByCharacter(card, m.characterId)) return m;
      const limits = [...m.limits];
      limits[slot] = cardId;
      return { ...m, limits };
    });
  }, [updateActive]);

  const clearLimitSlot = useCallback((slot: number) => {
    updateActive(m => {
      const limits = [...m.limits];
      if (slot >= 0 && slot < limits.length) limits[slot] = 0;
      return { ...m, limits };
    });
  }, [updateActive]);

  const setActiveMember = useCallback((i: number) => {
    setState(s => {
      if (i < 0 || i >= s.members.length) return s;
      return { ...s, activeMember: i, selectedCharacter: s.members[i].characterId };
    });
  }, []);

  const addMember = useCallback(() => {
    setState(s => {
      if (s.members.length >= 3) return s;
      const next = s.members.length;
      const prev = s.members[next - 1];
      const char = ROM_ORDERED_CHARACTERS[next % ROM_ORDERED_CHARACTERS.length];
      const m = makeMember(char.id, char.forms[0], prev.jointDeck);
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

  // ─── Joint Deck ───

  const addCard = useCallback((cardId: number) => {
    updateActive(m => {
      if (m.jointDeck.length >= DECK_SIZE) return m;
      const card = getCard(cardId);
      if (!card || !cardUsableByCharacter(card, m.characterId)) return m;
      const copies = m.jointDeck.filter(id => id === cardId).length;
      if (copies >= 3) return m; // MAX_COPIES = 3
      return { ...m, jointDeck: [...m.jointDeck, cardId] };
    });
  }, [updateActive]);

  const removeCard = useCallback((index: number) => {
    updateActive(m => {
      if (index < 0 || index >= m.jointDeck.length) return m;
      return { ...m, jointDeck: m.jointDeck.filter((_, i) => i !== index) };
    });
  }, [updateActive]);

  const replaceCard = useCallback((index: number, cardId: number) => {
    updateActive(m => {
      if (index < 0 || index >= m.jointDeck.length) return m;
      const card = getCard(cardId);
      if (!card || !cardUsableByCharacter(card, m.characterId)) return m;
      const deck = [...m.jointDeck];
      deck[index] = cardId;
      return { ...m, jointDeck: deck };
    });
  }, [updateActive]);

  const moveCard = useCallback((from: number, to: number) => {
    updateActive(m => {
      const deck = [...m.jointDeck];
      if (from < 0 || from >= deck.length || to < 0 || to >= deck.length) return m;
      const [card] = deck.splice(from, 1);
      deck.splice(to, 0, card);
      return { ...m, jointDeck: deck };
    });
  }, [updateActive]);

  const clearDeck = useCallback(() => {
    updateActive(m => ({ ...m, jointDeck: [] }));
  }, [updateActive]);

  const resetDeck = useCallback(() => {
    updateActive(m => ({ ...m, jointDeck: defaultJointDeck(m.characterId, fallbackDeck) }));
  }, [updateActive, fallbackDeck]);

  const deckValid = active.jointDeck.length === DECK_SIZE;

  const result = useMemo<TeamSetupResult>(() => ({
    member: active,
    team: state.members,
  }), [active, state.members]);

  return {
    state,
    active,
    deckValid,
    result,
    selectCharacter,
    selectForm,
    equipLimit,
    clearLimitSlot,
    setActiveMember,
    addMember,
    removeMember,
    addCard,
    removeCard,
    replaceCard,
    moveCard,
    clearDeck,
    resetDeck,
  };
}

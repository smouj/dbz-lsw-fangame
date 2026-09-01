// ═══════════════════════════════════════════════════════════════════════
// TEAM SETUP — flujo de preparación de combate (GBC evolucionado)
// ═══════════════════════════════════════════════════════════════════════
// CHARACTER ROLL (chibis OW + power-up) → FORM → DETAILS → LIMITS → DECK
// → READY → TeamSetupResult → BattleConfig (único handoff).
// Capa de CONFIGURACIÓN: nunca muta BattleState.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, type ReactNode } from 'react';
import { ROM_ORDERED_CHARACTERS, getCharacter, getForm } from '../../data/roster';
import { baseFormIdOf } from './setupLogic';
import { overworldUrl } from '../../data/overworld';
import { battleOverworldActorUrl } from '../../data/battleOverworld';
import { resolveBattlePortraitStrict } from '../../data/portraitResolvers';
import type { SavedDeck } from '../../data/deckLibrary';
import { CharacterRoll, type RollCharacterAsset } from './CharacterRoll';
import { FormSelector } from './FormSelector';
import { CharacterDetails } from './CharacterDetails';
import { LimitLoadoutPanel } from './LimitLoadoutPanel';
import { DeckAssignment } from './DeckAssignment';
import type { TeamSetupResult } from './teamSetupTypes';
import type { UseTeamSetupStateArgs } from './useTeamSetupState';

export interface TeamSetupProps {
  useSetup: (args: UseTeamSetupStateArgs) => ReturnType<typeof import('./useTeamSetupState').useTeamSetupState>;
  fallbackDeck: number[];
  savedDecks: SavedDeck[];
  initialCharacterId?: string;
  initialFormId?: string;
  initialDeckId?: string;
  onConfirm: (result: TeamSetupResult) => void;
  onEditDecks: () => void;
  onBack: () => void;
  isFormUnlocked?: (formId: string) => boolean;
  /** Battle-only: rival team slots injected beside player in command row. */
  rivalSlots?: ReactNode;
  /** Battle-only: rival form selector shown when rival team is active. */
  rivalFormSelector?: ReactNode;
  /** Whether the rival team (not player) is currently in focus. */
  rivalActive?: boolean;
  /** Battle-only: callback when player team slot is clicked (to set focus). */
  onPlayerSlotClick?: () => void;
  /** Battle-only: rival character selection callback (for Character Roll). */
  onRivalSelectCharacter?: (characterId: string) => void;
  /** Battle-only: rival form selection callback. */
  onRivalSelectForm?: (formId: string) => void;
  /** Battle-only: rival current form id (for details/limits). */
  rivalFormId?: string;
  /** Battle-only: rival character id (for limits). */
  rivalCharacterId?: string;
  /** Battle-only: rival limits array. */
  rivalLimits?: number[];
  /** Battle-only: rival limit equip callback. */
  onRivalEquipLimit?: (slot: number, cardId: number) => void;
  /** Battle-only: rival limit clear callback. */
  onRivalClearLimit?: (slot: number) => void;
  /** Battle-only: rival deck assignment callback. */
  onRivalAssignDeck?: (deckId: string, cards: number[]) => void;
  /** Battle-only: rival assigned deck id. */
  rivalDeckId?: string;
  /** Battle-only: rival assigned cards. */
  rivalCards?: number[];
  /** Battle-only: rival is form unlocked (always true for AI). */
  isRivalFormUnlocked?: (formId: string) => boolean;
}

export function TeamSetup({
  useSetup,
  fallbackDeck,
  savedDecks,
  initialCharacterId,
  initialFormId,
  initialDeckId,
  onConfirm,
  onEditDecks,
  isFormUnlocked,
  rivalSlots,
  rivalFormSelector,
  rivalActive,
  onPlayerSlotClick,
  onRivalSelectCharacter,
  onRivalSelectForm,
  rivalFormId,
  rivalCharacterId,
  rivalLimits,
  onRivalEquipLimit,
  onRivalClearLimit,
  onRivalAssignDeck,
  rivalDeckId,
  rivalCards,
  isRivalFormUnlocked,
}: TeamSetupProps) {
  const setup = useSetup({ fallbackDeck, initialCharacterId, initialFormId, initialDeckId, strictDeckAssignment: true });
  const { state, active, result, deckValid } = setup;

  // Assets del roll: chibis OW (forma base para los laterales) + power pose
  // real del battle OW. El CENTRO refleja la forma ACTIVA, no la base.
  const selectedIdx = Math.max(0, ROM_ORDERED_CHARACTERS.findIndex(c => c.id === state.selectedCharacter));
  const activeFormId = active.formId;

  const rollItems = useMemo<RollCharacterAsset[]>(() =>
    ROM_ORDERED_CHARACTERS.map(c => {
      const baseFormId = baseFormIdOf(c.id);
      const locked = isFormUnlocked ? !isFormUnlocked(baseFormId) : false;
      return {
        characterId: c.id,
        name: c.name,
        formId: baseFormId,
        formLabel: getForm(baseFormId)?.form,
        idleUrl: overworldUrl(baseFormId),
        powerUrl: battleOverworldActorUrl(baseFormId, 'gather_power_pose') ?? undefined,
        auraUrl: undefined,
        locked,
      };
    }), [isFormUnlocked]);

  // When rival has focus, the Roll selects rival characters;
  // when player has focus, it selects player characters.
  const rollOnSelect = rivalActive && onRivalSelectCharacter
    ? (idx: number) => { const c = ROM_ORDERED_CHARACTERS[idx]; if (c) onRivalSelectCharacter(c.id); }
    : (idx: number) => { const c = ROM_ORDERED_CHARACTERS[idx]; if (c) setup.selectCharacter(c.id); };
  const rollSelectedIdx = rivalActive
    ? Math.max(0, ROM_ORDERED_CHARACTERS.findIndex(c => c.id === (rivalCharacterId ?? state.selectedCharacter)))
    : selectedIdx;

  // Override del centro con la forma seleccionada (idle + power pose de ESA forma).
  const rollActiveFormId = rivalActive ? (rivalFormId ?? active.formId) : active.formId;
  const rollItemsWithActiveForm = useMemo(() =>
    rollItems.map((it, i) => {
      if (i !== rollSelectedIdx) return it;
      const f = getForm(rollActiveFormId);
      return {
        ...it,
        formId: rollActiveFormId,
        formLabel: f?.form ?? it.formLabel,
        idleUrl: overworldUrl(rollActiveFormId) ?? it.idleUrl,
        powerUrl: battleOverworldActorUrl(rollActiveFormId, 'gather_power_pose') ?? it.powerUrl,
      };
    }), [rollItems, rollSelectedIdx, rollActiveFormId]);

  const activeChar = getCharacter(active.characterId);
  const selectedForm = getForm(active.formId);
  const teamSlots = (
    <div className="setup-team-slots" data-testid="team-slots">
      {state.members.map((m, i) => {
        const char = getCharacter(m.characterId);
        const form = getForm(m.formId);
        const portrait = resolveBattlePortraitStrict(m.formId);
        return (
          <div key={i} className={`setup-team-slot${i === state.activeMember ? ' active' : ''}`}>
            <button type="button" className="setup-team-slot-btn"
              onClick={() => { setup.setActiveMember(i); onPlayerSlotClick?.(); }}>
              {portrait.url ? <img className="setup-team-slot-portrait battle" src={portrait.url} alt="" draggable={false} /> : null}
              <span className="setup-team-slot-copy">
                <span className="setup-team-slot-num">SLOT {i + 1}</span>
                <span className="setup-team-slot-name">{char?.name ?? '—'}</span>
                <span className="setup-team-slot-form">{form?.form ?? ''}</span>
              </span>
            </button>
            {state.members.length > 1 ? (
              <button type="button" className="setup-team-slot-remove" title="Remove member"
                onClick={() => setup.removeMember(i)}>✕</button>
            ) : null}
          </div>
        );
      })}
      {state.members.length < 2 ? (
        <button type="button" className="setup-team-slot setup-team-slot-add"
          onClick={setup.addMember}>+ ADD MEMBER</button>
      ) : null}
    </div>
  );

  return (
    <div className={`page-screen setup-screen${rivalSlots ? ' setup-screen-command' : ''}`} data-testid="team-setup">
      {rivalSlots ? (
        <div className="setup-command-row">
          <div className="setup-command-team setup-command-team-player" role="group" aria-label="Your team">
            <span className="setup-command-team-label">YOUR TEAM</span>
            {teamSlots}
          </div>
          {/* Single FormSelector in the center — shows player forms or rival forms based on focus */}
          {rivalActive ? rivalFormSelector : (
            <FormSelector
              characterId={active.characterId}
              selectedFormId={active.formId}
              onSelect={setup.selectForm}
              isUnlocked={isFormUnlocked}
            />
          )}
          <div className="setup-command-team setup-command-team-rival" role="group" aria-label="Rival team">
            <span className="setup-command-team-label setup-enemy-label">RIVAL <span className="setup-cpu-badge">CPU</span> <span className="setup-rom-badge">🔒 ROM</span></span>
            {rivalSlots}
          </div>
        </div>
      ) : null}
      <div className="setup-workshop">
      {/* Shared Dev composition keeps slots in the workshop. */}
      {!rivalSlots ? teamSlots : null}

      {/* Character Roll */}
      <CharacterRoll
        items={rollItemsWithActiveForm}
        selectedIndex={rollSelectedIdx}
        onSelect={rollOnSelect}
      />

      {/* Form selector del personaje central */}
      {!rivalSlots ? (
        <FormSelector
          characterId={active.characterId}
          selectedFormId={active.formId}
          onSelect={setup.selectForm}
          isUnlocked={isFormUnlocked}
        />
      ) : null}

      <div className="setup-body">
        {/* Detalles */}
        <CharacterDetails formId={rivalActive && rivalFormId ? rivalFormId : active.formId} />

        {/* Limit Loadout — read-only when rival is active (CPU loadout) */}
        <LimitLoadoutPanel
          characterId={rivalActive && rivalCharacterId ? rivalCharacterId : active.characterId}
          limits={rivalActive && rivalLimits ? rivalLimits : active.limits}
          onEquip={rivalActive ? undefined : setup.equipLimit}
          onClear={rivalActive ? undefined : setup.clearLimitSlot}
        />
      </div>

      {/* Deck — read-only when rival is active (CPU ROM loadout) */}
      <DeckAssignment
        characterId={rivalActive && rivalCharacterId ? rivalCharacterId : active.characterId}
        decks={savedDecks}
        assignedDeckId={rivalActive && rivalDeckId ? rivalDeckId : active.deckId}
        assignedCards={rivalActive && rivalCards ? rivalCards : active.jointDeck}
        onAssign={rivalActive ? undefined : setup.assignDeck}
        onEditDecks={rivalActive ? undefined : onEditDecks}
      />

      </div>
      {/* Ready stays outside the scrolling workshop so it never covers controls. */}
      <div className="setup-ready">
        <div className="setup-ready-info">
          <span>{activeChar?.name ?? ''} · {selectedForm?.form ?? ''}</span>
          <span>LIMITS {active.limits.filter(id => id !== 0).length}/{active.limits.length}</span>
          <span>DECK {active.jointDeck.length}/20</span>
        </div>
        <button type="button" className="btn-primary setup-ready-btn"
          onClick={() => onConfirm(result)} disabled={!deckValid}>
          {deckValid ? 'READY ▶ FIGHT' : `DECK ${active.jointDeck.length}/20`}
        </button>
      </div>
    </div>
  );
}

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
}: TeamSetupProps) {
  const setup = useSetup({ fallbackDeck, initialCharacterId, initialFormId, initialDeckId, strictDeckAssignment: true });
  const { state, active, result, deckValid } = setup;

  // Assets del roll: chibis OW (forma base para los laterales) + power pose
  // real del battle OW. El CENTRO refleja la forma ACTIVA, no la base —
  // punto de identidad del remake (Base/SSJ cambian chibi + power-up).
  const selectedIdx = Math.max(0, ROM_ORDERED_CHARACTERS.findIndex(c => c.id === state.selectedCharacter));
  const activeFormId = active.formId;

  const rollItems = useMemo<RollCharacterAsset[]>(() =>
    ROM_ORDERED_CHARACTERS.map(c => {
      // La forma BASE es la declarada en el roster (piccolo_base/Normal), NO
      // forms[0] del orden ROM (romFormId: piccolo_evil=4 < piccolo_base=5).
      const baseFormId = baseFormIdOf(c.id);
      return {
        characterId: c.id,
        name: c.name,
        formId: baseFormId,
        formLabel: getForm(baseFormId)?.form,
        idleUrl: overworldUrl(baseFormId),
        powerUrl: battleOverworldActorUrl(baseFormId, 'gather_power_pose') ?? undefined,
        auraUrl: undefined,
      };
    }), []);

  // Override del centro con la forma seleccionada (idle + power pose de ESA
  // forma). El aura se resuelve dentro de CharacterRoll por formId.
  const rollItemsWithActiveForm = useMemo(() =>
    rollItems.map((it, i) => {
      if (i !== selectedIdx) return it;
      const f = getForm(activeFormId);
      return {
        ...it,
        formId: activeFormId,
        formLabel: f?.form ?? it.formLabel,
        idleUrl: overworldUrl(activeFormId) ?? it.idleUrl,
        powerUrl: battleOverworldActorUrl(activeFormId, 'gather_power_pose') ?? it.powerUrl,
      };
    }), [rollItems, selectedIdx, activeFormId]);

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
          {!rivalActive ? (
            <FormSelector
              characterId={active.characterId}
              selectedFormId={active.formId}
              onSelect={setup.selectForm}
              isUnlocked={isFormUnlocked}
            />
          ) : null}
          <div className="setup-command-team setup-command-team-rival" role="group" aria-label="Rival team">
            {rivalSlots}
            <span className="setup-command-team-label setup-enemy-label">RIVAL TEAM</span>
          </div>
          {rivalActive ? rivalFormSelector : null}
        </div>
      ) : null}
      <div className="setup-workshop">
      {/* Shared Dev composition keeps slots in the workshop. */}
      {!rivalSlots ? teamSlots : null}

      {/* Character Roll */}
      <CharacterRoll
        items={rollItemsWithActiveForm}
        selectedIndex={selectedIdx}
        onSelect={idx => {
          const c = ROM_ORDERED_CHARACTERS[idx];
          if (c) setup.selectCharacter(c.id);
        }}
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
        <CharacterDetails formId={active.formId} />

        {/* Limit Loadout */}
        <LimitLoadoutPanel
          characterId={active.characterId}
          limits={active.limits}
          onEquip={setup.equipLimit}
          onClear={setup.clearLimitSlot}
        />
      </div>

      {/* Battle only assigns a saved deck; editing lives in the Deck page. */}
      <DeckAssignment
        characterId={active.characterId}
        decks={savedDecks}
        assignedDeckId={active.deckId}
        assignedCards={active.jointDeck}
        onAssign={setup.assignDeck}
        onEditDecks={onEditDecks}
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

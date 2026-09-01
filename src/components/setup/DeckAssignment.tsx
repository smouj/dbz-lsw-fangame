import { useMemo, type CSSProperties } from 'react';
import { CARD_COLORS, DECK_SIZE, getCard } from '../../data/cards';
import { cardUsableByCharacter } from '../../data/cardCompatibility';
import { cardIconUrl } from '../../data/icons';
import { isSavedDeckReady, type SavedDeck } from '../../data/deckLibrary';

export interface DeckAssignmentProps {
  characterId: string;
  decks: SavedDeck[];
  assignedDeckId?: string;
  assignedCards: number[];
  onAssign?: (deckId: string, cards: number[]) => void;
  onEditDecks?: () => void;
}

function sameCards(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function DeckAssignment({ characterId, decks, assignedDeckId, assignedCards, onAssign, onEditDecks }: DeckAssignmentProps) {
  const readOnly = !onAssign || !onEditDecks;
  const selected = decks.find(deck => deck.id === assignedDeckId)
    ?? decks.find(deck => sameCards(deck.cards, assignedCards));
  const selectedCards = useMemo(() => selected?.cards.map(getCard).filter(Boolean) ?? [], [selected]);
  const selectedCompatible = selectedCards.filter(card => cardUsableByCharacter(card!, characterId)).length;

  return (
    <section className="setup-deck-assignment" aria-labelledby="setup-deck-assignment-title">
      <div className="setup-deck-assignment-head">
        <div className="setup-panel-title" id="setup-deck-assignment-title">
          <span>ASSIGNED DECK</span>
        </div>
        <button type="button" className="setup-edit-decks" onClick={onEditDecks} disabled={readOnly}>{readOnly ? '🔒 ROM LOADOUT' : 'OPEN DECK EDITOR'}</button>
      </div>

      <div className="setup-deck-presets" role="list" aria-label="Saved decks">
        {decks.map(deck => {
          const cards = deck.cards.map(getCard).filter(Boolean);
          const compatible = cards.filter(card => cardUsableByCharacter(card!, characterId)).length;
          const active = deck.id === selected?.id;
          const ready = isSavedDeckReady(deck);
          return (
            <button
              type="button"
              role="listitem"
              key={deck.id}
              className={`setup-deck-preset${active ? ' active' : ''}${ready ? '' : ' incomplete'}`}
              aria-pressed={active}
              disabled={!ready}
              onClick={readOnly ? undefined : (() => { if (onAssign) onAssign(deck.id, [...deck.cards]); })}
            >
              <span className="setup-deck-preset-copy">
                <strong>{deck.name}</strong>
                <small>{deck.cards.length}/{DECK_SIZE} CARDS · {compatible}/{deck.cards.length || 0} USABLE</small>
              </span>
              <span className="setup-deck-preset-icons" aria-hidden="true">
                {cards.slice(0, 5).map((card, index) => (
                  <img key={`${card!.id}-${index}`} src={cardIconUrl(card!.id)} alt="" draggable={false} />
                ))}
              </span>
              <span className="setup-deck-preset-state">{ready ? (active ? 'ASSIGNED' : 'SELECT') : 'INCOMPLETE'}</span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="setup-assigned-deck-preview">
          <div className="setup-assigned-deck-summary">
            <span>CURRENT · {selected.name}</span>
            <b className={selectedCompatible === DECK_SIZE ? 'valid' : 'warning'}>{selectedCompatible}/{DECK_SIZE} usable by fighter</b>
          </div>
          <div className="setup-assigned-card-icons" aria-label={`${selected.name} card icons`}>
            {selectedCards.map((card, index) => (
              <div
                key={`${card!.id}-${index}`}
                className="setup-assigned-card-icon"
                title={`${card!.name} · ${card!.cc} CC`}
                style={{ '--card-accent': CARD_COLORS[card!.type] } as CSSProperties}
              >
                <img src={cardIconUrl(card!.id)} alt={card!.name} draggable={false} />
                <span>{card!.cc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

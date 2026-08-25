// ═══════════════════════════════════════════════════════════════════════
// DEV — Deck Builder (reutiliza el DeckBuilder del runtime setup)
// Mismos componentes que el juego + diagnósticos (distribución, CC,
// invalid entries, BattleConfig preview).
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { CHARACTERS, getCharacter } from '../data/roster';
import { getCard, DECK_SIZE } from '../data/cards';
import { cardUsableByCharacter } from '../data/cardCompatibility';
import { DeckBuilder } from '../components/setup/DeckBuilder';
import { useTeamSetupState } from '../components/setup/useTeamSetupState';
import { baseFormIdOf } from '../components/setup/setupLogic';

export function DeckBuilderModule() {
  const setup = useTeamSetupState({ fallbackDeck: [] });
  const { active } = setup;
  const [charId, setCharId] = useState('goku');

  const deck = active.jointDeck;
  const invalid = deck.map((id, i) => ({ id, i })).filter(({ id }) => {
    const card = getCard(id);
    return !card || !cardUsableByCharacter(card, charId);
  });
  const byType: Record<string, number> = {};
  let ccSum = 0;
  for (const id of deck) {
    const card = getCard(id);
    if (!card) continue;
    byType[card.type] = (byType[card.type] ?? 0) + 1;
    ccSum += card.cc;
  }

  return (
    <div className="dev-module dev-deck-builder">
      <h3>DECK BUILDER — mismo componente del runtime</h3>
      <div className="dev-diag-row">
        <label>Character (para compatibilidad):
          <select value={charId} onChange={e => { setCharId(e.target.value); setup.selectCharacter(e.target.value); }}>
            {CHARACTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <span>formId: <code>{active.formId}</code></span>
        <span>deck size: <code>{deck.length}/{DECK_SIZE}</code></span>
      </div>
      <div className="dev-diag-card">
        <b>DECK DIAGNOSTICS</b>
        <div>distribution: {Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(' · ') || '—'}</div>
        <div>avg CC: <code>{deck.length ? (ccSum / deck.length).toFixed(1) : '—'}</code></div>
        <div>invalid entries: <code>{invalid.length}</code> {invalid.map(x => `${x.i}:${x.id}`).join(', ')}</div>
        <div>compatibility source: <code>cardUsableByCharacter (CardDef.compatible/notCompatible — ROM 48-bit mask)</code></div>
      </div>
      <DeckBuilder
        characterId={charId}
        deck={deck}
        onAdd={setup.addCard}
        onRemove={setup.removeCard}
        onReplace={setup.replaceCard}
        onMove={setup.moveCard}
        onClear={setup.clearDeck}
        onReset={setup.resetDeck}
      />
      <div className="dev-diag-card">
        <b>BattleConfig PREVIEW (handoff — no muta BattleState)</b>
        <pre>{JSON.stringify({
          member: {
            characterId: active.characterId,
            formId: active.formId,
            limits: active.limits,
            jointDeckSize: active.jointDeck.length,
          },
          characterName: getCharacter(active.characterId)?.name,
          baseForm: baseFormIdOf(active.characterId),
        }, null, 2)}</pre>
      </div>
    </div>
  );
}

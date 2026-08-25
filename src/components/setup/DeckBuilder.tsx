// ═══════════════════════════════════════════════════════════════════════
// DECK WORKSHOP — editor del Joint Deck (20 cartas)
// ═══════════════════════════════════════════════════════════════════════
// Librería (filtros + search) | Joint Deck actual | Detalles de carta.
// Los filtros NO modifican el deck. La compatibilidad usa la fuente
// canónica (cardCompatibility) — nunca tablas manuales en la UI.
// LOS LIMITS NO ENTRAN AQUÍ (sistema separado — corpus §47).
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { CARDS, DECK_SIZE, MAX_COPIES, getCard, CARD_TYPE_NAMES } from '../../data/cards';
import { cardUsableByCharacter } from '../../data/cardCompatibility';
import { getCharacter } from '../../data/roster';
import { overworldUrl } from '../../data/overworld';
import { battleOverworldActorUrl } from '../../data/battleOverworld';
import { baseFormIdOf } from './setupLogic';
import type { CardDef, CardType } from '../../data/cards';

export interface DeckBuilderProps {
  characterId: string;
  deck: number[];
  onAdd: (cardId: number) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number, cardId: number) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
  onReset: () => void;
}

type DeckFilter = 'ALL' | CardType;

const FILTERS: DeckFilter[] = ['ALL', 'damage', 'beam', 'support', 'defense'];

export function DeckBuilder({ characterId, deck, onAdd, onRemove, onReplace, onMove, onClear, onReset }: DeckBuilderProps) {
  const [filter, setFilter] = useState<DeckFilter>('ALL');
  const [compatFilter, setCompatFilter] = useState<'ALL' | 'COMPATIBLE' | 'INCOMPATIBLE'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CardDef | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const deckCards = useMemo(() => deck.map(id => getCard(id)).filter((c): c is CardDef => !!c), [deck]);

  const library = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CARDS.filter(card => {
      if (card.type === 'command' || card.type === 'special') return false;
      if (filter !== 'ALL' && card.type !== filter) return false;
      const compatible = cardUsableByCharacter(card, characterId);
      if (compatFilter === 'COMPATIBLE' && !compatible) return false;
      if (compatFilter === 'INCOMPATIBLE' && compatible) return false;
      if (q && !card.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [characterId, filter, compatFilter, search]);

  const copiesInDeck = (cardId: number) => deck.filter(id => id === cardId).length;

  // Preview del personaje en el panel de detalles (chibi OW real).
  const previewChar = getCharacter(characterId);
  const previewFormId = previewChar ? baseFormIdOf(characterId) : undefined;
  const previewChibiUrl = previewFormId ? overworldUrl(previewFormId) : undefined;
  const previewPowerUrl = previewFormId
    ? (battleOverworldActorUrl(previewFormId, 'gather_power_pose') ?? undefined)
    : undefined;
  const selectedCompatible = selected ? cardUsableByCharacter(selected, characterId) : false;
  // Beam/Damage: el chibi "reacciona" con su pose de carga (power-up real).
  const showChargePreview = selected ? selected.type === 'beam' || selected.type === 'damage' : false;

  const analysis = useMemo(() => {
    const byType: Partial<Record<CardType, number>> = {};
    let ccSum = 0;
    let ccMin = Infinity;
    let ccMax = 0;
    for (const id of deck) {
      const card = getCard(id);
      if (!card) continue;
      byType[card.type] = (byType[card.type] ?? 0) + 1;
      ccSum += card.cc;
      ccMin = Math.min(ccMin, card.cc);
      ccMax = Math.max(ccMax, card.cc);
    }
    return {
      byType,
      avgCc: deck.length ? Math.round((ccSum / deck.length) * 10) / 10 : 0,
      minCc: deck.length ? ccMin : 0,
      maxCc: deck.length ? ccMax : 0,
    };
  }, [deck]);

  return (
    <div className="setup-deck" data-testid="deck-builder">
      {/* ── Librería ── */}
      <div className="setup-deck-lib">
        <div className="setup-panel-title"><span>CARD LIBRARY</span></div>
        <div className="setup-deck-tools">
          <input className="setup-search" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
          <div className="setup-deck-filters">
            {FILTERS.map(f => (
              <button key={f} type="button"
                className={`setup-filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}>{f === 'ALL' ? 'ALL' : f.toUpperCase()}</button>
            ))}
          </div>
          <div className="setup-deck-filters">
            {(['ALL', 'COMPATIBLE', 'INCOMPATIBLE'] as const).map(f => (
              <button key={f} type="button"
                className={`setup-filter-btn setup-filter-btn-sub${compatFilter === f ? ' active' : ''}`}
                onClick={() => setCompatFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="setup-deck-lib-list">
          {library.map(card => {
            const compatible = cardUsableByCharacter(card, characterId);
            const copies = copiesInDeck(card.id);
            const atMax = copies >= MAX_COPIES;
            return (
              <button key={card.id} type="button"
                className={`setup-lib-card${compatible ? '' : ' incompatible'}${selected?.id === card.id ? ' selected' : ''}`}
                onClick={() => setSelected(card)}
                onDoubleClick={() => { if (compatible && !atMax) onAdd(card.id); }}
                disabled={!compatible}
              >
                <span className={`setup-lib-dot type-${card.type}`} />
                <span className="setup-lib-name">{card.name}</span>
                <span className="setup-lib-meta">CC {card.cc}{copies ? ` ×${copies}` : ''}</span>
                {!compatible ? <span className="setup-lib-x">✕</span> : null}
                {atMax ? <span className="setup-lib-max">MAX</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Joint Deck actual ── */}
      <div className="setup-deck-current">
        <div className="setup-panel-title">
          <span>JOINT DECK</span>
          <span className={`setup-deck-count${deck.length === DECK_SIZE ? ' ok' : ''}`}>{deck.length} / {DECK_SIZE}</span>
        </div>
        <div className="setup-deck-actions">
          <button type="button" className="setup-small-btn" onClick={onReset}>RESET</button>
          <button type="button" className="setup-small-btn" onClick={onClear} disabled={deck.length === 0}>CLEAR</button>
        </div>
        <div className="setup-deck-list" data-testid="deck-list">
          {deckCards.map((card, i) => (
            <div key={`${i}-${card.id}`} className={`setup-deck-row${dragging === i ? ' dragging' : ''}`}
              draggable
              onDragStart={() => setDragging(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragging !== null) { onMove(dragging, i); setDragging(null); } }}
            >
              <span className="setup-deck-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className={`setup-lib-dot type-${card.type}`} />
              <span className="setup-deck-name">{card.name}</span>
              <span className="setup-deck-meta">CC {card.cc}</span>
              <button type="button" className="setup-deck-replace" title="Replace"
                onClick={() => {
                  const lib = library[0];
                  if (lib) onReplace(i, lib.id);
                }}>⇄</button>
              <button type="button" className="setup-deck-remove" title="Remove"
                onClick={() => onRemove(i)}>✕</button>
            </div>
          ))}
          {deck.length === 0 ? <span className="setup-empty-hint">Deck empty — add cards from the library</span> : null}
        </div>
        {/* ── Análisis (descriptivo, no reglas) ── */}
        <div className="setup-deck-analysis" data-testid="deck-analysis">
          <span className="setup-analysis-title">DECK ANALYSIS</span>
          <div className="setup-analysis-row">
            {(['damage', 'beam', 'support', 'defense'] as const).map(t => (
              <span key={t} className={`setup-analysis-type type-${t}`}>
                {t.toUpperCase()} {analysis.byType[t] ?? 0}
              </span>
            ))}
          </div>
          <div className="setup-analysis-row">
            <span>AVG CC {analysis.avgCc}</span>
            <span>LOW {analysis.minCc}</span>
            <span>HIGH {analysis.maxCc}</span>
            {analysis.avgCc >= 22 ? <span className="setup-analysis-warn">⚠ HIGH CC CURVE</span> : null}
            {(analysis.byType.defense ?? 0) === 0 ? <span className="setup-analysis-warn">⚠ LOW DEFENSE</span> : null}
          </div>
        </div>
      </div>

      {/* ── Detalles de carta ── */}
      <div className="setup-deck-details">
        <div className="setup-panel-title"><span>CARD DETAILS</span></div>
        {selected ? (
          <div className="setup-card-detail">
            <div className={`setup-card-art type-${selected.type}`}>
              <span className="setup-card-art-name">{selected.name}</span>
              <span className="setup-card-art-type">{CARD_TYPE_NAMES[selected.type]}</span>
            </div>
            <div className="setup-card-detail-rows">
              <div><span>CATEGORY</span><b>{CARD_TYPE_NAMES[selected.type]}</b></div>
              <div><span>POWER</span><b>{selected.atk}</b></div>
              <div><span>ACCURACY</span><b>{selected.acc}</b></div>
              <div><span>CC</span><b>{selected.cc}</b></div>
              <div><span>RARITY</span><b>{'★'.repeat(selected.rarity)}</b></div>
              <div><span>COMPATIBLE</span>
                <b>{selectedCompatible ? '✓' : '✕'}</b>
              </div>
            </div>
            <div className="setup-card-preview">
              <span className="setup-panel-subtitle">PREVIEW · {previewChar?.name ?? characterId}</span>
              <div className="setup-card-preview-stage">
                {showChargePreview && previewPowerUrl ? (
                  <img src={previewPowerUrl} alt="" className="setup-card-preview-power" draggable={false} />
                ) : previewChibiUrl ? (
                  <img src={previewChibiUrl} alt="" className="setup-card-preview-chibi" draggable={false} />
                ) : null}
                <span className={selectedCompatible ? 'setup-card-preview-ok' : 'setup-card-preview-bad'}>
                  {selectedCompatible ? 'COMPATIBLE ✓' : 'INCOMPATIBLE ✕'}
                </span>
              </div>
            </div>
            <button type="button" className="setup-small-btn setup-add-btn"
              onClick={() => { if (selectedCompatible && copiesInDeck(selected.id) < MAX_COPIES) onAdd(selected.id); }}
              disabled={!selectedCompatible || copiesInDeck(selected.id) >= MAX_COPIES}>
              ADD TO DECK{copiesInDeck(selected.id) >= MAX_COPIES ? ' (MAX)' : ''}
            </button>
          </div>
        ) : (
          <span className="setup-empty-hint">Select a card</span>
        )}
      </div>
    </div>
  );
}

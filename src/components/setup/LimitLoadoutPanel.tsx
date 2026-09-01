// ═══════════════════════════════════════════════════════════════════════
// LIMIT LOADOUT PANEL — configuración de Limits por capacidad real
// ═══════════════════════════════════════════════════════════════════════
// Slots = getLimitCapacity(characterId) (NORMAL 3 · registros con 2).
// NUNCA 5 slots (los 5 bytes del battle block son almacenamiento físico).
// La lista de disponibles usa la compatibilidad REAL (cardCompatibility).
// Los Limits NO entran en el Joint Deck (sistema separado, corpus §47).
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { getLimitCapacity } from '../../data/limitLoadout';
import { CARDS, getCard } from '../../data/cards';
import { cardUsableByCharacter } from '../../data/cardCompatibility';
import type { CardDef, CardType } from '../../data/cards';

export interface LimitLoadoutPanelProps {
  characterId: string;
  limits: number[];
  onEquip?: (slot: number, cardId: number) => void;
  onClear?: (slot: number) => void;
  /** Muestra también cartas incompatibles (Dev) — nunca confirma ilegal. */
  showIncompatible?: boolean;
}

export function LimitLoadoutPanel({ characterId, limits, onEquip, onClear, showIncompatible }: LimitLoadoutPanelProps) {
  const capacity = getLimitCapacity(characterId);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [incompatibleVisible, setIncompatibleVisible] = useState(showIncompatible ?? false);
  const readOnly = !onEquip || !onClear;

  const equipped = useMemo(() => new Set(limits.filter(id => id !== 0)), [limits]);
  const equippedCount = equipped.size;

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CARDS.filter(card => {
      if (card.type === 'command' || card.type === 'special') return false;
      const compatible = cardUsableByCharacter(card, characterId);
      if (!compatible && !incompatibleVisible) return false;
      if (equipped.has(card.id)) return false;
      if (q && !card.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [characterId, equipped, incompatibleVisible, search]);

  return (
    <div className="setup-limits" data-testid="limit-loadout">
      <div className="setup-panel-title">
        <span>LIMIT LOADOUT</span>
        {readOnly ? <span className="setup-limits-locked">🔒 ROM LOADOUT</span> : <span className="setup-limits-count">{equippedCount} / {capacity} EQUIPPED</span>}
      </div>

      {/* Slots — renderizados por la capacidad REAL del personaje */}
      <div className="setup-limits-slots">
        {Array.from({ length: capacity }, (_, slot) => {
          const cardId = limits[slot] ?? 0;
          const card = cardId ? getCard(cardId) : undefined;
          return (
            <button
              key={slot}
              type="button"
              className={`setup-limit-slot${openSlot === slot ? ' open' : ''}${card ? ' filled' : ''}${readOnly ? ' locked' : ''}`}
              onClick={readOnly ? undefined : () => setOpenSlot(openSlot === slot ? null : slot)}
              data-testid={`limit-slot-${slot}`}
            >
              <span className="setup-limit-slot-num">LIMIT {slot + 1}</span>
              {card ? (
                <span className="setup-limit-slot-card">
                  <b>{card.name}</b>
                  <i>{card.type.toUpperCase()} · CC {card.cc}</i>
                </span>
              ) : (
                <span className="setup-limit-slot-empty">EMPTY</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Picker de límites del slot abierto */}
      {openSlot !== null && (
        <div className="setup-limits-picker">
          <div className="setup-limits-picker-head">
            <span>AVAILABLE LIMITS — SLOT {openSlot + 1}</span>
            <div className="setup-limits-picker-tools">
              <input
                className="setup-search"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <label className="setup-check">
                <input type="checkbox" checked={incompatibleVisible}
                  onChange={e => setIncompatibleVisible(e.target.checked)} />
                SHOW INCOMPATIBLE
              </label>
              <button type="button" className="setup-small-btn" onClick={() => setOpenSlot(null)}>CLOSE</button>
            </div>
          </div>
          <div className="setup-limits-list">
            {available.map(card => {
              const compatible = cardUsableByCharacter(card, characterId);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`setup-limit-option${compatible ? '' : ' incompatible'}`}
                  onClick={readOnly ? undefined : () => { if (compatible && onEquip) { onEquip(openSlot, card.id); setOpenSlot(null); } }}
                  disabled={!compatible || readOnly}
                >
                  <span className="setup-limit-option-name">{card.name}</span>
                  <span className="setup-limit-option-meta">
                    {card.type.toUpperCase()} · CC {card.cc} · {card.atk} PWR
                  </span>
                  {!compatible ? <span className="setup-limit-option-x">✕ INCOMPATIBLE</span> : null}
                </button>
              );
            })}
            {available.length === 0 ? <span className="setup-empty-hint">No compatible cards left</span> : null}
          </div>
          {!readOnly && limits[openSlot] ? (
            <button type="button" className="setup-small-btn setup-clear-slot"
              onClick={() => { if (onClear) { onClear(openSlot); setOpenSlot(null); } }}>
              CLEAR SLOT {openSlot + 1}
            </button>
          ) : null}
        </div>
      )}

      {/* Separación visual: los Limits NUNCA son cartas del Joint Deck */}
      <div className="setup-limits-note">
        Limits are a separate system from the 20-card Joint Deck.
      </div>
    </div>
  );
}

export function limitCardType(card: CardDef): CardType {
  return card.type;
}

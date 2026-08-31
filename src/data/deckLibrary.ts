import { DECK_SIZE, getCard } from './cards';

export const LEGACY_DECK_KEY = 'dbzlsw_deck';
export const DECK_LIBRARY_KEY = 'dbzlsw_deck_library_v1';
export const MAX_SAVED_DECKS = 6;

export interface SavedDeck {
  id: string;
  name: string;
  cards: number[];
  starterKind?: 'damage' | 'beam';
}

export interface DeckLibraryState {
  activeDeckId: string;
  decks: SavedDeck[];
}

type DeckStorage = Pick<Storage, 'getItem' | 'setItem'>;

function availableStorage(storage?: DeckStorage): DeckStorage | undefined {
  if (storage) return storage;
  try { return window.localStorage; } catch { return undefined; }
}

function validCards(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id): id is number => Number.isInteger(id) && Boolean(getCard(id)))
    .slice(0, DECK_SIZE);
}

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const name = value.trim().slice(0, 24);
  return name || fallback;
}

function uniqueId(seed: string, used: Set<string>): string {
  const base = seed.replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'deck';
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export function makeDeckLibrary(cards: number[], name = 'MY DECK'): DeckLibraryState {
  const deck: SavedDeck = { id: 'deck-1', name: cleanName(name, 'MY DECK'), cards: validCards(cards) };
  return { activeDeckId: deck.id, decks: [deck] };
}

export function normalizeDeckLibrary(value: unknown, fallbackCards: number[]): DeckLibraryState {
  if (!value || typeof value !== 'object') return makeDeckLibrary(fallbackCards);
  const raw = value as Partial<DeckLibraryState>;
  if (!Array.isArray(raw.decks)) return makeDeckLibrary(fallbackCards);

  const used = new Set<string>();
  const decks = raw.decks.slice(0, MAX_SAVED_DECKS).map((entry, index): SavedDeck | null => {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as Partial<SavedDeck>;
    const id = uniqueId(typeof item.id === 'string' ? item.id : `deck-${index + 1}`, used);
    return {
      id,
      name: cleanName(item.name, `DECK ${index + 1}`),
      cards: validCards(item.cards),
      ...(item.starterKind === 'damage' || item.starterKind === 'beam' ? { starterKind: item.starterKind } : {}),
    };
  }).filter((deck): deck is SavedDeck => Boolean(deck));

  if (decks.length === 0) return makeDeckLibrary(fallbackCards);
  const activeDeckId = decks.some(deck => deck.id === raw.activeDeckId)
    ? String(raw.activeDeckId)
    : decks[0].id;
  return { activeDeckId, decks };
}

export function loadDeckLibrary(fallbackCards: number[], storage?: DeckStorage): DeckLibraryState {
  const target = availableStorage(storage);
  if (!target) return makeDeckLibrary(fallbackCards);
  try {
    const rawLibrary = target.getItem(DECK_LIBRARY_KEY);
    if (rawLibrary) return normalizeDeckLibrary(JSON.parse(rawLibrary), fallbackCards);
    const legacy = target.getItem(LEGACY_DECK_KEY);
    const cards = legacy ? validCards(JSON.parse(legacy)) : validCards(fallbackCards);
    return makeDeckLibrary(cards.length ? cards : fallbackCards);
  } catch {
    return makeDeckLibrary(fallbackCards);
  }
}

export function activeSavedDeck(library: DeckLibraryState): SavedDeck {
  return library.decks.find(deck => deck.id === library.activeDeckId) ?? library.decks[0];
}

export function saveDeckLibrary(library: DeckLibraryState, storage?: DeckStorage): DeckLibraryState {
  const normalized = normalizeDeckLibrary(library, activeSavedDeck(library)?.cards ?? []);
  const target = availableStorage(storage);
  if (target) {
    try {
      target.setItem(DECK_LIBRARY_KEY, JSON.stringify(normalized));
      target.setItem(LEGACY_DECK_KEY, JSON.stringify(activeSavedDeck(normalized).cards));
    } catch { /* Storage can be disabled or full; keep the in-memory state. */ }
  }
  return normalized;
}

export function selectSavedDeck(library: DeckLibraryState, deckId: string): DeckLibraryState {
  return library.decks.some(deck => deck.id === deckId) ? { ...library, activeDeckId: deckId } : library;
}

export function updateActiveDeckCards(library: DeckLibraryState, cards: number[]): DeckLibraryState {
  return {
    ...library,
    decks: library.decks.map(deck => deck.id === library.activeDeckId ? { ...deck, cards: validCards(cards) } : deck),
  };
}

export function renameSavedDeck(library: DeckLibraryState, deckId: string, name: string): DeckLibraryState {
  return {
    ...library,
    decks: library.decks.map((deck, index) => deck.id === deckId
      ? { ...deck, name: cleanName(name, `DECK ${index + 1}`) }
      : deck),
  };
}

export function addSavedDeck(library: DeckLibraryState, copyActive = false): DeckLibraryState {
  if (library.decks.length >= MAX_SAVED_DECKS) return library;
  const used = new Set(library.decks.map(deck => deck.id));
  const id = uniqueId(`deck-${Date.now().toString(36)}`, used);
  const cards = copyActive ? [...activeSavedDeck(library).cards] : [];
  const next: SavedDeck = { id, name: copyActive ? 'DECK COPY' : `DECK ${library.decks.length + 1}`, cards };
  return { activeDeckId: id, decks: [...library.decks, next] };
}

export function deleteSavedDeck(library: DeckLibraryState, deckId: string): DeckLibraryState {
  if (library.decks.length <= 1) return library;
  const decks = library.decks.filter(deck => deck.id !== deckId);
  if (decks.length === library.decks.length) return library;
  return { decks, activeDeckId: library.activeDeckId === deckId ? decks[0].id : library.activeDeckId };
}

export function starterDeckLibrary(kind: 'damage' | 'beam', cards: number[]): DeckLibraryState {
  const deck: SavedDeck = {
    id: `starter-${kind}`,
    name: kind === 'damage' ? 'STARTER · DAMAGE' : 'STARTER · BEAM',
    cards: validCards(cards),
    starterKind: kind,
  };
  return { activeDeckId: deck.id, decks: [deck] };
}

export function isSavedDeckReady(deck: SavedDeck): boolean {
  return deck.cards.length === DECK_SIZE && deck.cards.every(id => Boolean(getCard(id)));
}

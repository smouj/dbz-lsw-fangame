import { describe, expect, it } from 'vitest';
import {
  DECK_LIBRARY_KEY,
  LEGACY_DECK_KEY,
  activeSavedDeck,
  addSavedDeck,
  deleteSavedDeck,
  isSavedDeckReady,
  loadDeckLibrary,
  makeDeckLibrary,
  renameSavedDeck,
  saveDeckLibrary,
  selectSavedDeck,
  updateActiveDeckCards,
} from './deckLibrary';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const twenty = Array.from({ length: 20 }, (_, index) => (index % 5) + 1);

describe('deck library', () => {
  it('migrates the legacy deck without losing card order', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_DECK_KEY, JSON.stringify([4, 3, 2, 1]));
    expect(activeSavedDeck(loadDeckLibrary(twenty, storage)).cards).toEqual([4, 3, 2, 1]);
  });

  it('normalizes bad persisted data to a usable fallback', () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_LIBRARY_KEY, '{broken');
    expect(activeSavedDeck(loadDeckLibrary(twenty, storage)).cards).toEqual(twenty);
  });

  it('supports create, copy, rename and card updates without aliasing arrays', () => {
    let library = makeDeckLibrary([1, 2, 3]);
    library = addSavedDeck(library, true);
    const copiedId = library.activeDeckId;
    library = renameSavedDeck(library, copiedId, '  Beam squad  ');
    library = updateActiveDeckCards(library, [7, 8]);
    expect(activeSavedDeck(library)).toMatchObject({ name: 'Beam squad', cards: [7, 8] });
    expect(library.decks[0].cards).toEqual([1, 2, 3]);
  });

  it('keeps one deck and ignores unknown selections', () => {
    const library = makeDeckLibrary([1]);
    expect(selectSavedDeck(library, 'missing')).toBe(library);
    expect(deleteSavedDeck(library, library.activeDeckId)).toBe(library);
  });

  it('persists the library and bridges its active deck to the legacy battle key', () => {
    const storage = new MemoryStorage();
    const library = saveDeckLibrary(makeDeckLibrary([8, 9]), storage);
    expect(JSON.parse(storage.getItem(DECK_LIBRARY_KEY)!)).toEqual(library);
    expect(JSON.parse(storage.getItem(LEGACY_DECK_KEY)!)).toEqual([8, 9]);
  });

  it('marks only complete 20-card presets as ready', () => {
    expect(isSavedDeckReady(activeSavedDeck(makeDeckLibrary(twenty)))).toBe(true);
    expect(isSavedDeckReady(activeSavedDeck(makeDeckLibrary(twenty.slice(0, 19))))).toBe(false);
  });
});

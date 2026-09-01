// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — Enemy Loadout Presets (ROM SSOT)
// ═══════════════════════════════════════════════════════════════════════
// Cada forma enemiga tiene un preset canónico derivado del ROM.
// NO inventar valores para completar 48/48 — los no verificados quedan
// como UNRESOLVED y se resuelven con evidencia ROM.
// ═══════════════════════════════════════════════════════════════════════

import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from './enemy_decks';
import { getLimitCapacity } from './limitLoadout';
import { CARDS, DECK_SIZE } from './cards';

// ── Provenance ──────────────────────────────────────────────────────
export type LoadoutProvenance =
  | 'ROM_STATIC_VERIFIED'      // Extraído estáticamente del ROM y verificado
  | 'ROM_DYNAMIC_VERIFIED'     // Derivado de runtime ROM y verificado
  | 'ROM_ENCOUNTER_DERIVED'    // Derivado de datos de encounter (story chapters)
  | 'UNRESOLVED';              // No verificado aún — NO usar como canónico

// ── Enemy Loadout Preset ────────────────────────────────────────────
export interface EnemyLoadoutPreset {
  /** Form ID (e.g. 'piccolo_base', 'frieza_final') */
  formId: string;
  /** Character ID (e.g. 'piccolo', 'frieza') */
  characterId: string;
  /** Limits (card IDs, 0 = empty slot) */
  limits: number[];
  /** Deck (20 card IDs) */
  deck: number[];
  /** AI stat boosts (over base form stats) */
  aiBoost?: { hp: number; str: number; ki: number; spd: number };
  /** Team companion form ID (for 2v2 encounters) */
  team2FormId?: string;
  /** Provenance of the preset data */
  provenance: LoadoutProvenance;
  /** Context where this preset applies (story chapter, versus, etc.) */
  context: 'story' | 'versus';
  /** Optional story chapter this preset came from */
  storyChapter?: number;
  /** Optional ROM address evidence */
  romAddress?: string;
}

// ── Story → Versus preset resolution ────────────────────────────────
// For versus mode, we use the strongest story encounter for each character
// as the canonical "CPU preset". This is the same deck the GBC uses when
// you fight that character in their hardest story chapter.

/** Map characterId → their strongest story chapter (for versus preset) */
const VERSUS_CHAPTER_BY_CHARACTER: Record<string, number> = {
  piccolo: 1,           // Chapter 1
  nappa: 2,              // Chapter 2
  vegeta: 4,             // Chapter 4 (stronger than ch3)
  guldo: 5,              // Chapter 5
  recoome: 6,            // Chapter 6
  ginyu: 8,              // Chapter 8 (Ginyu & Jeice)
  frieza: 10,            // Chapter 10 (strongest form)
  goku: 11,              // Chapter 11 (enemy Goku)
  android_19: 12,        // Chapter 12
  android_20: 13,        // Chapter 13
  cell: 20,              // Chapter 20 (perfect, strongest)
  android_17: 15,        // Chapter 15
  android_16: 16,        // Chapter 16 (16 & 18)
  android_18: 16,        // Chapter 16 (16 & 18)
  cell_jr: 18,           // Chapter 18
  buu: 32,               // Chapter 32 (Kid Buu, strongest)
  goten: 23,             // Chapter 23
  trunks_kid: 24,        // Chapter 24 (vs Gotenks? No — Trunks chapter)
  trunks_future: 27,     // Chapter 27
  gohan_kid: 7,          // Chapter 7 (Gohan & Goku vs Jeice & Burter)
  gohan_adult: 22,       // Chapter 22 (vs Cell)
  gotenks: 23,           // Chapter 23
  krillin: 2,            // Chapter 2 (ally, but has encounter data)
  vegito: 32,            // Chapter 32
  jeice: 7,              // Chapter 7
  burter: 7,             // Chapter 7
};

/** Form → character extraction */
function formToCharacter(formId: string): string {
  // Most forms follow pattern: characterName[_suffix]
  // e.g. 'piccolo_base' → 'piccolo', 'frieza_final' → 'frieza'
  const knownCharacters = [
    'goku', 'vegeta', 'gohan_kid', 'gohan_adult', 'piccolo', 'krillin',
    'trunks_kid', 'trunks_future', 'goten', 'gotenks', 'frieza',
    'cell', 'cell_jr', 'android_16', 'android_17', 'android_18',
    'android_19', 'android_20', 'ginyu', 'recoome', 'guldo',
    'jeice', 'burter', 'nappa', 'buu', 'vegito',
  ];
  // Try to match the longest character prefix
  for (const charId of knownCharacters) {
    if (formId === charId || formId.startsWith(charId + '_')) {
      return charId;
    }
  }
  return formId; // fallback
}

/** Default limits for a character (empty slots, size from getLimitCapacity) */
function defaultLimitsForCharacter(characterId: string): number[] {
  const cap = getLimitCapacity(characterId);
  return new Array(cap).fill(0);
}

/** Default versus deck for a character: their story deck if known, else UNRESOLVED sentinel */
function versusDeckForCharacter(characterId: string): { deck: number[]; provenance: LoadoutProvenance; storyChapter?: number } {
  const chapter = VERSUS_CHAPTER_BY_CHARACTER[characterId];
  if (chapter && STORY_ENEMY_DECKS[chapter]) {
    return {
      deck: STORY_ENEMY_DECKS[chapter],
      provenance: 'ROM_ENCOUNTER_DERIVED' as const,
      storyChapter: chapter,
    };
  }
  // No story data — mark as unresolved
  return {
    deck: [],
    provenance: 'UNRESOLVED' as const,
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Resolve the canonical CPU preset for a given form in versus mode.
 * Returns the enemy loadout with provenance — never invents data.
 */
export function resolveEnemyLoadout(formId: string): EnemyLoadoutPreset {
  const characterId = formToCharacter(formId);
  const { deck, provenance, storyChapter } = versusDeckForCharacter(characterId);
  const aiBoost = storyChapter ? STORY_AI_BOOSTS[storyChapter] : undefined;

  // Team battles: check if this character's chapter has a 2v2 encounter
  const team2FormId = storyChapter && TEAM_BATTLES[storyChapter]
    ? TEAM_BATTLES[storyChapter].enemy2
    : undefined;

  return {
    formId,
    characterId,
    limits: defaultLimitsForCharacter(characterId),
    deck,
    aiBoost,
    team2FormId,
    provenance,
    context: 'versus',
    storyChapter,
  };
}

/**
 * Check if an enemy loadout is fully resolved (has a real deck).
 * UNRESOLVED presets should be flagged in the UI.
 */
export function isLoadoutResolved(preset: EnemyLoadoutPreset): boolean {
  return preset.provenance !== 'UNRESOLVED' && preset.deck.length >= DECK_SIZE;
}

/**
 * Get all enemy loadout presets for a set of form IDs.
 * Pass ROM_ORDERED_CHARACTERS[].flatMap(c => c.forms) to get all.
 */
export function allVersusPresets(formIds: string[]): EnemyLoadoutPreset[] {
  const seen = new Set<string>();
  const presets: EnemyLoadoutPreset[] = [];
  for (const formId of formIds) {
    if (seen.has(formId)) continue;
    seen.add(formId);
    presets.push(resolveEnemyLoadout(formId));
  }
  return presets;
}

/**
 * Future unlock gate: when true, rival loadout editing becomes available.
 * Always false for now — architecture ready, feature not activated.
 */
export const ENEMY_LOADOUT_EDITING_UNLOCKED = false;
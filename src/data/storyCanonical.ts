// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — CANONICAL STORY IDENTITY (ROM ORDER)
// ═══════════════════════════════════════════════════════════════════════
// Runtime/save compatibility keeps a monotonic sequenceIndex (1..32), but
// sequenceIndex is NOT the cartridge Story number after Story 20.
//
// Cartridge order:
//   Story 01..20 → EX Story 1 (ROM storyId 33) → EX Story 2 (34)
//   → Story 21..30.
//
// This module is deliberately presentation/narrative-only. The Story Map VM
// ($29-$2F) is not represented here and must never become a runtime dependency
// of the remake's dialogue flow.
// ═══════════════════════════════════════════════════════════════════════

import { STORY_LOCATIONS } from './storyRom';

export type CanonicalStoryKind = 'MAIN' | 'EXTRA';
export type CanonicalStoryArc = 'SAIYAN_NAMEK' | 'ANDROID_CELL' | 'FUTURE_TRUNKS' | 'MAJIN_BUU';

export interface CanonicalStoryIdentity {
  /** Existing remake progression index; stable for saves and battle tables. */
  sequenceIndex: number;
  /** Stable semantic id. Never derive this from sequenceIndex by display code. */
  id: string;
  /** Physical Story id used by the ROM directory: MAIN=1..30, EXTRA=33/34. */
  romStoryId: number;
  kind: CanonicalStoryKind;
  /** Human Story number (1..30) or EX number (1..2). */
  storyNumber: number;
  label: string;
  title: string;
  arc: CanonicalStoryArc;
  /** Legacy editorial script key; this is never a ROM-text claim. */
  editorialScriptKey: number;
  rom: {
    bank: number;
    address: number;
  };
}

const MAIN_TITLES: Record<number, string> = {
  1: "Evil Mentor! Gohans' Training",
  2: "The Fierce Saiyan! Gohan's Deathmatch",
  3: 'Beyond the Limits! Goku VS Vegeta',
  4: 'Time for a Miracle! The Saiyan Gohan',
  5: 'Launch Into Space! The Hope of Namek',
  6: "Recoome's Attack! Strong and Evil",
  7: 'Red and Blue Orbs! Jeice and Burter',
  8: 'The Big Duel! Capt. Ginyu Emerges',
  9: 'The Final Battle! No Escape For You',
  10: "Victory is Mine!! Frieza's Battle",
  11: 'The Fateful Day - Fight for Future',
  12: 'Stealth Weapon! The Android Revealed',
  13: "Fearless No. 20 - Dr. Gero's Secret",
  14: 'A Premonition! The New Terror',
  15: 'A Walking Weapon!! The Android Cometh',
  16: 'Goku and Gohan - Family Training',
  17: 'Challenging Cell!! The Duel Unfolds',
  18: 'Raging Gohan! Awakening Power',
  19: 'Heir to Strength: His Name is Gohan',
  20: 'Goku to Gohan... Soul Transfer',
  21: 'Goku Resurrected!? World-Class Match',
  22: 'Sheer Bliss! A Young Champion',
  23: 'Dark Mastermind! Evil Master Babidi',
  24: "Warrior's Resolve! I'll Finish This",
  25: 'Defeat Evil Buu! Gohan-Goten Training',
  26: 'Training Success!! The End For Buu?',
  27: 'Gohan Reborn!! Return to Earth',
  28: 'Buu Brilliance!? A Shocking Power!',
  29: 'Goku Revived!! Save the Universe',
  30: 'Seize the Day! Universal Battle!',
};

const EXTRA_TITLES: Record<number, string> = {
  1: 'Another Ending - Save Our Future',
  2: "For Future Peace... Trunks' Last Fight",
};

function arcFor(kind: CanonicalStoryKind, storyNumber: number): CanonicalStoryArc {
  if (kind === 'EXTRA') return 'FUTURE_TRUNKS';
  if (storyNumber <= 10) return 'SAIYAN_NAMEK';
  if (storyNumber <= 20) return 'ANDROID_CELL';
  return 'MAJIN_BUU';
}

function romLocation(romStoryId: number) {
  const location = STORY_LOCATIONS.find((x) => x.storyId === romStoryId);
  if (!location) throw new Error(`Missing ROM Story location for storyId=${romStoryId}`);
  return { bank: location.bank, address: location.address };
}

function main(sequenceIndex: number, storyNumber: number): CanonicalStoryIdentity {
  return {
    sequenceIndex,
    id: `STORY_${String(storyNumber).padStart(2, '0')}`,
    romStoryId: storyNumber,
    kind: 'MAIN',
    storyNumber,
    label: `Story ${storyNumber}`,
    title: MAIN_TITLES[storyNumber] ?? `Story ${storyNumber}`,
    arc: arcFor('MAIN', storyNumber),
    editorialScriptKey: storyNumber,
    rom: romLocation(storyNumber),
  };
}

function extra(sequenceIndex: number, extraNumber: number, romStoryId: 33 | 34): CanonicalStoryIdentity {
  return {
    sequenceIndex,
    id: `EX_STORY_${String(extraNumber).padStart(2, '0')}`,
    romStoryId,
    kind: 'EXTRA',
    storyNumber: extraNumber,
    label: `EX Story ${extraNumber}`,
    title: EXTRA_TITLES[extraNumber],
    arc: 'FUTURE_TRUNKS',
    // storyScript.ts stores its two editorial EX reconstructions at 31/32.
    // Canonical identity still points to physical ROM Story ids 33/34 above.
    editorialScriptKey: 30 + extraNumber,
    rom: romLocation(romStoryId),
  };
}

const identities: CanonicalStoryIdentity[] = [];
for (let story = 1; story <= 20; story++) identities.push(main(story, story));
identities.push(extra(21, 1, 33));
identities.push(extra(22, 2, 34));
for (let story = 21; story <= 30; story++) identities.push(main(story + 2, story));

export const CANONICAL_STORY_ORDER: readonly CanonicalStoryIdentity[] = Object.freeze(identities);

export function storyIdentityForSequence(sequenceIndex: number): CanonicalStoryIdentity {
  const story = CANONICAL_STORY_ORDER[sequenceIndex - 1];
  if (!story || story.sequenceIndex !== sequenceIndex) {
    throw new Error(`Invalid Story sequenceIndex=${sequenceIndex}; expected 1..32`);
  }
  return story;
}

export function storyDisplayLabel(sequenceIndex: number): string {
  return storyIdentityForSequence(sequenceIndex).label;
}

/** Maps the remake progression slot to the old PDF/editorial script key. */
export function editorialStoryKeyForSequence(sequenceIndex: number): number {
  return storyIdentityForSequence(sequenceIndex).editorialScriptKey;
}

/**
 * Canon invariant used by verification and tooling.
 * This is intentionally exported so no caller re-implements the 20/EX/21 split.
 */
export const STORY_SEQUENCE_CANON = {
  totalSequenceEntries: 32,
  mainStories: 30,
  extraStories: 2,
  extraSequenceIndexes: [21, 22] as const,
  extraRomStoryIds: [33, 34] as const,
  extraEditorialScriptKeys: [31, 32] as const,
  mapRuntimeIncluded: false,
} as const;

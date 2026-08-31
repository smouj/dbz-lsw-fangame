// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — DIALOGUE-ONLY STORY NARRATIVE CANON
// ═══════════════════════════════════════════════════════════════════════
// Single presentation-facing Story source.
//
// Included: Story identity/order, dialogue text, speaker, portrait/form/emotion,
// physical cutscene background and transition to battle.
// Excluded by design: Story Map VM, free movement, NPCs, hotspots, triggers,
// pickups and every exploration/RPG mechanic ($29-$2F).
//
// Text precedence:
//   1) ROM_STORY_DIALOGUE when a persisted beat is ROM_LITERAL_TEXT.
//   2) STORY_SCRIPT as an explicitly-labelled editorial reconstruction.
//      MAIN Story keys are 1..30; the two EX reconstructions are 31/32.
//      It is NEVER reported as literal ROM text.
// ═══════════════════════════════════════════════════════════════════════

import { STORY_SCRIPT, type StoryScriptLine } from './storyScript';
import type { PortraitEmotion } from './storyPortraits';
import {
  storyIdentityForSequence,
  type CanonicalStoryIdentity,
} from './storyCanonical';
import {
  cutsceneForDialogueBeat,
  firstCutsceneForStory,
  lastCutsceneForStory,
  STORY_CUTSCENE_BINDING_EVIDENCE,
  type CutsceneBindingEvidence,
} from './storyCutsceneCanon';
import {
  canonicalStoryPortraitUrl,
  STORY_PORTRAIT_BINDING_EVIDENCE,
  type StoryPortraitBindingEvidence,
} from './storyPortraitCanon';
import {
  ROM_STORY_DIALOGUE,
  type RomStoryDialogueBeat,
} from './generated/storyDialogueRom.generated';

export type StoryTextEvidence = 'ROM_LITERAL_TEXT' | 'EDITORIAL_RECONSTRUCTION';

export interface CanonicalStoryDialogueLine {
  index: number;
  speaker: string;
  character: string | null;
  form?: string;
  emotion: PortraitEmotion;
  text: string;
  textEvidence: StoryTextEvidence;
  portraitUrl?: string;
  portraitEvidence?: StoryPortraitBindingEvidence;
  background: string;
  backgroundAssetId: number;
  backgroundEvidence: CutsceneBindingEvidence;
  rom?: {
    pc: number;
    speakerId: number | null;
    portraitId: number | null;
    sceneResource: { bank: number; index: number } | null;
  };
}

export interface CanonicalStoryNarrative {
  identity: CanonicalStoryIdentity;
  title: string;
  battle: string | null;
  saga: string | null;
  textEvidence: StoryTextEvidence;
  lines: readonly CanonicalStoryDialogueLine[];
  openingBackground: string;
  closingBackground: string;
  mapRuntimeIncluded: false;
}

const SPEAKER_NAMES = [
  'Gohan', 'Piccolo', 'Krillin', 'Vegeta', 'Nappa', 'Yamcha', 'Tien', 'Goku',
  'Yajirobe', 'Chi-Chi', 'Bulma', 'Dende', 'Nail', 'Guru', 'Recoome', 'Burter',
  'Jeice', 'Guldo', 'Ginyu', 'Frieza', 'Kaio', 'Muri', 'Boy', 'Trunks',
  'No.20', 'No.19', 'No.18', 'No.17', 'No.16', 'Roshi', 'Cell', 'Hercule',
  'Cell Jr.', 'Videl', 'Goten', 'Announcer', 'Yamu', 'Spopovich', 'Sup.Kai',
  'Kibito', 'Audience', 'Babidi', 'Dabura', 'PuiPui', 'Buu', 'Eld.Kai',
  'Gotenks', 'Baba',
] as const;

const SPEAKER_CHARACTERS: Record<number, string | null> = {
  0: 'gohan', 1: 'piccolo', 2: 'krillin', 3: 'vegeta', 4: 'nappa', 5: 'yamcha',
  6: 'tien', 7: 'goku', 8: 'yajirobe', 9: 'chi_chi', 10: 'bulma', 11: 'dende',
  12: 'nail', 13: 'guru', 14: 'recoome', 15: 'burter', 16: 'jeice', 17: 'guldo',
  18: 'ginyu', 19: 'frieza', 20: 'king_kai', 21: null, 22: null, 23: 'trunks_future',
  24: 'android_20', 25: 'android_19', 26: 'android_18', 27: 'android_17',
  28: 'android_16', 29: 'roshi', 30: 'cell', 31: 'hercule', 32: 'cell_jr',
  33: 'videl', 34: 'goten', 35: 'tournament_announcer', 36: 'yamu',
  37: 'spopovich', 38: 'supreme_kai', 39: 'kibito', 40: 'spectator', 41: 'babidi',
  42: 'dabura', 43: 'puipui', 44: 'majin_buu', 45: 'elder_kai', 46: 'gotenks',
  47: 'baba',
};

/**
 * Corrects overloaded editorial character ids using Story context.
 * `storyScript.ts` intentionally uses broad ids such as `cell`, `fat_buu` and
 * `trunks`; this layer chooses the physical Story portrait family without
 * modifying the editorial source.
 */
function canonicalCharacterForLine(
  identity: CanonicalStoryIdentity,
  line: StoryScriptLine,
): string | null {
  const character = line.character;
  if (!character) return null;

  // Story 14 and EX Story 2 explicitly feature Cell's first/imperfect form.
  if (character === 'cell' && (identity.id === 'STORY_14' || identity.id === 'EX_STORY_02')) {
    return 'cell_imperfect';
  }

  // From Story 26 onward the Buu fighting Gotenks/Gohan is Super Buu, not Fat Buu.
  if (character === 'fat_buu' && identity.kind === 'MAIN' && identity.storyNumber >= 26 && identity.storyNumber <= 29) {
    return 'majin_buu';
  }

  // The editorial script uses `trunks` for both timelines. Explicit kid form
  // remains kid; unqualified "TRUNKS DEL FUTURO" remains the Future portrait.
  if (character === 'trunks') {
    if (line.form === 'kid' || line.speaker.includes('NIÑO')) return 'trunks_kid';
    if (line.speaker.includes('FUTURO') || identity.kind === 'EXTRA') return 'trunks_future';
  }

  // Adult Gohan must never fall through to the young-Gohan portrait family.
  if (character === 'gohan' && identity.kind === 'MAIN' && identity.storyNumber >= 21) {
    return 'gohan_adult';
  }

  return character;
}

/** Beat-aware physical form selection for dialogue portraits. */
function canonicalFormForLine(
  identity: CanonicalStoryIdentity,
  line: StoryScriptLine,
  index: number,
): string | undefined {
  const character = line.character ?? '';
  if (line.form) return line.form;

  // Namek finale.
  if (identity.id === 'STORY_10' && character === 'goku') return 'ssj';
  if ((identity.id === 'STORY_09' || identity.id === 'STORY_10') && character === 'frieza') return 'final';

  // Cell Games / Room of Spirit and Time progression.
  if (identity.id === 'STORY_16' && character === 'gohan') {
    // Editorial beat 5 states that Gohan starts mastering the transformation.
    return index >= 6 ? 'ssj' : undefined;
  }
  if (identity.id === 'STORY_17') {
    if (character === 'gohan' || character === 'goku') return 'ssj';
  }
  if (identity.id === 'STORY_18') {
    if (character === 'goku') return 'ssj';
    if (character === 'gohan') {
      // Beat 9 is the explicit SSJ2 transformation narration.
      return index >= 10 ? 'ssj2' : 'ssj';
    }
  }
  if (identity.id === 'STORY_19' || identity.id === 'STORY_20') {
    if (character === 'gohan') return 'ssj2';
    if (character === 'goku') return 'ssj';
  }

  // Buu-era age/form identity.
  if (identity.kind === 'MAIN' && identity.storyNumber >= 21) {
    if (character === 'gohan') {
      // Story 27 activates Ultimate form at narration beat 6; prior Gohan line is adult base.
      if (identity.storyNumber === 27) return index >= 7 ? 'ultimate' : 'adult';
      return identity.storyNumber >= 28 ? 'ultimate' : 'adult';
    }
    // Majin Vegeta spans the duel, Buu fight and sacrifice opening of Story 25.
    if (character === 'vegeta' && identity.storyNumber >= 23 && identity.storyNumber <= 25) return 'majin';
    if (character === 'vegito') return 'ssj';
  }

  return undefined;
}

function buildEditorialLine(
  identity: CanonicalStoryIdentity,
  line: StoryScriptLine,
  index: number,
  count: number,
): CanonicalStoryDialogueLine {
  const background = cutsceneForDialogueBeat(identity.sequenceIndex, index, count);
  const character = canonicalCharacterForLine(identity, line);
  const form = canonicalFormForLine(identity, line, index);
  const portraitUrl = character
    ? canonicalStoryPortraitUrl(character, form, line.emotion)
    : undefined;
  return {
    index,
    speaker: line.speaker,
    character,
    form,
    emotion: line.emotion,
    text: line.text,
    textEvidence: 'EDITORIAL_RECONSTRUCTION',
    portraitUrl,
    portraitEvidence: portraitUrl ? STORY_PORTRAIT_BINDING_EVIDENCE : undefined,
    background: background.url,
    backgroundAssetId: background.id,
    backgroundEvidence: STORY_CUTSCENE_BINDING_EVIDENCE,
  };
}

function buildRomLine(
  identity: CanonicalStoryIdentity,
  beat: RomStoryDialogueBeat,
  index: number,
  count: number,
): CanonicalStoryDialogueLine {
  const speakerId = beat.speakerId;
  const character = speakerId == null ? null : (SPEAKER_CHARACTERS[speakerId] ?? null);
  const speaker = speakerId == null ? 'NARRATOR' : (SPEAKER_NAMES[speakerId] ?? `SPEAKER_${speakerId}`);
  const background = cutsceneForDialogueBeat(identity.sequenceIndex, index, count);
  const portraitUrl = character ? canonicalStoryPortraitUrl(character) : undefined;
  return {
    index,
    speaker,
    character,
    emotion: 'normal',
    text: beat.text,
    textEvidence: 'ROM_LITERAL_TEXT',
    portraitUrl,
    portraitEvidence: portraitUrl ? STORY_PORTRAIT_BINDING_EVIDENCE : undefined,
    background: background.url,
    backgroundAssetId: background.id,
    // Until sceneResource → physical PNG reconciliation is persisted, the text
    // is ROM literal but the PNG grouping remains semantic physical order.
    backgroundEvidence: STORY_CUTSCENE_BINDING_EVIDENCE,
    rom: {
      pc: beat.pc,
      speakerId: beat.speakerId,
      portraitId: beat.portraitId,
      sceneResource: beat.sceneResource,
    },
  };
}

export function canonicalStoryNarrative(sequenceIndex: number): CanonicalStoryNarrative {
  const identity = storyIdentityForSequence(sequenceIndex);
  const romBeats = ROM_STORY_DIALOGUE[identity.romStoryId];

  if (romBeats?.length) {
    const lines = romBeats.map((beat, index) => buildRomLine(identity, beat, index, romBeats.length));
    return {
      identity,
      title: identity.title,
      battle: null,
      saga: identity.arc,
      textEvidence: 'ROM_LITERAL_TEXT',
      lines,
      openingBackground: firstCutsceneForStory(sequenceIndex).url,
      closingBackground: lastCutsceneForStory(sequenceIndex).url,
      mapRuntimeIncluded: false,
    };
  }

  const script = STORY_SCRIPT[identity.editorialScriptKey];
  if (!script) throw new Error(`Missing editorial Story fallback for ${identity.id} (key ${identity.editorialScriptKey})`);
  const lines = script.dialogue.map((line, index) =>
    buildEditorialLine(identity, line, index, script.dialogue.length));

  return {
    identity,
    title: script.title || identity.title,
    battle: script.battle,
    saga: script.saga,
    textEvidence: 'EDITORIAL_RECONSTRUCTION',
    lines,
    openingBackground: firstCutsceneForStory(sequenceIndex).url,
    closingBackground: lastCutsceneForStory(sequenceIndex).url,
    mapRuntimeIncluded: false,
  };
}

export const STORY_NARRATIVE_CANON = {
  mode: 'DIALOGUE_ONLY',
  mapRuntimeIncluded: false,
  textAuthority: '$10 PRINT_LITERAL_TEXT when generated corpus is present',
  fallbackTextAuthority: 'storyScript.ts editorial reconstruction (MAIN 1..30 + EX 31/32)',
} as const;

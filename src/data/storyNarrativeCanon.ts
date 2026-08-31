// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — DIALOGUE-ONLY STORY NARRATIVE CANON
// ═══════════════════════════════════════════════════════════════════════
// This is the single presentation-facing Story source.
//
// Included: Story identity/order, dialogue text, speaker, portrait/form/emotion,
// physical cutscene background, transition to battle.
// Excluded by design: Story Map VM, free movement, NPCs, hotspots, triggers,
// pickups and every exploration/RPG mechanic ($29-$2F).
//
// Text precedence:
//   1) ROM_STORY_DIALOGUE when a persisted beat is ROM_LITERAL_TEXT.
//   2) STORY_SCRIPT as an explicitly-labelled editorial reconstruction for
//      MAIN stories only. It is NEVER reported as literal ROM text.
//   3) The two EX stories use neutral reference summaries until their literal
//      $10 streams are persisted; they never borrow Story 21/22 Buu dialogue.
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

export type StoryTextEvidence =
  | 'ROM_LITERAL_TEXT'
  | 'EDITORIAL_RECONSTRUCTION'
  | 'REFERENCE_SUMMARY';

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

/** Form corrections that are contextual to a MAIN Story rather than a speaker id. */
function canonicalFormForLine(
  identity: CanonicalStoryIdentity,
  line: StoryScriptLine,
): string | undefined {
  const character = line.character ?? '';
  const explicit = line.form;
  if (explicit) return explicit;

  // Namek finale.
  if (identity.id === 'STORY_10' && character === 'goku') return 'ssj';
  if ((identity.storyNumber === 9 || identity.storyNumber === 10) && character === 'frieza') return 'final';

  // Cell-era forms.
  if (identity.kind === 'MAIN' && identity.storyNumber >= 17 && identity.storyNumber <= 20) {
    if (character === 'gohan') return 'ssj2';
  }

  // Buu-era age/form identity.
  if (identity.kind === 'MAIN' && identity.storyNumber >= 21) {
    if (character === 'gohan') return identity.storyNumber >= 27 ? 'ultimate' : 'adult';
    if (character === 'trunks') return 'kid';
    if (character === 'vegeta' && identity.storyNumber === 24) return 'majin';
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
  const form = canonicalFormForLine(identity, line);
  const portraitUrl = line.character
    ? canonicalStoryPortraitUrl(line.character, form, line.emotion)
    : undefined;
  return {
    index,
    speaker: line.speaker,
    character: line.character,
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

const EX_REFERENCE: Record<number, {
  battle: string;
  lines: readonly string[];
}> = {
  1: {
    battle: 'Future Trunks vs. Android 17 & Android 18',
    lines: ['Trunks returns to his future to stop Android 17 and Android 18.'],
  },
  2: {
    battle: 'Future Trunks vs. Cell',
    lines: ['After the androids are defeated, Cell appears in Trunks’ future for the final confrontation.'],
  },
};

function buildExtraReference(identity: CanonicalStoryIdentity): CanonicalStoryNarrative {
  const ref = EX_REFERENCE[identity.storyNumber];
  const lines = ref.lines.map((text, index) => {
    const background = cutsceneForDialogueBeat(identity.sequenceIndex, index, ref.lines.length);
    return {
      index,
      speaker: 'NARRATOR',
      character: null,
      emotion: 'normal' as PortraitEmotion,
      text,
      textEvidence: 'REFERENCE_SUMMARY' as StoryTextEvidence,
      background: background.url,
      backgroundAssetId: background.id,
      backgroundEvidence: STORY_CUTSCENE_BINDING_EVIDENCE,
    };
  });
  return {
    identity,
    title: identity.title,
    battle: ref.battle,
    saga: 'Future Trunks',
    textEvidence: 'REFERENCE_SUMMARY',
    lines,
    openingBackground: firstCutsceneForStory(identity.sequenceIndex).url,
    closingBackground: lastCutsceneForStory(identity.sequenceIndex).url,
    mapRuntimeIncluded: false,
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

  if (identity.kind === 'EXTRA') return buildExtraReference(identity);

  const scriptKey = identity.editorialScriptKey;
  const script = scriptKey == null ? undefined : STORY_SCRIPT[scriptKey];
  if (!script) throw new Error(`Missing editorial Story fallback for ${identity.id}`);
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
  fallbackTextAuthority: 'storyScript.ts editorial reconstruction (MAIN only)',
  extraFallback: 'neutral reference summary; never Story 21/22 Buu dialogue',
} as const;

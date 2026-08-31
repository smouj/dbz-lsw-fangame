// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — STORY PANELS (DIALOGUE-ONLY PRESENTATION PROJECTION)
// ═══════════════════════════════════════════════════════════════════════
// This file no longer owns Story content. It projects storyNarrativeCanon.ts
// into the panel shape consumed by StorySceneScreen and Story Studio.
//
// Canon order is 30 MAIN Stories + 2 EX Stories. sequenceIndex 1..32 remains
// only for save/runtime compatibility.
//
// STRICT SCOPE: dialogue/cutscene presentation only. No Story Map VM, RPG
// exploration, NPC movement, hotspots, triggers or pickups are represented.
// ═══════════════════════════════════════════════════════════════════════

import type { PortraitEmotion } from './storyPortraits';
import { canonicalStoryNarrative, type StoryTextEvidence } from './storyNarrativeCanon';
import {
  STORY_PROLOGUE_CUTSCENES,
  storyCutsceneAsset,
  type CutsceneBindingEvidence,
} from './storyCutsceneCanon';
import type { StoryPortraitBindingEvidence } from './storyPortraitCanon';

export type PanelLayout =
  | 'FULL'
  | 'SPLIT_2'
  | 'PORTRAIT_DIALOGUE'
  | 'IMPACT';

export interface StoryPortrait {
  character: string;
  form?: string;
  side?: 'left' | 'right' | 'center';
  emotion?: PortraitEmotion;
  flip?: boolean;
}

export interface StoryPanelProvenance {
  sequenceIndex: number;
  canonicalStoryId: string;
  romStoryId: number;
  textEvidence?: StoryTextEvidence;
  backgroundAssetId: number;
  backgroundEvidence: CutsceneBindingEvidence | 'ROM_PROLOGUE_PHYSICAL';
  portraitEvidence?: StoryPortraitBindingEvidence;
  /** Always false. The remake intentionally does not implement Story RPG maps. */
  mapRuntimeIncluded: false;
}

export interface StoryPanel {
  id: string;
  layout: PanelLayout;
  /** Physical GBC cutscene PNG under public/assets/cutscenes. */
  background: string;
  title?: string;
  subtitle?: string;
  characters?: StoryPortrait[];
  dialogue?: {
    speaker: string;
    text: string;
    side?: 'left' | 'right' | 'center';
    emotion?: PortraitEmotion;
  };
  effects?: ('flash' | 'zoom' | 'shake' | 'speed')[];
  transition?: 'fade' | 'slash' | 'zoom-in';
  provenance?: StoryPanelProvenance;
}

export interface StoryChapterFlow {
  /** Existing progression slot (1..32), NOT the displayed cartridge Story id. */
  chapter: number;
  canonicalStoryId: string;
  romStoryId: number;
  displayLabel: string;
  intro: StoryPanel[];
  outro?: StoryPanel[];
}

const NAME: Record<string, string> = {
  goku: 'Goku', piccolo: 'Piccolo', gohan: 'Gohan', gohan_kid: 'Gohan', gohan_young: 'Gohan',
  gohan_adult: 'Gohan', vegeta: 'Vegeta', krillin: 'Krillin', frieza: 'Freezer', cell: 'Cell',
  cell_imperfect: 'Cell', cell_semi: 'Cell', cell_semi_perfect: 'Cell', cell_perfect: 'Cell',
  trunks: 'Trunks', trunks_kid: 'Trunks', trunks_future: 'Trunks', goten: 'Goten',
  buu: 'Buu', buu_base: 'Buu', buu_super: 'Buu', buu_kid: 'Kid Buu', kid_buu: 'Kid Buu',
  majin_buu: 'Buu', android_16: 'Android 16', android_17: 'Android 17',
  android_18: 'Android 18', android_19: 'Android 19', android_20: 'Android 20',
  ginyu: 'Ginyu', recoome: 'Recoome', guldo: 'Guldo', jeice: 'Jeice', burter: 'Burter',
  nappa: 'Nappa', cell_jr: 'Cell Jr.', vegito: 'Vegito', gotenks: 'Gotenks',
  yamcha: 'Yamcha', tien: 'Tien', yajirobe: 'Yajirobe', chi_chi: 'Chi-Chi', bulma: 'Bulma',
  dende: 'Dende', nail: 'Nail', guru: 'Guru', roshi: 'Roshi', hercule: 'Hercule',
  videl: 'Videl', babidi: 'Babidi', dabura: 'Dabura', supreme_kai: 'Supreme Kai',
  kibito: 'Kibito', elder_kai: 'Elder Kai', baba: 'Baba', spopovich: 'Spopovich', yamu: 'Yamu',
};

export function characterName(id: string): string {
  return NAME[id] ?? id;
}

/** Physical four-image DBZ recap shown only before Story 1. */
export const INTRO_CUTSCENES: StoryPanel[] = STORY_PROLOGUE_CUTSCENES.map((id, index) => {
  const asset = storyCutsceneAsset(id);
  return {
    id: `intro${index + 1}`,
    layout: 'FULL',
    background: asset.url,
    title: index === 0 ? 'DRAGON BALL Z' : index === 3 ? 'THE STORY BEGINS…' : undefined,
    subtitle: index === 0 ? 'LEGENDARY SUPER WARRIORS' : undefined,
    effects: index === 3 ? ['zoom', 'flash'] : ['zoom'],
    provenance: {
      sequenceIndex: 1,
      canonicalStoryId: 'PROLOGUE',
      romStoryId: 1,
      backgroundAssetId: asset.id,
      backgroundEvidence: 'ROM_PROLOGUE_PHYSICAL',
      mapRuntimeIncluded: false,
    },
  };
});

function sideForSpeaker(
  speakerSides: Map<string, 'left' | 'right'>,
  character: string,
): 'left' | 'right' {
  const known = speakerSides.get(character);
  if (known) return known;
  const side = speakerSides.size % 2 === 0 ? 'left' : 'right';
  speakerSides.set(character, side);
  return side;
}

/**
 * Canonical dialogue-only panel flow.
 *
 * `sequenceIndex` is intentionally retained because battle/save tables already
 * use 1..32. The canonical identity is resolved before selecting any text,
 * portrait or cutscene, so sequence 21/22 are EX Story 1/2 and sequence 23 is
 * Story 21. This prevents the historical EX→Buu dialogue shift.
 */
export function panelsForChapter(sequenceIndex: number): StoryChapterFlow {
  const narrative = canonicalStoryNarrative(sequenceIndex);
  const { identity } = narrative;
  const intro: StoryPanel[] = [];

  if (sequenceIndex === 1) intro.push(...INTRO_CUTSCENES);

  const openingAssetId = narrative.lines[0]?.backgroundAssetId ?? 1;
  intro.push({
    id: `${identity.id.toLowerCase()}-title`,
    layout: 'FULL',
    background: narrative.openingBackground,
    title: identity.label.toUpperCase(),
    subtitle: narrative.title,
    effects: ['zoom'],
    transition: 'zoom-in',
    provenance: {
      sequenceIndex,
      canonicalStoryId: identity.id,
      romStoryId: identity.romStoryId,
      textEvidence: narrative.textEvidence,
      backgroundAssetId: openingAssetId,
      backgroundEvidence: narrative.lines[0]?.backgroundEvidence ?? 'SEMANTIC_PHYSICAL_ORDER',
      mapRuntimeIncluded: false,
    },
  });

  const speakerSides = new Map<string, 'left' | 'right'>();
  for (const line of narrative.lines) {
    if (!line.character) {
      intro.push({
        id: `${identity.id.toLowerCase()}-narrator-${line.index}`,
        layout: 'FULL',
        background: line.background,
        subtitle: line.text,
        transition: 'fade',
        provenance: {
          sequenceIndex,
          canonicalStoryId: identity.id,
          romStoryId: identity.romStoryId,
          textEvidence: line.textEvidence,
          backgroundAssetId: line.backgroundAssetId,
          backgroundEvidence: line.backgroundEvidence,
          mapRuntimeIncluded: false,
        },
      });
      continue;
    }

    const side = sideForSpeaker(speakerSides, line.character);
    intro.push({
      id: `${identity.id.toLowerCase()}-dialogue-${line.index}`,
      layout: 'PORTRAIT_DIALOGUE',
      background: line.background,
      characters: [{
        character: line.character,
        form: line.form,
        side,
        emotion: line.emotion,
      }],
      dialogue: {
        speaker: line.speaker,
        text: line.text,
        side,
        emotion: line.emotion,
      },
      transition: 'fade',
      provenance: {
        sequenceIndex,
        canonicalStoryId: identity.id,
        romStoryId: identity.romStoryId,
        textEvidence: line.textEvidence,
        backgroundAssetId: line.backgroundAssetId,
        backgroundEvidence: line.backgroundEvidence,
        portraitEvidence: line.portraitEvidence,
        mapRuntimeIncluded: false,
      },
    });
  }

  const closingLine = narrative.lines[narrative.lines.length - 1];
  intro.push({
    id: `${identity.id.toLowerCase()}-battle`,
    layout: 'IMPACT',
    background: narrative.closingBackground,
    title: 'BATTLE',
    subtitle: narrative.battle ?? undefined,
    effects: ['flash', 'shake'],
    transition: 'slash',
    provenance: {
      sequenceIndex,
      canonicalStoryId: identity.id,
      romStoryId: identity.romStoryId,
      backgroundAssetId: closingLine?.backgroundAssetId ?? openingAssetId,
      backgroundEvidence: closingLine?.backgroundEvidence ?? 'SEMANTIC_PHYSICAL_ORDER',
      mapRuntimeIncluded: false,
    },
  });

  return {
    chapter: sequenceIndex,
    canonicalStoryId: identity.id,
    romStoryId: identity.romStoryId,
    displayLabel: identity.label,
    intro,
  };
}

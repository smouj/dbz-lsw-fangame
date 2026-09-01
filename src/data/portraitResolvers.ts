import { BATTLE_PORTRAITS } from './battlePortraits';
import { MENU_PORTRAITS } from './icons';
import {
  STORY_PORTRAITS,
  storyPortraitForRosterForm,
  type PortraitEmotion,
} from './storyPortraits';

export type StoryPortraitStatus = 'EXACT' | 'EXPRESSION_FALLBACK' | 'MISSING';
export type ExactPortraitStatus = 'EXACT' | 'MISSING';

export interface StoryPortraitResolution {
  domain: 'story';
  status: StoryPortraitStatus;
  requestedFormId?: string;
  resolvedFormId?: string;
  requestedExpression: PortraitEmotion;
  resolvedExpression?: PortraitEmotion;
  url?: string;
}

export interface BattlePortraitResolution {
  domain: 'battle';
  status: ExactPortraitStatus;
  requestedFormId: string;
  resolvedFormId?: string;
  url?: string;
}

export interface MenuPortraitResolution {
  domain: 'menu';
  status: ExactPortraitStatus;
  requestedId: string;
  resolvedId?: string;
  url?: string;
}

type StoryVariant = {
  url: string;
  expressions?: Partial<Record<PortraitEmotion, string>>;
};

const P = '/assets/portraits/story';

/**
 * Exact narrative identities for speakers that do not use roster form ids.
 * No entry is allowed to point to another transformation as a substitute.
 */
const STORY_CHARACTER_BASE: Readonly<Record<string, StoryVariant>> = {
  goku: { url: STORY_PORTRAITS.goku.base, expressions: STORY_PORTRAITS.goku.emotions },
  gohan: { url: STORY_PORTRAITS.gohan.base, expressions: STORY_PORTRAITS.gohan.emotions },
  gohan_kid: { url: STORY_PORTRAITS.gohan.base, expressions: STORY_PORTRAITS.gohan.emotions },
  gohan_young: { url: STORY_PORTRAITS.gohan.base, expressions: STORY_PORTRAITS.gohan.emotions },
  gohan_adult: { url: `${P}/gohan_adult_01.png` },
  piccolo: { url: STORY_PORTRAITS.piccolo.base, expressions: STORY_PORTRAITS.piccolo.emotions },
  vegeta: { url: STORY_PORTRAITS.vegeta.base, expressions: STORY_PORTRAITS.vegeta.emotions },
  krillin: { url: STORY_PORTRAITS.krillin.base, expressions: STORY_PORTRAITS.krillin.emotions },
  nappa: { url: STORY_PORTRAITS.nappa.base, expressions: STORY_PORTRAITS.nappa.emotions },
  raditz: { url: STORY_PORTRAITS.raditz.base },
  bulma: { url: STORY_PORTRAITS.bulma.base },
  chi_chi: { url: STORY_PORTRAITS.chi_chi.base },
  yajirobe: { url: STORY_PORTRAITS.yajirobe.base, expressions: STORY_PORTRAITS.yajirobe.emotions },
  tien: { url: STORY_PORTRAITS.tien.base, expressions: STORY_PORTRAITS.tien.emotions },
  chiaotzu: { url: STORY_PORTRAITS.chiaotzu.base },
  yamcha: { url: STORY_PORTRAITS.yamcha.base, expressions: STORY_PORTRAITS.yamcha.emotions },
  king_kai: { url: STORY_PORTRAITS.king_kai.base },
  great_ape_vegeta: { url: STORY_PORTRAITS.great_ape_vegeta.base },
  frieza: { url: STORY_PORTRAITS.frieza.base, expressions: STORY_PORTRAITS.frieza.emotions },
  guldo: { url: STORY_PORTRAITS.guldo.base, expressions: STORY_PORTRAITS.guldo.emotions },
  recoome: { url: STORY_PORTRAITS.recoome.base, expressions: STORY_PORTRAITS.recoome.emotions },
  burter: { url: STORY_PORTRAITS.burter.base, expressions: STORY_PORTRAITS.burter.emotions },
  jeice: { url: STORY_PORTRAITS.jeice.base },
  ginyu: { url: STORY_PORTRAITS.ginyu.base },
  ginyu_frog: { url: STORY_PORTRAITS.ginyu_frog.base },
  dende: { url: STORY_PORTRAITS.dende.base },
  kami: { url: STORY_PORTRAITS.kami.base },
  nail: { url: STORY_PORTRAITS.nail.base },
  guru: { url: STORY_PORTRAITS.guru.base },
  android_16: { url: STORY_PORTRAITS.android_16.base, expressions: STORY_PORTRAITS.android_16.emotions },
  android_17: { url: STORY_PORTRAITS.android_17.base },
  android_18: { url: STORY_PORTRAITS.android_18.base },
  android_19: { url: STORY_PORTRAITS.android_19.base },
  android_20: { url: STORY_PORTRAITS.android_20.base },
  android_20_dr_gero: { url: STORY_PORTRAITS.android_20.base },
  cell_imperfect: { url: STORY_PORTRAITS.cell_imperfect.base },
  cell_semi: { url: STORY_PORTRAITS.cell_semi.base },
  cell_semi_perfect: { url: STORY_PORTRAITS.cell_semi.base },
  cell: { url: STORY_PORTRAITS.cell.base, expressions: STORY_PORTRAITS.cell.emotions },
  cell_perfect: { url: STORY_PORTRAITS.cell.base, expressions: STORY_PORTRAITS.cell.emotions },
  cell_jr: { url: STORY_PORTRAITS.cell_jr.base },
  trunks: { url: STORY_PORTRAITS.trunks.base, expressions: STORY_PORTRAITS.trunks.emotions },
  trunks_future: { url: STORY_PORTRAITS.trunks.base, expressions: STORY_PORTRAITS.trunks.emotions },
  trunks_kid: {
    url: `${P}/trunks_kid_01.png`,
    expressions: { surprised: `${P}/trunks_kid_02.png` },
  },
  hercule: { url: STORY_PORTRAITS.hercule.base, expressions: STORY_PORTRAITS.hercule.emotions },
  mr_satan: { url: STORY_PORTRAITS.hercule.base, expressions: STORY_PORTRAITS.hercule.emotions },
  roshi: { url: STORY_PORTRAITS.roshi.base },
  babidi: { url: STORY_PORTRAITS.babidi.base },
  buu: { url: STORY_PORTRAITS.fat_buu.base, expressions: STORY_PORTRAITS.fat_buu.emotions },
  buu_base: { url: STORY_PORTRAITS.fat_buu.base, expressions: STORY_PORTRAITS.fat_buu.emotions },
  fat_buu: { url: STORY_PORTRAITS.fat_buu.base, expressions: STORY_PORTRAITS.fat_buu.emotions },
  buu_super: { url: STORY_PORTRAITS.majin_buu.base, expressions: STORY_PORTRAITS.majin_buu.emotions },
  majin_buu: { url: STORY_PORTRAITS.majin_buu.base, expressions: STORY_PORTRAITS.majin_buu.emotions },
  buu_kid: { url: STORY_PORTRAITS.kid_buu.base },
  kid_buu: { url: STORY_PORTRAITS.kid_buu.base },
  goten: { url: STORY_PORTRAITS.goten.base, expressions: STORY_PORTRAITS.goten.emotions },
  gotenks: { url: STORY_PORTRAITS.gotenks.base },
  vegito: { url: STORY_PORTRAITS.vegito.base },
  dabura: { url: STORY_PORTRAITS.dabura.base, expressions: STORY_PORTRAITS.dabura.emotions },
  elder_kai: { url: STORY_PORTRAITS.elder_kai.base },
  kibito: { url: STORY_PORTRAITS.kibito.base },
  kibito_kai: { url: STORY_PORTRAITS.kibito_kai.base },
  supreme_kai: { url: STORY_PORTRAITS.supreme_kai.base },
  spopovich: { url: STORY_PORTRAITS.spopovich.base },
  videl: { url: STORY_PORTRAITS.videl.base },
  yamu: { url: STORY_PORTRAITS.yamu.base },
  yakon: { url: STORY_PORTRAITS.yakon.base },
  puipui: { url: STORY_PORTRAITS.puipui.base },
  saiyaman: { url: STORY_PORTRAITS.saiyaman.base },
  bee: { url: STORY_PORTRAITS.bee.base },
  baba: { url: STORY_PORTRAITS.baba.base },
  tournament_announcer: { url: STORY_PORTRAITS.tournament_announcer.base },
  spectator: { url: STORY_PORTRAITS.spectator.base },
};

/**
 * Exact Story aliases used by narrative data. These are physical variants of
 * the same requested identity, never approximations to a neighbouring form.
 */
const STORY_FORM_VARIANTS: Readonly<Record<string, Readonly<Record<string, StoryVariant>>>> = {
  goku: {
    ssj: { url: `${P}/goku_ssj_01.png` },
  },
  gohan: {
    ssj: { url: `${P}/gohan_young_ssj_01.png` },
    ssj2: { url: `${P}/gohan_young_ssj2_01.png` },
    adult: { url: `${P}/gohan_adult_01.png` },
    adult_ssj: { url: `${P}/gohan_adult_ssj.png` },
    ultimate: { url: `${P}/gohan_adult_03.png` },
  },
  gohan_kid: {
    ssj: { url: `${P}/gohan_young_ssj_01.png` },
    ssj2: { url: `${P}/gohan_young_ssj2_01.png` },
  },
  gohan_young: {
    ssj: { url: `${P}/gohan_young_ssj_01.png` },
    ssj2: { url: `${P}/gohan_young_ssj2_01.png` },
  },
  gohan_adult: {
    adult: { url: `${P}/gohan_adult_01.png` },
    ssj: { url: `${P}/gohan_adult_ssj.png` },
    adult_ssj: { url: `${P}/gohan_adult_ssj.png` },
    ultimate: { url: `${P}/gohan_adult_03.png` },
  },
  piccolo: {
    kami: { url: `${P}/piccolo_05.png` },
  },
  vegeta: {
    ssj: { url: `${P}/vegeta_ssj.png` },
    majin: {
      url: `${P}/majin_vegeta_01.png`,
      expressions: { angry: `${P}/majin_vegeta_02.png`, screaming: `${P}/majin_vegeta_02.png` },
    },
    great_ape: { url: `${P}/great_ape_general.png` },
  },
  krillin: {
    hair: { url: `${P}/krillin_with_hair_01.png` },
    serious: { url: `${P}/krillin_with_hair_02.png` },
  },
  frieza: {
    first: { url: `${P}/frieza_first_form_01.png` },
    second: { url: `${P}/frieza_second_form.png` },
    third: { url: `${P}/frieza_third_form.png` },
    final: {
      url: `${P}/frieza_final_form_01.png`,
      expressions: { angry: `${P}/frieza_final_form_02.png`, final_angry: `${P}/frieza_final_form_02.png` },
    },
  },
  ginyu: {
    goku_body: { url: `${P}/captain_ginyu_goku_body.png` },
  },
  trunks: {
    kid: {
      url: `${P}/trunks_kid_01.png`,
      expressions: { surprised: `${P}/trunks_kid_02.png` },
    },
    baby: { url: `${P}/trunks_baby.png` },
    baby_cry: { url: `${P}/trunks_baby_crying.png` },
  },
  trunks_kid: {
    kid: {
      url: `${P}/trunks_kid_01.png`,
      expressions: { surprised: `${P}/trunks_kid_02.png` },
    },
  },
  buu_super: {
    gohan_form: { url: `${P}/super_buu_gohan_03.png` },
  },
  majin_buu: {
    gohan_form: { url: `${P}/super_buu_gohan_03.png` },
  },
  vegito: {
    ssj: { url: `${P}/vegito_ssj.png` },
  },
  saiyaman: {
    no_helmet: { url: `${P}/great_saiyaman_unmasked.png` },
  },
};

const SIMPLE_FORM_ALIASES: Readonly<Record<string, string>> = {
  normal: 'base',
  super: 'ssj',
  super_saiyan: 'ssj',
  super2: 'ssj2',
  super_saiyan_2: 'ssj2',
  super3: 'ssj3',
  super_saiyan_3: 'ssj3',
  adult_super_saiyan: 'adult_ssj',
};

function token(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s-]+/g, '_');
}

function expressionResult(
  variant: StoryVariant,
  requestedFormId: string | undefined,
  expression: PortraitEmotion,
): StoryPortraitResolution {
  const exactExpression = expression === 'normal' ? variant.url : variant.expressions?.[expression];
  if (exactExpression) {
    return {
      domain: 'story',
      status: 'EXACT',
      requestedFormId,
      resolvedFormId: requestedFormId,
      requestedExpression: expression,
      resolvedExpression: expression,
      url: exactExpression,
    };
  }
  return {
    domain: 'story',
    status: 'EXPRESSION_FALLBACK',
    requestedFormId,
    resolvedFormId: requestedFormId,
    requestedExpression: expression,
    resolvedExpression: 'normal',
    url: variant.url,
  };
}

/**
 * Production Story resolver. It never crosses into Battle/Menu and never
 * resolves a requested form id as a different form.
 */
export function resolveStoryPortraitStrict(
  characterId: string,
  formId?: string,
  expression: PortraitEmotion = 'normal',
): StoryPortraitResolution {
  const character = token(characterId);
  const requestedFormId = formId ? token(formId) : undefined;

  if (requestedFormId) {
    // Roster ids are authoritative: only the exact physical Story binding is
    // accepted. Missing SSJ2/SSJ3/absorption variants remain MISSING.
    const rosterExact = storyPortraitForRosterForm(requestedFormId);
    if (rosterExact) {
      const specialExpressions: Partial<Record<PortraitEmotion, string>> = {};
      if (requestedFormId === 'vegeta_majin') {
        specialExpressions.angry = `${P}/majin_vegeta_02.png`;
        specialExpressions.screaming = `${P}/majin_vegeta_02.png`;
      } else if (requestedFormId === 'trunks_kid') {
        specialExpressions.surprised = `${P}/trunks_kid_02.png`;
      } else if (requestedFormId === 'frieza_final') {
        specialExpressions.angry = `${P}/frieza_final_form_02.png`;
        specialExpressions.final_angry = `${P}/frieza_final_form_02.png`;
      } else if (requestedFormId === 'cell_perfect') {
        specialExpressions.surprised = `${P}/cell_perfect_02.png`;
      } else if (requestedFormId === 'buu_base') {
        specialExpressions.angry = `${P}/majin_buu_02.png`;
      } else if (requestedFormId === 'buu_super') {
        specialExpressions.angry = `${P}/super_buu_02.png`;
      }
      return expressionResult({ url: rosterExact, expressions: specialExpressions }, requestedFormId, expression);
    }

    // Narrative aliases are accepted only when that exact alias has a physical
    // asset for this exact character identity.
    const normalizedAlias = SIMPLE_FORM_ALIASES[requestedFormId] ?? requestedFormId;
    const exactVariant = STORY_FORM_VARIANTS[character]?.[normalizedAlias];
    if (exactVariant) return expressionResult(exactVariant, requestedFormId, expression);

    return {
      domain: 'story',
      status: 'MISSING',
      requestedFormId,
      requestedExpression: expression,
    };
  }

  const base = STORY_CHARACTER_BASE[character];
  if (!base) {
    return {
      domain: 'story',
      status: 'MISSING',
      requestedExpression: expression,
    };
  }
  return expressionResult(base, undefined, expression);
}

/** Exact Battle resolver. Missing forms never fall back to Story or Menu. */
export function resolveBattlePortraitStrict(formId: string): BattlePortraitResolution {
  const requestedFormId = token(formId);
  const url = BATTLE_PORTRAITS[requestedFormId];
  return url
    ? { domain: 'battle', status: 'EXACT', requestedFormId, resolvedFormId: requestedFormId, url }
    : { domain: 'battle', status: 'MISSING', requestedFormId };
}

/** Exact Menu resolver. Missing ids remain Menu-domain MISSING. */
export function resolveMenuPortrait(id: string): MenuPortraitResolution {
  const requestedId = token(id);
  const url = MENU_PORTRAITS[requestedId];
  return url
    ? { domain: 'menu', status: 'EXACT', requestedId, resolvedId: requestedId, url }
    : { domain: 'menu', status: 'MISSING', requestedId };
}

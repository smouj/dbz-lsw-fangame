// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — STORY PORTRAIT PHYSICAL CATALOG (GBC, 40×56)
// ═══════════════════════════════════════════════════════════════════════
// Physical portraits extracted from the cartridge live under
// public/assets/portraits/story/. Semantic names in this file are downstream
// aliases for those physical assets; they are NOT a replacement for the ROM's
// numeric portrait-index/resource selection.
//
// Canon rule:
//   - an exact Story portrait may represent only the identity/form it depicts;
//   - a missing transformation returns undefined from the strict Story layer;
//   - callers that need a playable-form fallback must use the exact Battle
//     portrait for that SAME form, never another Story transformation.
// ═══════════════════════════════════════════════════════════════════════

export type PortraitEmotion =
  | 'normal'
  | 'smile'
  | 'surprised'
  | 'angry'
  | 'wounded'
  | 'visor'
  | 'scared'
  | 'screaming'
  | 'serious'
  | 'grinding'
  | 'crying'
  | 'final_angry';

export interface PortraitEntry {
  base: string;
  emotions?: Partial<Record<PortraitEmotion, string>>;
  forms?: Record<string, string>;
}

const P = '/assets/portraits/story';

export const STORY_PORTRAITS: Readonly<Record<string, PortraitEntry>> = {
  // ── Saiyan ─────────────────────────────────────────────────────────
  goku: {
    base: `${P}/goku_01.png`,
    emotions: {
      smile: `${P}/goku_02.png`,
      surprised: `${P}/goku_03.png`,
      wounded: `${P}/goku_04.png`,
    },
    forms: {
      ssj: `${P}/goku_ssj_01.png`,
      ssj_cell: `${P}/goku_ssj_02.png`,
    },
  },
  // Goku after Ginyu's body-change: this is a distinct physical identity.
  goku_in_ginyu_body: { base: `${P}/goku_with_body_captain_ginyu.png` },
  gohan: {
    base: `${P}/gohan_young_01.png`,
    emotions: {
      surprised: `${P}/gohan_young_01.png`,
      angry: `${P}/gohan_young_02.png`,
      smile: `${P}/gohan_young_03.png`,
      wounded: `${P}/gohan_young_04.png`,
      screaming: `${P}/gohan_young_05.png`,
    },
    forms: {
      ssj: `${P}/gohan_young_ssj_01.png`,
      ssj2: `${P}/gohan_young_ssj2_01.png`,
      adult: `${P}/gohan_adult_01.png`,
      adult_ssj: `${P}/gohan_adult_ssj.png`,
      ultimate: `${P}/gohan_adult_03.png`,
    },
  },
  piccolo: {
    base: `${P}/piccolo_01.png`,
    emotions: {
      smile: `${P}/piccolo_02.png`,
      surprised: `${P}/piccolo_03.png`,
      angry: `${P}/piccolo_04.png`,
      wounded: `${P}/piccolo_wounded.png`,
      grinding: `${P}/piccolo_05.png`,
    },
    forms: { kami: `${P}/piccolo_05.png` },
  },
  vegeta: {
    base: `${P}/vegeta_01.png`,
    emotions: {
      visor: `${P}/vegeta_visor.png`,
      smile: `${P}/vegeta_03.png`,
      surprised: `${P}/vegeta_04.png`,
      angry: `${P}/vegeta_02.png`,
      wounded: `${P}/vegeta_wounded.png`,
    },
    forms: {
      ssj: `${P}/vegeta_ssj.png`,
      majin: `${P}/majin_vegeta_01.png`,
      majin_angry: `${P}/majin_vegeta_02.png`,
      great_ape: `${P}/great_ape_general.png`,
    },
  },
  krillin: {
    base: `${P}/krillin_01.png`,
    emotions: {
      surprised: `${P}/krillin_02.png`,
      angry: `${P}/krillin_03.png`,
      scared: `${P}/krillin_04.png`,
      wounded: `${P}/krillin_05.png`,
    },
    forms: {
      hair: `${P}/krillin_with_hair_01.png`,
      serious: `${P}/krillin_with_hair_02.png`,
    },
  },
  nappa: {
    base: `${P}/nappa_01.png`,
    emotions: { angry: `${P}/nappa_02.png`, wounded: `${P}/nappa_wounded.png` },
  },
  raditz: { base: `${P}/raditz.png` },
  bulma: {
    base: `${P}/bulma_01.png`,
    forms: { young: `${P}/bulma_02.png`, older: `${P}/bulma_03.png` },
  },
  chi_chi: { base: `${P}/chi_chi_01.png`, forms: { buu: `${P}/chi_chi_02.png` } },
  yajirobe: { base: `${P}/yajirobe_01.png`, emotions: { surprised: `${P}/yajirobe_02.png` } },
  tien: { base: `${P}/tien_shinhan.png`, emotions: { wounded: `${P}/tien_shinhan_wounded.png` } },
  chiaotzu: { base: `${P}/chiaotzu.png` },
  yamcha: { base: `${P}/yamcha.png`, emotions: { wounded: `${P}/yamcha_wounded.png` } },
  king_kai: { base: `${P}/king_kai.png` },
  great_ape_vegeta: { base: `${P}/great_ape_general.png` },

  // ── Namek / Frieza ─────────────────────────────────────────────────
  frieza: {
    base: `${P}/frieza_first_form_01.png`,
    emotions: {
      angry: `${P}/frieza_first_form_02.png`,
      final_angry: `${P}/frieza_final_form_02.png`,
    },
    forms: {
      first: `${P}/frieza_first_form_01.png`,
      second: `${P}/frieza_second_form.png`,
      third: `${P}/frieza_third_form.png`,
      final: `${P}/frieza_final_form_01.png`,
      final_angry: `${P}/frieza_final_form_02.png`,
    },
  },
  guldo: { base: `${P}/guldo.png`, emotions: { wounded: `${P}/guldo_wounded.png` } },
  recoome: { base: `${P}/recoome.png`, emotions: { wounded: `${P}/recoome_wounded.png` } },
  burter: { base: `${P}/burter.png`, emotions: { wounded: `${P}/burter_wounded.png` } },
  jeice: { base: `${P}/jeice.png` },
  ginyu: {
    base: `${P}/captain_ginyu_01.png`,
    forms: { goku_body: `${P}/captain_ginyu_goku_body.png` },
  },
  ginyu_frog: { base: `${P}/captain_ginyu_frog.png` },
  dende: { base: `${P}/dende.png` },
  kami: { base: `${P}/kami.png` },
  nail: { base: `${P}/nail.png` },
  guru: { base: `${P}/guru.png` },

  // ── Android / Cell ─────────────────────────────────────────────────
  android_16: { base: `${P}/android_16.png`, emotions: { wounded: `${P}/android_16_wounded.png` } },
  android_17: { base: `${P}/android_17.png` },
  android_18: { base: `${P}/android_18.png` },
  android_19: { base: `${P}/android_19.png` },
  android_20: { base: `${P}/android_20_dr_gero.png` },
  cell_imperfect: { base: `${P}/cell_imperfect.png` },
  cell_semi: { base: `${P}/cell_semi_perfect.png` },
  cell: {
    base: `${P}/cell_perfect_01.png`,
    emotions: { surprised: `${P}/cell_perfect_02.png` },
  },
  cell_jr: { base: `${P}/cell_jr.png` },
  trunks: {
    base: `${P}/trunks_future_01.png`,
    emotions: {
      surprised: `${P}/trunks_future_02.png`,
      smile: `${P}/trunks_future_03.png`,
    },
    forms: {
      kid: `${P}/trunks_kid_01.png`,
      kid_surprised: `${P}/trunks_kid_02.png`,
      baby: `${P}/trunks_baby.png`,
      baby_cry: `${P}/trunks_baby_crying.png`,
    },
  },
  hercule: {
    base: `${P}/mr_satan_01.png`,
    emotions: { surprised: `${P}/mr_satan_02.png` },
  },
  roshi: { base: `${P}/master_roshi.png` },

  // ── Majin Buu ──────────────────────────────────────────────────────
  babidi: { base: `${P}/babidi.png` },
  kid_buu: { base: `${P}/kid_buu.png` },
  fat_buu: {
    base: `${P}/majin_buu_01.png`,
    emotions: { angry: `${P}/majin_buu_02.png` },
  },
  majin_buu: {
    base: `${P}/super_buu_01.png`,
    emotions: { angry: `${P}/super_buu_02.png` },
    forms: { gohan_form: `${P}/super_buu_gohan_03.png` },
  },
  goten: { base: `${P}/goten_01.png`, emotions: { surprised: `${P}/goten_02.png` } },
  // The verified Story corpus contains only the SSJ3 Gotenks portrait.
  gotenks: { base: `${P}/gotenks_ssj3.png`, forms: { ssj3: `${P}/gotenks_ssj3.png` } },
  vegito: { base: `${P}/vegito.png`, forms: { ssj: `${P}/vegito_ssj.png` } },
  dabura: { base: `${P}/dabura_01.png`, emotions: { surprised: `${P}/dabura_02.png` } },
  elder_kai: { base: `${P}/elder_kai.png` },
  kibito: { base: `${P}/kibito.png` },
  kibito_kai: { base: `${P}/kibito_kai.png` },
  supreme_kai: { base: `${P}/supreme_kai.png` },
  spopovich: { base: `${P}/spopovich.png` },
  videl: { base: `${P}/videl.png` },
  yamu: { base: `${P}/yamu.png` },
  yakon: { base: `${P}/yakon.png` },
  puipui: { base: `${P}/pui_pui.png` },
  saiyaman: {
    base: `${P}/great_saiyaman.png`,
    forms: { no_helmet: `${P}/great_saiyaman_unmasked.png` },
  },
  bee: { base: `${P}/bee.png` },
  baba: { base: `${P}/fortuneteller_baba.png` },
  tournament_announcer: { base: `${P}/world_tournament_announcer.png` },
  spectator: { base: `${P}/tournament_spectator_girl.png` },
};

/**
 * Physical Story portraits that depict an exact playable roster form.
 * This table is intentionally strict. A form absent here must NOT be replaced
 * by another transformation inside the Story layer.
 */
export const ROSTER_STORY_PORTRAITS: Readonly<Record<string, string>> = {
  goku_base: `${P}/goku_01.png`,
  goku_ssj: `${P}/goku_ssj_01.png`,
  vegeta_base: `${P}/vegeta_01.png`,
  vegeta_ssj: `${P}/vegeta_ssj.png`,
  vegeta_majin: `${P}/majin_vegeta_01.png`,
  gohan_young: `${P}/gohan_young_01.png`,
  gohan_young_ssj: `${P}/gohan_young_ssj_01.png`,
  gohan_young_ssj2: `${P}/gohan_young_ssj2_01.png`,
  gohan_adult_ssj: `${P}/gohan_adult_ssj.png`,
  gohan_adult_ultimate: `${P}/gohan_adult_03.png`,
  trunks_kid: `${P}/trunks_kid_01.png`,
  trunks_future: `${P}/trunks_future_01.png`,
  goten_base: `${P}/goten_01.png`,
  gotenks_ssj3: `${P}/gotenks_ssj3.png`,
  piccolo_base: `${P}/piccolo_01.png`,
  piccolo_kami: `${P}/piccolo_05.png`,
  krillin_base: `${P}/krillin_01.png`,
  frieza_final: `${P}/frieza_final_form_01.png`,
  cell_imperfect: `${P}/cell_imperfect.png`,
  cell_semi: `${P}/cell_semi_perfect.png`,
  cell_perfect: `${P}/cell_perfect_01.png`,
  cell_jr: `${P}/cell_jr.png`,
  android_16: `${P}/android_16.png`,
  android_17: `${P}/android_17.png`,
  android_18: `${P}/android_18.png`,
  android_19: `${P}/android_19.png`,
  android_20: `${P}/android_20_dr_gero.png`,
  ginyu: `${P}/captain_ginyu_01.png`,
  ginyu_goku: `${P}/captain_ginyu_goku_body.png`,
  recoome: `${P}/recoome.png`,
  guldo: `${P}/guldo.png`,
  jeice: `${P}/jeice.png`,
  burter: `${P}/burter.png`,
  nappa: `${P}/nappa_01.png`,
  buu_base: `${P}/majin_buu_01.png`,
  buu_super: `${P}/super_buu_01.png`,
  buu_gohan: `${P}/super_buu_gohan_03.png`,
  buu_kid: `${P}/kid_buu.png`,
  vegito_ssj: `${P}/vegito_ssj.png`,
};

/** Playable forms with no dedicated exact Story portrait in the verified corpus. */
export const ROSTER_STORY_PORTRAIT_MISSING_EXACT = Object.freeze([
  'goku_ssj2',
  'goku_ssj3',
  'gohan_adult_ssj2',
  'trunks_kid_ssj',
  'trunks_ssj',
  'goten_ssj',
  'gotenks_ssj',
  'piccolo_evil',
  'buu_gotenks',
] as const);

const ROSTER_FORM_IDS = new Set<string>([
  ...Object.keys(ROSTER_STORY_PORTRAITS),
  ...ROSTER_STORY_PORTRAIT_MISSING_EXACT,
]);

const EXACT_EMOTION_OVERRIDE: Readonly<Record<string, Partial<Record<PortraitEmotion, string>>>> = {
  goku_base: {
    smile: `${P}/goku_02.png`,
    surprised: `${P}/goku_03.png`,
    wounded: `${P}/goku_04.png`,
  },
  vegeta_base: {
    visor: `${P}/vegeta_visor.png`,
    smile: `${P}/vegeta_03.png`,
    surprised: `${P}/vegeta_04.png`,
    angry: `${P}/vegeta_02.png`,
    wounded: `${P}/vegeta_wounded.png`,
  },
  vegeta_majin: { angry: `${P}/majin_vegeta_02.png`, screaming: `${P}/majin_vegeta_02.png` },
  trunks_kid: { surprised: `${P}/trunks_kid_02.png` },
  trunks_future: { surprised: `${P}/trunks_future_02.png`, smile: `${P}/trunks_future_03.png` },
  cell_perfect: { surprised: `${P}/cell_perfect_02.png` },
  buu_base: { angry: `${P}/majin_buu_02.png` },
  buu_super: { angry: `${P}/super_buu_02.png` },
};

export function storyPortraitForRosterForm(
  formId: string,
  emotion?: PortraitEmotion,
): string | undefined {
  const exact = ROSTER_STORY_PORTRAITS[formId];
  if (!exact) return undefined;
  return (emotion && EXACT_EMOTION_OVERRIDE[formId]?.[emotion]) || exact;
}

const FORM_ALIAS: Readonly<Record<string, string>> = {
  base: 'base',
  normal: 'base',
  ssj: 'ssj',
  super: 'ssj',
  super_saiyan: 'ssj',
  ssj2: 'ssj2',
  super2: 'ssj2',
  super_saiyan_2: 'ssj2',
  ssj3: 'ssj3',
  super3: 'ssj3',
  super_saiyan_3: 'ssj3',
  adult: 'adult',
  adult_ssj: 'adult_ssj',
  adult_ssj2: 'adult_ssj2',
  adult_super_saiyan: 'adult_ssj',
  adult_super_saiyan_2: 'adult_ssj2',
  ultimate: 'ultimate',
  kami: 'kami',
  majin: 'majin',
  kid: 'kid',
  kid_ssj: 'kid_ssj',
  future: 'future',
  future_ssj: 'future_ssj',
  final: 'final',
  first: 'first',
  second: 'second',
  third: 'third',
  goku_body: 'goku_body',
  young: 'young',
  older: 'older',
  no_helmet: 'no_helmet',
  baby: 'baby',
  baby_cry: 'baby_cry',
  great_ape: 'great_ape',
  gohan_form: 'gohan_form',
  gotenks_form: 'gotenks_form',
  hair: 'hair',
  serious: 'serious',
};

function token(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeStoryForm(formId: string): string | undefined {
  const normalized = token(formId);
  if (FORM_ALIAS[normalized]) return FORM_ALIAS[normalized];
  const tokens = normalized.split('_');
  for (let i = 0; i < tokens.length; i++) {
    const candidate = tokens.slice(i).join('_');
    if (FORM_ALIAS[candidate]) return FORM_ALIAS[candidate];
  }
  return undefined;
}

function emotionFallback(entry: PortraitEntry, emotion?: PortraitEmotion): string | undefined {
  if (!emotion || !entry.emotions) return undefined;
  if (entry.emotions[emotion]) return entry.emotions[emotion];
  const fallback: Partial<Record<PortraitEmotion, PortraitEmotion>> = {
    scared: 'surprised',
    screaming: 'angry',
    crying: 'wounded',
    grinding: 'angry',
    final_angry: 'angry',
  };
  const next = fallback[emotion];
  return next ? entry.emotions[next] : undefined;
}

interface SemanticPortraitIdentity {
  key: string;
  forcedForm?: string;
}

function semanticIdentity(raw: string, formId?: string): SemanticPortraitIdentity {
  if (raw === 'ginyu_goku') return { key: 'ginyu', forcedForm: 'goku_body' };
  if (raw === 'goku_in_ginyu_body') return { key: 'goku_in_ginyu_body' };

  if (raw === 'gohan_kid' || raw === 'gohan_young') return { key: 'gohan' };
  if (raw === 'gohan_adult') {
    const requested = normalizeStoryForm(formId ?? 'adult');
    if (requested === 'ssj') return { key: 'gohan', forcedForm: 'adult_ssj' };
    if (requested === 'ssj2') return { key: 'gohan', forcedForm: 'adult_ssj2' };
    return { key: 'gohan', forcedForm: requested ?? 'adult' };
  }

  if (raw === 'trunks_kid') return { key: 'trunks', forcedForm: normalizeStoryForm(formId ?? 'kid') ?? 'kid' };
  if (raw === 'trunks_future') {
    const requested = normalizeStoryForm(formId ?? 'future');
    return { key: 'trunks', forcedForm: requested === 'ssj' ? 'future_ssj' : requested };
  }

  if (raw === 'cell_perfect') return { key: 'cell' };
  if (raw === 'cell_semi_perfect') return { key: 'cell_semi' };

  if (raw === 'buu' || raw === 'buu_base' || raw === 'fat_buu') return { key: 'fat_buu' };
  if (raw === 'buu_super' || raw === 'super_buu') return { key: 'majin_buu' };
  if (raw === 'buu_gohan') return { key: 'majin_buu', forcedForm: 'gohan_form' };
  if (raw === 'buu_gotenks') return { key: 'majin_buu', forcedForm: 'gotenks_form' };
  if (raw === 'buu_kid' || raw === 'kid_buu') return { key: 'kid_buu' };

  if (raw === 'android_20_dr_gero') return { key: 'android_20' };
  if (raw === 'mr_satan') return { key: 'hercule' };

  return { key: raw };
}

/**
 * Strict Story-only resolver.
 *
 * An explicit form request is a contract: if that physical Story variant does
 * not exist, this function returns undefined rather than silently substituting
 * another transformation. Consumers that need a guaranteed playable portrait
 * must fall back to BATTLE_PORTRAITS for the exact same form.
 */
export function storyPortraitUrl(
  character: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  const raw = token(character);

  // A playable form id is already the strongest semantic identity we have.
  if (ROSTER_FORM_IDS.has(raw)) return storyPortraitForRosterForm(raw, emotion);
  if (formId && ROSTER_FORM_IDS.has(formId)) return storyPortraitForRosterForm(formId, emotion);

  const identity = semanticIdentity(raw, formId);
  const entry = STORY_PORTRAITS[identity.key];
  if (!entry) return undefined;

  const requestedAlias = identity.forcedForm ?? (formId ? normalizeStoryForm(formId) : undefined);

  // Explicit form: exact physical variant or unavailable. Never fall back to
  // entry.base/emotion from a different transformation.
  if (requestedAlias && requestedAlias !== 'base' && requestedAlias !== 'normal') {
    const formEmotion = emotion ? entry.forms?.[`${requestedAlias}_${emotion}`] : undefined;
    if (formEmotion) return formEmotion;
    return entry.forms?.[requestedAlias];
  }

  const byEmotion = emotionFallback(entry, emotion);
  return byEmotion ?? entry.base;
}

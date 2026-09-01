// ═══════════════════════════════════════════════════════════
// DBZ LSW — Story Portraits (retratos de diálogo del GBC, 40×56)
// ═══════════════════════════════════════════════════════════
// Retratos extraídos de la ROM (paquete 01_Story_Portraits_FixedLast, 137
// assets corregidos: nombres e identidades de personaje verificados) bajo
// public/assets/portraits/story/.
//
// Regla: nunca inventar una variante que no exista en el corpus físico.
// Future Trunks SSJ y Goku SSJ3, por ejemplo, no tienen retrato Story dedicado
// en este corpus y deben caer al retrato físico verificado más cercano.
// ═══════════════════════════════════════════════════════════

export type PortraitEmotion = 'normal' | 'smile' | 'surprised' | 'angry' | 'wounded' | 'visor' | 'scared' | 'screaming' | 'serious' | 'grinding' | 'crying' | 'final_angry';

interface PortraitEntry {
  base: string;
  emotions?: Partial<Record<PortraitEmotion, string>>;
  forms?: Record<string, string>;
}

const P = '/assets/portraits/story';

export const STORY_PORTRAITS: Record<string, PortraitEntry> = {
  // ═══ Saga Saiyan ═══
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
      ginyu: `${P}/goku_ssj_01.png`,
    },
  },
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

  // ═══ Saga Namek / Freezer ═══
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
  ginyu: { base: `${P}/captain_ginyu_01.png`, forms: { goku_body: `${P}/captain_ginyu_goku_body.png` } },
  ginyu_frog: { base: `${P}/captain_ginyu_frog.png` },
  dende: { base: `${P}/dende.png` },
  kami: { base: `${P}/kami.png` },
  nail: { base: `${P}/nail.png` },
  guru: { base: `${P}/guru.png` },

  // ═══ Saga Androides / Cell ═══
  android_16: { base: `${P}/android_16.png`, emotions: { wounded: `${P}/android_16_wounded.png` } },
  android_17: { base: `${P}/android_17.png` },
  android_18: { base: `${P}/android_18.png` },
  android_19: { base: `${P}/android_19.png` },
  android_20: { base: `${P}/android_20_dr_gero.png` },
  cell_imperfect: { base: `${P}/cell_imperfect.png` },
  cell_semi: { base: `${P}/cell_semi_perfect.png` },
  cell: { base: `${P}/cell_perfect_01.png`, emotions: { surprised: `${P}/cell_perfect_02.png` } },
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
  hercule: { base: `${P}/mr_satan_01.png`, emotions: { surprised: `${P}/mr_satan_02.png` } },
  roshi: { base: `${P}/master_roshi.png` },

  // ═══ Saga Majin Buu ═══
  babidi: { base: `${P}/babidi.png` },
  kid_buu: { base: `${P}/kid_buu.png` },
  fat_buu: { base: `${P}/majin_buu_01.png`, emotions: { angry: `${P}/majin_buu_02.png` } },
  majin_buu: {
    base: `${P}/super_buu_01.png`,
    emotions: { angry: `${P}/super_buu_02.png` },
    forms: { gohan_form: `${P}/super_buu_gohan_03.png` },
  },
  goten: { base: `${P}/goten_01.png`, emotions: { surprised: `${P}/goten_02.png` } },
  gotenks: { base: `${P}/gotenks_ssj3.png` },
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
  saiyaman: { base: `${P}/great_saiyaman.png`, forms: { no_helmet: `${P}/great_saiyaman_unmasked.png` } },
  bee: { base: `${P}/bee.png` },
  baba: { base: `${P}/fortuneteller_baba.png` },
  tournament_announcer: { base: `${P}/world_tournament_announcer.png` },
  spectator: { base: `${P}/tournament_spectator_girl.png` },
};

/** Retratos Story que representan de forma física y exacta una forma del roster.
 * Si una forma no aparece aquí, la UI de selección debe usar su retrato Battle
 * exacto antes de enseñar otra transformación como si fuera la seleccionada. */
const ROSTER_STORY_PORTRAITS: Readonly<Record<string, string>> = {
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

export function storyPortraitForRosterForm(formId: string): string | undefined {
  return ROSTER_STORY_PORTRAITS[formId];
}

/** Identidad narrativa para formas cuyo nombre no puede inferirse por tokens.
 * Algunas son aproximaciones Story verificadas; la UI del roster usa Battle
 * cuando no existe una entrada exacta en ROSTER_STORY_PORTRAITS. */
const ROSTER_STORY_FORM_RESOLUTION: Readonly<Record<string, { key: string; alias?: string }>> = {
  goku_ssj2: { key: 'goku', alias: 'ssj' },
  goku_ssj3: { key: 'goku', alias: 'ssj' },
  gohan_adult_ssj2: { key: 'gohan', alias: 'adult_ssj' },
  trunks_kid_ssj: { key: 'trunks', alias: 'kid' },
  trunks_ssj: { key: 'trunks' },
  goten_ssj: { key: 'goten' },
  gotenks_ssj: { key: 'gotenks' },
  piccolo_evil: { key: 'piccolo' },
  cell_imperfect: { key: 'cell_imperfect' },
  cell_semi: { key: 'cell_semi' },
  cell_perfect: { key: 'cell' },
  ginyu_goku: { key: 'ginyu', alias: 'goku_body' },
  buu_base: { key: 'fat_buu' },
  buu_super: { key: 'majin_buu' },
  buu_gotenks: { key: 'majin_buu' },
  buu_gohan: { key: 'majin_buu', alias: 'gohan_form' },
  buu_kid: { key: 'kid_buu' },
};

const FORM_ALIAS: Record<string, string> = {
  base: 'base', normal: 'base', ssj: 'ssj', super: 'ssj', super_saiyan: 'ssj',
  ssj2: 'ssj2', super2: 'ssj2', super_saiyan_2: 'ssj2',
  ssj3: 'ssj3', super3: 'ssj3', super_saiyan_3: 'ssj3',
  adult_ssj: 'adult_ssj', adult_super_saiyan: 'adult_ssj',
  ultimate: 'ultimate', kami: 'kami', majin: 'majin', kid: 'kid', adult: 'adult',
  final: 'final', first: 'first', second: 'second', third: 'third',
  goku_body: 'goku_body', young: 'young', older: 'older', no_helmet: 'no_helmet',
  baby: 'baby', baby_cry: 'baby_cry', great_ape: 'great_ape', gohan_form: 'gohan_form',
  hair: 'hair', serious: 'serious',
};

function normalizeStoryForm(formId: string): string | undefined {
  const f = formId.toLowerCase().replace(/[\s-]+/g, '_');
  if (FORM_ALIAS[f]) return FORM_ALIAS[f];
  const tokens = f.split('_');
  for (let i = 0; i < tokens.length; i++) {
    const cand = tokens.slice(i).join('_');
    if (FORM_ALIAS[cand]) return FORM_ALIAS[cand];
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
  const fb = fallback[emotion];
  return fb ? entry.emotions[fb] : undefined;
}

/** DEV/diagnostic only: may approximate across Story forms. Production must use resolveStoryPortraitStrict(). */
export function storyPortraitUrlApproximate(
  character: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  const raw = character.toLowerCase().replace(/[\s-]+/g, '_');
  let key = raw;
  let forcedForm: string | undefined;

  // Age/timeline identity must be resolved BEFORE generic character aliasing.
  if (raw === 'gohan_kid' || raw === 'gohan_young') {
    key = 'gohan';
  } else if (raw === 'gohan_adult') {
    key = 'gohan';
    const requested = normalizeStoryForm(formId ?? 'adult');
    forcedForm = requested === 'ssj' ? 'adult_ssj' : (requested ?? 'adult');
  } else if (raw === 'trunks_kid') {
    key = 'trunks';
    forcedForm = 'kid';
  } else if (raw === 'trunks_future') {
    key = 'trunks';
    // No physical Future Trunks SSJ Story portrait in this corpus.
    forcedForm = undefined;
  } else if (raw === 'cell_perfect') {
    key = 'cell';
  } else if (raw === 'cell_semi_perfect') {
    key = 'cell_semi';
  } else if (raw === 'buu_base' || raw === 'buu') {
    key = 'fat_buu';
  } else if (raw === 'buu_super' || raw === 'super_buu') {
    key = 'majin_buu';
  } else if (raw === 'buu_kid' || raw === 'kid_buu') {
    key = 'kid_buu';
  }

  const rosterResolution = formId ? ROSTER_STORY_FORM_RESOLUTION[formId] : undefined;
  if (rosterResolution) {
    key = rosterResolution.key;
    forcedForm = rosterResolution.alias;
  }

  const entry = STORY_PORTRAITS[key];
  if (!entry) return undefined;

  let alias = forcedForm ?? (formId ? normalizeStoryForm(formId) : undefined);
  if (key === 'gohan' && raw === 'gohan_adult' && alias === 'ssj') alias = 'adult_ssj';

  if (alias && entry.forms) {
    // Exact form+emotion first: e.g. Majin Vegeta angry, Trunks kid surprised.
    if (emotion && entry.forms[`${alias}_${emotion}`]) return entry.forms[`${alias}_${emotion}`];
    if (entry.forms[alias]) return entry.forms[alias];
  }

  const byEmotion = emotionFallback(entry, emotion);
  if (byEmotion) return byEmotion;
  return entry.base;
}

/** @deprecated Diagnostic compatibility alias. Never use in production rendering. */
export const storyPortraitUrl = storyPortraitUrlApproximate;

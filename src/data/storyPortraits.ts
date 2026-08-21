// ═══════════════════════════════════════════════════════════
// DBZ LSW — Story Portraits (retratos de diálogo del GBC, 40×56)
// ═══════════════════════════════════════════════════════════
// Retratos extraídos de la ROM (paquete 01_Story_Portraits_FixedLast, 137
// assets corregidos por el usuario: nombres y personajes 100% verificados)
// organizados por saga y personaje en public/assets/portraits/story/.
// Cada personaje tiene variantes de expresión reales (Normal/Sonrisa/
// Sorpresa/Enfurecido/Wounded...) y formas (SSJ, Final Form, etc.).
//
// Convención de archivo: {Saga}/{Personaje}/R{row}_C{col}__{Expresión}.png

export type PortraitEmotion = 'normal' | 'smile' | 'surprised' | 'angry' | 'wounded' | 'visor' | 'scared' | 'screaming' | 'serious' | 'grinding' | 'crying' | 'final_angry';

interface PortraitEntry {
  base: string;                                        // retrato por defecto
  emotions?: Partial<Record<PortraitEmotion, string>>; // variantes por emoción
  forms?: Record<string, string>;                      // variantes por forma
}

const P = 'assets/portraits/story';

// ═══ Saga Saiyan (01) ═══
export const STORY_PORTRAITS: Record<string, PortraitEntry> = {
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
    forms: {
      kami: `${P}/piccolo_05.png`,
    },
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
      majin: `${P}/gohan_adult_ssj.png`,
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
    emotions: {
      angry: `${P}/nappa_02.png`,
      wounded: `${P}/nappa_wounded.png`,
    },
  },
  raditz: { base: `${P}/raditz.png` },
  bulma: {
    base: `${P}/bulma_01.png`,
    forms: {
      young: `${P}/bulma_02.png`,
      older: `${P}/bulma_03.png`,
    },
  },
  chi_chi: {
    base: `${P}/chi_chi_01.png`,
    forms: {
      buu: `${P}/chi_chi_02.png`,
    },
  },
  yajirobe: {
    base: `${P}/yajirobe_01.png`,
    emotions: {
      surprised: `${P}/yajirobe_02.png`,
    },
  },
  tien: {
    base: `${P}/tien_shinhan.png`,
    emotions: {
      wounded: `${P}/tien_shinhan_wounded.png`,
    },
  },
  chiaotzu: { base: `${P}/chiaotzu.png` },
  yamcha: {
    base: `${P}/yamcha.png`,
    emotions: {
      wounded: `${P}/yamcha_wounded.png`,
    },
  },
  king_kai: { base: `${P}/king_kai.png` },
  great_ape_vegeta: { base: `${P}/great_ape_general.png` },

  // ═══ Saga Namek / Freezer (02) ═══
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
  guldo: {
    base: `${P}/guldo.png`,
    emotions: {
      wounded: `${P}/guldo_wounded.png`,
    },
  },
  recoome: {
    base: `${P}/recoome.png`,
    emotions: {
      wounded: `${P}/recoome_wounded.png`,
    },
  },
  burter: {
    base: `${P}/burter.png`,
    emotions: {
      wounded: `${P}/burter_wounded.png`,
    },
  },
  jeice: { base: `${P}/jeice.png` },
  ginyu: {
    base: `${P}/captain_ginyu_01.png`,
    forms: {
      goku_body: `${P}/captain_ginyu_goku_body.png`,
    },
  },
  ginyu_frog: { base: `${P}/captain_ginyu_frog.png` },
  dende: { base: `${P}/dende.png` },
  kami: { base: `${P}/kami.png` },
  nail: { base: `${P}/nail.png` },
  guru: { base: `${P}/guru.png` },

  // ═══ Saga Androides / Cell (03) ═══
  android_16: {
    base: `${P}/android_16.png`,
    emotions: {
      wounded: `${P}/android_16_wounded.png`,
    },
  },
  android_17: { base: `${P}/android_17.png` },
  android_18: { base: `${P}/android_18.png` },
  android_19: { base: `${P}/android_19.png` },
  android_20: { base: `${P}/android_20_dr_gero.png` },
  cell_imperfect: { base: `${P}/cell_imperfect.png` },
  cell_semi: { base: `${P}/cell_semi_perfect.png` },
  cell: {
    base: `${P}/cell_perfect_01.png`,
    emotions: {
      surprised: `${P}/cell_perfect_02.png`,
    },
  },
  cell_jr: { base: `${P}/cell_jr.png` },
  trunks: {
    // TRUNKS DEL FUTURO (saga Cell): el paquete solo contiene retratos base
    // (pelo morado). NO existe retrato SSJ en la fuente de 137 — si llega una
    // forma ssj se cae al base (no se inventa un alias falso).
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
    emotions: {
      surprised: `${P}/mr_satan_02.png`,
    },
  },
  roshi: { base: `${P}/master_roshi.png` },

  // ═══ Saga Majin Buu (04) ═══
  babidi: { base: `${P}/babidi.png` },
  kid_buu: { base: `${P}/kid_buu.png` },
  fat_buu: {
    base: `${P}/majin_buu_01.png`,
    emotions: {
      angry: `${P}/majin_buu_02.png`,
    },
  },
  majin_buu: {
    base: `${P}/super_buu_01.png`,
    emotions: {
      angry: `${P}/super_buu_02.png`,
    },
    forms: {
      gohan_form: `${P}/super_buu_gohan_03.png`,
    },
  },
  goten: {
    base: `${P}/goten_01.png`,
    emotions: {
      surprised: `${P}/goten_02.png`,
    },
  },
  gotenks: { base: `${P}/gotenks_ssj3.png` },
  vegito: {
    base: `${P}/vegito.png`,
    forms: {
      ssj: `${P}/vegito_ssj.png`,
    },
  },
  dabura: {
    base: `${P}/dabura_01.png`,
    emotions: {
      surprised: `${P}/dabura_02.png`,
    },
  },
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
    forms: {
      no_helmet: `${P}/great_saiyaman_unmasked.png`,
    },
  },
  bee: { base: `${P}/bee.png` },
  baba: { base: `${P}/fortuneteller_baba.png` },
  tournament_announcer: { base: `${P}/world_tournament_announcer.png` },
  spectator: { base: `${P}/tournament_spectator_girl.png` },
};

// Normaliza ids de forma del roster ('goku_ssj', 'future_trunks_super_saiyan',
// 'trunks_kid_ssj', 'young_gohan_super_saiyan_2', 'super'...) a la clave del
// mapa forms del personaje. Va recortando prefijos hasta encontrar un alias.
const FORM_ALIAS: Record<string, string> = {
  base: 'base', normal: 'base', ssj: 'ssj', super: 'ssj', super_saiyan: 'ssj',
  ssj2: 'ssj2', super2: 'ssj2', super_saiyan_2: 'ssj2',
  ssj3: 'ssj3', super3: 'ssj3', super_saiyan_3: 'ssj3',
  ultimate: 'ultimate', kami: 'kami', majin: 'majin', kid: 'kid', adult: 'adult',
  final: 'final', first: 'first', second: 'second', third: 'third',
  goku_body: 'goku_body', young: 'young', older: 'older', no_helmet: 'no_helmet',
  baby: 'baby', baby_cry: 'baby_cry', great_ape: 'great_ape', gohan_form: 'gohan_form',
  hair: 'hair', serious: 'serious',
};

function normalizeStoryForm(formId: string): string | undefined {
  const f = formId.toLowerCase().replace(/[\s-]+/g, '_');
  const tokens = f.split('_');
  for (let i = 0; i < tokens.length; i++) {
    const cand = tokens.slice(i).join('_');
    if (FORM_ALIAS[cand]) return FORM_ALIAS[cand];
  }
  return undefined;
}

// Resolver el retrato de historia para (personaje, forma, emoción)
export function storyPortraitUrl(
  character: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  // Alias de personajes separados → retrato del personaje base (GBC)
  const CHAR_ALIAS: Record<string, string> = {
    gohan_kid: 'gohan', gohan_adult: 'gohan',
    trunks_kid: 'trunks', trunks_future: 'trunks',
  };
  const key = CHAR_ALIAS[character] ?? character;
  const entry = STORY_PORTRAITS[key];
  if (!entry) return undefined;
  // 1) Variante por FORMA si existe (ssj/ssj2/ultimate/majin/kid/kami/final...)
  if (formId) {
    const alias = normalizeStoryForm(formId);
    if (alias && entry.forms) {
      // forma + emoción (ej. kid + surprised → kid_surprised) si existe
      if (emotion && entry.forms[`${alias}_${emotion}`]) return entry.forms[`${alias}_${emotion}`];
      if (entry.forms[alias]) return entry.forms[alias];
    }
  }
  // 2) Variante por EMOCIÓN si existe
  if (emotion && entry.emotions && entry.emotions[emotion]) return entry.emotions[emotion];
  // 2b) Fallback de emoción CERCANA (misma familia facial) antes de la base:
  //     scared→surprised (ojos abiertos) · screaming→angry · crying→wounded
  //     · grinding→angry · final_angry→angry. serious/normal → base (la base
  //     ES la cara seria/normal del personaje).
  if (emotion && entry.emotions) {
    const EMOTION_FALLBACK: Partial<Record<PortraitEmotion, PortraitEmotion>> = {
      scared: 'surprised',
      screaming: 'angry',
      crying: 'wounded',
      grinding: 'angry',
      final_angry: 'angry',
    };
    const fb = EMOTION_FALLBACK[emotion];
    if (fb && entry.emotions[fb]) return entry.emotions[fb];
  }
  // 3) Retrato base
  return entry.base;
}

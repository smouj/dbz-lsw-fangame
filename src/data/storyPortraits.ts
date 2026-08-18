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
    base: `${P}/01_Saga_Saiyan/Goku/R01_C02__Goku_Normal.png`,
    emotions: {
      smile: `${P}/01_Saga_Saiyan/Goku/R03_C08__Goku_Sonrisa.png`,
      surprised: `${P}/01_Saga_Saiyan/Goku/R03_C09__Goku_Sorpresa.png`,
      wounded: `${P}/01_Saga_Saiyan/Goku/R03_C10__Goku_Wounded.png`,
    },
    forms: {
      ssj: `${P}/02_Saga_Namek_Frieza/Goku_Super_Saiyan/R07_C02__Goku_Super_Saiyan.png`,
      ssj_cell: `${P}/03_Saga_Androides_Cell/Goku_Super_Saiyan/R08_C10__Goku_Super_Saiyan.png`,
      ginyu: `${P}/02_Saga_Namek_Frieza/Goku_Super_Saiyan/R07_C02__Goku_Super_Saiyan.png`,
    },
  },
  gohan: {
    base: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C03__Young_Gohan_Sorpresa.png`,
    emotions: {
      surprised: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C03__Young_Gohan_Sorpresa.png`,
      angry: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C04__Young_Gohan_Enfurecido.png`,
      smile: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C06__Young_Gohan_Sonriendo.png`,
      wounded: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C07__Young_Gohan_Dañado.png`,
      screaming: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C08__Young_Gohan_Gritando.png`,
    },
    forms: {
      ssj: `${P}/03_Saga_Androides_Cell/Gohan_Super_Saiyan/R08_C09__Gohan_Super_Saiyan.png`,
      ssj2: `${P}/03_Saga_Androides_Cell/Gohan_Super_Saiyan_2/R09_C09__Gohan_Super_Saiyan_2.png`,
      adult: `${P}/03_Saga_Androides_Cell/Gohan_Adulto/R10_C06__Gohan_Adulto.png`,
      ultimate: `${P}/04_Saga_Majin_Buu/Gohan_Ultimate/R12_C02__Gohan_Ultimate.png`,
    },
  },
  piccolo: {
    base: `${P}/01_Saga_Saiyan/Piccolo/R01_C05__Piccolo_Normal.png`,
    emotions: {
      smile: `${P}/01_Saga_Saiyan/Piccolo/R01_C09__Piccolo_Sonriendo.png`,
      surprised: `${P}/01_Saga_Saiyan/Piccolo/R02_C03__Piccolo_Sorprendido.png`,
      angry: `${P}/01_Saga_Saiyan/Piccolo/R02_C04__Piccolo_Enfurecido.png`,
      wounded: `${P}/01_Saga_Saiyan/Piccolo/R03_C01__Piccolo_Wounded_R03_C01.png`,
      grinding: `${P}/02_Saga_Namek_Frieza/Piccolo/R07_C03__Piccolo_ApretandoDientes.png`,
    },
    forms: {
      kami: `${P}/02_Saga_Namek_Frieza/Piccolo/R07_C03__Piccolo_ApretandoDientes.png`,
    },
  },
  vegeta: {
    base: `${P}/01_Saga_Saiyan/Vegeta/R03_C06__Vegeta_Normal.png`,
    emotions: {
      visor: `${P}/01_Saga_Saiyan/Vegeta/R02_C02__Vegeta_Visor.png`,
      smile: `${P}/01_Saga_Saiyan/Vegeta/R03_C07__Vegeta_Sonrisa.png`,
      surprised: `${P}/01_Saga_Saiyan/Vegeta/R04_C01__Vegeta_Sorpresa.png`,
      angry: `${P}/01_Saga_Saiyan/Vegeta/R04_C03__Vegeta_Enfurecido.png`,
      wounded: `${P}/01_Saga_Saiyan/Vegeta/R04_C05__Vegeta_Wounded.png`,
    },
    forms: {
      ssj: `${P}/03_Saga_Androides_Cell/Vegeta_Super_Saiyan/R07_C10__Vegeta_Super_Saiyan.png`,
      majin: `${P}/04_Saga_Majin_Buu/Majin_Vegeta/R11_C10__Majin_Vegeta.png`,
      great_ape: `${P}/01_Saga_Saiyan/Vegeta/R04_C07__Great_Ape_Vegeta.png`,
    },
  },
  krillin: {
    base: `${P}/01_Saga_Saiyan/Krillin/R01_C10__Krillin.png`,
    emotions: {
      surprised: `${P}/01_Saga_Saiyan/Krillin/R01_C08__Krillin_Sorprendido.png`,
      angry: `${P}/01_Saga_Saiyan/Krillin/R02_C09__Krillin_Enfurecido.png`,
      scared: `${P}/01_Saga_Saiyan/Krillin/R03_C04__Krillin_Asustado.png`,
      wounded: `${P}/02_Saga_Namek_Frieza/Krillin/R06_C01__Krillin_Dolorido.png`,
    },
    forms: {
      hair: `${P}/04_Saga_Majin_Buu/Krillin_Con_Pelo/R11_C01__Krillin.png`,
      serious: `${P}/04_Saga_Majin_Buu/Krillin_Con_Pelo/R12_C05__Krillin_Serio.png`,
    },
  },
  nappa: {
    base: `${P}/01_Saga_Saiyan/Nappa/R02_C01__Nappa.png`,
    emotions: {
      angry: `${P}/01_Saga_Saiyan/Nappa/R03_C03__Nappa_Enfurecido.png`,
      wounded: `${P}/01_Saga_Saiyan/Nappa/R03_C05__Nappa_Wounded.png`,
    },
  },
  raditz: { base: `${P}/01_Saga_Saiyan/Raditz/R01_C01__Raditz.png` },
  bulma: {
    base: `${P}/01_Saga_Saiyan/Bulma/R04_C09__Bulma.png`,
    forms: {
      young: `${P}/03_Saga_Androides_Cell/Bulma/R07_C07__Bulma_Joven.png`,
      older: `${P}/03_Saga_Androides_Cell/Bulma/R10_C05__Bulma_Mayor.png`,
    },
  },
  chi_chi: {
    base: `${P}/01_Saga_Saiyan/Chi_Chi/R04_C08__Chi_Chi.png`,
    forms: {
      buu: `${P}/04_Saga_Majin_Buu/ChiChi/R13_C05__ChiChi.png`,
    },
  },
  yajirobe: {
    base: `${P}/01_Saga_Saiyan/Yajirobe/R04_C04__Yajirobe_Normal.png`,
    emotions: {
      surprised: `${P}/01_Saga_Saiyan/Yajirobe/R04_C04__Yajirobe_Sorpresa.png`,
    },
  },
  tien: {
    base: `${P}/01_Saga_Saiyan/Tien_Shinhan/R02_C07__Tien_Shinhan.png`,
    emotions: {
      wounded: `${P}/01_Saga_Saiyan/Tien_Shinhan/R02_C10__Tien_Shinhan_Wounded.png`,
    },
  },
  chiaotzu: { base: `${P}/01_Saga_Saiyan/Chiaotzu/R02_C06__Chiaotzu.png` },
  yamcha: {
    base: `${P}/01_Saga_Saiyan/Yamcha/R02_C05__Yamcha.png`,
    emotions: {
      wounded: `${P}/01_Saga_Saiyan/Yamcha/R02_C08__Yamcha_Wounded.png`,
    },
  },
  king_kai: { base: `${P}/01_Saga_Saiyan/King_Kai/R04_C10__King_Kai.png` },
  great_ape_vegeta: { base: `${P}/01_Saga_Saiyan/Vegeta/R04_C07__Great_Ape_Vegeta.png` },

  // ═══ Saga Namek / Freezer (02) ═══
  frieza: {
    base: `${P}/02_Saga_Namek_Frieza/Frieza/R05_C01__Frieza_First_Form.png`,
    emotions: {
      angry: `${P}/02_Saga_Namek_Frieza/Frieza/R06_C07__Frieza_First_Form_Enfurecido.png`,
      final_angry: `${P}/02_Saga_Namek_Frieza/Frieza/R07_C01__Frieza_Final_Form_Enfurecido.png`,
    },
    forms: {
      first: `${P}/02_Saga_Namek_Frieza/Frieza/R05_C01__Frieza_First_Form.png`,
      second: `${P}/02_Saga_Namek_Frieza/Frieza/R06_C08__Frieza_Second_Form.png`,
      third: `${P}/02_Saga_Namek_Frieza/Frieza/R06_C09__Frieza_Thirst_Form.png`,
      final: `${P}/02_Saga_Namek_Frieza/Frieza/R06_C10__Frieza_Final_Form.png`,
      final_angry: `${P}/02_Saga_Namek_Frieza/Frieza/R07_C01__Frieza_Final_Form_Enfurecido.png`,
    },
  },
  guldo: {
    base: `${P}/02_Saga_Namek_Frieza/Guldo/R05_C09__Guldo.png`,
    emotions: {
      wounded: `${P}/02_Saga_Namek_Frieza/Guldo/R05_C10__Guldo_Wounded_R05_C10.png`,
    },
  },
  recoome: {
    base: `${P}/02_Saga_Namek_Frieza/Recoome/R05_C06__Recoome.png`,
    emotions: {
      wounded: `${P}/02_Saga_Namek_Frieza/Recoome/R06_C02__Recome_Wounded_R06_C02.png`,
    },
  },
  burter: {
    base: `${P}/02_Saga_Namek_Frieza/Burter/R05_C07__Burter.png`,
    emotions: {
      wounded: `${P}/02_Saga_Namek_Frieza/Burter/R06_C03__Burter_Wounded_R06_C03.png`,
    },
  },
  jeice: { base: `${P}/02_Saga_Namek_Frieza/Jeice/R05_C08__Jeice.png` },
  ginyu: {
    base: `${P}/02_Saga_Namek_Frieza/Captain_Ginyu/R05_C05__Captain_Ginyu.png`,
    forms: {
      goku_body: `${P}/02_Saga_Namek_Frieza/Captain_Ginyu/R06_C04__Captain_Ginyu_Form_Goku.png`,
    },
  },
  ginyu_frog: { base: `${P}/02_Saga_Namek_Frieza/Captain_Ginyu_Frog/R06_C06__Captain_Ginyu_Frog.png` },
  dende: { base: `${P}/02_Saga_Namek_Frieza/Dende/R05_C02__Dende.png` },
  kami: { base: `${P}/02_Saga_Namek_Frieza/Kami/R07_C04__Kami.png` },
  nail: { base: `${P}/02_Saga_Namek_Frieza/Nail/R05_C03__Nail.png` },
  guru: { base: `${P}/02_Saga_Namek_Frieza/Guru/R05_C04__Guru.png` },

  // ═══ Saga Androides / Cell (03) ═══
  android_16: {
    base: `${P}/03_Saga_Androides_Cell/Android_16/R08_C06__Android_16.png`,
    emotions: {
      wounded: `${P}/03_Saga_Androides_Cell/Android_16/R08_C07__Android_16_Wounded.png`,
    },
  },
  android_17: { base: `${P}/03_Saga_Androides_Cell/Android_17/R08_C04__Android_17.png` },
  android_18: { base: `${P}/03_Saga_Androides_Cell/Android_18/R08_C05__Android_18.png` },
  android_19: { base: `${P}/03_Saga_Androides_Cell/Android_19/R07_C08__Android_19.png` },
  android_20: { base: `${P}/03_Saga_Androides_Cell/Android_20_Dr_Gero/R07_C09__Android_20_Dr_Gero.png` },
  cell_imperfect: { base: `${P}/03_Saga_Androides_Cell/Cell_Imperfect/R08_C07__Cell_Imperfect.png` },
  cell_semi: { base: `${P}/03_Saga_Androides_Cell/Cell_Semi_Perfect/R08_C08__Cell_Semi_Perfect.png` },
  cell: {
    base: `${P}/03_Saga_Androides_Cell/Cell_Perfect/R09_C01__Cell_Perfect.png`,
    emotions: {
      surprised: `${P}/03_Saga_Androides_Cell/Cell_Perfect/R09_C10__Cell_Perfect_Sorprendido.png`,
    },
  },
  cell_jr: { base: `${P}/03_Saga_Androides_Cell/Cell_Jr/R09_C07__Cell_Jr.png` },
  trunks: {
    // TRUNKS DEL FUTURO (saga Cell): el paquete solo contiene retratos base
    // (pelo morado). NO existe retrato SSJ en la fuente de 137 — si llega una
    // forma ssj se cae al base (no se inventa un alias falso).
    base: `${P}/03_Saga_Androides_Cell/Future_Trunks/R07_C05__Future_Trunks.png`,
    emotions: {
      surprised: `${P}/03_Saga_Androides_Cell/Future_Trunks/R08_C01__Future_Trunks_Sorprendido.png`,
      smile: `${P}/03_Saga_Androides_Cell/Future_Trunks/R10_C04__Future_Trunks_Sonriendo.png`,
    },
    forms: {
      kid: `${P}/04_Saga_Majin_Buu/Kid_Trunks/R11_C03__Kid_Trunks.png`,
      kid_surprised: `${P}/04_Saga_Majin_Buu/Kid_Trunks/R13_C03__Kid_Trunks_Sorprendido.png`,
      baby: `${P}/03_Saga_Androides_Cell/Trunks_Baby/R08_C01__Trunks_Bebe.png`,
      baby_cry: `${P}/03_Saga_Androides_Cell/Trunks_Baby/R08_C02__Trunks_Bebe_Cry.png`,
    },
  },
  hercule: {
    base: `${P}/03_Saga_Androides_Cell/Hercule_Mr_Satan/R09_C03__Hercule_Mr_Satan.png`,
    emotions: {
      surprised: `${P}/03_Saga_Androides_Cell/Hercule_Mr_Satan/R09_C05__Hercule_Mr_Satan_Sorprendido.png`,
    },
  },
  roshi: { base: `${P}/03_Saga_Androides_Cell/Master_Roshi/R08_C03__Master_Roshi.png` },

  // ═══ Saga Majin Buu (04) ═══
  babidi: { base: `${P}/04_Saga_Majin_Buu/Babidi/R12_C03__Babidi.png` },
  kid_buu: { base: `${P}/04_Saga_Majin_Buu/Kid_Buu/R14_C05__Kid_Buu.png` },
  fat_buu: {
    base: `${P}/04_Saga_Majin_Buu/Fat_Buu/R13_C01__Fat_Buu.png`,
    emotions: {
      angry: `${P}/04_Saga_Majin_Buu/Fat_Buu/R13_C02__Fat_Buu_Enfurecido.png`,
    },
  },
  majin_buu: {
    base: `${P}/04_Saga_Majin_Buu/Majin_Buu/R13_C04__Majin_Buu.png`,
    emotions: {
      angry: `${P}/04_Saga_Majin_Buu/Majin_Buu/R13_C09__Majin_Buu_Enfurecido.png`,
    },
    forms: {
      gohan_form: `${P}/04_Saga_Majin_Buu/Majin_Buu/R13_C10__Majin_Buu_GohanForm.png`,
    },
  },
  goten: {
    base: `${P}/04_Saga_Majin_Buu/Goten/R10_C09__Goten.png`,
    emotions: {
      surprised: `${P}/04_Saga_Majin_Buu/Goten/R10_C10__Goten_Sorprendido.png`,
    },
  },
  gotenks: { base: `${P}/04_Saga_Majin_Buu/Gotenks/R13_C06__Gotenks.png` },
  vegito: {
    base: `${P}/04_Saga_Majin_Buu/Vegito/R14_C03__Vegito.png`,
    forms: {
      ssj: `${P}/04_Saga_Majin_Buu/Vegito/R14_C04__Vegito_Super_Saiyan.png`,
    },
  },
  dabura: {
    base: `${P}/04_Saga_Majin_Buu/Dabura/R12_C04__Dabura.png`,
    emotions: {
      surprised: `${P}/04_Saga_Majin_Buu/Dabura/R12_C10__Dabura_Sorprendido.png`,
    },
  },
  elder_kai: { base: `${P}/04_Saga_Majin_Buu/Elder_Kai/R13_C07__Elder_Kai.png` },
  kibito: { base: `${P}/04_Saga_Majin_Buu/Kibito/R11_C05__Kibito.png` },
  kibito_kai: { base: `${P}/04_Saga_Majin_Buu/Kibito_Kai/R14_C06__Kibito_Kai.png` },
  supreme_kai: { base: `${P}/04_Saga_Majin_Buu/Supreme_Kai/R11_C06__Supreme_Kai.png` },
  spopovich: { base: `${P}/04_Saga_Majin_Buu/Spopovich/R11_C07__Spopovich.png` },
  videl: { base: `${P}/04_Saga_Majin_Buu/Videl/R10_C08__Videl.png` },
  yamu: { base: `${P}/04_Saga_Majin_Buu/Yamu/R11_C08__Yamu.png` },
  yakon: { base: `${P}/04_Saga_Majin_Buu/Yakon/R12_C07__Yakon.png` },
  puipui: { base: `${P}/04_Saga_Majin_Buu/Puipui/R12_C06__Puipui.png` },
  saiyaman: {
    base: `${P}/04_Saga_Majin_Buu/Great_Saiyaman/R10_C07__Great_Saiyaman.png`,
    forms: {
      no_helmet: `${P}/04_Saga_Majin_Buu/Great_Saiyaman/R11_C02__Great_Saiyaman_SinCasco.png`,
    },
  },
  bee: { base: `${P}/04_Saga_Majin_Buu/Bee/R14_C07__Bee.png` },
  baba: { base: `${P}/04_Saga_Majin_Buu/Fortuneteller_Baba/R14_C02__Fortuneteller_Baba.png` },
  tournament_announcer: { base: `${P}/04_Saga_Majin_Buu/Narrador_Torneo/R11_C04__Narrador_Torneo.png` },
  spectator: { base: `${P}/04_Saga_Majin_Buu/Chica_Del_Publico/R11_C09__Publico.png` },
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

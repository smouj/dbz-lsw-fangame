// ═══════════════════════════════════════════════════════════
// DBZ LSW — Story Portraits (retratos de diálogo del GBC, 40×56)
// ═══════════════════════════════════════════════════════════
// Retratos extraídos de la ROM (paquete 01_Story_Portraits, 139 assets)
// organizados por saga y personaje en public/assets/portraits/story/.
// Cada personaje puede tener varias expresiones (Normal/Sonrisa/Sorpresa/
// Enfurecido/Wounded); elegimos la mejor por (personaje, forma, emoción).
//
// Convención de archivo: {Saga}/{Personaje}/R{row}_C{col}__{Nombre}.png
// (coordenadas de la hoja fuente 832×1507).

export type PortraitEmotion = 'normal' | 'smile' | 'surprised' | 'angry' | 'wounded' | 'visor';

interface PortraitEntry {
  base: string;                                    // retrato por defecto
  emotions?: Partial<Record<PortraitEmotion, string>>; // variantes por emoción
  forms?: Record<string, string>;                  // variantes por forma (ssj, ssj2...)
}

const P = 'assets/portraits/story';

// Mapeo personaje → retratos. La clave es el id de personaje del roster
// (goku, vegeta, gohan...) o un id de enemigo (nappa, frieza, cell...).
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
      base: `${P}/01_Saga_Saiyan/Goku/R01_C02__Goku_Normal.png`,
    },
  },
  gohan: {
    base: `${P}/01_Saga_Saiyan/Young_Gohan/R01_C03__Young_Gohan.png`,
    emotions: {
      wounded: `${P}/01_Saga_Saiyan/Young_Gohan/R03_C10__Young_Gohan.png`,
      surprised: `${P}/01_Saga_Saiyan/Young_Gohan/R04_C02__Young_Gohan.png`,
    },
    forms: {
      ssj2: `${P}/03_Saga_Androides_Cell/Gohan_Super_Saiyan_2/R09_C08__Gohan_Super_Saiyan_2.png`,
      ultimate: `${P}/04_Saga_Majin_Buu/Gohan_Ultimate/R14_C03__Gohan_Ultimate.png`,
    },
  },
  piccolo: {
    base: `${P}/01_Saga_Saiyan/Piccolo/R01_C05__Piccolo.png`,
    forms: {
      kami: `${P}/02_Saga_Namek_Frieza/Piccolo/R07_C03__Piccolo.png`,
    },
  },
  vegeta: {
    base: `${P}/01_Saga_Saiyan/Vegeta/R03_C06__Vegeta_Normal.png`,
    emotions: {
      smile: `${P}/01_Saga_Saiyan/Vegeta/R03_C07__Vegeta_Sonrisa.png`,
      surprised: `${P}/01_Saga_Saiyan/Vegeta/R04_C01__Vegeta_Sorpresa.png`,
      angry: `${P}/01_Saga_Saiyan/Vegeta/R04_C03__Vegeta_Enfurecido.png`,
      wounded: `${P}/01_Saga_Saiyan/Vegeta/R04_C05__Vegeta_Wounded.png`,
      visor: `${P}/01_Saga_Saiyan/Vegeta/R02_C02__Vegeta_Visor.png`,
    },
    forms: {
      ssj: `${P}/03_Saga_Androides_Cell/Vegeta_Super_Saiyan/R07_C10__Vegeta_Super_Saiyan.png`,
      majin: `${P}/04_Saga_Majin_Buu/Majin_Vegeta/R11_C10__Majin_Vegeta.png`,
    },
  },
  krillin: {
    base: `${P}/01_Saga_Saiyan/Krillin/R01_C08__Krillin.png`,
    emotions: {
      wounded: `${P}/02_Saga_Namek_Frieza/Krillin/R06_C01__Krillin.png`,
    },
  },
  nappa: { base: `${P}/01_Saga_Saiyan/Nappa/R02_C01__Nappa.png` },
  raditz: { base: `${P}/01_Saga_Saiyan/Raditz/R01_C01__Raditz.png` },
  bulma: { base: `${P}/01_Saga_Saiyan/Bulma/R04_C09__Bulma.png` },
  chi_chi: { base: `${P}/01_Saga_Saiyan/Chi_Chi/R04_C08__Chi_Chi.png` },
  yajirobe: { base: `${P}/01_Saga_Saiyan/Yajirobe/R04_C04__Yajirobe_Normal.png` },
  tien: { base: `${P}/01_Saga_Saiyan/Tien_Shinhan/R02_C07__Tien_Shinhan.png` },
  chiaotzu: { base: `${P}/01_Saga_Saiyan/Chiaotzu/R02_C06__Chiaotzu.png` },
  yamcha: { base: `${P}/01_Saga_Saiyan/Yamcha/R02_C05__Yamcha.png` },
  king_kai: { base: `${P}/01_Saga_Saiyan/King_Kai/R04_C10__King_Kai.png` },
  great_ape_vegeta: { base: `${P}/01_Saga_Saiyan/Great_Ape_Vegeta/R04_C07__Great_Ape_Vegeta.png` },
  frieza: { base: `${P}/02_Saga_Namek_Frieza/Frieza/R05_C01__Frieza.png`, emotions: { angry: `${P}/02_Saga_Namek_Frieza/Frieza/R06_C10__Frieza.png`, surprised: `${P}/02_Saga_Namek_Frieza/Frieza/R07_C01__Frieza.png` } },
  guldo: { base: `${P}/02_Saga_Namek_Frieza/Guldo/R05_C09__Guldo.png` },
  recoome: { base: `${P}/02_Saga_Namek_Frieza/Recoome/R05_C06__Recoome.png` },
  burter: { base: `${P}/02_Saga_Namek_Frieza/Burter/R05_C07__Burter.png` },
  jeice: { base: `${P}/02_Saga_Namek_Frieza/Jeice/R05_C08__Jeice.png` },
  ginyu: { base: `${P}/02_Saga_Namek_Frieza/Captain_Ginyu/R05_C05__Captain_Ginyu.png` },
  ginyu_frog: { base: `${P}/02_Saga_Namek_Frieza/Captain_Ginyu_Frog/R06_C06__Captain_Ginyu_Frog.png` },
  dende: { base: `${P}/02_Saga_Namek_Frieza/Dende/R05_C02__Dende.png` },
  kami: { base: `${P}/02_Saga_Namek_Frieza/Kami/R07_C04__Kami.png` },
  nail: { base: `${P}/02_Saga_Namek_Frieza/Nail/R05_C03__Nail.png` },
  guru: { base: `${P}/02_Saga_Namek_Frieza/Guru/R05_C04__Guru.png` },
  android_17: { base: `${P}/03_Saga_Androides_Cell/Android_17/R08_C06__Android_17.png` },
  android_18: { base: `${P}/03_Saga_Androides_Cell/Android_18/R08_C05__Android_18.png` },
  android_19: { base: `${P}/03_Saga_Androides_Cell/Android_19/R07_C08__Android_19.png` },
  android_20: { base: `${P}/03_Saga_Androides_Cell/Android_20_Dr_Gero/R07_C09__Android_20_Dr_Gero.png` },
  cell_imperfect: { base: `${P}/03_Saga_Androides_Cell/Cell_Imperfect/R08_C07__Cell_Imperfect.png` },
  cell_semi: { base: `${P}/03_Saga_Androides_Cell/Cell_Semi_Perfect/R08_C08__Cell_Semi_Perfect.png` },
  cell: { base: `${P}/03_Saga_Androides_Cell/Cell_Perfect/R09_C01__Cell_Perfect.png` },
  cell_jr: { base: `${P}/03_Saga_Androides_Cell/Cell_Jr/R09_C07__Cell_Jr.png` },
  trunks: {
    base: `${P}/03_Saga_Androides_Cell/Future_Trunks/R07_C05__Future_Trunks.png`,
    forms: {
      ssj: `${P}/03_Saga_Androides_Cell/Future_Trunks/R08_C01__Future_Trunks.png`,
      kid: `${P}/04_Saga_Majin_Buu/Kid_Trunks/R11_C03__Kid_Trunks.png`,
    },
  },
  hercule: { base: `${P}/03_Saga_Androides_Cell/Hercule_Mr_Satan/R09_C03__Hercule_Mr_Satan.png` },
  roshi: { base: `${P}/03_Saga_Androides_Cell/Master_Roshi/R08_C03__Master_Roshi.png` },
  babidi: { base: `${P}/04_Saga_Majin_Buu/Babidi/R11_C05__Babidi.png` },
  kid_buu: { base: `${P}/04_Saga_Majin_Buu/Kid_Buu/R14_C05__Kid_Buu.png` },
  fat_buu: { base: `${P}/04_Saga_Majin_Buu/Fat_Buu/R13_C01__Fat_Buu.png` },
  majin_buu: { base: `${P}/04_Saga_Majin_Buu/Majin_Buu/R13_C04__Majin_Buu.png` },
  goten: { base: `${P}/04_Saga_Majin_Buu/Goten/R10_C09__Goten.png` },
  gotenks: { base: `${P}/04_Saga_Majin_Buu/Gotenks/R13_C06__Gotenks.png` },
  vegito: { base: `${P}/04_Saga_Majin_Buu/Vegito_Super_Saiyan/R14_C04__Vegito_Super_Saiyan.png` },
  dabura: { base: `${P}/04_Saga_Majin_Buu/Dabura/R12_C04__Dabura.png` },
  elder_kai: { base: `${P}/04_Saga_Majin_Buu/Elder_Kai/R13_C07__Elder_Kai.png` },
  kibito: { base: `${P}/04_Saga_Majin_Buu/Kibito/R12_C05__Kibito.png` },
  kibito_kai: { base: `${P}/04_Saga_Majin_Buu/Kibito_Kai/R14_C06__Kibito_Kai.png` },
  supreme_kai: { base: `${P}/04_Saga_Majin_Buu/Supreme_Kai/R11_C06__Supreme_Kai.png` },
  spopovich: { base: `${P}/04_Saga_Majin_Buu/Spopovich/R11_C07__Spopovich.png` },
  videl: { base: `${P}/04_Saga_Majin_Buu/Videl/R10_C08__Videl.png` },
  yamu: { base: `${P}/04_Saga_Majin_Buu/Yamu/R11_C08__Yamu.png` },
  yakon: { base: `${P}/04_Saga_Majin_Buu/Yakon/R12_C03__Yakon.png` },
  puipui: { base: `${P}/04_Saga_Majin_Buu/Puipui/R12_C06__Puipui.png` },
  saiyaman: { base: `${P}/04_Saga_Majin_Buu/Great_Saiyaman/R10_C07__Great_Saiyaman.png` },
  bee: { base: `${P}/04_Saga_Majin_Buu/Bee/R14_C07__Bee.png` },
  erasa: { base: `${P}/04_Saga_Majin_Buu/Erasa/R11_C01__Erasa.png` },
  baba: { base: `${P}/04_Saga_Majin_Buu/Fortuneteller_Baba/R14_C02__Fortuneteller_Baba.png` },
};

// Resolver el retrato de historia para (personaje, forma, emoción)
export function storyPortraitUrl(
  character: string,
  formId?: string,
  emotion?: PortraitEmotion,
): string | undefined {
  const entry = STORY_PORTRAITS[character];
  if (!entry) return undefined;
  // 1) Variante por FORMA (ssj/ssj2/ultimate/majin...) si existe
  if (formId) {
    const formKey = formId.replace(`${character}_`, '').replace('_', '');
    const formAliases: Record<string, string> = {
      ssj: 'ssj', ssj2: 'ssj2', ssj3: 'ssj3', ultimate: 'ultimate',
      kami: 'kami', majin: 'majin', kid: 'kid', base: 'base', super: 'ssj',
    };
    const alias = formAliases[formKey] ?? formKey;
    if (entry.forms && entry.forms[alias]) return entry.forms[alias];
  }
  // 2) Variante por EMOCIÓN si existe
  if (emotion && entry.emotions && entry.emotions[emotion]) return entry.emotions[emotion];
  // 3) Retrato base
  return entry.base;
}

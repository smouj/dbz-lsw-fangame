// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de OVERWORLD (vista sin ataque, como el GBC)
// ✅ Extraídos de los sheets oficiales por personaje (RAR del usuario):
// cada sheet "Characters - X.png" contiene los sprites de overworld del
// personaje. Frames separados por proyección (sprites pegados divididos)
// y selección del idle de pie por simetría/forma.
// ═══════════════════════════════════════════════════════════

const OVERWORLD_FILES: Record<string, string> = {
  'goku_base': 'Goku_5.png',
  'goku_ssj': 'Goku_Super_Saiyan_2.png',
  'goku_ssj2': 'Goku_Super_Saiyan_2_0.png',
  'goku_ssj3': 'Goku_Super_Saiyan_3_1.png',
  'vegeta_base': 'Vegeta_5.png',
  'vegeta_ssj': 'Vegeta_Super_Saiyan___Majin_1.png',
  'vegeta_majin': 'Vegeta_Super_Saiyan___Majin_1.png',
  'gohan_young': 'Young_Gohan_ow.png',
  'gohan_young_ssj': 'Young_Gohan_Super_Saiyan_1.png',
  'gohan_young_ssj2': 'Young_Gohan_Super_Saiyan_2_1.png',
  'gohan_teen_ssj': 'Gohan_Super_Saiyan_1_2_4.png',
  'gohan_ultimate': 'Gohan_Ultimate_1.png',
  'trunks_kid': 'Trunks_0.png',
  'trunks_future': 'Future_Trunks_0.png',
  'trunks_ssj': 'Trunks_Super_Saiyan_1.png',
  'goten_base': 'Goten_1.png',
  'goten_ssj': 'Goten_Super_Saiyan_2.png',
  'gotenks_ssj': 'Gotenks_Super_Saiyan_4.png',
  'gotenks_ssj3': 'Gotenks_Super_Saiyan_3_1.png',
  'piccolo_base': 'Piccolo_2.png',
  'piccolo_kami': 'Piccolo_2.png',
  'krillin_base': 'Krillin_4.png',
  'frieza_final': 'Frieza_6.png',
  'frieza_100': 'Frieza_6.png',
  'cell_imperfect': 'Cell_Imperfect_Form_8.png',
  'cell_semi': 'Cell_Semi-Perfect_Form_ow.png',
  'cell_perfect': 'Cell_Perfect_1.png',
  'cell_jr': 'Cell_Jr_0.png',
  'android_16': 'Android_16_8.png',
  'android_17': 'Android_17_4.png',
  'android_18': 'Android_18_0.png',
  'android_19': 'Android_19_8.png',
  'android_20': 'Android_20_8.png',
  'ginyu': 'Ginyu_4.png',
  'ginyu_goku': 'Ginyu_Gokus_Body_3.png',
  'recoome': 'Recoome_7.png',
  'guldo': 'Guldo_6.png',
  'jeice': 'Jeice_4.png',
  'burter': 'Burter_27.png',
  'nappa': 'Nappa_3.png',
  'buu_base': 'Buu_0.png',
  'buu_super': 'Super_Buu_4.png',
  'buu_gotenks': 'Buu_Gotenks_ow.png',
  'buu_gohan': 'Buu_Gohan_1.png',
  'buu_kid': 'Kid_Buu_1.png',
};

export function overworldUrl(formId: string): string | undefined {
  const file = OVERWORLD_FILES[formId];
  return file ? `/assets/overworld/named/${file}` : undefined;
}

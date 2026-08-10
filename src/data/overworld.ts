// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de OVERWORLD (vista sin ataque, como el GBC)
// En el GBC, los luchadores en el campo de batalla se ven como
// sprites de overworld (chibi pequeños); al atacar hay zoom al
// sprite de combate grande.
//
// ✅ MAPEO DEFINITIVO: extraído de los sheets oficiales por
// personaje (RAR del usuario, 42 sheets "Characters - X.png").
// Cada sheet nombrado contiene los sprites de overworld del
// personaje → sin ambigüedad de paleta.
// ═══════════════════════════════════════════════════════════

const OVERWORLD_FILES: Record<string, string> = {
  // Goku
  'goku_base': 'Goku_ow.png',
  'goku_ssj': 'Goku_Super_Saiyan_ow.png',
  'goku_ssj2': 'Goku_Super_Saiyan_2_ow.png',
  'goku_ssj3': 'Goku_Super_Saiyan_3_ow.png',
  // Vegeta (el sheet "Super Saiyan _ Majin" cubre SSJ y Majin)
  'vegeta_base': 'Vegeta_ow.png',
  'vegeta_ssj': 'Vegeta_Super_Saiyan___Majin_ow.png',
  'vegeta_majin': 'Vegeta_Super_Saiyan___Majin_ow.png',
  // Gohan
  'gohan_young': 'Young_Gohan_ow.png',
  'gohan_young_ssj': 'Young_Gohan_Super_Saiyan_ow.png',
  'gohan_young_ssj2': 'Young_Gohan_Super_Saiyan_2_ow.png',
  'gohan_teen_ssj': 'Gohan_Super_Saiyan_1_2_ow.png',
  'gohan_ultimate': 'Gohan_Ultimate_ow.png',
  // Trunks
  'trunks_kid': 'Trunks_ow.png',
  'trunks_future': 'Future_Trunks_ow.png',
  'trunks_ssj': 'Trunks_Super_Saiyan_ow.png',
  // Goten
  'goten_base': 'Goten_ow.png',
  'goten_ssj': 'Goten_Super_Saiyan_ow.png',
  // Gotenks
  'gotenks_ssj': 'Gotenks_Super_Saiyan_ow.png',
  'gotenks_ssj3': 'Gotenks_Super_Saiyan_3_ow.png',
  // Piccolo / Krillin
  'piccolo_base': 'Piccolo_ow.png',
  'piccolo_kami': 'Piccolo_ow.png',
  'krillin_base': 'Krillin_ow.png',
  // Frieza
  'frieza_final': 'Frieza_ow.png',
  'frieza_100': 'Frieza_ow.png',
  // Cell
  'cell_imperfect': 'Cell_Imperfect_Form_ow.png',
  'cell_semi': 'Cell_Semi-Perfect_Form_ow.png',
  'cell_perfect': 'Cell_Perfect_ow.png',
  'cell_jr': 'Cell_Jr_ow.png',
  // Androids
  'android_16': 'Android_16_ow.png',
  'android_17': 'Android_17_ow.png',
  'android_18': 'Android_18_ow.png',
  'android_19': 'Android_19_ow.png',
  'android_20': 'Android_20_ow.png',
  // Ginyu Force
  'ginyu': 'Ginyu_ow.png',
  'ginyu_goku': 'Ginyu_Gokus_Body_ow.png',
  'recoome': 'Recoome_ow.png',
  'guldo': 'Guldo_ow.png',
  'jeice': 'Jeice_ow.png',
  'burter': 'Burter_ow.png',
  'nappa': 'Nappa_ow.png',
  // Buu
  'buu_base': 'Buu_ow.png',
  'buu_super': 'Super_Buu_ow.png',
  'buu_gotenks': 'Buu_Gotenks_ow.png',
  'buu_gohan': 'Buu_Gohan_ow.png',
  'buu_kid': 'Kid_Buu_ow.png',
  // Vegito: no hay sheet en el RAR → sprites del overworld clásico (paleta morada)
  'vegito_base': 'cell_01_01.png',
};

export function overworldUrl(formId: string): string | undefined {
  const file = OVERWORLD_FILES[formId];
  if (!file) return undefined;
  if (file.startsWith('cell_')) return `/assets/overworld/${file}`;
  return `/assets/overworld/named/${file}`;
}

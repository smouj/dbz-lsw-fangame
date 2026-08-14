// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de OVERWORLD (vista sin ataque, como el GBC)
// ✅ OVERWORLD OFICIALES: la carpeta "panel_sprites" del paquete FIXED
// (QA 3189/3189) contiene los sprites de overworld chibi (12-16px).
// Las poses (idle/movement/attack/beam/hurt/guard) = acción.
// ═══════════════════════════════════════════════════════════

const OVERWORLD_FILES: Record<string, string> = {
  'goku_base': 'goku_base_ow.png',
  'goku_ssj': 'goku_super_saiyan_ow.png',
  'goku_ssj2': 'goku_super_saiyan_2_ow.png',
  'goku_ssj3': 'goku_super_saiyan_3_ow.png',
  'vegeta_base': 'vegeta_base_ow.png',
  'vegito_base': 'vegito_base_ow.png',
  'vegeta_ssj': 'vegeta_super_saiyan_majin_ow.png',
  'vegeta_majin': 'vegeta_super_saiyan_majin_ow.png',
  'gohan_young': 'young_gohan_base_ow.png',
  'gohan_young_ssj': 'young_gohan_super_saiyan_ow.png',
  'gohan_young_ssj2': 'young_gohan_super_saiyan_2_ow.png',
  'gohan_teen_ssj': 'gohan_super_saiyan_1_2_ow.png',
  'gohan_teen_ssj2': 'gohan_super_saiyan_1_2_ow.png',
  'gohan_ultimate': 'gohan_ultimate_ow.png',
  'trunks_kid': 'trunks_base_ow.png',
  'trunks_kid_ssj': 'trunks_super_saiyan_ow.png',
  'trunks_future': 'future_trunks_base_ow.png',
  'trunks_ssj': 'trunks_super_saiyan_ow.png',
  'goten_base': 'goten_base_ow.png',
  'goten_ssj': 'goten_super_saiyan_ow.png',
  'gotenks_ssj': 'gotenks_super_saiyan_ow.png',
  'gotenks_ssj3': 'gotenks_super_saiyan_3_ow.png',
  'piccolo_base': 'piccolo_base_ow.png',
  'piccolo_kami': 'piccolo_base_ow.png',
  'piccolo_evil': 'piccolo_base_ow.png',
  'krillin_base': 'krillin_base_ow.png',
  'frieza_final': 'frieza_base_ow.png',
  'cell_imperfect': 'cell_imperfect_form_ow.png',
  'cell_semi': 'cell_semi_perfect_form_ow.png',
  'cell_perfect': 'cell_perfect_ow.png',
  'cell_jr': 'cell_jr_base_ow.png',
  'android_16': 'android_16_base_ow.png',
  'android_17': 'android_17_base_ow.png',
  'android_18': 'android_18_base_ow.png',
  'android_19': 'android_19_base_ow.png',
  'android_20': 'android_20_base_ow.png',
  'ginyu': 'ginyu_base_ow.png',
  'ginyu_goku': 'ginyu_gokus_body_ow.png',
  'recoome': 'recoome_base_ow.png',
  'guldo': 'guldo_base_ow.png',
  'jeice': 'jeice_base_ow.png',
  'burter': 'burter_base_ow.png',
  'nappa': 'nappa_base_ow.png',
  'buu_base': 'buu_base_ow.png',
  'buu_super': 'super_buu_base_ow.png',
  'buu_gotenks': 'buu_gotenks_absorbed_ow.png',
  'buu_gohan': 'buu_gohan_absorbed_ow.png',
  'buu_kid': 'kid_buu_base_ow.png',
};

export function overworldUrl(formId: string): string | undefined {
  const file = OVERWORLD_FILES[formId];
  return file ? `/assets/overworld/panel_sprites/${file}` : undefined;
}

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de COMBATE animados (Sprite Database completa)
// Mapeo formId → directorio de sprites con manifest.json
// (42 personajes/formas del ZIP oficial, poses: idle/move/guard/
// attack_fwd/attack_ud/hurt/beam_charge/beam_fire)
// ═══════════════════════════════════════════════════════════

const SPRITE_DIRS: Record<string, string> = {
  // Goku
  'goku_base': 'goku_base',
  'goku_ssj': 'goku_super_saiyan',
  'goku_ssj2': 'goku_super_saiyan_2',
  'goku_ssj3': 'goku_super_saiyan_3',
  // Vegeta (el sheet SSJ _ Majin cubre SSJ y Majin)
  'vegeta_base': 'vegeta_base',
  'vegeta_ssj': 'vegeta_super_saiyan_majin',
  'vegeta_majin': 'vegeta_super_saiyan_majin',
  // Gohan
  'gohan_young': 'young_gohan_base',
  'gohan_young_ssj': 'young_gohan_super_saiyan',
  'gohan_young_ssj2': 'young_gohan_super_saiyan_2',
  'gohan_adult_ssj': 'gohan_super_saiyan_1_2',
  'gohan_adult_ssj2': 'gohan_super_saiyan_1_2',
  'gohan_adult_ultimate': 'gohan_ultimate',
  // Trunks
  'trunks_kid': 'trunks_base',
  'trunks_kid_ssj': 'kid_trunks_super_saiyan',
  'trunks_future': 'future_trunks_base',
  'trunks_ssj': 'future_trunks_super_saiyan',
  // Goten
  'goten_base': 'goten_base',
  'goten_ssj': 'goten_super_saiyan',
  // Gotenks
  'gotenks_ssj': 'gotenks_super_saiyan',
  'gotenks_ssj3': 'gotenks_super_saiyan_3',
  // Piccolo / Krillin
  'piccolo_base': 'piccolo_base',
  'piccolo_kami': 'piccolo_base',
  'piccolo_evil': 'piccolo_base',
  'krillin_base': 'krillin_base',
  // Frieza
  'frieza_final': 'frieza_base',
  // Cell
  'cell_imperfect': 'cell_imperfect_form',
  'cell_semi': 'cell_semi_perfect_form',
  'cell_perfect': 'cell_perfect',
  'cell_jr': 'cell_jr_base',
  // Androids
  'android_16': 'android_16_base',
  'android_17': 'android_17_base',
  'android_18': 'android_18_base',
  'android_19': 'android_19_base',
  'android_20': 'android_20_base',
  // Ginyu Force
  'ginyu': 'ginyu_base',
  'ginyu_goku': 'ginyu_gokus_body',
  'recoome': 'recoome_base',
  'guldo': 'guldo_base',
  'jeice': 'jeice_base',
  'burter': 'burter_base',
  'nappa': 'nappa_base',
  // Buu
  'buu_base': 'buu_base',
  'buu_super': 'super_buu_base',
  'buu_gotenks': 'buu_gotenks_absorbed',
  'buu_gohan': 'buu_gohan_absorbed',
  'buu_kid': 'kid_buu_base',
  // Fusions
  'vegito_ssj': 'vegito_ssj',
};

export function spriteDirFor(formId: string): string | undefined {
  return SPRITE_DIRS[formId];
}

export function spriteManifestUrl(formId: string): string | undefined {
  const dir = SPRITE_DIRS[formId];
  return dir ? `/assets/sprites/${dir}/manifest.json` : undefined;
}

export function spriteFrameUrl(formId: string, file: string): string {
  const dir = SPRITE_DIRS[formId] || formId;
  return `/assets/sprites/${dir}/${file}`;
}

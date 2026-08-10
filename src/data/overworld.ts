// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de OVERWORLD (vista sin ataque, como el GBC)
// Celdas recortadas del sheet overworld-sprites.png (bien recortadas,
// croma-key validado). El mapeo es provisional por paleta GBC —
// pendiente validación visual del usuario (docs/audit/overworld-grid.png).
// ═══════════════════════════════════════════════════════════

const OVERWORLD_FILES: Record<string, string> = {
  'goku_base': 'cell_02_13.png',
  'goku_ssj': 'cell_02_13.png',
  'goku_ssj2': 'cell_02_13.png',
  'goku_ssj3': 'cell_02_13.png',
  'vegeta_base': 'cell_08_12.png',
  'vegeta_ssj': 'cell_08_12.png',
  'vegeta_majin': 'cell_08_12.png',
  'gohan_young': 'cell_01_08.png',
  'gohan_young_ssj': 'cell_01_08.png',
  'gohan_young_ssj2': 'cell_01_08.png',
  'gohan_teen_ssj': 'cell_01_08.png',
  'gohan_ultimate': 'cell_01_08.png',
  'trunks_kid': 'cell_08_09.png',
  'trunks_future': 'cell_08_09.png',
  'trunks_ssj': 'cell_08_09.png',
  'goten_base': 'cell_16_09.png',
  'goten_ssj': 'cell_16_09.png',
  'gotenks_ssj': 'cell_13_08.png',
  'gotenks_ssj3': 'cell_13_08.png',
  'piccolo_base': 'cell_02_05.png',
  'piccolo_kami': 'cell_02_05.png',
  'krillin_base': 'cell_02_21.png',
  'frieza_final': 'cell_07_34.png',
  'frieza_100': 'cell_07_34.png',
  'cell_imperfect': 'cell_01_25.png',
  'cell_semi': 'cell_01_25.png',
  'cell_perfect': 'cell_01_25.png',
  'cell_jr': 'cell_07_21.png',
  'android_16': 'cell_10_28.png',
  'android_17': 'cell_16_05.png',
  'android_18': 'cell_10_17.png',
  'android_19': 'cell_16_20.png',
  'android_20': 'cell_02_32.png',
  'ginyu': 'cell_07_08.png',
  'ginyu_goku': 'cell_07_09.png',
  'recoome': 'cell_10_32.png',
  'guldo': 'cell_01_04.png',
  'jeice': 'cell_07_20.png',
  'burter': 'cell_01_34.png',
  'nappa': 'cell_19_02.png',
  'buu_base': 'cell_13_24.png',
  'buu_super': 'cell_13_24.png',
  'buu_gotenks': 'cell_13_24.png',
  'buu_gohan': 'cell_13_24.png',
  'buu_kid': 'cell_13_24.png',
  'vegito_base': 'cell_01_01.png',
};

export function overworldUrl(formId: string): string | undefined {
  const file = OVERWORLD_FILES[formId];
  return file ? `/assets/overworld/${file}` : undefined;
}

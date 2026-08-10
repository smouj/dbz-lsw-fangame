// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sprites de OVERWORLD (vista sin ataque, como el GBC)
// En el GBC, los luchadores en el campo de batalla se ven como
// sprites de overworld (chibi pequeños); al atacar hay zoom al
// sprite de combate grande.
//
// ⚠️ MAPEO PROVISIONAL por paleta GBC — pendiente de validación
// visual del usuario (docs/audit/overworld-grid.png). Los sprites
// se identificaron por color dominante (armadura azul=Vegeta,
// gi naranja=Goku, verde=Piccolo/Cell, rosa=Buu, etc.).
// ═══════════════════════════════════════════════════════════

const OVERWORLD_FILES: Record<string, string> = {
  // Goku (gi naranja #f80000)
  'goku_base': 'cell_01_09.png',
  'goku_ssj': 'cell_01_09.png',
  'goku_ssj2': 'cell_01_09.png',
  'goku_ssj3': 'cell_01_09.png',
  // Vegeta (armadura azul #0040b0)
  'vegeta_base': 'cell_01_20.png',
  'vegeta_ssj': 'cell_01_21.png',
  'vegeta_majin': 'cell_02_20.png',
  // Gohan (gi naranja)
  'gohan_young': 'cell_01_08.png',
  'gohan_young_ssj': 'cell_01_08.png',
  'gohan_young_ssj2': 'cell_01_08.png',
  'gohan_teen_ssj': 'cell_01_08.png',
  'gohan_ultimate': 'cell_01_08.png',
  // Piccolo (verde #00a000)
  'piccolo_base': 'cell_01_24.png',
  'piccolo_kami': 'cell_01_24.png',
  // Krillin (uniforme azul)
  'krillin_base': 'cell_02_21.png',
  // Trunks (chaqueta azul)
  'trunks_future': 'cell_07_17.png',
  'trunks_ssj': 'cell_07_04.png',
  'trunks_kid': 'cell_08_04.png',
  // Goten
  'goten_base': 'cell_01_12.png',
  'goten_ssj': 'cell_01_12.png',
  // Gotenks
  'gotenks_ssj': 'cell_13_08.png',
  'gotenks_ssj3': 'cell_13_08.png',
  // Vegito (chaleco morado)
  'vegito_base': 'cell_01_01.png',
  // Ginyu Force
  'ginyu': 'cell_07_08.png',
  'ginyu_goku': 'cell_07_09.png',
  'recoome': 'cell_07_01.png',
  'guldo': 'cell_01_04.png',
  'jeice': 'cell_01_13.png',
  'burter': 'cell_01_34.png',
  'nappa': 'cell_19_02.png',
  // Frieza (blanco)
  'frieza_final': 'cell_07_34.png',
  'frieza_100': 'cell_07_34.png',
  // Androids
  'android_16': 'cell_07_02.png',
  'android_17': 'cell_07_28.png',
  'android_18': 'cell_08_16.png',
  'android_19': 'cell_14_29.png',
  'android_20': 'cell_02_32.png',
  // Cell
  'cell_imperfect': 'cell_01_25.png',
  'cell_semi': 'cell_01_25.png',
  'cell_perfect': 'cell_01_25.png',
  'cell_jr': 'cell_01_28.png',
  // Buu (rosa)
  'buu_base': 'cell_13_24.png',
  'buu_super': 'cell_13_34.png',
  'buu_gotenks': 'cell_13_24.png',
  'buu_gohan': 'cell_13_24.png',
  'buu_kid': 'cell_13_24.png',
};

export function overworldUrl(formId: string): string | undefined {
  const file = OVERWORLD_FILES[formId];
  return file ? `/assets/overworld/${file}` : undefined;
}

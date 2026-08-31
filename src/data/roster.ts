// ═══════════════════════════════════════════════════════════
// DBZ LSW — Roster de personajes (48 formas)
// Datos extraídos de la ROM GBC (canónica: España, CRC32 9DAD6E23; misma data que USA 025AA88A)
// Stats aproximados por tier, sprite sheets auténticos
// ═══════════════════════════════════════════════════════════

export interface StatCurves { hp: number[]; str: number[]; ki: number[]; spd: number[]; }

export interface FormDef {
  id: string;              // id único de la forma
  character: string;       // personaje padre
  form: string;            // label legible (Base, SSJ, Kid SSJ2, Ultimate...)
  rom?: string;            // label original de la ROM del GBC (Ksuper, Warrior...)
  hp: number;              // stats BASE reales de la ROM (nivel 1)
  str: number;
  ki: number;
  spd: number;
  tier: number;            // tier real del GBC (1=base, 2=super, 3=final)
  curves?: StatCurves;     // crecimiento real por cuartos (niv 25/50/75/100)
  sheet?: string;          // sprite sheet auténtico (opcional: fallback procedural)
  battleId?: 'goku' | 'vegeta';  // sprites animados extraídos disponibles
  portrait?: string;       // ruta al retrato (mapeado)
}

export interface CharacterDef {
  id: string;
  name: string;
  forms: string[];         // ids de formas
  tier: number;            // poder relativo 1-5
  saga: string;            // saga de introducción
}

// ─── Formas (48) ──────────────────────────────────────────

export const FORMS: Record<string, FormDef> = {
  'goku_base': { id: 'goku_base', character: 'goku', form: 'Normal', hp: 90, str: 9, ki: 13, spd: 6, tier: 1, curves: { hp: [103, 116, 129, 142], str: [15, 20, 25, 30], ki: [17, 21, 24, 28], spd: [11, 16, 21, 26] }, sheet: 'goku.png', battleId: 'goku', portrait: 'portraits/goku.png' },
  'goku_ssj': { id: 'goku_ssj', character: 'goku', form: 'Super', hp: 100, str: 13, ki: 15, spd: 8, tier: 2, curves: { hp: [113, 126, 139, 152], str: [18, 24, 29, 34], ki: [19, 23, 26, 30], spd: [13, 18, 23, 28] }, sheet: 'goku-super-saiyan.png', portrait: 'portraits/goku_ssj.png' },
  'goku_ssj2': { id: 'goku_ssj2', character: 'goku', form: 'Super2', hp: 105, str: 15, ki: 17, spd: 9, tier: 3, curves: { hp: [118, 131, 144, 157], str: [20, 25, 30, 36], ki: [21, 24, 28, 32], spd: [14, 19, 24, 29] }, sheet: 'goku-super-saiyan.png' },
  'goku_ssj3': { id: 'goku_ssj3', character: 'goku', form: 'Super3', hp: 110, str: 17, ki: 18, spd: 10, tier: 3, curves: { hp: [123, 136, 149, 162], str: [22, 27, 33, 38], ki: [22, 26, 30, 33], spd: [15, 20, 25, 30] }, sheet: 'goku-super-saiyan-3.png' },
  'vegeta_base': { id: 'vegeta_base', character: 'vegeta', form: 'Normal', hp: 95, str: 10, ki: 12, spd: 6, tier: 1, curves: { hp: [107, 119, 131, 143], str: [16, 22, 28, 34], ki: [17, 21, 26, 30], spd: [10, 14, 18, 22] }, sheet: 'vegeta.png', battleId: 'vegeta', portrait: 'portraits/vegeta.png' },
  'vegeta_ssj': { id: 'vegeta_ssj', character: 'vegeta', form: 'Super', hp: 105, str: 14, ki: 15, spd: 8, tier: 2, curves: { hp: [117, 129, 141, 153], str: [20, 26, 32, 38], ki: [19, 24, 28, 33], spd: [12, 16, 20, 24] }, sheet: 'vegeta-super-saiyan-majin.png' },
  'vegeta_majin': { id: 'vegeta_majin', character: 'vegeta', form: 'Majin', hp: 110, str: 15, ki: 16, spd: 9, tier: 3, curves: { hp: [122, 134, 146, 158], str: [21, 27, 33, 39], ki: [21, 25, 30, 34], spd: [13, 17, 21, 25] }, sheet: 'vegeta-super-saiyan-majin.png' },
  'gohan_young': { id: 'gohan_young', character: 'gohan_kid', form: 'Kid', hp: 80, str: 7, ki: 12, spd: 6, tier: 1, curves: { hp: [93, 106, 119, 132], str: [12, 18, 23, 28], ki: [16, 21, 25, 30], spd: [11, 16, 21, 26] }, sheet: 'young-gohan.png' },
  'gohan_young_ssj': { id: 'gohan_young_ssj', character: 'gohan_kid', form: 'Kid SSJ', rom: 'Ksuper', hp: 90, str: 11, ki: 14, spd: 8, tier: 2, curves: { hp: [103, 116, 129, 142], str: [16, 21, 27, 32], ki: [18, 23, 27, 32], spd: [13, 18, 23, 28] }, sheet: 'young-gohan-super-saiyan.png' },
  'gohan_young_ssj2': { id: 'gohan_young_ssj2', character: 'gohan_kid', form: 'Kid SSJ2', rom: 'KSuper2', hp: 95, str: 12, ki: 15, spd: 9, tier: 3, curves: { hp: [108, 121, 134, 147], str: [18, 23, 28, 33], ki: [20, 24, 28, 33], spd: [14, 19, 24, 29] }, sheet: 'young-gohan-super-saiyan-2.png' },
  'gohan_adult_ssj': { id: 'gohan_adult_ssj', character: 'gohan_adult', form: 'SSJ', rom: 'Super', hp: 90, str: 9, ki: 12, spd: 6, tier: 2, curves: { hp: [102, 114, 126, 138], str: [15, 20, 25, 30], ki: [16, 20, 24, 27], spd: [11, 16, 21, 26] }, sheet: 'gohan-super-saiyan-1-2.png' },
  'gohan_adult_ssj2': { id: 'gohan_adult_ssj2', character: 'gohan_adult', form: 'SSJ2', rom: 'Super2', hp: 105, str: 15, ki: 16, spd: 9, tier: 2, curves: { hp: [117, 129, 141, 153], str: [20, 25, 30, 36], ki: [20, 24, 27, 31], spd: [14, 19, 24, 29] }, sheet: 'gohan-super-saiyan-1-2.png' },
  'gohan_adult_ultimate': { id: 'gohan_adult_ultimate', character: 'gohan_adult', form: 'Ultimate', rom: 'Warrior', hp: 110, str: 17, ki: 18, spd: 10, tier: 3, curves: { hp: [122, 134, 146, 158], str: [22, 27, 33, 38], ki: [21, 25, 29, 33], spd: [15, 20, 25, 30] }, sheet: 'gohan-ultimate.png' },
  'trunks_kid': { id: 'trunks_kid', character: 'trunks_kid', form: 'Kid', hp: 90, str: 7, ki: 11, spd: 5, tier: 1, curves: { hp: [102, 114, 126, 138], str: [13, 19, 25, 31], ki: [15, 18, 22, 26], spd: [10, 15, 20, 25] }, sheet: 'trunks.png' },
  'trunks_kid_ssj': { id: 'trunks_kid_ssj', character: 'trunks_kid', form: 'Kid SSJ', rom: 'Ksuper', hp: 100, str: 11, ki: 13, spd: 7, tier: 2, curves: { hp: [112, 124, 136, 148], str: [17, 23, 29, 35], ki: [17, 21, 24, 28], spd: [12, 17, 22, 27] }, sheet: 'trunks-super-saiyan.png' },
  'trunks_future': { id: 'trunks_future', character: 'trunks_future', form: 'Normal', hp: 95, str: 9, ki: 13, spd: 6, tier: 1, curves: { hp: [107, 119, 131, 143], str: [14, 18, 23, 27], ki: [17, 21, 24, 28], spd: [11, 16, 21, 26] }, sheet: 'future-trunks.png' },
  'trunks_ssj': { id: 'trunks_ssj', character: 'trunks_future', form: 'Super', hp: 105, str: 13, ki: 15, spd: 8, tier: 2, curves: { hp: [117, 129, 141, 153], str: [18, 22, 27, 31], ki: [19, 23, 27, 30], spd: [13, 18, 23, 28] }, sheet: 'future-trunks-ssj.png' },
  'goten_base': { id: 'goten_base', character: 'goten', form: 'Kid', hp: 90, str: 6, ki: 12, spd: 5, tier: 1, curves: { hp: [101, 112, 123, 134], str: [11, 15, 20, 24], ki: [16, 21, 25, 30], spd: [9, 13, 17, 21] }, sheet: 'goten.png' },
  'goten_ssj': { id: 'goten_ssj', character: 'goten', form: 'SSJ', hp: 100, str: 10, ki: 14, spd: 7, tier: 2, curves: { hp: [111, 122, 133, 144], str: [15, 19, 24, 28], ki: [18, 23, 27, 32], spd: [11, 15, 19, 23] }, sheet: 'goten-super-saiyan.png' },
  'gotenks_ssj': { id: 'gotenks_ssj', character: 'gotenks', form: 'SSJ', hp: 90, str: 8, ki: 12, spd: 7, tier: 2, curves: { hp: [105, 120, 135, 150], str: [15, 21, 28, 35], ki: [17, 22, 27, 33], spd: [14, 21, 28, 35] }, sheet: 'gotenks-super-saiyan.png' },
  'gotenks_ssj3': { id: 'gotenks_ssj3', character: 'gotenks', form: 'SSJ3', hp: 110, str: 15, ki: 17, spd: 11, tier: 3, curves: { hp: [125, 140, 155, 170], str: [22, 29, 36, 42], ki: [22, 27, 33, 38], spd: [18, 25, 32, 39] }, sheet: 'gotenks-super-saiyan-3.png' },
  'piccolo_base': { id: 'piccolo_base', character: 'piccolo', form: 'Normal', hp: 85, str: 9, ki: 14, spd: 5, tier: 1, curves: { hp: [100, 115, 130, 145], str: [15, 20, 25, 30], ki: [18, 21, 25, 29], spd: [10, 15, 20, 25] }, sheet: 'piccolo.png' },
  'piccolo_kami': { id: 'piccolo_kami', character: 'piccolo', form: 'Kami', hp: 95, str: 13, ki: 16, spd: 7, tier: 2, curves: { hp: [110, 125, 140, 155], str: [18, 24, 29, 34], ki: [20, 24, 27, 31], spd: [12, 17, 22, 27] }, sheet: 'piccolo.png' },
  'piccolo_evil': { id: 'piccolo_evil', character: 'piccolo', form: 'Evil', hp: 105, str: 17, ki: 19, spd: 9, tier: 3, curves: { hp: [120, 135, 150, 165], str: [22, 27, 33, 38], ki: [23, 27, 30, 34], spd: [14, 19, 24, 29] }, sheet: 'piccolo.png' },
  'krillin_base': { id: 'krillin_base', character: 'krillin', form: 'Base', hp: 85, str: 8, ki: 12, spd: 6, tier: 1, curves: { hp: [97, 109, 121, 133], str: [12, 15, 19, 23], ki: [18, 23, 28, 33], spd: [12, 18, 24, 30] }, sheet: 'krillin.png' },
  'frieza_final': { id: 'frieza_final', character: 'frieza', form: 'Base', hp: 100, str: 12, ki: 13, spd: 9, tier: 2, curves: { hp: [115, 130, 145, 160], str: [18, 24, 30, 36], ki: [18, 22, 27, 31], spd: [15, 21, 27, 33] }, sheet: 'frieza.png' },
  'cell_imperfect': { id: 'cell_imperfect', character: 'cell', form: 'Imperfect', hp: 90, str: 10, ki: 14, spd: 7, tier: 1, curves: { hp: [103, 116, 129, 142], str: [15, 21, 26, 31], ki: [18, 21, 25, 29], spd: [12, 17, 22, 27] }, sheet: 'cell-imperfect-form.png' },
  'cell_semi': { id: 'cell_semi', character: 'cell', form: 'Semi-Perfect', hp: 100, str: 14, ki: 16, spd: 9, tier: 2, curves: { hp: [113, 126, 139, 152], str: [19, 24, 30, 35], ki: [20, 24, 27, 31], spd: [14, 19, 24, 29] }, sheet: 'cell-semi-perfect-form.png' },
  'cell_perfect': { id: 'cell_perfect', character: 'cell', form: 'Perfect', hp: 105, str: 15, ki: 18, spd: 10, tier: 3, curves: { hp: [118, 131, 144, 157], str: [21, 26, 31, 36], ki: [21, 25, 29, 33], spd: [15, 20, 25, 30] }, sheet: 'cell-perfect.png' },
  'cell_jr': { id: 'cell_jr', character: 'cell_jr', form: 'Base', hp: 80, str: 8, ki: 13, spd: 8, tier: 1, curves: { hp: [92, 104, 116, 128], str: [14, 20, 26, 32], ki: [17, 21, 24, 28], spd: [13, 18, 23, 28] }, sheet: 'cell-jr.png' },
  'android_16': { id: 'android_16', character: 'android_16', form: 'Base', hp: 110, str: 12, ki: 12, spd: 7, tier: 1, curves: { hp: [125, 140, 155, 170], str: [18, 24, 30, 36], ki: [15, 18, 21, 24], spd: [11, 15, 19, 23] }, sheet: 'android-16.png' },
  'android_17': { id: 'android_17', character: 'android_17', form: 'Base', hp: 100, str: 12, ki: 13, spd: 9, tier: 1, curves: { hp: [115, 130, 145, 160], str: [17, 22, 27, 33], ki: [17, 21, 24, 28], spd: [14, 19, 24, 29] }, sheet: 'android-17.png' },
  'android_18': { id: 'android_18', character: 'android_18', form: 'Base', hp: 100, str: 10, ki: 15, spd: 9, tier: 1, curves: { hp: [113, 126, 139, 152], str: [15, 19, 24, 28], ki: [19, 24, 28, 33], spd: [15, 21, 27, 33] }, sheet: 'android-18.png' },
  'android_19': { id: 'android_19', character: 'android_19', form: 'Base', hp: 80, str: 9, ki: 12, spd: 6, tier: 1, curves: { hp: [92, 104, 116, 128], str: [12, 16, 20, 24], ki: [15, 18, 21, 24], spd: [10, 14, 18, 22] }, sheet: 'android-19.png' },
  'android_20': { id: 'android_20', character: 'android_20', form: 'Base', hp: 85, str: 9, ki: 12, spd: 6, tier: 1, curves: { hp: [96, 107, 118, 129], str: [12, 16, 20, 24], ki: [15, 19, 23, 27], spd: [11, 15, 20, 25] }, sheet: 'android-20-dr-gero.png' },
  'ginyu': { id: 'ginyu', character: 'ginyu', form: 'Normal', hp: 100, str: 11, ki: 14, spd: 9, tier: 1, curves: { hp: [113, 126, 139, 152], str: [16, 21, 27, 32], ki: [18, 21, 25, 29], spd: [14, 19, 24, 29] }, sheet: 'ginyu.png' },
  'ginyu_goku': { id: 'ginyu_goku', character: 'ginyu', form: 'Goku', hp: 100, str: 15, ki: 14, spd: 9, tier: 2, curves: { hp: [113, 126, 139, 152], str: [20, 25, 30, 36], ki: [18, 21, 25, 29], spd: [14, 19, 24, 29] }, sheet: 'goku.png' },
  'recoome': { id: 'recoome', character: 'recoome', form: 'Base', hp: 105, str: 12, ki: 9, spd: 7, tier: 1, curves: { hp: [125, 145, 165, 185], str: [18, 25, 32, 39], ki: [12, 15, 18, 21], spd: [11, 15, 19, 23] }, sheet: 'recoome.png' },
  'guldo': { id: 'guldo', character: 'guldo', form: 'Base', hp: 90, str: 6, ki: 12, spd: 6, tier: 1, curves: { hp: [101, 112, 123, 134], str: [11, 15, 20, 24], ki: [16, 20, 24, 27], spd: [10, 14, 18, 22] }, sheet: 'guldo.png' },
  'jeice': { id: 'jeice', character: 'jeice', form: 'Base', hp: 100, str: 9, ki: 13, spd: 8, tier: 1, curves: { hp: [112, 124, 136, 148], str: [13, 18, 22, 27], ki: [18, 22, 27, 31], spd: [13, 18, 23, 28] }, sheet: 'jeice.png' },
  'burter': { id: 'burter', character: 'burter', form: 'Base', hp: 95, str: 10, ki: 12, spd: 12, tier: 1, curves: { hp: [108, 121, 134, 147], str: [14, 18, 21, 25], ki: [16, 20, 24, 27], spd: [19, 26, 33, 40] }, sheet: 'burter.png' },
  'nappa': { id: 'nappa', character: 'nappa', form: 'Base', hp: 90, str: 11, ki: 10, spd: 6, tier: 1, curves: { hp: [110, 130, 150, 170], str: [17, 23, 29, 35], ki: [13, 16, 19, 22], spd: [10, 14, 18, 22] }, sheet: 'nappa.png' },
  'buu_base': { id: 'buu_base', character: 'buu', form: 'Fat', hp: 95, str: 11, ki: 12, spd: 8, tier: 2, curves: { hp: [108, 121, 134, 147], str: [15, 20, 24, 29], ki: [15, 19, 23, 27], spd: [12, 16, 20, 24] }, sheet: 'buu.png' },
  'buu_super': { id: 'buu_super', character: 'buu', form: 'Super', hp: 100, str: 10, ki: 11, spd: 7, tier: 2, curves: { hp: [113, 126, 139, 152], str: [15, 19, 24, 28], ki: [15, 18, 22, 26], spd: [11, 15, 19, 23] }, sheet: 'super-buu.png' },
  'buu_gotenks': { id: 'buu_gotenks', character: 'buu', form: 'Gotenks', hp: 115, str: 15, ki: 18, spd: 11, tier: 3, curves: { hp: [128, 141, 154, 167], str: [19, 24, 28, 33], ki: [22, 26, 30, 33], spd: [15, 19, 23, 27] }, sheet: 'buu-gotenks.png' },
  'buu_gohan': { id: 'buu_gohan', character: 'buu', form: 'Gohan', hp: 120, str: 18, ki: 16, spd: 10, tier: 3, curves: { hp: [133, 146, 159, 172], str: [22, 27, 31, 36], ki: [20, 24, 27, 31], spd: [14, 18, 22, 26] }, sheet: 'buu-gohan.png' },
  'buu_kid': { id: 'buu_kid', character: 'buu', form: 'Kid', hp: 105, str: 14, ki: 15, spd: 17, tier: 3, curves: { hp: [118, 131, 144, 157], str: [18, 23, 27, 32], ki: [18, 22, 26, 30], spd: [21, 25, 29, 33] }, sheet: 'kid-buu.png' },
  'vegito_ssj': { id: 'vegito_ssj', character: 'vegito', form: 'SSJ', rom: 'Super', hp: 110, str: 17, ki: 18, spd: 10, tier: 3, sheet: 'vegito.png', curves: { hp: [125, 140, 155, 170], str: [24, 30, 37, 44], ki: [24, 29, 34, 39], spd: [17, 24, 31, 38] } },
};

// ─── Personajes (26) ──────────────────────────────────────

export const CHARACTERS: CharacterDef[] = [
  { id: 'goku', name: 'Goku', forms: ['goku_base', 'goku_ssj', 'goku_ssj2', 'goku_ssj3'], tier: 5, saga: 'Saiyan' },
  { id: 'vegeta', name: 'Vegeta', forms: ['vegeta_base', 'vegeta_ssj', 'vegeta_majin'], tier: 5, saga: 'Saiyan' },
  { id: 'gohan_kid', name: 'Gohan Kid', forms: ['gohan_young', 'gohan_young_ssj', 'gohan_young_ssj2'], tier: 3, saga: 'Cell' },
  { id: 'gohan_adult', name: 'Gohan Adult', forms: ['gohan_adult_ssj', 'gohan_adult_ssj2', 'gohan_adult_ultimate'], tier: 5, saga: 'Buu' },
  { id: 'trunks_kid', name: 'Trunks Kid', forms: ['trunks_kid', 'trunks_kid_ssj'], tier: 3, saga: 'Android' },
  { id: 'trunks_future', name: 'Trunks Futuro', forms: ['trunks_future', 'trunks_ssj'], tier: 4, saga: 'Android' },
  { id: 'goten', name: 'Goten', forms: ['goten_base', 'goten_ssj'], tier: 3, saga: 'Buu' },
  { id: 'gotenks', name: 'Gotenks', forms: ['gotenks_ssj', 'gotenks_ssj3'], tier: 5, saga: 'Buu' },
  { id: 'piccolo', name: 'Piccolo', forms: ['piccolo_base', 'piccolo_kami', 'piccolo_evil'], tier: 4, saga: 'Saiyan' },
  { id: 'krillin', name: 'Krillin', forms: ['krillin_base'], tier: 2, saga: 'Saiyan' },
  { id: 'frieza', name: 'Frieza', forms: ['frieza_final'], tier: 5, saga: 'Namek' },
  { id: 'cell', name: 'Cell', forms: ['cell_imperfect', 'cell_semi', 'cell_perfect'], tier: 5, saga: 'Cell' },
  { id: 'cell_jr', name: 'Cell Jr.', forms: ['cell_jr'], tier: 3, saga: 'Cell' },
  { id: 'android_16', name: 'Android 16', forms: ['android_16'], tier: 4, saga: 'Android' },
  { id: 'android_17', name: 'Android 17', forms: ['android_17'], tier: 4, saga: 'Android' },
  { id: 'android_18', name: 'Android 18', forms: ['android_18'], tier: 4, saga: 'Android' },
  { id: 'android_19', name: 'Android 19', forms: ['android_19'], tier: 3, saga: 'Android' },
  { id: 'android_20', name: 'Dr. Gero', forms: ['android_20'], tier: 3, saga: 'Android' },
  { id: 'ginyu', name: 'Captain Ginyu', forms: ['ginyu', 'ginyu_goku'], tier: 3, saga: 'Namek' },
  { id: 'recoome', name: 'Recoome', forms: ['recoome'], tier: 3, saga: 'Namek' },
  { id: 'guldo', name: 'Guldo', forms: ['guldo'], tier: 2, saga: 'Namek' },
  { id: 'jeice', name: 'Jeice', forms: ['jeice'], tier: 3, saga: 'Namek' },
  { id: 'burter', name: 'Burter', forms: ['burter'], tier: 3, saga: 'Namek' },
  { id: 'nappa', name: 'Nappa', forms: ['nappa'], tier: 3, saga: 'Saiyan' },
  { id: 'buu', name: 'Majin Buu', forms: ['buu_base', 'buu_super', 'buu_gotenks', 'buu_gohan', 'buu_kid'], tier: 5, saga: 'Buu' },
  { id: 'vegito', name: 'Vegito', forms: ['vegito_ssj'], tier: 5, saga: 'Buu' },
];

import { ROM_FIGHTER_FORM_IDENTITY } from './generated/romFighterFormIdentity.generated';

const ROM_FORM_ORDER: Map<string, number> = new Map(ROM_FIGHTER_FORM_IDENTITY.map(row => [row.formId, row.romFormId]));

export const ROM_ORDERED_FORM_IDS: string[] = ROM_FIGHTER_FORM_IDENTITY.map(row => row.formId);

export const ROM_ORDERED_CHARACTERS: CharacterDef[] = CHARACTERS
  .map(character => ({
    ...character,
    forms: [...character.forms].sort((a, b) =>
      (ROM_FORM_ORDER.get(a) ?? 0xff) - (ROM_FORM_ORDER.get(b) ?? 0xff)),
  }))
  .sort((a, b) =>
    Math.min(...a.forms.map(form => ROM_FORM_ORDER.get(form) ?? 0xff)) -
    Math.min(...b.forms.map(form => ROM_FORM_ORDER.get(form) ?? 0xff)));

// ─── Helpers ──────────────────────────────────────────────

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find(c => c.id === id);
}

export function getForm(id: string): FormDef | undefined {
  return FORMS[id];
}

export function sheetUrl(form: FormDef): string {
  return `/assets/sheets/${form.sheet}`;
}

export function sheetThumbUrl(form: FormDef): string {
  return `/assets/sheets/${form.sheet}`;
}
// ─── Sprite idle extraído por forma ───────────────────────
// FUENTE CANÓNICA: public/assets/sprites/<sprite_dir>/<sprite_dir>_idle_00.png
// (44 dirs con manifest — ver src/data/spriteManifest.ts SPRITE_DIRS).
// El mapeo viejo por sheet (goku.png → 'goku') apuntaba a carpetas
// pre-canonización que ya no existen; ahora se resuelve SIEMPRE con
// spriteDirFor(form.id) para que el menú BATTLE y los fallbacks del Dev
// Studio usen exactamente la misma fuente que el runtime del juego.

import { spriteDirFor } from './spriteManifest';

export function idleSpriteDir(form: FormDef): string | undefined {
  const dir = spriteDirFor(form.id);
  return dir ? `/assets/sprites/${dir}/${dir}_idle_00.png` : undefined;
}

export function idleSpriteUrl(form: FormDef): string | undefined {
  if (!form.sheet) return undefined;
  return idleSpriteDir(form);
}

// ─── Crecimiento por personaje (fiel al GBC: no es +1 universal) ───
// Cada personaje tiene incrementos específicos por estadística al subir de nivel.
// Los valores son relativos al tier (los luchadores más fuertes crecen más).
export interface GrowthRates { hp: number; str: number; ki: number; spd: number; }

// Crecimiento REAL del GBC: cada forma tiene curvas por cuartos de nivel
// (valores en niveles 25/50/75/100 extraídos de la ROM — spreadsheet oficial).
// El incremento por nivel = (curva[i] - curva[i-1]) / 25 dentro de cada cuarto.
export function growthFor(form: FormDef): GrowthRates {
  const c = form.curves;
  if (!c) return { hp: 0, str: 0, ki: 0, spd: 0 };
  const inc = (curve: number[], base: number) => {
    // Media del incremento por nivel en el primer cuarto (niv 1→25)
    return Math.max(0, Math.round(((curve[0] - base) / 25) * 100) / 100);
  };
  return {
    hp: inc(c.hp, form.hp),
    str: inc(c.str, form.str),
    ki: inc(c.ki, form.ki),
    spd: inc(c.spd, form.spd),
  };
}

// Stat real a un nivel dado (interpolación lineal entre cuartos, como el GBC)
export function statAtLevel(form: FormDef, level: number, stat: 'hp' | 'str' | 'ki' | 'spd'): number {
  const c = form.curves;
  if (!c || level <= 1) return form[stat];
  if (level >= 100) return c[stat][3];
  const quarter = Math.min(3, Math.floor((level - 1) / 25));
  const prev = quarter === 0 ? form[stat] : c[stat][quarter - 1];
  const next = c[stat][quarter];
  const inQuarter = (level - 1 - quarter * 25) / 25;
  return Math.round(prev + (next - prev) * inQuarter);
}

// ─── Limited Cards (L) — fiel al GBC ───
// Cada personaje puede usar hasta 3 Limited Cards (Androids 19/20 solo 2),
// reutilizables mientras tengas CC suficiente. Se configuran en menu→team→limit.
// ⚠️ La CAPACIDAD es una regla plana en limitLoadout.getLimitCapacity (3, androids
// 19/20 = 2) — estos arrays son SOLO el loadout del walkthrough (qué cartas
// vienen equipadas por defecto), no la capacidad.
// Valores por defecto basados en el walkthrough (ej. "equipa a Goku con
// Super Kamehameha + Kaioken", "Super Kamehameha en Gohan", "Final Flash/Big
// Bang Attack" en Vegeta, "Super Kamehameha + Teleport + Big Bang" en Vegito).
export const LIMIT_DEFAULTS: Record<string, number[]> = {
  'goku': [23, 13, 24],      // Kaio Ken, S.Kamehameha, Spirit Bomb
  'gohan_kid': [10],         // Masenko
  'gohan_adult': [13],       // S.Kamehameha
  'vegeta': [32, 31, 30],    // Final Flash, Big Bang Atk, Galick-Ho
  'piccolo': [17, 18],       // S.Beam Can., F.Lightbomb
  'krillin': [22, 21],       // S.Destruc-D., Destruct-Disk
  'trunks_kid': [],          // (sin Limit por defecto)
  'trunks_future': [35, 36], // Burning Atk., Fin.Buster
  'frieza': [64, 65],        // Super E-Ball, Grand Wave
  'cell': [17, 63, 77],      // S.Beam Can., Finger Beam, Cell Combo
  'buu': [80, 64],           // Potbelly Atk, Super E-Ball
  'android_19': [75, 76],    // Life Absorb, Energy Absorb (regla Androids)
  'android_20': [75, 76],    // Life Absorb, Energy Absorb (regla Androids)
  'android_16': [69, 70],    // Rocket Punch, Hell Flash
  'android_17': [71, 72],    // Crazy Rush, Energy Slash
  'android_18': [74, 73],    // Attack No. 18, Energy Slice
  'goten': [13, 38],          // S.Kamehameha, Kamekameha
  'vegito': [13, 26, 31],    // S.Kamehameha, Teleport., Big Bang Atk (walkthrough)
};

export function loadLimits(charId: string): number[] {
  try {
    const raw = localStorage.getItem('dbzlsw_limits');
    if (raw) {
      const all = JSON.parse(raw) as Record<string, number[]>;
      if (Array.isArray(all[charId])) return all[charId];
    }
  } catch { /* noop */ }
  return [];
}

export function saveLimits(charId: string, ids: number[]): void {
  try {
    const raw = localStorage.getItem('dbzlsw_limits');
    const all = raw ? JSON.parse(raw) as Record<string, number[]> : {};
    all[charId] = ids;
    localStorage.setItem('dbzlsw_limits', JSON.stringify(all));
  } catch { /* noop */ }
}

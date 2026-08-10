// ═══════════════════════════════════════════════════════════
// DBZ LSW — Roster de personajes (48 formas)
// Datos extraídos de la ROM USA (CRC32 025AA88A) como referencia
// Stats aproximados por tier, sprite sheets auténticos
// ═══════════════════════════════════════════════════════════

export interface FormDef {
  id: string;              // id único de la forma
  character: string;       // personaje padre
  form: string;            // nombre de la forma (Base, SSJ, ...)
  hp: number;
  str: number;
  ki: number;
  spd: number;
  sheet: string;           // sprite sheet auténtico
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
  // Goku — 4 formas
  'goku_base': { id: 'goku_base', character: 'goku', form: 'Base', hp: 312, str: 42, ki: 47, spd: 39, sheet: 'goku.png', battleId: 'goku', portrait: 'portraits/goku.png' },
  'goku_ssj': { id: 'goku_ssj', character: 'goku', form: 'SSJ', hp: 350, str: 52, ki: 56, spd: 44, sheet: 'goku-super-saiyan.png', portrait: 'portraits/goku_ssj.png' },
  'goku_ssj2': { id: 'goku_ssj2', character: 'goku', form: 'SSJ2', hp: 390, str: 62, ki: 66, spd: 49, sheet: 'goku-super-saiyan-2.png' },
  'goku_ssj3': { id: 'goku_ssj3', character: 'goku', form: 'SSJ3', hp: 440, str: 72, ki: 76, spd: 55, sheet: 'goku-super-saiyan-3.png' },

  // Vegeta — 3 formas
  'vegeta_base': { id: 'vegeta_base', character: 'vegeta', form: 'Base', hp: 304, str: 45, ki: 44, spd: 41, sheet: 'vegeta.png', battleId: 'vegeta', portrait: 'portraits/vegeta.png' },
  'vegeta_ssj': { id: 'vegeta_ssj', character: 'vegeta', form: 'SSJ', hp: 342, str: 54, ki: 53, spd: 46, sheet: 'vegeta-super-saiyan-majin.png' },
  'vegeta_majin': { id: 'vegeta_majin', character: 'vegeta', form: 'Majin', hp: 370, str: 60, ki: 60, spd: 48, sheet: 'vegeta-super-saiyan-majin.png' },

  // Gohan — 5 formas
  'gohan_young': { id: 'gohan_young', character: 'gohan', form: 'Young', hp: 280, str: 34, ki: 40, spd: 36, sheet: 'young-gohan.png' },
  'gohan_young_ssj': { id: 'gohan_young_ssj', character: 'gohan', form: 'Young SSJ', hp: 320, str: 44, ki: 50, spd: 41, sheet: 'young-gohan-super-saiyan.png' },
  'gohan_young_ssj2': { id: 'gohan_young_ssj2', character: 'gohan', form: 'SSJ2', hp: 360, str: 54, ki: 60, spd: 46, sheet: 'young-gohan-super-saiyan-2.png' },
  'gohan_teen_ssj': { id: 'gohan_teen_ssj', character: 'gohan', form: 'Teen SSJ', hp: 380, str: 58, ki: 62, spd: 47, sheet: 'gohan-super-saiyan-1-2.png' },
  'gohan_ultimate': { id: 'gohan_ultimate', character: 'gohan', form: 'Ultimate', hp: 430, str: 68, ki: 72, spd: 52, sheet: 'gohan-ultimate.png' },

  // Trunks — 3 formas
  'trunks_kid': { id: 'trunks_kid', character: 'trunks', form: 'Kid', hp: 270, str: 32, ki: 36, spd: 38, sheet: 'trunks.png' },
  'trunks_future': { id: 'trunks_future', character: 'trunks', form: 'Future', hp: 330, str: 46, ki: 44, spd: 43, sheet: 'future-trunks.png' },
  'trunks_ssj': { id: 'trunks_ssj', character: 'trunks', form: 'SSJ', hp: 370, str: 55, ki: 52, spd: 47, sheet: 'trunks-super-saiyan.png' },

  // Goten — 2 formas
  'goten_base': { id: 'goten_base', character: 'goten', form: 'Base', hp: 260, str: 30, ki: 34, spd: 37, sheet: 'goten.png' },
  'goten_ssj': { id: 'goten_ssj', character: 'goten', form: 'SSJ', hp: 310, str: 40, ki: 44, spd: 42, sheet: 'goten-super-saiyan.png' },

  // Gotenks — 2 formas
  'gotenks_ssj': { id: 'gotenks_ssj', character: 'gotenks', form: 'SSJ', hp: 400, str: 60, ki: 58, spd: 50, sheet: 'gotenks-super-saiyan.png' },
  'gotenks_ssj3': { id: 'gotenks_ssj3', character: 'gotenks', form: 'SSJ3', hp: 460, str: 70, ki: 68, spd: 56, sheet: 'gotenks-super-saiyan-3.png' },

  // Piccolo — 2 formas
  'piccolo_base': { id: 'piccolo_base', character: 'piccolo', form: 'Base', hp: 300, str: 40, ki: 45, spd: 35, sheet: 'piccolo.png' },
  'piccolo_kami': { id: 'piccolo_kami', character: 'piccolo', form: 'Kami', hp: 340, str: 48, ki: 52, spd: 40, sheet: 'piccolo.png' },

  // Krillin — 1 forma
  'krillin_base': { id: 'krillin_base', character: 'krillin', form: 'Base', hp: 250, str: 30, ki: 35, spd: 38, sheet: 'krillin.png' },

  // Frieza — 2 formas
  'frieza_final': { id: 'frieza_final', character: 'frieza', form: 'Final', hp: 380, str: 56, ki: 58, spd: 48, sheet: 'frieza.png' },
  'frieza_100': { id: 'frieza_100', character: 'frieza', form: '100%', hp: 420, str: 66, ki: 66, spd: 52, sheet: 'frieza.png' },

  // Cell — 3 formas
  'cell_imperfect': { id: 'cell_imperfect', character: 'cell', form: 'Imperfect', hp: 340, str: 48, ki: 46, spd: 42, sheet: 'cell-imperfect-form.png' },
  'cell_semi': { id: 'cell_semi', character: 'cell', form: 'Semi', hp: 380, str: 56, ki: 54, spd: 46, sheet: 'cell-semi-perfect-form.png' },
  'cell_perfect': { id: 'cell_perfect', character: 'cell', form: 'Perfect', hp: 440, str: 68, ki: 66, spd: 54, sheet: 'cell-perfect.png' },
  'cell_jr': { id: 'cell_jr', character: 'cell_jr', form: 'Jr.', hp: 320, str: 44, ki: 42, spd: 44, sheet: 'cell-jr.png' },

  // Androides — 5 formas
  'android_16': { id: 'android_16', character: 'android_16', form: '16', hp: 420, str: 60, ki: 30, spd: 38, sheet: 'android-16.png' },
  'android_17': { id: 'android_17', character: 'android_17', form: '17', hp: 380, str: 56, ki: 50, spd: 48, sheet: 'android-17.png' },
  'android_18': { id: 'android_18', character: 'android_18', form: '18', hp: 360, str: 52, ki: 48, spd: 46, sheet: 'android-18.png' },
  'android_19': { id: 'android_19', character: 'android_19', form: '19', hp: 330, str: 48, ki: 40, spd: 36, sheet: 'android-19.png' },
  'android_20': { id: 'android_20', character: 'android_20', form: 'Dr. Gero', hp: 300, str: 40, ki: 45, spd: 34, sheet: 'android-20-dr-gero.png' },

  // Ginyu Force — 6 formas
  'ginyu': { id: 'ginyu', character: 'ginyu', form: 'Ginyu', hp: 340, str: 50, ki: 46, spd: 42, sheet: 'ginyu.png' },
  'ginyu_goku': { id: 'ginyu_goku', character: 'ginyu', form: 'Goku Body', hp: 350, str: 50, ki: 48, spd: 42, sheet: 'ginyu-gokus-body.png' },
  'recoome': { id: 'recoome', character: 'recoome', form: 'Recoome', hp: 380, str: 55, ki: 30, spd: 30, sheet: 'recoome.png' },
  'guldo': { id: 'guldo', character: 'guldo', form: 'Guldo', hp: 240, str: 28, ki: 38, spd: 28, sheet: 'guldo.png' },
  'jeice': { id: 'jeice', character: 'jeice', form: 'Jeice', hp: 300, str: 42, ki: 40, spd: 42, sheet: 'jeice.png' },
  'burter': { id: 'burter', character: 'burter', form: 'Burter', hp: 290, str: 40, ki: 36, spd: 50, sheet: 'burter.png' },

  // Nappa — 1 forma
  'nappa': { id: 'nappa', character: 'nappa', form: 'Nappa', hp: 360, str: 55, ki: 25, spd: 26, sheet: 'nappa.png' },

  // Buu — 5 formas
  'buu_base': { id: 'buu_base', character: 'buu', form: 'Buu', hp: 400, str: 55, ki: 55, spd: 42, sheet: 'buu.png' },
  'buu_super': { id: 'buu_super', character: 'buu', form: 'Super Buu', hp: 450, str: 64, ki: 62, spd: 48, sheet: 'super-buu.png' },
  'buu_gotenks': { id: 'buu_gotenks', character: 'buu', form: 'Buu/Gotenks', hp: 500, str: 70, ki: 68, spd: 50, sheet: 'buu-gotenks.png' },
  'buu_gohan': { id: 'buu_gohan', character: 'buu', form: 'Buu/Gohan', hp: 550, str: 78, ki: 76, spd: 52, sheet: 'buu-gohan.png' },
  'buu_kid': { id: 'buu_kid', character: 'buu', form: 'Kid Buu', hp: 520, str: 76, ki: 74, spd: 60, sheet: 'kid-buu.png' },
};

// ─── Personajes (24) ──────────────────────────────────────

export const CHARACTERS: CharacterDef[] = [
  { id: 'goku', name: 'Goku', forms: ['goku_base', 'goku_ssj', 'goku_ssj2', 'goku_ssj3'], tier: 5, saga: 'Saiyan' },
  { id: 'vegeta', name: 'Vegeta', forms: ['vegeta_base', 'vegeta_ssj', 'vegeta_majin'], tier: 5, saga: 'Saiyan' },
  { id: 'gohan', name: 'Gohan', forms: ['gohan_young', 'gohan_young_ssj', 'gohan_young_ssj2', 'gohan_teen_ssj', 'gohan_ultimate'], tier: 5, saga: 'Cell' },
  { id: 'trunks', name: 'Trunks', forms: ['trunks_kid', 'trunks_future', 'trunks_ssj'], tier: 4, saga: 'Android' },
  { id: 'goten', name: 'Goten', forms: ['goten_base', 'goten_ssj'], tier: 3, saga: 'Buu' },
  { id: 'gotenks', name: 'Gotenks', forms: ['gotenks_ssj', 'gotenks_ssj3'], tier: 5, saga: 'Buu' },
  { id: 'piccolo', name: 'Piccolo', forms: ['piccolo_base', 'piccolo_kami'], tier: 4, saga: 'Saiyan' },
  { id: 'krillin', name: 'Krillin', forms: ['krillin_base'], tier: 2, saga: 'Saiyan' },
  { id: 'frieza', name: 'Frieza', forms: ['frieza_final', 'frieza_100'], tier: 5, saga: 'Namek' },
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
];

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
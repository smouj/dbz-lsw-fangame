// ═══════════════════════════════════════════════════════════
// DBZ LSW — Dirección de los sprites idle
// true = el sprite del sheet mira a la IZQUIERDA → voltear a la derecha
// Determinado por análisis de silueta (consenso + asimetría de cabeza)
// ═══════════════════════════════════════════════════════════

export const FLIP_TO_RIGHT: Record<string, boolean> = {
  'android-16': false,
  'android-17': false,
  'android-18': false,
  'android-19': false,
  'android-20-dr-gero': true,
  'burter': true,
  'buu': true,
  'buu-gohan': true,
  'buu-gotenks': true,
  'cell-imperfect-form': true,
  'cell-jr': false,
  'cell-perfect': true,
  'cell-semi-perfect-form': true,
  'frieza': true,
  'future-trunks': false,
  'ginyu': false,
  'ginyu-gokus-body': false,
  'gohan-super-saiyan-1-2': true,
  'gohan-ultimate': true,
  'goku': false,
  'goku-super-saiyan': true,
  'goku-super-saiyan-2': true,
  'goku-super-saiyan-3': true,
  'goten': false,
  'goten-super-saiyan': false,
  'gotenks-super-saiyan': true,
  'gotenks-super-saiyan-3': true,
  'guldo': false,
  'jeice': false,
  'kid-buu': true,
  'krillin': true,
  'nappa': false,
  'piccolo': true,
  'recoome': false,
  'super-buu': true,
  'trunks': true,
  'trunks-super-saiyan': false,
  'vegeta': false,
  'vegeta-super-saiyan-majin': true,
  'young-gohan': false,
  'young-gohan-super-saiyan': true,
  'young-gohan-super-saiyan-2': true,
};

export function needsFlip(sheet: string): boolean {
  // el mapa usa claves sin extensión (ej. 'piccolo'); sheet viene como 'piccolo.png'
  const key = sheet.replace(/\.png$/, '');
  return FLIP_TO_RIGHT[key] ?? false;
}
// ═══════════════════════════════════════════════════════════
// DBZ LSW — Sistema de desbloqueos (fiel al GBC)
// - Al empezar: elegir mazo inicial Damage o Beam (20 cartas)
// - Personajes: solo Goku al inicio; el resto se desbloquea
//   ganándoles en batalla o por retos de la historia
// - Cartas: las del mazo inicial + desbloqueos por nivel/victoria
// ═══════════════════════════════════════════════════════════

export const UNLOCK_KEY = '***';

// Mazos iniciales (como el GBC: orientado a Damage o a Beam)
// ⚠️ SOLO cartas genéricas (Users=48 en el CSV de ROM): los mazos iniciales
// deben ser usables por cualquier luchador de salida (Gohan/Piccolo).
// Las cartas de personaje (con `compatible`) se filtran al robar.
export const STARTER_DAMAGE_DECK = [1, 2, 3, 4, 5, 5, 6, 11, 29, 43, 41, 7, 8, 124, 121, 125, 88, 117, 119, 97];
export const STARTER_BEAM_DECK = [1, 2, 3, 4, 7, 7, 8, 20, 36, 5, 6, 11, 125, 124, 121, 88, 117, 97, 119, 118];

// Personajes iniciales del remake: el primer flujo jugable es Gohan vs Piccolo.
export const STARTER_CHARACTERS = ['gohan', 'piccolo'];

// Cartas que se desbloquean automáticamente por nivel (progresión)
// Cada nivel desbloquea un lote adicional
export function cardsForLevel(level: number): number[] {
  const lots: Record<number, number[]> = {
    2: [26, 27, 28, 53, 54, 56, 57],          // defensas + beams de apoyo
    3: [16, 79, 96, 97, 99, 100, 101],        // curaciones y soporte
    4: [21, 22, 24, 33, 36, 40, 44],          // beams potentes
    5: [17, 18, 20, 31, 48, 49, 50],          // beams variados
    6: [42, 51, 59, 68, 72, 73, 82],          // soporte y beams
    7: [13, 14, 41, 52, 55, 58, 60],          // specials y combos
    8: [61, 62, 64, 65, 66, 67, 69],          // beams/specials
    9: [70, 71, 74, 75, 76, 77, 78],          // androides/cell
    10: [80, 81, 83, 84, 85, 86, 87],         // buu + apoyo
    11: [89, 90, 91, 92, 93, 94, 95],         // apoyo mayor
    12: [98, 102, 103, 105, 106, 107, 108],   // ítems
    13: [109, 110, 111, 112, 113, 114, 115],  // ítems defensivos
    14: [116, 118, 119, 120, 121, 122, 123],  // técnicas finales
  };
  const unlocked: number[] = [];
  for (const lvl of Object.keys(lots).map(Number)) {
    if (level >= lvl) unlocked.push(...lots[lvl]);
  }
  return unlocked;
}

// Recompensa post-batalla: elegir 1 de 3 cartas aleatorias no desbloqueadas
export function pickRewards(owned: Set<number>, count = 3): number[] {
  const all = Array.from({ length: 125 }, (_, i) => i + 1);
  const available = all.filter(id => !owned.has(id));
  // barajar
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count);
}

// Personajes que se desbloquean al ganarles en Versus (como el GBC)
export const VS_UNLOCKS: Record<string, string> = {
  'vegeta_base': 'vegeta',
  'vegeta_majin': 'vegeta',
  'gohan_young': 'gohan',
  'gohan_teen_ssj2': 'gohan',
  'gohan_ultimate': 'gohan',
  'piccolo_base': 'piccolo',
  'piccolo_evil': 'piccolo',
  'krillin_base': 'krillin',
  'trunks_kid': 'trunks',
  'trunks_kid_ssj': 'trunks',
  'goten_base': 'goten',
  'gotenks_ssj': 'gotenks',
  'frieza_final': 'frieza',
  'cell_imperfect': 'cell',
  'cell_jr': 'cell_jr',
  'android_16': 'android_16',
  'android_17': 'android_17',
  'android_18': 'android_18',
  'android_19': 'android_19',
  'android_20': 'android_20',
  'ginyu': 'ginyu',
  'recoome': 'recoome',
  'guldo': 'guldo',
  'jeice': 'jeice',
  'burter': 'burter',
  'nappa': 'nappa',
  'buu_base': 'buu',
  'vegito_base': 'vegito',
};

// ═══════════════════════════════════════════════════════════
// Formas desbloqueables por nivel (fiel al GBC)
// Solo la forma base está disponible al inicio; el resto se
// desbloquea subiendo de nivel o ganando retos.
// ═══════════════════════════════════════════════════════════

// Forma base siempre disponible
// ⚠️ No es `${charId}_base` para todos: frieza→frieza_final, trunks→trunks_kid,
// gotenks→gotenks_ssj, cell→cell_imperfect, cell_jr→cell_jr, ginyu→ginyu,
// buu→buu_base, vegito→vegito_base. Mapeo explícito para evitar ids inexistentes.
export const BASE_FORM_BY_CHAR: Record<string, string> = {
  goku: 'goku_base', vegeta: 'vegeta_base', gohan: 'gohan_young',
  piccolo: 'piccolo_base', krillin: 'krillin_base', trunks: 'trunks_kid',
  goten: 'goten_base', gotenks: 'gotenks_ssj', frieza: 'frieza_final',
  cell: 'cell_imperfect', cell_jr: 'cell_jr', android_16: 'android_16',
  android_17: 'android_17', android_18: 'android_18', android_19: 'android_19',
  android_20: 'android_20', ginyu: 'ginyu', recoome: 'recoome', guldo: 'guldo',
  jeice: 'jeice', burter: 'burter', nappa: 'nappa', buu: 'buu_base',
  vegito: 'vegito_base',
};

export function baseFormId(charId: string): string {
  return BASE_FORM_BY_CHAR[charId] ?? `${charId}_base`;
}

// Desbloqueo de formas por nivel (id de forma → nivel mínimo)
export const FORM_UNLOCK_LEVELS: Record<string, number> = {
  // Goku
  'goku_ssj': 2, 'goku_ssj2': 4, 'goku_ssj3': 7,
  // Vegeta
  'vegeta_ssj': 3, 'vegeta_majin': 6,
  // Gohan
  'gohan_young_ssj': 2, 'gohan_young_ssj2': 4, 'gohan_teen_ssj': 5, 'gohan_teen_ssj2': 7, 'gohan_ultimate': 9,
  // Trunks
  'trunks_kid_ssj': 4, 'trunks_future': 3, 'trunks_ssj': 5,
  // Goten
  'goten_ssj': 4,
  // Gotenks
  'gotenks_ssj': 6, 'gotenks_ssj3': 10,
  // Piccolo
  'piccolo_kami': 4, 'piccolo_evil': 8,
  // Frieza
  // Cell
  'cell_semi': 6, 'cell_perfect': 8,
  // Buu
  'buu_super': 7, 'buu_gotenks': 9, 'buu_gohan': 11, 'buu_kid': 12,
  // Ginyu
  'ginyu_goku': 6,
  // Vegito (forma final)
  'vegito_base': 12,
};

// ¿Forma desbloqueada?
export function isFormUnlocked(formId: string, level: number): boolean {
  const minLevel = FORM_UNLOCK_LEVELS[formId];
  if (minLevel === undefined) return true; // forma base o sin requisito
  return level >= minLevel;
}

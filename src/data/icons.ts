// ═══════════════════════════════════════════════════════════
// DBZ LSW — Iconos de carta reales (Sprite Database)
// 54 iconos 32x24 + iconos anchos, extraídos de card-icons.png
// ═══════════════════════════════════════════════════════════

import { CardType } from './cards';

// Mapeo por id de carta → archivo de icono.
// El sheet original tiene 54 iconos de 32x24 en grid (6 cols × 9 rows)
// + iconos anchos (46-48x24) para cartas especiales.
// Los iconos son gráficos de acción (puños, haces, explosiones).
// ⚠️ Asignación por orden de extracción — verificar visualmente con
//    public/assets/cards/contact_sheet.png

export interface CardIconMapping {
  file: string;
  w: number;
  h: number;
}

// Iconos principales 32x24 (índice 0-53)
const MAIN_ICONS: string[] = [
  'cell_00_00.png', 'cell_00_03.png', 'cell_00_06.png', 'cell_00_10.png', 'cell_00_16.png', 'cell_00_19.png',
  'cell_01_00.png', 'cell_01_03.png', 'cell_01_06.png', 'cell_01_10.png', 'cell_01_16.png', 'cell_01_19.png',
  'cell_02_00.png', 'cell_02_03.png', 'cell_02_06.png', 'cell_02_10.png', 'cell_02_16.png', 'cell_02_19.png',
  'cell_03_00.png', 'cell_03_03.png', 'cell_03_06.png', 'cell_03_10.png', 'cell_03_16.png', 'cell_03_19.png',
  'cell_04_00.png', 'cell_04_03.png', 'cell_04_06.png', 'cell_04_10.png', 'cell_04_16.png', 'cell_04_19.png',
  'cell_05_00.png', 'cell_05_03.png', 'cell_05_06.png', 'cell_05_10.png', 'cell_05_16.png', 'cell_05_19.png',
  'cell_08_00.png', 'cell_08_03.png', 'cell_08_06.png', 'cell_08_10.png', 'cell_08_16.png', 'cell_08_19.png',
  'cell_09_00.png', 'cell_09_03.png', 'cell_09_06.png', 'cell_09_10.png', 'cell_09_16.png', 'cell_09_19.png',
  'cell_10_00.png', 'cell_10_03.png', 'cell_10_06.png', 'cell_10_10.png', 'cell_10_16.png', 'cell_10_19.png',
];

// Iconos anchos 46-48x24 (especiales, índice 54+)
const WIDE_ICONS: string[] = [
  'cell_00_22.png', 'cell_01_22.png', 'cell_02_22.png', 'cell_03_22.png', 'cell_04_22.png',
];

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Iconos de carta reales (Sprite Database Icons.png)
// 125 cartas mapeadas por TIPO (beam→icono haz, damage→golpe,...)
// Asignación por tipo en orden de la tabla ROM (0x044315)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// DBZ LSW — Iconos de carta (Sprite Database Icons.png)
// 125 cartas en orden EXACTO de la tabla ROM (0x044315)
// El sheet se lee por columnas: col0=cartas 1-20, col1=21-40...
// ═══════════════════════════════════════════════════════════

// Mapeo completo: id de carta → archivo de icono (orden ROM)
const CARD_ICON_MAP: Record<number, string> = {
  1: 'card_001.png',
  2: 'card_002.png',
  3: 'card_003.png',
  4: 'card_004.png',
  5: 'card_005.png',
  6: 'card_006.png',
  7: 'card_007.png',
  8: 'card_008.png',
  9: 'card_009.png',
  10: 'card_010.png',
  11: 'card_011.png',
  12: 'card_012.png',
  13: 'card_013.png',
  14: 'card_014.png',
  15: 'card_015.png',
  16: 'card_016.png',
  17: 'card_017.png',
  18: 'card_018.png',
  19: 'card_019.png',
  20: 'card_020.png',
  21: 'card_021.png',
  22: 'card_022.png',
  23: 'card_023.png',
  24: 'card_024.png',
  25: 'card_025.png',
  26: 'card_026.png',
  27: 'card_027.png',
  28: 'card_028.png',
  29: 'card_029.png',
  30: 'card_030.png',
  31: 'card_031.png',
  32: 'card_032.png',
  33: 'card_033.png',
  34: 'card_034.png',
  35: 'card_035.png',
  36: 'card_036.png',
  37: 'card_037.png',
  38: 'card_038.png',
  39: 'card_039.png',
  40: 'card_040.png',
  41: 'card_041.png',
  42: 'card_042.png',
  43: 'card_043.png',
  44: 'card_044.png',
  45: 'card_045.png',
  46: 'card_046.png',
  47: 'card_047.png',
  48: 'card_048.png',
  49: 'card_049.png',
  50: 'card_050.png',
  51: 'card_051.png',
  52: 'card_052.png',
  53: 'card_053.png',
  54: 'card_054.png',
  55: 'card_055.png',
  56: 'card_056.png',
  57: 'card_057.png',
  58: 'card_058.png',
  59: 'card_059.png',
  60: 'card_060.png',
  61: 'card_061.png',
  62: 'card_062.png',
  63: 'card_063.png',
  64: 'card_064.png',
  65: 'card_065.png',
  66: 'card_066.png',
  67: 'card_067.png',
  68: 'card_068.png',
  69: 'card_069.png',
  70: 'card_070.png',
  71: 'card_071.png',
  72: 'card_072.png',
  73: 'card_073.png',
  74: 'card_074.png',
  75: 'card_075.png',
  76: 'card_076.png',
  77: 'card_077.png',
  78: 'card_078.png',
  79: 'card_079.png',
  80: 'card_080.png',
  81: 'card_081.png',
  82: 'card_082.png',
  83: 'card_083.png',
  84: 'card_084.png',
  85: 'card_085.png',
  86: 'card_086.png',
  87: 'card_087.png',
  88: 'card_088.png',
  89: 'card_089.png',
  90: 'card_090.png',
  91: 'card_091.png',
  92: 'card_092.png',
  93: 'card_093.png',
  94: 'card_094.png',
  95: 'card_095.png',
  96: 'card_096.png',
  97: 'card_097.png',
  98: 'card_098.png',
  99: 'card_099.png',
  100: 'card_100.png',
  101: 'card_101.png',
  102: 'card_102.png',
  103: 'card_103.png',
  104: 'card_104.png',
  105: 'card_105.png',
  106: 'card_106.png',
  107: 'card_107.png',
  108: 'card_108.png',
  109: 'card_109.png',
  110: 'card_110.png',
  111: 'card_111.png',
  112: 'card_112.png',
  113: 'card_113.png',
  114: 'card_114.png',
  115: 'card_115.png',
  116: 'card_116.png',
  117: 'card_117.png',
  118: 'card_118.png',
  119: 'card_119.png',
  120: 'card_120.png',
  121: 'card_121.png',
  122: 'card_122.png',
  123: 'card_123.png',
  124: 'card_124.png',
  125: 'card_125.png',
};

export function cardIconFile(cardId: number): string | undefined {
  return CARD_ICON_MAP[cardId];
}

export function cardIconUrl(cardId: number): string | undefined {
  const file = CARD_ICON_MAP[cardId];
  return file ? `/assets/cards/icons/${file}` : undefined;
}

// Mini retratos de combate (Sprite Database mini-portraits.png)
// 19 celdas extraídas — asignación por personaje pendiente de verificación
export const MINI_PORTRAITS: Record<string, string> = {
  goku: '/assets/portraits/mini/cell_01_00.png',
  vegeta: '/assets/portraits/mini/cell_01_05.png',
  gohan: '/assets/portraits/mini/cell_01_10.png',
  piccolo: '/assets/portraits/mini/cell_01_24.png',
  krillin: '/assets/portraits/mini/cell_01_29.png',
  trunks: '/assets/portraits/mini/cell_02_00.png',
  goten: '/assets/portraits/mini/cell_02_05.png',
  gotenks: '/assets/portraits/mini/cell_02_10.png',
  frieza: '/assets/portraits/mini/cell_02_24.png',
  cell: '/assets/portraits/mini/cell_02_29.png',
  buu: '/assets/portraits/mini/cell_03_00.png',
  nappa: '/assets/portraits/mini/cell_03_05.png',
};

// Retratos de menú (Sprite Database LSW_Portraits.png)
// 131 celdas 40x56 — fuente primaria de retratos
export const MENU_PORTRAITS: Record<string, string> = {
  goku: '/assets/portraits/menu/cell_00_00.png',
  vegeta: '/assets/portraits/menu/cell_00_01.png',
  gohan: '/assets/portraits/menu/cell_00_02.png',
  piccolo: '/assets/portraits/menu/cell_00_03.png',
  krillin: '/assets/portraits/menu/cell_00_04.png',
  trunks: '/assets/portraits/menu/cell_00_05.png',
  goten: '/assets/portraits/menu/cell_00_06.png',
  gotenks: '/assets/portraits/menu/cell_00_07.png',
  frieza: '/assets/portraits/menu/cell_01_00.png',
  cell: '/assets/portraits/menu/cell_01_01.png',
  buu: '/assets/portraits/menu/cell_01_02.png',
  nappa: '/assets/portraits/menu/cell_01_03.png',
  ginyu: '/assets/portraits/menu/cell_01_04.png',
  recoome: '/assets/portraits/menu/cell_01_05.png',
  guldo: '/assets/portraits/menu/cell_01_06.png',
  jeice: '/assets/portraits/menu/cell_01_07.png',
  burter: '/assets/portraits/menu/cell_01_08.png',
  android_16: '/assets/portraits/menu/cell_02_00.png',
  android_17: '/assets/portraits/menu/cell_02_01.png',
  android_18: '/assets/portraits/menu/cell_03_00.png',
  android_19: '/assets/portraits/menu/cell_03_01.png',
  android_20: '/assets/portraits/menu/cell_03_02.png',
  cell_jr: '/assets/portraits/menu/cell_03_03.png',
};

// Fallback: mapa por tipo de carta → icono Lucide (si no hay icono real)
import { Zap, Sword, Sparkles, Heart, Shield, Star, Command, type LucideIcon } from 'lucide-react';

export const TYPE_ICONS: Record<CardType, LucideIcon> = {
  command: Command,
  damage: Sword,
  beam: Zap,
  support: Heart,
  defense: Shield,
  special: Star,
};

// Fallback emoji legacy (no se usa en UI nueva; se mantiene por compatibilidad)
export const TYPE_EMOJI: Record<CardType, string> = {
  command: '⚡',
  damage: '👊',
  beam: '💫',
  support: '💚',
  defense: '🛡',
  special: '⭐',
};
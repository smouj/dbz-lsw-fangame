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

// Mapeo por id de carta → icono
const CARD_ICON_MAP: Record<number, string> = {};

// Asignar: cartas 1-54 → MAIN_ICONS, cartas 55-59 → WIDE_ICONS
for (let i = 0; i < MAIN_ICONS.length; i++) {
  CARD_ICON_MAP[i + 1] = MAIN_ICONS[i];
}
for (let i = 0; i < WIDE_ICONS.length; i++) {
  CARD_ICON_MAP[55 + i] = WIDE_ICONS[i];
}

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
// ═══════════════════════════════════════════════════════════════════════
// romCardData.ts — GENERADO por scripts/generate-rom-card-data.ts
// Taxonomía de ejecución REAL extraída de la ROM (banco $11, tabla de 125
// cartas). NO editar a mano — regenerar tras reextraer la ROM.
// Ejecutar: npx tsx scripts/generate-rom-card-data.ts
// ═══════════════════════════════════════════════════════════════════════

export interface RomCardData {
  /** Selector de ejecución (byte 5 de la tabla ROM): familia real de la técnica. */
  exec: number;
  /** Actor AnimationResource (byte 6). 0xff = sin recurso de actor. */
  actorAnim: number;
  /** FX graphics resource (byte 7). 0xff = sin recurso FX. */
  fxGraphics: number;
  /** CGB palette id (byte 8). 0xff = sin paleta FX. */
  fxPalette: number;
  /** Máscara de compatibilidad 48-bit (bytes 9-14): bit N = forma N. */
  mask: string;
}

/** Normaliza un nombre de carta para lookup (minúsculas, sin símbolos). */
export function normalizeCardName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Mapa nombre-normalizado → datos ROM. Generado: 2026-08-22 */
export const ROM_CARD_DATA: Record<string, RomCardData> = {
  '3stageatk': { exec: 0, actorAnim: 255, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  '4stageatk': { exec: 0, actorAnim: 255, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  '5stageatk': { exec: 0, actorAnim: 255, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  '6stageatk': { exec: 0, actorAnim: 255, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  'afterimage': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'atomicbreak': { exec: 10, actorAnim: 50, fxGraphics: 255, fxPalette: 255, mask: '000000020000' },
  'attackno18': { exec: 10, actorAnim: 57, fxGraphics: 255, fxPalette: 255, mask: '000000000800' },
  'avoiding': { exec: 0, actorAnim: 255, fxGraphics: 4, fxPalette: 48, mask: 'ffffffffffff' },
  'babidi': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'barrier': { exec: 0, actorAnim: 36, fxGraphics: 4, fxPalette: 48, mask: '000000028403' },
  'bigbangatk': { exec: 5, actorAnim: 15, fxGraphics: 39, fxPalette: 45, mask: '003000020000' },
  'bodychange': { exec: 3, actorAnim: 32, fxGraphics: 81, fxPalette: 46, mask: '000000800000' },
  'breath': { exec: 0, actorAnim: 39, fxGraphics: 4, fxPalette: 255, mask: '00000010007c' },
  'btljacket': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 50, mask: 'ffffffffffff' },
  'bulma': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'burningatk': { exec: 4, actorAnim: 7, fxGraphics: 8, fxPalette: 44, mask: '000066000000' },
  'capsfridge': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'cellcombo': { exec: 10, actorAnim: 58, fxGraphics: 255, fxPalette: 255, mask: '00000000c001' },
  'chaiotzu': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'champbelt': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'contkick': { exec: 10, actorAnim: 45, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  'contpunch': { exec: 10, actorAnim: 44, fxGraphics: 255, fxPalette: 255, mask: 'ffffffffffff' },
  'crasherball': { exec: 7, actorAnim: 27, fxGraphics: 72, fxPalette: 47, mask: '000000200000' },
  'crasherbuu': { exec: 10, actorAnim: 60, fxGraphics: 255, fxPalette: 255, mask: '00000000007c' },
  'crazyrush': { exec: 10, actorAnim: 56, fxGraphics: 255, fxPalette: 255, mask: '000000000400' },
  'dabura': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 48, mask: 'ffffffffffff' },
  'daburaspear': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 49, mask: 'ffffffffffff' },
  'dende': { exec: 0, actorAnim: 255, fxGraphics: 8, fxPalette: 48, mask: 'ffffffffffff' },
  'destructdisk': { exec: 7, actorAnim: 18, fxGraphics: 48, fxPalette: 44, mask: '403800020100' },
  'dunkshot': { exec: 10, actorAnim: 46, fxGraphics: 255, fxPalette: 255, mask: '07c000000000' },
  'dynamipunch': { exec: 10, actorAnim: 54, fxGraphics: 255, fxPalette: 255, mask: '000000800080' },
  'endurance': { exec: 0, actorAnim: 255, fxGraphics: 6, fxPalette: 48, mask: 'ffffffffffff' },
  'eneabsorber': { exec: 15, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'energyabsorb': { exec: 0, actorAnim: 37, fxGraphics: 4, fxPalette: 255, mask: '000000003000' },
  'energybomb': { exec: 5, actorAnim: 12, fxGraphics: 23, fxPalette: 44, mask: 'ffffffffffff' },
  'energyslash': { exec: 5, actorAnim: 21, fxGraphics: 54, fxPalette: 45, mask: '000000003c00' },
  'energyslice': { exec: 7, actorAnim: 19, fxGraphics: 48, fxPalette: 45, mask: '000000000800' },
  'energywave': { exec: 2, actorAnim: 0, fxGraphics: 2, fxPalette: 44, mask: 'ffffffffffff' },
  'erasercan': { exec: 3, actorAnim: 10, fxGraphics: 20, fxPalette: 45, mask: '000000100000' },
  'eyebeam': { exec: 2, actorAnim: 2, fxGraphics: 2, fxPalette: 45, mask: '000000003200' },
  'feint': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'finalflash': { exec: 2, actorAnim: 9, fxGraphics: 20, fxPalette: 44, mask: '003000000000' },
  'finbuster': { exec: 5, actorAnim: 16, fxGraphics: 36, fxPalette: 44, mask: '000044000000' },
  'fingerbeam': { exec: 2, actorAnim: 1, fxGraphics: 2, fxPalette: 44, mask: '00000000c103' },
  'fkamehameha': { exec: 2, actorAnim: 3, fxGraphics: 17, fxPalette: 45, mask: '070000000000' },
  'flashpunch': { exec: 10, actorAnim: 49, fxGraphics: 255, fxPalette: 255, mask: '000060000000' },
  'flashsword': { exec: 2, actorAnim: 25, fxGraphics: 66, fxPalette: 45, mask: '000000020000' },
  'fleshguard': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 50, mask: '000000000004' },
  'flightbomb': { exec: 5, actorAnim: 17, fxGraphics: 45, fxPalette: 45, mask: '280000000000' },
  'foresight': { exec: 0, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'fullspirit': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'galacticad': { exec: 7, actorAnim: 24, fxGraphics: 63, fxPalette: 45, mask: '000080010030' },
  'galickho': { exec: 2, actorAnim: 5, fxGraphics: 14, fxPalette: 46, mask: '003800020000' },
  'gamebomb': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'grandwave': { exec: 5, actorAnim: 20, fxGraphics: 54, fxPalette: 44, mask: '000000000100' },
  'gravitydev': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 255, mask: 'ffffffffffff' },
  'guru': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 53, mask: 'ffffffffffff' },
  'heartmedi': { exec: 2, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'heartvirus': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'hellflash': { exec: 2, actorAnim: 11, fxGraphics: 17, fxPalette: 45, mask: '000000000200' },
  'hercule': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'hschoco': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'kaio': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 255, mask: 'ffffffffffff' },
  'kaioken': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 45, mask: '800000000000' },
  'kamehameha': { exec: 2, actorAnim: 3, fxGraphics: 5, fxPalette: 44, mask: 'c7c78103c07f' },
  'kamekameha': { exec: 2, actorAnim: 3, fxGraphics: 5, fxPalette: 44, mask: '000018000000' },
  'kiai': { exec: 13, actorAnim: 64, fxGraphics: 1, fxPalette: 44, mask: '000000010078' },
  'kibito': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 53, mask: 'ffffffffffff' },
  'kiblastbomb': { exec: 5, actorAnim: 14, fxGraphics: 33, fxPalette: 45, mask: '000000040000' },
  'lifeabsorb': { exec: 10, actorAnim: 62, fxGraphics: 255, fxPalette: 255, mask: '000000003000' },
  'lifepreser': { exec: 0, actorAnim: 255, fxGraphics: 8, fxPalette: 48, mask: 'ffffffffffff' },
  'lightningc': { exec: 2, actorAnim: 6, fxGraphics: 14, fxPalette: 45, mask: '000000040000' },
  'lightvest': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 51, mask: 'ffffffffffff' },
  'lockon': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: '000000003e00' },
  'machattack': { exec: 10, actorAnim: 53, fxGraphics: 255, fxPalette: 255, mask: '000000400000' },
  'masenko': { exec: 2, actorAnim: 4, fxGraphics: 8, fxPalette: 45, mask: '3fc007000000' },
  'medicalmac': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'mistykiwave': { exec: 2, actorAnim: 8, fxGraphics: 5, fxPalette: 45, mask: '400000000000' },
  'msoundwave': { exec: 5, actorAnim: 23, fxGraphics: 60, fxPalette: 44, mask: '000000080000' },
  'naughtybook': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 48, mask: 'ffffffffffff' },
  'newbjacket': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 50, mask: 'ffffffffffff' },
  'nslasher': { exec: 10, actorAnim: 51, fxGraphics: 255, fxPalette: 255, mask: '000000040000' },
  'paralysis': { exec: 13, actorAnim: 41, fxGraphics: 1, fxPalette: 255, mask: '000000080000' },
  'pcometz': { exec: 14, actorAnim: 28, fxGraphics: 111, fxPalette: 46, mask: '000000600000' },
  'potbellyatk': { exec: 6, actorAnim: 31, fxGraphics: 78, fxPalette: 47, mask: '000000000004' },
  'purplecomet': { exec: 13, actorAnim: 28, fxGraphics: 39, fxPalette: 44, mask: '000000600000' },
  'readingki': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'resurrection': { exec: 0, actorAnim: 255, fxGraphics: 8, fxPalette: 48, mask: '38000000c07f' },
  'rfbatk': { exec: 10, actorAnim: 52, fxGraphics: 255, fxPalette: 255, mask: '000000100000' },
  'risingkick': { exec: 10, actorAnim: 48, fxGraphics: 255, fxPalette: 255, mask: '000006000000' },
  'rocketpunch': { exec: 5, actorAnim: 29, fxGraphics: 75, fxPalette: 45, mask: '000000000200' },
  'sandglass': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'sbeamcan': { exec: 2, actorAnim: 22, fxGraphics: 57, fxPalette: 45, mask: '38000000c003' },
  'scouter': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'sdashelbow': { exec: 10, actorAnim: 55, fxGraphics: 255, fxPalette: 255, mask: '000000000100' },
  'sdestrucd': { exec: 7, actorAnim: 18, fxGraphics: 51, fxPalette: 46, mask: '400000000000' },
  'sealedball': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'sgkatk': { exec: 5, actorAnim: 35, fxGraphics: 99, fxPalette: 44, mask: '000080010030' },
  'shockwave': { exec: 0, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'skamehameha': { exec: 2, actorAnim: 3, fxGraphics: 17, fxPalette: 44, mask: '86c79103c0e3' },
  'solidshot': { exec: 10, actorAnim: 47, fxGraphics: 255, fxPalette: 255, mask: '800700000000' },
  'sonickick': { exec: 10, actorAnim: 61, fxGraphics: 255, fxPalette: 255, mask: '380000000000' },
  'specialcard': { exec: 0, actorAnim: 255, fxGraphics: 255, fxPalette: 255, mask: '000000000000' },
  'speedup': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 51, mask: '000000400000' },
  'spiritbomb': { exec: 7, actorAnim: 34, fxGraphics: 90, fxPalette: 44, mask: '800700000000' },
  'stepupatk': { exec: 10, actorAnim: 59, fxGraphics: 255, fxPalette: 255, mask: '000000000002' },
  'stopdevice': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 48, mask: 'ffffffffc1ff' },
  'suicide': { exec: 8, actorAnim: 43, fxGraphics: 255, fxPalette: 255, mask: '002000000000' },
  'sunglasses': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 48, mask: 'ffffffffffff' },
  'supereball': { exec: 7, actorAnim: 33, fxGraphics: 84, fxPalette: 45, mask: '000000003d7c' },
  'supremekai': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 255, mask: 'ffffffffffff' },
  'supsaiyan2': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 53, mask: '00f704020000' },
  'supsaiyan3': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 53, mask: '00f704020000' },
  'sweetbeam': { exec: 2, actorAnim: 30, fxGraphics: 69, fxPalette: 47, mask: '00000000007c' },
  'tail': { exec: 11, actorAnim: 63, fxGraphics: 255, fxPalette: 255, mask: '070000000000' },
  'taiyoken': { exec: 0, actorAnim: 38, fxGraphics: 2, fxPalette: 255, mask: 'c0070002c083' },
  'telekinesis': { exec: 3, actorAnim: 26, fxGraphics: 69, fxPalette: 45, mask: '000000080000' },
  'telepathy': { exec: 0, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
  'teleport': { exec: 0, actorAnim: 40, fxGraphics: 4, fxPalette: 255, mask: '000700020001' },
  'tien': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'timefreeze': { exec: 0, actorAnim: 42, fxGraphics: 1, fxPalette: 255, mask: '000000080000' },
  'trunkssword': { exec: 2, actorAnim: 255, fxGraphics: 2, fxPalette: 49, mask: 'ffffffffffff' },
  'vballcrash': { exec: 12, actorAnim: 65, fxGraphics: 108, fxPalette: 44, mask: '000000010000' },
  'yajirobe': { exec: 11, actorAnim: 255, fxGraphics: 4, fxPalette: 255, mask: 'ffffffffffff' },
  'yakon': { exec: 13, actorAnim: 255, fxGraphics: 1, fxPalette: 48, mask: 'ffffffffffff' },
};

/** Busca los datos ROM de una carta por nombre (undefined si no está). */
export function romCardData(name: string): RomCardData | undefined {
  return ROM_CARD_DATA[normalizeCardName(name)];
}

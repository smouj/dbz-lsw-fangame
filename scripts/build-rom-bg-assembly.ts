// ═══════════════════════════════════════════════════════════════════════
// P0.4R — build:rom-bg-assembly
// ═══════════════════════════════════════════════════════════════════════
// Exporta el ensamblado BG ROM ($19/$1A) a:
//   · public/assets/rom-bg/bg<res>-p<pal>.png   (composición física)
//   · src/data/generated/romBgAssembly.generated.ts (SSOT runtime)
//
// Las paletas se derivan del CARD TABLE ROM (category + handler), nunca del
// nombre de carta. $1A usa las paletas CC15 $31 (CHARA) / $33 (Gather),
// escritas por la ROM (no card-derived).
//
// Requiere la ROM (fuera del repo). Producto: assets ignorados + SSOT commit.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { PNG } from 'pngjs';
import {
  ROM_BG_ASSEMBLY_SPECS,
  decodeCgbPaletteRgba,
  decodeCgbPaletteWords,
  decodeRomBgAssembly,
  decodeRomBgAssemblyIndices,
  decodeRomBgAssemblyRgba,
  type RomBgAssemblyProgram,
  type RomBgResource,
} from '../src/battle/romDisplay/romBgAssemblyDecode';

const ROOT = process.cwd();
const ROM_PATH = process.env.ROM_PATH ?? resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
if (!existsSync(ROM_PATH)) {
  console.log(`SKIP: ROM no presente en ${ROM_PATH} (rom-local)`);
  process.exit(0);
}
const rom = readFileSync(ROM_PATH);

const OUT_DIR = resolve(ROOT, 'public/assets/rom-bg');
const GENERATED = resolve(ROOT, 'src/data/generated/romBgAssembly.generated.ts');

// ── Card table (Bank11:$4320, 16 bytes/card) → paletas de Support común ──
function romOffset(bank: number, address: number): number {
  return bank * 0x4000 + (address - (bank === 0 ? 0 : 0x4000));
}
const CARD_TABLE = romOffset(0x11, 0x4320);
function cardRecord(cardId: number): { category: number; handler: number; palette: number } {
  const p = CARD_TABLE + (cardId - 1) * 16;
  return { category: rom[p], handler: rom[p + 5], palette: rom[p + 8] };
}
const supportCommonPalettes = new Set<number>();
for (let cardId = 1; cardId <= 125; cardId++) {
  const r = cardRecord(cardId);
  if (r.category === 4 && (r.handler === 0x00 || r.handler === 0x02)) supportCommonPalettes.add(r.palette);
}

const PALETTES: Record<RomBgResource, number[]> = {
  0x19: [...supportCommonPalettes].sort((a, b) => a - b),
  0x1a: [0x31, 0x33], // CC15 $31 CHARA / $33 Gather (ROM writes)
};

interface ImageEntry {
  resource: RomBgResource;
  palette: number;
  paletteHex: string;
  file: string;
  width: number;
  height: number;
  sha256: string;
}
const images: ImageEntry[] = [];
mkdirSync(OUT_DIR, { recursive: true });

for (const resource of [0x19, 0x1a] as RomBgResource[]) {
  const program = decodeRomBgAssembly(ROM_BG_ASSEMBLY_SPECS[resource], rom);
  for (const palette of PALETTES[resource]) {
    const rgba = decodeRomBgAssemblyRgba(program, rom, decodeCgbPaletteRgba(rom, palette), true);
    const png = new PNG({ width: program.widthPx, height: program.heightPx });
    png.data = Buffer.from(rgba);
    const buffer = PNG.sync.write(png);
    const file = `bg${resource.toString(16)}-p${palette.toString(16).padStart(2, '0')}.png`;
    writeFileSync(resolve(OUT_DIR, file), buffer);
    images.push({
      resource,
      palette,
      paletteHex: `$${palette.toString(16).padStart(2, '0').toUpperCase()}`,
      file,
      width: program.widthPx,
      height: program.heightPx,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    });
  }
  console.log(`ROM BG $${resource.toString(16)}: ${program.tileCount} tiles · ${program.widthPx}x${program.heightPx} · paletas ${PALETTES[resource].map(p => `$${p.toString(16)}`).join(' ')}`);
}

function programLiteral(program: RomBgAssemblyProgram): string {
  const cells = program.cells
    .map(c => `{ row:${c.row}, col:${c.col}, attr:0x${c.attr.toString(16)}, tileId:0x${c.tileId.toString(16)}, tileIndex:${c.tileIndex}, flipX:${c.flipX}, flipY:${c.flipY} }`)
    .join(', ');
  return `{
    resource: 0x${program.resource.toString(16)},
    descriptorOffset: 0x${program.descriptorOffset.toString(16)},
    rowTableOffset: 0x${program.rowTableOffset.toString(16)},
    rows: ${program.rows},
    cols: ${program.cols},
    widthPx: ${program.widthPx},
    heightPx: ${program.heightPx},
    bgRowStart: ${program.bgRowStart},
    bgCol: ${program.bgCol},
    paletteSlot: ${program.paletteSlot},
    tileCount: ${program.tileCount},
    evidence: 'ROM_BG_FORMAT_VERIFIED',
    cells: [${cells}],
  }`;
}

const programs = [decodeRomBgAssembly(ROM_BG_ASSEMBLY_SPECS[0x19], rom), decodeRomBgAssembly(ROM_BG_ASSEMBLY_SPECS[0x1a], rom)];

// ── Mapas de índices (0..3) + paletas BGR555: permiten re-colorear por paso de
// transición de paleta ROM sin volver a leer la ROM. ──
const indexMaps = programs.map(program => ({
  resource: program.resource,
  width: program.widthPx,
  height: program.heightPx,
  base64: Buffer.from(decodeRomBgAssemblyIndices(program, rom)).toString('base64'),
}));
const allPalettes = [...new Set([...PALETTES[0x19], ...PALETTES[0x1a]])].sort((a, b) => a - b);
const paletteWords: Array<{ palette: number; words: number[] }> = allPalettes.map(palette => ({
  palette,
  words: decodeCgbPaletteWords(rom, palette),
}));
const content = `// ═══════════════════════════════════════════════════════════════════════
// GENERADO por scripts/build-rom-bg-assembly.ts — NO editar a mano.
// Fuente: ROM (Bank68:$7A0C/$7B10 + Bank03:$6834/$688F).
// Evidencia: ROM_BG_FORMAT_VERIFIED (research V5) + reproducción píxel-exacta
// de los samples ROM (verify:rom-bg-assembly).
// ═══════════════════════════════════════════════════════════════════════
import type { RomBgAssemblyProgram } from '../../battle/romDisplay/romBgAssemblyDecode';

export const ROM_BG_ASSEMBLY_PROGRAMS: readonly RomBgAssemblyProgram[] = [
  ${programs.map(programLiteral).join(',\n  ')},
];

export interface RomBgAssemblyImage {
  resource: number;
  palette: number;
  paletteHex: string;
  file: string;
  url: string;
  width: number;
  height: number;
  sha256: string;
}

export const ROM_BG_ASSEMBLY_IMAGES: readonly RomBgAssemblyImage[] = [
${images.map(i => `  { resource: 0x${i.resource.toString(16)}, palette: 0x${i.palette.toString(16)}, paletteHex: '${i.paletteHex}', file: '${i.file}', url: '/assets/rom-bg/${i.file}', width: ${i.width}, height: ${i.height}, sha256: '${i.sha256}' },`).join('\n')}
];

/** Programa ROM para un recurso BG ($19/$1A). */
export function romBgAssemblyProgram(resource: number): RomBgAssemblyProgram | null {
  return ROM_BG_ASSEMBLY_PROGRAMS.find(p => p.resource === resource) ?? null;
}

/** Mapa de índices de paleta (0..3) por recurso, para re-colorear por paso. */
export const ROM_BG_ASSEMBLY_INDEX_MAPS: readonly { resource: number; width: number; height: number; base64: string }[] = [
${indexMaps.map(m => `  { resource: 0x${m.resource.toString(16)}, width: ${m.width}, height: ${m.height}, base64: '${m.base64}' },`).join('\n')}
];

/** Paletas físicas CGB (4 words BGR555) usadas por los BG ROM. */
export const ROM_BG_ASSEMBLY_PALETTES: readonly { palette: number; words: readonly number[] }[] = [
${paletteWords.map(p => `  { palette: 0x${p.palette.toString(16)}, words: [${p.words.map(w => `0x${w.toString(16)}`).join(', ')}] },`).join('\n')}
];

/** Mapa de índices de un recurso, o null si no está demostrado. */
export function romBgAssemblyIndexMap(resource: number): { width: number; height: number; indices: Uint8Array } | null {
  const entry = ROM_BG_ASSEMBLY_INDEX_MAPS.find(m => m.resource === resource);
  if (!entry) return null;
  return { width: entry.width, height: entry.height, indices: Uint8Array.from(Buffer.from(entry.base64, 'base64')) };
}

/** Words BGR555 de una paleta física, o null. */
export function romBgAssemblyPaletteWords(palette: number): readonly number[] | null {
  return ROM_BG_ASSEMBLY_PALETTES.find(p => p.palette === palette)?.words ?? null;
}

/**
 * Imagen física ROM para (recurso, índice de paleta). Devuelve null si la
 * combinación no está demostrada: NUNCA sustituye por otro fondo.
 */
export function romBgAssemblyImage(resource: number, paletteIndex: number): RomBgAssemblyImage | null {
  return ROM_BG_ASSEMBLY_IMAGES.find(i => i.resource === resource && i.palette === paletteIndex) ?? null;
}
`;
mkdirSync(dirname(GENERATED), { recursive: true });
writeFileSync(GENERATED, content);
console.log(`ROM BG: ${images.length} imágenes → ${OUT_DIR}`);
console.log(`ROM BG: SSOT → ${GENERATED}`);

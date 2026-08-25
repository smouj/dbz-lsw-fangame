// ═══════════════════════════════════════════════════════════════════════
// GENERADOR: tabla física CGB de paletas ROM.
//
// Fuente canónica:
//   ROM España SHA-256 bd1df5d6... (CRC32 9DAD6E23)
//   Bank30:$6E00 + index*8
//   256 entradas × 8 bytes = 2048 bytes
//
// Importante:
// - Bank30:$6E00 es una dirección CPU banked. El offset de archivo es
//   bank*$4000 + (cpuAddress-$4000), no bank*$4000 + cpuAddress.
// - No se filtra 0000 ni FFFF. La tabla física maestra conserva bytes.
// - ROM_FIGHTER_PALETTES queda como vista compat derivada de las 64 primeras
//   entradas; la SSOT es ROM_CGB_PALETTE_TABLE.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { CARDS } from '../src/data/cards';
import { normalizeCardName, ROM_CARD_DATA } from '../src/data/romCardData';

const EXPECTED_SHA = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
const EXPECTED_SIZE = 2_097_152;
const ROM_REL = '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc';
const ROM_BANK = 0x30;
const TABLE_CPU = 0x6e00;
const ENTRY_SIZE = 8;
const ENTRY_COUNT = 0x100;
const FIGHTER_PROFILE_COUNT = 0x40;

interface FormProfile {
  formId: string;
  characterId?: string;
  romFormId?: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
}

function hex(value: number, width: number): string {
  return `0x${value.toString(16).padStart(width, '0')}`;
}

function bareHex(value: number, width: number): string {
  return value.toString(16).padStart(width, '0');
}

function bankedOffset(bank: number, cpuAddress: number): number {
  if (cpuAddress < 0x4000 || cpuAddress > 0x7fff) {
    throw new Error(`Invalid banked CPU address ${hex(cpuAddress, 4)}`);
  }
  return bank * 0x4000 + (cpuAddress - 0x4000);
}

function bgr555ToRgbRaw(word: number): [number, number, number] {
  const r5 = word & 0x1f;
  const g5 = (word >> 5) & 0x1f;
  const b5 = (word >> 10) & 0x1f;
  return [
    (r5 << 3) | (r5 >> 2),
    (g5 << 3) | (g5 >> 2),
    (b5 << 3) | (b5 >> 2),
  ];
}

function rgbHex(rgb: [number, number, number]): string {
  return `#${rgb.map(v => bareHex(v, 2)).join('')}`.toUpperCase();
}

function csvEscape(value: unknown): string {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(path: string, rows: Record<string, unknown>[]): void {
  const headers = Object.keys(rows[0] ?? {});
  const body = [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
  writeFileSync(path, `${body}\n`);
}

const root = process.cwd();
const romPath = resolve(root, ROM_REL);
const rom = readFileSync(romPath);
const romSha256 = createHash('sha256').update(rom).digest('hex');
if (romSha256 !== EXPECTED_SHA) {
  throw new Error(`Unexpected ROM SHA-256: ${romSha256}`);
}
if (rom.length !== EXPECTED_SIZE) {
  throw new Error(`Unexpected ROM size: ${rom.length}`);
}

const paletteTable = Array.from({ length: ENTRY_COUNT }, (_, index) => {
  const cpuAddress = TABLE_CPU + index * ENTRY_SIZE;
  const fileOffset = bankedOffset(ROM_BANK, cpuAddress);
  const rawBytes = Array.from(rom.subarray(fileOffset, fileOffset + ENTRY_SIZE));
  if (rawBytes.length !== ENTRY_SIZE) throw new Error(`Short palette entry ${hex(index, 2)}`);
  const bgr555 = [
    rawBytes[0] | (rawBytes[1] << 8),
    rawBytes[2] | (rawBytes[3] << 8),
    rawBytes[4] | (rawBytes[5] << 8),
    rawBytes[6] | (rawBytes[7] << 8),
  ] as [number, number, number, number];
  const rgbRaw = bgr555.map(bgr555ToRgbRaw) as [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  const hexRaw = rgbRaw.map(rgbHex) as [string, string, string, string];
  return {
    index,
    indexHex: hex(index, 2),
    romBank: ROM_BANK,
    cpuAddress,
    cpuAddressHex: hex(cpuAddress, 4),
    fileOffset,
    fileOffsetHex: hex(fileOffset, 5),
    rawBytes,
    rawBytesHex: rawBytes.map(byte => bareHex(byte, 2)),
    bgr555,
    bgr555Hex: bgr555.map(word => bareHex(word, 4)),
    rgbRaw,
    hexRaw,
    rawSha256: createHash('sha256').update(Buffer.from(rawBytes)).digest('hex'),
    evidence: 'ROM_STATIC_VERIFIED' as const,
  };
});

const profiles = JSON.parse(readFileSync(resolve(root, 'docs/rom/generated/sprite-mapping/rom-form-profiles.json'), 'utf8')) as FormProfile[];
const fighterBindings = profiles.map(profile => {
  const palette = paletteTable[profile.actorVisualProfileKey];
  return {
    formId: profile.formId,
    characterId: profile.characterId ?? profile.formId.split('_')[0],
    romFormId: profile.romFormId ?? null,
    actorVisualProfileKey: profile.actorVisualProfileKey,
    actorVisualProfileKeyHex: hex(profile.actorVisualProfileKey, 2),
    graphicsBank: profile.graphicsBank,
    graphicsBankHex: hex(profile.graphicsBank, 2),
    expectedGraphicsBank: 0x31 + profile.actorVisualProfileKey,
    paletteIndex: profile.actorVisualProfileKey,
    paletteIndexHex: hex(profile.actorVisualProfileKey, 2),
    paletteCpuAddress: palette.cpuAddress,
    paletteCpuAddressHex: palette.cpuAddressHex,
    paletteFileOffset: palette.fileOffset,
    paletteFileOffsetHex: palette.fileOffsetHex,
    paletteRawSha256: palette.rawSha256,
    evidence: 'ROM_STATIC_VERIFIED' as const,
  };
});

const offensiveFxBindings = CARDS
  .filter(card => card.type === 'beam')
  .map(card => {
    const romCard = ROM_CARD_DATA[normalizeCardName(card.name)];
    if (!romCard) throw new Error(`Missing ROM card data for ${card.name}`);
    const palette = paletteTable[romCard.fxPalette];
    return {
      cardId: card.id,
      name: card.name,
      type: card.type,
      handler: romCard.exec,
      handlerHex: hex(romCard.exec, 2),
      animationResource: romCard.actorAnim,
      animationResourceHex: hex(romCard.actorAnim, 2),
      fxResource: romCard.fxGraphics,
      fxResourceHex: hex(romCard.fxGraphics, 2),
      paletteIndex: romCard.fxPalette,
      paletteIndexHex: hex(romCard.fxPalette, 2),
      paletteCpuAddress: palette.cpuAddress,
      paletteCpuAddressHex: palette.cpuAddressHex,
      paletteFileOffset: palette.fileOffset,
      paletteFileOffsetHex: palette.fileOffsetHex,
      paletteRawSha256: palette.rawSha256,
      compatMask: romCard.mask,
      evidence: 'ROM_CARD_TABLE_VERIFIED' as const,
    };
  });

const generatedDir = resolve(root, 'src/data/generated');
const docsDir = resolve(root, 'docs/rom/generated/palettes');
mkdirSync(generatedDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

const fighterPaletteCompat = paletteTable.slice(0, FIGHTER_PROFILE_COUNT).map(entry => ({
  key: entry.index,
  keyHex: entry.indexHex,
  romBank: entry.romBank,
  cpuAddress: entry.cpuAddress,
  cpuAddressHex: entry.cpuAddressHex,
  fileOffset: entry.fileOffset,
  fileOffsetHex: entry.fileOffsetHex,
  raw: entry.rawBytes,
  rawBytes: entry.rawBytes,
  bgr555: entry.bgr555Hex,
  bgr555Words: entry.bgr555,
  colors: entry.hexRaw,
  hexRaw: entry.hexRaw,
  rawSha256: entry.rawSha256,
  evidence: entry.evidence,
}));

writeFileSync(resolve(generatedDir, 'romCgbPaletteTable.generated.ts'), `// Auto-generated by scripts/generate-rom-fighter-palettes.ts
// SSOT: ROM España Bank30:$6E00, 256 entries x 8 bytes. Do not edit by hand.

export interface RomCgbPaletteEntry {
  index: number;
  indexHex: string;
  romBank: number;
  cpuAddress: number;
  cpuAddressHex: string;
  fileOffset: number;
  fileOffsetHex: string;
  rawBytes: [number, number, number, number, number, number, number, number];
  rawBytesHex: string[];
  bgr555: [number, number, number, number];
  bgr555Hex: string[];
  rgbRaw: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  hexRaw: [string, string, string, string];
  rawSha256: string;
  evidence: 'ROM_STATIC_VERIFIED';
}

export const ROM_CGB_PALETTE_TABLE_META = ${JSON.stringify({
  source: 'ROM_CGB_PALETTE_TABLE',
  romSha256,
  romSize: rom.length,
  romBank: ROM_BANK,
  tableCpuAddress: TABLE_CPU,
  tableCpuAddressHex: hex(TABLE_CPU, 4),
  tableFileOffset: bankedOffset(ROM_BANK, TABLE_CPU),
  tableFileOffsetHex: hex(bankedOffset(ROM_BANK, TABLE_CPU), 5),
  entrySize: ENTRY_SIZE,
  entryCount: ENTRY_COUNT,
  totalBytes: ENTRY_SIZE * ENTRY_COUNT,
  offsetFormula: 'bank*0x4000 + (cpuAddress-0x4000)',
  filteredEntries: 0,
}, null, 2)} as const;

export const ROM_CGB_PALETTE_TABLE: RomCgbPaletteEntry[] = ${JSON.stringify(paletteTable, null, 2)};
`);

writeFileSync(resolve(generatedDir, 'romFighterPaletteBindings.generated.ts'), `// Auto-generated by scripts/generate-rom-fighter-palettes.ts
// 48 form -> actorVisualProfileKey -> ROM_CGB_PALETTE_TABLE[index].
// Do not edit by hand.

export const ROM_FIGHTER_PALETTE_BINDINGS = ${JSON.stringify(fighterBindings, null, 2)} as const;
`);

writeFileSync(resolve(generatedDir, 'romOffensiveFxPaletteBindings.generated.ts'), `// Auto-generated by scripts/generate-rom-fighter-palettes.ts
// Beam card -> FX resource -> ROM_CGB_PALETTE_TABLE[fxPalette].
// Do not edit by hand.

export const ROM_OFFENSIVE_FX_PALETTE_BINDINGS = ${JSON.stringify(offensiveFxBindings, null, 2)} as const;
`);

writeFileSync(resolve(generatedDir, 'romFighterPalettes.generated.ts'), `// Auto-generated by scripts/generate-rom-fighter-palettes.ts
// Compatibility view only. The SSOT is ROM_CGB_PALETTE_TABLE.
// Do not edit by hand.

export interface RomFighterPalette {
  key: number;
  keyHex: string;
  romBank: number;
  cpuAddress: number;
  cpuAddressHex: string;
  fileOffset: number;
  fileOffsetHex: string;
  raw: number[];
  rawBytes: number[];
  bgr555: string[];
  bgr555Words: number[];
  colors: string[];
  hexRaw: string[];
  rawSha256: string;
  evidence: 'ROM_STATIC_VERIFIED';
}

export const ROM_FIGHTER_PALETTES: RomFighterPalette[] = ${JSON.stringify(fighterPaletteCompat, null, 2)};
`);

writeFileSync(resolve(docsDir, 'rom_cgb_palette_table.json'), `${JSON.stringify({
  meta: {
    romSha256,
    romSize: rom.length,
    romBank: ROM_BANK,
    tableCpuAddress: TABLE_CPU,
    tableFileOffset: bankedOffset(ROM_BANK, TABLE_CPU),
    entrySize: ENTRY_SIZE,
    entryCount: ENTRY_COUNT,
    totalBytes: ENTRY_SIZE * ENTRY_COUNT,
    filteredEntries: 0,
  },
  entries: paletteTable,
}, null, 2)}\n`);
writeFileSync(resolve(docsDir, 'fighter_palette_bindings_48.json'), `${JSON.stringify(fighterBindings, null, 2)}\n`);
writeFileSync(resolve(docsDir, 'offensive_fx_palette_bindings.json'), `${JSON.stringify(offensiveFxBindings, null, 2)}\n`);

writeCsv(resolve(docsDir, 'rom_cgb_palette_table.csv'), paletteTable.map(entry => ({
  index: entry.indexHex,
  romBank: hex(entry.romBank, 2),
  cpuAddress: entry.cpuAddressHex,
  fileOffset: entry.fileOffsetHex,
  rawBytes: entry.rawBytesHex,
  bgr555: entry.bgr555Hex,
  rgbRaw: entry.hexRaw,
  rawSha256: entry.rawSha256,
})));
writeCsv(resolve(docsDir, 'fighter_palette_bindings_48.csv'), fighterBindings);
writeCsv(resolve(docsDir, 'offensive_fx_palette_bindings.csv'), offensiveFxBindings);

const sampleIndices = [0x00, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x35, 0xff];
const sampleRows = sampleIndices.map(index => {
  const entry = paletteTable[index];
  return `| ${entry.indexHex} | ${entry.cpuAddressHex} | ${entry.fileOffsetHex} | ${entry.rawBytesHex.join(' ')} | ${entry.bgr555Hex.join(' ')} | ${entry.hexRaw.join(' ')} |`;
}).join('\n');

writeFileSync(resolve(docsDir, 'PALETTE_EXTRACTION_REPORT.md'), `# ROM CGB Palette Extraction Report

Source: ROM España \`${romSha256}\`

## Contract

- Bank: \`$30\`
- Table CPU address: \`$6E00\`
- File offset formula: \`bank*0x4000 + (cpuAddress-0x4000)\`
- Entries: \`256/256\`
- Bytes: \`2048/2048\`
- Filtered all-00/all-FF entries: \`0\`

## Cross-checks

| index | CPU | file offset | raw bytes | BGR555 | RGB raw |
| --- | ---: | ---: | --- | --- | --- |
${sampleRows}

## Generated Outputs

- \`src/data/generated/romCgbPaletteTable.generated.ts\`
- \`src/data/generated/romFighterPaletteBindings.generated.ts\`
- \`src/data/generated/romOffensiveFxPaletteBindings.generated.ts\`
- \`src/data/generated/romFighterPalettes.generated.ts\` compatibility view
- \`docs/rom/generated/palettes/rom_cgb_palette_table.csv/json\`
- \`docs/rom/generated/palettes/fighter_palette_bindings_48.csv/json\`
- \`docs/rom/generated/palettes/offensive_fx_palette_bindings.csv/json\`

## Binding Summary

- Fighter form palette bindings: \`${fighterBindings.length}/48\`
- Offensive beam FX palette bindings: \`${offensiveFxBindings.length}/${CARDS.filter(card => card.type === 'beam').length}\`
- Manual palette overrides: \`0\`
- Non-ROM palette derivations: \`0\`
`);

console.log(`ROM CGB palette table: ${paletteTable.length}/256 entries, ${ENTRY_SIZE * ENTRY_COUNT} bytes`);
console.log(`Fighter palette bindings: ${fighterBindings.length}/48`);
console.log(`Offensive FX palette bindings: ${offensiveFxBindings.length}/${CARDS.filter(card => card.type === 'beam').length}`);
console.log(`Sample $2C raw: ${paletteTable[0x2c].rawBytesHex.join(' ')} @ ${paletteTable[0x2c].fileOffsetHex}`);

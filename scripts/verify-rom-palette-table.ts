// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM CGB palette table verifier.
// La tabla física de paletas es byte-level: Bank30:$6E00, 256×8 bytes.
// Este verificador falla si reaparece el offset CPU mal convertido, si se
// filtran filas 00/FF, o si Fighter/FX dejan de referenciar la SSOT.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CARDS } from '../src/data/cards';
import { ROM_CGB_PALETTE_TABLE, ROM_CGB_PALETTE_TABLE_META } from '../src/data/generated/romCgbPaletteTable.generated';
import { ROM_FIGHTER_PALETTE_BINDINGS } from '../src/data/generated/romFighterPaletteBindings.generated';
import { ROM_OFFENSIVE_FX_PALETTE_BINDINGS } from '../src/data/generated/romOffensiveFxPaletteBindings.generated';

const ROOT = process.cwd();
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const GENERATOR = resolve(ROOT, 'scripts/generate-rom-fighter-palettes.ts');
const EXPECTED_SHA = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
const EXPECTED_SIZE = 2_097_152;
const BANK = 0x30;
const TABLE_CPU = 0x6e00;
const ENTRY_SIZE = 8;
const ENTRY_COUNT = 0x100;

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function hex(value: number, width: number): string {
  return `0x${value.toString(16).padStart(width, '0')}`;
}

function bankedOffset(bank: number, cpuAddress: number): number {
  if (cpuAddress < 0x4000 || cpuAddress > 0x7fff) {
    throw new Error(`Invalid banked CPU address ${hex(cpuAddress, 4)}`);
  }
  return bank * 0x4000 + (cpuAddress - 0x4000);
}

const rom = readFileSync(ROM_PATH);
const romSha = createHash('sha256').update(rom).digest('hex');
check('ROM SHA PASS', romSha === EXPECTED_SHA, romSha);
check('ROM size PASS', rom.length === EXPECTED_SIZE, String(rom.length));

check('physical palette entries 256/256', ROM_CGB_PALETTE_TABLE.length === ENTRY_COUNT, `${ROM_CGB_PALETTE_TABLE.length}/256`);
check('physical table bytes 2048/2048', ROM_CGB_PALETTE_TABLE.length * ENTRY_SIZE === 2048, `${ROM_CGB_PALETTE_TABLE.length * ENTRY_SIZE}/2048`);
check('filtered entries 0', ROM_CGB_PALETTE_TABLE_META.filteredEntries === 0, String(ROM_CGB_PALETTE_TABLE_META.filteredEntries));

const requiredAddresses = [
  [0x00, 0x6e00, 0xc2e00],
  [0x2c, 0x6f60, 0xc2f60],
  [0x2d, 0x6f68, 0xc2f68],
  [0x2e, 0x6f70, 0xc2f70],
  [0x2f, 0x6f78, 0xc2f78],
  [0x30, 0x6f80, 0xc2f80],
  [0x31, 0x6f88, 0xc2f88],
  [0x32, 0x6f90, 0xc2f90],
  [0x33, 0x6f98, 0xc2f98],
  [0x35, 0x6fa8, 0xc2fa8],
  [0xff, 0x75f8, 0xc35f8],
] as const;

let badAddress = 0;
for (const [index, cpu, offset] of requiredAddresses) {
  const entry = ROM_CGB_PALETTE_TABLE[index];
  if (entry.cpuAddress !== cpu || entry.fileOffset !== offset) badAddress++;
}
check('known palette CPU/file offsets', badAddress === 0, `${badAddress} bad`);

let badEntry = 0;
let badSha = 0;
for (const entry of ROM_CGB_PALETTE_TABLE) {
  const expectedCpu = TABLE_CPU + entry.index * ENTRY_SIZE;
  const expectedOffset = bankedOffset(BANK, expectedCpu);
  const raw = Array.from(rom.subarray(expectedOffset, expectedOffset + ENTRY_SIZE));
  if (
    entry.romBank !== BANK ||
    entry.cpuAddress !== expectedCpu ||
    entry.fileOffset !== expectedOffset
  ) badEntry++;
  if (JSON.stringify(raw) !== JSON.stringify(entry.rawBytes)) badEntry++;
  const rawSha = createHash('sha256').update(Buffer.from(raw)).digest('hex');
  if (rawSha !== entry.rawSha256) badSha++;
}
check('all 256 entries use banked CPU offset formula and ROM raw bytes', badEntry === 0, `${badEntry} bad`);
check('all 256 rawSha256 values match raw bytes', badSha === 0, `${badSha} bad`);

const generatorSrc = readFileSync(GENERATOR, 'utf8');
check('generator contains bankedOffset helper', generatorSrc.includes('function bankedOffset'));
check('old bankBase + CPU address formula absent', !generatorSrc.includes('BANK30_BASE + TABLE') && !generatorSrc.includes('bank * 0x4000 + cpuAddress'));
check('generator does not skip all00/allFF rows', !/continue;\s*\/\/.*all|if\s*\(\s*all(?:FF|00)/.test(generatorSrc));

let badFighter = 0;
for (const binding of ROM_FIGHTER_PALETTE_BINDINGS) {
  if (
    binding.paletteIndex !== binding.actorVisualProfileKey ||
    binding.graphicsBank !== binding.expectedGraphicsBank ||
    binding.expectedGraphicsBank !== 0x31 + binding.actorVisualProfileKey
  ) badFighter++;
  const palette = ROM_CGB_PALETTE_TABLE[binding.paletteIndex];
  if (
    !palette ||
    binding.paletteCpuAddress !== palette.cpuAddress ||
    binding.paletteFileOffset !== palette.fileOffset ||
    binding.paletteRawSha256 !== palette.rawSha256
  ) badFighter++;
}
check('fighter forms 48/48', ROM_FIGHTER_PALETTE_BINDINGS.length === 48, `${ROM_FIGHTER_PALETTE_BINDINGS.length}/48`);
check('fighter unresolved 0', badFighter === 0, `${badFighter} bad`);

const beamCards = CARDS.filter(card => card.type === 'beam');
let badBeam = 0;
for (const binding of ROM_OFFENSIVE_FX_PALETTE_BINDINGS) {
  const palette = ROM_CGB_PALETTE_TABLE[binding.paletteIndex];
  if (
    !palette ||
    binding.paletteCpuAddress !== palette.cpuAddress ||
    binding.paletteFileOffset !== palette.fileOffset ||
    binding.paletteRawSha256 !== palette.rawSha256
  ) badBeam++;
}
check('Beam cards 38/38', beamCards.length === 38, `${beamCards.length}/38`);
check('Beam palette bindings 38/38', ROM_OFFENSIVE_FX_PALETTE_BINDINGS.length === beamCards.length && badBeam === 0, `${ROM_OFFENSIVE_FX_PALETTE_BINDINGS.length}/${beamCards.length}, ${badBeam} bad`);

const samples: Array<[string, number, number, number]> = [
  ['Kamehameha', 0x05, 0x2c, 0x03],
  ['Masenko', 0x08, 0x2d, 0x04],
  ['Galick-Ho', 0x0e, 0x2e, 0x05],
  ['Final Flash', 0x14, 0x2c, 0x09],
  ['Crasher Ball', 0x48, 0x2f, 0x1b],
  ['Purple Comet', 0x27, 0x2c, 0x1c],
];
let badSample = 0;
for (const [name, fxResource, paletteIndex, animationResource] of samples) {
  const binding = ROM_OFFENSIVE_FX_PALETTE_BINDINGS.find(item => item.name === name);
  if (!binding || binding.fxResource !== fxResource || binding.paletteIndex !== paletteIndex || binding.animationResource !== animationResource) {
    badSample++;
  }
}
check('sample offensive FX palette bindings', badSample === 0, `${badSample} bad`);

check('manual palette overrides 0', !generatorSrc.includes('DOCUMENTED') && !generatorSrc.includes('expectedColors'));
check('visual guessed palettes 0', !/guess|fuzzy|expected palette/i.test(generatorSrc));

if (failures === 0) {
  console.log(`\n✅ verify:rom-palette-table PASS (${ROM_CGB_PALETTE_TABLE.length} entries · ${ROM_FIGHTER_PALETTE_BINDINGS.length} fighters · ${ROM_OFFENSIVE_FX_PALETTE_BINDINGS.length} beam bindings)`);
  process.exit(0);
}

console.log(`\n❌ verify:rom-palette-table FAIL (${failures})`);
process.exit(1);

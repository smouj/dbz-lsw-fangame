// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM fighter canon guardrail.
// Verifica que la paleta del luchador sale de actorVisualProfileKey →
// Bank30:$6E00+key×8 usando conversión correcta de dirección CPU banked a
// offset de archivo. La paleta de carta (fxPalette) queda en dominio FX.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ROM_CGB_PALETTE_TABLE, ROM_CGB_PALETTE_TABLE_META } from '../src/data/generated/romCgbPaletteTable.generated';
import { ROM_FIGHTER_PALETTES } from '../src/data/generated/romFighterPalettes.generated';
import { normalizeCardName, ROM_CARD_DATA } from '../src/data/romCardData';

const ROOT = process.cwd();
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const PROFILES = resolve(ROOT, 'docs/rom/generated/sprite-mapping/rom-form-profiles.json');
const PALETTE_GENERATOR = resolve(ROOT, 'scripts/generate-rom-fighter-palettes.ts');
const PROVENANCE_BUILDER = resolve(ROOT, 'tools/sprite-mapping/build-rom-provenance.ts');
const PHYSICAL_RENDERER = resolve(ROOT, 'tools/rom-research/scripts/render-fighter-physical.ts');

const PALETTE_BANK = 0x30;
const PALETTE_TABLE = 0x6e00;
const ENTRY_BYTES = 8;

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function bankedOffset(bank: number, cpuAddress: number): number {
  if (cpuAddress < 0x4000 || cpuAddress > 0x7fff) {
    throw new Error(`banked CPU address out of range: $${cpuAddress.toString(16)}`);
  }
  return bank * 0x4000 + (cpuAddress - 0x4000);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const rom = readFileSync(ROM_PATH);
const profiles = readJson<Array<{
  formId: string;
  actorVisualProfileKey: number;
  paletteRomBank?: number;
  paletteCpuAddress?: number;
  paletteFileOffset?: number;
  paletteRaw: string[];
  paletteAvailable: boolean;
}>>(PROFILES);

check('48 fighter form profiles', profiles.length === 48, `${profiles.length}/48`);
check('ROM CGB palette table is 256/256', ROM_CGB_PALETTE_TABLE.length === 0x100, `${ROM_CGB_PALETTE_TABLE.length}/256`);
check('ROM CGB palette table preserves 2048 bytes and filters 0 rows',
  ROM_CGB_PALETTE_TABLE_META.totalBytes === 2048 && ROM_CGB_PALETTE_TABLE_META.filteredEntries === 0,
  `${ROM_CGB_PALETTE_TABLE_META.totalBytes} bytes · filtered ${ROM_CGB_PALETTE_TABLE_META.filteredEntries}`);
check('compat fighter palette view is derived 64 profile rows', ROM_FIGHTER_PALETTES.length === 0x40, `${ROM_FIGHTER_PALETTES.length}/64`);
check('palette generator uses bankedOffset helper', readFileSync(PALETTE_GENERATOR, 'utf8').includes('function bankedOffset'));
check('provenance builder uses bankedOffset helper', readFileSync(PROVENANCE_BUILDER, 'utf8').includes('function bankedOffset'));
check('old Bank30 + CPU address formula absent in palette paths',
  !readFileSync(PALETTE_GENERATOR, 'utf8').includes('BANK30_BASE + TABLE') &&
  !readFileSync(PROVENANCE_BUILDER, 'utf8').includes('0x30 * 0x4000 + 0x6e00'));
check('physical fighter renderer consumes ROM_CGB_PALETTE_TABLE SSOT, not card fxPalette',
  readFileSync(PHYSICAL_RENDERER, 'utf8').includes('ROM_CGB_PALETTE_TABLE') &&
  !readFileSync(PHYSICAL_RENDERER, 'utf8').includes('romFighterPalettes.generated') &&
  !/\bfxPalette\b|\bcardPalette\b/.test(readFileSync(PHYSICAL_RENDERER, 'utf8')));

let badGeneratedOffset = 0;
let badGeneratedRaw = 0;
for (const palette of ROM_FIGHTER_PALETTES) {
  const expectedCpu = PALETTE_TABLE + palette.key * ENTRY_BYTES;
  const expectedOffset = bankedOffset(PALETTE_BANK, expectedCpu);
  if (
    palette.romBank !== PALETTE_BANK ||
    palette.cpuAddress !== expectedCpu ||
    palette.fileOffset !== expectedOffset
  ) badGeneratedOffset++;
  const raw = Array.from(rom.subarray(expectedOffset, expectedOffset + ENTRY_BYTES));
  if (JSON.stringify(raw) !== JSON.stringify(palette.raw)) badGeneratedRaw++;
}
check('generated fighter palettes use Bank30:$6E00 CPU-address offsets', badGeneratedOffset === 0, `${badGeneratedOffset} bad`);
check('generated fighter palettes raw bytes match ROM at banked file offsets', badGeneratedRaw === 0, `${badGeneratedRaw} bad`);

let badProfileOffset = 0;
let badProfileRaw = 0;
let unavailable = 0;
for (const profile of profiles) {
  const expectedCpu = PALETTE_TABLE + profile.actorVisualProfileKey * ENTRY_BYTES;
  const expectedOffset = bankedOffset(PALETTE_BANK, expectedCpu);
  if (
    profile.paletteRomBank !== PALETTE_BANK ||
    profile.paletteCpuAddress !== expectedCpu ||
    profile.paletteFileOffset !== expectedOffset
  ) badProfileOffset++;
  const raw = Array.from(rom.subarray(expectedOffset, expectedOffset + ENTRY_BYTES))
    .map(byte => byte.toString(16).padStart(2, '0'));
  if (JSON.stringify(raw) !== JSON.stringify(profile.paletteRaw)) badProfileRaw++;
  if (!profile.paletteAvailable) unavailable++;
}
check('48 form profiles carry correct fighter palette bank/cpu/file offsets', badProfileOffset === 0, `${badProfileOffset} bad`);
check('48 form profile paletteRaw bytes match corrected ROM offsets', badProfileRaw === 0, `${badProfileRaw} bad`);
check('0 fighter palette unresolved after corrected Bank30 addressing', unavailable === 0, `${unavailable} unavailable`);

const kame = ROM_CARD_DATA[normalizeCardName('Kamehameha')];
check('Kamehameha card preserves FX palette $2C', kame?.fxPalette === 0x2c, String(kame?.fxPalette));
check('Kamehameha actor resource remains separate from FX palette', kame?.actorAnim === 0x03 && kame?.fxGraphics === 0x05);
check('card fxPalette is not required to exist as a fighter profile key',
  !profiles.some(profile => profile.actorVisualProfileKey === kame?.fxPalette && profile.formId === 'goku_base'),
  'fxPalette byte is an effect palette selector, not actorVisualProfileKey');

if (failures === 0) {
  console.log(`\n✅ verify:rom-fighter-canon PASS (${profiles.length} forms · ${ROM_CGB_PALETTE_TABLE.length} physical palette rows · ${ROM_FIGHTER_PALETTES.length} fighter profile rows)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fighter-canon FAIL (${failures})`);
process.exit(1);

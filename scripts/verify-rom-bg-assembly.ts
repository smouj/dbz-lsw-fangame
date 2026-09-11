// ═══════════════════════════════════════════════════════════════════════
// P0.4R — verify:rom-bg-assembly
// ═══════════════════════════════════════════════════════════════════════
// Gate del ensamblado BG ROM ($19/$1A).
//
//   1. El decoder TS reproduce EXACTAMENTE los samples ROM oficiales
//      (docs/rom/research-v5-support-defense/.../samples) — píxel a píxel.
//   2. El contrato ROM-verificado se cumple (tiles/dims/posición/slot).
//   3. Los dos programas ($19 y $1A) son físicamente distintos (no canary).
//
// Requiere la ROM (fuera del repo) → verify:rom-local. Sin ROM hace SKIP.
// ═══════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PNG } from 'pngjs';
import {
  ROM_BG_ASSEMBLY_SPECS,
  decodeRomBgAssembly,
  decodeRomBgAssemblyRgba,
  decodeCgbPaletteRgba,
  type RomBgAssemblyProgram,
} from '../src/battle/romDisplay/romBgAssemblyDecode';

const ROOT = process.cwd();
const ROM_PATH = process.env.ROM_PATH ?? resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const SAMPLES = resolve(
  ROOT,
  'docs/rom/research-v5-support-defense/external/DBZ_LSW_ROM_RESEARCH_V5_SUPPORT_DEFENSE/samples',
);
const REQUIRE_ROM_BG_EXPORTS = process.env.REQUIRE_ROM_BG_EXPORTS === '1';

let failures = 0;
let checks = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

if (!existsSync(ROM_PATH)) {
  console.log('SKIP: ROM no presente (verify:rom-local)');
  process.exit(0);
}

const rom = readFileSync(ROM_PATH);

// ── 1. Contrato ROM-verificado (constantes duras, no inferidas) ──
const program19 = decodeRomBgAssembly(ROM_BG_ASSEMBLY_SPECS[0x19], rom);
const program1a = decodeRomBgAssembly(ROM_BG_ASSEMBLY_SPECS[0x1a], rom);

const contract: Array<[string, RomBgAssemblyProgram, { tiles: number; w: number; h: number; row: number; col: number; slot: number }]> = [
  ['$19', program19, { tiles: 16, w: 48, h: 56, row: 4, col: 7, slot: 5 }],
  ['$1A', program1a, { tiles: 23, w: 64, h: 56, row: 4, col: 6, slot: 5 }],
];
for (const [label, program, want] of contract) {
  check(`${label}: tileCount ROM_VERIFIED`, program.tileCount === want.tiles, `${program.tileCount}/${want.tiles}`);
  check(`${label}: dimensiones ROM_VERIFIED`, program.widthPx === want.w && program.heightPx === want.h, `${program.widthPx}x${program.heightPx}`);
  check(`${label}: BG start ROM_VERIFIED`, program.bgRowStart === want.row && program.bgCol === want.col, `row${program.bgRowStart} col${program.bgCol}`);
  check(`${label}: palette slot ROM_VERIFIED`, program.paletteSlot === want.slot, `${program.paletteSlot}`);
  check(`${label}: celdas completas`, program.cells.length === program.rows * program.cols, `${program.cells.length}/${program.rows * program.cols}`);
  // Atributos: bit3 = VRAM bank 1 (ROM_VERIFIED). Los bits 0-2 (palette) y 5/6
  // (flip X/Y) se conservan tal cual; 0x0D/0x2D/0x2F observados en $19.
  check(`${label}: VRAM bank1 (bit3) en toda celda`, program.cells.every(c => (c.attr & 0x08) !== 0));
  const attrs = [...new Set(program.cells.map(c => c.attr))].map(a => `$${a.toString(16).padStart(2, '0')}`);
  console.log(`  ${label}: attrs distintos ${attrs.join(' ')}`);
}

// ── 2. Los dos programas deben ser físicamente distintos (anti-canary) ──
check(
  '$19 ≠ $1A (no canary)',
  program19.tileCount !== program1a.tileCount || program19.cols !== program1a.cols,
  `${program19.tileCount}t/${program19.cols}c vs ${program1a.tileCount}t/${program1a.cols}c`,
);

// ── 3. Reproducción exacta de los samples ROM oficiales ──
function compareSample(file: string, program: RomBgAssemblyProgram, paletteIndex: number, transparent: boolean): boolean {
  const path = resolve(SAMPLES, file);
  if (!existsSync(path)) {
    check(`sample ${file}`, false, 'sample ROM desaparecido (fixture perdido)');
    return false;
  }
  const ref = PNG.sync.read(readFileSync(path));
  const expected = {
    w: ref.width,
    h: ref.height,
    data: Uint8Array.from(ref.data),
  };
  const rgba = decodeRomBgAssemblyRgba(program, rom, decodeCgbPaletteRgba(rom, paletteIndex), transparent);
  if (expected.w !== program.widthPx || expected.h !== program.heightPx) {
    check(`sample ${file}: dimensiones`, false, `${expected.w}x${expected.h} vs ${program.widthPx}x${program.heightPx}`);
    return false;
  }
  for (let i = 0; i < rgba.length; i++) {
    if (rgba[i] !== expected.data[i]) {
      check(`sample ${file}: píxel ${i}`, false, `got ${rgba[i]} want ${expected.data[i]}`);
      return false;
    }
  }
  check(`sample ${file}: píxel-exacto`, true);
  return true;
}

const PALETTES_19 = [0x30, 0x31, 0x32, 0x33, 0x35, 0x2d, 0xff];
for (const palette of PALETTES_19) {
  compareSample(`support_bg19_palette_${palette.toString(16).toUpperCase().padStart(2, '0')}_opaque.png`, program19, palette, false);
  compareSample(`support_bg19_palette_${palette.toString(16).toUpperCase().padStart(2, '0')}_transparent_inspection.png`, program19, palette, true);
}
compareSample('aux_bg1A_chara_palette_31_opaque.png', program1a, 0x31, false);
compareSample('aux_bg1A_gather_palette_33_opaque.png', program1a, 0x33, false);

// ── 4. Export físico (local estricto) ──
const EXPORT = resolve(ROOT, 'public/assets/rom-bg');
if (!existsSync(EXPORT)) {
  if (REQUIRE_ROM_BG_EXPORTS) check('exports físicos BG presentes', false, 'falta public/assets/rom-bg (npm run build:rom-bg-assembly)');
  else console.log('SKIP export físico: public/assets/rom-bg no presente; usa REQUIRE_ROM_BG_EXPORTS=1 tras npm run build:rom-bg-assembly');
} else {
  for (const program of [program19, program1a]) {
    const palettes = program.resource === 0x19 ? PALETTES_19 : [0x31, 0x33];
    for (const palette of palettes) {
      const file = resolve(EXPORT, `bg${program.resource.toString(16)}-p${palette.toString(16).padStart(2, '0')}.png`);
      check(`export $${program.resource.toString(16)} pal ${palette.toString(16)}`, existsSync(file));
    }
  }
}

console.log(`\nROM BG assembly: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:rom-bg-assembly FAIL' : '✅ verify:rom-bg-assembly PASS');
process.exit(failures ? 1 : 0);

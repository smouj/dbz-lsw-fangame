// ═══════════════════════════════════════════════════════════════════════
// GENERADOR: romFighterPalettes.generated.ts — ROM Display Lab 2.1.
// Paletas físicas de luchadores: Bank30:$6E00 + actorVisualProfileKey*8
// (research-v3 §4, ROM_STATIC_VERIFIED). 4 colores CGB × 16 bits BGR555.
// Uso: npm run gen:fighter-palettes (tras: npm run build:rom-path si aplica)
// Fuente: dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc
// NO editar a mano — regenerar si cambia la ROM.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROM_REL = '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc';
const BANK30_BASE = 0x30 * 0x4000;
const TABLE = 0x6e00;
const ENTRY = 8;
const KEYS = 0x40; // profile keys 0x00..0x3F

function bgr555ToRgb(v: number): [number, number, number] {
  const r = (v & 0x1f) * 255 / 31;
  const g = ((v >> 5) & 0x1f) * 255 / 31;
  const b = ((v >> 10) & 0x1f) * 255 / 31;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function hex(v: number): string { return v.toString(16).padStart(2, '0'); }

const romPath = resolve(process.cwd(), ROM_REL);
const rom = readFileSync(romPath);
console.log(`ROM ${ROM_REL} (${rom.length} bytes)`);

const entries: { key: number; raw: number[]; colors: string[]; bgr555: string[] }[] = [];
for (let k = 0; k < KEYS; k++) {
  const off = BANK30_BASE + TABLE + k * ENTRY;
  if (off + ENTRY > rom.length) break;
  const raw = Array.from(rom.subarray(off, off + ENTRY));
  const words = [raw[0] | (raw[1] << 8), raw[2] | (raw[3] << 8), raw[4] | (raw[5] << 8), raw[6] | (raw[7] << 8)];
  // descartar tablas vacías (todo FF o todo 00)
  const allFF = words.every((w) => w === 0xffff);
  const all00 = words.every((w) => w === 0x0000);
  if (allFF || all00) continue;
  const colors = words.map((w) => {
    const [r, g, b] = bgr555ToRgb(w);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  });
  entries.push({ key: k, raw, colors, bgr555: words.map((w) => `${w.toString(16).padStart(4, '0')}`) });
}

const out = `// ═══════════════════════════════════════════════════════════════════════
// romFighterPalettes.generated.ts — GENERADO por scripts/generate-rom-fighter-palettes.ts
// Paletas físicas de luchador: Bank30:$6E00 + actorVisualProfileKey*8
// (research-v3 §4 — ROM_STATIC_VERIFIED). 4 colores CGB × 16 bits BGR555.
// NO editar a mano — regenerar con npm run gen:fighter-palettes.
// ═══════════════════════════════════════════════════════════════════════

export interface RomFighterPalette {
  key: number;
  keyHex: string;
  raw: number[];
  bgr555: string[];
  colors: string[]; // #RRGGBB (BGR555 → RGB, sin interpolación)
  evidence: 'ROM_STATIC_VERIFIED';
}

export const ROM_FIGHTER_PALETTES: RomFighterPalette[] = ${JSON.stringify(entries.map((e) => ({
  key: e.key,
  keyHex: `0x${hex(e.key)}`,
  raw: e.raw,
  bgr555: e.bgr555,
  colors: e.colors,
  evidence: 'ROM_STATIC_VERIFIED' as const,
})), null, 2)};
`;

const outPath = resolve(process.cwd(), 'src/data/generated/romFighterPalettes.generated.ts');
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync(resolve(process.cwd(), 'src/data/generated'), { recursive: true });
writeFileSync(outPath, out);
console.log(`✔ ${entries.length} paletas físicas → src/data/generated/romFighterPalettes.generated.ts`);
for (const e of entries.slice(0, 6)) console.log(`  key 0x${hex(e.key)}: ${e.colors.join(' ')}`);
if (entries.length > 6) console.log(`  … +${entries.length - 6} más`);

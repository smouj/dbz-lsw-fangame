// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — build:rom-animation-resource-base
// ═══════════════════════════════════════════════════════════════════════
// Genera la tabla de resource bases (CPU address) para:
//   - bank $61  : 7 recursos de animación de pie/básica (Stage QTE).
//   - bank $62/$63/$64 : catálogo de 66 técnicas (layout {0x62:0..24,
//                       0x63:25..49, 0x64:50..65}).
//
// Aritmética VERIFICADA de Call_000_1266 (bank_000.asm):
//   de = $4000 + u16($4008 + index*4) * 4
//
// Convención mgbdis (región switchable $4000-$7FFF):
//   file = bank*0x4000 + (addr - 0x4000)
//
// Esto es la identidad física PRIMARIA de un recurso de animación
// (animationBank + resourceBase), usada por RomPhysicalFrameKey para
// desambiguar bank $61 vs $62-$64 (el resourceId del catálogo es metadata).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';

const ROOT = process.cwd();
const ROM_PATH = resolve(ROOT, '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
const OUT_TS = join(ROOT, 'src/data/generated/romAnimationResourceBase.generated.ts');

const rom = readFileSync(ROM_PATH);

const file = (bank: number, addr: number) => bank * 0x4000 + (addr - 0x4000);
const u16 = (bank: number, addr: number) => rom[file(bank, addr)] | (rom[file(bank, addr) + 1] << 8);

/** Call_000_1266: base = $4000 + u16($4008 + index*4) * 4 */
function call1266Base(bank: number, index: number): number {
  const value = u16(bank, 0x4008 + index * 4);
  return 0x4000 + value * 4;
}

// Bank $61: 7 recursos de pie (Call_000_35ca, de=0..6).
const bank61 = Array.from({ length: 7 }, (_, i) => call1266Base(0x61, i));

// Catálogo $62/$63/$64 (66 recursos).
const CATALOG_LAYOUT = [
  { bank: 0x62, first: 0x00, count: 25 },
  { bank: 0x63, first: 0x19, count: 25 },
  { bank: 0x64, first: 0x32, count: 16 },
] as const;

const catalog: Array<{ resourceId: number; animationBank: number; localId: number; resourceBase: number }> = [];
for (const layout of CATALOG_LAYOUT) {
  for (let local = 0; local < layout.count; local++) {
    const resourceId = layout.first + local;
    catalog.push({
      resourceId,
      animationBank: layout.bank,
      localId: local,
      resourceBase: call1266Base(layout.bank, local),
    });
  }
}

const ts = `// ═══════════════════════════════════════════════════════════════
// GENERADO — no editar a mano. Fuente: scripts/build-rom-animation-resource-base.ts
// Resource bases (CPU address) de animación, aritmética Call_000_1266.
// ═══════════════════════════════════════════════════════════════

/** 7 recursos de pie/básica de bank $61 (Stage QTE). resourceIndex 0..6. */
export const ROM_BANK61_RESOURCE_BASES: readonly number[] = ${JSON.stringify(bank61)};

export interface RomAnimationResourceBaseRef {
  resourceId: number;
  animationBank: number;
  localId: number;
  resourceBase: number;
}

/** Catálogo de 66 técnicas (banks $62/$63/$64). */
export const ROM_CATALOG_RESOURCE_BASES: readonly RomAnimationResourceBaseRef[] = ${JSON.stringify(catalog, null, 2)};

/** resourceId (0..65) → resource base del catálogo, o null si fuera de rango. */
export function catalogResourceBase(resourceId: number): number | null {
  if (resourceId < 0 || resourceId > 65) return null;
  const ref = ROM_CATALOG_RESOURCE_BASES[resourceId];
  return ref.resourceBase;
}

/** resourceId (0..65) → animation bank ($62/$63/$64), o null si fuera de rango. */
export function catalogAnimationBank(resourceId: number): number | null {
  if (resourceId < 0 || resourceId > 65) return null;
  return ROM_CATALOG_RESOURCE_BASES[resourceId].animationBank;
}
`;

mkdirSync(dirname(OUT_TS), { recursive: true });
writeFileSync(OUT_TS, ts);
console.log(`resource bases generadas: bank $61 (${bank61.length}) · catálogo (${catalog.length})`);
console.log(`  bank $61: ${bank61.map(b => '0x' + b.toString(16)).join(', ')}`);
console.log(`  catálogo[0]=${JSON.stringify(catalog[0])}`);
console.log(`  catálogo[25]=${JSON.stringify(catalog[25])}`);
console.log(`  catálogo[50]=${JSON.stringify(catalog[50])}`);
console.log(`  catálogo[65]=${JSON.stringify(catalog[65])}`);

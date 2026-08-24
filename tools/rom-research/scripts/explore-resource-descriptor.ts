// R2 — explorador del descriptor de AnimationResource (derivar +2/+4 desde ROM)
// Lee la tabla global de recursos (bancos $62-$64) y el descriptor del resource
// pedido, mostrando los bytes crudos para derivar el formato (nunca copiar
// resultados históricos: re-derivación).
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROM = resolve(process.cwd(), '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc');
const rom = readFileSync(ROM);

const BANK_LAYOUT = [
  { bank: 0x62, first: 0x00, count: 25 },
  { bank: 0x63, first: 0x19, count: 25 },
  { bank: 0x64, first: 0x32, count: 16 },
];

const hex8 = (v: number) => v.toString(16).padStart(2, '0');
const hex16 = (v: number) => v.toString(16).padStart(4, '0');

function romAt(bank: number, addr: number): number {
  return bank * 0x4000 + addr;
}
function u16(bank: number, addr: number): number {
  const o = romAt(bank, addr);
  return rom[o] | (rom[o + 1] << 8);
}
function u8(bank: number, addr: number): number {
  return rom[romAt(bank, addr)];
}
function dump(bank: number, addr: number, len: number): number[] {
  const o = romAt(bank, addr);
  return Array.from(rom.subarray(o, o + len));
}

const resourceId = parseInt(process.argv[2] ?? '3', 16);
const layout = BANK_LAYOUT.find((l) => resourceId >= l.first && resourceId < l.first + l.count);
if (!layout) { console.log('resource fuera de rango'); process.exit(1); }

const bank = layout.bank;
// tabla global del banco: u16 count + pares offset/size acumulativos
const count = u16(bank, 0);
console.log(`Bank $${bank.toString(16)}: count=${count}`);
const tableStart = 2;
for (let i = 0; i < Math.min(count, 30); i++) {
  const off = u16(bank, tableStart + i * 4);
  const size = u16(bank, tableStart + i * 4 + 2);
  const first = layout.first + i;
  const marker = first === resourceId ? '  ◄◄ RESOURCE' : '';
  console.log(`  res ${first.toString(16).padStart(2, '0')}: offset=$${hex16(off)} size=${size}${marker}`);
}

// descriptor del resource (localId)
const localId = resourceId - layout.first;
const descOff = u16(bank, tableStart + localId * 4);
const descSize = u16(bank, tableStart + localId * 4 + 2);
console.log(`\nDescriptor resource $${resourceId.toString(16).padStart(2, '0')}: bank $${bank.toString(16)} offset $${hex16(descOff)} size=${descSize}`);
const raw = dump(bank, descOff, Math.min(descSize, 32));
console.log('bytes descriptor:', raw.map(hex8).join(' '));
console.log('u16s:', Array.from({ length: Math.floor(raw.length / 2) }, (_, i) => `+${i * 2}=$${hex16(raw[i * 2] | (raw[i * 2 + 1] << 8))}`).join(' '));

// hipótesis: +2 = metasprite root (Bank-local), +4 = graphics table (Bank-local)
const p2 = raw[2] | (raw[3] << 8);
const p4 = raw[4] | (raw[5] << 8);
if (p2 > 0 && p2 < 0x4000) {
  console.log(`\n+2 (metasprite root?) = $${hex16(p2)} → bytes: ${dump(bank, p2, 32).map(hex8).join(' ')}`);
  console.log('  u16s:', Array.from({ length: 16 }, (_, i) => `$${hex16(dump(bank, p2 + i * 2, 2)[0] | (dump(bank, p2 + i * 2, 2)[1] << 8))}`).join(' '));
}
if (p4 > 0 && p4 < 0x4000) {
  console.log(`\n+4 (graphics table?) = $${hex16(p4)} → bytes: ${dump(bank, p4, 32).map(hex8).join(' ')}`);
}
// secuencias (catálogo): seq0 addr $4A7
console.log(`\nReferencia secuencia seq0 (catálogo) = $4A7 → bytes: ${dump(bank, 0x4A7, 16).map(hex8).join(' ')}`);

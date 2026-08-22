// solve-compat.ts — resuelve el mapeo bit→personaje de la máscara 48-bit.
// bytes 9-14 de cada registro = 48 bits. Cada carta con compatible[] wiki
// conocido es una restricción: los bits de su máscara ∈ sus personajes.
// Uso: npx tsx scripts/solve-compat.ts
import { readFileSync } from 'fs';
import { CARDS } from '../src/data/cards';

const rom = JSON.parse(readFileSync(new URL('../../dbz-lsw-decomp/12_data/cards/rom-card-table.json', import.meta.url), 'utf8'));

function bitsOf(maskHex: string): number[] {
  // maskHex = 6 bytes (bytes 9-14). bit i = 1 → forma i.
  const bytes = Buffer.from(maskHex, 'hex');
  const bits: number[] = [];
  for (let b = 0; b < bytes.length; b++) {
    for (let i = 0; i < 8; i++) {
      if (bytes[b] & (1 << i)) bits.push(b * 8 + i);
    }
  }
  return bits;
}

const UNIV = 'ffffffffffffffff';
interface Row { idx: number; name: string; mask48: string; bits: number[]; wiki: string[] }
const rows: Row[] = [];
for (const r of rom.records) {
  const mask48 = r.compat_mask.slice(4); // quitar bytes 7-8 (flags)
  const c = CARDS[r.index - 1];
  if (!c) continue;
  if (mask48 === 'ffffffffffff') continue; // universal
  rows.push({ idx: r.index, name: c.name, mask48, bits: bitsOf(mask48), wiki: c.compatible ?? [] });
}

// ── 1. Cards con 1 solo bit → candidatos fuertes ──
console.log('═══ Cartas con 1 bit (identificación directa) ═══');
for (const row of rows) {
  if (row.bits.length === 1) {
    console.log(`bit ${String(row.bits[0]).padStart(2)} ← #${row.idx} ${row.name.padEnd(16)} wiki=[${row.wiki.join(',')}]`);
  }
}

// ── 2. Para cada personaje wiki: unión de bits de sus cartas exclusivas ──
console.log('\n═══ Personajes por intersección de bits (cartas exclusivas) ═══');
// una carta con wiki=[X] y bits conocidos define candidatos para X
for (const row of rows) {
  if (row.wiki.length === 1 && row.bits.length <= 4) {
    console.log(`${row.wiki[0].padEnd(16)} ← #${row.idx} ${row.name.padEnd(16)} bits=[${row.bits.join(',')}]`);
  }
}

// ── 3. Estadística: personajes que aparecen en wiki con su rango de bits ──
console.log('\n═══ Rango de bits por personaje (todas sus cartas) ═══');
const byChar: Record<string, Set<number>> = {};
for (const row of rows) {
  for (const w of row.wiki) {
    (byChar[w] ??= new Set());
    for (const b of row.bits) byChar[w].add(b);
  }
}
for (const [ch, bits] of Object.entries(byChar)) {
  const sorted = [...bits].sort((a, b) => a - b);
  console.log(`${ch.padEnd(16)} ${sorted.length} bits: [${sorted.join(',')}]`);
}

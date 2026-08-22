// decode-compat.ts — decodifica la máscara de compatibilidad de la tabla ROM.
// bytes 7-14 de cada registro = 64 bits (personaje/forma).
// Cruza contra CARDS[i].compatible (wiki) para descifrar bit → personaje.
// Uso: npx tsx scripts/decode-compat.ts
import { readFileSync } from 'fs';
import { CARDS } from '../src/data/cards';

const rom = JSON.parse(readFileSync(new URL('../../dbz-lsw-decomp/12_data/cards/rom-card-table.json', import.meta.url), 'utf8'));

interface Rec { index: number; bytes: string; category_name: string; power: number; accuracy: number; internal_id: number; cc_cost: number; exec_selector: number; b6: number; compat_mask: string; b15: number }

const records = rom.records as Rec[];
const UNIVERSAL = 'ffffffffffffffff';

// ── 1. Cartas NO universales (máscara restringida) ──
console.log('═══ Cartas con compatibilidad restringida (no FF×8) ═══');
const restricted = records.filter(r => r.compat_mask !== UNIVERSAL);
console.log(`Total: ${restricted.length}/125\n`);
for (const r of restricted) {
  const c = CARDS[r.index - 1];
  console.log(`#${r.index} ${(c?.name ?? '?').padEnd(18)} mask=${r.compat_mask}  wiki=[${(c?.compatible ?? []).join(',')}]`);
}
console.log('\n═══ Universal pero con compatible[] restringido en wiki (discrepancia) ═══');
let disc = 0;
for (const r of records) {
  const c = CARDS[r.index - 1];
  if (r.compat_mask === UNIVERSAL && c?.compatible && c.compatible.length > 0) {
    console.log(`#${r.index} ${c.name.padEnd(18)} wiki=[${c.compatible.join(',')}] (ROM dice universal)`);
    disc++;
  }
}
console.log(`Discrepancias: ${disc}`);

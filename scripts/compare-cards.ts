// compare-cards.ts — cruza la tabla ROM (125 cartas) contra src/data/cards.ts.
// Uso: npx tsx scripts/compare-cards.ts
import { readFileSync } from 'fs';
import { CARDS } from '../src/data/cards';

const rom = JSON.parse(readFileSync(new URL('../../dbz-lsw-decomp/12_data/cards/rom-card-table.json', import.meta.url), 'utf8'));
const ROM_TYPE: Record<number, string> = { 1: 'command', 2: 'damage', 3: 'beam', 4: 'support', 5: 'defense' };
let mismatches = 0;
for (let i = 0; i < 125; i++) {
  const r = rom.records[i];
  const c = CARDS[i];
  if (!c) { console.log(`#${i + 1}: ¡faltante en CARDS!`); mismatches++; continue; }
  const rt = ROM_TYPE[r.category];
  const issues: string[] = [];
  if (rt !== c.type && !(c.type === 'special' && rt === 'support')) issues.push(`type ${c.type}≠${rt}`);
  if (r.power !== c.atk) issues.push(`atk ${c.atk}≠${r.power}`);
  if (r.accuracy !== c.acc) issues.push(`acc ${c.acc}≠${r.accuracy}`);
  if (r.cc_cost !== c.cc) issues.push(`cc ${c.cc}≠${r.cc_cost}`);
  if (issues.length) { console.log(`#${i + 1} ${c.name.padEnd(18)} ${issues.join(' · ')}`); mismatches++; }
}
console.log(`\nMismatches: ${mismatches}/125`);
const selByCat: Record<string, Record<number, number>> = {};
for (const r of rom.records) {
  const k = ROM_TYPE[r.category] || String(r.category);
  selByCat[k] ??= {};
  selByCat[k][r.exec_selector] = (selByCat[k][r.exec_selector] || 0) + 1;
}
console.log('\nSelectores por categoría (selector: count):');
for (const [cat, sels] of Object.entries(selByCat)) console.log(` ${cat}:`, JSON.stringify(sels));

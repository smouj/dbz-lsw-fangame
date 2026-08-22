// selector-taxonomy.ts — imprime la taxonomía REAL de ejecución (byte 5) de
// la ROM agrupando las 125 cartas por selector, con nombres del catálogo.
// Uso: npx tsx scripts/selector-taxonomy.ts
import { readFileSync } from 'fs';
import { CARDS } from '../src/data/cards';

const rom = JSON.parse(readFileSync(new URL('../../dbz-lsw-decomp/12_data/cards/rom-card-table.json', import.meta.url), 'utf8'));
const groups = new Map<number, string[]>();
for (const r of rom.records) {
  const c = CARDS[r.index - 1];
  if (!c) continue;
  const key = r.exec_selector;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(`${c.name}(${r.category_name.slice(0, 3)})`);
}
for (const [sel, names] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`sel=${String(sel).padStart(2)} (0x${sel.toString(16).padStart(2, '0')}) ${names.length}: ${names.join(', ')}`);
}

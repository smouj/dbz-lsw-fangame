// verify-rom-cards.ts — verificación CI: el catálogo del remake debe coincidir
// con la ROM (fuente de verdad). Falla si cualquier carta difiere en
// type/atk/acc/cc, o si la taxonomía de ejecución no se puede derivar.
// Uso: npm run verify:rom-cards (o npx tsx scripts/verify-rom-cards.ts)
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CARDS } from '../src/data/cards';

const ROM_TYPE: Record<number, string> = { 1: 'command', 2: 'damage', 3: 'beam', 4: 'support', 5: 'defense' };

// La ruta de la ROM JSON varía según cómo se ejecute (tsx directo vs esbuild
// a .vrc.mjs en la raíz): probar candidatas relativas a cwd e import.meta.
function findRomJson(): string | null {
  const candidates = [
    resolve(process.cwd(), '../dbz-lsw-decomp/12_data/cards/rom-card-table.json'),
    resolve(process.cwd(), 'dbz-lsw-decomp/12_data/cards/rom-card-table.json'),
    new URL('../../dbz-lsw-decomp/12_data/cards/rom-card-table.json', import.meta.url).pathname,
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

function main() {
  const romPath = findRomJson();
  if (!romPath) {
    console.log('⚠ ROM JSON ausente — se omite (los .gbc no se versionan; regenerar con extract-card-table.py)');
    process.exit(0);
  }
  const rom = JSON.parse(readFileSync(romPath, 'utf8'));
  const errors: string[] = [];
  let specialOk = 0;
  for (let i = 0; i < 125; i++) {
    const r = rom.records[i];
    const c = CARDS[i];
    if (!c) { errors.push(`#${i + 1}: falta en CARDS`); continue; }
    const rt = ROM_TYPE[r.category];
    if (rt !== c.type && !(c.type === 'special' && rt === 'support')) errors.push(`#${i + 1} ${c.name}: type ${c.type} ≠ ROM ${rt}`);
    if (r.power !== c.atk) errors.push(`#${i + 1} ${c.name}: atk ${c.atk} ≠ ROM ${r.power}`);
    if (r.accuracy !== c.acc) errors.push(`#${i + 1} ${c.name}: acc ${c.acc} ≠ ROM ${r.accuracy}`);
    if (r.cc_cost !== c.cc) errors.push(`#${i + 1} ${c.name}: cc ${c.cc} ≠ ROM ${r.cc_cost}`);
    if (c.type === 'special') specialOk++;
  }
  if (errors.length) {
    console.error(`❌ VERIFY ROM CARDS: ${errors.length} discrepancias`);
    errors.slice(0, 20).forEach(e => console.error('  ' + e));
    process.exit(1);
  }
  console.log(`✅ VERIFY ROM CARDS: 125/125 idénticas a la ROM (${specialOk} special ok)`);
}

main();

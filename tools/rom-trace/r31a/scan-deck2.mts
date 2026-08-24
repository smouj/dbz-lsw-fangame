import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync('r31a/snapshot-B-in-battle.json', 'utf8')).bytes as number[];
const BASE = 0xC000;
const inCard = (v: number) => v >= 1 && v <= 125;
// runs de ≥18 bytes contiguos válidos
const runs: Array<{ addr: number; len: number; bytes: number[] }> = [];
for (let off = 0; off < B.length; ) {
  if (inCard(B[off])) {
    let end = off;
    while (end < B.length && inCard(B[end])) end++;
    if (end - off >= 18) runs.push({ addr: BASE + off, len: end - off, bytes: B.slice(off, end) });
    off = end;
  } else off++;
}
console.log(`runs de cartas contiguas >=18B: ${runs.length}`);
for (const r of runs) {
  console.log(`\n0x${r.addr.toString(16).toUpperCase()} len=${r.len}`);
  console.log(`  [${r.bytes.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
}

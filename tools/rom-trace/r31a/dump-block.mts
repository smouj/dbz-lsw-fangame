import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync('r31a/snapshot-B-in-battle.json', 'utf8')).bytes as number[];
const A = JSON.parse(readFileSync('r31a/snapshot-A-pre-battle.json', 'utf8')).bytes as number[];
const BASE = 0xC000;
function dumpBlock(label: string, base: number) {
  const off = base - BASE;
  const b = B.slice(off, off + 45);
  const a = A.slice(off, off + 45);
  const hex = (arr: number[]) => arr.map(v => v.toString(16).padStart(2, '0')).join(' ');
  console.log(`\n=== ${label} @ 0x${base.toString(16).toUpperCase()} ===`);
  console.log(`roster +00..02 : ${hex(b.slice(0,3))}`);
  console.log(`limits +03..17 : ${hex(b.slice(3,18))}`);
  console.log(`deck   +18..37 : ${hex(b.slice(18,38))}`);
  console.log(`drawIdx +38    : ${b[38]}`);
  console.log(`hand   +39..44 : ${hex(b.slice(39,45))}`);
  console.log(`diff vs A: ${a.map((v,i)=>v===b[i]?'·':'X').join('')}`);
}
dumpBlock('BLOQUE 1 (candidato deck @0xCB1A)', 0xCB08);
dumpBlock('BLOQUE 2 (candidato deck @0xCB4A)', 0xCB38);

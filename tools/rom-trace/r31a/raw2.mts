import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync('r31a/snapshot-B-in-battle.json', 'utf8')).bytes as number[];
const BASE = 0xC000;
function dump(startAddr: number, len: number, label: string) {
  console.log(`\n=== ${label} (0x${startAddr.toString(16).toUpperCase()}) ===`);
  for (let i = 0; i < len; i += 16) {
    const addr = startAddr + i;
    const bytes = B.slice(addr - BASE, addr - BASE + 16);
    const hex = bytes.map(v => v.toString(16).padStart(2, '0')).join(' ');
    console.log(`${addr.toString(16).toUpperCase()}: ${hex}`);
  }
}
dump(0xCB00, 0xA0, 'bloques batalla región CB');
dump(0xCDB0, 0x60, 'joint deck región CD');

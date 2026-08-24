import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync('r31a/snapshot-B-in-battle.json', 'utf8')).bytes as number[];
const BASE = 0xC000;
const start = 0xCB00 - BASE, len = 0x90;
for (let i = 0; i < len; i += 16) {
  const addr = 0xCB00 + i;
  const bytes = B.slice(start + i, start + i + 16);
  const hex = bytes.map(v => v.toString(16).padStart(2, '0')).join(' ');
  const ascii = bytes.map(v => (v >= 0x20 && v < 0x7F ? String.fromCharCode(v) : '.')).join('');
  console.log(`${addr.toString(16).toUpperCase()}: ${hex}  ${ascii}`);
}

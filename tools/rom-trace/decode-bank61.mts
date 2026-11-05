// Decodifica el resource del slot (bank 0x61, base 0x30 — Gohan) con el formato R2.3
import { readFileSync } from 'fs';
const ROM = readFileSync('rom-research/13_raw_rom/dbz-lsw-usa.gbc');
const BANK = 0x61, BASE = 0x30;
const off = BANK * 0x4000;
const u16 = (a: number) => ROM[off + (a & 0x3fff)] | (ROM[off + ((a + 1) & 0x3fff)] << 8);
const u8 = (a: number) => ROM[off + (a & 0x3fff)];

const w0 = u16(BASE);
const T = (BASE + w0) & 0x3fff;
const count = u8(T);
console.log(`base=0x${BASE.toString(16)} w0=0x${w0.toString(4)} T=0x${T.toString(16)} count=0x${count.toString(16)} (${count})`);
if (count > 0 && count < 128) {
  for (let sel = 0; sel < Math.min(count, 40); sel++) {
    const po = T + 1 + sel * 2;
    const so = u16(po);
    const target = (po + so) & 0x3fff;
    // primer frame record en target
    const fr = ROM[off + target];
    const ticks = ROM[off + ((target + 1) & 0x3fff)];
    console.log(`  seq ${sel}: ptrOff=0x${so.toString(4)} target=0x${target.toString(4)} frame0=[meta=${fr}, ticks=${ticks}]`);
  }
}

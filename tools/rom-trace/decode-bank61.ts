// Decodifica resources del bank 0x61 (Gohan/Piccolo) → entradas de catálogo R2.3
import { readFileSync, writeFileSync } from 'fs';
const ROM = readFileSync('/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc');
const BANK = 0x61;
const off = BANK * 0x4000;
const u16 = (a: number) => ROM[off + (a & 0x3fff)] | (ROM[off + ((a + 1) & 0x3fff)] << 8);
const u8 = (a: number) => ROM[off + (a & 0x3fff)];

function decodeResource(base: number, resourceId: number) {
  const w0 = u16(base);
  const T = (base + w0) & 0x3fff;
  const count = u8(T);
  const seqs: any[] = [];
  for (let sel = 0; sel < count; sel++) {
    const po = (T + 1 + sel * 2) & 0x3fff;
    const so = u16(po);
    const start = (po + so) & 0x3fff;
    let target = start;
    // frames: [vfid, ticks, dy, dx]
    const frames: any[] = [];
    let total = 0, guard = 0;
    while (guard++ < 500) {
      const meta = u8(target);
      const ticks = u8((target + 1) & 0x3fff);
      const dy = u8((target + 2) & 0x3fff);
      const dx = u8((target + 3) & 0x3fff);
      frames.push({ visualFrameId: meta, durationTicks: ticks, offsetY: dy, offsetX: dx, raw: [meta, ticks, dy, dx] });
      total += ticks;
      if (meta === 0 && ticks === 0) break;
      if (meta === 0xff) break;
      if (meta === 0 && ticks >= 0x80) break;
      target = (target + 4) & 0x3fff;
    }
    seqs.push({ addr: start, totalTicks: total, frames });
  }
  return { base, resourceId, sequenceCount: count, sequences: seqs };
}

const res30 = decodeResource(0x30, 66);
const res970 = decodeResource(0x970, 67);
const res1d7c = decodeResource(0x1d7c, 68);
for (const r of [res30, res970, res1d7c]) {
  console.log(`base=0x${r.base.toString(16)} count=${r.sequenceCount} seqs ticks:`, r.sequences.map((s: any) => s.totalTicks).join(','));
}
writeFileSync('tools/rom-trace/bank61-resources.json', JSON.stringify({ bank: BANK, resources: [res30, res970, res1d7c] }, null, 1));
console.log('bank61-resources.json escrito');
